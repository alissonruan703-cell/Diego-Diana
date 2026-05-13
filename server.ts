import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { list, put } from "@vercel/blob";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route to list blobs
  app.get("/api/images", async (req, res) => {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        console.warn("BLOB_READ_WRITE_TOKEN is missing");
        return res.status(200).json({ 
          images: [], 
          error: "BLOB_READ_WRITE_TOKEN não configurado. Adicione nos segredos do AI Studio." 
        });
      }
      
      const { blobs } = await list({ token });
      const images = blobs
        .filter(blob => /\.(png|jpg|jpeg|gif|webp)$/i.test(blob.pathname))
        .map(blob => blob.url);
      
      return res.json({ images });
    } catch (error: any) {
      console.error("Error listing blobs:", error);
      return res.status(500).json({ 
        error: "Falha ao buscar imagens do Vercel Blob",
        details: error?.message || String(error)
      });
    }
  });

  // API Route to upload an image
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        return res.status(401).json({ error: "Token não configurado" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const blob = await put(req.file.originalname, req.file.buffer, {
        access: "public",
        token: token,
      });

      return res.json(blob);
    } catch (error: any) {
      console.error("Upload error:", error);
      return res.status(500).json({ 
        error: "Erro ao fazer upload para o Vercel Blob",
        details: error?.message || String(error)
      });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Server failed to start:", err);
});
