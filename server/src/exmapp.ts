import 'dotenv/config';
import express from 'express';
// import { parse } from 'tldts';
// import { z } from 'zod';
import axios from 'axios';
import fs from 'fs';
import cors from 'cors';
import http from 'http';
import  {initSocket}  from '../src/config/socket.config.js'

const app = express();


const server = http.createServer(app);
const io = initSocket(server)

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"]
}));
async function sendStatus({data}:any){
  if (!data.roomId) {
    console.error("❌ sendStatus: No roomId provided");
    return;
  }
  io.to(data.roomId).emit('scrape_status', data);
  console.log(`📡 Status emitted to room ${data.roomId}:`, data.status);
}

// --- 1. CRASH PROTECTION ---
app.use(express.json());
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    console.error("❌ Rejected malformed JSON payload.");
    return res.status(400).json({ error: "Invalid JSON format." });
  }
  next();
});

// --- 2. DATABASE SETUP ---
const DB_FILE = './db.json';
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ collectors: [], jobs: [] }, null, 2));
}
//db operations
const db = {
  read: () => {
    try {
      const c = fs.readFileSync(DB_FILE, 'utf8').trim();
      return c ? JSON.parse(c) : { collectors: [], jobs: [] };
    } catch (e) { return { collectors: [], jobs: [] }; }
  },
  write: (data: any) => {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error(e); }
  }
};

// --- 3. CONFIGURATION ---
const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY || "YOUR_API_KEY";
const bdClient = axios.create({
  baseURL: 'https://api.brightdata.com',
  headers: { 
    'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`, 
    'Content-Type': 'application/json' 
  }
});

// --- 4. API ENDPOINTS ---
app.post('/api/scrape', async (req, res) => {
  const { url , roomId } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  if (!roomId) return res.status(400).json({ error: "Room ID is required" });

  const { hostname } = new URL(url);
  const domain =  hostname;
  sendStatus({ data: { roomId, status: 'queued', message: "Job started" } });
  if (!domain) return res.status(400).json({ error: "Invalid domain" });

  const jobId = `job_${Date.now()}`;
  const data = db.read();
  data.jobs.push({ id: jobId, url, domain, status: 'queued', roomId });
  db.write(data);

  // Run in background
  processScrapeJob(jobId, url, domain).catch(err => console.error(`Background Error: ${err.message}`));
  return res.status(202).json({ message: "Job started", jobId });
});

app.get('/api/job/:id', (req, res) => {
  const data = db.read();
  const job = data.jobs.find((j: any) => j.id === req.params.id);
  return job ? res.json(job) : res.status(404).json({ error: "Not found" });
});

