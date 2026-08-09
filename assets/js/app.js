/**
 * TalentAI — Site UI (Production Build)
 */
window.TalentAI = {
  selectedField: null, activeProfile: null, candidates: [], user: null,
  isLoggedIn() { try { return !!JSON.parse(localStorage.getItem('talentai_user') || 'null'); } catch { return false; } },
  getUser() { try { return JSON.parse(localStorage.getItem('talentai_user') || 'null'); } catch { return null; } },
  onCandidatesLoaded(list) {
    this.candidates = list;
    renderDashboard(list); renderResults(list); renderLeaderboard(list);
    buildSearchIndex(); updateDynamicStats(list);
    InterviewApp?.loadCandidates?.(list);
  },
  onCandidateSelected(candidate) { this.activeProfile = candidate; updateProfileDrawer(); },
  onFeedbackRendered(feedback) { sessionStorage.setItem('lastFeedback', JSON.stringify(feedback)); }
};

const PLACEMENTS = [
  { name: 'Priya Sharma', role: 'Staff ML Engineer', company: 'Google', companyClass: 'google', salary: '48 LPA', bg: 'linear-gradient(135deg,#dbeafe,#e0e7ff)', headline: 'Priya Sharma joins <em>Google</em> DeepMind', text: 'Completed our AI cohort with top RAG scores. TalentAI interview predicted 94% ML fit — she cleared Google\'s L5 loop in a single onsite.', tags: ['ML Systems', 'Top 1% Cohort'], score: 94 },
  { name: 'Rahul Mehta', role: 'SDE-2', company: 'Amazon', companyClass: 'amazon', salary: '41 LPA', bg: 'linear-gradient(135deg,#ffedd5,#fef3c7)', headline: 'Rahul Mehta lands <em>Amazon</em> AWS', text: 'Backend track graduate with distributed systems focus. Adaptive interview surfaced MCP API design strengths matching Amazon\'s bar-raiser panel.', tags: ['Distributed Systems', 'AWS Track'], score: 91 },
  { name: 'Ananya Reddy', role: 'Senior AI Engineer', company: 'Microsoft', companyClass: 'microsoft', salary: '46 LPA', bg: 'linear-gradient(135deg,#d1fae5,#ecfdf5)', headline: 'Ananya Reddy \u2192 <em>Microsoft</em> Copilot', text: 'Full-stack AI builder with LangChain and Azure expertise. Interview agent validated agentic workflow skills — offer within 72 hours of final round.', tags: ['Copilot Team', 'Agentic AI'], score: 96 },
  { name: 'Vikram Patel', role: 'Product Manager, AI', company: 'Meta', companyClass: 'meta', salary: '39 LPA', bg: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', headline: 'Vikram Patel pivots to <em>Meta</em> AI PM', text: 'Career switcher from finance. Curriculum-aware interviews tested prompt engineering and product sense — Meta extended PM offer for GenAI team.', tags: ['Career Pivot', 'GenAI PM'], score: 90 },
  { name: 'Neha Gupta', role: 'Data Scientist', company: 'Netflix', companyClass: 'netflix', salary: '44 LPA', bg: 'linear-gradient(135deg,#fee2e2,#fecaca)', headline: 'Neha Gupta joins <em>Netflix</em> Personalization', text: 'Aced the system design round focusing on real-time recommendations. Our Mock Interview Simulator perfectly predicted her interview flow.', tags: ['RecSys', 'Data Track'], score: 93 },
  { name: 'Karan Singh', role: 'Senior Frontend Engineer', company: 'Apple', companyClass: 'apple', salary: '42 LPA', bg: 'linear-gradient(135deg,#f3f4f6,#e5e7eb)', headline: 'Karan Singh lands <em>Apple</em> UI Team', text: 'Specialized in micro-animations and WebGL. The ATS Grader helped him bypass screening, and he cleared Apple\'s rigorous UI architecture rounds.', tags: ['UI Architect', 'Frontend Track'], score: 95 }
];

const FIELDS = [
  { id: 'ai-ml', icon: '\u{1F916}', title: 'AI \u0026 Machine Learning', desc: 'LLMs, RAG, embeddings, fine-tuning, and agentic workflows.', color: '#2563eb', bg: '#dbeafe', count: '120+ questions' },
  { id: 'backend', icon: '\u2699\uFE0F', title: 'Backend Engineering', desc: 'APIs, microservices, streaming, MCP integration, and system design.', color: '#7c3aed', bg: '#ede9fe', count: '95+ questions' },
  { id: 'data', icon: '\u{1F4CA}', title: 'Data Engineering', desc: 'Vector DBs, pipelines, retrieval engines, and observability.', color: '#059669', bg: '#d1fae5', count: '80+ questions' },
  { id: 'fullstack', icon: '\u{1F4BB}', title: 'Full Stack Development', desc: 'React, FastAPI, chatbot backends, and deployment patterns.', color: '#d97706', bg: '#fef3c7', count: '110+ questions' },
  { id: 'devops', icon: '\u2601\uFE0F', title: 'DevOps \u0026 Cloud', desc: 'Docker, Kubernetes, CI/CD, monitoring, and production ops.', color: '#0891b2', bg: '#cffafe', count: '70+ questions' },
  { id: 'prompt', icon: '\u2728', title: 'Prompt Engineering', desc: 'Chain-of-thought, function calling, structured outputs, and evals.', color: '#db2777', bg: '#fce7f3', count: '85+ questions' }
];

const SKILLS = [
  { id: 'python', label: 'Python', roles: { 'AI Engineer': 3, 'Backend Engineer': 2, 'Data Engineer': 2 } },
  { id: 'llm', label: 'LLMs \u0026 RAG', roles: { 'AI Engineer': 4, 'ML Engineer': 3, 'Prompt Engineer': 3 } },
  { id: 'api', label: 'API Design', roles: { 'Backend Engineer': 4, 'Full Stack Dev': 3, 'AI Engineer': 1 } },
  { id: 'docker', label: 'Docker/K8s', roles: { 'DevOps Engineer': 4, 'Backend Engineer': 2, 'Data Engineer': 1 } },
  { id: 'sql', label: 'SQL \u0026 Data', roles: { 'Data Engineer': 4, 'Backend Engineer': 2, 'Business Analyst': 3 } },
  { id: 'react', label: 'React/Frontend', roles: { 'Full Stack Dev': 4, 'Frontend Engineer': 4, 'UI Engineer': 3 } },
  { id: 'agents', label: 'AI Agents', roles: { 'AI Engineer': 4, 'ML Engineer': 2, 'Prompt Engineer': 2 } },
  { id: 'system', label: 'System Design', roles: { 'Backend Engineer': 3, 'Staff Engineer': 4, 'DevOps Engineer': 2 } }
];

const ROLE_META = {
  'AI Engineer': { color: '#2563eb', icon: '\u{1F916}', salary: '\u20B928\u201355 LPA' },
  'Backend Engineer': { color: '#7c3aed', icon: '\u2699\uFE0F', salary: '\u20B922\u201345 LPA' },
  'Data Engineer': { color: '#059669', icon: '\u{1F4CA}', salary: '\u20B920\u201342 LPA' },
  'Full Stack Dev': { color: '#d97706', icon: '\u{1F4BB}', salary: '\u20B918\u201338 LPA' },
  'DevOps Engineer': { color: '#0891b2', icon: '\u2601\uFE0F', salary: '\u20B924\u201348 LPA' },
  'ML Engineer': { color: '#4f46e5', icon: '\u{1F9E0}', salary: '\u20B930\u201360 LPA' },
  'Prompt Engineer': { color: '#db2777', icon: '\u2728', salary: '\u20B918\u201335 LPA' },
  'Staff Engineer': { color: '#0f172a', icon: '\u{1F3D7}\uFE0F', salary: '\u20B945\u201380 LPA' },
  'Frontend Engineer': { color: '#ea580c', icon: '\u{1F3A8}', salary: '\u20B916\u201332 LPA' },
  'Business Analyst': { color: '#64748b', icon: '\u{1F4C8}', salary: '\u20B914\u201328 LPA' },
  'UI Engineer': { color: '#ec4899', icon: '\u270F\uFE0F', salary: '\u20B915\u201330 LPA' }
};

const FALLBACK_CANDIDATES = [
  { member: { id: 'CAND-002', name: 'Alex Turner', jobRole: 'Backend Software Engineer', yearsExperience: 5, education: 'B.Tech CS', status: 'COMPLETED' }, signals: { commitDays: 22, missionsCompleted: 29, missionsFirstTry: 10 }, missions: [] },
  { member: { id: 'CAND-001', name: 'Sarah Johnson', jobRole: 'Senior Data Engineer', yearsExperience: 9, education: 'MS CS', status: 'COMPLETED' }, signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 }, missions: [] },
  { member: { id: 'CAND-003', name: 'Emily Chen', jobRole: 'AI Engineer', yearsExperience: 6, education: 'MS AI', status: 'COMPLETED' }, signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 30 }, missions: [] }
];

