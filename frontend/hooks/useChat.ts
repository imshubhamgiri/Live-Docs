// hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { IndexedPage } from './useIngestion';

export interface SourceCitation {
  title: string;
  url: string;
  snippet: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: SourceCitation[];
  codeBlock?: { language: string; code: string };
}

export const useChat = (docUrl: string, indexedPages: IndexedPage[], roomId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keeps the latest `messages` readable inside sendMessage without needing
  // `messages` in the useCallback deps (avoids recreating sendMessage on
  // every streamed token update, while still avoiding stale data).
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const content = inputQuery;
      if (!content.trim() || isTyping) return;

      // User message
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputQuery('');
      setIsTyping(true);

      // Placeholder assistant message
      const botMsgId = `a-${Date.now() + 1}`;
      setMessages(prev => [
        ...prev,
        { id: botMsgId, sender: 'assistant', text: '', timestamp: '', sources: [], codeBlock: undefined }
      ]);

      try {
        const { hostname: domain } = new URL(docUrl.startsWith('http') ? docUrl : `https://${docUrl}`);

        const response = await fetch('http://localhost:4000/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: content,
            domain,
            conversationHistory: messagesRef.current,
            roomId,
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let accumulatedText = '';
        let citations: SourceCitation[] = [];
        let codeSnippet: { language: string; code: string } | undefined = undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.replace('data: ', ''));

                if (parsed.type === 'citations') {
                  citations = parsed.citations;
                } else if (parsed.type === 'token') {
                  accumulatedText += parsed.token;
                } else if (parsed.type === 'code') {
                  codeSnippet = parsed.codeBlock;
                }

                // Update assistant message incrementally
                setMessages(prev =>
                  prev.map(m =>
                    m.id === botMsgId
                      ? {
                          ...m,
                          text: accumulatedText,
                          sources: citations,
                          codeBlock: codeSnippet,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        }
                      : m
                  )
                );
              } catch {
                // Ignore partial JSON chunks
              }
            }
          }
        }
      } catch (err) {
        console.error('Streaming failed:', err);
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? { ...m, text: '⚠️ Failed to fetch response.', sources: [] }
              : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [docUrl, indexedPages,messages ,isTyping, inputQuery, roomId]
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return {
    messages,
    inputQuery,
    setMessages,
    setInputQuery,
    isTyping,
    sendMessage,
    messagesEndRef,
  };
};
