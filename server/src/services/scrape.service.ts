import { dbRepository, JobStatus } from '../repositories/json.db.js';
import { processAndStoreEmbeddings } from './rag.service.js';
import { validateUrlReachability } from '../utlis/isAlive.js';
import { DocumentationScraperEngine } from './scraperEngine.service.js';

const scraperEngine = new DocumentationScraperEngine(); 


export async function processScrapeJob(
  jobId: string,
  targetUrl: string,
  domain: string,
  emitStatus: (status: string, message: string) => void
) {
 await dbRepository.updateJobStatus(jobId, 'processing');
//  1.Check For valie Url
 const isAlive = await validateUrlReachability(targetUrl);
 if (!isAlive) {
   emitStatus('failed', `Invalid documentation URL: "${targetUrl}" returned 404 Not Found.`);
   return;
 }

  try {
    // 2. Ensure Collector Exists & Is Trained
    const collectorId = await scraperEngine.ensureCollector(domain, targetUrl, (msg) => {
      emitStatus('training_ai_layout', msg);
    });
    
    emitStatus('processing', 'Job is being processed...');
    // 3. Extract & Self-Heal
    const validatedDocs = await scraperEngine.extractWithSelfHealing(
      collectorId, 
      targetUrl, 
      (status, message) => {
        dbRepository.updateJobStatus(jobId, status as JobStatus);
        emitStatus(status, message);
      }
    );
    emitStatus('completed', `Found ${validatedDocs.length} valid items. Generating embeddings...`);
    const roomId = await dbRepository.getRoomId(jobId);
    await processAndStoreEmbeddings(validatedDocs, roomId, emitStatus);
   await dbRepository.updateJobStatus(jobId, 'completed', validatedDocs);
    
  } catch (error: unknown) {
    console.log(error);
    const msg = error instanceof Error ? error.message : 'An unknown error occurred';
   await dbRepository.updateJobStatus(jobId, 'failed', null, msg);
    emitStatus('failed', msg);
  }
}