const LB_SEED = [
  { name: 'Emily Chen', role: 'AI Engineer', score: 98, missions: 31, firstTry: 30, g: 'linear-gradient(135deg,#2563eb,#7c3aed)' },
  { name: 'Sarah Johnson', role: 'Senior Data Engineer', score: 95, missions: 30, firstTry: 20, g: 'linear-gradient(135deg,#059669,#0891b2)' },
  { name: 'Priya Sharma', role: 'Staff ML Engineer', score: 94, missions: 31, firstTry: 29, g: 'linear-gradient(135deg,#7c3aed,#ec4899)' },
  { name: 'Karan Singh', role: 'Senior Frontend Engineer', score: 92, missions: 31, firstTry: 27, g: 'linear-gradient(135deg,#0891b2,#2563eb)' },
  { name: 'Ananya Reddy', role: 'Senior AI Engineer', score: 91, missions: 30, firstTry: 26, g: 'linear-gradient(135deg,#d97706,#f59e0b)' },
  { name: 'Alex Turner', role: 'Backend Engineer', score: 89, missions: 29, firstTry: 10, g: 'linear-gradient(135deg,#4f46e5,#818cf8)' },
  { name: 'Neha Gupta', role: 'Data Scientist', score: 88, missions: 29, firstTry: 24, g: 'linear-gradient(135deg,#dc2626,#f97316)' },
  { name: 'Rahul Mehta', role: 'SDE-2', score: 87, missions: 28, firstTry: 19, g: 'linear-gradient(135deg,#0f172a,#334155)' },
  { name: 'Vikram Patel', role: 'Product Manager, AI', score: 85, missions: 27, firstTry: 18, g: 'linear-gradient(135deg,#0668E1,#38bdf8)' },
  { name: 'Divya Kumar', role: 'Prompt Engineer', score: 82, missions: 26, firstTry: 16, g: 'linear-gradient(135deg,#db2777,#f472b6)' }
];

const SALARY_SCRIPT = [
  (base, role) => `Hi! We are thrilled to extend you an offer for the ${role || 'SDE-2'} position at ${base || '\u20B925 LPA'}. We believe this reflects your experience and our compensation bands. How does this align with your expectations?`,
  () => `I appreciate your transparency. We do have some flexibility \u2014 we could move to \u20B927 LPA with an additional \u20B91.5 LPA performance bonus in year one. Would that work for you?`,
  () => `That is a fair point. Let me check with our HR team. We can offer \u20B928 LPA as a final offer along with accelerated vesting on ESOPs. This is our best and final offer \u2014 we would love to have you on board!`,
  () => `We really value your interest. The absolute maximum we can go is \u20B929 LPA with a \u20B950,000 joining bonus. I hope you will consider this favourably \u2014 we are very excited about what you will bring to the team.`
];
let salaryTurn = 0;

const ATS_FIELDS = [
  { name: 'Keyword Density', score: 92, cls: 'high' },
  { name: 'Formatting \u0026 Parsing', score: 88, cls: 'high' },
  { name: 'Quantified Impact', score: 71, cls: 'mid' },
  { name: 'Action Verb Strength', score: 85, cls: 'high' },
  { name: 'Skills Section', score: 90, cls: 'high' },
  { name: 'Education Format', score: 78, cls: 'mid' },
  { name: 'Contact Completeness', score: 95, cls: 'high' },
  { name: 'File Size \u0026 Readability', score: 82, cls: 'high' }
];

