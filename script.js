// ============================================================
// FLIXER - COMPLETE JAVASCRIPT
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1ZmNiODViODMwNWE5MmNkZTExNWYwMzY1OTUxOWM1NSIsIm5iZiI6MTc4MzcxMjU4OS40NDk5OTk4LCJzdWIiOiI2YTUxNGI0ZDRiZjc2YjNhMWUyMDViZTAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.NgKb4cPoDCjlDNcUuwnQ2AbDDtsztcNevBTMMCURy4M";
const YOUTUBE_API_KEY = "AIzaSyCsBtdCTmpLiVj2TRiT0-wLQisvcM28URo";

const SITE_URL = "https://watchflixer.pages.dev";
const SITE_NAME = "Flixer";
const BASE_PATH = "/";
const DEFAULT_DESCRIPTION = "Watch the latest official trailers for movies, TV shows, K-Dramas, and anime from around the world. Always updated, free, no account required.";

const TRENDING_TOTAL = 12;
const CATALOG_PAGES = 15;
const MAX_CATALOG_ITEMS = 300;

// ============================================================
// API BASE URL
// ============================================================
const API_BASE_URL = 'https://flixer-api.onrender.com';

// ============================================================
// STATE
// ============================================================
let currentSelectedShow = { id: "", type: "", youtubeKey: "" };
let currentCategory = "trending";
let lastSearchQuery = "";
let homeScrollY = 0;
let currentPlayerItem = null;
let previousView = 'home';
let previousScrollY = 0;
let currentPage = 1;
const EPISODES_PER_PAGE = 60;
let totalEpisodesCount = 0;
let currentSeasonNumber = 0;

// ============================================================
// LANGUAGE
// ============================================================
const LANG_STORAGE_KEY = "allflix_lang";
let currentLanguage = localStorage.getItem(LANG_STORAGE_KEY) || "en";

const MODE_STORAGE_KEY = "allflix_mode";
let currentMode = localStorage.getItem(MODE_STORAGE_KEY) || "dark";

const tmdbLanguageMap = {
    en: "en-US", tl: "tl-PH", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", es: "es-ES", fr: "fr-FR", id: "id-ID",
    ar: "ar-SA", hi: "hi-IN", pt: "pt-PT", de: "de-DE", it: "it-IT", ru: "ru-RU", vi: "vi-VN", th: "th-TH",
    tr: "tr-TR", nl: "nl-NL", pl: "pl-PL", sv: "sv-SE", no: "no-NO", da: "da-DK", fi: "fi-FI", el: "el-GR",
    he: "he-IL", uk: "uk-UA", cs: "cs-CZ", hu: "hu-HU", ro: "ro-RO", bn: "bn-BD", ur: "ur-PK", ms: "ms-MY",
    sw: "sw-KE", fa: "fa-IR", pa: "pa-IN", ta: "ta-IN", my: "my-MM", km: "km-KH"
};

function tmdbLang() {
    return tmdbLanguageMap[currentLanguage] || "en-US";
}

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
    "en": {
        "nav_trending": "Trending",
        "nav_movies": "Movies",
        "nav_tv": "TV Shows & Anime",
        "search_placeholder": "Search for Movies, Anime, or Drama...",
        "home": "Home",
        "label_recommended": "Recommended for you:",
        "language": "Language",
        "mode": "Mode",
        "download": "Download",
        "about_us": "About Us",
        "select_language": "Select Language",
        "lang_note": "Note: Titles and descriptions are automatically translated when available.",
        "watch_now": "▶ Watch Now",
        "back": "← Back",
        "top_cast": "Top Cast",
        "trailer_label": "Trailer",
        "no_trailer": "No trailer available yet for this title.",
        "director_label": "Director:",
        "section_trending": "Trending Today",
        "section_movies": "Popular Movies",
        "section_tv": "Popular TV Shows & Anime",
        "brand": "FLIXER",
        "no_results": "No results found.",
        "results_for": "Results for",
        "no_overview": "No overview available for this title.",
        "unknown_cast": "Unknown Cast",
        "download_badge": "Coming Soon",
        "download_text": "Watch full movies, TV episodes, anime, and dramas on the official Flixer app.",
        "notify_me": "Notify Me",
        "notify_me_done": "You'll be notified!"
    }
};

function t(key) {
    const dict = translations[currentLanguage] || translations.en;
    return dict[key] || translations.en[key] || key;
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================
const SESSION_KEY = 'flixer_session';
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session.expiry && Date.now() > session.expiry) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

function setSession(token, username) {
    const session = {
        token: token,
        username: username,
        expiry: Date.now() + SESSION_EXPIRY
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ============================================================
// LOGIN SYSTEM
// ============================================================
const BLOCKED_USERS_KEY = 'flixer_blocked_users';
const LOGIN_ATTEMPTS_KEY = 'flixer_login_attempts';
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 24 * 60 * 60 * 1000;

function getBlockedUsers() {
    try {
        return JSON.parse(localStorage.getItem(BLOCKED_USERS_KEY)) || {};
    } catch { return {}; }
}

function getLoginAttempts() {
    try {
        return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)) || {};
    } catch { return {}; }
}

function saveBlockedUsers(data) {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(data));
}

function saveLoginAttempts(data) {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
}

function isUserBlocked(username) {
    const blocked = getBlockedUsers();
    if (blocked[username]) {
        const blockTime = blocked[username];
        if (Date.now() - blockTime < BLOCK_DURATION) {
            return true;
        } else {
            delete blocked[username];
            saveBlockedUsers(blocked);
            return false;
        }
    }
    return false;
}

function recordFailedAttempt(username) {
    const attempts = getLoginAttempts();
    attempts[username] = (attempts[username] || 0) + 1;
    saveLoginAttempts(attempts);
    
    if (attempts[username] >= MAX_ATTEMPTS) {
        const blocked = getBlockedUsers();
        blocked[username] = Date.now();
        saveBlockedUsers(blocked);
        return true;
    }
    return false;
}

function resetLoginAttempts(username) {
    const attempts = getLoginAttempts();
    delete attempts[username];
    saveLoginAttempts(attempts);
}

async function handleLogin(username, passcode) {
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    const errorEl = document.getElementById('loginError');
    const blockedEl = document.getElementById('loginBlocked');
    const attemptsDisplay = document.getElementById('loginAttemptsDisplay');
    
    if (isUserBlocked(username)) {
        blockedEl.style.display = 'flex';
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        return false;
    }
    
    const attempts = getLoginAttempts();
    const currentAttempts = attempts[username] || 0;
    const remaining = MAX_ATTEMPTS - currentAttempts;
    
    if (currentAttempts >= MAX_ATTEMPTS) {
        blockedEl.style.display = 'flex';
        return false;
    }
    
    attemptsDisplay.style.display = 'block';
    attemptsDisplay.textContent = `⚠️ ${remaining} attempt(s) remaining before account block`;
    
    loginBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    errorEl.style.display = 'none';
    blockedEl.style.display = 'none';
    
    try {
        // Simple login check
        if (username === "admin" && passcode === "1234") {
            resetLoginAttempts(username);
            attemptsDisplay.style.display = 'none';
            setSession("fake-token", username);
            showApp(username);
            return true;
        } else {
            const blocked = recordFailedAttempt(username);
            if (blocked) {
                blockedEl.style.display = 'flex';
                attemptsDisplay.style.display = 'none';
            } else {
                errorEl.style.display = 'flex';
                const newAttempts = getLoginAttempts();
                const newRemaining = MAX_ATTEMPTS - (newAttempts[username] || 0);
                attemptsDisplay.textContent = `⚠️ ${newRemaining} attempt(s) remaining before account block`;
            }
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            document.getElementById('loginPasscode').value = '';
            return false;
        }
    } catch (error) {
        errorEl.style.display = 'flex';
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        return false;
    }
}

