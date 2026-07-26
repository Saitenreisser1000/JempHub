const playlistEl = document.getElementById("playlist");
const songTitleEl = document.getElementById("songTitle");
const songArtistEl = document.getElementById("songArtist");
const statusEl = document.getElementById("status");
const playPauseButton = document.getElementById("playPauseButton");
const stopButton = document.getElementById("stopButton");
const importFolderButton = document.getElementById("importFolderButton");
const importFolderInput = document.getElementById("importFolderInput");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutButton = document.getElementById("logoutButton");
const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const registerEmailEl = document.getElementById("registerEmail");
const registerPasswordEl = document.getElementById("registerPassword");
const authMessageEl = document.getElementById("authMessage");
const authSummaryEl = document.getElementById("authSummary");
const adminPanelEl = document.getElementById("adminPanel");
const adminSongForm = document.getElementById("adminSongForm");
const adminSongTitleEl = document.getElementById("adminSongTitle");
const adminSongArtistEl = document.getElementById("adminSongArtist");
const adminSongStemsEl = document.getElementById("adminSongStems");
const seekEl = document.getElementById("seek");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const mixerEl = document.getElementById("mixer");
const stemTemplate = document.getElementById("stemTemplate");
const masterVolumeEl = document.getElementById("masterVolume");

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".aif", ".aiff", ".m4a", ".ogg", ".flac"]);
const EXCLUDED_STEM_KEYWORDS = ["notenhals"];
const STEM_LABEL_TRANSLATIONS = new Map([
  ["gesang", "Vocals"],
  ["vocal", "Vocals"],
  ["vocals", "Vocals"],
  ["klavier", "Piano"],
  ["piano", "Piano"],
  ["gitarre", "Guitar"],
  ["guitar", "Guitar"],
  ["schlagzeug", "Drums"],
  ["drums", "Drums"],
  ["drum", "Drums"],
  ["bass", "Bass"],
  ["andere", "Others"],
  ["others", "Others"],
  ["sonstige", "Others"],
  ["keys", "Keys"],
  ["keyboard", "Keys"]
]);
const API_BASE = window.STEMPLAYER_API_BASE || "http://localhost:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const AUTH_TOKEN_KEY = "stemplayerAuthToken";

let authUser = null;

let audioContext;
let masterGain;
let playlist = [];
let activeSong = null;
let stemState = [];
let sources = [];
let buffersByStemId = new Map();
let isPlaying = false;
let startedAt = 0;
let pausedAt = 0;
let durationSeconds = 0;
let rafId = null;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(masterVolumeEl.value);
    masterGain.connect(audioContext.destination);
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function formatTime(totalSeconds) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(clamped / 60)).padStart(2, "0");
  const seconds = String(clamped % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getPlaybackPosition() {
  if (!isPlaying || !audioContext) {
    return pausedAt;
  }
  return pausedAt + (audioContext.currentTime - startedAt);
}

function updateTimeUi() {
  const position = getPlaybackPosition();
  currentTimeEl.textContent = formatTime(position);

  if (durationSeconds > 0 && !seekEl.matches(":active")) {
    seekEl.value = String((position / durationSeconds) * 100);
  }

  if (isPlaying && position >= durationSeconds) {
    stopPlayback();
    return;
  }

  rafId = requestAnimationFrame(updateTimeUi);
}

function stopSources() {
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      // Source may already be stopped.
    }
  }
  sources = [];
}

function rebuildMixer() {
  mixerEl.innerHTML = "";

  for (const stem of stemState) {
    const fragment = stemTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".stem");
    const title = fragment.querySelector(".stem-title");
    const muteButton = fragment.querySelector(".mute-btn");
    const soloButton = fragment.querySelector(".solo-btn");
    const volumeSlider = fragment.querySelector(".stem-volume");
    const panSlider = fragment.querySelector(".stem-pan");

    title.textContent = stem.name;
    volumeSlider.value = String(stem.volume);
    panSlider.value = String(stem.pan);

    muteButton.addEventListener("click", () => {
      stem.muted = !stem.muted;
      updateGainForStem(stem.id);
      refreshStemCardState(card, stem, muteButton, soloButton);
    });

    soloButton.addEventListener("click", () => {
      stem.solo = !stem.solo;
      updateAllGains();
      refreshAllStemCards();
    });

    volumeSlider.addEventListener("input", () => {
      stem.volume = Number(volumeSlider.value);
      updateGainForStem(stem.id);
    });

    panSlider.addEventListener("input", () => {
      stem.pan = Number(panSlider.value);
      updatePanForStem(stem.id);
    });

    refreshStemCardState(card, stem, muteButton, soloButton);
    mixerEl.appendChild(fragment);
  }

  playPauseButton.disabled = stemState.length === 0;
}