let carouselIndex = 0, carouselTimer = null, searchIndex = [];

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuth(); initNavigation(); initCarousel(); initFields();
  initCareerPredictor(); initSearch(); initCounters();
  initContactForm(); initMobileMenu(); initProfileDrawer();
  initDashboardTabs(); initATSGrader(); initSalaryRoleplay();
  initCanvasMesh(); initCardTilt(); initGlassHover();
  loadCandidatesWithFallback();
  navigateTo('home');
  if (TalentAI.isLoggedIn()) renderProfile();
});

function getApiBase() {
  return window.location.protocol === 'file:' ? 'http://127.0.0.1:8000' : window.location.origin;
}

async function loadCandidatesWithFallback() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(getApiBase() + '/api/candidates', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      setConnectionStatus(true);
      window.TalentAI.onCandidatesLoaded(Array.isArray(data) ? data : []);
      return;
    }
  } catch (_) { /* fall through */ }
  setConnectionStatus(false);
  window.TalentAI.onCandidatesLoaded(FALLBACK_CANDIDATES);
}

function setConnectionStatus(online) {
  const badge = document.getElementById('connection-badge');
  if (!badge) return;
  if (online) {
    badge.textContent = 'API Server Online';
    badge.style.cssText = 'background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.3);color:#059669;box-shadow:0 0 12px rgba(16,185,129,0.4)';
  } else {
    badge.textContent = 'Local Mode';
    badge.style.cssText = 'background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#d97706;box-shadow:0 0 10px rgba(245,158,11,0.3)';
  }
}

/* ── AUTH ── */
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
    updateAuthUI(); updateProfileDrawer();
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
    updateAuthUI(); updateProfileDrawer(); navigateTo('home');
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
  localStorage.removeItem('talentai_activity');
  TalentAI.user = null;
  updateAuthUI(); updateProfileDrawer(); closeProfileDrawer(); navigateTo('home');
}

function updateAuthUI() {
  const loggedIn = TalentAI.isLoggedIn();
  document.getElementById('auth-guest')?.classList.toggle('hidden', loggedIn);
  document.getElementById('header-cta')?.classList.toggle('hidden', !loggedIn);
  const btn = document.getElementById('avatar-btn');
  if (!btn) return;
  btn.textContent = loggedIn && TalentAI.user
    ? TalentAI.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '\u2630';
}

function requireAuth(target) {
  if (TalentAI.isLoggedIn()) {
    navigateTo(target);
    if (target === 'interview') InterviewApp?.animateProgressOnMount?.();
  } else {
    sessionStorage.setItem('auth_redirect', target);
    document.body.style.opacity = '0';
    setTimeout(() => {
      navigateTo('auth');
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '1';
    }, 200);
  }
}

/* ── NAVIGATION ── */
function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const s = el.dataset.nav;
      if (s === 'interview') requireAuth('interview'); else navigateTo(s);
      closeMobileNav();
    });
  });
  document.getElementById('logo-link')?.addEventListener('click', e => { e.preventDefault(); navigateTo('home'); });
  document.getElementById('header-cta')?.addEventListener('click', () => requireAuth('interview'));
  document.getElementById('start-interview-btn')?.addEventListener('click', () => {
    if (TalentAI.selectedField) requireAuth('interview');
  });
  document.querySelectorAll('.view-all-partners').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo('contact');
    });
  });
}

function navigateTo(id) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + id)?.classList.add('active');
  document.querySelectorAll('[data-nav]').forEach(l => l.classList.toggle('active', l.dataset.nav === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'interview') updateFieldBanner();
  if (id === 'home') observeCounters();
  if (id === 'profile') renderProfile();
  if (TalentAI.isLoggedIn() && id !== 'auth') {
    const labels = { home: 'Visited Home', interview: 'Opened Interview', results: 'Browsed Results', dashboard: 'Viewed Dashboard', profile: 'Viewed Profile', resume: 'Used ATS Grader', salary: 'Used Salary AI', predictor: 'Used Career Predictor', contact: 'Viewed Contact' };
    const label = labels[id];
    if (label) {
      const a = JSON.parse(localStorage.getItem('talentai_activity') || '[]');
      a.push({ action: label, time: new Date().toISOString() });
      if (a.length > 50) a.splice(0, a.length - 50);
      localStorage.setItem('talentai_activity', JSON.stringify(a));
    }
  }
}

/* ── CAROUSEL (prevTranslate scoping fixed) ── */
function initCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  const carousel = document.getElementById('hero-carousel');
  if (!track) return;

  track.innerHTML = PLACEMENTS.map(p => [
    '<div class="carousel-slide card-3d" style="--slide-bg:' + p.bg + '">',
    '<div class="slide-content">',
    '<h2>' + p.headline + '</h2>',
    '<p>' + p.text + '</p>',
    '<div class="slide-meta">',
    p.tags.map(t => '<span class="slide-tag">' + t + '</span>').join(''),
    '<span class="slide-tag highlight">\u2713 Placed ' + new Date().getFullYear() + '</span>',
    '</div>',
    '</div>',
    '<div class="slide-visual">',
    '<div class="placement-card float-3d">',
    '<div class="company-logo ' + p.companyClass + '">' + p.company + '</div>',
    '<div class="role">' + p.name + '</div>',
    '<div class="role">' + p.role + '</div>',
    '<div class="salary">\u20B9' + p.salary + '</div>',
    '</div>',
    '</div>',
    '</div>'
  ].join('')).join('');

  dots.innerHTML = PLACEMENTS.map((_, i) =>
    '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>'
  ).join('');

  dots.querySelectorAll('.carousel-dot').forEach(d =>
    d.addEventListener('click', () => goToSlide(parseInt(d.dataset.index)))
  );
  document.getElementById('carousel-prev')?.addEventListener('click', () => goToSlide(carouselIndex - 1));
  document.getElementById('carousel-next')?.addEventListener('click', () => goToSlide(carouselIndex + 1));

  let dragging = false, dragStartX = 0, prevT = 0, curT = 0;

  function dStart(e) {
    dragging = true;
    dragStartX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    prevT = -carouselIndex * track.offsetWidth;
    stopCarouselAutoplay();
    track.style.transition = 'none';
  }
  function dMove(e) {
    if (!dragging) return;
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    curT = prevT + (x - dragStartX);
    track.style.transform = 'translateX(' + curT + 'px)';
  }
  function dEnd() {
    if (!dragging) return;
    dragging = false;
    const moved = curT - prevT;
    track.style.transition = 'transform 0.4s cubic-bezier(0.25,1,0.5,1)';
    if (moved < -80) carouselIndex++;
    else if (moved > 80) carouselIndex--;
    goToSlide(carouselIndex);
    startCarouselAutoplay();
  }

  carousel?.addEventListener('mousedown', dStart);
  carousel?.addEventListener('mousemove', dMove);
  carousel?.addEventListener('mouseup', dEnd);
  carousel?.addEventListener('mouseleave', () => { if (dragging) dEnd(); });
  carousel?.addEventListener('touchstart', dStart, { passive: true });
  carousel?.addEventListener('touchmove', dMove, { passive: true });
  carousel?.addEventListener('touchend', dEnd, { passive: true });
  carousel?.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > 30) goToSlide(e.deltaX > 0 ? carouselIndex + 1 : carouselIndex - 1);
  }, { passive: true });

  startCarouselAutoplay();
  carousel?.addEventListener('mouseenter', stopCarouselAutoplay);
  carousel?.addEventListener('mouseleave', startCarouselAutoplay);
}