// ============================================================
// SHOW/HIDE APP
// ============================================================
function showApp(username) {
    document.getElementById('loginOverlay').style.display = 'none';
    const appRoot = document.getElementById('appRoot');
    appRoot.style.display = 'block';
    appRoot.classList.add('active');
    
    document.getElementById('usernameDisplayHeader').textContent = username;
    document.getElementById('userDisplayHeader').style.display = 'flex';
    document.getElementById('logoutBtnHeader').style.display = 'flex';
    document.getElementById('sideUsernameDisplay').textContent = username;
    document.getElementById('sideUserInfo').style.display = 'flex';
    document.getElementById('mobileLogoutBtn').style.display = 'flex';
    
    document.body.style.overflow = 'auto';
    
    if (typeof loadTrending === 'function') {
        loadTrending();
    }
}

function hideApp() {
    document.getElementById('appRoot').style.display = 'none';
    document.getElementById('appRoot').classList.remove('active');
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('userDisplayHeader').style.display = 'none';
    document.getElementById('logoutBtnHeader').style.display = 'none';
    document.getElementById('sideUserInfo').style.display = 'none';
    document.getElementById('mobileLogoutBtn').style.display = 'none';
    document.body.style.overflow = 'hidden';
}

// ============================================================
// LOGOUT
// ============================================================
window.logout = function() {
    clearSession();
    hideApp();
    document.getElementById('loginPasscode').value = '';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginBlocked').style.display = 'none';
    document.getElementById('loginAttemptsDisplay').style.display = 'none';
    if (window.episodeTimerInterval) {
        clearInterval(window.episodeTimerInterval);
        window.episodeTimerInterval = null;
    }
};

// ============================================================
// LANGUAGE LIST
// ============================================================
const LANGUAGE_LIST = [
    { code: "en", name: "English" },
    { code: "tl", name: "Filipino" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "it", name: "Italiano" },
    { code: "pt", name: "Português" },
    { code: "ru", name: "Русский" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "zh", name: "中文" },
    { code: "ar", name: "العربية" },
    { code: "hi", name: "हिन्दी" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "vi", name: "Tiếng Việt" },
    { code: "th", name: "ภาษาไทย" },
    { code: "tr", name: "Türkçe" },
    { code: "nl", name: "Nederlands" },
    { code: "pl", name: "Polski" },
    { code: "sv", name: "Svenska" },
    { code: "no", name: "Norsk" },
    { code: "da", name: "Dansk" },
    { code: "fi", name: "Suomi" },
    { code: "el", name: "Ελληνικά" },
    { code: "he", name: "עברית" },
    { code: "uk", name: "Українська" },
    { code: "cs", name: "Čeština" },
    { code: "hu", name: "Magyar" },
    { code: "ro", name: "Română" },
    { code: "bn", name: "বাংলা" },
    { code: "ur", name: "اردو" },
    { code: "ms", name: "Bahasa Melayu" },
    { code: "sw", name: "Kiswahili" },
    { code: "fa", name: "فارسی" },
    { code: "pa", name: "ਪੰਜਾਬੀ" },
    { code: "ta", name: "தமிழ்" },
    { code: "my", name: "မြန်မာစာ" },
    { code: "km", name: "ភាសាខ្មែរ" }
];

function renderLanguageList() {
    const list = document.getElementById('lang-list');
    list.innerHTML = '';
    LANGUAGE_LIST.forEach(lang => {
        const li = document.createElement('li');
        li.dataset.lang = lang.code;
        li.innerHTML = `
            ${lang.name}
            ${lang.code === currentLanguage ? '<span class="check">✓</span>' : ''}
        `;
        li.onclick = () => selectLanguage(lang.code);
        list.appendChild(li);
    });
}

function selectLanguage(langCode) {
    currentLanguage = langCode;
    localStorage.setItem(LANG_STORAGE_KEY, langCode);
    syncLanguageUI();
    applyLanguage();
    refreshContent();
    setTimeout(() => {
        closeLanguagePanel();
    }, 300);
}

function syncLanguageUI() {
    document.querySelectorAll("#lang-list li").forEach(li => {
        li.classList.toggle("selected", li.dataset.lang === currentLanguage);
        const check = li.querySelector('.check');
        if (li.dataset.lang === currentLanguage) {
            if (!check) {
                const span = document.createElement('span');
                span.className = 'check';
                span.textContent = ' ✓';
                li.appendChild(span);
            }
        } else {
            if (check) check.remove();
        }
    });
}

function filterLanguages(event) {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll("#lang-list li").forEach(li => {
        const matches = li.textContent.toLowerCase().includes(query);
        li.classList.toggle("lang-hidden", !matches);
    });
}

function toggleLanguagePanel() {
    closeSidePanel();
    renderLanguageList();
    syncLanguageUI();
    document.getElementById("langOverlay").classList.add("open");
    document.getElementById("langPanel").classList.add("open");
}

function closeLanguagePanel() {
    document.getElementById("langOverlay").classList.remove("open");
    document.getElementById("langPanel").classList.remove("open");
}

// ============================================================
// SIDE PANEL
// ============================================================
function toggleSidePanel() {
    document.getElementById("sidePanel").classList.toggle("open");
    document.getElementById("sideOverlay").classList.toggle("open");
}

function closeSidePanel() {
    document.getElementById("sidePanel").classList.remove("open");
    document.getElementById("sideOverlay").classList.remove("open");
}

