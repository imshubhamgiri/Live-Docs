'use client';

import React, { useState , useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroView } from '../components/HeroView';
import { IngestionModal, IngestionStep } from '../components/IngestionModal';
import { ChatView, IndexedPage, Message, SourceCitation } from '../components/ChatView';
import { Footer } from '../components/Footer';
import { useSocket } from "../context/socketcontext";
  
  const PRESET_URLS = [
    '[https://docs.brightdata.com/scraper-studio](https://docs.brightdata.com/scraper-studio)',
    '[https://docs.stripe.com/api/authentication](https://docs.stripe.com/api/authentication)',
    '[https://docs.docker.com/engine/reference](https://docs.docker.com/engine/reference)'
  ];
  
  export default  function Home() {
    const [appState, setAppState] = useState<'home' | 'ingesting' | 'chat'>('home');
    const [docUrl, setDocUrl] = useState<string>('[https://docs.brightdata.com/v2/guides](https://docs.brightdata.com/v2/guides)');
    const { socket, isJoined } = useSocket();
    
    const [progressPercent, setProgressPercent] = useState<number>(0);
    const [ingestionSteps, setIngestionSteps] = useState<IngestionStep[]>([
      { id: '1', label: 'Validating Target URL', status: 'pending' },
      { id: '2', label: 'Analyzing Site Structure & Routes', status: 'pending' },
      { id: '3', label: 'Extracting Markdown Text (Self-Healing Enabled)', detail: 'Scraper Studio Engine active', status: 'pending' },
      { id: '4', label: 'Chunking & Generating Vector Embeddings', detail: 'Pinecone Vector Store', status: 'pending' }
    ]);
  
    const [indexedPages, setIndexedPages] = useState<IndexedPage[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputQuery, setInputQuery] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
  // Setup socket listener with proper cleanup
  useEffect(() => {
    if (!socket) return;
  
    const handleScrapeStatus = (data: { roomId: string; status: string; message: string }) => {
      console.log('Received scrape_status:', data, data.message);
  
      const msg = (data.message || '').toLowerCase();
  
      // 1. Target URL Validated / Queued
      if(data.status === 'failed') {
        setAppState('home');
        setProgressPercent(0);
        setIngestionSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
        alert(`Ingestion failed: ${data.message || 'Unknown error'}`);
        return;
      }

      if (data.status === 'queued') {
        setProgressPercent(25);
        setIngestionSteps(prev => prev.map(s => {
          if (s.id === '1') {
            return { ...s, status: 'completed', detail: data.message || 'Target URL verified' };
          }
          if (s.id === '2') {
            return { ...s, status: 'loading', detail: 'Analyzing site routes...' };
          }
          return s;
        }));
      }
  
      // 2. Analyzing Site Structure & AI Layout
      if (data.status === 'training_ai_layout' || data.status === 'processing') {
        setProgressPercent(55);
        const isFinished = msg.includes('completed') || msg.includes('job is being processed');
  
        setIngestionSteps(prev => prev.map(s => {
          if (s.id === '2') {
            return {
              ...s,
              status: isFinished ? 'completed' : 'loading',
              detail: data.message || s.detail, // Always updates with backend message
            };
          }
          if (s.id === '3') {
            return { ...s, status: isFinished ? 'loading' : 'pending' };
          }
          return s;
        }));
      }
  
      // 3. Extracting Data
      if (data.status === 'extracting_data') {
        setProgressPercent(75);
        setIngestionSteps(prev => prev.map(s => {
          if (s.id === '3') {
            return { ...s, status: 'loading', detail: data.message || s.detail };
          }
          return s;
        }));
      }
  
      // 4. Completed
      if (data.status === 'completed') {
        setProgressPercent(90);
        setIngestionSteps(prev => prev.map(s => {
          if (s.id === '3') return { ...s, status: 'completed' ,detail:'Markdown extraction complete' };
          if (s.id === '4') return { ...s, status: 'loading', detail: data.message || 'Generating vector embeddings...' };
          return s;
        }));

        if(data.message && data.message.toLowerCase().includes('successfully ') && data.message.toLowerCase().includes('index')) {  
          const totalChunked = data.message.match(/\d+/)?.[0] || '0';
        setTimeout(() => {
          setProgressPercent(100);
          setIngestionSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
  
          const hostname = new URL(docUrl.startsWith('http') ? docUrl : `https://${docUrl}`).hostname;
          const pages: IndexedPage[] = [
            { id: 'p1', title: `${hostname} - Overview & Quickstart`, url: `${docUrl}#quickstart`, chunks: 14, extractedAt: 'Just now' },
            { id: 'p2', title: `${hostname} - API Authentication & Keys`, url: `${docUrl}#auth`, chunks: 22, extractedAt: 'Just now' },
            { id: 'p3', title: `${hostname} - Endpoints & Payload Schema`, url: `${docUrl}#endpoints`, chunks: 38, extractedAt: 'Just now' },
            { id: 'p4', title: `${hostname} - Error Codes & Troubleshooting`, url: `${docUrl}#errors`, chunks: 19, extractedAt: 'Just now' }
          ];
          setIndexedPages(pages);
  
          setTimeout(() => {
            setAppState('chat');
            setMessages([
              {
                id: 'm-welcome',
                sender: 'assistant',
                text: `Index complete! I have processed **${docUrl}** using Bright Data Scraper Studio. ${totalChunked} total chunks vectorized and stored in knowledge context.\n\nYou can now ask any technical or conceptual questions about this documentation.`,
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
        }, 2000);
      }
      }
    };
  
    socket.on('scrape_status', handleScrapeStatus);
  
    return () => {
      socket.off('scrape_status', handleScrapeStatus);
    };
  }, [socket, docUrl, appState]);

    const handleStartIngestion = async (e?: React.SubmitEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      if (!docUrl.trim()) return;
      
      setAppState('ingesting');
      setProgressPercent(5);
  
      setIngestionSteps([
        { id: '1', label: 'Validating Target URL', status: 'loading',detail:'Url Validation in progress...' },
        { id: '2', label: 'Analyzing Site Structure & Routes', status: 'pending' , detail:'Validating... Structure' },
        { id: '3', label: 'Extracting Markdown Text (Self-Healing Enabled)', detail: 'Scraper Studio Engine active', status: 'pending' },
        { id: '4', label: 'Chunking & Vectorizing Content', detail: 'Embedding dimensions: 1536', status: 'pending' }
      ]);
   
      // Get the room ID from localStorage (same one used in socket join)
      const globalRoomId = localStorage.getItem('global_room_id');
      
      try {
        const response = await fetch('http://localhost:4000/api/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId: globalRoomId , url: docUrl}),
        });
    
        if (!response.ok) {
          throw new Error(`Server returned status: ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Ingestion response:', data);
    
      } catch (err) {
        // Catching the network failure safely so the UI doesn't crash
        console.error('Failed to trigger ingestion endpoint:', err);
        setAppState('home');
        return;
      }
    };
  
    // const handleSendMessage = (e?: React.SubmitEvent<HTMLFormElement>) => {
    //   if (e) e.preventDefault();
    //   if (!inputQuery.trim() || isTyping) return;
  
    //   const userMsg: Message = {
    //     id: `u-${Date.now()}`,
    //     sender: 'user',
    //     text: inputQuery,
    //     timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    //   };
  
    //   setMessages(prev => [...prev, userMsg]);
    //   const queryText = inputQuery;
    //   setInputQuery('');
    //   setIsTyping(true);
  
    //   setTimeout(() => {
    //     let aiText = "";
    //     let codeSnippet: { language: string; code: string } | undefined = undefined;
    //     let citations: SourceCitation[] = [];
  
    //     const lowerQ = queryText.toLowerCase();
    //     if (lowerQ.includes('auth') || lowerQ.includes('key') || lowerQ.includes('header') || lowerQ.includes('token')) {
    //       aiText = "To authenticate your requests against this API, you must pass your API secret key inside the HTTP `Authorization` header as a Bearer token. All requests must be transmitted over HTTPS.";
    //       codeSnippet = {
    //         language: 'bash',
    //         code: `curl -X POST "${docUrl}/v1/query" \\\n  -H "Authorization: Bearer YOUR_BRIGHTDATA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"zone": "web_unlocker", "url": "https://target-doc.com"}'`
    //       };
    //       citations = [
    //         {
    //           title: 'Authentication & API Keys',
    //           url: `${docUrl}#auth`,
    //           snippet: 'All API endpoints require Bearer authentication headers...'
    //         }
    //       ];
    //     } else if (lowerQ.includes('scraper') || lowerQ.includes('self-healing') || lowerQ.includes('bright')) {
    //       aiText = "Bright Data's **Scraper Studio** automatically applies AI self-healing selectors. When target documentation sites change their HTML hierarchy or CSS class names, the collector detects DOM shifts and re-targets elements dynamically without failing your ingestion pipeline.";
    //       codeSnippet = {
    //         language: 'json',
    //         code: `{\n  "collector_id": "c_docs_rag_v2",\n  "status": "active",\n  "self_healing": true,\n  "extracted_fields": ["h1", "h2", "article_markdown", "code_blocks"]\n}`
    //       };
    //       citations = [
    //         {
    //           title: 'Scraper Studio Self-Healing Architecture',
    //           url: `${docUrl}#self-healing`,
    //           snippet: 'Automated selector repair guarantees zero downtime during doc schema updates.'
    //         }
    //       ];
    //     } else {
    //       aiText = `Based on the vector index of **${docUrl}**, here is the pertinent guidance:\n\n1. Ensure your requests target the correct environment endpoints.\n2. Parse response payloads directly as JSON objects.\n3. Utilize standard HTTP response status codes (200 for OK, 401 for Unauthorized, 429 for Rate Limit).`;
    //       codeSnippet = {
    //         language: 'javascript',
    //         code: `// Sample Client Request\nconst response = await fetch("${docUrl}/data", {\n  headers: { "Accept": "application/json" }\n});\nconst data = await response.json();\nconsole.log(data);`
    //       };
    //       citations = [
    //         {
    //           title: 'API Reference - Requests & Responses',
    //           url: `${docUrl}#endpoints`,
    //           snippet: 'Standard JSON schemas and standard HTTP status code handling...'
    //         }
    //       ];
    //     }
  
    //     const aiMsg: Message = {
    //       id: `a-${Date.now()}`,
    //       sender: 'assistant',
    //       text: aiText,
    //       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    //       codeBlock: codeSnippet,
    //       sources: citations
    //     };
  
    //     setMessages(prev => [...prev, aiMsg]);
    //     setIsTyping(false);
    //   }, 1400);
    // };
  
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
      setProgressPercent(0);
    };
  
    return (
      <div className={`flex flex-col ${appState === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Navbar appState={appState} onResetToHome={handleResetToHome} />
        
        <main className={`flex-1 flex flex-col ${appState === 'chat' ? 'min-h-0' : ''}`}>
          {appState === 'home' && (
            <HeroView 
              docUrl={docUrl}
              setDocUrl={setDocUrl}
              onSubmit={handleStartIngestion}
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
              onReindex={handleStartIngestion}
            />
          )}
        </main>
  
        {appState === 'home' && <Footer />}
      </div>
    );
  }
  