function goToSlide(index) {
  carouselIndex = ((index % PLACEMENTS.length) + PLACEMENTS.length) % PLACEMENTS.length;
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1)';
    track.style.transform = 'translateX(-' + (carouselIndex * 100) + '%)';
  }
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
}
function startCarouselAutoplay() { stopCarouselAutoplay(); carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), 5000); }
function stopCarouselAutoplay() { if (carouselTimer) clearInterval(carouselTimer); }

/* ── FIELDS ── */
function initFields() {
  const grid = document.getElementById('fields-grid');
  if (!grid) return;
  const saved = sessionStorage.getItem('selectedField');
  if (saved) try { TalentAI.selectedField = JSON.parse(saved); } catch (_) { }

  grid.innerHTML = FIELDS.map(f =>
    '<div class="field-card card-3d' + (TalentAI.selectedField?.id === f.id ? ' selected' : '') + '"' +
    ' data-field-id="' + f.id + '" style="--field-color:' + f.color + ';--field-bg:' + f.bg + '">' +
    '<div class="field-icon">' + f.icon + '</div>' +
    '<h3>' + f.title + '</h3>' +
    '<p>' + f.desc + '</p>' +
    '<div class="field-count">' + f.count + '</div>' +
    '</div>'
  ).join('');

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

/* ── CAREER PREDICTOR ── */
function initCareerPredictor() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  grid.innerHTML = SKILLS.map(s =>
    '<button type="button" class="skill-chip" data-skill="' + s.id + '">' + s.label + '</button>'
  ).join('');
  grid.querySelectorAll('.skill-chip').forEach(chip =>
    chip.addEventListener('click', () => chip.classList.toggle('selected'))
  );
  document.getElementById('predict-btn')?.addEventListener('click', runCareerPrediction);
}

function runCareerPrediction() {
  const selected = [...document.querySelectorAll('.skill-chip.selected')].map(c => c.dataset.skill);
  const output = document.getElementById('prediction-results');
  if (!selected.length) { output.innerHTML = '<p class="predict-hint">Select at least one skill to get predictions.</p>'; return; }
  const scores = {};
  selected.forEach(id => {
    const skill = SKILLS.find(s => s.id === id);
    Object.entries(skill.roles).forEach(([role, pts]) => { scores[role] = (scores[role] || 0) + pts; });
  });
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxScore = ranked[0]?.[1] || 1;
  output.innerHTML = ranked.map(([role, score], i) => {
    const meta = ROLE_META[role] || { color: '#64748b', icon: '\u{1F4BC}', salary: '\u2014' };
    const pct = Math.round((score / maxScore) * 100);
    return '<div class="predict-card card-3d" style="--predict-color:' + meta.color + '">' +
      '<div class="predict-rank">#' + (i + 1) + ' Match</div>' +
      '<div class="predict-icon">' + meta.icon + '</div>' +
      '<h4>' + role + '</h4>' +
      '<div class="predict-bar"><div class="predict-fill" style="width:0%" data-w="' + pct + '"></div></div>' +
      '<span class="predict-match">' + pct + '% fit</span>' +
      '<span class="predict-salary">' + meta.salary + '</span>' +
      '</div>';
  }).join('');
  requestAnimationFrame(() => {
    output.querySelectorAll('.predict-fill').forEach(bar => { bar.style.width = bar.dataset.w + '%'; });
  });
}

/* ── SEARCH ── */
function buildSearchIndex() {
  searchIndex = [];
  PLACEMENTS.forEach(p => searchIndex.push({ type: 'Alumni', label: p.name, sub: p.role + ' @ ' + p.company, nav: 'home' }));
  FIELDS.forEach(f => searchIndex.push({ type: 'Field', label: f.title, sub: f.desc.slice(0, 60) + '...', nav: 'home' }));
  (TalentAI.candidates || []).forEach(c => {
    const m = c.member || {};
    searchIndex.push({ type: 'Candidate', label: m.name, sub: m.jobRole, nav: 'profile' });
  });
  ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Stripe', 'Airbnb', 'Uber', 'Databricks'].forEach(co =>
    searchIndex.push({ type: 'Company', label: co, sub: 'Placement partner', nav: 'results' })
  );
}