function goHome() {
    closeSidePanel();
    homeScrollY = 0;
    loadTrending();
    history.replaceState({}, "", BASE_PATH);
    updateSEO(null, null, BASE_PATH);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// MODE TOGGLE
// ============================================================
function applyModeOnLoad() {
    if (currentMode === "light") {
        document.body.classList.add("light-mode");
    } else {
        document.body.classList.remove("light-mode");
    }
}

function toggleMode() {
    const body = document.body;
    body.classList.toggle("light-mode");
    currentMode = body.classList.contains("light-mode") ? "light" : "dark";
    localStorage.setItem(MODE_STORAGE_KEY, currentMode);
}

// ============================================================
// FETCH FUNCTIONS
// ============================================================
function fetchData(url, callback) {
    fetch(url, {
        method: "GET",
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
    })
    .then(data => callback(data))
    .catch(err => {
        console.error("Error loading data from TMDB:", err);
        document.getElementById("banner-title").innerText = "Connection Error";
        document.getElementById("banner-desc").innerText = "Unable to connect to TMDB server.";
    });
}

function fetchManyPages(baseUrl, totalPages, onFirstPage, onMore) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const fetchPage = (page) => fetch(`${baseUrl}${separator}page=${page}`, {
        method: "GET",
        headers: { accept: "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` }
    }).then(res => res.ok ? res.json() : { results: [] }).catch(() => ({ results: [] }));
    fetchPage(1).then(firstData => {
        onFirstPage(firstData.results || []);
        if (totalPages <= 1) return;
        const remainingRequests = [];
        for (let page = 2; page <= totalPages; page++) {
            remainingRequests.push(fetchPage(page));
        }
        Promise.all(remainingRequests).then(pages => {
            const combined = pages.flatMap(p => p.results || []);
            if (typeof onMore === "function") onMore(combined);
        });
    });
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function renderGrid(items, limit = MAX_CATALOG_ITEMS, showNumbers = false) {
    const grid = document.getElementById("media-grid-items");
    grid.classList.remove("carousel-mode");
    const limitedItems = items.filter(item => item.poster_path).slice(0, limit);
    const htmlParts = limitedItems.map((item, index) => {
        const title = item.title || item.name;
        const safeTitle = title ? title.replace(/"/g, "&quot;") : "";
        const type = item.media_type || (item.first_air_date ? "tv" : "movie");
        const year = (item.release_date || item.first_air_date || "").slice(0, 4);
        const rating = (item.vote_average || 0).toFixed(1);
        return `
            <div class="card" onclick="openDetail('${item.id}', '${type}')">
                ${showNumbers ? `<span class="card-number">${index + 1}</span>` : ''}
                <span class="rating-badge">${rating}</span>
                <img src="${IMG_URL + item.poster_path}" alt="${safeTitle}" loading="lazy">
                <div class="card-details">
                    <div class="card-title">${title}</div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = htmlParts.join("");
}

function renderTrendingCarousel(items) {
    const grid = document.getElementById("media-grid-items");
    grid.classList.add("carousel-mode");
    const limitedItems = items.filter(item => item.poster_path).slice(0, TRENDING_TOTAL);
    const htmlParts = limitedItems.map((item, index) => {
        const title = item.title || item.name;
        const safeTitle = title ? title.replace(/"/g, "&quot;") : "";
        const type = item.media_type || (item.first_air_date ? "tv" : "movie");
        const year = (item.release_date || item.first_air_date || "").slice(0, 4);
        return `
            <div class="card" onclick="openDetail('${item.id}', '${type}')">
                <span class="card-number">${index + 1}</span>
                <img src="${IMG_URL + item.poster_path}" alt="${safeTitle}" loading="lazy">
                <div class="card-details">
                    <div class="card-title">${title}</div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = htmlParts.join("");
}

// ============================================================
// TRENDING / CATEGORY
// ============================================================
function loadTrending(onDone) {
    renderHome();
    currentCategory = "trending";
    const url = `${BASE_URL}/trending/all/day?language=${tmdbLang()}`;
    document.getElementById("section-title").innerText = t("section_trending");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    const trendingBtn = document.getElementById("nav-trending");
    if (trendingBtn) trendingBtn.classList.add("active");
    document.getElementById("hero-banner").style.display = "flex";
    document.body.classList.remove("no-hero");
    fetchData(url, (data) => {
        if (data && data.results && data.results.length > 0) {
            renderTrendingCarousel(data.results);
            const firstItem = data.results[0];
            const type = firstItem.media_type || (firstItem.first_air_date ? "tv" : "movie");
            updateHeroSpotlight(firstItem.id, type, firstItem);
        }
        if (typeof onDone === "function") onDone();
    });
}

function renderHome() {
    stopDetailTrailer();
    document.getElementById("detailView").style.display = "none";
    document.getElementById("playerView").style.display = "none";
    document.querySelector(".media-container").style.display = "block";
    document.getElementById("hero-banner").style.display = currentCategory === "trending" ? "flex" : "none";
    document.body.classList.toggle("no-hero", currentCategory !== "trending");
    updateSEO(null, null, BASE_PATH);
    requestAnimationFrame(() => {
        window.scrollTo({ top: homeScrollY, behavior: "auto" });
    });
}

function changeCategory(type) {
    const buttons = document.querySelectorAll(".nav-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    let clickedBtn = null;
    if (type === 'trending') clickedBtn = document.getElementById('nav-trending');
    else if (type === 'movie') clickedBtn = document.getElementById('nav-movies');
    else if (type === 'tv') clickedBtn = document.getElementById('nav-tv');
    if (clickedBtn) clickedBtn.classList.add('active');
    
    stopDetailTrailer();
    document.getElementById("detailView").style.display = "none";
    document.getElementById("playerView").style.display = "none";
    document.querySelector(".media-container").style.display = "block";
    history.replaceState({}, "", BASE_PATH);
    currentCategory = type;
    window.scrollTo({ top: 0, behavior: "smooth" });
    homeScrollY = 0;
    const heroBanner = document.getElementById("hero-banner");
    
    if (type === "movie") {
        document.getElementById("section-title").innerText = t("section_movies");
        heroBanner.style.display = "none";
        document.body.classList.add("no-hero");
        updateSEO(null, null, BASE_PATH);
        fetchManyPages(`${BASE_URL}/discover/movie?sort_by=popularity.desc&language=${tmdbLang()}`, CATALOG_PAGES,
            (firstPage) => renderGrid(firstPage, MAX_CATALOG_ITEMS, false),
            (allResults) => renderGrid(allResults, MAX_CATALOG_ITEMS, false)
        );
    } else if (type === "tv") {
        document.getElementById("section-title").innerText = t("section_tv");
        heroBanner.style.display = "none";
        document.body.classList.add("no-hero");
        updateSEO(null, null, BASE_PATH);
        const tvUrl = `${BASE_URL}/discover/tv?sort_by=popularity.desc&language=${tmdbLang()}&include_null_first_air_dates=false&with_original_language=en|ja|ko|zh|hi|tl`;
        fetchManyPages(tvUrl, CATALOG_PAGES,
            (firstPage) => renderGrid(firstPage, MAX_CATALOG_ITEMS, false),
            (allResults) => renderGrid(allResults, MAX_CATALOG_ITEMS, false)
        );
    } else {
        heroBanner.style.display = "flex";
        document.body.classList.remove("no-hero");
        document.getElementById("section-title").innerText = t("section_trending");
        updateSEO(null, null, BASE_PATH);
        fetchData(`${BASE_URL}/trending/all/day?language=${tmdbLang()}`, (data) => {
            if (data && data.results) {
                renderTrendingCarousel(data.results);
                const firstItem = data.results[0];
                if (firstItem) {
                    const type2 = firstItem.media_type || (firstItem.first_air_date ? "tv" : "movie");
                    updateHeroSpotlight(firstItem.id, type2, firstItem);
                }
            }
        });
    }
}

// ============================================================
// HERO SPOTLIGHT
// ============================================================
function updateHeroSpotlight(id, type, previewItem) {
    if (previewItem) {
        const previewTitle = previewItem.title || previewItem.name;
        if (previewTitle) document.getElementById("banner-title").innerText = previewTitle;
        document.getElementById("banner-tag").innerText = type.toUpperCase();
        if (previewItem.backdrop_path) {
            document.getElementById("hero-banner").style.backgroundImage = `linear-gradient(to top, #0c0c0c 10%, rgba(12,12,12,0.4) 50%, rgba(12,12,12,0.8) 100%), url('${BACKDROP_URL + previewItem.backdrop_path}')`;
        }
    }
    const detailsUrl = `${BASE_URL}/${type}/${id}?append_to_response=credits,videos&language=${tmdbLang()}`;
    fetchData(detailsUrl, (data) => {
        if (!data) return;
        const title = data.title || data.name;
        document.getElementById("banner-title").innerText = title;
        document.getElementById("banner-tag").innerText = type.toUpperCase();
        if (data.backdrop_path) {
            document.getElementById("hero-banner").style.backgroundImage = `linear-gradient(to top, #0c0c0c 10%, rgba(12,12,12,0.4) 50%, rgba(12,12,12,0.8) 100%), url('${BACKDROP_URL + data.backdrop_path}')`;
        }
        if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
            const actors = data.credits.cast.slice(0, 3).map(a => a.name).join(", ");
            document.getElementById("banner-cast").innerText = actors;
        } else {
            document.getElementById("banner-cast").innerText = t("unknown_cast");
        }
        if (data.overview) {
            document.getElementById("banner-desc").innerText = data.overview;
        } else {
            document.getElementById("banner-desc").innerText = t("no_overview");
        }
        currentSelectedShow.id = data.id.toString();
        currentSelectedShow.type = type;
        resolveTrailerKey(data, type, data.id, (key) => {
            currentSelectedShow.youtubeKey = key;
        });
    });
}

function resolveTrailerKey(data, type, id, callback) {
    function findTrailerKey(videosObj) {
        if (!videosObj || !videosObj.results) return "";
        const list = videosObj.results;
        const pick = list.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
                     list.find(v => v.site === "YouTube" && v.type === "Trailer") ||
                     list.find(v => v.site === "YouTube" && v.type === "Teaser") ||
                     list.find(v => v.site === "YouTube");
        return pick ? pick.key : "";
    }
    const found = findTrailerKey(data.videos);
    if (found) return callback(found);
    fetchData(`${BASE_URL}/${type}/${id}/videos?include_video_language=en,${data.original_language || "en"},null`, (allVideos) => {
        callback(findTrailerKey(allVideos));
    });
}

// ============================================================
// SEO
// ============================================================
function setMeta(attr, key, value) {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", value);
}

function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }
    link.setAttribute("href", url);
}

function updateSEO(data, type, path) {
    const canonicalUrl = SITE_URL + path;
    let title, description, image, ogType;
    if (data) {
        const name = data.title || data.name;
        const year = (data.release_date || data.first_air_date || "").slice(0, 4);
        title = `${name}${year ? " (" + year + ")" : ""} Trailer | ${SITE_NAME}`;
        description = (data.overview ? data.overview.slice(0, 155) : `Panoorin ang official trailer ng ${name} sa ${SITE_NAME}.`);
        image = data.backdrop_path ? (BACKDROP_URL + data.backdrop_path) : (data.poster_path ? (IMG_URL + data.poster_path) : (SITE_URL + BASE_PATH + "og-default.jpg"));
        ogType = "video.other";
    } else {
        title = `${SITE_NAME} — Official Movie, TV & Anime Trailers`;
        description = DEFAULT_DESCRIPTION;
        image = SITE_URL + BASE_PATH + "og-default.jpg";
        ogType = "website";
    }
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", ogType);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setCanonical(canonicalUrl);
}

// ============================================================
// DETAIL VIEW
// ============================================================
function openDetail(id, type, opts = {}) {
    const { pushHistory = true } = opts;
    if (pushHistory) {
        homeScrollY = window.scrollY;
    }
    stopDetailTrailer();
    document.querySelector(".media-container").style.display = "none";
    document.getElementById("hero-banner").style.display = "none";
    document.getElementById("playerView").style.display = "none";
    document.getElementById("detailView").style.display = "block";
    window.scrollTo({ top: 0, behavior: "auto" });
    const detailsUrl = `${BASE_URL}/${type}/${id}?append_to_response=credits,videos&language=${tmdbLang()}`;
    fetchData(detailsUrl, (data) => {
        if (!data) return;
        renderDetailView(data, type);
        const title = data.title || data.name;
        const year = (data.release_date || data.first_air_date || "").slice(0, 4);
        const path = buildDetailPath(id, type, title, year);
        if (pushHistory) {
            history.pushState({ id: id.toString(), type }, "", path);
        }
        updateSEO(data, type, path);
    });
}

function buildDetailPath(id, type, title, year) {
    const kind = type === "tv" ? "tv" : "movie";
    const base = slugify(title);
    const slug = year ? `${base}-${year}` : base;
    return `${BASE_PATH}${kind}/${slug}-${id}`;
}

function slugify(text) {
    return (text || "")
        .toString()
        .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "title";
}

function closeDetail() {
    history.back();
}

function renderDetailView(data, type) {
    const title = data.title || data.name;
    const posterEl = document.getElementById("detailPoster");
    posterEl.src = data.poster_path ? (IMG_URL + data.poster_path) : "";
    posterEl.alt = title;
    document.getElementById("detailType").innerText = type.toUpperCase();
    document.getElementById("detailTitle").innerText = title;
    document.getElementById("detailRating").innerText = `⭐ ${(data.vote_average || 0).toFixed(1)}`;
    const runtimeMin = data.runtime || (data.episode_run_time && data.episode_run_time[0]) || 0;
    const hours = Math.floor(runtimeMin / 60);
    const mins = runtimeMin % 60;
    document.getElementById("detailRuntime").innerText = runtimeMin ? `${hours}h ${mins}m` : "";
    document.getElementById("detailRelease").innerText = data.release_date || data.first_air_date || "";
    document.getElementById("detailOverview").innerText = data.overview || t("no_overview");
    const genresHtml = (data.genres || []).map(g => `<span class="detail-genre-pill">${g.name}</span>`).join("");
    document.getElementById("detailGenres").innerHTML = genresHtml;
    const director = data.credits && data.credits.crew ? data.credits.crew.find(c => c.job === "Director") : null;
    const directorEl = document.getElementById("detailDirector");
    if (director) {
        directorEl.innerHTML = `<strong>${t("director_label")}</strong> ${director.name}`;
        directorEl.style.display = "block";
    } else {
        directorEl.style.display = "none";
    }
    renderCastCarousel(data.credits ? data.credits.cast : []);
    currentSelectedShow.id = data.id.toString();
    currentSelectedShow.type = type;
    resolveTrailerKey(data, type, data.id, (key) => {
        currentSelectedShow.youtubeKey = key;
        renderDetailTrailer(key, title);
    });
    loadRecommendations(data, type);
}

function renderCastCarousel(cast) {
    const list = document.getElementById("detailCast");
    if (!cast || cast.length === 0) {
        list.innerHTML = `<p class="empty-note">${t("unknown_cast")}</p>`;
        return;
    }
    const items = cast.slice(0, 15).map(actor => {
        const photo = actor.profile_path ? (IMG_URL + actor.profile_path) : "";
        const safeName = (actor.name || "").replace(/"/g, "&quot;");
        return `
            <div class="cast-card">
                ${photo ? `<img src="${photo}" alt="${safeName}" loading="lazy">` : `<div class="cast-avatar-fallback">👤</div>`}
                <div class="cast-name">${actor.name || ""}</div>
                <div class="cast-role">${actor.character || ""}</div>
            </div>
        `;
    }).join("");
    list.innerHTML = items;
}

function renderDetailTrailer(key, title) {
    const wrapper = document.getElementById("detailTrailerWrapper");
    if (key) {
        wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${key}" title="${t("trailer_label")}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        return;
    }
    wrapper.innerHTML = `<p class="empty-note">${t("no_trailer")}</p>`;
}

function stopDetailTrailer() {
    const wrapper = document.getElementById("detailTrailerWrapper");
    if (wrapper) {
        const iframes = wrapper.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            iframe.src = '';
            iframe.remove();
        });
        wrapper.innerHTML = `<p class="empty-note">No trailer available.</p>`;
    }
}

function loadRecommendations(data, type) {
    const genreIds = (data.genres || []).map(g => g.id);
    const grid = document.getElementById('recommendedGrid');
    
    if (genreIds.length === 0) {
        const fallbackUrl = `${BASE_URL}/discover/${type}?sort_by=popularity.desc&language=${tmdbLang()}&page=1`;
        fetchData(fallbackUrl, (result) => {
            if (result && result.results) {
                const filtered = result.results.filter(item => item.id !== data.id && item.poster_path);
                renderRecommendations(filtered.slice(0, 20));
            }
        });
        return;
    }

    const genreParam = genreIds.slice(0, 3).join(',');
    const url = `${BASE_URL}/discover/${type}?with_genres=${genreParam}&sort_by=popularity.desc&language=${tmdbLang()}&page=1`;

    fetchData(url, (result) => {
        if (result && result.results) {
            const filtered = result.results.filter(item => item.id !== data.id && item.poster_path);
            renderRecommendations(filtered.slice(0, 24));
        }
    });
}

function renderRecommendations(items) {
    const grid = document.getElementById('recommendedGrid');
    const section = document.getElementById('recommendedSection');
    if (section) section.style.display = 'block';

    if (!items || items.length === 0) {
        grid.innerHTML = `<p class="empty-note" style="padding:10px 0; color: var(--text-muted);">No recommendations available.</p>`;
        return;
    }

    const htmlParts = items.map(item => {
        const title = item.title || item.name;
        const safeTitle = title ? title.replace(/"/g, "&quot;") : "";
        const itemType = item.media_type || (item.first_air_date ? "tv" : "movie");
        return `
            <div class="rec-card" onclick="openDetail('${item.id}', '${itemType}')">
                <img src="${IMG_URL + item.poster_path}" alt="${safeTitle}" loading="lazy">
                <div class="rec-details">
                    <div class="rec-title">${title}</div>
                </div>
            </div>
        `;
    }).join('');
    grid.innerHTML = htmlParts;
}

// ============================================================
// SEARCH
// ============================================================
let searchDebounceTimer = null;

function handleSearch(event) {
    const query = document.getElementById("search-input").value.trim();
    if (event.key === "Enter") {
        closeSuggestions();
        triggerSearch();
        return;
    }
    clearTimeout(searchDebounceTimer);
    if (!query) {
        closeSuggestions();
        return;
    }
    searchDebounceTimer = setTimeout(() => {
        fetchSuggestions(query);
    }, 350);
}

function fetchSuggestions(query) {
    const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=${tmdbLang()}`;
    fetchData(url, (data) => {
        const results = (data && data.results) ? data.results.filter(r => (r.title || r.name) && (r.media_type === "movie" || r.media_type === "tv")) : [];
        renderSuggestions(results.slice(0, 8));
    });
}

function renderSuggestions(results) {
    const list = document.getElementById("search-suggestions");
    list.innerHTML = "";
    if (results.length === 0) {
        list.innerHTML = `<li class="sugg-empty">${t("no_results")}</li>`;
        list.classList.add("open");
        return;
    }
    results.forEach(item => {
        const title = item.title || item.name;
        const type = item.media_type;
        const year = (item.release_date || item.first_air_date || "").slice(0, 4);
        const poster = item.poster_path ? (IMG_URL + item.poster_path) : "";
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="sugg-link" onclick="selectSuggestion('${item.id}', '${type}', '${title.replace(/'/g, "\\'")}')">
                ${poster ? `<img src="${poster}" alt="${title}">` : `<div class="sugg-info" style="width:36px;height:52px;"></div>`}
                <div class="sugg-info">
                    <span class="sugg-title">${title}</span>
                    <span class="sugg-meta">${type === "tv" ? "TV Show" : "Movie"}${year ? " • " + year : ""}</span>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
    list.classList.add("open");
}

function selectSuggestion(id, type, title) {
    document.getElementById("search-input").value = title;
    closeSuggestions();
    const wrapper = document.getElementById("searchBoxWrapper");
    if (wrapper) wrapper.classList.remove("open");
    document.getElementById("search-input").value = "";
    openDetail(id, type);
}

function closeSuggestions() {
    const list = document.getElementById("search-suggestions");
    list.classList.remove("open");
    list.innerHTML = "";
}

function toggleSearchBox() {
    const wrapper = document.getElementById("searchBoxWrapper");
    const btn = document.getElementById("search-toggle-btn");
    const isOpen = wrapper.classList.toggle("open");
    if (isOpen) {
        const rect = btn.getBoundingClientRect();
        const wrapperWidth = wrapper.offsetWidth;
        const wrapperHeight = wrapper.offsetHeight;
        let left = rect.right + 10;
        if (left + wrapperWidth > window.innerWidth - 10) {
            left = rect.left - wrapperWidth - 10;
        }
        if (left < 10) left = 10;
        let top = rect.top + (rect.height / 2) - (wrapperHeight / 2);
        const maxTop = window.innerHeight - wrapperHeight - 10;
        if (top > maxTop) top = Math.max(10, maxTop);
        if (top < 10) top = 10;
        wrapper.style.top = top + "px";
        wrapper.style.left = left + "px";
        document.getElementById("search-input").focus();
    } else {
        document.getElementById("search-input").value = "";
        closeSuggestions();
    }
}

document.addEventListener("click", function(event) {
    const iconWrapper = document.querySelector(".search-icon-wrapper");
    if (iconWrapper && !iconWrapper.contains(event.target)) {
        closeSuggestions();
        const wrapper = document.getElementById("searchBoxWrapper");
        if (wrapper) wrapper.classList.remove("open");
    }
});

window.triggerSearch = function() {
    const query = document.getElementById("search-input").value.trim();
    if (!query) return;
    closeSuggestions();
    const wrapper = document.getElementById("searchBoxWrapper");
    if (wrapper) wrapper.classList.remove("open");
    stopDetailTrailer();
    document.getElementById("detailView").style.display = "none";
    document.getElementById("playerView").style.display = "none";
    document.querySelector(".media-container").style.display = "block";
    document.getElementById("hero-banner").style.display = "none";
    document.body.classList.add("no-hero");
    history.replaceState({}, "", BASE_PATH);
    updateSEO(null, null, BASE_PATH);
    currentCategory = "search";
    lastSearchQuery = query;
    const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=${tmdbLang()}`;
    document.getElementById("section-title").innerText = `${t("results_for")}: "${query}"`;
    fetchData(url, (data) => {
        if (data && data.results) {
            renderGrid(data.results, data.results.length, false);
        }
    });
};

// ============================================================
// PLAYER VIEW
// ============================================================
function openPlayerView(id, type) {
    stopDetailTrailer();
    
    if (window.episodeTimerInterval) {
        clearInterval(window.episodeTimerInterval);
        window.episodeTimerInterval = null;
    }

    if (!id || !type) {
        if (currentSelectedShow && currentSelectedShow.id && currentSelectedShow.type) {
            id = currentSelectedShow.id;
            type = currentSelectedShow.type;
        } else {
            alert("⚠️ No title selected. Please click on a specific movie or TV show first.");
            return;
        }
    }

    const detailVisible = document.getElementById("detailView").style.display !== "none";
    previousView = detailVisible ? 'detail' : 'home';
    previousScrollY = window.scrollY;

    document.querySelector(".media-container").style.display = "none";
    document.getElementById("hero-banner").style.display = "none";
    document.getElementById("detailView").style.display = "none";
    document.getElementById("playerView").style.display = "block";
    window.scrollTo({ top: 0, behavior: "auto" });

    const overlay = document.getElementById('failoverOverlay');
    overlay.style.display = 'none';
    overlay.className = '';
    overlay.innerHTML = '';

    document.getElementById("playerTrailerWrapper").innerHTML = `<p class="empty-note">Loading stream...</p>`;
    document.getElementById("playerEpisodeGrid").innerHTML = "";
    document.getElementById("playerEpisodeSection").style.display = "none";
    document.getElementById("playerMovieMessage").style.display = "none";
    document.getElementById("playerEpisodeInfo").style.display = "none";

    const detailsUrl = `${BASE_URL}/${type}/${id}?append_to_response=videos&language=${tmdbLang()}`;
    fetchData(detailsUrl, (data) => {
        if (!data) {
            document.getElementById("playerTrailerWrapper").innerHTML = `<p class="empty-note">Error loading data.</p>`;
            return;
        }
        const title = data.title || data.name;
        const release = data.release_date || data.first_air_date || "";
        document.getElementById("playerTitle").textContent = title;
        document.getElementById("playerRelease").innerHTML = `Released: <span>${release || 'Unknown'}</span>`;

        currentPlayerItem = {
            id: data.id,
            type: type,
            title: title,
            data: data,
            totalEpisodes: type === 'tv' ? (data.number_of_episodes || 0) : 0,
            trailerKey: null,
            releaseDate: release
        };

        const isMovie = type === 'movie';
        let season = 0;
        let episode = 1;
        
        if (type === 'tv' && data.seasons && data.seasons.length > 0) {
            const lastSeason = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0).pop();
            if (lastSeason) {
                season = lastSeason.season_number;
                episode = 1;
            }
        }
        
        initiateStreamingWithFailover(data.id, isMovie, season, episode);

        if (type === 'tv') {
            startEpisodeTimer(title, currentPlayerItem.totalEpisodes);
        }

        if (type === 'tv') {
            const total = currentPlayerItem.totalEpisodes;
            if (total > 0) {
                renderPlayerEpisodes(total);
                document.getElementById("playerEpisodeSection").style.display = "block";
                document.getElementById("playerMovieMessage").style.display = "none";
            } else {
                document.getElementById("playerEpisodeSection").style.display = "none";
                document.getElementById("playerMovieMessage").style.display = "block";
                document.getElementById("playerMovieMessage").querySelector('p').textContent = 
                    "No episode information available for this series.";
            }
        } else {
            document.getElementById("playerEpisodeSection").style.display = "none";
            document.getElementById("playerMovieMessage").style.display = "block";
            document.getElementById("playerMovieMessage").querySelector('p').textContent = 
                "This is a movie — no episode list available.";
        }

        setupPlayerActions(title);
    });
}

function setupPlayerActions(title) {
    const favBtn = document.getElementById("playerFavBtn");
    const shareBtn = document.getElementById("playerShareBtn");
    const downloadBtn = document.getElementById("playerDownloadBtn");
    const reportBtn = document.getElementById("playerReportBtn");

    favBtn.onclick = function() {
        const icon = this.querySelector('i');
        icon.classList.toggle('fas');
        icon.classList.toggle('far');
        this.textContent = icon.classList.contains('fas') ? ' Favorite' : ' Favorite';
        this.prepend(icon);
    };

    shareBtn.onclick = function() {
        if (navigator.share) {
            navigator.share({ title: title, text: `Watch ${title} on FLIXER!`, url: window.location.href })
                .catch(() => {});
        } else {
            navigator.clipboard?.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!');
            }).catch(() => {
                prompt('Copy this link:', window.location.href);
            });
        }
    };

    downloadBtn.onclick = function() {
        alert('Download feature coming soon!');
    };

    reportBtn.onclick = function() {
        alert('Report content? Please contact support.');
    };
}

