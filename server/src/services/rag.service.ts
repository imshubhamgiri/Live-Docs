// rag.service.ts
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pipeline  } from "@huggingface/transformers";
import { ScrapedDoc } from "../schemas/docSchema.js";

// 1. Initialize Native Pinecone Client
const pinecone = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY! 
});

export const index = pinecone.Index({name:process.env.PINECONE_INDEX_NAME || 'docs-rag'});

// 2. Singleton Local Embedding Pipeline (Runs on CPU, 100% Free, No API Keys)
let extractor: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// 3. Process, Chunk, Embed, and Store
export async function processAndStoreEmbeddings(
  rawRecords: ScrapedDoc[],
  roomId: string | undefined,
  emitStatus: (status: string, message: string) => void
) {
  try {
    emitStatus("completed", "Clearing old vectors for this room...");
    await index._deleteMany({
      filter:{url: rawRecords[0]?.url , roomId: { $eq: roomId }}   // only deletes chunks belonging to this roomId
    });
    emitStatus("completed", "Chunking documentation content...");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    const recordsToUpsert: Array<{
      id: string;
      values: number[];
      metadata: Record<string, any>;
    }> = [];

    // Filter valid documents
    const validRecords = rawRecords.filter(
      (r) => r.content && r.content.trim() !== ""
    );

    if (validRecords.length === 0) {
      emitStatus("failed", "No valid text content found to index.");
      return;
    }


    for (const [docIdx, record] of validRecords.entries()) {
      const chunks = await splitter.splitText(record.content);

      for (const [chunkIdx, chunk] of chunks.entries()) {
        // Fast local vector computation (384 dimensions)
        const vector = await getEmbedding(chunk);

        recordsToUpsert.push({
          id: `room_${roomId}_doc_${docIdx}_chunk_${chunkIdx}`,
          values: vector,
          metadata: {
            text: chunk, // Required for your RAG retrieval to pass context to the LLM
            domain: new URL(record.url).hostname, // Use the URL as the domain for filtering
            url: record.url,
            title: record.title || "Documentation Section",
            headings: (record.headings || []).join(", "),
            roomId: roomId,
            chunkIndex: chunkIdx,
            hasLinks: /<a\s+href=/.test(chunk),
          },
        });
      }
    }

    emitStatus("completed", `Upserting ${recordsToUpsert.length} vectors to Pinecone...`);

    // Batch upsert to Pinecone (100 records per HTTP payload)
    const batchSize = 100;
    for (let i = 0; i < recordsToUpsert.length; i += batchSize) {
      const batch = recordsToUpsert.slice(i, i + batchSize);
      
      // Pinecone v8 takes the array directly
      await index.upsert({records: batch});
    }

    emitStatus("completed", `Successfully indexed ${recordsToUpsert.length} chunks!`);
  } catch (error: unknown) {
    console.error(" RAG pipeline error:", error);
    emitStatus("failed", `Failed: ${(error as Error).message}`);
    throw error;
  }
}