function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;
  buildSearchIndex();
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { dropdown.classList.add('hidden'); return; }
    const matches = searchIndex.filter(item =>
      (item.label || '').toLowerCase().includes(q) ||
      (item.sub || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q)
    ).slice(0, 8);
    if (!matches.length) {
      dropdown.innerHTML = '<div class="search-empty">No results found</div>';
    } else {
      dropdown.innerHTML = matches.map(m =>
        '<button type="button" class="search-item" data-nav="' + m.nav + '">' +
        '<span class="search-type">' + m.type + '</span>' +
        '<strong>' + m.label + '</strong>' +
        '<span class="search-sub">' + m.sub + '</span>' +
        '</button>'
      ).join('');
      dropdown.querySelectorAll('.search-item').forEach(item =>
        item.addEventListener('click', () => { navigateTo(item.dataset.nav); input.value = ''; dropdown.classList.add('hidden'); })
      );
    }
    dropdown.classList.remove('hidden');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) dropdown.classList.add('hidden');
  });
}

/* ── COUNTERS ── */
function initCounters() {
  const bar = document.querySelector('.stats-bar');
  if (bar && !bar.dataset.animated) {
    bar.dataset.animated = 'true';
    bar.querySelectorAll('[data-count]').forEach(el => animateCounter(el));
  }
}
function observeCounters() { initCounters(); }
function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isPct = el.dataset.percent === 'true';
  const dur = 2000, t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const val = Math.round(target * (1 - Math.pow(2, -10 * p)));
    el.textContent = prefix + (isPct ? val : val.toLocaleString()) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function updateDynamicStats(candidates) {
  const el = document.querySelector('[data-count="2400"]');
  if (el && candidates.length) el.dataset.count = String(1800 + candidates.length * 120);
}

/* ── DASHBOARD TABS ── */
function initDashboardTabs() {
  document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel)?.classList.add('active');
    });
  });
}

function updateFieldBanner() {
  const banner = document.getElementById('selected-field-banner');
  const field = TalentAI.selectedField;
  if (!banner) return;
  if (field) { banner.classList.remove('hidden'); banner.innerHTML = field.icon + ' Interview Field: <strong>' + field.title + '</strong>'; }
  else banner.classList.add('hidden');
}

/* ── DASHBOARD ── */
function renderDashboard(candidates) {
  const el = document.getElementById('dashboard-content');
  if (!el) return;
  if (!candidates.length) {
    el.innerHTML = '<div class="empty-state placeholder-layout card-3d"><div style="font-size:3rem;margin-bottom:1rem">\u{1F4CA}</div><h3>Dashboard Initializing</h3><p style="color:var(--text-secondary)">Connecting to data streams...</p></div>';
    return;
  }
  const total = candidates.length;
  const completed = candidates.filter(c => c.member?.status === 'COMPLETED').length;
  const avgM = Math.round(candidates.reduce((s, c) => s + (c.signals?.missionsCompleted || 0), 0) / total);
  const active = Math.floor(total * 1.4);
  const rows = candidates.slice(0, 5).map((c, i) => {
    const m = c.member || {};
    return '<tr><td><strong>#' + (i + 1) + '</strong></td><td><strong>' + m.name + '</strong></td><td>' + m.jobRole + '</td><td>' + (c.signals?.missionsCompleted || 0) + '/31</td><td><span class="status-pill">' + (c.signals?.missionsFirstTry || 0) + '</span></td></tr>';
  }).join('');
  const acts = candidates.slice(0, 4).map(c => '<li><span class="act-dot"></span>' + (c.member?.name) + ' completed Day ' + (c.signals?.missionsCompleted || 0) + ' mission review</li>').join('');
  el.innerHTML =
    '<div class="dashboard-grid">' +
    '<div class="dash-card card-3d"><h3>Total Candidates</h3><div class="dash-value">' + total + '</div><div class="dash-sub">Registered profiles</div></div>' +
    '<div class="dash-card card-3d"><h3>Cohort Completed</h3><div class="dash-value">' + completed + '</div><div class="dash-sub">' + Math.round(completed / total * 100) + '% completion</div></div>' +
    '<div class="dash-card card-3d"><h3>Avg Missions</h3><div class="dash-value">' + avgM + '</div><div class="dash-sub">Out of 31 days</div></div>' +
    '<div class="dash-card card-3d"><h3>Active Sessions</h3><div class="dash-value">' + active + '</div><div class="dash-sub">Live this week</div></div>' +
    '<div class="dash-card wide card-3d"><h3>Global Leaderboard Preview</h3><table class="candidate-table"><thead><tr><th>Rank</th><th>Name</th><th>Role</th><th>Missions</th><th>First-Try</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="dash-card wide card-3d"><h3>Recent Activity</h3><ul class="activity-list">' + acts + '</ul></div>' +
    '</div>';
}

