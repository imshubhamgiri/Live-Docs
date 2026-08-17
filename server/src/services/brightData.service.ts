import { ScrapedDocSchema, ScrapedDoc } from '../schemas/docSchema.js';

// 1. Define an interface for the collector dependency
export interface ICollector {
  runCollector(url: string): Promise<unknown>;
  triggerSelfHeal(url: string): Promise<void>;
}

// 2. Main Service receiving dependency via Constructor Injection
export class BrightDataService {
  constructor(private readonly collector: ICollector) {}


  public async buildCollector(url: string): Promise<void> {
    console.log(`[Scraper] Building collector for URL: ${url}`);
  }


  public async scrapeDocumentation(url: string): Promise<ScrapedDoc> {
    console.log(`[Scraper] Starting scrape for URL: ${url}`);
    
    let rawData = await this.collector.runCollector(url);
    const validationResult = ScrapedDocSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.warn('[Self-Healing] Validation failed! Invoking self-healing...');
      
      // Trigger self-heal via injected dependency
      await this.collector.triggerSelfHeal(url);

      // Retry after auto-repair
      rawData = await this.collector.runCollector(url);
      return ScrapedDocSchema.parse(rawData);
    }

    return validationResult.data;
  }
}