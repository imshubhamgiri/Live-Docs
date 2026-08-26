'use client';

import React, { useState , useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroView } from '../components/HeroView';
import { IngestionModal, IngestionStep } from '../components/IngestionModal';
import { ChatView, IndexedPage, Message, SourceCitation } from '../components/ChatView';
import { Footer } from '../components/Footer';
import { useSocket } from "../context/socketcontext";
import {useIngestion} from '../hooks/useIngestion';
import { useChat } from '../hooks/useChat';
import { useApp } from '../context/AppContext';
  
  const PRESET_URLS = [
    'https://docs.brightdata.com/scraper-studio',
    'https://docs.stripe.com/api/authentication',
    'https://docs.docker.com/engine/reference'
  ];
  
  export default  function Home() {
    // const [appState, setAppState] = useState<'home' | 'ingesting' | 'chat'>('home');
    const [docUrl, setDocUrl] = useState<string>('https://docs.brightdata.com/v2/guides');
    const { socket, isJoined } = useSocket();
    // const [roomId, setRoomId] = useState<string | null>(null);
    // const [messages, setMessages] = useState<Message[]>([]);
    // const [inputQuery, setInputQuery] = useState<string>('');
    // const [isTyping, setIsTyping] = useState<boolean>(false);
    // useEffect(() => {
    //   setRoomId(typeof window !== 'undefined' ? localStorage.getItem('global_room_id') : null);
    // }, [isJoined]);

    const {appState , setAppState , resetToHome , RoomId} = useApp();


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
const { messages, inputQuery, setMessages, setInputQuery, isTyping, sendMessage, messagesEndRef } = useChat(docUrl, indexedPages, RoomId);
    
    // const handleResetToHome = () => {
    //   setAppState('home');
    //   setMessages([]);
    //   // setProgressPercent(0);
    // };
  
    return (
      <div className={`flex flex-col ${appState === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Navbar appState={appState} onResetToHome={resetToHome} />
        
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
              onSendMessage={sendMessage}
              onReindex={startIngestion}
              bottomRef={messagesEndRef}
            />
          )}
        </main>
  
        {appState === 'home' && <Footer />}
      </div>
    );
  }
  