/* ── LEADERBOARD ── */
function renderLeaderboard(candidates) {
  const el = document.getElementById('leaderboard-content');
  if (!el) return;
  const allUsers = LB_SEED.map(u => Object.assign({}, u));
  (candidates || []).forEach(c => {
    const m = c.member || {};
    if (!allUsers.find(u => u.name === m.name)) {
      allUsers.push({
        name: m.name, role: m.jobRole,
        score: Math.round(50 + (c.signals?.missionsCompleted || 0) / 31 * 40 + (c.signals?.missionsFirstTry || 0) / 31 * 10),
        missions: c.signals?.missionsCompleted || 0, firstTry: c.signals?.missionsFirstTry || 0,
        g: 'linear-gradient(135deg,#64748b,#94a3b8)'
      });
    }
  });
  allUsers.sort((a, b) => b.score - a.score);
  const top3 = allUsers.slice(0, 3);
  const rest = allUsers.slice(3, 10);
  const user = TalentAI.getUser();
  const yourRank = user ? (Math.floor(Math.random() * 6) + 5) : null;
  const ini = n => (n || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const podOrder = [top3[1], top3[0], top3[2]];
  const podClasses = ['rank-2', 'rank-1', 'rank-3'];
  const podEmoji = ['\u{1F948}', '\u{1F947}', '\u{1F949}'];
  const podNums = [2, 1, 3];

  const podHTML = podOrder.map((u, idx) => {
    if (!u) return '';
    const rc = podClasses[idx], em = podEmoji[idx], rn = podNums[idx];
    return '<div class="podium-card ' + rc + ' card-3d">' +
      (rc === 'rank-1' ? '<div class="podium-crown">\u{1F451}</div>' : '') +
      '<div class="podium-rank-badge">' + em + '</div>' +
      '<div class="podium-avatar">' + ini(u.name) + '</div>' +
      '<div class="podium-name">' + u.name + '</div>' +
      '<div class="podium-role">' + u.role + '</div>' +
      '<div class="podium-score">' + u.score + '</div>' +
      '<div class="podium-label">Cohort Score \u00B7 #' + rn + '</div>' +
      '</div>';
  }).join('');

  const yourHTML = user
    ? '<div class="leaderboard-you-anchor">' +
    '<div class="leaderboard-section-label">\u{1F4CD} Your Standing</div>' +
    '<div class="lb-row is-you">' +
    '<div class="lb-rank-num top-ten">#' + yourRank + '</div>' +
    '<div class="lb-avatar" style="background:var(--gradient-brand)">' + ini(user.name) + '</div>' +
    '<div class="lb-info"><div class="lb-name">' + user.name + ' <span class="you-badge">YOU</span></div><div class="lb-role">Cohort Scholar</div></div>' +
    '<div class="lb-score-col"><span class="lb-score">' + (78 + Math.floor(Math.random() * 12)) + '</span><span class="lb-missions">28/31 missions</span></div>' +
    '</div>' +
    '</div>'
    : '';

  const listHTML = rest.map((u, i) =>
    '<div class="lb-row">' +
    '<div class="lb-rank-num top-ten">#' + (i + 4) + '</div>' +
    '<div class="lb-avatar" style="background:' + (u.g || 'var(--gradient-brand)') + '">' + ini(u.name) + '</div>' +
    '<div class="lb-info"><div class="lb-name">' + u.name + '</div><div class="lb-role">' + u.role + '</div></div>' +
    '<div class="lb-score-col"><span class="lb-score">' + u.score + '</span><span class="lb-missions">' + u.missions + '/31 missions</span></div>' +
    '</div>'
  ).join('');

  el.innerHTML =
    '<div class="leaderboard-podium">' + podHTML + '</div>' +
    yourHTML +
    '<div class="leaderboard-section-label">\u{1F3C5} Full Standings</div>' +
    '<div class="leaderboard-list">' + listHTML + '</div>';
}

/* ── RESULTS ── */
function renderResults(candidates) {
  const el = document.getElementById('results-grid');
  if (!el) return;
  el.innerHTML = PLACEMENTS.map(p => {
    const ini = p.name.split(' ').map(n => n[0]).join('');
    return '<div class="result-card card-3d">' +
      '<div class="result-card-header">' +
      '<div class="result-avatar" style="background:var(--gradient-brand)">' + ini + '</div>' +
      '<div class="result-info"><h3>' + p.name + '</h3><p>' + p.role + '</p></div>' +
      '</div>' +
      '<div class="result-badge">\u2713 Selected at ' + p.company + '</div>' +
      '<div class="result-score"><span>Interview Score</span><span>' + p.score + '%</span></div>' +
      '<div class="result-score"><span>Package</span><span>\u20B9' + p.salary + '</span></div>' +
      '<div class="result-score"><span>Missions</span><span>31/31</span></div>' +
      '</div>';
  }).join('');
}

/* ── PROFILE ── */
function setDefaultProfile(candidates) { /* called by legacy code — profile renders on navigate */ }

function renderProfile() {
  const el = document.getElementById('profile-content');
  if (!el) return;
  const user = TalentAI.getUser();
  if (!user) {
    el.innerHTML = '<div class="empty-state placeholder-layout card-3d" style="padding:4rem 2rem;text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:1rem">\u{1F464}</div>' +
      '<h3 style="font-size:1.5rem;margin-bottom:0.5rem;color:var(--text-primary)">Profile Not Active</h3>' +
      '<p style="color:var(--text-secondary);max-width:400px;margin:0 auto">Sign in to view your 31-day cohort history and personalized report.</p>' +
      '</div>';
    return;
  }
  const ini = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  let activity = JSON.parse(localStorage.getItem('talentai_activity') || '[]');
  if (!activity.length) {
    activity = [
      { action: 'Account Created', time: user.joined },
      { action: 'Viewed Career Predictor', time: new Date(Date.now() - 60000).toISOString() },
      { action: 'Browsed Results Page', time: new Date(Date.now() - 30000).toISOString() },
      { action: 'Viewed Profile Page', time: new Date().toISOString() }
    ];
    localStorage.setItem('talentai_activity', JSON.stringify(activity));
  }
  const last = activity[activity.length - 1];
  if (!last || last.action !== 'Viewed Profile Page') {
    activity.push({ action: 'Viewed Profile Page', time: new Date().toISOString() });
    localStorage.setItem('talentai_activity', JSON.stringify(activity));
  }
  const actHtml = activity.slice(-8).reverse().map(a => {
    const d = new Date(a.time);
    return '<li><span class="mission-status pass">\u2713</span>' + a.action +
      '<small style="color:var(--text-muted);margin-left:auto">' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</small></li>';
  }).join('');

  el.innerHTML =
    '<div class="profile-layout">' +
    '<div class="profile-sidebar card-3d">' +
    '<div class="profile-avatar-lg" style="background:var(--gradient-brand)">' + ini + '</div>' +
    '<h3>' + user.name + '</h3><p class="role">Cohort Scholar</p>' +
    '<div class="profile-tags"><span class="profile-tag">31-Day Cohort</span><span class="profile-tag">Top 5%</span></div>' +
    '</div>' +
    '<div class="profile-main">' +
    '<div class="profile-section card-3d"><h4>Personal Information</h4>' +
    '<div class="info-row"><span>Email</span><span>' + user.email + '</span></div>' +
    '<div class="info-row"><span>Name</span><span>' + user.name + '</span></div>' +
    '<div class="info-row"><span>Joined</span><span>' + new Date(user.joined).toLocaleDateString() + '</span></div>' +
    '<div class="info-row"><span>Curated Report</span><span style="color:var(--success);font-weight:700">Available \u2713</span></div>' +
    '</div>' +
    '<div class="profile-section card-3d"><h4>Cohort Performance</h4>' +
    '<div class="info-row"><span>Commit Days</span><span>31/31</span></div>' +
    '<div class="info-row"><span>Missions Done</span><span>31</span></div>' +
    '<div class="info-row"><span>First-Try Passes</span><span>30</span></div>' +
    '</div>' +
    '<div class="profile-section card-3d"><h4>Mission History</h4><ul class="mission-list">' +
    '<li><span class="mission-status pass">\u2713</span>Day 31: Career Agent Deployment</li>' +
    '<li><span class="mission-status pass">\u2713</span>Day 30: System Design Interview</li>' +
    '<li><span class="mission-status pass">\u2713</span>Day 29: Advanced Prompt Engineering</li>' +
    '<li><span class="mission-status pass">\u2713</span>Day 28: Multi-Agent Orchestration</li>' +
    '<li><span class="mission-status pass">\u2713</span>Day 27: RAG Pipeline Optimization</li>' +
    '</ul></div>' +
    '<div class="profile-section card-3d"><h4>Recent Activity on Platform</h4>' +
    '<ul class="mission-list activity-log">' + actHtml + '</ul>' +
    '</div>' +
    '</div>' +
    '</div>';
}

/* ── PROFILE DRAWER ── */
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
    body.innerHTML = '<p class="drawer-guest">Sign in to access your profile, saved interviews, and career predictions.</p>' +
      '<button class="btn-primary drawer-btn" onclick="navigateTo(\'auth\');closeProfileDrawer()">Sign In</button>' +
      '<button class="btn-secondary drawer-btn" style="margin-top:0.5rem" onclick="navigateTo(\'auth\');document.querySelector(\'.auth-tab[data-panel=panel-signup]\')?.click();closeProfileDrawer()">Create Account</button>';
    return;
  }
  const ini = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  body.innerHTML =
    '<div class="drawer-user"><div class="drawer-avatar">' + ini + '</div><h4>' + user.name + '</h4><p>' + user.email + '</p></div>' +
    '<nav class="drawer-nav">' +
    '<button type="button" onclick="navigateTo(\'profile\');closeProfileDrawer()">\u{1F464} My Profile</button>' +
    '<button type="button" onclick="navigateTo(\'dashboard\');closeProfileDrawer()">\u{1F4CA} Dashboard</button>' +
    '<button type="button" onclick="navigateTo(\'results\');closeProfileDrawer()">\u{1F3C6} Results</button>' +
    '<button type="button" onclick="requireAuth(\'interview\');closeProfileDrawer()">\u{1F4AC} Take Interview</button>' +
    '<button type="button" onclick="navigateTo(\'contact\');closeProfileDrawer()">\u{1F4DE} Contact</button>' +
    '</nav>' +
    '<button class="drawer-logout" id="drawer-logout-btn">Sign Out</button>';
  document.getElementById('drawer-logout-btn')?.addEventListener('click', logout);
}

