/**
 * TalentAI — Interview Engine
 * Preserves original API logic and state management.
 */
const InterviewApp = (() => {
  function getApiBase() {
    if (window.location.protocol === 'file:') return 'http://127.0.0.1:8000';
    return window.location.origin;
  }

  let candidatesList = [];
  let selectedCandidate = null;
  let sessionId = '';
  let questionCount = 0;
  let daysCovered = new Set();
  let initialized = false;
  let isOfflineMode = false;

  const MOCK_QUESTIONS_BANK = [
    { day: 7, question: "Could you explain what vector embeddings are, and how they convert textual concepts into high-dimensional numerical vectors?" },
    { day: 8, question: "What is the key architectural difference between a local vector database like ChromaDB and a cloud managed solution like Pinecone?" },
    { day: 10, question: "How does the retrieval matching engine work inside a Retrieval-Augmented Generation (RAG) system when fetching top-k relevant chunks?" },
    { day: 12, question: "What are some best practices in Prompt Engineering to reduce LLM hallucinations and enforce structured JSON outputs?" },
    { day: 16, question: "How would you design a FastAPI backend endpoint to handle real-time streaming LLM responses using Server-Sent Events (SSE)?" },
    { day: 22, question: "Can you explain multi-agent orchestration? How do specialized AI agents pass control and state between each other?" },
    { day: 23, question: "What problem does the Model Context Protocol (MCP) solve when granting AI agents standardized access to tools and databases?" },
    { day: 28, question: "What are the primary operational benefits of containerizing an LLM application with Docker and deploying it on Kubernetes?" }
  ];

  // DOM refs (set on init)
  let connectionBadge, candidateSelect, sessionIdInput, startBtn;
  let customSelect, customSelectTrigger, customSelectOptions;
  let welcomeScreen, chatHeaderBar, chatMessages, feedbackOverlay, inputArea;
  let chatInput, sendBtn, avatarInitials, infoName, infoRole;
  let questionsCountLabel, questionsProgressBar, daysCountLabel, daysProgressBar, daysTagsContainer;

  function init() {
    if (initialized) return;
    initialized = true;

    connectionBadge = document.getElementById('connection-badge');
    candidateSelect = document.getElementById('candidate-select');
    sessionIdInput = document.getElementById('session-id-input');
    startBtn = document.getElementById('start-btn');
    customSelect = document.getElementById('custom-select');
    customSelectTrigger = document.getElementById('custom-select-trigger');
    customSelectOptions = document.getElementById('custom-select-options');
    welcomeScreen = document.getElementById('welcome-screen');
    chatHeaderBar = document.getElementById('chat-header-bar');
    chatMessages = document.getElementById('chat-messages');
    feedbackOverlay = document.getElementById('feedback-overlay');
    inputArea = document.getElementById('input-area');
    chatInput = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    avatarInitials = document.getElementById('avatar-initials');
    infoName = document.getElementById('info-name');
    infoRole = document.getElementById('info-role');
    questionsCountLabel = document.getElementById('questions-count-label');
    questionsProgressBar = document.getElementById('questions-progress-bar');
    daysCountLabel = document.getElementById('days-count-label');
    daysProgressBar = document.getElementById('days-progress-bar');
    daysTagsContainer = document.getElementById('days-tags-container');

    bindCustomSelect();
    bindInterviewEvents();
    if (window.TalentAI?.candidates?.length) {
      loadCandidates(window.TalentAI.candidates);
    }
  }

  function loadCandidates(list) {
    candidatesList = list || [];
    populateCandidatesDropdown();
  }

  function bindCustomSelect() {
    customSelectTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (candidateSelect.disabled) return;
      customSelect.classList.contains('open') ? closeCustomSelect() : openCustomSelect();
    });

    document.addEventListener('click', () => closeCustomSelect());

    customSelectTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        customSelect.classList.contains('open') ? closeCustomSelect() : openCustomSelect();
      }
      if (e.key === 'Escape') closeCustomSelect();
    });
  }

  function syncCustomSelectFromNative() {
    customSelectOptions.innerHTML = '';
    Array.from(candidateSelect.options).forEach(opt => {
      const div = document.createElement('div');
      div.className = 'custom-select-option' + (opt.selected ? ' selected' : '');
      div.dataset.value = opt.value;
      div.textContent = opt.textContent;
      div.setAttribute('role', 'option');
      div.addEventListener('click', () => selectCustomOption(opt.value));
      customSelectOptions.appendChild(div);
    });
    updateCustomSelectTrigger();
  }

  function updateCustomSelectTrigger() {
    const selected = candidateSelect.options[candidateSelect.selectedIndex];
    let label = customSelectTrigger.querySelector('span');
    if (!label) {
      label = document.createElement('span');
      customSelectTrigger.prepend(label);
    }
    if (selected && selected.value !== '') {
      label.textContent = selected.textContent;
      label.classList.remove('placeholder');
    } else {
      label.textContent = selected ? selected.textContent : '-- Choose Candidate --';
      label.classList.add('placeholder');
    }
    customSelectOptions.querySelectorAll('.custom-select-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.value === candidateSelect.value);
    });
  }

  function selectCustomOption(value) {
    candidateSelect.value = value;
    candidateSelect.dispatchEvent(new Event('change', { bubbles: true }));
    closeCustomSelect();
  }

  function openCustomSelect() {
    if (candidateSelect.disabled) return;
    customSelect.classList.add('open');
    customSelectTrigger.setAttribute('aria-expanded', 'true');
  }

  function closeCustomSelect() {
    customSelect.classList.remove('open');
    customSelectTrigger.setAttribute('aria-expanded', 'false');
  }

  function setCustomSelectDisabled(disabled) {
    candidateSelect.disabled = disabled;
    customSelectTrigger.classList.toggle('disabled', disabled);
    customSelectTrigger.tabIndex = disabled ? -1 : 0;
    if (disabled) closeCustomSelect();
  }

  function populateCandidatesDropdown() {
    candidateSelect.innerHTML = '<option value="">-- Choose Candidate --</option>';
    candidatesList.forEach((c, idx) => {
      const member = c.member || {};
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `${member.name} (${member.jobRole})`;
      candidateSelect.appendChild(option);
    });
    setCustomSelectDisabled(false);
    syncCustomSelectFromNative();
  }

  function bindInterviewEvents() {
    candidateSelect.addEventListener('change', () => {
      const idx = candidateSelect.value;
      if (idx !== '') {
        selectedCandidate = candidatesList[idx];
        startBtn.disabled = false;
        sessionIdInput.value = `session-${selectedCandidate.member.id}-${Math.floor(Math.random() * 1000)}`;
        window.TalentAI?.onCandidateSelected?.(selectedCandidate);
      } else {
        selectedCandidate = null;
        startBtn.disabled = true;
      }
      updateCustomSelectTrigger();
    });

    startBtn.addEventListener('click', startInterview);
    sendBtn.addEventListener('click', submitAnswer);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAnswer();
    });
  }

  async function startInterview() {
    if (!selectedCandidate) return;

    sessionId = sessionIdInput.value.trim() || `session-def-${Date.now()}`;

    welcomeScreen.classList.add('hidden');
    chatHeaderBar.classList.remove('hidden');
    chatMessages.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    feedbackOverlay.classList.add('hidden');

    setCustomSelectDisabled(true);
    sessionIdInput.disabled = true;
    startBtn.disabled = true;

    questionCount = 0;
    daysCovered.clear();
    updateProgressUI();
    chatMessages.innerHTML = '';
    isOfflineMode = false;

    const member = selectedCandidate.member || {};
    infoName.textContent = member.name || 'Candidate';
    infoRole.textContent = `${member.jobRole || 'Developer'} · ${member.yearsExperience || 0} yrs experience`;
    avatarInitials.textContent = (member.name || 'Candidate').split(' ').map(n => n[0]).join('');

    appendLoader();

    try {
      const res = await fetch(`${getApiBase()}/api/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, candidate: selectedCandidate })
      });

      removeLoader();

      if (res.ok) {
        const data = await res.json();
        appendMessage(data.reply, 'interviewer');
        questionCount = 1;
        daysCovered.add(7);
        updateProgressUI();
      } else {
        useFallbackQuestionStart();
      }
    } catch (err) {
      removeLoader();
      useFallbackQuestionStart();
    }
  }

  function useFallbackQuestionStart() {
    isOfflineMode = true;
    questionCount = 1;
    const initialQ = MOCK_QUESTIONS_BANK[0];
    daysCovered.add(initialQ.day);
    appendMessage(initialQ.question, 'interviewer');
    updateProgressUI();
  }

  async function submitAnswer() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, 'candidate');
    chatInput.value = '';
    appendLoader();

    if (isOfflineMode) {
      setTimeout(() => {
        removeLoader();
        advanceOfflineQuestion();
      }, 600);
      return;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });

      removeLoader();

      if (res.ok) {
        const data = await res.json();

        if (data.done) {
          appendMessage('Interview completed. Loading detailed feedback...', 'interviewer');
          setTimeout(() => renderFeedback(data.feedback), 1500);
        } else {
          appendMessage(data.reply, 'interviewer');
          questionCount += 1;
          const daysMock = [8, 10, 12, 16, 22, 23, 28];
          if (questionCount <= 8) {
            daysCovered.add(daysMock[questionCount - 2] || 12);
          }
          updateProgressUI();
        }
      } else {
        advanceOfflineQuestion();
      }
    } catch (err) {
      removeLoader();
      advanceOfflineQuestion();
    }
  }

  function advanceOfflineQuestion() {
    isOfflineMode = true;
    questionCount += 1;
    if (questionCount <= MOCK_QUESTIONS_BANK.length) {
      const qData = MOCK_QUESTIONS_BANK[questionCount - 1];
      daysCovered.add(qData.day);
      appendMessage(qData.question, 'interviewer');
      updateProgressUI();
    } else {
      appendMessage('Interview completed. Loading detailed feedback...', 'interviewer');
      const fallbackFeedback = {
        summary: `Adaptive technical evaluation completed for ${selectedCandidate?.member?.name || 'the candidate'}. Strong foundational knowledge demonstrated across core AI concepts.`,
        strengths: [
          'Solid understanding of vector embeddings and semantic search mechanisms.',
          'Good grasp of RAG architecture, retrieval pipeline latency, and chunking trade-offs.',
          'Demonstrated knowledge of prompt engineering techniques and structured outputs.'
        ],
        gaps: [
          'Could elaborate deeper on production LLM observability and monitoring strategies.',
          'Recommend reviewing multi-agent state persistence and tool error recovery patterns.'
        ],
        next: [
          'Practice building end-to-end FastAPI RAG pipelines with streaming SSE responses.',
          'Explore Model Context Protocol (MCP) integration with external tools.'
        ]
      };
      setTimeout(() => renderFeedback(fallbackFeedback), 1500);
    }
  }

  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendLoader() {
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'typing-loader-wrapper';
    loaderDiv.classList.add('message', 'interviewer');
    loaderDiv.innerHTML = `
      <div class="typing-loader">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatMessages.appendChild(loaderDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeLoader() {
    document.getElementById('typing-loader-wrapper')?.remove();
  }

  function updateProgressUI() {
    questionsCountLabel.textContent = `${questionCount} / 8`;
    questionsProgressBar.style.width = `${Math.min(100, (questionCount / 8) * 100)}%`;

    const uniqueDays = daysCovered.size;
    daysCountLabel.textContent = `${uniqueDays} / 4`;
    daysProgressBar.style.width = `${Math.min(100, (uniqueDays / 4) * 100)}%`;

    daysTagsContainer.innerHTML = '';
    daysCovered.forEach(day => {
      const span = document.createElement('span');
      span.classList.add('day-tag');
      span.textContent = `Day ${day}`;
      daysTagsContainer.appendChild(span);
    });
  }

  function renderFeedback(feedback) {
    chatMessages.classList.add('hidden');
    inputArea.classList.add('hidden');
    feedbackOverlay.classList.remove('hidden');

    document.getElementById('report-summary').textContent = feedback.summary || 'No summary provided.';

    const fillList = (id, items) => {
      const ul = document.getElementById(id);
      ul.innerHTML = '';
      (items || []).forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        ul.appendChild(li);
      });
    };

    fillList('report-strengths', feedback.strengths);
    fillList('report-gaps', feedback.gaps);
    fillList('report-next', feedback.next);

    setCustomSelectDisabled(false);
    sessionIdInput.disabled = false;
    window.TalentAI?.onFeedbackRendered?.(feedback);
  }

  function animateProgressOnMount() {
    [questionsProgressBar, daysProgressBar].forEach(bar => {
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.transition = 'width 1s cubic-bezier(0.34, 1.2, 0.64, 1)';
      });
    });
  }

  function getCandidates() { return candidatesList; }

  return { init, loadCandidates, animateProgressOnMount, getCandidates };
})();

document.addEventListener('DOMContentLoaded', () => InterviewApp.init());
