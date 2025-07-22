import express from "express";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Supabase config
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test route
app.get("/", (req, res) => {
  res.send("API funcionando!");
});

// Upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    cloudinary.uploader.upload_stream({ folder: "uploads" }, async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const { error: dbError } = await supabase
        .from("imagens")
        .insert([{ url: result.secure_url }]);

      if (dbError) return res.status(500).json({ error: dbError.message });

      res.json({ url: result.secure_url });
    }).end(fileBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all images
app.get("/imagens", async (req, res) => {
  const { data, error } = await supabase.from("imagens").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(process.env.PORT || 3000, () =>
  console.log("API rodando na porta 3000")
);
