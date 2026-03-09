
import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHARES_FILE = path.resolve(process.cwd(), "shares.json");

// Ensure shares file exists
if (!fs.existsSync(SHARES_FILE)) {
  fs.writeFileSync(SHARES_FILE, JSON.stringify({}));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/share", (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      console.log(`[API] Share request received. Items count: ${items?.length}`);
      
      if (!items || !Array.isArray(items)) {
        console.error("[API] Invalid collection data received");
        return res.status(400).json({ error: "Invalid collection data" });
      }

      const shareId = nanoid(10);
      const shares = JSON.parse(fs.readFileSync(SHARES_FILE, "utf-8"));
      shares[shareId] = {
        items,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(SHARES_FILE, JSON.stringify(shares));
      console.log(`[API] Collection shared successfully. ID: ${shareId}`);

      res.json({ shareId });
    } catch (err) {
      console.error("[API] Share error:", err);
      res.status(500).json({ error: "Failed to share collection" });
    }
  });

  app.get("/api/share/:id", (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      console.log(`[API] Fetching shared collection: ${id}`);
      
      const shares = JSON.parse(fs.readFileSync(SHARES_FILE, "utf-8"));
      const share = shares[id];

      if (!share) {
        console.warn(`[API] Shared collection not found: ${id}`);
        return res.status(404).json({ error: "Collection not found" });
      }

      console.log(`[API] Shared collection found. Items: ${share.items?.length}`);
      res.json(share);
    } catch (err) {
      console.error("[API] Fetch share error:", err);
      res.status(500).json({ error: "Failed to fetch shared collection" });
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
