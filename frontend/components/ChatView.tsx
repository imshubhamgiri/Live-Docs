import React, { useRef, useEffect } from 'react';
  import { 
    Layers, 
    CheckCircle2, 
    RefreshCw, 
    Sparkles, 
    User, 
    Bot, 
    Code2, 
    ExternalLink, 
    Loader2, 
    Send 
  } from 'lucide-react';
  
  export interface IndexedPage {
    id: string;
    title: string;
    url: string;
    chunks: number;
    extractedAt: string;
  }
  
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
    codeBlock?: {
      language: string;
      code: string;
    };
  }
  
  interface ChatViewProps {
    docUrl: string;
    indexedPages: IndexedPage[];
    messages: Message[];
    inputQuery: string;
    setInputQuery: (query: string) => void;
    isTyping: boolean;
    onSendMessage: (e?: React.FormEvent) => void;
    onReindex: () => void;
  }
  
  export const ChatView: React.FC<ChatViewProps> = ({
    docUrl,
    indexedPages,
    messages,
    inputQuery,
    setInputQuery,
    isTyping,
    onSendMessage,
    onReindex,
  }) => {
    const chatBottomRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);
  
    return (
      // {/* The page wrapper reserves the navbar row and constrains this flex child
      //     to the remaining viewport height. Internal panels own their scrolling. */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
      
          {/* LEFT SIDEBAR: INDEXED PAGES & KNOWLEDGE STATUS */}
          <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0">
            {/* min-h-0 added here too — aside is a flex child of the row above,
                and it's a column flex container for its own children below,
                so it needs the same "allow me to shrink" permission. */}
      
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Indexed Pages
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
      
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-xs">
                <p className="text-slate-500 text-[11px] font-medium">Active Knowledge Base</p>
                <p className="font-semibold text-slate-900 truncate font-mono mt-0.5" title={docUrl}>
                  {docUrl}
                </p>
              </div>
            </div>
      
            {/* Indexed Document List — this is the sidebar's own scroll area,
                this part was already correct (flex-1 + overflow-y-auto), 
                left untouched */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Scraped Sections ({indexedPages.length})
              </div>
      
              {indexedPages.map((page) => (
                <div
                  key={page.id}
                  className="group p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                        {page.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {page.chunks} chunks
                        </span>
                        <span>• {page.extractedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      
            {/* Sidebar Footer Metadata */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>Knowledge Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  Ready
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>Scraper Engine:</span>
                <span className="font-medium text-slate-800">Scraper Studio</span>
              </div>
              <button
                onClick={onReindex}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium shadow-2xs transition-all"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                Re-Index Document
              </button>
            </div>
          </aside>
      
          {/* RIGHT CHAT AREA
              REMOVED h-screen — this was the bug. h-screen forces this element to be
              100vh tall regardless of the navbar above it, which pushes total page
              height to (100vh + navbar height) and causes the whole page to scroll.
              This element should NOT declare its own viewport-based height at all —
              it should just be flex-1 (fill whatever space the outer wrapper gives it)
              + min-h-0 (allow it to shrink instead of growing to fit its children).
              The outer wrapper above is the only place with real height math. */}
          <section className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
      
            {/* Top Banner Notice inside Chat — no flex-1, no scroll classes.
                It should just take its natural height and stay fixed at the top. */}
            <div className="bg-blue-50/80 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs text-blue-900 shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>Index complete!</strong> Start your conversation with this documentation context.</span>
              </div>
              <span className="hidden sm:inline-block text-[11px] text-blue-700 font-mono">
                Vector Store: Ready
              </span>
            </div>
      
            {/* Chat Messages Log — THIS is the one div that should actually scroll.
                flex-1: absorb all remaining vertical space after banner + input bar.
                min-h-0: the critical fix — allows this div to be capped at that 
                remaining space instead of growing to fit all the messages.
                overflow-y-auto: now that height is actually capped, this can 
                finally do its job and show a scrollbar instead of pushing the page. */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-semibold text-xs shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600'
                      : 'bg-slate-900'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
      
                  {/* Message Bubble Container */}
                  <div className={`space-y-2 max-w-xl ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}>
                      {/* Render simple markdown bolding & newlines */}
                      <div className="whitespace-pre-wrap">
                        {msg.text.split('**').map((part, i) =>
                          i % 2 === 1 ? <strong key={i} className={msg.sender === 'user' ? 'text-white' : 'text-slate-900'}>{part}</strong> : part
                        )}
                      </div>
      
                      {/* Code Block */}
                      {msg.codeBlock && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs">
                          <div className="bg-slate-800/80 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700/50">
                            <span className="flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-blue-400" />
                              {msg.codeBlock.language}
                            </span>
                            <span>scraped snippet</span>
                          </div>
                          <pre className="p-3 overflow-x-auto text-[11px] leading-normal text-slate-200">
                            <code>{msg.codeBlock.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
      
                    {/* Source Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Verified Source Citations:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <a
                              key={idx}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                              <span>{src.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
      
                    <p className={`text-[10px] text-slate-400 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
      
              {/* AI Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 max-w-xl">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-xs font-medium text-slate-500">Querying vector embeddings & documentation context...</span>
                  </div>
                </div>
              )}
      
              <div ref={chatBottomRef} />
            </div>
      
            {/* Chat Input Bar — added shrink-0 so this bar can never be compressed
                by the flex layout; it always keeps its natural height and stays 
                pinned at the bottom, outside the scrolling area above it. */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={onSendMessage} className="max-w-4xl mx-auto relative flex items-center">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Ask a question about the '${docUrl}' documentation...`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isTyping}
                  className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-lg shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-2 text-center text-[11px] text-slate-400">
                Bright Data Scraper Studio RAG engine • Direct doc citations enabled
              </div>
            </div>
          </section>
      </div>
    );
  };