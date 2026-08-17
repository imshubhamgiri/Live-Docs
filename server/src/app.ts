import express from 'express';
import { BrightDataCliCollector } from './services/brightDataCollector.js';
import { BrightDataService } from './services/brightData.service.js';

const app = express();

app.use(express.json());

const cliCollector = new BrightDataCliCollector();
const brightDataService = new BrightDataService(cliCollector);

app.post('/api/scrape', (req, res) => {
    const url = req.body.url as string;
    // Add scraping logic here
    brightDataService.scrapeDocumentation(url)
        .then((scrapedDoc) => {
            res.json(scrapedDoc);
     }).catch((error) => {
            console.error('Error scraping documentation:', error);
            res.status(500).json({ error: 'Failed to scrape documentation' });
        });
});
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the BrightData API' });
});


app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
    next(err);
});

app.listen(3000, () => {
    console.log('Server is running on port http://localhost:3000');
});