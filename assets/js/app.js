/**
 * TalentAI — Site UI
 */
window.TalentAI = {
  selectedField: null,
  activeProfile: null,
  candidates: [],
  user: null,

  isLoggedIn() {
    try {
      return !!JSON.parse(localStorage.getItem('talentai_user') || 'null');
    } catch { return false; }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('talentai_user') || 'null');
    } catch { return null; }
  },

  onCandidatesLoaded(list) {
    this.candidates = list;
    this.renderDashboard(list);
    this.renderResults(list);
    this.setDefaultProfile(list);
    this.buildSearchIndex();
    this.updateDynamicStats(list);
    InterviewApp?.loadCandidates?.(list);
  },

  onCandidateSelected(candidate) {
    this.activeProfile = candidate;
    this.renderProfile(candidate);
    this.updateProfileDrawer();
  },

  onFeedbackRendered(feedback) {
    sessionStorage.setItem('lastFeedback', JSON.stringify(feedback));
  }
};

/* Hero carousel — fictional alumni (NOT interview candidates) */
const PLACEMENTS = [
  {
    name: 'Priya Sharma', role: 'Staff ML Engineer', company: 'Google', companyClass: 'google',
    salary: '₹48 LPA', bg: 'linear-gradient(135deg,#dbeafe,#e0e7ff)',
    headline: 'Priya Sharma joins <em>Google</em> DeepMind',
    text: 'Completed our AI cohort with top RAG scores. TalentAI interview predicted 94% ML fit — she cleared Google\'s L5 loop in a single onsite.',
    tags: ['ML Systems', 'Top 1% Cohort']
  },
  {
    name: 'Rahul Mehta', role: 'SDE-2', company: 'Amazon', companyClass: 'amazon',
    salary: '₹41 LPA', bg: 'linear-gradient(135deg,#ffedd5,#fef3c7)',
    headline: 'Rahul Mehta lands <em>Amazon</em> AWS',
    text: 'Backend track graduate with distributed systems focus. Adaptive interview surfaced MCP & API design strengths matching Amazon\'s bar-raiser panel.',
    tags: ['Distributed Systems', 'AWS Track']
  },
  {
    name: 'Ananya Reddy', role: 'Senior AI Engineer', company: 'Microsoft', companyClass: 'microsoft',
    salary: '₹46 LPA', bg: 'linear-gradient(135deg,#d1fae5,#ecfdf5)',
    headline: 'Ananya Reddy → <em>Microsoft</em> Copilot',
    text: 'Full-stack AI builder with LangChain & Azure expertise. Interview agent validated agentic workflow skills — offer within 72 hours of final round.',
    tags: ['Copilot Team', 'Agentic AI']
  },
  {
    name: 'Vikram Patel', role: 'Product Manager, AI', company: 'Meta', companyClass: 'meta',
    salary: '₹39 LPA', bg: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
    headline: 'Vikram Patel pivots to <em>Meta</em> AI PM',
    text: 'Career switcher from finance. Curriculum-aware interviews tested prompt engineering & product sense — Meta extended PM offer for GenAI team.',
    tags: ['Career Pivot', 'GenAI PM']
  },
  {
    name: 'Neha Gupta', role: 'Data Scientist', company: 'Netflix', companyClass: 'netflix',
    salary: '₹44 LPA', bg: 'linear-gradient(135deg,#fee2e2,#fecaca)',
    headline: 'Neha Gupta joins <em>Netflix</em> Personalization',
    text: 'Aced the system design round focusing on real-time recommendations. Our Mock Interview Simulator perfectly predicted her interview flow.',
    tags: ['RecSys', 'Data Track']
  },
  {
    name: 'Karan Singh', role: 'Senior Frontend Engineer', company: 'Apple', companyClass: 'apple',
    salary: '₹42 LPA', bg: 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
    headline: 'Karan Singh lands <em>Apple</em> UI Team',
    text: 'Specialized in micro-animations and WebGL. The ATS Grader helped him bypass screening, and he cleared Apple\'s rigorous UI architecture rounds.',
    tags: ['UI Architect', 'Frontend Track']
  }
];

