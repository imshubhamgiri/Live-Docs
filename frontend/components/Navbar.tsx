import React from 'react';
  import { BookOpen, ShieldCheck, PlusCircle } from 'lucide-react';
  
  interface NavbarProps {
    appState: 'home' | 'ingesting' | 'chat';
    onResetToHome: () => void;
  }
  
  export const Navbar: React.FC<NavbarProps> = ({ appState, onResetToHome }) => {
    return (
      <header className="sticky top-0 z-40 h-[61px] shrink-0 box-border bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div 
          onClick={onResetToHome}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-all">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex items-center text-lg font-bold tracking-tight text-slate-900">
            <span>Docs</span>
            <span className="text-blue-600 font-extrabold mx-0.5">→</span>
            <span>RAG</span>
          </div>
        </div>
  
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <button onClick={onResetToHome} className="hover:text-blue-600 transition-colors">Home</button>
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
          <a href="#brightdata" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Bright Data Scraper
          </a>
          <a href="https://github.com/imshubhamgiri" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a>
        </nav>
  
        <div className="flex items-center space-x-3">
          {appState === 'chat' && (
            <button 
              onClick={onResetToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              New Documentation URL
            </button>
          )}
          <div className="h-4 w-px bg-slate-200 hidden md:block" />
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Hackathon Edition v1.0
          </span>
        </div>
      </header>
    );
  };
 