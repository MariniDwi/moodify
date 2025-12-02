// =============================
// Konfigurasi YouTube Data API
// =============================

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

// Utilitas DOM
const form = document.getElementById("prefForm");
const moodSelect = document.getElementById("moodSelect");
const activitySelect = document.getElementById("activitySelect");
const genreSelect = document.getElementById("genreSelect");
const statusText = document.getElementById("statusText");
const videoGrid = document.getElementById("videoGrid");

// =============================
// "AI" Mapping Mood/Kegiatan/Genre → Query
// =============================
// Pemetaan kata kunci untuk membentuk query musik otomatis.
const moodKeywords = {
  senang: ["happy", "feel good", "uplifting"],
  sedih: ["sad", "melancholy", "emotional"],
  capek: ["calm", "relaxing", "soothing"],
  semangat: ["energetic", "motivational", "power"],
};

const activityKeywords = {
  belajar: ["study", "focus", "concentration", "instrumental", "lofi"],
  olahraga: ["workout", "gym", "high energy", "cardio"],
  bersantai: ["chill", "relax", "ambient", "soft"],
  bekerja: ["productivity", "deep focus", "background", "instrumental"],
};

const genreKeywords = {
  "": [],
  pop: ["pop"],
  rock: ["rock"],
  jazz: ["jazz"],
  lofi: ["lofi", "chillhop"],
  edm: ["edm", "electronic", "dance"],
  acoustic: ["acoustic"],
  kpop: ["kpop", "k-pop"],
  dangdut: ["dangdut"],
};

// Bangun query berdasarkan input pengguna.
function buildQuery(mood, activity, genre) {
  const moodTerms = moodKeywords[mood] || [];
  const activityTerms = activityKeywords[activity] || [];
  const genreTerms = genreKeywords[genre] || [];

  // Heuristik sederhana untuk memprioritaskan kata kunci utama.
  const primary = [genreTerms[0], moodTerms[0], activityTerms[0]].filter(Boolean).join(" ");
  const expansions = [...genreTerms.slice(1), ...moodTerms.slice(1), ...activityTerms.slice(1)]
    .filter(Boolean)
    .join(" ");

  // Tambahkan kata "playlist" untuk hasil yang lebih konsisten.
  const query = `${primary} ${expansions} music playlist`.trim().replace(/\s+/g, " ");

  // Fallback jika semua kosong (seharusnya tidak terjadi karena mood & activity required)
  return query || "music playlist";
}

// =============================
// Fetch ke YouTube Data API
// =============================
async function fetchVideos(query, maxResults = 6) {
  const params = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
    videoEmbeddable: "true",
    safeSearch: "moderate",
    order: "relevance",
  });

  const url = `${YT_SEARCH_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.items || [];
}

// =============================
// Render hasil video
// =============================
function clearGrid() {
  videoGrid.innerHTML = "";
}

function setStatus(message, type = "info") {
  statusText.textContent = message || "";
  statusText.style.color = type === "error" ? "#ef4444" : "#9aa4b2";
}

function renderVideos(items) {
  clearGrid();
  if (!items || items.length === 0) {
    setStatus("Tidak ada hasil. Coba ubah preferensi atau genre.");
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const videoId = item?.id?.videoId;
    const title = item?.snippet?.title || "Tanpa judul";
    const channel = item?.snippet?.channelTitle || "";
    if (!videoId) return;

    // Kartu video
    const card = document.createElement("article");
    card.className = "video-card";

    // Frame 16:9 untuk embed
    const frame = document.createElement("div");
    frame.className = "video-frame";

    const iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.title = title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = `https://www.youtube.com/embed/${videoId}`;

    frame.appendChild(iframe);

    // Meta
    const meta = document.createElement("div");
    meta.className = "video-meta";

    const h3 = document.createElement("h3");
    h3.className = "video-title";
    h3.textContent = title;

    const p = document.createElement("p");
    p.className = "video-channel";
    p.textContent = channel;

    meta.appendChild(h3);
    meta.appendChild(p);

    card.appendChild(frame);
    card.appendChild(meta);

    fragment.appendChild(card);
  });

  videoGrid.appendChild(fragment);
}

// =============================
// Event: Submit form preferensi
// =============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mood = moodSelect.value;
  const activity = activitySelect.value;
  const genre = genreSelect.value;

  if (!API_KEY || API_KEY === "YOUR_API_KEY") {
    setStatus("Harap isi API key YouTube di script.js untuk melanjutkan.", "error");
    return;
  }

  if (!mood || !activity) {
    setStatus("Pilih mood dan kegiatan terlebih dahulu.", "error");
    return;
  }

  const query = buildQuery(mood, activity, genre);
  setStatus(`Mencari: "${query}" ...`);
  clearGrid();

  try {
    const items = await fetchVideos(query, 6);
    setStatus(`Menampilkan hasil untuk: "${query}"`);
    renderVideos(items);
  } catch (err) {
    console.error(err);
    // Penanganan error umum (quota habis, API key salah, dll.)
    const message = String(err?.message || err || "Terjadi kesalahan.");
    if (/quota|forbidden|accessNotConfigured|invalid/i.test(message)) {
      setStatus(
        "Gagal memuat data. Periksa API key, kuota, dan apakah YouTube Data API v3 sudah diaktifkan.",
        "error"
      );
    } else {
      setStatus("Gagal memuat data. Coba lagi nanti.", "error");
    }
  }
});
