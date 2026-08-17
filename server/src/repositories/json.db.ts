import fs from 'fs';

const DB_FILE = './db.json';
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ collectors: [], jobs: [] }, null, 2));
}

export const dbRepository = {
  read: () => {
    try {
      const c = fs.readFileSync(DB_FILE, 'utf8').trim();
      return c ? JSON.parse(c) : { collectors: [], jobs: [] };
    } catch {
      return { collectors: [], jobs: [] };
    }
  },
  write: (data: any) => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('DB write error:', e);
    }
  },
  findCollectorByDomain: (domain: string) => {
    const data = dbRepository.read();
    return data.collectors.find((c: any) => c.domain === domain && c.status === 'ready');
  },
  saveCollector: (collector: { domain: string; collectorId: string; status: string }) => {
    const data = dbRepository.read();
    data.collectors.push(collector);
    dbRepository.write(data);
  },
  createJob: (job: { id: string; url: string; domain: string; status: string; roomId: string }) => {
    const data = dbRepository.read();
    data.jobs.push(job);
    dbRepository.write(data);
  },
  updateJobStatus: (id: string, status: string, result: any = null, error: any = null) => {
    const data = dbRepository.read();
    const job = data.jobs.find((j: any) => j.id === id);
    if (job) {
      job.status = status;
      if (result) job.result = result;
      if (error) job.error = error;
      dbRepository.write(data);
    }
  },
  findJobById: (id: string) => {
    return dbRepository.read().jobs.find((j: any) => j.id === id);
  }
};