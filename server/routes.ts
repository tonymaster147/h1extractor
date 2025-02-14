import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv')
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

async function extractH1FromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    return $('h1').first().text().trim() || 'No H1 tag found';
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : 'Failed to fetch URL'}`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post('/api/process-csv', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const resultFilename = `imran_h1_extractor_${path.basename(req.file.filename)}`;
      const resultPath = path.join(uploadsDir, resultFilename);

      // Read and process the CSV file
      const records: string[][] = [];
      const parser = fs.createReadStream(req.file.path, { encoding: 'utf-8' }).pipe(
        parse({
          columns: true,
          skip_empty_lines: true
        })
      );

      const results: Array<{ URL: string; 'H1 Heading': string }> = [];

      for await (const record of parser) {
        const url = record.URL || record.url;
        if (url) {
          const h1Text = await extractH1FromUrl(url);
          results.push({
            'URL': url,
            'H1 Heading': h1Text
          });
        }
      }

      // Write results to new CSV with UTF-8 BOM
      const csvString = stringify(results, {
        header: true,
        columns: ['URL', 'H1 Heading']
      });

      // Add UTF-8 BOM and write file
      const BOM = '\ufeff';
      fs.writeFileSync(resultPath, BOM + csvString, { encoding: 'utf8' });

      res.json({
        status: 'completed',
        downloadUrl: `/api/download/${resultFilename}`
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process file'
      });
    }
  });

  // Download endpoint
  app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set proper content type for UTF-8 CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.download(filePath);
  });

  const httpServer = createServer(app);
  return httpServer;
}