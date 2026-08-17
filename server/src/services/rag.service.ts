// rag.service.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
//  New and correct import
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index({ name: process.env.PINECONE_INDEX_NAME || 'docs-rag' });

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small", // 1536 dims
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function processAndStoreEmbeddings(
  rawRecords: Array<{ url: string; title?: string; content?: string; markdown?: string }>,
  roomId: string,
  emitStatus: (status: string, message: string) => void
) {
  emitStatus("chunking", "Chunking documentation content...");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  const docsToVectorize: Array<{ id: string; values: number[]; metadata: Record<string, any> }> = [];

  for (const [docIdx, record] of rawRecords.entries()) {
    const text = record.content || record.markdown || "";
    if (!text.trim()) continue;

    const chunks = await splitter.splitText(text);

    for (const [chunkIdx, chunk] of chunks.entries()) {
      const vector = await embeddings.embedQuery(chunk);
      
      docsToVectorize.push({
        id: `doc_${docIdx}_chunk_${chunkIdx}_${Date.now()}`,
        values: vector,
        metadata: {
          url: record.url,
          title: record.title || "Documentation Section",
          content: chunk,
          chunkIndex: chunkIdx,
        },
      });
    }
  }

  emitStatus("vectorizing", `Upserting ${docsToVectorize.length} vector embeddings to Pinecone...`);

  // Batch upsert to Pinecone
  const batchSize = 100;
  for (let i = 0; i < docsToVectorize.length; i += batchSize) {
    const batch = docsToVectorize.slice(i, i + batchSize);
    await index.upsert(batch);
  }

  emitStatus("completed", `RAG pipeline ready! Indexed ${docsToVectorize.length} chunks.`);
}