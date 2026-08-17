import { z } from 'zod';

// Scraped Document Schema Define
export const ScrapedDocSchema = z.object({
  url: z.string().url(),
  title: z.string().min(3, "Title too short or missing"),
  content: z.string().min(50, "Content failed to extract properly"),
  headings: z.array(z.string()).optional(),
  codeBlocks: z.array(z.string()).optional(),
  scrapedAt: z.string().datetime().optional()
});

export type ScrapedDoc = z.infer<typeof ScrapedDocSchema>;