function closePlayerView() {
    if (window.episodeTimerInterval) {
        clearInterval(window.episodeTimerInterval);
        window.episodeTimerInterval = null;
    }
    
    const overlay = document.getElementById('failoverOverlay');
    overlay.style.display = 'none';
    overlay.className = '';
    overlay.innerHTML = '';
    
    stopAllVideos();
    document.getElementById("playerView").style.display = "none";

    if (previousView === 'detail') {
        document.getElementById("detailView").style.display = "block";
        const detailId = currentSelectedShow.id;
        const detailType = currentSelectedShow.type;
        if (detailId && detailType) {
            const title = currentPlayerItem?.title || '';
            const year = currentPlayerItem?.releaseDate ? currentPlayerItem.releaseDate.slice(0, 4) : '';
            const path = buildDetailPath(detailId, detailType, title, year);
            history.replaceState({ id: detailId, type: detailType }, "", path);
        }
        window.scrollTo({ top: previousScrollY, behavior: "auto" });
    } else {
        renderHome();
        history.replaceState({}, "", BASE_PATH);
    }
}

function stopAllVideos() {
    const playerWrapper = document.getElementById("playerTrailerWrapper");
    if (playerWrapper) {
        const iframes = playerWrapper.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            iframe.src = '';
            iframe.remove();
        });
        playerWrapper.innerHTML = `<p class="empty-note">Loading trailer...</p>`;
    }
    stopDetailTrailer();
}

