// brightData.service.ts
import { bdClient } from '../config/brightdata.config.js';
import { ScrapedDoc } from '../schemas/docSchema.js';

export class BrightDataService {
  private static instance: BrightDataService;
 private  promptDescription:string =
  "Extract structured documentation: " +
  "`title` (the main page/article title), " +
  "`content` (the full main article body text formatted as clean markdown), " +
  "`headings` (a string array of all h1, h2, and h3 subheadings), " +
  "and `code_blocks` (a string array of all preformatted code snippets).";

  private constructor() {}

  public static getInstance(): BrightDataService {
    if (!BrightDataService.instance) {
      BrightDataService.instance = new BrightDataService();
    }
    return BrightDataService.instance;
  }

  async buildCollector(domain: string): Promise<string> {
    const uniqueName = `rag_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const res = await bdClient.post('/dca/collector', {
      name: uniqueName,
      deliver: { type: 'api_pull' }
    });
    return res.data.id || res.data.collector_id;
  }

  async trainTemplate(collectorId: string, targetUrl: string): Promise<void> {
    await bdClient.post(`/dca/collectors/${collectorId}/automate_template`, {
      description: this.promptDescription,
      urls: [targetUrl]
    });
  }

  async waitForAI(collectorId: string, emitStatus: Function): Promise<void> {
    let attempts = 0;
    while (attempts < 30) {
      await this.delay(9000);
      try {
        const res = await bdClient.get(`/dca/collectors/${collectorId}/automate_template/progress`);
        const status = res.data.status;
        if (status === 'done' || status === 'completed') return;
        if (status === 'failed') throw new Error("AI Training Failed");
      } catch { /* retry */ }
      attempts++;
    }
    emitStatus('failed', 'AI Training timed out.');
    throw new Error("AI Training timed out");
  }

  async verifyTemplateExists(collectorId: string): Promise<void> {
    try {
      const res = await bdClient.get(`/dca/collectors/${collectorId}`);
      if (!res.data.template && !res.data.schema) {
        throw new Error("Template not ready");
      }
    } catch {
      await this.delay(3000);
    }
  }

  async runCollector(targetUrl: string, collectorId: string): Promise<string> {
    const res = await bdClient.post(
      '/dca/trigger',
      [{ url: targetUrl }],
      { params: { collector: collectorId } }
    );
    return res.data.collection_id || res.data.id;
  }

  // async pollDataset(collectionId: string): Promise<ScrapedDoc[]> {
  //   let attempts = 0;
  //   const maxAttempts = 180;
  //   while (attempts < maxAttempts) {
  //     await this.delay(5000);
  //     try {
  //       const res = await bdClient.get(`/dca/dataset`, { params: { id: collectionId } });
  //       const data = res.data;
  //       if (Array.isArray(data)) return data;
  //       if (data && typeof data === 'object' && Object.keys(data).length > 0 && data.status !== 'building') {
  //         return [data];
  //       }
  //     } catch (e: any) {
  //       if (e.response?.status !== 202) throw e;
  //     }
  //     attempts++;
  //   }
  //   throw new Error(`Timed out waiting for collection: ${collectionId}`);
  // }
  async  pollDataset(collectionId: string) {
    let attempts = 0;
    const maxAttempts = 180;
  
    console.log(`[Dataset Poll] Starting tracking sequence for collection: ${collectionId}`);
  
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000)); // Poll every 5 seconds
  
      try {
        const res = await bdClient.get(`/dca/dataset`, { params: { id: collectionId } });
        const data = res.data;
  
        // 1. Success Case: Bright Data status strings indicating background processing
        if (data && (data.status === 'building' || data.status === 'collecting')) {
          if (attempts % 4 === 0) {
            console.log(`[Dataset Poll] ⏳ Job is still running (${data.status})... (Elapsed: ${attempts * 5}s)`);
          }
          attempts++;
          continue; // ◄ FORCE KEEP LOOPING
        }
  
        // 2. Standard Array Result
        if (Array.isArray(data)) {
          // Double check it's not a list containing a placeholder object
          if (data.length === 1 && (data[0].status === 'collecting' || data[0].status === 'building')) {
            console.log(`[Dataset Poll] ⏳ Extracted array status placeholder. Keeping pool alive...`);
            attempts++;
            continue;
          }
          console.log(`[Dataset Poll] Success on Attempt ${attempts + 1}: Retrieved ${data.length} record(s)!`);
          return data; 
        }
  
        // 3. Single Object Result (Genuine output data)
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          // Ensure this isn't an error message block
          if ('error' in data || 'validation_errors' in data) {
            throw new Error(`Bright Data Runtime Crawler Error: ${JSON.stringify(data)}`);
          }
          
          console.log(`[Dataset Poll] Success on Attempt ${attempts + 1}: Retrieved single object record!`);
          return [data]; 
        }
  
      } catch (e: any) {
        if (e.response?.status === 202) {
          console.log(`[Dataset Poll] ⏳ Job is queued or processing on Bright Data infrastructure...`);
        } else {
          console.log(`[Dataset Poll] Network or API sync delay: ${e.message}`);
        }
      }
  
      attempts++;
    }
  
    throw new Error(`Timed out waiting for dataset results after 15 minutes. Collection ID: ${collectionId}`);
  }

  async selfhealing(targetUrl: string, collectorId: string) {
    try {
      await bdClient.post(`/dca/collectors/${collectorId}/refactor_template`, {
        prompt: this.promptDescription,
        custom_input: { url: targetUrl }
      });
    } catch (e: any) {
      console.error(`Self-Healing Error: ${e.message}`);
      throw new Error(`Self-Healing Failed: ${e.message}`);
    }
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
