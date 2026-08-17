// brightData.service.ts
import { bdClient } from '../config/brightdata.config.js';

export class BrightDataService {
  private static instance: BrightDataService;

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
      description: 'Extract the main page title, and a list of all items/articles.',
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
      [{ url: targetUrl, max_pages: 1 }],
      { params: { collector: collectorId } }
    );
    return res.data.collection_id || res.data.id;
  }

  async pollDataset(collectionId: string): Promise<any[]> {
    let attempts = 0;
    const maxAttempts = 180;
    while (attempts < maxAttempts) {
      await this.delay(5000);
      try {
        const res = await bdClient.get(`/dca/dataset`, { params: { id: collectionId } });
        const data = res.data;
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Object.keys(data).length > 0 && data.status !== 'building') {
          return [data];
        }
      } catch (e: any) {
        if (e.response?.status !== 202) throw e;
      }
      attempts++;
    }
    throw new Error(`Timed out waiting for collection: ${collectionId}`);
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