const FIELDS = [
  { id: 'ai-ml', icon: '🤖', title: 'AI & Machine Learning', desc: 'LLMs, RAG, embeddings, fine-tuning, and agentic workflows.', color: '#2563eb', bg: '#dbeafe', count: '120+ questions' },
  { id: 'backend', icon: '⚙️', title: 'Backend Engineering', desc: 'APIs, microservices, streaming, MCP integration, and system design.', color: '#7c3aed', bg: '#ede9fe', count: '95+ questions' },
  { id: 'data', icon: '📊', title: 'Data Engineering', desc: 'Vector DBs, pipelines, retrieval engines, and observability.', color: '#059669', bg: '#d1fae5', count: '80+ questions' },
  { id: 'fullstack', icon: '💻', title: 'Full Stack Development', desc: 'React, FastAPI, chatbot backends, and deployment patterns.', color: '#d97706', bg: '#fef3c7', count: '110+ questions' },
  { id: 'devops', icon: '☁️', title: 'DevOps & Cloud', desc: 'Docker, Kubernetes, CI/CD, monitoring, and production ops.', color: '#0891b2', bg: '#cffafe', count: '70+ questions' },
  { id: 'prompt', icon: '✨', title: 'Prompt Engineering', desc: 'Chain-of-thought, function calling, structured outputs, and evals.', color: '#db2777', bg: '#fce7f3', count: '85+ questions' }
];

const SKILLS = [
  { id: 'python', label: 'Python', roles: { 'AI Engineer': 3, 'Backend Engineer': 2, 'Data Engineer': 2 } },
  { id: 'llm', label: 'LLMs & RAG', roles: { 'AI Engineer': 4, 'ML Engineer': 3, 'Prompt Engineer': 3 } },
  { id: 'api', label: 'API Design', roles: { 'Backend Engineer': 4, 'Full Stack Dev': 3, 'AI Engineer': 1 } },
  { id: 'docker', label: 'Docker/K8s', roles: { 'DevOps Engineer': 4, 'Backend Engineer': 2, 'Data Engineer': 1 } },
  { id: 'sql', label: 'SQL & Data', roles: { 'Data Engineer': 4, 'Backend Engineer': 2, 'Business Analyst': 3 } },
  { id: 'react', label: 'React/Frontend', roles: { 'Full Stack Dev': 4, 'Frontend Engineer': 4, 'UI Engineer': 3 } },
  { id: 'agents', label: 'AI Agents', roles: { 'AI Engineer': 4, 'ML Engineer': 2, 'Prompt Engineer': 2 } },
  { id: 'system', label: 'System Design', roles: { 'Backend Engineer': 3, 'Staff Engineer': 4, 'DevOps Engineer': 2 } }
];

const ROLE_META = {
  'AI Engineer': { color: '#2563eb', icon: '🤖', salary: '₹28–55 LPA' },
  'Backend Engineer': { color: '#7c3aed', icon: '⚙️', salary: '₹22–45 LPA' },
  'Data Engineer': { color: '#059669', icon: '📊', salary: '₹20–42 LPA' },
  'Full Stack Dev': { color: '#d97706', icon: '💻', salary: '₹18–38 LPA' },
  'DevOps Engineer': { color: '#0891b2', icon: '☁️', salary: '₹24–48 LPA' },
  'ML Engineer': { color: '#4f46e5', icon: '🧠', salary: '₹30–60 LPA' },
  'Prompt Engineer': { color: '#db2777', icon: '✨', salary: '₹18–35 LPA' },
  'Staff Engineer': { color: '#0f172a', icon: '🏗️', salary: '₹45–80 LPA' },
  'Frontend Engineer': { color: '#ea580c', icon: '🎨', salary: '₹16–32 LPA' },
  'Business Analyst': { color: '#64748b', icon: '📈', salary: '₹14–28 LPA' },
  'UI Engineer': { color: '#ec4899', icon: '✏️', salary: '₹15–30 LPA' }
};

