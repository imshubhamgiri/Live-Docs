'use client';

import React, { useState , useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroView } from '../components/HeroView';
import { IngestionModal, IngestionStep } from '../components/IngestionModal';
import { ChatView, IndexedPage, Message, SourceCitation } from '../components/ChatView';
import { Footer } from '../components/Footer';
import { useSocket } from "../context/socketcontext";
import {useIngestion} from '../hooks/useIngestion';
  
  const PRESET_URLS = [
    'https://docs.brightdata.com/scraper-studio',
    'https://docs.stripe.com/api/authentication',
    'https://docs.docker.com/engine/reference'
  ];
  
  export default  function Home() {
    const [appState, setAppState] = useState<'home' | 'ingesting' | 'chat'>('home');
    const [docUrl, setDocUrl] = useState<string>('https://docs.brightdata.com/v2/guides');
    const { socket, isJoined } = useSocket();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputQuery, setInputQuery] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    useEffect(() => {
      setRoomId(typeof window !== 'undefined' ? localStorage.getItem('global_room_id') : null);
    }, [isJoined]);


    const {
      progressPercent,
      ingestionSteps,
      indexedPages,
      startIngestion,
    } = useIngestion({
      socket,
      docUrl,
      appState,
      setAppState,
      onComplete: (pages, totalChunks) => {
        // Add welcome message when ingestion completes
        setTimeout(() => {
                    setAppState('chat');
                    setMessages([
                      {
                        id: 'm-welcome',
                        sender: 'assistant',
                        text: `Index complete! I have processed **${docUrl}** using Bright Data Scraper Studio. ${totalChunks} total chunks vectorized and stored in knowledge context.\n\nYou can now ask any technical or conceptual questions about this documentation.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        sources: [
                          {
                            title: 'Documentation Root Index',
                            url: docUrl,
                            snippet: 'Extracted 4 main navigation sections and 93 sub-content blocks.'
                          }
                        ]
                      }
                    ]);
                  }, 3000);
      },
      onError: (msg) => {alert(`Ingestion failed: ${msg}`), setAppState('home')},
    });


 const handleSendMessage = async (e?: React.SubmitEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
    
      const queryText = inputQuery;
      if (!queryText.trim() || isTyping) return;
    
      // User message
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
    
      // Reset input + set typing state
      setInputQuery('');
      setIsTyping(true);
    
      // Placeholder assistant message
      const botMsgId = `a-${Date.now() + 1}`;
      setMessages(prev => [
        ...prev,
        { id: botMsgId, sender: 'assistant', text: '', timestamp: '', codeBlock: undefined, sources: [] }
      ]);
    
      try {
        const { hostname: domain } = new URL(docUrl.startsWith('http') ? docUrl : `https://${docUrl}`);
        
        const response = await fetch('http://localhost:4000/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryText,
            domain,
            conversationHistory: messages,
            roomId
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
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
    };
    
    const handleResetToHome = () => {
      setAppState('home');
      setMessages([]);
      // setProgressPercent(0);
    };
  
    return (
      <div className={`flex flex-col ${appState === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Navbar appState={appState} onResetToHome={handleResetToHome} />
        
        <main className={`flex-1 flex flex-col ${appState === 'chat' ? 'min-h-0' : ''}`}>
          {appState === 'home' && (
            <HeroView 
              docUrl={docUrl}
              setDocUrl={setDocUrl}
              onSubmit={startIngestion}
              presetUrls={PRESET_URLS}
            />
          )}
  
          {appState === 'ingesting' && (
            <IngestionModal 
              docUrl={docUrl}
              progressPercent={progressPercent}
              ingestionSteps={ingestionSteps}
            />
          )}
  
          {appState === 'chat' && (
            <ChatView 
              docUrl={docUrl}
              indexedPages={indexedPages}
              messages={messages}
              inputQuery={inputQuery}
              setInputQuery={setInputQuery}
              isTyping={isTyping}
              onSendMessage={handleSendMessage}
              onReindex={startIngestion}
            />
          )}
        </main>
  
        {appState === 'home' && <Footer />}
      </div>
    );
  }
  