import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const AUDIO_EXTENSIONS = new Set([".mp3", ".aif", ".aiff", ".wav", ".m4a", ".aac", ".ogg"]);
const ROOT = process.cwd();
const configPath = path.join(ROOT, "songs.config.json");
const playlistPath = path.join(ROOT, "playlist.json");
const generatedRoot = path.join(ROOT, "audio", "_generated");

function normalizeId(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayNameFromFile(fileName) {
  const withoutExt = fileName.replace(path.extname(fileName), "");
  const cleaned = withoutExt.replace(/[_-]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : withoutExt;
}

function listStemFiles(folderAbsPath) {
  const entries = fs.readdirSync(folderAbsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => AUDIO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "de"));
}

function convertToMp3(sourceAbsPath, targetAbsPath) {
  fs.mkdirSync(path.dirname(targetAbsPath), { recursive: true });
  execFileSync(
    "ffmpeg",
    ["-y", "-i", sourceAbsPath, "-codec:a", "libmp3lame", "-q:a", "4", targetAbsPath],
    { stdio: "pipe" }
  );
}

function resolvePlayableStem(songConfig, folderRelPath, folderAbsPath, fileName) {
  const sourceAbsPath = path.join(folderAbsPath, fileName);
  const extension = path.extname(fileName).toLowerCase();
  const baseName = fileName.replace(path.extname(fileName), "");
  const stemId = normalizeId(baseName) || normalizeId(fileName);
  const displayName = displayNameFromFile(fileName);

  if (extension === ".mp3") {
    return {
      id: stemId,
      name: displayName,
      url: `${folderRelPath}/${fileName}`
    };
  }

  const targetAbsPath = path.join(generatedRoot, songConfig.id, `${stemId}.mp3`);
  convertToMp3(sourceAbsPath, targetAbsPath);

  return {
    id: stemId,
    name: displayName,
    url: path.relative(ROOT, targetAbsPath).split(path.sep).join("/")
  };
}

function buildSong(songConfig) {
  const folderRelPath = songConfig.folder;
  const folderAbsPath = path.join(ROOT, folderRelPath);

  if (!fs.existsSync(folderAbsPath) || !fs.statSync(folderAbsPath).isDirectory()) {
    throw new Error(`Song-Ordner nicht gefunden: ${folderRelPath}`);
  }

  const files = listStemFiles(folderAbsPath);
  if (files.length === 0) {
    throw new Error(`Keine Audio-Dateien im Song-Ordner: ${folderRelPath}`);
  }

  const stems = files.map((fileName) => resolvePlayableStem(songConfig, folderRelPath, folderAbsPath, fileName));

  return {
    id: songConfig.id,
    title: songConfig.title,
    artist: songConfig.artist || "",
    stems
  };
}

function main() {
  if (!fs.existsSync(configPath)) {
    throw new Error("songs.config.json nicht gefunden.");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const songsConfig = Array.isArray(config.songs) ? config.songs : [];

  if (songsConfig.length === 0) {
    throw new Error("songs.config.json enthaelt keine Songs.");
  }

  const songs = songsConfig.map((songConfig) => buildSong(songConfig));
  const playlist = { songs };

  fs.writeFileSync(playlistPath, `${JSON.stringify(playlist, null, 2)}\n`, "utf8");
  console.log(`playlist.json aktualisiert (${songs.length} Song(s)).`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