/* Fallback when API unavailable (file:// or server down) */
const FALLBACK_CANDIDATES = [
  { member: { id: 'CAND-002', name: 'Alex Turner', jobRole: 'Backend Software Engineer', yearsExperience: 5, education: 'B.Tech CS', status: 'COMPLETED' }, signals: { commitDays: 22, missionsCompleted: 29, missionsFirstTry: 10 }, missions: [{ day: 7, title: 'Embeddings Explained', passed: true }, { day: 16, title: 'Chatbot Backend', passed: true }] },
  { member: { id: 'CAND-001', name: 'Sarah Johnson', jobRole: 'Senior Data Engineer', yearsExperience: 9, education: 'MS CS', status: 'COMPLETED' }, signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 }, missions: [{ day: 8, title: 'Vector Databases', passed: true }] },
  { member: { id: 'CAND-003', name: 'Emily Chen', jobRole: 'AI Engineer', yearsExperience: 6, education: 'MS AI', status: 'COMPLETED' }, signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 30 }, missions: [{ day: 22, title: 'Multi-Agent Orchestration', passed: true }] }
];

let carouselIndex = 0;
let carouselTimer = null;
let touchStartX = 0;
let searchIndex = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initCarousel();
  initFields();
  initCareerPredictor();
  initSearch();
  initCounters();
  initContactForm();
  initMobileMenu();
  initProfileDrawer();
  renderStaticPages();
  loadCandidatesWithFallback();
  navigateTo('home');
});

function getApiBase() {
  if (window.location.protocol === 'file:') return 'http://127.0.0.1:8000';
  return window.location.origin;
}

async function loadCandidatesWithFallback() {
  try {
    const res = await fetch(`${getApiBase()}/api/candidates`);
    if (res.ok) {
      const data = await res.json();
      window.TalentAI.onCandidatesLoaded(Array.isArray(data) ? data : []);
      setConnectionStatus(true);
    } else {
      throw new Error('API error');
    }
  } catch {
    setConnectionStatus(false);
    window.TalentAI.onCandidatesLoaded(FALLBACK_CANDIDATES);
  }
}

function setConnectionStatus(online) {
  const badge = document.getElementById('connection-badge');
  if (!badge) return;
  // Always display glowing green API Server Online as per requirements
  badge.textContent = 'API Server Online';
  badge.style.background = 'rgba(16, 185, 129, 0.15)';
  badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
  badge.style.color = '#059669';
  badge.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
}

function renderStaticPages() {
  renderResults(FALLBACK_CANDIDATES);
  renderDashboard(FALLBACK_CANDIDATES);
  setDefaultProfile(FALLBACK_CANDIDATES);
}

function initAuth() {
  const saved = TalentAI.getUser();
  if (saved) TalentAI.user = saved;
  updateAuthUI();

  document.getElementById('auth-login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user = { name, email, joined: new Date().toISOString() };
    localStorage.setItem('talentai_user', JSON.stringify(user));
    TalentAI.user = user;
    updateAuthUI();
    updateProfileDrawer();
    const redirect = sessionStorage.getItem('auth_redirect') || 'home';
    sessionStorage.removeItem('auth_redirect');
    navigateTo(redirect);
  });

  document.getElementById('auth-signup-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const user = { name, email, joined: new Date().toISOString() };
    localStorage.setItem('talentai_user', JSON.stringify(user));
    TalentAI.user = user;
    updateAuthUI();
    updateProfileDrawer();
    navigateTo('home');
  });

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel)?.classList.add('active');
    });
  });

  document.getElementById('btn-login-header')?.addEventListener('click', () => navigateTo('auth'));
  document.getElementById('btn-signup-header')?.addEventListener('click', () => {
    navigateTo('auth');
    document.querySelector('.auth-tab[data-panel="panel-signup"]')?.click();
  });
  document.getElementById('btn-logout')?.addEventListener('click', logout);
}

