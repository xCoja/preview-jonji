// ─── CONFIG ──────────────────────────────────────────────────────────────
const LB_CONFIG = {
  apiUrl: "https://jonji-api.vercel.app/api/leaderboard/clashgg",
  // Fallback only — the API already returns a "prize" per player for ranks 1-10,
  // which is used automatically when present. This array is just a backup.
  prizes: [725, 425, 225, 100, 50, 10, 10, 10, 10, 10],
  totalSlots: 10,
  fallbackAvatar: "images/thrill-pfp.png", // used only when a user has no avatar at all
  useFixedAvatar: false, // Clash: use each user's real avatar from the API
  anonymousAvatarPaths: ["/assets/csgo/avatar-anonymous.png", "/assets/anonymous.webp"],
  metricLabel: "Wagered",
  // Countdown target — set this to your reset date/time (ISO, UTC).
  countdownEndUTC: "2026-07-27T19:00:00Z",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatXP(xp) {
  return Math.floor(Number(xp) || 0).toLocaleString("en-US");
}

function resolveAvatar(user) {
  if (LB_CONFIG.useFixedAvatar) return LB_CONFIG.fallbackAvatar;
  if (!user.avatar || LB_CONFIG.anonymousAvatarPaths.includes(user.avatar)) {
    return LB_CONFIG.fallbackAvatar;
  }
  return user.avatar;
}

function resolvePrize(user, rank) {
  if (user.apiPrize !== undefined && user.apiPrize !== null) return user.apiPrize;
  return LB_CONFIG.prizes[rank - 1] ?? 0;
}

function normalizeUsers(rawResponse) {
  // clashgg returns { players: [...], totalPlayers, lastUpdated }
  let rawList = rawResponse;
  if (!Array.isArray(rawList) && rawList && typeof rawList === "object") {
    rawList = rawList.players || rawList.data || rawList.leaderboard || rawList.users || [];
  }

  return (Array.isArray(rawList) ? rawList : [])
    .map((u) => ({
      username: u.name || u.username ? String(u.name || u.username) : "****",
      xp: parseFloat(u.wagered ?? u.xp ?? u.amount) || 0,
      avatar: u.avatar || u.avatar_url || u.image || LB_CONFIG.fallbackAvatar,
      // API already computes the payout per rank for the top 10 — use it when present.
      apiPrize: u.prize !== undefined && u.prize !== null ? Number(u.prize) : null,
      isFiller: false,
    }))
    .sort((a, b) => b.xp - a.xp);
}

function padToSlots(users, count) {
  return Array.from({ length: count }, (_, i) =>
    users[i] || {
      username: "_****",
      xp: 0,
      avatar: LB_CONFIG.fallbackAvatar,
      apiPrize: null,
      isFiller: true,
    }
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────
// Shows shimmering placeholder cards/rows immediately (before the fetch even
// starts) so the page never looks empty during the ~1-2s API round trip.
function injectSkeletonStyles() {
  if (document.getElementById("lb-skeleton-styles")) return;
  const style = document.createElement("style");
  style.id = "lb-skeleton-styles";
  style.textContent = `
    @keyframes lbShimmer {
      0%   { background-position: -420px 0; }
      100% { background-position: 420px 0; }
    }
    .lb-skel {
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.05) 63%);
      background-size: 800px 100%;
      animation: lbShimmer 1.4s ease-in-out infinite;
      border-radius: 6px;
      display: block;
    }
    .podium-card.lb-skel-card,
    .row.lb-skel-card {
      pointer-events: none;
    }
    .lb-skel-avatar { border-radius: 999px; }
    .lb-skel-fade-in {
      animation: lbFadeIn 0.35s ease-out;
    }
    @keyframes lbFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function podiumSkeletonHTML(rank) {
  const rankClass = `rank${rank}`;
  return `
    <div class="podium-card ${rankClass} lb-skel-card">
      <div class="rank-chip">
        <span class="lb-skel lb-skel-avatar" style="width:100%;height:100%;"></span>
      </div>
      <span class="lb-skel" style="width:70%;height:14px;margin:14px auto 0;"></span>
      <span class="lb-skel" style="width:45%;height:9px;margin:10px auto 0;"></span>
      <span class="lb-skel" style="width:55%;height:20px;margin:6px auto 0;"></span>
      <span class="lb-skel" style="width:70%;height:32px;margin:14px auto 0;border-radius:8px;"></span>
    </div>
  `;
}

function participantSkeletonRowHTML() {
  return `
    <div class="row lb-skel-card">
      <span class="lb-skel" style="width:20px;height:14px;"></span>
      <span class="row-avatar"><span class="lb-skel lb-skel-avatar" style="width:100%;height:100%;"></span></span>
      <span class="lb-skel" style="width:60%;height:14px;"></span>
      <span class="lb-skel" style="width:100%;height:32px;border-radius:8px;"></span>
      <span class="lb-skel" style="width:100%;height:32px;border-radius:8px;"></span>
    </div>
  `;
}

function renderPodiumSkeleton() {
  const podiumEl = document.getElementById("podium");
  if (!podiumEl) return;
  podiumEl.innerHTML = [2, 1, 3].map(podiumSkeletonHTML).join("");
}

function renderParticipantsSkeleton() {
  const listEl = document.getElementById("participants");
  if (!listEl) return;
  listEl.innerHTML = Array.from({ length: 7 }, participantSkeletonRowHTML).join("");
}

// ─── RENDER: PODIUM (top 3) ─────────────────────────────────────────────
function podiumCardHTML(user, rank) {
  const rankClass = `rank${rank}`;
  const nameSizeClass = rank === 1 ? "text-base" : "text-sm";
  const avatar = resolveAvatar(user);
  const name = escapeHtml(user.username);

  return `
    <div class="podium-card ${rankClass}${user.isFiller ? " is-filler" : ""}">
      ${rank === 1 ? '<i data-lucide="crown" class="crown icon-lg"></i>' : ""}
      <div class="rank-chip">
        <img src="${avatar}" alt="${name} avatar" width="100%" height="100%" style="border-radius:999px;object-fit:cover;">
        <span class="rank-hex">${rank}</span>
      </div>
      <div class="podium-name ${nameSizeClass}">${name}</div>
      <div class="podium-label">${LB_CONFIG.metricLabel}</div>
      <div class="podium-wager">${formatXP(user.xp)}</div>
      <div class="prize-bar">
        <i data-lucide="trophy" class="icon-sm"></i>
        $${resolvePrize(user, rank)}
      </div>
    </div>
  `;
}

function renderPodium(leaderboard) {
  const podiumEl = document.getElementById("podium");
  if (!podiumEl) return;

  // Visual order on the podium is 2nd, 1st, 3rd
  const order = [
    { user: leaderboard[1], rank: 2 },
    { user: leaderboard[0], rank: 1 },
    { user: leaderboard[2], rank: 3 },
  ];

  podiumEl.innerHTML = order
    .map(({ user, rank }) => podiumCardHTML(user, rank))
    .join("");

  podiumEl.querySelectorAll(".podium-card").forEach((el) => el.classList.add("lb-skel-fade-in"));
}

// ─── RENDER: PARTICIPANTS (ranks 4-10) ──────────────────────────────────
function participantRowHTML(user, rank) {
  const avatar = resolveAvatar(user);
  const name = escapeHtml(user.username);

  return `
    <div class="row${user.isFiller ? " is-filler" : ""}">
      <span class="row-rank">#${rank}</span>
      <span class="row-avatar">
        <img src="${avatar}" alt="${name} avatar" width="100%" height="100%" style="border-radius:999px;object-fit:cover;">
      </span>
      <span class="row-name">${name}</span>
      <span class="row-wager stat-box">${formatXP(user.xp)}</span>
      <span class="row-prize stat-box">$${resolvePrize(user, rank)}</span>
    </div>
  `;
}

function renderParticipants(leaderboard) {
  const listEl = document.getElementById("participants");
  if (!listEl) return;

  listEl.innerHTML = leaderboard
    .slice(3)
    .map((user, i) => participantRowHTML(user, i + 4))
    .join("");

  listEl.querySelectorAll(".row").forEach((el) => el.classList.add("lb-skel-fade-in"));
}

// ─── FETCH + RENDER ──────────────────────────────────────────────────────
async function loadLeaderboard() {
  injectSkeletonStyles();
  renderPodiumSkeleton();
  renderParticipantsSkeleton();

  try {
    const res = await fetch(LB_CONFIG.apiUrl);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

    const data = await res.json();
    const users = normalizeUsers(data);
    const leaderboard = padToSlots(users, LB_CONFIG.totalSlots);

    renderPodium(leaderboard);
    renderParticipants(leaderboard);

    // Re-init Lucide icons for the newly injected markup
    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (err) {
    console.error("Leaderboard load failed:", err);
  }
}

// ─── COUNTDOWN ───────────────────────────────────────────────────────────
function startCountdown() {
  const daysEl = document.getElementById("cdDays");
  const hoursEl = document.getElementById("cdHours");
  const minsEl = document.getElementById("cdMins");
  const secsEl = document.getElementById("cdSecs");
  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  const endTime = new Date(LB_CONFIG.countdownEndUTC).getTime();

  function tick() {
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      [daysEl, hoursEl, minsEl, secsEl].forEach((el) => (el.textContent = "00"));
      return;
    }

    const pad = (n) => String(n).padStart(2, "0");
    const day = Math.floor(remaining / 86400000);
    const hr = Math.floor((remaining % 86400000) / 3600000);
    const min = Math.floor((remaining % 3600000) / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);

    daysEl.textContent = pad(day);
    hoursEl.textContent = pad(hr);
    minsEl.textContent = pad(min);
    secsEl.textContent = pad(sec);

    setTimeout(tick, 1000);
  }

  tick();
}

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────
// Anything with class "reveal" starts at opacity:0 (see styles.css) and only
// becomes visible once it gets the "in" class. Without this, sections like
// .participants-section, .countdown-wrapper, .casino-desc, etc. never appear.
function initRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;

  if (!("IntersectionObserver" in window)) {
    // Fallback: just show everything immediately.
    revealEls.forEach((el) => el.classList.add("in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
}

// ─── MISC UI WIRING (mobile menu, user dropdown, prev-winners modal) ─────
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const nav = document.querySelector(".nav-links");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => nav.classList.toggle("show"));
}

function initUserDropdown() {
  const menu = document.getElementById("user-menu");
  const dropdown = document.getElementById("user-dropdown");
  if (!menu || !dropdown) return;
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });
  document.addEventListener("click", () => dropdown.classList.remove("show"));
}

function initPrevWinnersModal() {
  const openBtn = document.getElementById("openPrevWinners");
  const closeBtn = document.getElementById("closePrevModal");
  const overlay = document.getElementById("prevModalOverlay");
  if (!openBtn || !closeBtn || !overlay) return;

  openBtn.addEventListener("click", () => overlay.classList.add("show"));
  closeBtn.addEventListener("click", () => overlay.classList.remove("show"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  });
}

// ─── INIT ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  startCountdown();
  initRevealAnimations();
  initMobileMenu();
  initUserDropdown();
  initPrevWinnersModal();
});