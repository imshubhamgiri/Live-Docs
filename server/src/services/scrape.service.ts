// scrapeJob.ts
import { BrightDataService } from './brightData.service.js';
import { dbRepository } from '../repositories/json.db.js';
import { processAndStoreEmbeddings } from './rag.service.js';
import { validateScrapedDocs } from '../utlis/validateResult.js';
import { validateUrlReachability } from '../utlis/isAlive.js';

export async function processScrapeJob(
  jobId: string,
  targetUrl: string,
  domain: string,
  emitStatus: (status: string, message: string) => void
) {
  const brightData = BrightDataService.getInstance();
 await dbRepository.updateJobStatus(jobId, 'processing');

  const collector = await dbRepository.findCollectorByDomain(domain);
  let collectorId = collector?.collectorId;
  console.log(collectorId);

  try {
    if (!collectorId) {
     await dbRepository.updateJobStatus(jobId, 'training_ai_layout');
      emitStatus('training_ai_layout', 'Building collector...');

      collectorId = await brightData.buildCollector(domain);
      await brightData.trainTemplate(collectorId, targetUrl);

      emitStatus('training_ai_layout', 'Training AI...');
      await brightData.waitForAI(collectorId, emitStatus);
      emitStatus('training_ai_layout', 'AI training completed.');

      await brightData.verifyTemplateExists(collectorId);

     await dbRepository.saveCollector({ domain, collectorId, status: 'ready' });
    }

    emitStatus('processing', 'Job is being processed...');
   await dbRepository.updateJobStatus(jobId, 'extracting_data');
    emitStatus('extracting_data', 'Triggering collector...');
    const isAlive = await validateUrlReachability(targetUrl);
    if (!isAlive) {
      emitStatus('failed', `Invalid documentation URL: "${targetUrl}" returned 404 Not Found.`);
      return;
    }

    const collectionId = await brightData.runCollector(targetUrl, collectorId);

    emitStatus('extracting_data', 'Polling for dataset...');
    const result = await brightData.pollDataset(collectionId);
    emitStatus('extracting_data', `Dataset retrieved with ${result.length} items. Validating...`);
    const validatedDocs = await validateScrapedDocs(result, targetUrl);
    emitStatus('completed', `Found ${validatedDocs.length} valid items. Generating embeddings...`);
    const roomId = await dbRepository.getRoomId(jobId);
    await processAndStoreEmbeddings(validatedDocs, roomId, emitStatus);
   await dbRepository.updateJobStatus(jobId, 'completed', validatedDocs);
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'An unknown error occurred';
   await dbRepository.updateJobStatus(jobId, 'failed', null, msg);
    emitStatus('failed', msg);
  }
}
