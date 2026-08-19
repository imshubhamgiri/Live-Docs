// scrapeJob.ts
import { BrightDataService } from './brightData.service.js';
import { dbRepository } from '../repositories/json.db.js';
import { processAndStoreEmbeddings } from './rag.service.js';
import { validateScrapedDocs } from '../utlis/validateResult.js';

export async function processScrapeJob(
  jobId: string,
  targetUrl: string,
  domain: string,
  emitStatus: (status: string, message: string) => void
) {
  const brightData = BrightDataService.getInstance();
  dbRepository.updateJobStatus(jobId, 'processing');

  let collectorId = dbRepository.findCollectorByDomain(domain)?.collectorId;

  try {
    if (!collectorId) {
      dbRepository.updateJobStatus(jobId, 'training_ai_layout');
      emitStatus('training_ai_layout', 'Building collector...');

      collectorId = await brightData.buildCollector(domain);
      await brightData.trainTemplate(collectorId, targetUrl);

      emitStatus('training_ai_layout', 'Training AI...');
      await brightData.waitForAI(collectorId, emitStatus);
      emitStatus('training_ai_layout', 'AI training completed.');

      await brightData.verifyTemplateExists(collectorId);

      dbRepository.saveCollector({ domain, collectorId, status: 'ready' });
    }

    emitStatus('processing', 'Job is being processed...');
    dbRepository.updateJobStatus(jobId, 'extracting_data');
    emitStatus('extracting_data', 'Triggering collector...');

    const collectionId = await brightData.runCollector(targetUrl, collectorId);

    emitStatus('extracting_data', 'Polling for dataset...');
    const result = await brightData.pollDataset(collectionId);
    const validatedDocs = await validateScrapedDocs(result, targetUrl, collectorId, brightData.selfhealing);
    emitStatus('completed', `Found ${validatedDocs.length} items. Generating embeddings...`);
    await processAndStoreEmbeddings(validatedDocs, jobId, emitStatus);
    dbRepository.updateJobStatus(jobId, 'completed', validatedDocs.length, 'Job completed successfully.');
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'An unknown error occurred';
    dbRepository.updateJobStatus(jobId, 'failed', null, msg);
    emitStatus('failed', msg);
  }
}