function hasAnySolo() {
  return stemState.some((stem) => stem.solo);
}

function effectiveStemGain(stem) {
  if (stem.muted) {
    return 0;
  }
  if (hasAnySolo() && !stem.solo) {
    return 0;
  }
  return stem.volume;
}

function refreshStemCardState(card, stem, muteButton, soloButton) {
  muteButton.classList.toggle("mute-active", stem.muted);
  soloButton.classList.toggle("solo-active", stem.solo);
  card.setAttribute("data-stem-id", stem.id);
}

function refreshAllStemCards() {
  const cards = mixerEl.querySelectorAll(".stem");
  for (const card of cards) {
    const stemId = card.getAttribute("data-stem-id");
    const stem = stemState.find((entry) => entry.id === stemId);
    if (!stem) {
      continue;
    }
    const muteButton = card.querySelector(".mute-btn");
    const soloButton = card.querySelector(".solo-btn");
    refreshStemCardState(card, stem, muteButton, soloButton);
  }
}

function updateGainForStem(stemId) {
  const stem = stemState.find((entry) => entry.id === stemId);
  if (!stem) {
    return;
  }
  if (stem.gainNode) {
    stem.gainNode.gain.value = effectiveStemGain(stem);
  }
}

function updatePanForStem(stemId) {
  const stem = stemState.find((entry) => entry.id === stemId);
  if (!stem) {
    return;
  }
  if (stem.pannerNode) {
    stem.pannerNode.pan.value = stem.pan;
  }
}

function updateAllGains() {
  for (const stem of stemState) {
    if (stem.gainNode) {
      stem.gainNode.gain.value = effectiveStemGain(stem);
    }
  }
}

function startPlayback(offsetSeconds) {
  ensureAudioContext();
  stopSources();

  const startDelay = 0.03;
  startedAt = audioContext.currentTime + startDelay;

  for (const stem of stemState) {
    const buffer = buffersByStemId.get(stem.id);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(stem.gainNode);
    source.start(startedAt, offsetSeconds);
    sources.push(source);
  }

  pausedAt = offsetSeconds;
  isPlaying = true;
  playPauseButton.textContent = "Pause";
  setStatus("Spielt");

  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(updateTimeUi);
}

function pausePlayback() {
  if (!isPlaying) {
    return;
  }

  pausedAt = getPlaybackPosition();
  isPlaying = false;
  stopSources();
  playPauseButton.textContent = "Play";
  setStatus("Pausiert");
}

function stopPlayback() {
  isPlaying = false;
  pausedAt = 0;
  stopSources();
  playPauseButton.textContent = "Play";
  seekEl.value = "0";
  currentTimeEl.textContent = "00:00";
  setStatus("Bereit");
  cancelAnimationFrame(rafId);
}

