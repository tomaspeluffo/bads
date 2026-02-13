import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import { logger } from "./logger.js";

export interface ParsedFile {
  filename: string;
  text: string;
}

export async function extractText(file: Express.Multer.File): Promise<ParsedFile> {
  const ext = file.originalname.split(".").pop()?.toLowerCase();

  try {
    if (ext === "pdf") {
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return { filename: file.originalname, text: result.text.trim() };
    }

    if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return { filename: file.originalname, text: result.value.trim() };
    }

    // Plain text fallback
    if (ext === "txt" || ext === "md") {
      return { filename: file.originalname, text: file.buffer.toString("utf-8").trim() };
    }

    throw new Error(`Tipo de archivo no soportado: .${ext}`);
  } catch (err) {
    logger.warn({ err, filename: file.originalname }, "Error extrayendo texto del archivo");
    throw err;
  }
}

export async function extractTextFromFiles(files: Express.Multer.File[]): Promise<ParsedFile[]> {
  const results: ParsedFile[] = [];
  for (const file of files) {
    const parsed = await extractText(file);
    results.push(parsed);
  }
  return results;
}
