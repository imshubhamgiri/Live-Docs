import type { Metadata } from 'next';
 import './globals.css';
import { SocketProvider } from '../context/socketcontext';
import { AppProvider } from '../context/AppContext';
  
  export const metadata: Metadata = {
    title: 'Docs→RAG | Self-Healing Web Scraping + AI Vector Search',
    description: 'Transform static documentation into interactive AI chat with source citations.',
  };
  
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en">
        <body className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        <SocketProvider>
          <AppProvider> 
          {children}
          </AppProvider>
        </SocketProvider>
        </body>
      </html>
    );
  }