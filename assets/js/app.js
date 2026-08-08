/**
 * TalentAI — Site UI: navigation, carousel, fields, dashboard, profile
 */
window.TalentAI = {
  selectedField: null,
  activeProfile: null,
  candidates: [],

  onCandidatesLoaded(list) {
    this.candidates = list;
    this.renderDashboard(list);
    this.renderResults(list);
    this.setDefaultProfile(list);
  },

  onCandidateSelected(candidate) {
    this.activeProfile = candidate;
    this.renderProfile(candidate);
  },

  onFeedbackRendered(feedback) {
    sessionStorage.setItem('lastFeedback', JSON.stringify(feedback));
  }
};

const PLACEMENTS = [
  {
    name: 'Sarah Johnson',
    role: 'Senior Data Engineer',
    company: 'Google',
    companyClass: 'google',
    salary: '₹42 LPA',
    bg: '#eff6ff',
    headline: 'From Cohort to <em>Google</em>',
    text: 'Sarah completed 30/31 missions with strong RAG and vector DB scores. Our AI interview flagged her embedding expertise — she cleared Google\'s L4 loop in one attempt.',
    tags: ['RAG Expert', 'Day 31 Capstone']
  },
  {
    name: 'Alex Turner',
    role: 'Backend Software Engineer',
    company: 'Amazon',
    companyClass: 'amazon',
    salary: '₹38 LPA',
    bg: '#fff7ed',
    headline: 'Alex Turner lands <em>Amazon</em> SDE-2',
    text: 'Backend specialist with 5 yrs experience. Adaptive interview covered MCP, multi-agent orchestration, and API design — exactly what Amazon\'s panel tested.',
    tags: ['Backend', 'MCP & Agents']
  },
  {
    name: 'Emily Chen',
    role: 'AI Engineer',
    company: 'Microsoft',
    companyClass: 'microsoft',
    salary: '₹45 LPA',
    bg: '#f0fdf4',
    headline: 'Emily Chen → <em>Microsoft</em> AI',
    text: 'Perfect cohort record: 31/31 missions first-try. Interview agent validated LangChain agents, function calling, and production RAG pipelines.',
    tags: ['AI Engineer', '100% Score']
  },
  {
    name: 'David Miller',
    role: 'Business Analyst → AI PM',
    company: 'Meta',
    companyClass: 'meta',
    salary: '₹36 LPA',
    bg: '#f5f3ff',
    headline: 'Career pivot success at <em>Meta</em>',
    text: 'Non-traditional background validated through curriculum-aware questioning. Demonstrated prompt engineering and product thinking across 8 interview rounds.',
    tags: ['Career Switch', 'Product AI']
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

let carouselIndex = 0;
let carouselTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCarousel();
  initFields();
  initContactForm();
  initMobileMenu();
  navigateTo('home');
});

function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const section = el.dataset.nav;
      navigateTo(section);
      if (section === 'interview') {
        InterviewApp.animateProgressOnMount();
      }
    });
  });

  document.getElementById('logo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('home');
  });

  document.getElementById('header-cta')?.addEventListener('click', () => navigateTo('interview'));
  document.getElementById('avatar-btn')?.addEventListener('click', () => navigateTo('profile'));
}

function navigateTo(sectionId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${sectionId}`)?.classList.add('active');

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === sectionId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (sectionId === 'interview') {
    updateFieldBanner();
  }
}

function initCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  if (!track) return;

  track.innerHTML = PLACEMENTS.map((p, i) => `
    <div class="carousel-slide" style="--slide-bg: ${p.bg}">
      <div class="slide-content">
        <h2>${p.headline}</h2>
        <p>${p.text}</p>
        <div class="slide-meta">
          ${p.tags.map(t => `<span class="slide-tag">${t}</span>`).join('')}
          <span class="slide-tag highlight">✓ Placed ${new Date().getFullYear()}</span>
        </div>
      </div>
      <div class="slide-visual">
        <div class="placement-card">
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

  startCarouselAutoplay();

  const carousel = document.getElementById('hero-carousel');
  carousel?.addEventListener('mouseenter', stopCarouselAutoplay);
  carousel?.addEventListener('mouseleave', startCarouselAutoplay);
}

