import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { query } from "./db.js";
import authRoutes from "./routes/auth.js";
import songsRoutes from "./routes/songs.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: false
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", songsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.message === "Only MP3 files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`StemPlayer API listening on http://localhost:${config.port}`);
});
