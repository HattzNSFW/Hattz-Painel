"use strict";

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "meuPerfil";
const DB_NAME = "MeuPainelDB";
const DB_VERSION = 1;
const STORE_NAME = "imagens";
const THEMES_STORAGE_KEY = "meuTemas";
const PROFILE_IDS = ["perfil-1", "perfil-2"];
const requestedProfileId = new URLSearchParams(window.location.search).get("profile");
const ACTIVE_PROFILE_ID = PROFILE_IDS.includes(requestedProfileId) ? requestedProfileId : "perfil-1";
const OTHER_PROFILE_ID = ACTIVE_PROFILE_ID === "perfil-1" ? "perfil-2" : "perfil-1";
const SHARED_PROFILE_CODE = new URLSearchParams(window.location.search).get("share") || "";
const IS_PUBLIC_VIEW = Boolean(SHARED_PROFILE_CODE);
const SHARE_MEDIA_KEYS = ["avatar", "banner", "background", "cardBackground", "music", "musicCover", "musicBarBackground"];
const SHARE_OWNER_TOKEN_KEY = `hattz-share-owner:${ACTIVE_PROFILE_ID}`;
const SHARE_PUBLIC_CODE_KEY = `hattz-share-code:${ACTIVE_PROFILE_ID}`;
let sharedMediaManifest = [];
let sharedProfileLoaded = false;
let sharedProfileLoadError = "";

function getShareApiBase() {
  const configured = window.HATTZ_SHARE_CONFIG?.apiBase || "";
  return String(configured).trim().replace(/\/+$/, "");
}

function normalizePublicCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^HTZ/, "");
}

function buildPublicProfileUrl(code) {
  const target = new URL(window.location.href);
  target.searchParams.delete("profile");
  target.searchParams.set("share", code);
  return target.toString();
}


function getProfileStorageKey(profileId = ACTIVE_PROFILE_ID) {
  return `${STORAGE_KEY}:${profileId}`;
}

function getThemesStorageKey(profileId = ACTIVE_PROFILE_ID) {
  return `${THEMES_STORAGE_KEY}:${profileId}`;
}

function getScopedMediaKey(key, profileId = ACTIVE_PROFILE_ID) {
  return `${profileId}:${key}`;
}

const DEFAULT_PROFILE = {
  nome: "Seu Nome",
  usuario: "seuusuario",
  bio: "Sua identidade, do seu jeito.",
  verificado: false,
  verificadoCor: "#729cff",
  cargo: "",
  insignias: [],
  rodape: "",
  bannerHeadingVisible: true,
  bannerTitulo: "",
  bannerSubtitulo: "",
  bannerHeight: 355,
  avatarCrop: { x: 50, y: 50, zoom: 100 },
  bannerCrop: { x: 50, y: 50, zoom: 100 },
  cardBackgroundCrop: { x: 50, y: 50, zoom: 100 },
  backgroundCrop: { x: 50, y: 50, zoom: 100 },
  musicBarBackgroundCrop: { x: 50, y: 50, zoom: 100 },
  dividerStyle: "ornamental",
  dividerCustomColorEnabled: false,
  dividerColor: "#a78bfa",
  statsTitle: "Em evidência",
  statsSubtitle: "",
  detailsTitle: "Um pouco sobre mim",
  detailsSubtitle: "",

  animarMidia: true,
  avatarPausado: false,
  bannerPausado: false,
  fundoPausado: false,
  cardBackgroundPausado: false,
  bannerOpacity: 100,
  cardBackgroundOpacity: 100,
  backgroundOpacity: 34,
  musicBarBackgroundOpacity: 24,
  musicPlayerWidth: 360,
  musicPlayerHeight: 64,
  musicPlayerX: null,
  musicPlayerY: null,
  moldura: "none",
  raridadeMoldura: "none",
  molduraCorPersonalizada: false,
  molduraCor: "#a78bfa",
  efeitosPerfil: true,
  fonte: "DM Sans",
  volume: 12,
  gradientIntensity: 55,
  cardRadius: 18,

  tema: "dark",

  cores: {
    background: "#0b0a10",
    gradient: "#292333",
    card: "#14121b",
    accent: "#a78bfa",
    text: "#f4f0fa",
    border: "#302a3a"
  },

  estatisticas: [
    { id: "focus", label: "EM FOCO", value: "", icon: "✦" },
    { id: "activity", label: "ATIVIDADE", value: "", icon: "◷" },
    { id: "interest", label: "INTERESSE", value: "", icon: "◇" },
  ],

  detalhes: [
    { id: "information", label: "INFORMAÇÃO", value: "", icon: "✧" },
    { id: "preference", label: "PREFERÊNCIA", value: "", icon: "◇" },
    { id: "reference", label: "REFERÊNCIA", value: "", icon: "✦" },
    { id: "link", label: "LINK", value: "", icon: "↗" },
    { id: "extra-one", label: "EXTRA", value: "", icon: "＋" },
    { id: "extra-two", label: "EXTRA", value: "", icon: "＋" }
  ]
};