function goToSlide(index) {
  const total = PLACEMENTS.length;
  carouselIndex = ((index % total) + total) % total;
  const track = document.getElementById('carousel-track');
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;

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
  if (saved) {
    try { window.TalentAI.selectedField = JSON.parse(saved); } catch (_) {}
  }

  grid.innerHTML = FIELDS.map(f => `
    <div class="field-card${window.TalentAI.selectedField?.id === f.id ? ' selected' : ''}"
         data-field-id="${f.id}"
         style="--field-color: ${f.color}; --field-bg: ${f.bg}">
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
      const field = FIELDS.find(f => f.id === card.dataset.fieldId);
      window.TalentAI.selectedField = field;
      sessionStorage.setItem('selectedField', JSON.stringify(field));
      document.getElementById('start-interview-btn').disabled = false;
    });
  });

  document.getElementById('start-interview-btn')?.addEventListener('click', () => {
    if (window.TalentAI.selectedField) navigateTo('interview');
  });

  if (window.TalentAI.selectedField) {
    document.getElementById('start-interview-btn').disabled = false;
  }
}

function updateFieldBanner() {
  const banner = document.getElementById('selected-field-banner');
  const field = window.TalentAI.selectedField;
  if (!banner) return;
  if (field) {
    banner.classList.remove('hidden');
    banner.innerHTML = `${field.icon} Interview Field: <strong>${field.title}</strong>`;
  } else {
    banner.classList.add('hidden');
  }
}

function renderDashboard(candidates) {
  const el = document.getElementById('dashboard-content');
  if (!el) return;

  const total = candidates.length;
  const completed = candidates.filter(c => c.member?.status === 'COMPLETED').length;
  const avgMissions = total
    ? Math.round(candidates.reduce((s, c) => s + (c.signals?.missionsCompleted || 0), 0) / total)
    : 0;

  el.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-card">
        <h3>Total Candidates</h3>
        <div class="dash-value">${total}</div>
        <div class="dash-sub">Registered profiles</div>
      </div>
      <div class="dash-card">
        <h3>Cohort Completed</h3>
        <div class="dash-value">${completed}</div>
        <div class="dash-sub">${total ? Math.round(completed / total * 100) : 0}% completion rate</div>
      </div>
      <div class="dash-card">
        <h3>Avg Missions</h3>
        <div class="dash-value">${avgMissions}</div>
        <div class="dash-sub">Out of 31 curriculum days</div>
      </div>
      <div class="dash-card wide">
        <h3>Candidate Overview</h3>
        <table class="candidate-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Experience</th><th>Missions</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${candidates.map(c => {
              const m = c.member || {};
              return `<tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.jobRole}</td>
                <td>${m.yearsExperience} yrs</td>
                <td>${c.signals?.missionsCompleted || 0}/31</td>
                <td>${m.status || '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderResults(candidates) {
  const el = document.getElementById('results-grid');
  if (!el) return;

  const companies = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Flipkart', 'Stripe'];
  const salaries = ['₹42 LPA', '₹38 LPA', '₹45 LPA', '₹36 LPA', '₹32 LPA', '₹40 LPA'];

  el.innerHTML = candidates.slice(0, 6).map((c, i) => {
    const m = c.member || {};
    const initials = m.name?.split(' ').map(n => n[0]).join('') || '?';
    const score = Math.min(98, 75 + (c.signals?.missionsFirstTry || 0));
    return `
      <div class="result-card">
        <div class="result-card-header">
          <div class="result-avatar">${initials}</div>
          <div class="result-info">
            <h3>${m.name}</h3>
            <p>${m.jobRole}</p>
          </div>
        </div>
        <div class="result-badge">✓ Selected at ${companies[i % companies.length]}</div>
        <div class="result-score"><span>Interview Score</span><span>${score}%</span></div>
        <div class="result-score"><span>Package</span><span>${salaries[i % salaries.length]}</span></div>
        <div class="result-score"><span>Missions Completed</span><span>${c.signals?.missionsCompleted || 0}/31</span></div>
      </div>
    `;
  }).join('');
}

function setDefaultProfile(candidates) {
  const alex = candidates.find(c => c.member?.name === 'Alex Turner') || candidates[1] || candidates[0];
  if (alex) {
    window.TalentAI.activeProfile = alex;
    renderProfile(alex);
  }
}

function renderProfile(candidate) {
  const el = document.getElementById('profile-content');
  if (!el || !candidate) return;

  const m = candidate.member || {};
  const initials = m.name?.split(' ').map(n => n[0]).join('') || '?';
  const missions = candidate.missions || [];

  el.innerHTML = `
    <div class="profile-layout">
      <div class="profile-sidebar">
        <div class="profile-avatar-lg">${initials}</div>
        <h3>${m.name}</h3>
        <p class="role">${m.jobRole}</p>
        <div class="profile-tags">
          <span class="profile-tag">${m.education || 'B.Tech'}</span>
          <span class="profile-tag">${m.yearsExperience} yrs exp</span>
          <span class="profile-tag">${m.status}</span>
        </div>
      </div>
      <div class="profile-main">
        <div class="profile-section">
          <h4>Personal Information</h4>
          <div class="info-row"><span>Candidate ID</span><span>${m.id}</span></div>
          <div class="info-row"><span>Full Name</span><span>${m.name}</span></div>
          <div class="info-row"><span>Job Role</span><span>${m.jobRole}</span></div>
          <div class="info-row"><span>Education</span><span>${m.education || '—'}</span></div>
          <div class="info-row"><span>Experience</span><span>${m.yearsExperience} years</span></div>
        </div>
        <div class="profile-section">
          <h4>Cohort Performance</h4>
          <div class="info-row"><span>Commit Days</span><span>${candidate.signals?.commitDays || 0}/31</span></div>
          <div class="info-row"><span>Missions Completed</span><span>${candidate.signals?.missionsCompleted || 0}</span></div>
          <div class="info-row"><span>First-Try Passes</span><span>${candidate.signals?.missionsFirstTry || 0}</span></div>
        </div>
        <div class="profile-section">
          <h4>Mission History</h4>
          <ul class="mission-list">
            ${missions.slice(0, 8).map(ms => `
              <li>
                <span class="mission-status ${ms.skipped ? 'skip' : 'pass'}">${ms.skipped ? '—' : '✓'}</span>
                <span>Day ${ms.day}: ${ms.title}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  document.getElementById('avatar-btn').textContent = initials;
}

function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Message Sent ✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'Send Message';
      btn.disabled = false;
      e.target.reset();
    }, 3000);
  });
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('site-nav');
  btn?.addEventListener('click', () => nav?.classList.toggle('collapsed'));
}