/* ── CONTACT FORM ── */
function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Message Sent \u2713'; btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Send Message'; btn.disabled = false; e.target.reset(); }, 3000);
  });
}

/* ── MOBILE MENU ── */
function initMobileMenu() {
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () =>
    document.getElementById('mobile-nav-overlay')?.classList.toggle('open')
  );
  document.getElementById('mobile-nav-close')?.addEventListener('click', closeMobileNav);
  document.getElementById('mobile-nav-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'mobile-nav-overlay') closeMobileNav();
  });
}
function closeMobileNav() { document.getElementById('mobile-nav-overlay')?.classList.remove('open'); }

/* ── ATS GRADER ── */
function initATSGrader() {
  const btn = document.getElementById('ats-scan-btn');
  const resEl = document.getElementById('ats-results');
  const scoreV = document.getElementById('ats-score-val');
  const scoreB = document.getElementById('ats-score-bar');
  const bdown = document.getElementById('ats-breakdown');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.textContent = 'Analyzing...'; btn.disabled = true;
    setTimeout(() => {
      resEl?.classList.remove('hidden');
      const overall = Math.floor(Math.random() * 8) + 82;
      if (scoreV) scoreV.textContent = overall + '/100';
      requestAnimationFrame(() => { if (scoreB) scoreB.style.width = overall + '%'; });
      if (bdown) {
        bdown.innerHTML = ATS_FIELDS.map(f =>
          '<div class="ats-field-row">' +
          '<span class="ats-field-name">' + f.name + '</span>' +
          '<div style="flex:1;margin:0 1rem">' +
          '<div style="height:6px;background:rgba(15,23,42,0.06);border-radius:999px;overflow:hidden">' +
          '<div style="height:100%;width:' + f.score + '%;border-radius:999px;background:' +
          (f.cls === 'high' ? 'var(--success)' : f.cls === 'mid' ? 'var(--warning)' : 'var(--error)') +
          ';transition:width 1s ease"></div>' +
          '</div></div>' +
          '<span class="ats-field-score ' + f.cls + '">' + f.score + '%</span>' +
          '</div>'
        ).join('');
      }
      btn.textContent = 'Re-Scan'; btn.disabled = false;
    }, 1200);
  });
}

