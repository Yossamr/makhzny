import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { createRequire } from 'module';
import { verify } from 'otplib';
import { createGuardrails } from '@otplib/core';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import db from './server/db.js';

const upload = multer({ dest: 'uploads/' });

// Secret key for Google Authenticator
const ACTIVATION_SECRET = 'ONSWG4TFOQYXIYLS';
const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // 0. Verify Activation
  app.post('/api/verify-activation', async (req, res) => {
    const { token } = req.body;
    try {
      const isValid = await verify({ secret: ACTIVATION_SECRET, token, guardrails });
      if (isValid.valid) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'الكود غير صحيح' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // 1. Get drugs for autocomplete
  app.get('/api/drugs/search', (req, res) => {
    const q = req.query.q as string || '';
    try {
      const stmt = db.prepare('SELECT name FROM drugs WHERE name LIKE ? LIMIT 20');
      const drugs = stmt.all(`%${q}%`);
      res.json(drugs.map((d: any) => d.name));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch drugs' });
    }
  });

  // 2. Import drugs from Excel/CSV
  app.post('/api/drugs/import', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const columnIndex = parseInt(req.body.columnIndex) || 0;
    console.log('Importing file:', req.file.path, 'Column Index:', columnIndex);

    try {
      const workbook = XLSX.readFile(req.file.path);
      console.log('Workbook read successfully');
      const sheetName = workbook.SheetNames[0];
      console.log('Sheet name:', sheetName);
      const sheet = workbook.Sheets[sheetName];
      // Use header: 1 to get raw array of arrays, then we can access by index
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log('Data parsed, rows:', data.length);

      // data[0] is the header row, data[1...] are the data rows
      const drugNames = data
        .slice(1) // Skip header row
        .map((row: any) => row[columnIndex])
        .filter((name) => typeof name === 'string' && name.trim() !== '');
      console.log('Drug names extracted:', drugNames.length);

      const insert = db.prepare('INSERT OR IGNORE INTO drugs (name) VALUES (?)');
      const insertMany = db.transaction((names: string[]) => {
        let count = 0;
        for (const name of names) {
          const result = insert.run(name.trim());
          if (result.changes > 0) count++;
        }
        return count;
      });

      const addedCount = insertMany(drugNames);

      res.json({ message: `Successfully imported ${addedCount} new drugs.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  // 3. Create new records
  app.post('/api/records', (req, res) => {
    const { branch, clinic_name, ticket_date, items } = req.body;

    if (!branch || !clinic_name || !ticket_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'All fields are required and items must be an array' });
    }

    try {
      const insertDrug = db.prepare('INSERT OR IGNORE INTO drugs (name) VALUES (?)');
      const insertRecord = db.prepare(`
        INSERT INTO records (branch, clinic_name, drug_name, unit, unit_price, quantity, total, ticket_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTransaction = db.transaction((items: any[]) => {
        for (const item of items) {
          const { drug_name, unit, unit_price, quantity } = item;
          if (!drug_name || !unit || !unit_price || !quantity) continue;
          
          const total = parseFloat(unit_price) * parseFloat(quantity);
          insertDrug.run(drug_name.trim());
          insertRecord.run(branch, clinic_name, drug_name.trim(), unit, unit_price, quantity, total, ticket_date);
        }
      });

      insertTransaction(items);
      res.json({ message: 'Records saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save records' });
    }
  });

  // 4. Get all records
  app.get('/api/records', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM records ORDER BY id DESC');
      const records = stmt.all();
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch records' });
    }
  });

  // 5. Import records from Excel
  app.post('/api/records/import', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      const insertDrug = db.prepare('INSERT OR IGNORE INTO drugs (name) VALUES (?)');
      const insertRecord = db.prepare(`
        INSERT INTO records (branch, clinic_name, drug_name, unit, unit_price, quantity, total, ticket_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let importedCount = 0;

      const importTransaction = db.transaction((rows: any[]) => {
        for (const row of rows) {
          // Map Arabic headers to DB columns
          const branch = row['الفرع'];
          const clinic_name = row['اسم العيادة'] || row['العيادة'];
          const ticket_date = row['تاريخ التذكرة'] || row['التاريخ'];
          const drug_name = row['اسم الصنف'] || row['الصنف'];
          const unit = row['الوحدة'];
          const unit_price = row['سعر الوحدة'] || row['السعر'];
          const quantity = row['الكمية المنصرفة'] || row['الكمية'];
          const total = row['الإجمالي'];

          if (!branch || !clinic_name || !ticket_date || !drug_name || !unit || unit_price == null || quantity == null) {
            continue; // Skip invalid rows
          }

          insertDrug.run(drug_name.trim());
          insertRecord.run(branch, clinic_name, drug_name.trim(), unit, unit_price, quantity, total || (unit_price * quantity), ticket_date);
          importedCount++;
        }
      });

      importTransaction(data);
      res.json({ message: `Successfully imported ${importedCount} records.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