const THEMES = {
  dark: { background: "#0b0a10", gradient: "#292333", card: "#14121b", accent: "#a78bfa", text: "#f4f0fa", border: "#302a3a" },
  midnight: { background: "#080e19", gradient: "#1b3150", card: "#101a29", accent: "#75b8f5", text: "#edf5ff", border: "#253b56" },
  purple: { background: "#100b18", gradient: "#49345e", card: "#1b1425", accent: "#c19bfa", text: "#f6efff", border: "#3b2a4d" },
  gold: { background: "#100d09", gradient: "#59432b", card: "#1d1811", accent: "#d6ae68", text: "#f7f0e3", border: "#453721" },
  crimson: { background: "#16090e", gradient: "#542033", card: "#21121a", accent: "#ef7899", text: "#fff0f4", border: "#512638" },
  ocean: { background: "#061217", gradient: "#164653", card: "#0d2027", accent: "#54d6d0", text: "#e9ffff", border: "#24454c" },
  forest: { background: "#09130f", gradient: "#244c39", card: "#13231b", accent: "#8bd6a4", text: "#effff3", border: "#294b39" },
  ice: { background: "#0b121b", gradient: "#2b4964", card: "#172432", accent: "#9bd8ff", text: "#f1f9ff", border: "#344d62" },
  rose: { background: "#170d14", gradient: "#593044", card: "#241722", accent: "#f0a3c7", text: "#fff2f8", border: "#56364a" },
  ember: { background: "#17100b", gradient: "#654027", card: "#251a13", accent: "#f3a45f", text: "#fff5e9", border: "#5a3c28" },
  mono: { background: "#101010", gradient: "#353535", card: "#1b1b1b", accent: "#e5e5e5", text: "#fafafa", border: "#414141" },
  cyber: { background: "#080b14", gradient: "#202c4d", card: "#12182a", accent: "#68f0d2", text: "#edfffb", border: "#2b3d55" },
  wine: { background: "#160a12", gradient: "#4d1d34", card: "#24121c", accent: "#d88ab2", text: "#fff0f7", border: "#51283d" },
  sand: { background: "#17130e", gradient: "#594a35", card: "#282116", accent: "#d9bd86", text: "#fff8e9", border: "#554831" },
  amethyst: { background: "#100b19", gradient: "#382451", card: "#1c1528", accent: "#ad8cff", text: "#f7f0ff", border: "#44335c" },
  steel: { background: "#0b1017", gradient: "#303e50", card: "#171f29", accent: "#9eb8d6", text: "#f0f5fb", border: "#354354" },
  obsidianRose: { background: "#120b10", gradient: "#432331", card: "#1c121a", accent: "#e6a0bd", text: "#fff1f6", border: "#4b2b3d" },
  silver: { background: "#101216", gradient: "#39404a", card: "#1a1e25", accent: "#c7d0dc", text: "#f3f6fa", border: "#3c4653" },
  violetNight: { background: "#0d0917", gradient: "#30204d", card: "#171126", accent: "#b79cff", text: "#f5efff", border: "#3a2c55" },
  arctic: { background: "#07131a", gradient: "#1b3b4c", card: "#10232d", accent: "#8de0ef", text: "#effcff", border: "#28505e" },
  bloodMoon: { background: "#15090b", gradient: "#4c1b22", card: "#211115", accent: "#e36d79", text: "#fff0f1", border: "#55272e" },
  sage: { background: "#0c120f", gradient: "#2d4437", card: "#17231c", accent: "#a7c7a8", text: "#f0f8f0", border: "#344d3d" },
  bronze: { background: "#15100b", gradient: "#57402b", card: "#21190f", accent: "#d5a76b", text: "#fff5e7", border: "#5a432c" },
  ultramarine: { background: "#080d1b", gradient: "#202e5a", card: "#121a32", accent: "#8daaff", text: "#f0f3ff", border: "#303f70" }
};

let profile = structuredClone(DEFAULT_PROFILE);
let db = null;

