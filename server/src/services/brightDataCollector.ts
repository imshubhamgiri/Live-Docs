import { exec } from 'child_process';
import util from 'util';
import { ICollector } from './brightData.service.js';

const execPromise = util.promisify(exec);

export class BrightDataCliCollector implements ICollector {
  async runCollector(url: string): Promise<unknown> {
    // Corrected to Bright Data's unified scrape utility targeting raw JSON data output
    const { stdout } = await execPromise(`brightdata scrape "${url}" --format json`);
    return JSON.parse(stdout);
  }

  async triggerSelfHeal(url: string): Promise<void> {
    // If you ever use a custom AI collector later, this aligns with the current 'scraper heal' convention.
    // We pass a placeholder or identifier here if utilizing a standalone Scraper Studio setup.
    await execPromise(`brightdata scraper heal --url "${url}" --auto-approve`);
  }
}