function startEpisodeTimer(showTitle, currentEpisode) {
    const infoDiv = document.getElementById('playerEpisodeInfo');
    const updateText = document.getElementById('episodeUpdateText');
    const timerEl = document.getElementById('episodeTimer');
    
    infoDiv.style.display = 'block';
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const nextEpisode = currentEpisode + 1;
    updateText.textContent = `📺 Next Episode ${nextEpisode} — Updates every ${dayNames[new Date().getDay()]}`;
    
    function updateTimer() {
        const now = new Date();
        const target = new Date(now);
        target.setDate(now.getDate() + 7);
        target.setHours(0, 0, 0, 0);
        
        const diff = target - now;
        if (diff <= 0) {
            timerEl.textContent = '🔄 Updating now!';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        timerEl.textContent = `⏱️ Next episode in ${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    
    updateTimer();
    if (window.episodeTimerInterval) clearInterval(window.episodeTimerInterval);
    window.episodeTimerInterval = setInterval(updateTimer, 1000);
}

// ============================================================
// STREAMING
// ============================================================
async function loadFromUltraAPI(id, isMovie, season, episode) {
    const type = isMovie ? 'movie' : 'tv';
    const apiUrl = `${API_BASE_URL}/api/stream/${type}/${id}?season=${season || ''}&episode=${episode || ''}`;
    
    const wrapper = document.getElementById('playerTrailerWrapper');
    const overlay = document.getElementById('failoverOverlay');
    
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.className = 'show';
        overlay.innerHTML = `
            <div class="failover-spinner"></div>
            <div class="failover-icon">🎬</div>
            <div class="failover-title">LOADING STREAM...</div>
            <div class="failover-status">Please wait...</div>
        `;
    }
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log('📡 API Response:', data);
        
        if (data.success && data.data.streams && data.data.streams.length > 0) {
            const stream = data.data.streams[0];
            console.log('✅ Using:', stream.provider, stream.url);
            
            if (overlay) {
                overlay.style.display = 'none';
                overlay.className = '';
                overlay.innerHTML = '';
            }
            
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.innerHTML = `
                    <iframe 
                        src="${stream.url}" 
                        style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; background:#000;"
                        allowfullscreen
                        allow="autoplay; encrypted-media; fullscreen"
                        loading="eager"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                        referrerpolicy="no-referrer"
                    ></iframe>
                `;
            }
            
            return true;
        } else {
            if (overlay) {
                overlay.innerHTML = `
                    <div style="color:#ffd700; font-size:18px; text-align:center; padding:20px;">
                        😢 No stream found
                        <br><br>
                        <button onclick="closePlayerView()" style="padding:10px 30px; background:#ff0000; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Go Back</button>
                    </div>
                `;
            }
            return false;
        }
    } catch (error) {
        console.error('❌ Error:', error);
        if (overlay) {
            overlay.innerHTML = `
                <div style="color:#ff4444; font-size:18px; text-align:center; padding:20px;">
                    ⚠️ Connection Error
                    <br><br>
                    <button onclick="closePlayerView()" style="padding:10px 30px; background:#ff0000; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Go Back</button>
                </div>
            `;
        }
        return false;
    }
}

async function initiateStreamingWithFailover(tmdbId, isMovie, season, episode) {
    const apiSuccess = await loadFromUltraAPI(tmdbId, isMovie, season, episode);
    if (apiSuccess) return;
    
    console.log('🔄 FALLBACK: Direct embed...');
    
    const overlay = document.getElementById('failoverOverlay');
    const wrapper = document.getElementById('playerTrailerWrapper');
    const mediaType = isMovie ? 'movie' : 'tv';
    
    const reliableEmbeds = [
        `https://vidsrc.pro/embed/${mediaType}/${tmdbId}`,
        `https://vidsrc.me/embed/${mediaType}/${tmdbId}`,
        `https://vidsrc.cc/v2/embed/${mediaType}/${tmdbId}`,
        `https://vidlink.pro/embed/${mediaType}/${tmdbId}`,
        `https://2embed.cc/embed${mediaType}/${tmdbId}`,
        `https://embed.su/embed/${mediaType}/${tmdbId}`,
        `https://autoembed.to/embed/${mediaType}/${tmdbId}`,
        `https://superembed.stream/embed/${mediaType}/${tmdbId}?s=${season || ''}&e=${episode || ''}`
    ];
    
    for (let i = 0; i < reliableEmbeds.length; i++) {
        const embedUrl = reliableEmbeds[i];
        
        if (overlay) {
            overlay.innerHTML = `
                <div class="failover-spinner"></div>
                <div class="failover-icon">🔄</div>
                <div class="failover-title">TRYING SERVER ${i+1}/${reliableEmbeds.length}</div>
                <div class="failover-status">Loading stream...</div>
            `;
        }
        
        try {
            await fetch(embedUrl, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(3000) });
            
            if (overlay) {
                overlay.style.display = 'none';
                overlay.className = '';
                overlay.innerHTML = '';
            }
            
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.innerHTML = `
                    <iframe 
                        src="${embedUrl}" 
                        title="Stream Player" 
                        frameborder="0"
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
                        allowfullscreen
                        loading="lazy"
                        style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; background:#000;"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                        referrerpolicy="no-referrer"
                        importance="high"
                    ></iframe>
                `;
            }
            
            console.log(`✅ Fallback success: ${embedUrl}`);
            return;
        } catch (e) {
            console.log(`❌ ${embedUrl} failed`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (overlay) {
        overlay.innerHTML = `
            <div style="font-size:48px; margin-bottom:16px;">😢</div>
            <div style="color:#ff4444; font-weight:700; font-size:20px;">NO STREAM AVAILABLE</div>
            <div style="font-size:14px; color:#888; margin-top:12px; max-width:500px;">
                We tried all providers but couldn't find a working stream.
                <br><br>
                Try another movie or TV show.
            </div>
            <button onclick="closePlayerView()" style="margin-top:20px; padding:10px 30px; background:#ff0000; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;">
                Go Back
            </button>
        `;
    }
}

// ============================================================
// EPISODE RENDER
// ============================================================
function renderPlayerEpisodes(total) {
    const grid = document.getElementById("playerEpisodeGrid");
    const totalSpan = document.getElementById("playerEpTotal");
    
    totalSpan.textContent = total;
    totalEpisodesCount = total;

    const seasons = currentPlayerItem?.data?.seasons || [];
    const validSeasons = seasons.filter(s => s.season_number > 0 && s.episode_count > 0);

    if (validSeasons.length > 0) {
        renderSeasonCards(grid, validSeasons);
        return;
    }

    if (currentSeasonNumber > 0) {
        renderPaginationView(grid, total);
    } else {
        renderPaginationView(grid, total);
    }
}

function renderPaginationView(grid, total) {
    const isMobile = window.innerWidth <= 700;
    let perPage = isMobile ? 40 : EPISODES_PER_PAGE;

    const totalPages = Math.ceil(total / perPage);
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, total);

    grid.innerHTML = '';

    if (currentSeasonNumber > 0) {
        const backDiv = document.createElement('div');
        backDiv.className = 'ep-item back-to-season-btn';
        backDiv.innerHTML = `← Back to Seasons`;
        backDiv.onclick = function() {
            currentSeasonNumber = 0;
            currentPage = 1;
            const seasons = currentPlayerItem?.data?.seasons?.filter(s => s.season_number > 0 && s.episode_count > 0) || [];
            renderSeasonCards(grid, seasons);
        };
        grid.appendChild(backDiv);
    }

    renderIndividualEpisodes(grid, start, end);    

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'pagination-controls';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹ Previous';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = function() {
        if (currentPage > 1) {
            currentPage--;
            renderPaginationView(grid, total);
        }
    };
    controlsDiv.appendChild(prevBtn);

    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    controlsDiv.appendChild(pageIndicator);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next ›';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPaginationView(grid, total);
        }
    };
    controlsDiv.appendChild(nextBtn);

    grid.appendChild(controlsDiv);
}

