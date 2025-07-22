import express from "express";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 🟢 Configura o CORS antes das rotas
app.use(cors({
  origin: "https://splendid-sfogliatella-b8ee2d.netlify.app", // ✅ Seu domínio do Netlify
  methods: ["GET", "POST"],
  credentials: true
}));

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

    // Upload para Cloudinary
    cloudinary.uploader.upload_stream({ folder: "uploads" }, async (err, result) => {
      if (err) {
        console.error("Erro no Cloudinary:", err);
        return res.status(500).json({ error: "Erro no upload para Cloudinary" });
      }

      console.log("Upload no Cloudinary bem-sucedido:", result.secure_url);

      // Prepara dados para o Supabase
      const now = new Date().toISOString();
      const { originalname, size, mimetype } = req.file;

      const { error: dbError } = await supabase
        .from("imagens")
        .insert([{
          url: result.secure_url,
          name: originalname,                         // Nome do arquivo
          data: JSON.stringify({ size, mimetype }),   // Metadados no JSONB
          inserted_at: now,                           // Timestamp inserção
          updated_at: now                             // Timestamp atualização
        }]);

      if (dbError) {
        console.error("Erro ao salvar no Supabase:", dbError);
        return res.status(500).json({ error: "Erro ao salvar imagem no banco de dados" });
      }

      res.json({ url: result.secure_url, name: originalname });
    }).end(fileBuffer);

  } catch (err) {
    console.error("Erro geral no upload:", err);
    res.status(500).json({ error: "Erro no upload da imagem" });
  }
});

// Get all images
app.get("/imagens", async (req, res) => {
  const { data, error } = await supabase.from("imagens").select("*");
  if (error) {
    console.error("Erro ao buscar imagens:", error);
    return res.status(500).json({ error: "Erro ao buscar imagens" });
  }
  res.json(data);
});

app.listen(process.env.PORT || 3000, () =>
  console.log("API rodando na porta 3000")
);
