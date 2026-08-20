import { Request, Response } from 'express';
import { ragService } from '../services/chat.service.js';

export const chatController = {
  streamChat: async (req: Request, res: Response) => {
    const { query, domain, conversationHistory = [] , roomId} = req.body;

    if (!query || !domain) {
      return res.status(400).json({ error: 'Query and domain are required' });
    }

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // 1. Retrieve vector context and citations from Pinecone
      const { citations, contextText } = await ragService.retrieveContext(query, domain , roomId);

      // Send citations as the first event payload
      res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);

      // 2. Stream tokens from LLM
      const stream = await ragService.getChatStream(query, domain, contextText, conversationHistory);

      for await (const chunk of stream) {
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ type: 'token', token: chunk.content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('RAG Chat Streaming Error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
};