function renderSeasonCards(grid, seasons) {
    grid.classList.add('season-view');
    grid.innerHTML = '';

    if (currentSeasonNumber > 0) {
        const backDiv = document.createElement('div');
        backDiv.className = 'ep-item back-to-season-btn';
        backDiv.innerHTML = `← Back to Seasons`;
        backDiv.onclick = function() {
            currentSeasonNumber = 0;
            currentPage = 1;
            renderSeasonCards(grid, seasons);
        };
        grid.appendChild(backDiv);

        const selectedSeason = seasons.find(s => s.season_number === currentSeasonNumber);
        if (selectedSeason) {
            let total = selectedSeason.episode_count;
            if (total > 40) {
                renderPaginationView(grid, total);
            } else {
                renderIndividualEpisodes(grid, 1, total);
            }
        }
        return;
    }

    seasons.forEach(season => {
        const div = document.createElement('div');
        div.className = 'ep-item season-card';
        div.innerHTML = `
            <span class="season-number">Season ${season.season_number}</span>
            <span class="season-count">${season.episode_count} eps</span>
        `;
        div.onclick = function() {
            currentSeasonNumber = season.season_number;
            currentPage = 1;
            renderSeasonCards(grid, seasons);
        };
        grid.appendChild(div);
    });
}

function renderIndividualEpisodes(grid, start, end) {
    for (let i = start; i <= end; i++) {
        const div = document.createElement('div');
        div.className = 'ep-item';
        const link = document.createElement('a');
        link.href = `#episode-${i}`;
        link.dataset.ep = i;
        link.innerHTML = `
            <span class="ep-num">${i}</span>
            <span class="ep-label">EP</span>
        `;
        div.appendChild(link);
        grid.appendChild(div);
    }
}

