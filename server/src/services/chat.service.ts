import { Pinecone } from '@pinecone-database/pinecone';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {getEmbedding} from '../services/rag.service.js'

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pineconeIndex = pinecone.Index({ name: process.env.PINECONE_INDEX_NAME || 'docs-rag' });



const model = new ChatGroq({
  model: 'openai/gpt-oss-20b', // free tier, strong general-purpose model
  streaming: true,
  temperature: 0.1,
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export const ragService = {
  async retrieveContext(query: string, domain: string) {
    const queryEmbedding = await getEmbedding(query);

    const queryResponse = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: 4,
      filter: { domain: { $eq: domain } },
      includeMetadata: true,
    });

    const matches = queryResponse.matches || [];

    const citations = matches.map((match) => ({
      title: match.metadata?.title || 'Documentation Page',
      url: match.metadata?.url || domain,
      snippet: `${(match.metadata?.content as string || '').slice(0, 180)}...`,
      score: match.score,
    }));

    const contextText = matches
      .map((m, idx) => `[Source ${idx + 1}: ${m.metadata?.title} (${m.metadata?.url})]\n${m.metadata?.content}`)
      .join('\n\n---\n\n');

    return { citations, contextText };
  },

  async getChatStream(query: string, domain: string, contextText: string, history: ChatMessage[]) {
    const systemPrompt = `You are a helpful RAG assistant. 
    Use the provided context to answer the user's question. 
    
    CRITICAL: If the context does not contain the answer, or if the context is empty, 
    do NOT say you don't know. Instead, clearly state that you are relying on your 
    general training knowledge, and then answer the question fully based on your 
    own internal knowledge about the topic.

Context:
${contextText || 'No context found.'}`;

    const messages = [
      new SystemMessage(systemPrompt),
      ...history.slice(-4).map((msg) =>
        msg.sender === 'assistant' ? new SystemMessage(msg.text) : new HumanMessage(msg.text)
      ),
      new HumanMessage(query),
    ];

    return model.stream(messages);
  }
};