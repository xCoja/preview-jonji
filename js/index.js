lucide.createIcons();

// --- Navbar shadow on scroll ---
const navBar = document.getElementById('site-header-bar');
const onScroll = () => {
  if (window.scrollY > 12) navBar.classList.add('site-header__bar--scrolled');
  else navBar.classList.remove('site-header__bar--scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Mobile hamburger menu ---
const menuBtn = document.getElementById('site-header-menu-btn');
const headerNav = document.getElementById('site-header-nav');
if (menuBtn && headerNav) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = headerNav.classList.toggle('site-header__nav--show');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });
  headerNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      headerNav.classList.remove('site-header__nav--show');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', (e) => {
    if (!headerNav.contains(e.target) && !menuBtn.contains(e.target)) {
      headerNav.classList.remove('site-header__nav--show');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// --- Copy code buttons + toast ---
const toast = document.getElementById('toast');
let toastTimer;
function showToast() {
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 1800);
}
document.querySelectorAll('.copy-btn').forEach((btn) => {
  const label = btn.querySelector('.copy-label');
  const original = label ? label.textContent : '';
  btn.addEventListener('click', () => {
    const code = btn.getAttribute('data-copy') || 'JONJI';
    navigator.clipboard && navigator.clipboard.writeText(code).catch(() => {});
    showToast();
    if (label) {
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = original; }, 1500);
    }
  });
});

// --- Reveal on scroll ---
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 60 + 'ms';
  io.observe(el);
});

// --- Ambient particles across the whole page (quiet, brand-colored, no lines) ---
(function initParticles() {
  const container = document.getElementById('particle-container');
  if (!container) return;

  function sizeContainer() {
    container.style.height = document.body.scrollHeight + 'px';
  }
  sizeContainer();
  window.addEventListener('resize', sizeContainer);
  window.addEventListener('load', sizeContainer);
  setTimeout(sizeContainer, 1200);

  const colors = ['#ef3e3e', '#ff6b6b', '#e9b949'];
  const count = 70;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 2.6 + 1;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.className = 'particle';
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
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

// --- Live on Kick status check ---
(function checkKickLive() {
  const KICK_USER = 'jonjiponji';
  const card = document.getElementById('kick-card');
  const avatar = document.getElementById('kick-avatar');
  const badge = document.getElementById('kick-badge');
  const offlineScreen = document.getElementById('kick-offline-screen');
  const mount = document.getElementById('kick-player-mount');
  const sub = document.getElementById('kick-sub');
  const cta = document.getElementById('kick-cta');
  const communityBadge = document.getElementById('community-kick-badge');
  if (!card) return;

  function setLive(streamTitle, viewers) {
    card.classList.add('is-live');
    avatar.classList.add('pulsing');
    badge.className = 'kick-badge live';
    badge.innerHTML = '<span class="status-dot"></span>Live';
    offlineScreen.style.display = 'none';
    if (communityBadge) communityBadge.classList.add('is-live');

    const iframe = document.createElement('iframe');
    iframe.src = `https://player.kick.com/${KICK_USER}?autoplay=true&muted=true`;
    iframe.allowFullscreen = true;
    iframe.setAttribute('scrolling', 'no');
    mount.appendChild(iframe);

    sub.textContent = (streamTitle ? streamTitle + ' — ' : '') + (viewers != null ? viewers.toLocaleString() + ' watching' : 'Streaming now');
    cta.href = 'https://kick.com/' + KICK_USER;
    cta.className = 'btn kick-btn-live btn--md';
    cta.innerHTML = '<i data-lucide="maximize-2"></i> Open full player';
    lucide.createIcons();
  }

  function setOffline() {
    card.classList.remove('is-live');
    avatar.classList.remove('pulsing');
    badge.className = 'kick-badge offline';
    badge.innerHTML = '<span class="status-dot"></span>Offline';
    offlineScreen.style.display = 'flex';
    mount.innerHTML = '';
    if (communityBadge) communityBadge.classList.remove('is-live');

    sub.textContent = 'Not streaming right now — follow to catch the next one.';
    cta.href = 'https://kick.com/' + KICK_USER;
    cta.className = 'btn btn-ghost btn--md';
    cta.innerHTML = '<i data-lucide="bell"></i> Follow on Kick';
    lucide.createIcons();
  }

  fetch(`https://kick.com/api/v2/channels/${KICK_USER}`, { headers: { 'Accept': 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error('bad response'); return r.json(); })
    .then((data) => {
      if (data && data.livestream) {
        setLive(data.livestream.session_title, data.livestream.viewer_count);
      } else {
        setOffline();
      }
    })
    .catch(() => setOffline());
})();