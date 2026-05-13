console.log("[SERVER] Global entry point hit");

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
dotenv.config();

import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

let s3Client: S3Client | null = null;
const accessKey = process.env.R2_ACCESS_KEY_ID || "";
const secretKey = process.env.R2_SECRET_ACCESS_KEY || "";
const accountId = process.env.R2_ACCOUNT_ID || "";
let endpoint = process.env.R2_ENDPOINT || "";

if (!endpoint && accountId) {
  endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
}

if (accessKey && secretKey && endpoint) {
  console.log("[SERVER] Initializing R2 S3 Client with endpoint:", endpoint);
  s3Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
} else {
  console.warn("[SERVER] R2 configuration incomplete. Required fields: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and either R2_ACCOUNT_ID or R2_ENDPOINT.");
}

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working", time: new Date().toISOString() });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    r2: {
      configured: !!s3Client,
      hasBucket: !!process.env.R2_BUCKET_NAME
    }
  });
});

// Helper to get base URL for R2 objects
const getS3Url = (key: string) => {
  const bucketName = process.env.R2_BUCKET_NAME;
  let baseUrl = process.env.R2_PUBLIC_URL;
  if (!baseUrl) {
    const accId = process.env.R2_ACCOUNT_ID;
    const endp = process.env.R2_ENDPOINT || (accId ? `https://${accId}.r2.cloudflarestorage.com` : "");
    baseUrl = `${endp.replace(/\/$/, "")}/${bucketName}`;
  }
  return `${baseUrl.replace(/\/$/, "")}/${key.startsWith("/") ? key.substring(1) : key}`;
};

// API Route to list R2 images
app.get("/api/images", async (req, res) => {
  console.log("[SERVER] Received request for /api/images");
  try {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      const missing = [];
      if (!process.env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
      if (!process.env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
      if (!process.env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
      if (!process.env.R2_ACCOUNT_ID && !process.env.R2_ENDPOINT) missing.push("R2_ACCOUNT_ID or R2_ENDPOINT");

      return res.status(200).json({ 
        images: [], 
        error: "R2 não configurado. Faltam segredos: " + missing.join(", ") 
      });
    }
    
    let images: string[] = [];
    const prefixes = ["diego-diana/", "ferramentaria/diego-diana/", ""];
    
    for (const prefix of prefixes) {
      console.log(`[SERVER] Trying prefix: "${prefix}"`);
      try {
        const command = new ListObjectsV2Command({ 
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: 100
        });
        const response = await s3Client.send(command);
        
        if (response.Contents && response.Contents.length > 0) {
          const found = response.Contents
            .filter(object => {
              const key = (object.Key || "").toLowerCase();
              return /\.(png|jpg|jpeg|gif|webp)$/i.test(key) && !key.endsWith("/");
            })
            .map(object => getS3Url(object.Key!));
          
          if (found.length > 0) {
            images = found;
            console.log(`[SERVER] Found ${images.length} images with prefix "${prefix}"`);
            break; 
          }
        }
      } catch (e) {
        console.warn(`[SERVER] Failed to list with prefix "${prefix}":`, e);
      }
    }

    if (images.length === 0) {
      console.log("[SERVER] Still no images found listing first 10 keys for debug:");
      try {
        const debugCommand = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 10 });
        const debugResponse = await s3Client.send(debugCommand);
        console.log("[SERVER] Debug list:", debugResponse.Contents?.map(c => c.Key) || "Empty bucket");
      } catch (e: any) {
        console.error("[SERVER] Debug list failed:", e?.message);
      }
    }

    return res.json({ images });
  } catch (error: any) {
    console.error("[SERVER] Error listing R2 objects:", error);
    return res.status(500).json({ 
      error: "Falha ao buscar imagens do R2",
      details: error?.message || String(error),
      code: error?.$metadata?.httpStatusCode || 500
    });
  }
});

// API Route to upload an image to R2
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      return res.status(401).json({ error: "R2 não configurado ou credenciais inválidas" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const key = `diego-diana/${Date.now()}-${req.file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });
    
    await s3Client.send(command);
    return res.json({ url: getS3Url(key) });
  } catch (error: any) {
    console.error("[SERVER] Upload error:", error);
    return res.status(500).json({ 
      error: "Erro ao fazer upload para o R2",
      details: error?.message || String(error)
    });
  }
});

export default app;

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Server failed to start:", err);
  });
}