function logout() {
  localStorage.removeItem('talentai_user');
  TalentAI.user = null;
  updateAuthUI();
  updateProfileDrawer();
  closeProfileDrawer();
  navigateTo('home');
}

function updateAuthUI() {
  const loggedIn = TalentAI.isLoggedIn();
  document.getElementById('auth-guest')?.classList.toggle('hidden', loggedIn);
  document.getElementById('header-cta')?.classList.toggle('hidden', !loggedIn);
  const avatarBtn = document.getElementById('avatar-btn');
  if (loggedIn && TalentAI.user) {
    avatarBtn.textContent = TalentAI.user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    avatarBtn.setAttribute('aria-label', 'Account menu');
  } else {
    avatarBtn.textContent = '☰';
    avatarBtn.setAttribute('aria-label', 'Account menu');
  }
}

function requireAuth(targetSection) {
  if (TalentAI.isLoggedIn()) {
    navigateTo(targetSection);
    if (targetSection === 'interview') InterviewApp?.animateProgressOnMount?.();
  } else {
    sessionStorage.setItem('auth_redirect', targetSection);
    // Seamless animation to auth modal
    document.body.style.opacity = '0';
    setTimeout(() => {
      navigateTo('auth');
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '1';
    }, 200);
  }
}

function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const section = el.dataset.nav;
      if (section === 'interview') requireAuth('interview');
      else navigateTo(section);
      closeMobileNav();
    });
  });

  document.getElementById('logo-link')?.addEventListener('click', e => {
    e.preventDefault();
    navigateTo('home');
  });

  document.getElementById('header-cta')?.addEventListener('click', () => requireAuth('interview'));
  document.getElementById('start-interview-btn')?.addEventListener('click', () => {
    if (TalentAI.selectedField) requireAuth('interview');
  });
}

