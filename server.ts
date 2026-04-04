import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
// @ts-ignore
import matter from "gray-matter";
import { fileURLToPath } from "url";
// @ts-ignore
import chokidar from "chokidar";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
// @ts-ignore
import checkDiskSpace from "check-disk-space";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(process.cwd(), "flow-data");
const PAGES_DIR = path.join(DATA_DIR, "pages");
const TRASH_DIR = path.join(DATA_DIR, ".flow", "trash");
const BACKUPS_DIR = path.join(DATA_DIR, ".flow", "backups");
const MANIFEST_PATH = path.join(BACKUPS_DIR, "manifest.json");
const SEARCH_INDEX_PATH = path.join(DATA_DIR, ".flow", "search-index.json");
const ERROR_LOG_PATH = path.join(DATA_DIR, ".flow", "error-log.txt");
const ANALYTICS_PATH = path.join(DATA_DIR, ".flow", "analytics.json");
const GRAPH_PATH = path.join(DATA_DIR, ".flow", "graph.json");
const SETTINGS_PATH = path.join(DATA_DIR, ".flow", "settings.json");
const DICTIONARY_PATH = path.join(DATA_DIR, ".flow", "dictionary.json");
const SERVER_LOG_PATH = path.join(DATA_DIR, ".flow", "server-log.txt");
const THEMES_DIR = path.join(DATA_DIR, "themes");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

async function logServer(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  try {
    await fs.appendFile(SERVER_LOG_PATH, logMessage, "utf-8");
  } catch {}
}

async function ensureDirs() {
  try {
    console.log(`Ensuring directories exist in ${DATA_DIR}...`);
    await fs.mkdir(PAGES_DIR, { recursive: true });
    await fs.mkdir(TRASH_DIR, { recursive: true });
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    await fs.mkdir(THEMES_DIR, { recursive: true });
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, ".flow"), { recursive: true });
    
    // Test write to ensure we have permissions
    const testFile = path.join(DATA_DIR, ".flow", ".write-test");
    await fs.writeFile(testFile, "test", "utf-8");
    await fs.unlink(testFile);
    console.log("Directory check and write test successful.");
  } catch (error) {
    console.error("CRITICAL: Failed to initialize data directories:", error);
    throw error;
  }
}

async function logError(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    await fs.appendFile(ERROR_LOG_PATH, logMessage, "utf-8");
  } catch (err) {
    console.error("Failed to write to error log:", err);
  }
}

async function getManifest() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return { backups: {} };
  }
}

async function saveManifest(manifest: any) {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

// Helper to generate graph.json
async function updateGraph() {
  try {
    const files = await fs.readdir(PAGES_DIR);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    const nodes: any[] = [];
    const edges: any[] = [];
    const titleToId: Record<string, string> = {};

    // First pass: collect all nodes and map titles to IDs
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(PAGES_DIR, file), "utf-8");
      const { data } = matter(content);
      const id = data.id || file.replace(".md", "");
      const title = data.title || file.replace(".md", "");
      
      nodes.push({ id, title });
      titleToId[title.toLowerCase()] = id;
    }

    // Second pass: find links
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(PAGES_DIR, file), "utf-8");
      const { data, content: body } = matter(content);
      const sourceId = data.id || file.replace(".md", "");
      
      // Simple wikilink regex: [[Title]]
      const wikilinkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = wikilinkRegex.exec(body)) !== null) {
        const targetTitle = match[1].toLowerCase();
        if (titleToId[targetTitle]) {
          edges.push({
            id: `${sourceId}-${titleToId[targetTitle]}`,
            source: sourceId,
            target: titleToId[targetTitle]
          });
        }
      }
    }

    const mostConnectedPage = nodes.reduce((prev, current) => {
      const currentEdges = edges.filter(e => e.source === current.id || e.target === current.id).length;
      const prevEdges = prev ? edges.filter(e => e.source === prev.id || e.target === prev.id).length : -1;
      return currentEdges > prevEdges ? current : prev;
    }, null);

    const graphData = {
      nodes,
      edges,
      stats: {
        totalPages: nodes.length,
        totalEdges: edges.length,
        mostConnectedPage: mostConnectedPage ? mostConnectedPage.title : "None",
        recentEdges: edges.slice(-5)
      }
    };

    await fs.writeFile(GRAPH_PATH, JSON.stringify(graphData, null, 2), "utf-8");
  } catch (error) {
    console.error("Error updating graph:", error);
  }
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .substring(0, 50); // Truncate to 50 chars
}

