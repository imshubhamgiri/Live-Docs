import { ScrapedDoc, ScrapedDocSchema } from "../schemas/docSchema.js";
import {z} from "zod";



export const validateScrapedDocs = async (result: any[],
    targetUrl: string,
    ): Promise<ScrapedDoc[]> => {
      console.log(result);

const validatedDocs: ScrapedDoc[] = [];

    for (const rawItem of result) {
      // Normalize Title
      const title =
        rawItem.title ||
        rawItem.article_title ||
        rawItem.page_title ||
        rawItem.article_main_title ||
        rawItem.main_title ||
        '';
    
      // Normalize Content
      const content =
        rawItem.content ||
        rawItem.article_content || 
        rawItem.markdown_content ||
        rawItem.markdown_content_text ||
        rawItem.body ||
        rawItem.text ||
        '';
    
      // Normalize Headings (handles string arrays or array of article/heading objects)
      let headings: string[] = [];
      const rawHeadings = rawItem.headings || rawItem.subheadings || rawItem.articles;
      if (Array.isArray(rawHeadings)) {
        headings = rawHeadings
          .map((h: unknown | any) => (typeof h === 'string' ? h : h.title || h.heading || h.text || ''))
          .filter(Boolean);
      }
    
      // Normalize Code Blocks
      let codeBlocks: string[] = [];
      const rawCodes = rawItem.code_blocks || rawItem.codeBlocks || rawItem.snippets;
      if (Array.isArray(rawCodes)) {
        codeBlocks = rawCodes
          .map((c: unknown | any) => (typeof c === 'string' ? c : c.code || c.snippet || ''))
          .filter(Boolean);
      }
    
      const normalizedItem = {
        url: rawItem.input?.url || targetUrl,
        title,
        content,
        headings,
        codeBlocks,
        scrapedAt: new Date().toISOString()
      };
    
      const parsed = ScrapedDocSchema.safeParse(normalizedItem);
    
      if (!parsed.success) {
        console.error(" Gate Failed:", JSON.stringify(z.treeifyError(parsed.error), null, 2));
        console.error("Original Raw Payload:", JSON.stringify(rawItem, null, 2));
        // Trigger Self-Healing only when normalization genuinely fails to extract valid fields
      throw new Error("Local validation layout mismatch. Self-healing triggered. Please re-run job.");
      }
    
      validatedDocs.push(parsed.data);
    }
    return validatedDocs;
}