// ============================================================
// DOWNLOAD
// ============================================================
const PLATFORM_DATA = [
    { id: "android",   icon: "📱", label: "Android",    date: "20260831" },
    { id: "windows",   icon: "🖥️", label: "Windows",    date: "20260930" },
    { id: "androidtv", icon: "📺", label: "Android TV", date: "20261031" },
    { id: "ios",       icon: "🍏", label: "iOS",        date: "20261130" },
    { id: "linux",     icon: "🐧", label: "Linux",      date: "20261231" },
    { id: "macos",     icon: "💻", label: "macOS",      date: "20270228" }
];

function buildDownloadCards() {
    const list = document.getElementById("download-list");
    if (!list) return;
    list.innerHTML = PLATFORM_DATA.map(p => `
        <div class="download-card">
            <div class="download-card-header">
                <div class="download-card-title">
                    <span class="download-app-icon">${p.icon}</span>
                    <span>${p.label}</span>
                </div>
                <span class="download-badge">${t("download_badge")}</span>
            </div>
            <p class="download-card-desc">${t("download_text")}</p>
            <button class="btn-notify" onclick="notifyMe('${p.id}')">
                <span class="notify-icon">🔔</span> <span>${t("notify_me")}</span>
            </button>
            <a class="notify-fallback" id="fallback-${p.id}"></a>
        </div>
    `).join("");
}