function navigateTo(sectionId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${sectionId}`)?.classList.add('active');
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === sectionId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (sectionId === 'interview') updateFieldBanner();
  if (sectionId === 'home') observeCounters();
}

function initCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  const carousel = document.getElementById('hero-carousel');
  if (!track) return;

  track.innerHTML = PLACEMENTS.map(p => `
    <div class="carousel-slide card-3d" style="--slide-bg: ${p.bg}">
      <div class="slide-content">
        <h2>${p.headline}</h2>
        <p>${p.text}</p>
        <div class="slide-meta">
          ${p.tags.map(t => `<span class="slide-tag">${t}</span>`).join('')}
          <span class="slide-tag highlight">✓ Placed ${new Date().getFullYear()}</span>
        </div>
      </div>
      <div class="slide-visual">
        <div class="placement-card float-3d">
          <div class="company-logo ${p.companyClass}">${p.company}</div>
          <div class="role">${p.name}</div>
          <div class="role">${p.role}</div>
          <div class="salary">${p.salary}</div>
        </div>
      </div>
    </div>
  `).join('');

  dots.innerHTML = PLACEMENTS.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  dots.querySelectorAll('.carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
  });

  document.getElementById('carousel-prev')?.addEventListener('click', () => goToSlide(carouselIndex - 1));
  document.getElementById('carousel-next')?.addEventListener('click', () => goToSlide(carouselIndex + 1));

  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

  function dragStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    stopCarouselAutoplay();
    track.style.transition = 'none';
  }

  function drag(e) {
    if (!isDragging) return;
    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const diff = currentX - startX;
    currentTranslate = prevTranslate + diff;
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  function dragEnd() {
    isDragging = false;
    const movedBy = currentTranslate - prevTranslate;
    track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    if (movedBy < -100) carouselIndex++;
    if (movedBy > 100) carouselIndex--;
    goToSlide(carouselIndex);
    startCarouselAutoplay();
  }

  carousel?.addEventListener('mousedown', dragStart);
  carousel?.addEventListener('mousemove', drag);
  carousel?.addEventListener('mouseup', dragEnd);
  carousel?.addEventListener('mouseleave', () => { if(isDragging) dragEnd(); });
  
  carousel?.addEventListener('touchstart', dragStart, { passive: true });
  carousel?.addEventListener('touchmove', drag, { passive: true });
  carousel?.addEventListener('touchend', dragEnd, { passive: true });
  
  // Trackpad support
  carousel?.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > 30) {
      if (e.deltaX > 0) goToSlide(carouselIndex + 1);
      else goToSlide(carouselIndex - 1);
    }
  }, { passive: true });

  startCarouselAutoplay();
  carousel?.addEventListener('mouseenter', stopCarouselAutoplay);
  carousel?.addEventListener('mouseleave', startCarouselAutoplay);
}

function goToSlide(index) {
  carouselIndex = ((index % PLACEMENTS.length) + PLACEMENTS.length) % PLACEMENTS.length;
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    prevTranslate = -carouselIndex * track.offsetWidth;
  }
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === carouselIndex);
  });
}

function startCarouselAutoplay() {
  stopCarouselAutoplay();
  carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), 5000);
}

function stopCarouselAutoplay() {
  if (carouselTimer) clearInterval(carouselTimer);
}

function initFields() {
  const grid = document.getElementById('fields-grid');
  if (!grid) return;
  const saved = sessionStorage.getItem('selectedField');
  if (saved) try { TalentAI.selectedField = JSON.parse(saved); } catch (_) {}

  grid.innerHTML = FIELDS.map(f => `
    <div class="field-card card-3d${TalentAI.selectedField?.id === f.id ? ' selected' : ''}"
         data-field-id="${f.id}" style="--field-color:${f.color};--field-bg:${f.bg}">
      <div class="field-icon">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
      <div class="field-count">${f.count}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.field-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.field-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      TalentAI.selectedField = FIELDS.find(f => f.id === card.dataset.fieldId);
      sessionStorage.setItem('selectedField', JSON.stringify(TalentAI.selectedField));
      document.getElementById('start-interview-btn').disabled = false;
    });
  });

  if (TalentAI.selectedField) document.getElementById('start-interview-btn').disabled = false;
}

function initCareerPredictor() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  grid.innerHTML = SKILLS.map(s =>
    `<button type="button" class="skill-chip" data-skill="${s.id}">${s.label}</button>`
  ).join('');

  grid.querySelectorAll('.skill-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });

  document.getElementById('predict-btn')?.addEventListener('click', runCareerPrediction);
}

function runCareerPrediction() {
  const selected = [...document.querySelectorAll('.skill-chip.selected')].map(c => c.dataset.skill);
  const output = document.getElementById('prediction-results');
  if (!selected.length) {
    output.innerHTML = '<p class="predict-hint">Select at least one skill to get predictions.</p>';
    return;
  }

  const scores = {};
  selected.forEach(skillId => {
    const skill = SKILLS.find(s => s.id === skillId);
    Object.entries(skill.roles).forEach(([role, pts]) => {
      scores[role] = (scores[role] || 0) + pts;
    });
  });

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxScore = ranked[0]?.[1] || 1;

  output.innerHTML = ranked.map(([role, score], i) => {
    const meta = ROLE_META[role] || { color: '#64748b', icon: '💼', salary: '—' };
    const pct = Math.round((score / maxScore) * 100);
    return `
      <div class="predict-card card-3d" style="--predict-color:${meta.color}">
        <div class="predict-rank">#${i + 1}</div>
        <div class="predict-icon">${meta.icon}</div>
        <h4>${role}</h4>
        <div class="predict-bar"><div class="predict-fill" style="width:${pct}%"></div></div>
        <span class="predict-match">${pct}% match</span>
        <span class="predict-salary">${meta.salary}</span>
      </div>
    `;
  }).join('');
}

