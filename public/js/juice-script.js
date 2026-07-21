/* ============ LEADERBOARD CONFIG & DATA ============ */
const USE_FILLERS = true;
const RANK_COUNT = 10;

// index 0 = rank #1, index 1 = rank #2, etc.
const MANUAL_PRIZES = [
  500, // #1
  250, // #2
  125, // #3
  75,  // #4
  50,  // #5
  0,   // #6
  0,   // #7
  0,   // #8
  0,   // #9
  0,   // #10
];

// Fixed reset date/time for this leaderboard period.
// Set this to the real reset moment — it will NOT move or reset when someone visits/refreshes.
const COUNTDOWN_END = new Date('2026-07-29T00:00:00Z'); // TODO: set the real end date/time (UTC)

const CASINO = {
  name: 'Juice',
  color: '#38bdf8',
  letter: 'J',
  logo: 'juice.png',
  desc: "is a CS2 skins casino. Play cases and games with code",
  players: [],
  prevPeriod: 'Last Reset — June 2026',
  previousWinners: [
    { name: 'Qu*******', wagered: 210300.50, prize: 3000 },
    { name: 'ha****', wagered: 88900.20, prize: 1750 },
    { name: 'Ve**********', wagered: 61200.75, prize: 1000 },
    { name: 'ta*****', wagered: 42100.40, prize: 700 },
    { name: 'sn****', wagered: 33200.60, prize: 500 },
    { name: 'ry***', wagered: 24100.15, prize: 350 },
    { name: 'ok**', wagered: 15400.90, prize: 200 },
    { name: 'mv*', wagered: 12100.30, prize: 150 },
    { name: 'fj*****', wagered: 9800.20, prize: 100 },
    { name: 'zx**', wagered: 6100.75, prize: 75 },
  ],
};

const usd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdWhole = (n) => '$' + Number(n).toLocaleString('en-US');

/* ---- FETCH LIVE JUICE DATA ---- */
function maskName(name) {
  if (!name) return "****";
  return name.slice(0, 3) + "****";
}

async function fetchJuiceData() {
  try {
    const response = await fetch("https://store.jonji.bet/cache/juice_leaderboard.json");
    const data = await response.json();

    let rawParticipants = [];
    if (data.data && data.data.length > 0 && data.data[0].participants) {
      rawParticipants = data.data[0].participants;
    }

    let leaderboard = rawParticipants.map((p) => ({
      name: p.username,
      avatar: p.avatar,
      wagered: p.adjusted_play_amount || p.play_amount_without_rules || 0,
      isFiller: false,
    }));

    leaderboard.sort((a, b) => b.wagered - a.wagered);
    leaderboard = leaderboard.slice(0, RANK_COUNT);

    if (USE_FILLERS) {
      while (leaderboard.length < RANK_COUNT) {
        leaderboard.push({
          name: "_****",
          avatar: null,
          wagered: 0,
          isFiller: true,
        });
      }
    }

    leaderboard = leaderboard.map((user, index) => ({
      ...user,
      name: user.isFiller ? "_****" : maskName(user.name),
      prize: MANUAL_PRIZES[index] || 0,
    }));

    CASINO.players = leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
  } finally {
    render();
  }
}