let avatarURL = null;
let bannerURL = null;
let backgroundURL = null;
let cardBackgroundURL = null;
let musicURL = null;
let currentMusicFile = null;
let musicBarBackgroundURL = null;
let musicPlayerResizeObserver = null;
let musicPlayerResizeTimer = null;
let musicCoverURL = null;
let currentMusicCoverFile = null;
let musicMediaType = "audio";
let toastTimer = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function saveMedia(key, file) {
  if (IS_PUBLIC_VIEW) return Promise.reject(new Error("Este perfil é somente para visualização."));
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Banco de dados não inicializado."));
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, getScopedMediaKey(key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function readStoredMedia(key) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve(null);
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function getMedia(key) {
  if (!db) return null;
  const scoped = await readStoredMedia(getScopedMediaKey(key));
  if (scoped) return scoped;

  // Compatibility with the original single-profile Hättz database.
  // Existing media is preserved as profile 1 when users update to this version.
  if (ACTIVE_PROFILE_ID === "perfil-1") {
    return await readStoredMedia(key);
  }

  return null;
}

function deleteMedia(key) {
  if (IS_PUBLIC_VIEW) return Promise.reject(new Error("Este perfil é somente para visualização."));
  return new Promise((resolve, reject) => {
    if (!db) return resolve();

    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(getScopedMediaKey(key));

    // Remove old unscoped values only from profile 1, where they originated.
    if (ACTIVE_PROFILE_ID === "perfil-1") store.delete(key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2500);
}

function saveProfile() {
  if (IS_PUBLIC_VIEW) return false;
  localStorage.setItem(getProfileStorageKey(), JSON.stringify(profile));
  updateProfileSwitcher();
}

function normalizeUsername(value) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeProfileData(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Dados de perfil inválidos.");
  }

  const normalized = {
    ...structuredClone(DEFAULT_PROFILE),
    ...parsed,
    cores: { ...DEFAULT_PROFILE.cores, ...(parsed.cores || {}) },
    estatisticas: Array.isArray(parsed.estatisticas)
      ? parsed.estatisticas.slice(0, 40)
      : structuredClone(DEFAULT_PROFILE.estatisticas),
    detalhes: Array.isArray(parsed.detalhes)
      ? parsed.detalhes.slice(0, 60)
      : Array.isArray(parsed.informacoes)
        ? parsed.informacoes.slice(0, 60)
        : structuredClone(DEFAULT_PROFILE.detalhes),
    insignias: Array.isArray(parsed.insignias) ? parsed.insignias.slice(0, 24) : []
  };

  normalized.avatarPausado = Boolean(parsed.avatarPausado);
  normalized.bannerPausado = Boolean(parsed.bannerPausado);
  normalized.bannerHeight = Number.isFinite(Number(parsed.bannerHeight))
    ? Math.min(620, Math.max(240, Number(parsed.bannerHeight))) : 355;

  for (const key of ["avatarCrop", "bannerCrop", "cardBackgroundCrop", "backgroundCrop", "musicBarBackgroundCrop"]) {
    const crop = parsed[key] || {};
    normalized[key] = {
      x: Math.min(100, Math.max(0, Number(crop.x ?? 50))),
      y: Math.min(100, Math.max(0, Number(crop.y ?? 50))),
      zoom: Math.min(key === "musicBarBackgroundCrop" ? 300 : 250, Math.max(100, Number(crop.zoom ?? 100)))
    };
  }

  normalized.dividerStyle = ["none", "minimal", "double", "dotted", "ornamental", "celestial", "gothic", "royal"].includes(parsed.dividerStyle) ? parsed.dividerStyle : "ornamental";
  normalized.dividerCustomColorEnabled = Boolean(parsed.dividerCustomColorEnabled);
  normalized.dividerColor = /^#[0-9a-f]{6}$/i.test(parsed.dividerColor || "") ? parsed.dividerColor : "#a78bfa";
  if (!["none", "celestial", "gothic", "royal", "floral", "ornate", "dark", "halo", "vintage"].includes(normalized.moldura)) normalized.moldura = "celestial";
  normalized.fundoPausado = Boolean(parsed.fundoPausado);
  normalized.cardBackgroundPausado = Boolean(parsed.cardBackgroundPausado);
  if (String(normalized.bannerTitulo || "").trim().toUpperCase() === "PERSONAL SPACE") normalized.bannerTitulo = "";
  normalized.statsTitle = String(parsed.statsTitle ?? DEFAULT_PROFILE.statsTitle).slice(0, 80);
  normalized.statsSubtitle = String(parsed.statsSubtitle ?? DEFAULT_PROFILE.statsSubtitle).slice(0, 180);
  normalized.detailsTitle = String(parsed.detailsTitle ?? DEFAULT_PROFILE.detailsTitle).slice(0, 80);
  normalized.detailsSubtitle = String(parsed.detailsSubtitle ?? DEFAULT_PROFILE.detailsSubtitle).slice(0, 180);
  normalized.raridadeMoldura = parsed.raridadeMoldura || "none";
  normalized.molduraCorPersonalizada = Boolean(parsed.molduraCorPersonalizada);
  normalized.molduraCor = /^#[0-9a-f]{6}$/i.test(parsed.molduraCor || "") ? parsed.molduraCor : "#a78bfa";
  normalized.verificadoCor = /^#[0-9a-f]{6}$/i.test(parsed.verificadoCor || "") ? parsed.verificadoCor : DEFAULT_PROFILE.verificadoCor;

  for (const key of ["bannerOpacity", "cardBackgroundOpacity", "backgroundOpacity", "musicBarBackgroundOpacity"]) {
    const fallback = Number(DEFAULT_PROFILE[key]);
    const value = Number(parsed[key]);
    normalized[key] = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
  }

  normalized.musicPlayerWidth = Math.min(620, Math.max(220, Number(parsed.musicPlayerWidth) || DEFAULT_PROFILE.musicPlayerWidth));
  normalized.musicPlayerHeight = Math.min(220, Math.max(56, Number(parsed.musicPlayerHeight) || DEFAULT_PROFILE.musicPlayerHeight));
  normalized.musicPlayerX = parsed.musicPlayerX !== null && parsed.musicPlayerX !== undefined && Number.isFinite(Number(parsed.musicPlayerX)) ? Number(parsed.musicPlayerX) : null;
  normalized.musicPlayerY = parsed.musicPlayerY !== null && parsed.musicPlayerY !== undefined && Number.isFinite(Number(parsed.musicPlayerY)) ? Number(parsed.musicPlayerY) : null;

  const reservedRoles = /\b(admin|administrator|dev|developer|staff|moderator|owner|dono)\b/i;
  if (reservedRoles.test(String(normalized.cargo || "").trim())) normalized.cargo = "";
  normalized.insignias = [...new Set(normalized.insignias.map(normalizeBadge).filter((badge) => badge && !isBlockedBadge(badge)))];

  if (typeof parsed.animarMidia !== "boolean") {
    normalized.animarMidia = typeof parsed.animarAvatar === "boolean" ? parsed.animarAvatar : true;
  }
  return normalized;
}

function loadProfile() {
  try {
    const scopedKey = getProfileStorageKey();
    const legacySaved = ACTIVE_PROFILE_ID === "perfil-1" ? localStorage.getItem(STORAGE_KEY) : null;
    const saved = localStorage.getItem(scopedKey) || legacySaved;

    if (!saved) {
      profile = structuredClone(DEFAULT_PROFILE);
      return;
    }

    // Keep legacy profile-1 data intact while migrating it to the scoped key.
    if (!localStorage.getItem(scopedKey) && legacySaved) {
      localStorage.setItem(scopedKey, legacySaved);
    }
    profile = normalizeProfileData(JSON.parse(saved));
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    profile = structuredClone(DEFAULT_PROFILE);
  }
}

async function loadSharedProfile() {
  const apiBase = getShareApiBase();
  const code = normalizePublicCode(SHARED_PROFILE_CODE);
  if (!apiBase || apiBase.includes("YOUR-WORKER")) {
    throw new Error("A API ainda não foi configurada no arquivo share-config.js.");
  }
  if (code.length !== 10) throw new Error("Código de perfil inválido.");

  const response = await fetch(`${apiBase}/api/profiles/${encodeURIComponent(code)}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível localizar este perfil.");
  profile = normalizeProfileData(data.profile);
  sharedMediaManifest = Array.isArray(data.media) ? data.media : [];
  sharedProfileLoaded = true;
}

function createSharedMediaReference(entry) {
  const apiBase = getShareApiBase();
  const code = normalizePublicCode(SHARED_PROFILE_CODE);
  const key = String(entry.key || "");
  if (!SHARE_MEDIA_KEYS.includes(key)) return null;
  return {
    name: String(entry.fileName || key),
    type: String(entry.contentType || "application/octet-stream"),
    size: Number(entry.sizeBytes || 0),
    lastModified: Number(entry.lastModified || 0),
    remoteUrl: `${apiBase}/api/profiles/${encodeURIComponent(code)}/media/${encodeURIComponent(key)}?v=${encodeURIComponent(String(entry.updatedAt || 0))}`
  };
}

function updateProfileSwitcher() {
  if (IS_PUBLIC_VIEW) return;
  const button = $("openOtherProfile");
  const label = $("openOtherProfileLabel");
  if (!button || !label) return;

  if (ACTIVE_PROFILE_ID === "perfil-1") {
    const exists = Boolean(localStorage.getItem(getProfileStorageKey("perfil-2")));
    label.textContent = exists ? "Abrir perfil 2" : "Criar perfil 2";
    button.title = exists
      ? "Abrir o segundo perfil em uma nova aba"
      : "Criar o segundo perfil e abrir em uma nova aba";
    button.setAttribute("aria-label", button.title);
  } else {
    label.textContent = "Abrir perfil 1";
    button.title = "Abrir o primeiro perfil em uma nova aba";
    button.setAttribute("aria-label", button.title);
  }
}

function openOtherProfile() {
  const targetId = OTHER_PROFILE_ID;

  // Create the second slot on demand. Its settings and media remain isolated from profile 1.
  if (targetId === "perfil-2" && !localStorage.getItem(getProfileStorageKey("perfil-2"))) {
    localStorage.setItem(getProfileStorageKey("perfil-2"), JSON.stringify(structuredClone(DEFAULT_PROFILE)));
  }

  const targetUrl = new URL(window.location.href);
  targetUrl.searchParams.set("profile", targetId);

  const opened = window.open(targetUrl.toString(), "_blank");
  if (opened) {
    try { opened.opener = null; } catch {}
  } else {
    showToast("O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.");
  }

  updateProfileSwitcher();
}

function applyColors(colors) {
  const root = document.documentElement;

  const variables = {
    background: "--background",
    gradient: "--gradient",
    card: "--card",
    accent: "--accent",
    text: "--text",
    border: "--border"
  };

  Object.entries(variables).forEach(([key, variable]) => {
    if (colors[key]) {
      root.style.setProperty(variable, colors[key]);
    }
  });

  profile.cores = {
    ...profile.cores,
    ...colors
  };

  applyDesignSettings();
}

function applyTheme(name) {
  if (!THEMES[name]) return;

  profile.tema = name;

  applyColors(THEMES[name]);
  updateThemeButtons();
  fillColorInputs();
}

function updateThemeButtons() {
  document.querySelectorAll(".theme-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === profile.tema);
  });
}

function fillColorInputs() {
  $("colorBackground").value = profile.cores.background;
  $("colorGradient").value = profile.cores.gradient;
  $("colorCard").value = profile.cores.card;
  $("colorAccent").value = profile.cores.accent;
  $("colorText").value = profile.cores.text;
  $("colorBorder").value = profile.cores.border;
}

function readColorInputs() {
  return {
    background: $("colorBackground").value,
    gradient: $("colorGradient").value,
    card: $("colorCard").value,
    accent: $("colorAccent").value,
    text: $("colorText").value,
    border: $("colorBorder").value
  };
}

function applyDesignSettings() {
  document.documentElement.style.setProperty(
    "--gradient-opacity",
    `${Number(profile.gradientIntensity ?? 55)}%`
  );

  document.documentElement.style.setProperty(
    "--card-radius",
    `${Number(profile.cardRadius ?? 18)}px`
  );
}

function getStatIcon(label = "") {
  const value = label.toLowerCase();

  const icons = [
    { terms: ["projeto", "project"], icon: "✦" },
    { terms: ["nível", "nivel", "level"], icon: "◇" },
    { terms: ["conquista", "achievement"], icon: "♛" },
    { terms: ["amigo", "friend"], icon: "♧" },
    { terms: ["publicação", "publicacao", "post"], icon: "▤" },
    { terms: ["vitória", "vitoria", "win"], icon: "⚔" },
    { terms: ["hora", "tempo"], icon: "◷" },
    { terms: ["favorito", "favorite"], icon: "♡" },
    { terms: ["visita", "visualização"], icon: "◉" },
    { terms: ["seguidores", "seguidor"], icon: "♙" },
    { terms: ["rank", "posição", "posicao"], icon: "♜" },
    { terms: ["coleção", "colecao"], icon: "❖" }
  ];

  const match = icons.find((item) =>
    item.terms.some((term) => value.includes(term))
  );

  return match ? match.icon : "✧";
}

function getDetailIcon(label = "") {
  const value = label.toLowerCase();

  const icons = [
    { terms: ["local", "cidade", "país", "pais"], icon: "⌖" },
    { terms: ["interesse", "hobby"], icon: "✧" },
    { terms: ["ocupação", "ocupacao", "trabalho", "profissão", "profissao"], icon: "⌘" },
    { terms: ["aniversário", "aniversario", "nascimento"], icon: "✿" },
    { terms: ["preferência", "preferencia", "favorito"], icon: "♡" },
    { terms: ["objetivo", "meta", "sonho"], icon: "☼" },
    { terms: ["jogo", "game"], icon: "⌖" },
    { terms: ["música", "musica"], icon: "♫" },
    { terms: ["rede", "social"], icon: "◎" },
    { terms: ["idioma", "língua", "lingua"], icon: "文" },
    { terms: ["estudo", "curso", "faculdade"], icon: "▤" },
    { terms: ["site", "link"], icon: "↗" }
  ];

  const match = icons.find((item) =>
    item.terms.some((term) => value.includes(term))
  );

  return match ? match.icon : "✦";
}

function svgStart(content) {
  return `
    <svg viewBox="0 0 190 190"
         xmlns="http://www.w3.org/2000/svg"
         fill="none"
         aria-hidden="true">
      ${content}
    </svg>
  `;
}

const FRAMES = {

  none: "",

  celestial: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <path class="fine-line" d="M95 8 L100 18 L95 28 L90 18Z"/>
    <path class="fine-line" d="M95 162 L100 172 L95 182 L90 172Z"/>

    <path class="fine-line" d="M8 95 L18 90 L28 95 L18 100Z"/>
    <path class="fine-line" d="M162 95 L172 90 L182 95 L172 100Z"/>

    <path class="ornament" d="M95 9 L98 16 L95 23 L92 16Z"/>
    <path class="ornament" d="M95 167 L98 174 L95 181 L92 174Z"/>

    <path class="ornament" d="M9 95 L16 92 L23 95 L16 98Z"/>
    <path class="ornament" d="M167 95 L174 92 L181 95 L174 98Z"/>

    <path class="fine-line" d="M42 42 L48 48 M148 42 L142 48 M42 148 L48 142 M148 148 L142 142"/>

    <circle class="ornament" cx="45" cy="45" r="3"/>
    <circle class="ornament" cx="145" cy="45" r="3"/>
    <circle class="ornament" cx="45" cy="145" r="3"/>
    <circle class="ornament" cx="145" cy="145" r="3"/>

    <path class="fine-line" d="M67 17 Q95 2 123 17"/>
    <path class="fine-line" d="M67 173 Q95 188 123 173"/>

    <path class="ornament" d="M95 3 L98 8 L95 13 L92 8Z"/>
    <path class="ornament" d="M95 177 L98 182 L95 187 L92 182Z"/>

    <path class="fine-line" d="M51 29 Q63 14 79 20 Q70 24 66 34 Q60 28 51 29Z"/>
    <path class="fine-line" d="M139 29 Q127 14 111 20 Q120 24 124 34 Q130 28 139 29Z"/>
    <path class="fine-line" d="M51 161 Q63 176 79 170 Q70 166 66 156 Q60 162 51 161Z"/>
    <path class="fine-line" d="M139 161 Q127 176 111 170 Q120 166 124 156 Q130 162 139 161Z"/>
    <path class="ornament" d="M64 25 L68 30 L64 35 L60 30Z M126 25 L130 30 L126 35 L122 30Z M64 155 L68 160 L64 165 L60 160Z M126 155 L130 160 L126 165 L122 160Z"/>
    <circle class="ornament" cx="95" cy="18" r="1.8"/>
    <circle class="ornament" cx="95" cy="172" r="1.8"/>
  `),

  gothic: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <path class="fine-line" d="M95 8 C87 18 86 25 95 32 C104 25 103 18 95 8Z"/>
    <path class="fine-line" d="M95 182 C87 172 86 165 95 158 C104 165 103 172 95 182Z"/>

    <path class="fine-line" d="M8 95 C18 87 25 86 32 95 C25 104 18 103 8 95Z"/>
    <path class="fine-line" d="M182 95 C172 87 165 86 158 95 C165 104 172 103 182 95Z"/>

    <path class="ornament" d="M95 8 L99 19 L95 26 L91 19Z"/>
    <path class="ornament" d="M95 182 L99 171 L95 164 L91 171Z"/>

    <path class="fine-line" d="M34 34 L49 45 L42 51 L29 42Z"/>
    <path class="fine-line" d="M156 34 L141 45 L148 51 L161 42Z"/>
    <path class="fine-line" d="M34 156 L49 145 L42 139 L29 148Z"/>
    <path class="fine-line" d="M156 156 L141 145 L148 139 L161 148Z"/>

    <path class="ornament" d="M29 36 L36 43 L29 50 L22 43Z"/>
    <path class="ornament" d="M161 36 L168 43 L161 50 L154 43Z"/>
    <path class="ornament" d="M29 140 L36 147 L29 154 L22 147Z"/>
    <path class="ornament" d="M161 140 L168 147 L161 154 L154 147Z"/>

    <path class="fine-line" d="M62 18 Q73 9 82 17 Q76 24 69 25"/>
    <path class="fine-line" d="M128 18 Q117 9 108 17 Q114 24 121 25"/>
    <path class="fine-line" d="M62 172 Q73 181 82 173 Q76 166 69 165"/>
    <path class="fine-line" d="M128 172 Q117 181 108 173 Q114 166 121 165"/>

    <circle class="ornament" cx="95" cy="28" r="3"/>
    <circle class="ornament" cx="95" cy="162" r="3"/>
  `),

  royal: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <path class="fine-line" d="M63 23 L56 10 L79 19 L95 5 L111 19 L134 10 L127 23"/>
    <path class="fine-line" d="M63 23 L95 35 L127 23"/>

    <path class="ornament" d="M95 4 L100 14 L95 23 L90 14Z"/>
    <circle class="ornament" cx="58" cy="11" r="3.5"/>
    <circle class="ornament" cx="132" cy="11" r="3.5"/>

    <path class="fine-line" d="M28 72 Q10 95 28 118"/>
    <path class="fine-line" d="M162 72 Q180 95 162 118"/>

    <path class="ornament" d="M19 95 L27 86 L34 95 L27 104Z"/>
    <path class="ornament" d="M171 95 L163 86 L156 95 L163 104Z"/>

    <path class="fine-line" d="M63 167 L95 185 L127 167"/>
    <path class="ornament" d="M95 176 L101 184 L95 190 L89 184Z"/>

    <circle class="ornament" cx="45" cy="45" r="3.5"/>
    <circle class="ornament" cx="145" cy="45" r="3.5"/>
    <circle class="ornament" cx="45" cy="145" r="3.5"/>
    <circle class="ornament" cx="145" cy="145" r="3.5"/>

    <path class="fine-line" d="M37 45 L45 34 L53 45"/>
    <path class="fine-line" d="M153 45 L145 34 L137 45"/>
    <path class="fine-line" d="M37 145 L45 156 L53 145"/>
    <path class="fine-line" d="M153 145 L145 156 L137 145"/>
  `),

  floral: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <g transform="translate(95 13)">
      <path class="fine-line" d="M0 0 Q-17 -14 -19 1 Q-12 11 0 0 Q12 11 19 1 Q17 -14 0 0Z"/>
      <circle class="ornament" cx="0" cy="0" r="4"/>
    </g>

    <g transform="translate(95 177)">
      <path class="fine-line" d="M0 0 Q-17 -14 -19 1 Q-12 11 0 0 Q12 11 19 1 Q17 -14 0 0Z"/>
      <circle class="ornament" cx="0" cy="0" r="4"/>
    </g>

    <g transform="translate(13 95) rotate(-90)">
      <path class="fine-line" d="M0 0 Q-17 -14 -19 1 Q-12 11 0 0 Q12 11 19 1 Q17 -14 0 0Z"/>
      <circle class="ornament" cx="0" cy="0" r="4"/>
    </g>

    <g transform="translate(177 95) rotate(90)">
      <path class="fine-line" d="M0 0 Q-17 -14 -19 1 Q-12 11 0 0 Q12 11 19 1 Q17 -14 0 0Z"/>
      <circle class="ornament" cx="0" cy="0" r="4"/>
    </g>

    <path class="fine-line" d="M38 42 Q24 28 29 19 Q43 23 47 37"/>
    <path class="fine-line" d="M152 42 Q166 28 161 19 Q147 23 143 37"/>
    <path class="fine-line" d="M38 148 Q24 162 29 171 Q43 167 47 153"/>
    <path class="fine-line" d="M152 148 Q166 162 161 171 Q147 167 143 153"/>

    <path class="ornament" d="M29 18 Q21 10 18 21 Q24 30 29 18Z"/>
    <path class="ornament" d="M161 18 Q169 10 172 21 Q166 30 161 18Z"/>
    <path class="ornament" d="M29 172 Q21 180 18 169 Q24 160 29 172Z"/>
    <path class="ornament" d="M161 172 Q169 180 172 169 Q166 160 161 172Z"/>

    <path class="fine-line" d="M61 18 Q72 29 81 23 M129 18 Q118 29 109 23"/>
    <path class="fine-line" d="M61 172 Q72 161 81 167 M129 172 Q118 161 109 167"/>
  `),

  ornate: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <path class="fine-line" d="M95 13 C78 3 65 13 73 25 C80 34 91 29 95 21 C99 29 110 34 117 25 C125 13 112 3 95 13Z"/>
    <path class="fine-line" d="M95 177 C78 187 65 177 73 165 C80 156 91 161 95 169 C99 161 110 156 117 165 C125 177 112 187 95 177Z"/>

    <path class="fine-line" d="M13 95 C3 78 13 65 25 73 C34 80 29 91 21 95 C29 99 34 110 25 117 C13 125 3 112 13 95Z"/>
    <path class="fine-line" d="M177 95 C187 78 177 65 165 73 C156 80 161 91 169 95 C161 99 156 110 165 117 C177 125 187 112 177 95Z"/>

    <path class="ornament" d="M95 8 L100 17 L95 25 L90 17Z"/>
    <path class="ornament" d="M95 182 L100 173 L95 165 L90 173Z"/>

    <path class="fine-line" d="M39 39 Q55 26 61 42 Q59 54 47 52 Q41 50 39 39Z"/>
    <path class="fine-line" d="M151 39 Q135 26 129 42 Q131 54 143 52 Q149 50 151 39Z"/>
    <path class="fine-line" d="M39 151 Q55 164 61 148 Q59 136 47 138 Q41 140 39 151Z"/>
    <path class="fine-line" d="M151 151 Q135 164 129 148 Q131 136 143 138 Q149 140 151 151Z"/>

    <circle class="ornament" cx="48" cy="45" r="3"/>
    <circle class="ornament" cx="142" cy="45" r="3"/>
    <circle class="ornament" cx="48" cy="145" r="3"/>
    <circle class="ornament" cx="142" cy="145" r="3"/>

    <path class="fine-line" d="M64 17 Q77 8 85 17 M126 17 Q113 8 105 17"/>
    <path class="fine-line" d="M64 173 Q77 182 85 173 M126 173 Q113 182 105 173"/>
  `),

  dark: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="79"/>

    <path class="fine-line" d="M95 10 L102 27 L95 22 L88 27Z"/>
    <path class="fine-line" d="M95 180 L102 163 L95 168 L88 163Z"/>

    <path class="fine-line" d="M10 95 L27 88 L22 95 L27 102Z"/>
    <path class="fine-line" d="M180 95 L163 88 L168 95 L163 102Z"/>

    <path class="fine-line" d="M35 35 L51 44 L43 47 L46 57"/>
    <path class="fine-line" d="M155 35 L139 44 L147 47 L144 57"/>
    <path class="fine-line" d="M35 155 L51 146 L43 143 L46 133"/>
    <path class="fine-line" d="M155 155 L139 146 L147 143 L144 133"/>

    <path class="ornament" d="M95 6 L99 17 L95 25 L91 17Z"/>
    <path class="ornament" d="M95 184 L99 173 L95 165 L91 173Z"/>

    <path class="ornament" d="M6 95 L17 91 L25 95 L17 99Z"/>
    <path class="ornament" d="M184 95 L173 91 L165 95 L173 99Z"/>

    <path class="fine-line" d="M60 18 L70 28 L66 30 L58 26"/>
    <path class="fine-line" d="M130 18 L120 28 L124 30 L132 26"/>
    <path class="fine-line" d="M60 172 L70 162 L66 160 L58 164"/>
    <path class="fine-line" d="M130 172 L120 162 L124 160 L132 164"/>

    <circle class="ornament" cx="44" cy="44" r="3"/>
    <circle class="ornament" cx="146" cy="44" r="3"/>
    <circle class="ornament" cx="44" cy="146" r="3"/>
    <circle class="ornament" cx="146" cy="146" r="3"/>
  `),

  halo: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="73"/>
    <circle class="ring-secondary" cx="95" cy="95" r="81"/>

    <circle class="ornament" cx="95" cy="14" r="3"/>
    <circle class="ornament" cx="95" cy="176" r="3"/>
    <circle class="ornament" cx="14" cy="95" r="3"/>
    <circle class="ornament" cx="176" cy="95" r="3"/>

    <path class="fine-line" d="M95 3 L95 7 M95 183 L95 187 M3 95 L7 95 M183 95 L187 95"/>

    <path class="fine-line" d="M38 38 L45 45 M152 38 L145 45 M38 152 L45 145 M152 152 L145 145"/>

    <path class="ornament" d="M95 7 L98 13 L95 19 L92 13Z"/>
    <path class="ornament" d="M95 171 L98 177 L95 183 L92 177Z"/>

    <path class="fine-line" d="M70 18 Q95 8 120 18"/>
    <path class="fine-line" d="M70 172 Q95 182 120 172"/>
    <path class="fine-line" d="M18 70 Q8 95 18 120"/>
    <path class="fine-line" d="M172 70 Q182 95 172 120"/>
  `),

  vintage: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="78"/>

    <path class="fine-line" d="M95 9 Q78 9 78 23 Q78 34 95 36 Q112 34 112 23 Q112 9 95 9Z"/>
    <path class="fine-line" d="M95 181 Q78 181 78 167 Q78 156 95 154 Q112 156 112 167 Q112 181 95 181Z"/>

    <path class="ornament" d="M95 8 L100 18 L95 28 L90 18Z"/>
    <path class="ornament" d="M95 182 L100 172 L95 162 L90 172Z"/>

    <path class="fine-line" d="M9 95 Q9 78 23 78 Q34 78 36 95 Q34 112 23 112 Q9 112 9 95Z"/>
    <path class="fine-line" d="M181 95 Q181 78 167 78 Q156 78 154 95 Q156 112 167 112 Q181 112 181 95Z"/>

    <path class="ornament" d="M8 95 L18 90 L28 95 L18 100Z"/>
    <path class="ornament" d="M182 95 L172 90 L162 95 L172 100Z"/>

    <path class="fine-line" d="M38 38 Q50 28 59 38 Q59 49 48 52 Q39 50 38 38Z"/>
    <path class="fine-line" d="M152 38 Q140 28 131 38 Q131 49 142 52 Q151 50 152 38Z"/>
    <path class="fine-line" d="M38 152 Q50 162 59 152 Q59 141 48 138 Q39 140 38 152Z"/>
    <path class="fine-line" d="M152 152 Q140 162 131 152 Q131 141 142 138 Q151 140 152 152Z"/>

    <circle class="ornament" cx="48" cy="43" r="3"/>
    <circle class="ornament" cx="142" cy="43" r="3"/>
    <circle class="ornament" cx="48" cy="147" r="3"/>
    <circle class="ornament" cx="142" cy="147" r="3"/>
  `),

  wings: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="73"/>
    <circle class="ring-secondary" cx="95" cy="95" r="82"/>
    <path class="fine-line" d="M20 76 C7 59 10 36 31 23 C29 43 43 50 57 54 C42 57 34 66 31 81 C27 78 23 77 20 76Z"/>
    <path class="fine-line" d="M170 76 C183 59 180 36 159 23 C161 43 147 50 133 54 C148 57 156 66 159 81 C163 78 167 77 170 76Z"/>
    <path class="fine-line" d="M25 65 Q37 58 49 59 M29 53 Q39 48 47 49 M35 40 Q43 39 49 43"/>
    <path class="fine-line" d="M165 65 Q153 58 141 59 M161 53 Q151 48 143 49 M155 40 Q147 39 141 43"/>
    <path class="fine-line" d="M40 143 Q23 153 26 173 Q44 166 55 151 M150 143 Q167 153 164 173 Q146 166 135 151"/>
    <path class="ornament" d="M95 5 L101 17 L95 29 L89 17Z"/>
    <path class="ornament" d="M95 161 L100 171 L95 185 L90 171Z"/>
    <circle class="ornament" cx="30" cy="82" r="3"/><circle class="ornament" cx="160" cy="82" r="3"/>
  `),

  skulls: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="81"/>
    <path class="fine-line" d="M95 9 C83 20 81 34 95 42 C109 34 107 20 95 9Z"/>
    <path class="fine-line" d="M95 181 C83 170 81 156 95 148 C109 156 107 170 95 181Z"/>
    <g class="ornament" transform="translate(95 29)"><path d="M-8 -5 Q0 -13 8 -5 L7 5 Q0 12 -7 5Z"/><circle cx="-3" cy="0" r="1.8"/><circle cx="3" cy="0" r="1.8"/></g>
    <g class="ornament" transform="translate(95 161)"><path d="M-8 -5 Q0 -13 8 -5 L7 5 Q0 12 -7 5Z"/><circle cx="-3" cy="0" r="1.8"/><circle cx="3" cy="0" r="1.8"/></g>
    <path class="fine-line" d="M27 51 L42 58 L35 72 L21 65Z M163 51 L148 58 L155 72 L169 65Z M27 139 L42 132 L35 118 L21 125Z M163 139 L148 132 L155 118 L169 125Z"/>
    <path class="ornament" d="M19 95 L28 88 L37 95 L28 102Z M171 95 L162 88 L153 95 L162 102Z"/>
  `),

  thorn: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="82"/>
    <path class="fine-line" d="M28 45 C45 49 43 64 57 68 C45 75 42 85 48 95 C35 91 25 98 22 111 C14 93 18 75 28 45Z"/>
    <path class="fine-line" d="M162 45 C145 49 147 64 133 68 C145 75 148 85 142 95 C155 91 165 98 168 111 C176 93 172 75 162 45Z"/>
    <path class="fine-line" d="M28 145 C44 138 50 126 48 111 M162 145 C146 138 140 126 142 111"/>
    <path class="ornament" d="M29 45 L20 25 L39 37Z M161 45 L170 25 L151 37Z M48 95 L28 88 L39 108Z M142 95 L162 88 L151 108Z"/>
    <path class="fine-line" d="M65 20 Q78 33 95 26 Q112 33 125 20 M65 170 Q78 157 95 164 Q112 157 125 170"/>
    <circle class="ornament" cx="95" cy="14" r="3"/><circle class="ornament" cx="95" cy="176" r="3"/>
  `),

  dragon: svgStart(`
    <circle class="ring-main" cx="95" cy="95" r="72"/>
    <circle class="ring-secondary" cx="95" cy="95" r="82"/>
    <path class="fine-line" d="M35 55 C18 40 20 20 42 13 C40 31 55 35 67 38 C54 43 49 54 51 66 C44 62 39 59 35 55Z"/>
    <path class="fine-line" d="M155 55 C172 40 170 20 148 13 C150 31 135 35 123 38 C136 43 141 54 139 66 C146 62 151 59 155 55Z"/>
    <path class="fine-line" d="M39 51 L25 32 L47 39 M151 51 L165 32 L143 39"/>
    <path class="ornament" d="M95 4 L102 18 L95 31 L88 18Z"/>
    <path class="fine-line" d="M24 95 Q10 82 18 68 Q31 73 35 87 M166 95 Q180 82 172 68 Q159 73 155 87"/>
    <path class="fine-line" d="M45 145 Q59 153 69 169 M145 145 Q131 153 121 169"/>
    <path class="ornament" d="M18 68 L9 54 L27 60Z M172 68 L181 54 L163 60Z M95 169 L103 181 L95 188 L87 181Z"/>
    <circle class="ornament" cx="45" cy="45" r="3"/><circle class="ornament" cx="145" cy="45" r="3"/>
  `)
};

