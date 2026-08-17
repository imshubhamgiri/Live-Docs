import React from 'react';
  import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
  
  export type StepStatus = 'pending' | 'loading' | 'completed';
  
  export interface IngestionStep {
    id: string;
    label: string;
    detail?: string;
    status: StepStatus;
  }
  
  interface IngestionModalProps {
    docUrl: string;
    progressPercent: number;
    ingestionSteps: IngestionStep[];
  }
  
  export const IngestionModal: React.FC<IngestionModalProps> = ({
    docUrl,
    progressPercent,
    ingestionSteps,
  }) => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-slate-100/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full shadow-2xl space-y-6">
          {/* Top Banner Header */}
          <div>
            <div className="text-xs font-semibold text-blue-600 tracking-wide uppercase mb-1 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing Knowledge Base
            </div>
            <h2 className="text-lg font-bold text-slate-900 break-all">
              Connecting and Scraping '{docUrl}'...
            </h2>
          </div>
  
          {/* Progress Bar Component */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Scraping Page Content</span>
              <span className="text-blue-600 font-mono">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div 
                className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
  
          {/* Ingestion Steps Timeline */}
          <div className="space-y-3.5 pt-2">
            {ingestionSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {step.status === 'loading' && (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50 shrink-0" />
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <p className={`font-semibold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                    {step.label}
                  </p>
                  {step.detail && step.status !== 'pending' && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
  
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Self-Healing Active
            </span>
            <span>Scraper Studio SDK v2</span>
          </div>
        </div>
      </div>
    );
  };