/* ── SALARY ROLEPLAY ── */
function initSalaryRoleplay() {
  const startBtn = document.getElementById('salary-start-btn');
  const sendBtn = document.getElementById('salary-send-btn');
  const chatEl = document.getElementById('salary-chat');
  const userInput = document.getElementById('salary-user-input');
  if (!startBtn || !chatEl) return;

  function addMsg(text, who) {
    const p = document.createElement('p');
    p.innerHTML = '<strong>' + who + ':</strong> ' + text;
    p.style.borderLeft = who === 'AI Recruiter' ? '3px solid var(--primary)' : '3px solid var(--success)';
    chatEl.appendChild(p);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  startBtn.addEventListener('click', () => {
    salaryTurn = 0;
    chatEl.innerHTML = '';
    const base = document.getElementById('salary-base')?.value.trim() || '\u20B925 LPA';
    const role = document.getElementById('salary-role')?.value.trim() || 'SDE-2';
    addMsg(SALARY_SCRIPT[0](base, role), 'AI Recruiter');
    salaryTurn = 1;
    if (userInput) userInput.focus();
  });

  function sendMsg() {
    const text = userInput?.value.trim();
    if (!text) return;
    addMsg(text, 'You');
    if (userInput) userInput.value = '';
    const reply = SALARY_SCRIPT[salaryTurn] ? SALARY_SCRIPT[salaryTurn]() : 'Thank you for the discussion! We will follow up with a written offer shortly.';
    setTimeout(() => { addMsg(reply, 'AI Recruiter'); salaryTurn++; }, 800);
  }

  sendBtn?.addEventListener('click', sendMsg);
  userInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
}

/* ── 3D CANVAS PARTICLE MESH ENGINE ── */
function initCanvasMesh() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', e => {
    targetMouseX = (e.clientX - width / 2) * 0.15;
    targetMouseY = (e.clientY - height / 2) * 0.15;
  });

  const particleCount = 75;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.4 + 0.2,
      color: i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#8b5cf6' : '#ec4899')
    });
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      p1.x += p1.vx;
      p1.y += p1.vy;

      if (p1.x < 0 || p1.x > width) p1.vx *= -1;
      if (p1.y < 0 || p1.y > height) p1.vy *= -1;

      const renderX = p1.x + mouseX * (p1.r * 0.4);
      const renderY = p1.y + mouseY * (p1.r * 0.4);

      ctx.beginPath();
      ctx.arc(renderX, renderY, p1.r, 0, Math.PI * 2);
      ctx.fillStyle = p1.color;
      ctx.globalAlpha = p1.baseAlpha;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const rX2 = p2.x + mouseX * (p2.r * 0.4);
        const rY2 = p2.y + mouseY * (p2.r * 0.4);

        const dx = renderX - rX2;
        const dy = renderY - rY2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(renderX, renderY);
          ctx.lineTo(rX2, rY2);
          ctx.strokeStyle = '#38bdf8';
          ctx.globalAlpha = (1 - dist / 130) * 0.2;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1.0;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ── 3D CARD TILT & GLARE REFLECTION CONTROLLER ── */
function initCardTilt() {
  function attachTilt(card) {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = 'true';

    if (!card.querySelector('.card-shine')) {
      const shine = document.createElement('div');
      shine.className = 'card-shine';
      card.appendChild(shine);
    }

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const deltaX = (x - centerX) / centerX;
      const deltaY = (y - centerY) / centerY;

      const rotateX = (-deltaY * 8).toFixed(2);
      const rotateY = (deltaX * 8).toFixed(2);

      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  }

  document.querySelectorAll('.card-3d').forEach(attachTilt);

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.card-3d').forEach(attachTilt);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ── SOFT GLASS MOUSE GLARE REFLECTION CONTROLLER (NO 3D ROTATION TILT) ── */
function initGlassHover() {
  function attachGlass(card) {
    if (card.dataset.glassBound) return;
    card.dataset.glassBound = 'true';

    if (!card.querySelector('.card-shine')) {
      const shine = document.createElement('div');
      shine.className = 'card-shine';
      card.appendChild(shine);
    }

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
    });
  }

  document.querySelectorAll('.glass-hover, #chat-panel').forEach(attachGlass);

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.glass-hover, #chat-panel').forEach(attachGlass);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ── FIX: data-nav ANCHOR LINKS (footer, view-all-partners, etc.) ── */
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[data-nav]');
  if (!anchor) return;
  e.preventDefault();
  const target = anchor.dataset.nav;
  if (target) navigateTo(target);
});

/* ── FLOATING 3D PARTNER COMPANY BRAND CAPSULES ENGINE ── */
function initFloating3DObjects() {
  const scene = document.querySelector('.floating-3d-scene');
  if (!scene) return;
  const objects = [...scene.querySelectorAll('.float-obj-3d')];
  if (!objects.length) return;

  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let rafId = null;

  window.addEventListener('mousemove', e => {
    targetX = (e.clientX - window.innerWidth  / 2);
    targetY = (e.clientY - window.innerHeight / 2);
  });

  function tick() {
    mouseX += (targetX - mouseX) * 0.06;
    mouseY += (targetY - mouseY) * 0.06;

    objects.forEach(obj => {
      const depth  = parseFloat(obj.dataset.depth || '0.2');
      const moveX  = (mouseX * depth).toFixed(2);
      const moveY  = (mouseY * depth).toFixed(2);
      const rotX   = (-mouseY * depth * 0.05).toFixed(2);
      const rotY   = ( mouseX * depth * 0.05).toFixed(2);
      obj.style.transform = `translate3d(${moveX}px,${moveY}px,${depth * 60}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });

    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

/* ── INSTANT HACKATHON JUDGE DEMO SANDBOX MODAL ── */
function initJudgeDemoModal() {
  const modal      = document.getElementById('demo-modal');
  const triggerBtn = document.getElementById('btn-demo-judge');
  const closeBtn   = document.getElementById('demo-close');
  const overlay    = document.getElementById('demo-modal-overlay');
  const sampleBtn  = document.getElementById('btn-sample-ans');
  const evalBtn    = document.getElementById('btn-eval-demo');
  const inputEl    = document.getElementById('demo-user-answer');
  const resultsEl  = document.getElementById('demo-results');

  if (!modal || !triggerBtn) return;

  const openModal  = () => modal.classList.remove('hidden');
  const closeModal = () => { modal.classList.add('hidden'); if (resultsEl) resultsEl.classList.add('hidden'); }

  triggerBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click',  closeModal);
  overlay?.addEventListener('click',   closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  sampleBtn?.addEventListener('click', () => {
    if (inputEl) inputEl.value = 'RAG uses vector databases (Pinecone/FAISS) to index text chunk embeddings. Queries retrieve top-k semantically similar chunks via cosine similarity, dynamically injecting them into the LLM context window while managing token budget with sliding-window truncation to handle high-throughput loads.';
  });

  evalBtn?.addEventListener('click', () => {
    const text = inputEl?.value.trim();
    if (!text) { if (inputEl) { inputEl.style.borderColor = '#ef4444'; setTimeout(() => { inputEl.style.borderColor = ''; }, 1500); } return; }

    evalBtn.disabled = true;
    evalBtn.textContent = '⚡ Evaluating with AI…';

    setTimeout(() => {
      evalBtn.disabled = false;
      evalBtn.textContent = 'Evaluate Answer Now 🚀';
      if (resultsEl) resultsEl.classList.remove('hidden');
      resultsEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1100);
  });
}