function renderFrame() {
  const frame = $("avatarFrame");
  const name = profile.moldura || "none";

  const artwork = name;

  const rarity = ["none", "common", "rare", "epic", "legendary"].includes(profile.raridadeMoldura)
    ? profile.raridadeMoldura
    : "none";
  frame.className = `avatar-frame rarity-${rarity}`;

  if (profile.molduraCorPersonalizada) {
    frame.classList.add("custom-frame-color");
    frame.style.setProperty("--frame-custom-color", profile.molduraCor || "#a78bfa");
  } else {
    frame.style.removeProperty("--frame-custom-color");
  }

  if (!FRAMES[artwork]) {
    frame.innerHTML = "";
    return;
  }

  const finishingDetails = `
    <g class="frame-finishing-details">
      <circle class="frame-detail-ring" cx="95" cy="95" r="86" />
      <circle class="frame-detail-dots" cx="95" cy="95" r="66" />
      <path class="frame-detail-ticks" d="M95 2v8 M95 180v8 M2 95h8 M180 95h8 M29 29l6 6 M155 155l6 6 M161 29l-6 6 M35 155l-6 6" />
      <path class="frame-detail-star" d="M95 1l2.2 6.8L104 10l-6.8 2.2L95 19l-2.2-6.8L86 10l6.8-2.2Z M10 95l2.2 6.8L19 104l-6.8 2.2L10 113l-2.2-6.8L1 104l6.8-2.2Z M180 95l2.2 6.8L189 104l-6.8 2.2L180 113l-2.2-6.8L171 104l6.8-2.2Z" />
      <circle class="frame-detail-stone" cx="30" cy="30" r="2"/><circle class="frame-detail-stone" cx="160" cy="30" r="2"/><circle class="frame-detail-stone" cx="30" cy="160" r="2"/><circle class="frame-detail-stone" cx="160" cy="160" r="2"/>
    </g>`;
  frame.innerHTML = FRAMES[artwork].replace("</svg>", `${finishingDetails}</svg>`);

  if (name !== "none") frame.classList.add(`frame-${name}`);
}