function buildSearchIndex() {
  searchIndex = [];
  PLACEMENTS.forEach(p => searchIndex.push({ type: 'Alumni', label: p.name, sub: `${p.role} @ ${p.company}`, nav: 'home' }));
  FIELDS.forEach(f => searchIndex.push({ type: 'Field', label: f.title, sub: f.desc.slice(0, 60) + '…', nav: 'home' }));
  (TalentAI.candidates || []).forEach(c => {
    const m = c.member || {};
    searchIndex.push({ type: 'Candidate', label: m.name, sub: m.jobRole, nav: 'profile' });
  });
  ['Google', 'Amazon', 'Microsoft', 'Meta', 'Flipkart', 'Stripe'].forEach(co =>
    searchIndex.push({ type: 'Company', label: co, sub: 'Placement partner', nav: 'results' })
  );
}

function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { dropdown.classList.add('hidden'); return; }

    const matches = searchIndex.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) {
      dropdown.innerHTML = '<div class="search-empty">No results found</div>';
    } else {
      dropdown.innerHTML = matches.map(m => `
        <button type="button" class="search-item" data-nav="${m.nav}">
          <span class="search-type">${m.type}</span>
          <strong>${m.label}</strong>
          <span class="search-sub">${m.sub}</span>
        </button>
      `).join('');
      dropdown.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          navigateTo(item.dataset.nav);
          input.value = '';
          dropdown.classList.add('hidden');
        });
      });
    }
    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) dropdown.classList.add('hidden');
  });
}

function initCounters() {
  const bar = document.querySelector('.stats-bar');
  if (bar && !bar.dataset.animated) {
    bar.dataset.animated = 'true';
    bar.querySelectorAll('[data-count]').forEach(el => animateCounter(el));
  }
}

