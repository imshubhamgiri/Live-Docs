import React from 'react';
  
  export const Footer: React.FC = () => {
    return (
      <footer className="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span>Docs→RAG</span>
            <span className="text-slate-300">•</span>
            <span className="font-normal text-slate-500">Hackathon Prototype</span>
          </div>
          <div className="flex items-center space-x-6 text-slate-500">
            <a href="#scraper-studio" className="hover:text-slate-800">Scraper Studio Docs</a>
            <a href="#self-healing" className="hover:text-slate-800">Self-Healing API</a>
            <a href="#privacy" className="hover:text-slate-800">Terms & Privacy</a>
          </div>
        </div>
      </footer>
    );
  };