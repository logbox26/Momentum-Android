import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Setup Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API endpoint for Gemini chat in Reports using gemini-3.8-flash
app.post('/api/gemini/reports-chat', async (req, res) => {
  try {
    const { messages, contextData } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getAiClient();

    const systemInstruction = `You are Momentum Productivity Advisor, an insightful AI assistant powered by Gemini 3.8 Flash inside the Momentum app.
You analyze productivity statistics, completion rates, unfinished tasks, bottlenecks, and task history.
The user is viewing their Reports section.
Momentum's priority system consists strictly of four tiers:
1. Present 1 (Top Focus / Urgent & Critical)
2. Present 5 (Current Sprint / Standard execution)
3. Later 1 (Deferred / High Strategic Value)
4. Later 5 (Backlog / Low Urgency)

Here is the user's current live productivity and task history data:
${JSON.stringify(contextData ?? {}, null, 2)}

Provide concise, empowering, data-driven advice. Highlight achievements, point out risks if high-priority tasks (Present 1) are unfinished or postponed multiple times, and suggest clear tactical next steps. Use clean Markdown formatting.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'I analyzed your productivity reports, but could not generate a response. Please ask a specific question.';
    return res.json({ text: reply });
  } catch (err: unknown) {
    console.error('Gemini Reports Chat Error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
});

// Endpoint to download the latest actual Android source code as a ZIP
app.get('/api/export-android-project', async (_req, res) => {
  try {
    const JSZip = (await import('jszip')).default;
    const fs = await import('fs');
    const zip = new JSZip();

    const androidDir = path.join(__dirname, 'android');

    function addDirToZip(currentDir: string, zipFolder: any) {
      if (!fs.existsSync(currentDir)) return;
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subFolder = zipFolder.folder(item);
          addDirToZip(fullPath, subFolder);
        } else {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(item, content);
        }
      }
    }

    addDirToZip(androidDir, zip);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="momentum-android-app.zip"');
    return res.send(buffer);
  } catch (err) {
    console.error('Android Export Error:', err);
    return res.status(500).json({ error: 'Failed to generate Android project zip' });
  }
});

// Mount Vite middleware in dev or static files in production
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