function showDownload() {
    closeSidePanel();
    buildDownloadCards();
    document.getElementById("downloadModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeDownload() {
    document.getElementById("downloadModal").style.display = "none";
    document.body.style.overflow = "";
}

function pad2(n) { return n < 10 ? "0" + n : "" + n; }

function icsNextDay(yyyymmdd) {
    const y = +yyyymmdd.slice(0, 4), m = +yyyymmdd.slice(4, 6), d = +yyyymmdd.slice(6, 8);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.getUTCFullYear() + pad2(dt.getUTCMonth() + 1) + pad2(dt.getUTCDate());
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function buildIcsFile(appName, date, endDate) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const uid = "allflix-" + date + "-" + Math.random().toString(36).slice(2) + "@allflix";
    const details = `${appName} launches today.`;
    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AllFLix//Coming Soon//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        "UID:" + uid,
        "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + date,
        "DTEND;VALUE=DATE:" + endDate,
        "SUMMARY:" + appName + " launches!",
        "DESCRIPTION:" + details,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");
}

function notifyMe(platformId) {
    const platform = PLATFORM_DATA.find(p => p.id === platformId);
    if (!platform) return;
    const btn = document.getElementById(`btn-notify-${platformId}`);
    const appName = platform.label;
    const endDate = icsNextDay(platform.date);
    const icsContent = buildIcsFile(appName, platform.date, endDate);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const fileName = appName.replace(/\s+/g, "-").toLowerCase() + ".ics";
    if (isMobileDevice()) {
        window.location.href = blobUrl;
        const fallback = document.getElementById(`fallback-${platformId}`);
        if (fallback) {
            fallback.href = blobUrl;
            fallback.download = fileName;
            fallback.style.display = "none";
            clearTimeout(fallback._showTimer);
            fallback._showTimer = setTimeout(() => {
                fallback.textContent = "Didn't open? Tap to download instead";
                fallback.style.display = "block";
            }, 1800);
        }
    } else {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="notify-icon">✅</span> <span>${t("notify_me_done")}</span>`;
    }
}

// ============================================================
// ABOUT US
// ============================================================
const aboutUsData = [
    { type: "h2", text: "Welcome to Flixer" },
    { type: "p", text: "Welcome to Flixer, your ultimate destination for discovering the world of entertainment through trailers, teasers, promotional videos, and the latest previews from across the globe." },
    { type: "p", text: "At Flixer, we are dedicated to collecting and showcasing a wide range of official trailers that allow fans to stay informed about upcoming releases while rediscovering beloved classics." },
    { type: "h2", text: "Our Story" },
    { type: "p", text: "The idea behind Flixer was born from a simple observation: entertainment fans often have to visit multiple websites and platforms just to keep up with the latest trailers. We envisioned a single destination where everyone could discover the latest trailers regardless of where they originated." },
    { type: "h2", text: "Our Mission" },
    { type: "p", text: "Our mission is to become one of the world's most trusted destinations for discovering official entertainment trailers, making entertainment discovery simple, organized, and enjoyable for everyone." },
    { type: "h2", text: "What You'll Find on Our Website" },
    { type: "p", label: "Movies", text: "Official trailers for Hollywood blockbusters, independent films, and international cinema." },
    { type: "p", label: "Korean Dramas (K-Dramas)", text: "The newest Korean dramas across every genre." },
    { type: "p", label: "Anime", text: "TV anime, films, and original animations across every genre." },
    { type: "h2", text: "Thank You" },
    { type: "p", text: "One Website. Thousands of Stories. Endless Entertainment." }
];

function renderAboutUs() {
    const container = document.getElementById("about-body-content");
    let html = "";
    aboutUsData.forEach((item) => {
        if (item.type === "h2") {
            html += `<h2>${item.text}</h2>`;
        } else {
            const body = item.label ? `<strong>${item.label}</strong> — ${item.text}` : item.text;
            html += `<p>${body}</p>`;
        }
    });
    container.innerHTML = html;
}

function showAboutUs() {
    closeSidePanel();
    renderAboutUs();
    document.getElementById("aboutModal").style.display = "block";
}

function closeAboutUs() {
    document.getElementById("aboutModal").style.display = "none";
}

// ============================================================
// ADD TO LIST
// ============================================================
function addToList() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.9);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        z-index: 99999;
        font-size: 14px;
        font-weight: 500;
        animation: slideUp 0.3s ease;
    `;
    toast.innerHTML = '❤️ Added to your list!';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============================================================
// REFRESH CONTENT (Language Change)
// ============================================================
function refreshContent() {
    const lang = tmdbLang();
    if (currentCategory === "movie") {
        fetchManyPages(`${BASE_URL}/discover/movie?sort_by=popularity.desc&language=${lang}`, CATALOG_PAGES,
            (firstPage) => renderGrid(firstPage, MAX_CATALOG_ITEMS, false),
            (allResults) => renderGrid(allResults, MAX_CATALOG_ITEMS, false)
        );
    } else if (currentCategory === "tv") {
        fetchManyPages(`${BASE_URL}/discover/tv?sort_by=popularity.desc&language=${lang}`, CATALOG_PAGES,
            (firstPage) => renderGrid(firstPage, MAX_CATALOG_ITEMS, false),
            (allResults) => renderGrid(allResults, MAX_CATALOG_ITEMS, false)
        );
    } else if (currentCategory === "search" && lastSearchQuery) {
        const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(lastSearchQuery)}&language=${lang}`;
        fetchData(url, (data) => {
            if (data && data.results) renderGrid(data.results, data.results.length, false);
        });
    } else {
        fetchData(`${BASE_URL}/trending/all/day?language=${lang}`, (data) => {
            if (data && data.results) {
                renderTrendingCarousel(data.results);
                const firstItem = data.results[0];
                if (firstItem) {
                    const type = firstItem.media_type || (firstItem.first_air_date ? "tv" : "movie");
                    updateHeroSpotlight(firstItem.id, type, firstItem);
                }
            }
        });
    }
    const detailOpen = document.getElementById("detailView").style.display !== "none";
    if (detailOpen && currentSelectedShow.id && currentSelectedShow.type) {
        openDetail(currentSelectedShow.id, currentSelectedShow.type, { pushHistory: false });
    }
}

function applyLanguage() {
    document.getElementById("nav-trending").innerText = t("nav_trending");
    document.getElementById("nav-movies").innerText = t("nav_movies");
    document.getElementById("nav-tv").innerText = t("nav_tv");
    document.getElementById("label-recommended").innerText = t("label_recommended");
    document.getElementById("search-input").placeholder = t("search_placeholder");
    const brand = t("brand");
    document.getElementById("label-home").innerText = t("home");
    document.getElementById("label-language").innerText = t("language");
    document.getElementById("label-mode").innerText = t("mode");
    document.getElementById("label-download").innerText = t("download");
    document.getElementById("label-aboutus").innerText = t("about_us");
    document.getElementById("label-select-language").innerText = t("select_language");
    document.getElementById("lang-note").innerText = t("lang_note");
    document.getElementById("label-detail-back").innerText = t("back");
    document.getElementById("label-detail-cast").innerText = t("top_cast");
    document.getElementById("label-detail-trailer").innerText = t("trailer_label");
    document.getElementById("label-player-back").innerText = t("back");
    document.getElementById("label-watchnow-detail").innerText = t("watch_now");
    const sectionTitle = document.getElementById("section-title");
    if (currentCategory === "movie") sectionTitle.innerText = t("section_movies");
    else if (currentCategory === "tv") sectionTitle.innerText = t("section_tv");
    else if (currentCategory === "trending") sectionTitle.innerText = t("section_trending");
}

// ============================================================
// WINDOW EVENTS & INIT
// ============================================================
let lastKnownWindowWidth = window.innerWidth;
window.addEventListener("resize", () => {
    if (window.innerWidth === lastKnownWindowWidth) return;
    lastKnownWindowWidth = window.innerWidth;
    const wrapper = document.getElementById("searchBoxWrapper");
    if (wrapper && wrapper.classList.contains("open")) {
        wrapper.classList.remove("open");
    }
});

window.addEventListener("popstate", function(event) {
    const state = event.state;
    if (state && state.id) {
        openDetail(state.id, state.type, { pushHistory: false });
    } else {
        renderHome();
    }
});

document.addEventListener("DOMContentLoaded", function() {
    applyModeOnLoad();
    renderLanguageList();
    syncLanguageUI();
    applyLanguage();
    
    const session = getSession();
    if (session) {
        showApp(session.username);
    } else {
        hideApp();
    }
    
    // Login handlers
    document.getElementById('loginBtn').addEventListener('click', function() {
        const username = document.getElementById('loginUsername').value.trim();
        const passcode = document.getElementById('loginPasscode').value.trim();
        if (!username || !passcode) {
            document.getElementById('loginError').style.display = 'flex';
            document.getElementById('loginError').querySelector('span').textContent = 
                !username ? 'Please enter your username.' : 'Please enter your passcode.';
            return;
        }
        handleLogin(username, passcode);
    });
    
    document.getElementById('loginPasscode').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
    document.getElementById('loginUsername').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('loginPasscode').focus();
    });
    
    document.getElementById('togglePassword').addEventListener('click', function() {
        const input = document.getElementById('loginPasscode');
        const icon = this.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    // Initial load
    const initialPath = location.pathname;
    const detail = parseDetailPath(initialPath);
    loadTrending(() => {
        history.replaceState({}, "", BASE_PATH);
        if (detail) {
            history.pushState({ id: detail.id, type: detail.type }, "", initialPath);
            openDetail(detail.id, detail.type, { pushHistory: false });
        } else {
            updateSEO(null, null, BASE_PATH);
        }
    });
});

function parseDetailPath(pathname) {
    let p = pathname;
    if (p.indexOf(BASE_PATH) === 0) {
        p = p.slice(BASE_PATH.length - 1);
    }
    const match = p.match(/^\/(movie|tv)\/[a-z0-9-]*?-(\d+)\/?$/i);
    if (!match) return null;
    return { type: match[1].toLowerCase(), id: match[2] };
}

console.log('🎬 FLIXER loaded successfully!');
console.log('📺 Login with admin/1234');
