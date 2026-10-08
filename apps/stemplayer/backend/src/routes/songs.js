import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

function ensureSongDir(songId) {
  const dir = path.join(uploadsRoot, `song-${songId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const songId = req.params.songId;
    if (!songId) {
      cb(new Error("Missing song id"));
      return;
    }
    cb(null, ensureSongDir(songId));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 24
  },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    const isMp3 = file.mimetype === "audio/mpeg" || lower.endsWith(".mp3");
    if (!isMp3) {
      cb(new Error("Only MP3 files are allowed"));
      return;
    }
    cb(null, true);
  }
});

router.get("/songs", requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT
      s.id,
      s.title,
      s.artist,
      s.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', st.id,
            'name', st.stem_name,
            'url', '/api/media/' || st.id
          )
          ORDER BY st.id
        ) FILTER (WHERE st.id IS NOT NULL),
        '[]'::json
      ) AS stems
     FROM songs s
     LEFT JOIN stems st ON st.song_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  );

  return res.json({ songs: result.rows });
});

router.post("/songs", requireAuth, requireRole("admin"), async (req, res) => {
  const { title, artist } = req.body || {};

  if (!title || String(title).trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }

  const inserted = await query(
    `INSERT INTO songs (title, artist, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, title, artist, created_at`,
    [String(title).trim(), artist ? String(artist).trim() : null, req.user.sub]
  );

  return res.status(201).json({ song: inserted.rows[0] });
});

router.post(
  "/songs/:songId/stems",
  requireAuth,
  requireRole("admin"),
  upload.array("stems", 24),
  async (req, res) => {
    const songId = Number(req.params.songId);
    if (!Number.isInteger(songId)) {
      return res.status(400).json({ error: "Invalid song id" });
    }

    const existingSong = await query("SELECT id FROM songs WHERE id = $1", [songId]);
    if (existingSong.rowCount === 0) {
      return res.status(404).json({ error: "Song not found" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const insertedStems = [];
    for (const file of files) {
      const stemName = file.originalname.replace(/\.mp3$/i, "");
      const relativePath = path.relative(path.resolve(__dirname, "../.."), file.path);
      const inserted = await query(
        `INSERT INTO stems (song_id, stem_name, file_path, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, stem_name`,
        [songId, stemName, relativePath, file.mimetype, file.size]
      );
      insertedStems.push(inserted.rows[0]);
    }

    return res.status(201).json({ stems: insertedStems });
  }
);

router.get("/media/:stemId", requireAuth, async (req, res) => {
  const stemId = Number(req.params.stemId);
  if (!Number.isInteger(stemId)) {
    return res.status(400).json({ error: "Invalid stem id" });
  }

  const result = await query("SELECT file_path, mime_type FROM stems WHERE id = $1", [stemId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Stem not found" });
  }

  const stem = result.rows[0];
  const absolutePath = path.resolve(__dirname, "../../", stem.file_path);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: "File missing on server" });
  }

  res.setHeader("Content-Type", stem.mime_type || "audio/mpeg");
  return res.sendFile(absolutePath);
});

export default router;