async function startServer() {
  await ensureDirs();
  await logServer("Server starting...");
  const app = express();
  
  // Middleware and Health Check
  await logServer("Initializing middleware...");
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global logging middleware
  app.use((req, res, next) => {
    logServer(`${req.method} ${req.url}`);
    next();
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Broadcast to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // File Watcher with stability checks
  const watcher = chokidar.watch(PAGES_DIR, {
    ignored: [
      /(^|[\/\\])\../, // ignore dotfiles
      "**/*.tmp",      // ignore temp files
      "**/*.swp",      // ignore swap files
      "**/*~",         // ignore backup files
      "**/.DS_Store",
      "**/.git/**"
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  let debounceTimer: NodeJS.Timeout | null = null;
  
  const handleEvent = (event: string, filePath: string) => {
    if (filePath.endsWith(".tmp")) return;
    
    console.log(`File event: ${event} on ${filePath}`);
    
    // Debounce broadcasts to avoid rapid-fire updates during atomic writes/renames
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      broadcast({ type: "FILE_CHANGE", event, path: filePath });
    }, 200);
  };

  watcher
    .on("add", (path) => handleEvent("add", path))
    .on("change", (path) => handleEvent("change", path))
    .on("unlink", async (filePath) => {
      // Special handling for unlink events - check if it's a false positive (rename/temp file)
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        await fs.access(filePath);
        console.log(`Unlink event was false positive, file still exists: ${filePath}`);
      } catch {
        // File truly doesn't exist
        handleEvent("unlink", filePath);
      }
    });

  // API: Search Index
  app.get("/api/search-index", async (req, res) => {
    console.log("GET /api/search-index");
    try {
      const data = await fs.readFile(SEARCH_INDEX_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch {
      res.json({ terms: {}, pages: {} });
    }
  });

  app.post("/api/search-index", async (req, res) => {
    await logServer(`POST /api/search-index: START, body size: ${JSON.stringify(req.body).length}`);
    try {
      await fs.writeFile(SEARCH_INDEX_PATH, JSON.stringify(req.body), "utf-8");
      await logServer("POST /api/search-index: SUCCESS");
      res.json({ success: true });
    } catch (error) {
      await logError(`POST /api/search-index: FAILED: ${error}`);
      res.status(500).json({ error: "Failed to save search index" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // API: Get all pages
  app.get("/api/pages", async (req, res) => {
    try {
      const files = await fs.readdir(PAGES_DIR);
      const pages = [];
      for (const file of files) {
        if (file.endsWith(".md")) {
          const content = await fs.readFile(path.join(PAGES_DIR, file), "utf-8");
          const { data, content: body } = matter(content);
          pages.push({
            ...data,
            content: body,
          });
        }
      }
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to read pages" });
    }
  });

  app.post("/api/pages", async (req, res) => {
    const pageId = req.body?.id;
    await logServer(`POST /api/pages: START for id: ${pageId}, body size: ${JSON.stringify(req.body).length}`);
    try {
      const page = req.body;
      if (!page || !pageId) {
        console.error("Invalid page data received:", page);
        return res.status(400).json({ error: "Invalid page data" });
      }
      const slug = slugify(page.title || "untitled");
      const filename = `${slug}-${pageId}.md`;
      const filepath = path.join(PAGES_DIR, filename);
      const tempPath = `${filepath}.tmp`;

      // Atomic write
      const frontmatter = {
        id: pageId,
        title: page.title || "",
        createdAt: page.createdAt || Date.now(),
        updatedAt: page.updatedAt || Date.now(),
        pinned: page.isPinned || false,
        isManuallyEdited: page.isManuallyEdited || false,
        templateName: page.templateName || "",
      };
      const content = matter.stringify(page.content || "", frontmatter);
      
      // Check for existing files with same ID but different title (to rename)
      const files = await fs.readdir(PAGES_DIR);
      const oldFiles = files.filter(f => f.endsWith(`-${pageId}.md`) && f !== filename);
      for (const oldFile of oldFiles) {
        try {
          await fs.unlink(path.join(PAGES_DIR, oldFile));
          await logServer(`Deleted old file for page ${pageId}: ${oldFile}`);
        } catch (err) {
          await logServer(`Warning: Failed to delete old file ${oldFile}: ${err}`);
        }
      }

      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filepath);
      await logServer(`Successfully saved page ${pageId} to ${filename}`);
      
      // Debounce graph update
      if ((global as any).graphUpdateTimeout) clearTimeout((global as any).graphUpdateTimeout);
      (global as any).graphUpdateTimeout = setTimeout(() => {
        updateGraph();
      }, 2000);

      // Backup logic: every 10 changes (simulated by checking a counter or just doing it)
      if (req.query.backup === "true") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFilename = `${pageId}_${timestamp}.md.bak`;
        const backupPath = path.join(BACKUPS_DIR, backupFilename);
        await fs.writeFile(backupPath, content, "utf-8");

        const manifest = await getManifest();
        if (!manifest.backups[pageId]) manifest.backups[pageId] = [];
        manifest.backups[pageId].push({ filename: backupFilename, timestamp });
        
        // Retention: keep last 5
        if (manifest.backups[pageId].length > 5) {
          const removed = manifest.backups[pageId].shift();
          try {
            await fs.unlink(path.join(BACKUPS_DIR, removed.filename));
          } catch {}
        }
        await saveManifest(manifest);
      }

      res.json({ success: true, filename });
    } catch (error) {
      console.error(`CRITICAL: Failed to save page ${req.body?.id}:`, error);
      await logError(`Failed to save page ${req.body?.id}: ${error}`);
      res.status(500).json({ 
        error: "Failed to save page", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // API: Delete page (move to trash)
  app.delete("/api/pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const files = await fs.readdir(PAGES_DIR);
      const filename = files.find(f => f.endsWith(`-${id}.md`));
      if (filename) {
        await fs.rename(
          path.join(PAGES_DIR, filename),
          path.join(TRASH_DIR, filename)
        );
        // Debounce graph update
        if ((global as any).graphUpdateTimeout) clearTimeout((global as any).graphUpdateTimeout);
        (global as any).graphUpdateTimeout = setTimeout(() => {
          updateGraph();
        }, 2000);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // API: Export all
  app.get("/api/export", async (req, res) => {
    try {
      const files = await fs.readdir(PAGES_DIR);
      const exportData = {
        metadata: [] as any[],
        pages: [] as any[],
      };

      for (const file of files) {
        if (file.endsWith(".md")) {
          const content = await fs.readFile(path.join(PAGES_DIR, file), "utf-8");
          const { data, content: body } = matter(content);
          exportData.metadata.push(data);
          exportData.pages.push({
            filename: file,
            content: body,
          });
        }
      }
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export pages" });
    }
  });

  // API: Get backups for a page
  app.get("/api/backups/:id", async (req, res) => {
    const manifest = await getManifest();
    res.json(manifest.backups[req.params.id] || []);
  });

  // API: Restore backup
  app.post("/api/backups/restore", async (req, res) => {
    try {
      const { pageId, backupFilename } = req.body;
      const backupPath = path.join(BACKUPS_DIR, backupFilename);
      const content = await fs.readFile(backupPath, "utf-8");
      
      const files = await fs.readdir(PAGES_DIR);
      const filename = files.find(f => f.endsWith(`-${pageId}.md`));
      if (filename) {
        await fs.writeFile(path.join(PAGES_DIR, filename), content, "utf-8");
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  // API: Dictionary
  app.get("/api/dictionary", async (req, res) => {
    try {
      const data = await fs.readFile(DICTIONARY_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch {
      res.json({ words: [] });
    }
  });

  app.post("/api/dictionary", async (req, res) => {
    try {
      await fs.writeFile(DICTIONARY_PATH, JSON.stringify(req.body), "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save dictionary" });
    }
  });

  // API: Analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const data = await fs.readFile(ANALYTICS_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch {
      res.json({ sessions: [], stats: {} });
    }
  });

  app.post("/api/analytics", async (req, res) => {
    try {
      await fs.writeFile(ANALYTICS_PATH, JSON.stringify(req.body), "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save analytics" });
    }
  });

  // API: Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const data = await fs.readFile(SETTINGS_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch {
      res.json({ dailyWordTarget: 500 });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // API: Flow State (for Atlas)
  app.get("/api/flow/state", async (req, res) => {
    try {
      const analyticsData = await fs.readFile(ANALYTICS_PATH, "utf-8").then(JSON.parse).catch(() => ({}));
      const graphData = await fs.readFile(GRAPH_PATH, "utf-8").then(JSON.parse).catch(() => ({}));
      const settingsData = await fs.readFile(SETTINGS_PATH, "utf-8").then(JSON.parse).catch(() => ({}));
      
      // Get recent pages
      const files = await fs.readdir(PAGES_DIR);
      const recentPages = [];
      for (const file of files) {
        if (file.endsWith(".md")) {
          const stats = await fs.stat(path.join(PAGES_DIR, file));
          const content = await fs.readFile(path.join(PAGES_DIR, file), "utf-8");
          const { data } = matter(content);
          recentPages.push({
            id: data.id || file.replace(".md", ""),
            title: data.title || file.replace(".md", ""),
            updatedAt: stats.mtime.toISOString()
          });
        }
      }
      
      recentPages.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({
        analytics: analyticsData,
        graph: graphData,
        settings: settingsData,
        recentPages: recentPages.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get flow state" });
    }
  });

  // API: Themes
  app.get("/api/themes", async (req, res) => {
    try {
      const files = await fs.readdir(THEMES_DIR);
      const themes = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(path.join(THEMES_DIR, file), "utf-8");
          themes.push(JSON.parse(content));
        }
      }
      res.json(themes);
    } catch {
      res.json([]);
    }
  });

  app.post("/api/themes", async (req, res) => {
    try {
      const theme = req.body;
      const filename = `${slugify(theme.name)}.json`;
      await fs.writeFile(path.join(THEMES_DIR, filename), JSON.stringify(theme, null, 2), "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save theme" });
    }
  });

  // API: Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const files = await fs.readdir(TEMPLATES_DIR);
      const templates = [];
      for (const file of files) {
        if (file.endsWith(".md")) {
          const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf-8");
          const { data, content: body } = matter(content);
          templates.push({ ...data, content: body });
        }
      }
      res.json(templates);
    } catch {
      res.json([]);
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const template = req.body;
      const filename = `${slugify(template.name)}.md`;
      const content = matter.stringify(template.content, { name: template.name, description: template.description });
      await fs.writeFile(path.join(TEMPLATES_DIR, filename), content, "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save template" });
    }
  });

  // API: Export PDF (Simulated/Placeholder for now as puppeteer is tricky)
  // I will implement a basic PDF export using a library that works better in restricted environments if possible
  // But I'll try to use marked + puppeteer if I can.
  // Actually, I'll use jspdf on the frontend for PDF to be safer, 
  // and docx on the backend for Word.
  
  // API: Export DOCX
  app.post("/api/export/docx", async (req, res) => {
    await logServer(`POST /api/export/docx, title: ${req.body?.title}`);
    try {
      const { title, content } = req.body;
      // Basic docx generation
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
            }),
            ...content.split("\n").map((line: string) => new Paragraph({
              children: [new TextRun(line)],
            })),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename=${slugify(title)}.docx`);
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to export DOCX" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    logServer(`CRITICAL ERROR: ${err.message}\n${err.stack}`);
    res.status(500).json({ error: "Internal server error", details: err.message });
  });

  server.listen(PORT, "0.0.0.0", () => {
    logServer(`Server running on http://0.0.0.0:${PORT}`);
    // Initial graph update in background
    updateGraph().then(() => logServer("Initial graph update complete."));
  });
}

startServer();