/* ---- RENDER PODIUM + LIST + META ---- */
function getAvatarHtml(avatarUrl, defaultIconClass) {
  if (avatarUrl && avatarUrl !== "/assets/csgo/avatar-anonymous.png") {
    return `<img src="${avatarUrl}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  }
  return `<i data-lucide="user-round" class="${defaultIconClass}"></i>`;
}

function render() {
  const c = CASINO;

  // Podium: order visually as #2, #1, #3
  const top3 = c.players.slice(0, 3);
  const podium = document.getElementById('podium');

  if (top3.length === 3) {
    const order = [
      { p: top3[1], rank: 2, cls: 'rank2' },
      { p: top3[0], rank: 1, cls: 'rank1' },
      { p: top3[2], rank: 3, cls: 'rank3' },
    ];
    podium.innerHTML = order.map(({ p, rank, cls }) => `
      <div class="podium-card ${cls}">
        ${rank === 1 ? '<i data-lucide="crown" class="crown icon-lg"></i>' : ''}
        <div class="rank-chip">
          ${getAvatarHtml(p.avatar, rank === 1 ? 'icon-xl' : 'icon-lg')}
          <span class="rank-hex">${rank}</span>
        </div>
        <p class="podium-name ${rank === 1 ? 'text-base' : 'text-sm'}">${p.name}</p>
        <p class="podium-label">Wagered</p>
        <p class="podium-wager">${usd(p.wagered)}</p>
        <div class="prize-bar"><i data-lucide="trophy" class="icon-sm"></i>${usdWhole(p.prize)}</div>
      </div>
    `).join('');
  }

  // Participants list (rank 4+)
  const list = document.getElementById('participants');
  list.innerHTML = c.players.slice(3).map((p, i) => `
    <div class="row">
      <span class="row-rank">#${i + 4}</span>
      <span class="row-avatar">${getAvatarHtml(p.avatar, 'icon-sm')}</span>
      <span class="row-name">${p.name}</span>
      <span class="row-wager stat-box">${usd(p.wagered)}</span>
      <span class="row-prize stat-box">${usdWhole(p.prize)}</span>
    </div>
  `).join('');

  // Previous winners modal
  document.getElementById('prevModalList').innerHTML = (c.previousWinners || []).map((p, i) => {
    const topCls = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    return `
    <div class="prev-item ${topCls}">
      <span class="prev-avatar"><i data-lucide="user-round" class="icon-sm"></i></span>
      <span class="prev-rank-num">#${i + 1}</span>
      <span class="row-name">${p.name}</span>
      <span class="row-wager prev-wager">${usd(p.wagered)}</span>
      <span class="row-prize">${usdWhole(p.prize)}</span>
    </div>
  `;
  }).join('');

  lucide.createIcons();
}

/* ---- COUNTDOWN (fixed — does not reset on visit) ---- */
function tick() {
  let diff = Math.max(0, COUNTDOWN_END.getTime() - Date.now());
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000); diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  const pad = (n) => String(n).padStart(2, '0');

  if (document.getElementById('cdDays')) {
    document.getElementById('cdDays').textContent = pad(d);
    document.getElementById('cdHours').textContent = pad(h);
    document.getElementById('cdMins').textContent = pad(m);
    document.getElementById('cdSecs').textContent = pad(s);
  }
}

tick();
setInterval(tick, 1000);

/* ---- INITIALIZE ---- */
fetchJuiceData();


/* ---- UI INTERACTIONS ---- */
const nav = document.getElementById('nav');
const onScroll = () => {
  if (!nav) return;
  const inner = nav.querySelector('.header-inner');
  if (window.scrollY > 12) inner.classList.add('shadow-2xl');
  else inner.classList.remove('shadow-2xl');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const toast = document.getElementById('toast');
let toastTimer;
function showToast() {
  if (!toast) return;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const label = btn.querySelector('.copy-label');
  const original = label ? label.textContent : '';
  const code = btn.getAttribute('data-copy') || 'JONJI';
  navigator.clipboard && navigator.clipboard.writeText(code).catch(() => {});
  showToast();
  if (label) { label.textContent = 'Copied!'; setTimeout(() => { label.textContent = original; }, 1500); }
});

const prevOverlay = document.getElementById('prevModalOverlay');
const openPrevBtn = document.getElementById('openPrevWinners');
const closePrevBtn = document.getElementById('closePrevModal');

function openPrevModal() {
  if (prevOverlay) {
    prevOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}
function closePrevModal() {
  if (prevOverlay) {
    prevOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }
}

if (openPrevBtn) openPrevBtn.addEventListener('click', openPrevModal);
if (closePrevBtn) closePrevBtn.addEventListener('click', closePrevModal);
if (prevOverlay) prevOverlay.addEventListener('click', (e) => { if (e.target === prevOverlay) closePrevModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePrevModal(); });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(el); });

(function initParticles() {
  const container = document.getElementById('particle-container');
  if (!container) return;
  function sizeContainer() { container.style.height = document.body.scrollHeight + 'px'; }
  sizeContainer();
  window.addEventListener('resize', sizeContainer);
  window.addEventListener('load', sizeContainer);
  setTimeout(sizeContainer, 1200);
  const colors = ['#ef3e3e', '#ff6b6b', '#38bdf8'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 2.6 + 1;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.className = 'particle';
    p.style.width = `${size}px`; p.style.height = `${size}px`;
    p.style.background = color;
    p.style.boxShadow = `0 0 8px 1.5px ${color}66`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.opacity = String(Math.random() * 0.35 + 0.15);
    container.appendChild(p);
    p.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0 },
      { opacity: Number(p.style.opacity), offset: 0.15 },
      { transform: `translate(${(Math.random() - 0.5) * 120}px, -${Math.random() * 260 + 100}px) scale(0)`, opacity: 0 }
    ], { duration: Math.random() * 8000 + 6000, delay: Math.random() * 5000, iterations: Infinity });
  }
})();


/* ---- KICK AUTHENTICATION ---- */
const loginBtn = document.getElementById('kick-login-btn');
const userMenu = document.getElementById('user-menu');
const navAvatar = document.getElementById('nav-avatar');
const navUsername = document.getElementById('nav-username');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/.netlify/functions/kick-login');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error initiating Kick login:", err);
    }
  });
}

async function checkAuth() {
  try {
    const res = await fetch('/.netlify/functions/get-user');
    if (res.ok) {
      const user = await res.json();
      if (user && user.username) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (navUsername) navUsername.textContent = user.username;
        if (user.avatar && navAvatar) {
          navAvatar.src = user.avatar;
        }
      }
    }
  } catch (err) {
    console.error("Error checking auth status:", err);
  }
}

checkAuth();


/* ---- MOBILE MENU TOGGLE ---- */
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinksDropdown = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinksDropdown) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinksDropdown.classList.toggle('show');
  });
}


/* ---- USER DROPDOWN & LOGOUT ---- */
const userDropdown = document.getElementById('user-dropdown');
const logoutBtn = document.getElementById('logout-btn');

if (userMenu && userDropdown) {
  userMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    document.cookie = 'kick_session=; Path=/; Max-Age=0';
    document.cookie = 'kick_session=; Path=/; Domain=.jonji.bet; Max-Age=0';
    window.location.href = '/';
  });
}