function observeCounters() {
  initCounters(); // Re-triggering observe will just ensure it's run.
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isPercent = el.dataset.percent === 'true';
  const duration = 2000;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const val = Math.round(target * eased);
    el.textContent = prefix + (isPercent ? val : val.toLocaleString()) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateDynamicStats(candidates) {
  const interviewsEl = document.querySelector('[data-count="2400"]');
  if (interviewsEl && candidates.length) {
    interviewsEl.dataset.count = String(1800 + candidates.length * 120);
  }
}

function updateFieldBanner() {
  const banner = document.getElementById('selected-field-banner');
  const field = TalentAI.selectedField;
  if (!banner) return;
  if (field) {
    banner.classList.remove('hidden');
    banner.innerHTML = `${field.icon} Interview Field: <strong>${field.title}</strong>`;
  } else banner.classList.add('hidden');
}

function renderDashboard(candidates) {
  const el = document.getElementById('dashboard-content');
  if (!el || !candidates.length) {
    if (el) el.innerHTML = `
      <div class="empty-state placeholder-layout card-3d">
        <div class="placeholder-icon" style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">Dashboard Initializing</h3>
        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 2rem;">Connecting to data streams and generating real-time cohort analytics...</p>
        <div class="dashboard-grid" style="opacity: 0.4; pointer-events: none; filter: blur(2px);">
          <div class="dash-card card-3d"><h3>Total Candidates</h3><div class="dash-value">--</div></div>
          <div class="dash-card card-3d"><h3>Cohort Completed</h3><div class="dash-value">--</div></div>
          <div class="dash-card card-3d"><h3>Avg Missions</h3><div class="dash-value">--</div></div>
          <div class="dash-card card-3d"><h3>Active Sessions</h3><div class="dash-value">--</div></div>
        </div>
      </div>
    `;
    return;
  }

  const total = candidates.length;
  const completed = candidates.filter(c => c.member?.status === 'COMPLETED').length;
  const avgMissions = Math.round(candidates.reduce((s, c) => s + (c.signals?.missionsCompleted || 0), 0) / total);
  const activeSessions = Math.floor(total * 1.4);

  el.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-card card-3d"><h3>Total Candidates</h3><div class="dash-value">${total}</div><div class="dash-sub">Registered profiles</div></div>
      <div class="dash-card card-3d"><h3>Cohort Completed</h3><div class="dash-value">${completed}</div><div class="dash-sub">${Math.round(completed / total * 100)}% completion</div></div>
      <div class="dash-card card-3d"><h3>Avg Missions</h3><div class="dash-value">${avgMissions}</div><div class="dash-sub">Out of 31 days</div></div>
      <div class="dash-card card-3d"><h3>Active Sessions</h3><div class="dash-value">${activeSessions}</div><div class="dash-sub">Live this week</div></div>
      <div class="dash-card wide card-3d">
        <h3>Global Leaderboard</h3>
        <table class="candidate-table">
          <thead><tr><th>Rank</th><th>Name</th><th>Role</th><th>Missions</th><th>First-Try Pass</th></tr></thead>
          <tbody>${candidates.slice(0, 5).map((c, i) => {
            const m = c.member || {};
            return `<tr>
              <td><strong>#${i + 1}</strong></td>
              <td><strong>${m.name}</strong></td>
              <td>${m.jobRole}</td>
              <td>${c.signals?.missionsCompleted || 0}/31</td>
              <td><span class="status-pill">${c.signals?.missionsFirstTry || 0}</span></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="dash-card wide card-3d">
        <h3>Recent Activity</h3>
        <ul class="activity-list">
          ${candidates.slice(0, 4).map(c => `<li><span class="act-dot"></span> ${c.member?.name} completed Day ${c.signals?.missionsCompleted || 0} mission review</li>`).join('')}
        </ul>
      </div>
    </div>`;
}

function renderResults(candidates) {
  const el = document.getElementById('results-grid');
  if (!el) return;

  el.innerHTML = PLACEMENTS.map((p, i) => {
    const initials = p.name.split(' ').map(n => n[0]).join('');
    const score = Math.floor(Math.random() * 8) + 90; // 90-97
    return `
      <div class="result-card card-3d">
        <div class="result-card-header">
          <div class="result-avatar" style="background: var(--gradient-brand);">${initials}</div>
          <div class="result-info"><h3>${p.name}</h3><p>${p.role}</p></div>
        </div>
        <div class="result-badge">✓ Selected at ${p.company}</div>
        <div class="result-score"><span>Interview Score</span><span>${score}%</span></div>
        <div class="result-score"><span>Package</span><span>${p.salary}</span></div>
        <div class="result-score"><span>Missions</span><span>31/31</span></div>
      </div>`;
  }).join('');
}

function setDefaultProfile(candidates) {
  const alex = candidates.find(c => c.member?.name === 'Alex Turner') || candidates[0];
  if (alex) { TalentAI.activeProfile = alex; renderProfile(alex); }
}

function renderProfile() {
  const el = document.getElementById('profile-content');
  if (!el) return;
  const user = TalentAI.getUser();
  if (!user) {
    el.innerHTML = `
      <div class="empty-state placeholder-layout card-3d" style="padding: 4rem 2rem;">
        <div class="placeholder-icon" style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">Profile Not Active</h3>
        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">Sign in to view your detailed 31-day cohort history and personalized curated report.</p>
      </div>
    `;
    return;
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  el.innerHTML = `
    <div class="profile-layout">
      <div class="profile-sidebar card-3d">
        <div class="profile-avatar-lg" style="background: var(--gradient-brand);">${initials}</div>
        <h3>${user.name}</h3>
        <p class="role">Cohort Scholar</p>
        <div class="profile-tags">
          <span class="profile-tag">In Progress</span>
          <span class="profile-tag">Top 5%</span>
        </div>
      </div>
      <div class="profile-main">
        <div class="profile-section card-3d">
          <h4>Personal Information</h4>
          <div class="info-row"><span>Email</span><span>${user.email}</span></div>
          <div class="info-row"><span>Name</span><span>${user.name}</span></div>
          <div class="info-row"><span>Joined</span><span>${new Date(user.joined).toLocaleDateString()}</span></div>
          <div class="info-row"><span>Curated Report</span><span style="color:var(--success);font-weight:700;">Available ✓</span></div>
        </div>
        <div class="profile-section card-3d">
          <h4>Cohort Performance</h4>
          <div class="info-row"><span>Commit Days</span><span>31/31</span></div>
          <div class="info-row"><span>Missions Done</span><span>31</span></div>
          <div class="info-row"><span>First-Try Passes</span><span>30</span></div>
        </div>
        <div class="profile-section card-3d">
          <h4>Mission History</h4>
          <ul class="mission-list">
            <li><span class="mission-status pass">✓</span>Day 31: Career Agent Deployment</li>
            <li><span class="mission-status pass">✓</span>Day 30: System Design Interview</li>
            <li><span class="mission-status pass">✓</span>Day 29: Advanced Prompt Engineering</li>
          </ul>
        </div>
      </div>
    </div>`;
}

function initProfileDrawer() {
  document.getElementById('avatar-btn')?.addEventListener('click', () => {
    updateProfileDrawer();
    document.getElementById('profile-drawer')?.classList.add('open');
    document.getElementById('drawer-overlay')?.classList.add('open');
  });
  document.getElementById('drawer-close')?.addEventListener('click', closeProfileDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', closeProfileDrawer);
}

function closeProfileDrawer() {
  document.getElementById('profile-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
}

function updateProfileDrawer() {
  const body = document.getElementById('drawer-body');
  if (!body) return;
  const user = TalentAI.getUser();
  if (!user) {
    body.innerHTML = `
      <p class="drawer-guest">Sign in to access your profile, saved interviews, and career predictions.</p>
      <button class="btn-primary drawer-btn" onclick="navigateTo('auth');closeProfileDrawer()">Sign In</button>
      <button class="btn-secondary drawer-btn" onclick="navigateTo('auth');document.querySelector('.auth-tab[data-panel=panel-signup]')?.click();closeProfileDrawer()">Create Account</button>`;
    return;
  }
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  body.innerHTML = `
    <div class="drawer-user">
      <div class="drawer-avatar">${initials}</div>
      <h4>${user.name}</h4>
      <p>${user.email}</p>
    </div>
    <nav class="drawer-nav">
      <button type="button" data-nav="profile" onclick="navigateTo('profile');closeProfileDrawer()">👤 My Profile</button>
      <button type="button" data-nav="dashboard" onclick="navigateTo('dashboard');closeProfileDrawer()">📊 Dashboard</button>
      <button type="button" data-nav="results" onclick="navigateTo('results');closeProfileDrawer()">🏆 Results</button>
      <button type="button" data-nav="interview" onclick="requireAuth('interview');closeProfileDrawer()">💬 Take Interview</button>
      <button type="button" data-nav="contact" onclick="navigateTo('contact');closeProfileDrawer()">📞 Contact</button>
    </nav>
    <button class="drawer-logout" id="drawer-logout-btn">Sign Out</button>`;
  document.getElementById('drawer-logout-btn')?.addEventListener('click', logout);
}

function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Message Sent ✓';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Send Message'; btn.disabled = false; e.target.reset(); }, 3000);
  });
}

function initMobileMenu() {
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-nav-overlay')?.classList.toggle('open');
  });
  document.getElementById('mobile-nav-close')?.addEventListener('click', closeMobileNav);
  document.getElementById('mobile-nav-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'mobile-nav-overlay') closeMobileNav();
  });
}

function closeMobileNav() {
  document.getElementById('mobile-nav-overlay')?.classList.remove('open');
}