async function loadBuffer(url) {
  ensureAudioContext();
  if (url.file instanceof File) {
    const arrayBuffer = await url.file.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const requestUrl = url.url || url;
  const response = await fetch(requestUrl, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });
  if (!response.ok) {
    throw new Error(`Track konnte nicht geladen werden: ${url.url || url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toStemName(fileName) {
  const fileBaseName = fileName.replace(/\.[^/.]+$/, "").trim();
  const trailingLabelMatch = fileBaseName.match(/\(([^()]+)\)\s*$/);
  const normalizedLabel = (trailingLabelMatch ? trailingLabelMatch[1] : fileBaseName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const translatedLabel = STEM_LABEL_TRANSLATIONS.get(normalizedLabel);
  if (translatedLabel) {
    return translatedLabel;
  }

  if (trailingLabelMatch) {
    return trailingLabelMatch[1].trim();
  }

  return fileBaseName.replace(/[_-]+/g, " ").trim();
}

function setActivePlaylistButton(songId) {
  const buttons = playlistEl.querySelectorAll("button[data-song-id]");
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.songId === songId);
  }
}

function uniqueId(base, usedIds) {
  let candidate = base || "song";
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base || "song"}-${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function isExcludedStemText(value) {
  const normalized = String(value || "").toLowerCase();
  return EXCLUDED_STEM_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isExcludedStem(stem) {
  return (
    isExcludedStemText(stem?.name) ||
    isExcludedStemText(stem?.id) ||
    isExcludedStemText(stem?.url) ||
    isExcludedStemText(stem?.file?.name)
  );
}

function stemExtensionFromPath(pathValue) {
  if (!pathValue) {
    return "";
  }

  const withoutQuery = String(pathValue).split("?")[0].split("#")[0];
  const match = withoutQuery.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function isSupportedStemFormat(stem) {
  const extension = stemExtensionFromPath(stem?.file?.name || stem?.url);
  return AUDIO_EXTENSIONS.has(extension);
}

function buildImportedSongs(fileList) {
  const files = Array.from(fileList || []).filter((file) => {
    const extension = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
    return file.size > 0 && AUDIO_EXTENSIONS.has(extension) && !isExcludedStemText(file.name);
  });

  const grouped = new Map();
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name;
    const parts = relativePath.split("/");
    const folderName = parts.length > 1 ? parts[0] : "Import";
    if (!grouped.has(folderName)) {
      grouped.set(folderName, []);
    }
    grouped.get(folderName).push(file);
  }

  const usedSongIds = new Set(playlist.map((song) => song.id));
  const importedSongs = [];

  for (const [folderName, folderFiles] of grouped.entries()) {
    const usedStemIds = new Set();
    const stems = folderFiles
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((file) => {
        const rawStemId = slugify(toStemName(file.name));
        const stemId = uniqueId(rawStemId || "stem", usedStemIds);
        return {
          id: stemId,
          name: toStemName(file.name),
          file
        };
      });

    if (stems.length === 0) {
      continue;
    }

    const songId = uniqueId(slugify(folderName) || "import", usedSongIds);
    importedSongs.push({
      id: songId,
      title: folderName,
      artist: "Importiert",
      stems
    });
  }

  return importedSongs;
}

async function loadSong(song) {
  stopPlayback();
  setStatus("Lade Stems...");
  activeSong = song;
  songTitleEl.textContent = song.title;
  songArtistEl.textContent = song.artist || "";

  stemState = song.stems.map((stem) => ({
    ...stem,
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    gainNode: null,
    pannerNode: null
  }));

  const originalStemCount = stemState.length;
  const stemsAfterKeywordFilter = stemState.filter((stem) => !isExcludedStem(stem));
  const unsupportedFormatStems = stemsAfterKeywordFilter.filter(
    (stem) => !isSupportedStemFormat(stem)
  );
  const unsupportedFormatCount = unsupportedFormatStems.length;
  const webmSkippedCount = unsupportedFormatStems.filter(
    (stem) => stemExtensionFromPath(stem?.file?.name || stem?.url) === ".webm"
  ).length;
  stemState = stemsAfterKeywordFilter.filter((stem) => isSupportedStemFormat(stem));

  if (stemState.length === 0) {
    rebuildMixer();
    if (unsupportedFormatCount > 0) {
      if (webmSkippedCount > 0) {
        setStatus(`Keine ladbaren Stems (${webmSkippedCount} .webm ignoriert)`);
      } else {
        setStatus("Keine ladbaren Stems (nicht unterstütztes Format)");
      }
    } else {
      setStatus("Keine ladbaren Stems (Notenhals wurde ausgeschlossen)");
    }
    return;
  }

  buffersByStemId = new Map();

  try {
    const loadedResults = await Promise.allSettled(
      stemState.map(async (stem) => {
        const buffer = await loadBuffer(stem);
        return { stemId: stem.id, buffer };
      })
    );

    const failedStemNames = [];
    for (let index = 0; index < loadedResults.length; index += 1) {
      const result = loadedResults[index];
      const stem = stemState[index];

      if (result.status === "fulfilled") {
        buffersByStemId.set(result.value.stemId, result.value.buffer);
      } else {
        console.warn("Stem konnte nicht dekodiert werden:", stem?.name, result.reason);
        failedStemNames.push(stem?.name || `Stem ${index + 1}`);
      }
    }

    stemState = stemState.filter((stem) => buffersByStemId.has(stem.id));

    if (stemState.length === 0) {
      throw new Error("Keine Stem-Datei konnte dekodiert werden. Bitte WAV oder MP3 verwenden.");
    }

    for (const stem of stemState) {
      stem.gainNode = audioContext.createGain();
      stem.pannerNode = audioContext.createStereoPanner();
      stem.gainNode.gain.value = stem.volume;
      stem.pannerNode.pan.value = stem.pan;
      stem.gainNode.connect(stem.pannerNode);
      stem.pannerNode.connect(masterGain);
    }

    durationSeconds = Math.min(
      ...Array.from(buffersByStemId.values()).map((buffer) => buffer.duration)
    );

    durationEl.textContent = formatTime(durationSeconds);
    currentTimeEl.textContent = "00:00";
    seekEl.value = "0";
    rebuildMixer();
    const skippedCount = originalStemCount - stemState.length;
    if (failedStemNames.length > 0 || skippedCount > 0) {
      const webmInfo = webmSkippedCount > 0 ? `, ${webmSkippedCount} .webm ignoriert` : "";
      setStatus(
        `Song bereit (${stemState.length}/${song.stems.length} Stems geladen, ${skippedCount} übersprungen${webmInfo})`
      );
    } else {
      setStatus("Song bereit");
    }
  } catch (error) {
    console.error(error);
    setStatus("Fehler beim Laden. AIF ggf. in WAV/MP3 konvertieren.");
  }
}

function renderPlaylist() {
  playlistEl.innerHTML = "";

  for (const song of playlist) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.songId = song.id;
    button.innerHTML = `<span>${song.title}</span><span class="small">${song.stems.length} Stems</span>`;

    button.addEventListener("click", async () => {
      setActivePlaylistButton(song.id);
      await loadSong(song);
    });

    item.appendChild(button);
    playlistEl.appendChild(item);
  }

  if (activeSong) {
    setActivePlaylistButton(activeSong.id);
  }
}

function normalizeApiSongs(rawSongs) {
  return (rawSongs || []).map((song) => ({
    ...song,
    stems: (song.stems || []).map((stem) => ({
      ...stem,
      url: typeof stem.url === "string" && stem.url.startsWith("/") ? `${API_ORIGIN}${stem.url}` : stem.url
    }))
  }));
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

function updateAuthUi() {
  const isLoggedIn = Boolean(authUser);
  const isAdmin = authUser?.role === "admin";

  authSummaryEl.textContent = isLoggedIn
    ? `${authUser.email} (${isAdmin ? "Admin" : "User"})`
    : "Nicht eingeloggt";

  logoutButton.hidden = !isLoggedIn;
  adminPanelEl.hidden = !isAdmin;
  loginForm.hidden = isLoggedIn;
  registerForm.hidden = isLoggedIn;
}

function setAuthMessage(text) {
  authMessageEl.textContent = text;
}

async function refreshSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    authUser = null;
    updateAuthUi();
    return false;
  }

  try {
    const data = await apiRequest("/auth/me");
    authUser = data.user;
    updateAuthUi();
    return true;
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    authUser = null;
    updateAuthUi();
    return false;
  }
}

async function login(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  authUser = data.user;
  updateAuthUi();
}

async function register(email, password) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  authUser = data.user;
  updateAuthUi();
}

async function loadPlaylist() {
  setStatus("Lade Playlist...");
  let data = null;

  try {
    data = await apiRequest("/songs");
  } catch (error) {
    if (error?.status !== 401 && error?.status !== 403) {
      console.warn("API nicht erreichbar, nutze lokale Playlist:", error);
    }
  }

  if (!data) {
    const response = await fetch("playlist.json");
    if (!response.ok) {
      throw new Error("playlist.json konnte nicht geladen werden.");
    }
    data = await response.json();
  }

  playlist = data?.songs ? normalizeApiSongs(data.songs) : [];

  if (!data?.songs) {
    const response = await fetch("playlist.json");
    if (!response.ok) {
      throw new Error("playlist.json konnte nicht geladen werden.");
    }
    const localData = await response.json();
    playlist = localData.songs || [];
  }

  if (playlist.length === 0) {
    setStatus("Playlist ist leer");
    return;
  }

  renderPlaylist();
  setStatus("Playlist geladen");
}

playPauseButton.addEventListener("click", async () => {
  if (!activeSong) {
    setStatus("Bitte zuerst Song wählen");
    return;
  }

  ensureAudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback(pausedAt);
  }
});

stopButton.addEventListener("click", () => {
  stopPlayback();
});

seekEl.addEventListener("input", () => {
  if (durationSeconds === 0) {
    return;
  }
  const targetSeconds = (Number(seekEl.value) / 100) * durationSeconds;
  pausedAt = targetSeconds;
  currentTimeEl.textContent = formatTime(pausedAt);

  if (isPlaying) {
    startPlayback(pausedAt);
  }
});

masterVolumeEl.addEventListener("input", () => {
  if (!masterGain) {
    return;
  }
  masterGain.gain.value = Number(masterVolumeEl.value);
});

importFolderButton.addEventListener("click", () => {
  importFolderInput.value = "";
  importFolderInput.click();
});

importFolderInput.addEventListener("change", async () => {
  const importedSongs = buildImportedSongs(importFolderInput.files);

  if (importedSongs.length === 0) {
    setStatus("Keine unterstützten Audio-Dateien gefunden");
    return;
  }

  playlist = [...playlist, ...importedSongs];
  renderPlaylist();
  setStatus(`${importedSongs.length} Song(s) importiert`);

  const firstImportedSong = importedSongs[0];
  setActivePlaylistButton(firstImportedSong.id);
  await loadSong(firstImportedSong);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await login(loginEmailEl.value.trim(), loginPasswordEl.value);
    loginForm.reset();
    setAuthMessage("Login erfolgreich");
    await loadPlaylist();
  } catch (error) {
    setAuthMessage(`Login fehlgeschlagen: ${error.message}`);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await register(registerEmailEl.value.trim(), registerPasswordEl.value);
    registerForm.reset();
    setAuthMessage("Konto erstellt und eingeloggt");
    await loadPlaylist();
  } catch (error) {
    setAuthMessage(`Registrierung fehlgeschlagen: ${error.message}`);
  }
});

logoutButton.addEventListener("click", async () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  authUser = null;
  updateAuthUi();
  setAuthMessage("Abgemeldet");
  await loadPlaylist();
});

adminSongForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (authUser?.role !== "admin") {
    setAuthMessage("Nur Admin darf Songs hochladen");
    return;
  }

  const title = adminSongTitleEl.value.trim();
  const artist = adminSongArtistEl.value.trim();
  const files = Array.from(adminSongStemsEl.files || []);

  if (!title) {
    setAuthMessage("Bitte Songtitel angeben");
    return;
  }

  if (files.length === 0) {
    setAuthMessage("Bitte mindestens eine MP3-Datei waehlen");
    return;
  }

  try {
    const created = await apiRequest("/songs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        artist: artist || null
      })
    });

    const formData = new FormData();
    for (const file of files) {
      formData.append("stems", file);
    }

    await apiRequest(`/songs/${created.song.id}/stems`, {
      method: "POST",
      body: formData
    });

    adminSongForm.reset();
    setAuthMessage("Song erfolgreich hochgeladen");
    await loadPlaylist();
  } catch (error) {
    setAuthMessage(`Upload fehlgeschlagen: ${error.message}`);
  }
});

updateAuthUi();
refreshSession()
  .then(() => loadPlaylist())
  .catch((error) => {
    console.error(error);
    setStatus("Fehler beim Laden der Playlist");
  });
