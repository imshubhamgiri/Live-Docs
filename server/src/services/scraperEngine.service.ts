// src/services/scraperEngine.service.ts
import { BrightDataService } from '../services/brightData.service.js';
import { dbRepository } from '../repositories/json.db.js';
import { ScrapedDoc } from '../schemas/docSchema.js';
import { validateScrapedDocs } from '../utlis/validateResult.js';

export class DocumentationScraperEngine {
  private brightData = BrightDataService.getInstance();

  /**
   * Ensures a ready collector exists for the domain, creating and training one if absent.
   */
  async ensureCollector(domain: string, targetUrl: string, onProgress: (msg: string) => void): Promise<string> {
    const existing = await dbRepository.findCollectorByDomain(domain);
    if (existing?.collectorId) {
      return existing.collectorId;
    }

    onProgress('Building new Bright Data collector...');
    const collectorId = await this.brightData.buildCollector(domain);
    await this.brightData.trainTemplate(collectorId, targetUrl);

    onProgress('Training AI layout model...');
    await this.brightData.waitForAI(collectorId, onProgress);

    await dbRepository.saveCollector({ domain, collectorId, status: 'ready' });
    return collectorId;
  }

  /**
   * Executes extraction with built-in self-healing recovery.
   */
  async extractWithSelfHealing(
    collectorId: string, 
    targetUrl: string, 
    onStatus: (status: string, message: string) => void
  ): Promise<ScrapedDoc[]> {
    const maxAttempts = 2; // 1 standard run + 1 post-healing retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      onStatus('extracting_data', attempt === 1 ? 'Triggering collector...' : 'Re-extracting after self-healing...');

      const collectionId = await this.brightData.runCollector(targetUrl, collectorId);
      onStatus('extracting_data', 'Polling for dataset completion...');
      const rawData = await this.brightData.pollDataset(collectionId);
      onStatus('extracting_data', `Dataset retrieved with ${rawData.length} items. Validating...`);
      try {
        const validatedDocs = await validateScrapedDocs(rawData, targetUrl);
        return validatedDocs;
      } catch (err: any) {
        const isMismatch = err.message.includes('validation layout mismatch') || err.message.includes('ZodError');

        if (isMismatch && attempt < maxAttempts) {
          onStatus('extracting_data', 'Website layout mismatch detected. Triggering self-healing refactor...');
          
          // 1. Refactor Template
          await this.brightData.triggerRefactor(collectorId, targetUrl);
          
          // 2. Poll for Refactor Completion
          await this.brightData.waitForRefactor(collectorId, (msg) => onStatus('extracting_data', msg));
          
          // 3. Retry loop executes on next iteration
          continue;
        }

        throw err;
      }
    }

    throw new Error('Data validation failed after applying self-healing refactor.');
  }
}