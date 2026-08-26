// hooks/useIngestion.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

export type StepStatus = 'pending' | 'loading' | 'completed';
  
export interface IngestionStep {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
}

export interface IndexedPage {
  id: string;
  title: string;
  url: string;
  chunks: number;
  extractedAt: string;
}

interface UseIngestionProps {
  socket: Socket | null;
  docUrl: string;
  appState: 'home' | 'ingesting' | 'chat';
  setAppState: (state: 'home' | 'ingesting' | 'chat') => void;
  onComplete?: (indexedPages: IndexedPage[], totalChunks: number) => void;
  onError?: (message: string) => void;
}

export const useIngestion = ({ socket, docUrl, appState, setAppState, onComplete, onError }: UseIngestionProps) => {
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [ingestionSteps, setIngestionSteps] = useState<IngestionStep[]>([
    { id: '1', label: 'Validating Target URL', status: 'pending' },
    { id: '2', label: 'Analyzing Site Structure & Routes', status: 'pending' },
    { id: '3', label: 'Extracting Markdown Text (Self-Healing Enabled)', detail: 'Scraper Studio Engine active', status: 'pending' },
    { id: '4', label: 'Chunking & Vectorizing Content', detail: 'Embedding dimensions: 1536', status: 'pending' },
  ]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [indexedPages, setIndexedPages] = useState<IndexedPage[]>([]);

  // Ref to avoid stale closures in event listener
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Reset steps to initial (with loading on first step) when ingestion starts
  const resetSteps = useCallback(() => {
    setIngestionSteps([
      { id: '1', label: 'Validating Target URL', status: 'loading', detail: 'Url Validation in progress...' },
      { id: '2', label: 'Analyzing Site Structure & Routes', status: 'pending', detail: 'Validating... Structure' },
      { id: '3', label: 'Extracting Markdown Text (Self-Healing Enabled)', detail: 'Scraper Studio Engine active', status: 'pending' },
      { id: '4', label: 'Chunking & Vectorizing Content', detail: 'Embedding dimensions: 1536', status: 'pending' },
    ]);
    setProgressPercent(5);
  }, []);

  // Function to start the ingestion (call this from UI)
  const startIngestion = useCallback(async () => {
    if (!docUrl.trim() || !socket) return;

    setAppState('ingesting');
    setProgressPercent(5);
    resetSteps();

    const globalRoomId = localStorage.getItem('global_room_id');
    try {
      const response = await fetch('http://localhost:4000/api/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: globalRoomId, url: docUrl }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      // Server will emit 'scrape_status' events; we handle them in the listener below
    } catch (err) {
      console.error('Failed to trigger ingestion:', err);
      setAppState('home');
      onErrorRef.current?.('Failed to start ingestion. Please try again.');
    }
  }, [docUrl, socket, resetSteps]);

  // Set up socket listener for 'scrape_status'
  useEffect(() => {
    if (!socket) return;

    const handleScrapeStatus = (data: { roomId: string; status: string; message: string }) => {

      // Handle failure
      if (data.status === 'failed') {
        setIsIngesting(false);
        onErrorRef.current?.(data.message || 'Ingestion failed');
        return;
      }

      const msg = (data.message || '').toLowerCase();

      // 1. Queued -> URL validated
      if (data.status === 'queued') {
        setProgressPercent(25);
        setIngestionSteps(prev =>
          prev.map(s => {
            if (s.id === '1') {
              return { ...s, status: 'completed', detail: data.message || 'Target URL verified' };
            }
            if (s.id === '2') {
              return { ...s, status: 'loading', detail: 'Analyzing site routes...' };
            }
            return s;
          })
        );
      }

      // 2. Training AI layout / processing
      if (data.status === 'training_ai_layout' || data.status === 'processing') {
        setProgressPercent(50);
        const isFinished = msg.includes('completed') || msg.includes('job is being processed');
        setIngestionSteps(prev =>
          prev.map(s => {
            if (s.id === '2') {
              return {
                ...s,
                status: isFinished ? 'completed' : 'loading',
                detail: data.message || s.detail,
              };
            }
            if (s.id === '3') {
              return { ...s, status: isFinished ? 'loading' : 'pending' };
            }
            return s;
          })
        );
      }

      // 3. Extracting data
      if (data.status === 'extracting_data') {
        setProgressPercent(75);
        setIngestionSteps(prev =>
          prev.map(s => {
            if (s.id === '3') {
              return { ...s, status: 'loading', detail: data.message || s.detail };
            }
            return s;
          })
        );
      }

      // 4. Completed
      if (data.status === 'completed') {
        setProgressPercent(90);
        setIngestionSteps(prev =>
          prev.map(s => {
            if (s.id === '3') return { ...s, status: 'completed' };
            if (s.id === '4') return { ...s, status: 'loading', detail: data.message || 'Generating vector embeddings...' };
            return s;
          })
        );

        // Check if message contains success and index info
        if (msg.includes('successfully') && msg.includes('index')) {
          const totalChunked = msg.match(/\d+/)?.[0] || '0';

          // After a delay, finalise progress and generate indexed pages
          setTimeout(() => {
            setProgressPercent(100);
            setIngestionSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));

            const hostname = new URL(docUrl.startsWith('http') ? docUrl : `https://${docUrl}`).hostname;
            const pages: IndexedPage[] = [
              { id: 'p1', title: `${hostname} - Overview & Quickstart`, url: `${docUrl}#quickstart`, chunks: 14, extractedAt: 'Just now' },
              { id: 'p2', title: `${hostname} - API Authentication & Keys`, url: `${docUrl}#auth`, chunks: 22, extractedAt: 'Just now' },
              { id: 'p3', title: `${hostname} - Endpoints & Payload Schema`, url: `${docUrl}#endpoints`, chunks: 38, extractedAt: 'Just now' },
              { id: 'p4', title: `${hostname} - Error Codes & Troubleshooting`, url: `${docUrl}#errors`, chunks: 19, extractedAt: 'Just now' },
            ];
            setIndexedPages(pages);
            setIsIngesting(false);

            // Notify parent that ingestion is complete
            onCompleteRef.current?.(pages, Number(totalChunked));
          }, 2000);
        }
      }
    };

    socket.on('scrape_status', handleScrapeStatus);

    return () => {
      socket.off('scrape_status', handleScrapeStatus);
    };
  }, [socket, docUrl]); // only re-run if socket or docUrl changes

  return {
    progressPercent,
    ingestionSteps,
    isIngesting,
    indexedPages,
    startIngestion,
    setProgressPercent, // if needed for manual updates
    setIngestionSteps,
  };
};