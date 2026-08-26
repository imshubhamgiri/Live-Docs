import React, { memo } from 'react';
import { Globe, ArrowRight, Sparkles, Cpu, ShieldCheck, Database } from 'lucide-react';
  
  interface HeroViewProps {
    docUrl: string;
    setDocUrl: (url: string) => void;
    onSubmit: (e?: React.SubmitEvent<HTMLFormElement>) => void;
    presetUrls: string[];
  }
  
  export const HeroView: React.FC<HeroViewProps> = memo(({
    docUrl,
    setDocUrl,
    onSubmit,
    presetUrls,
  }) => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 max-w-4xl mx-auto w-full text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Self-Healing Web Scraping + AI Vector Search</span>
        </div>
  
        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
          Understand any documentation, <br />
          <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-indigo-600">
            instantly.
          </span> Connect a URL and start chatting.
        </h1>
  
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed font-normal">
          Transform static API docs, developer guides, and engineering manual pages into an interactive conversational AI with real-time source citations.
        </p>
  
        {/* URL Submission Form Box */}
        <form onSubmit={onSubmit} className="w-full max-w-2xl mb-8">
          <div className="relative flex flex-col sm:flex-row items-center rounded-2xl bg-white p-2 shadow-xl shadow-slate-200/60 border border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
            <div className="pl-4 text-slate-400" id="how-it-works">
              <Globe className="w-5 h-5" />
            </div>
            <input
              type="url"
              required
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="Enter documentation URL (e.g., [https://docs.stripe.com/v2/guides](https://docs.stripe.com/v2/guides))"
              className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
            />
            <button
              type="submit"
              className="shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all"
            >
              <span>Connect & Index</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
  
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 mb-16">
          <span className="font-semibold text-slate-600">Try example URLs:</span>
          {presetUrls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setDocUrl(url)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-mono"
            >
              {url.replace('https://', '')}
            </button>
          ))}
        </div>
  
        {/* Architectural Highlights / Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-8 border-t border-slate-200" id='brightdata'>
          <div id="brightdata" className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-sm">Bright Data Scraper Studio</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts structured titles, headers, and code snippets from documentation without manually writing parsers.
            </p>
          </div>
  
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-sm">Self-Healing Selectors</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If the doc site updates CSS classes or layout hierarchy, the scraper automatically heals itself without crashing RAG pipelines.
            </p>
          </div>
  
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-sm">Strict Source Citations</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every answer generates direct deep-links back to the specific documentation section relied upon.
            </p>
          </div>
        </div>
      </div>
    );
  });