// --- 5. CORE WORKER LOGIC ---
async function processScrapeJob(jobId: string, targetUrl: string, domain: string) {
   updateJobStatus(jobId, 'processing');
  const data = db.read();
  
  // Only use a collector if we are SURE it is ready
  let record = data.collectors.find((c: any) => c.domain === domain && c.status === 'ready');
  let collectorId = record ? record.collectorId : null;

  try {
    // Get roomId from job for socket emissions
    const jobData = db.read().jobs.find((j: any) => j.id === jobId);
    const roomId = jobData?.roomId;

    // sendStatus({ data: { roomId, status: 'processing', message: "Job is being processed..." } });
    
    // === PHASE 1: BUILD COLLECTOR (If needed) ===
    if (!collectorId) {
      console.log(`[${jobId}] Building new collector for ${domain}...`);
      updateJobStatus(jobId, 'training_ai_layout');
      sendStatus({ data: { roomId, status: 'training_ai_layout', message: "Building collector..." } });
      // A. Create Shell
      const uniqueName = `rag_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      const createRes = await bdClient.post('/dca/collector', {
        name: uniqueName,
        deliver: { type: "api_pull" }
      });
      const newId = createRes.data.id || createRes.data.collector_id;
      console.log(`[${jobId}] Shell: ${newId}. Starting AI training...`);

      // B. Start AI Training
      await bdClient.post(`/dca/collectors/${newId}/automate_template`, {
        description: "Extract the main page title, and a list of all items/articles.",
        urls: [targetUrl]
      });

      // C. Poll for "Done" status
      sendStatus({ data: { roomId, status: 'training_ai_layout', message: "Training AI..." } });
      await waitForAI(newId, jobId);

      sendStatus({ data: { roomId, status: 'training_ai_layout', message: "AI training completed." } });

      // D. SAFETY PAUSE: Verify the template is actually attached
      console.log(`[${jobId}] Verifying template sync...`);
      await new Promise(r => setTimeout(r, 5000)); // 5s buffer for backend sync
      
      // We check the collector details. If 'schema' is missing, we wait longer.
      await verifyTemplateExists(newId);

      // Save as Ready
      collectorId = newId;
      const freshData = db.read();
      freshData.collectors.push({ domain, collectorId, status: 'ready' });
      db.write(freshData);
      console.log(`[${jobId}] Collector ${newId} is READY.`);
    }
    sendStatus({ data: { roomId, status: 'processing', message: "Job is being processed..." } });
    // === PHASE 2: TRIGGER & COLLECT ===
    console.log(`[${jobId}] Triggering ${collectorId}...`);
    updateJobStatus(jobId, 'extracting_data');
    sendStatus({ data: { roomId, status: 'extracting_data', message: "Triggering collector..." } });

    const triggerRes = await bdClient.post('/dca/trigger', 
      [{ url: targetUrl , max_pages: 1 }],
      { params: { collector: collectorId } }
    );
    
    const collectionId = triggerRes.data.collection_id || triggerRes.data.id;
    console.log(`[${jobId}] Collection ${collectionId} started. Polling data...`);

    sendStatus({ data: { roomId, status: 'extracting_data', message: "Polling for dataset..." } });
    const result = await pollDataset(collectionId);
    
    console.log(`✅ [${jobId}] Success! Found ${result.length} items.`);
    sendStatus({ data: { roomId, status: 'completed', message: `Success! Found ${result.length} items.` } });
    updateJobStatus(jobId, 'completed', result);

  } catch (error: any) {
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`🛑 [${jobId}] Failed: ${msg}`);
    updateJobStatus(jobId, 'failed', null, msg);
  }
}

// --- HELPER FUNCTIONS ---

async function waitForAI(collectorId: string, jobId: string) {
  let attempts = 0;
  while (attempts < 30) { // 90 seconds max
    await new Promise(r => setTimeout(r, 6000));
    try {
      const res = await bdClient.get(`/dca/collectors/${collectorId}/automate_template/progress`);
      const status = res.data.status;
      if (status === 'done' || status === 'completed') return;
      if (status === 'failed') throw new Error("AI Training Failed");
      console.log(`[${jobId}] AI Training: ${status}`);
    } catch (e) { /* ignore glitches */ }
    attempts++;
  }
  throw new Error("AI Training timed out");
}
 
async function verifyTemplateExists(collectorId: string) {
  // This ensures we don't get the "Collector does not have a template" error
  try {
      const res = await bdClient.get(`/dca/collectors/${collectorId}`);
      // If the template object is missing or empty, it's not ready
      if (!res.data.template && !res.data.schema) {
          throw new Error("Template not found in collector details");
      }
  } catch (e) {
      console.log("Template verification pending... waiting 3s");
      await new Promise(r => setTimeout(r, 3000));
  }
}

async function pollDataset(collectionId: string) {
  let attempts = 0;
  // 180 attempts * 5s interval = 900 seconds (15 minutes max wait)
  const maxAttempts = 180; 
  
  console.log(`[Dataset Poll] Starting tracking sequence for collection: ${collectionId}`);

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000)); // Poll every 5 seconds
    
    try {
      const res = await bdClient.get(`/dca/dataset`, { params: { id: collectionId } });
      const data = res.data;

      // 1. Success Case: Bright Data returned a populated JSON array
      if (data && data.status === 'building') {
        if (attempts % 6 === 0) {
          console.log(`[Dataset Poll] ⏳ Job is still building... (Elapsed: ${attempts * 5}s)`);
        }
      } 
      
      // 2. Standard Array Result
      else if (Array.isArray(data)) {
        console.log(`[Dataset Poll] Success on Attempt ${attempts + 1}: Retrieved ${data.length} record(s)!`);
        return data; // Returns array immediately
      } 
      
      // 3. Single Object Result (Your fix!)
      else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log(`[Dataset Poll] Success on Attempt ${attempts + 1}: Retrieved single object record!`);
        return [data]; // Wraps in array so worker logic receives standard format
      } 
      // console.log(data , Object.keys(data).length>0 ? 'data recieved' : 'no data yet');

    } catch (e: any) {
      // Handle HTTP 202 (Accepted / Still processing in queue)
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


function updateJobStatus(id: string, status: string, result: any = null, error: any = null) {
  const data = db.read();
  const job = data.jobs.find((j: any) => j.id === id);
  if (job) {
    job.status = status;
    if (result) job.result = result;
    if (error) job.error = error;
    db.write(data);
  }
}



server.listen(4000, () => console.log('🚀 Server Ready.'));
