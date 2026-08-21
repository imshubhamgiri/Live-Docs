import {  ScrapeJobModel } from '../model/scraper.model.js';
import { CollectorModel } from '../model/collector.model.js';

 export type JobStatus = 'queued' | 'processing' | 'training_ai_layout' | 'extracting_data' | 'collecting' | 'completed' | 'failed';

type CollectorInput = { domain: string; collectorId: string; status: string };
type JobInput = { id: string; url: string; domain: string; status: JobStatus; roomId: string };

export const dbRepository = {
  findCollectorByDomain: async (domain: string) => {
    return CollectorModel.findOne({ domain, status: 'ready' }).lean();
  },

  saveCollector: async (collector: CollectorInput) => {
   await CollectorModel.create(collector);
  },

  createJob: async (job: JobInput) => {
    await ScrapeJobModel.create(job);
  },

  updateJobStatus: async (id: string, status: string, result: unknown = null, error: unknown = null) => {
    const updateData: { status: string; result?: unknown; error?: string } = { status };

    if (result !== null && result !== undefined) {
      updateData.result = result;
    }

    if (typeof error === 'string' && error.length > 0) {
      updateData.error = error;
    }

    await ScrapeJobModel.findOneAndUpdate({ id }, updateData);
  },

  findJobById: async (id: string) => {
    return ScrapeJobModel.findOne({ id }).lean();
  },

  getRoomId: async (jobId: string) => {
    const job = await ScrapeJobModel.findOne({ id: jobId }).lean();
    return job?.roomId;
  }
};
 