function renderBannerHeading() {
  const heading = $("bannerHeading");
  const title = $("bannerTitle");
  const subtitle = $("bannerSubtitle");
  const visible = profile.bannerHeadingVisible !== false;
  const titleText = String(profile.bannerTitulo || "").trim();
  const subtitleText = String(profile.bannerSubtitulo || "").trim();

  title.textContent = titleText;
  subtitle.textContent = subtitleText;
  title.hidden = !titleText;
  subtitle.hidden = !subtitleText;
  heading.hidden = !visible || (!titleText && !subtitleText);
}

function renderIdentity() {
  renderBannerHeading();
  $("profileName").textContent = profile.nome || "";
  $("profileUsername").textContent = profile.usuario
    ? `@${profile.usuario}`
    : "";

  $("profileBio").textContent = profile.bio || "";
  const roleChip = $("profileRole");
  const blockedRole = /\b(admin|administrator|dev|developer|staff|moderator|owner|dono)\b/i.test(String(profile.cargo || "").trim());
  const safeRole = blockedRole ? "" : profile.cargo;
  roleChip.textContent = safeRole || "";
  roleChip.hidden = !safeRole;
  roleChip.classList.toggle("owner-role", /^(owner|dono)$/i.test(safeRole));
  roleChip.title = safeRole || "Identificação do perfil";
  roleChip.setAttribute("aria-label", roleChip.title);
  const verifiedBadge = $("verifiedBadge");
  const verifiedColor = /^#[0-9a-f]{6}$/i.test(profile.verificadoCor || "")
    ? profile.verificadoCor
    : DEFAULT_PROFILE.verificadoCor;
  verifiedBadge.hidden = !profile.verificado;
  verifiedBadge.style.setProperty("--verified-color", verifiedColor);
  document.querySelector(".profile-card")?.classList.toggle("effects-enabled", profile.efeitosPerfil !== false);
  $("footerText").textContent = profile.rodape || "";

  $("badges").innerHTML = profile.insignias
    .filter(Boolean)
    .map((badge) => `<span class="badge">${escapeHTML(badge)}</span>`)
    .join("");

  document.documentElement.style.setProperty(
    "--font",
    `"${profile.fonte || "DM Sans"}", sans-serif`
  );
}

function renderStats() {
  $("statsSectionTitle").textContent = profile.statsTitle || "Em evidência";
  $("statsSectionDescription").textContent = profile.statsSubtitle || "";
  $("statsGrid").innerHTML = profile.estatisticas.map((stat) => {
    const icon = stat.icon || getStatIcon(stat.label);

    return `
      <article class="stat-card">
        <span class="stat-icon">${escapeHTML(icon)}</span>
        <span class="stat-label">${escapeHTML(stat.label)}</span>
        <strong class="stat-value">${escapeHTML(stat.value || "")}</strong>
      </article>
    `;