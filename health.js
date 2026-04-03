/* ══════════════════════════════════════
   WELLNESS.JS — Sakhi Health Hub (Async Data Layer)
══════════════════════════════════════ */

// ── UTILS ──
function scrollToSection(id) { document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' }); }
function showToast(icon, title, msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  document.getElementById('toast-icon-w').textContent = icon;
  document.getElementById('toast-title-w').textContent = title;
  document.getElementById('toast-msg-w').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._wt);
  window._wt = setTimeout(() => t.classList.remove('show'), 3600);
}
function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
function today() { return new Date(); }

// UI Helper for Loading states
function setBtnLoading(btn, isLoading, loadingText = 'Saving...', originalText = '') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
    btn.classList.add('loading-btn-state');
  } else {
    btn.textContent = originalText || btn.dataset.originalText || 'Save';
    btn.disabled = false;
    btn.classList.remove('loading-btn-state');
  }
}

// ── SCROLL REVEAL ──
const obs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 70);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ── HAMBURGER NAV ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger) {
  hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

/* ══════════════════════════════════════
   MOCK BACKEND SERVICE (API LAYER)
   Replace with fetch() / axios later!
══════════════════════════════════════ */
const apiService = {
  // Simulate network latency
  _delay: (ms) => new Promise(r => setTimeout(r, ms)),
  _get: (k, d) => JSON.parse(localStorage.getItem(k)) || d,
  _set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),

  // Period
  savePeriodLog: async (logData) => {
    await apiService._delay(400); // Network delay
    // logic would go here to send to real backend
    return true; 
  },

  // Mood
  getMoods: async () => {
    await apiService._delay(150);
    return apiService._get('sp_mood', {});
  },
  saveMoods: async (moods) => {
    await apiService._delay(500); 
    apiService._set('sp_mood', moods);
    return true;
  },

  // Habits / Self-Care
  getHabits: async (defaultHabits) => {
    await apiService._delay(100);
    const data = localStorage.getItem('sp_habits_today');
    return data ? JSON.parse(data) : defaultHabits;
  },
  saveHabitsInstant: (habits) => {
    // Instant save for toggle inputs so UI is snappy
    apiService._set('sp_habits_today', habits);
  },
  getWeekData: async () => {
    await apiService._delay(100);
    return apiService._get('sp_week', {});
  },
  saveWeekData: async (week) => {
    await apiService._delay(400);
    apiService._set('sp_week', week);
    return true;
  },

  // Journal
  getJournal: async () => {
    await apiService._delay(200);
    return apiService._get('sp_journal', []);
  },
  saveJournal: async (journal) => {
    await apiService._delay(800); // Encryption simulation
    apiService._set('sp_journal', journal);
    return true;
  },

  // Community
  getCommunity: async () => {
    await apiService._delay(300);
    return apiService._get('sp_community', []);
  },
  saveCommunity: async (community) => {
    await apiService._delay(600);
    apiService._set('sp_community', community);
    return true;
  }
};

/* ══════════════════════════════
   1. PERIOD TRACKER
══════════════════════════════ */
let calYear = today().getFullYear();
let calMonth = today().getMonth(); // 0-indexed
let cycleLength = 28;
let lastPeriodStart = new Date(today()); lastPeriodStart.setDate(today().getDate() - 20);

// Fetch data from real backend Node server
async function fetchPeriodData() {
  try {
    const res = await fetch('http://localhost:5005/api/health/period');
    const json = await res.json();
    if (json.success && json.data) {
      cycleLength = json.data.cycleLength;
      lastPeriodStart = new Date(json.data.lastPeriodStart);
      
      const inp = document.getElementById('cycle-len-input');
      if (inp) inp.value = cycleLength;

      calYear = today().getFullYear();
      calMonth = today().getMonth();
      renderCalendar();
    }
  } catch(e) {
    console.error('Failed to load period data from backend, using defaults', e);
    renderCalendar();
  }
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const el = document.getElementById('mini-cal');
  const label = document.getElementById('month-label');
  if (!el) return;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  label.textContent = `${monthNames[calMonth]} ${calYear}`;

  // Compute period / fertile / ovulation days
  const periodStart = new Date(lastPeriodStart);
  const periodDays = [];
  const fertileStart = new Date(lastPeriodStart); fertileStart.setDate(fertileStart.getDate() + cycleLength - 18);
  const ovulation   = new Date(lastPeriodStart); ovulation.setDate(ovulation.getDate() + cycleLength - 14);
  const fertileEnd  = new Date(lastPeriodStart); fertileEnd.setDate(fertileEnd.getDate() + cycleLength - 11);

  for (let d = 0; d < 5; d++) {
    const pd = new Date(periodStart); pd.setDate(pd.getDate() + d);
    periodDays.push(pd.toDateString());
  }

  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = today().toDateString();

  const dows = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(calYear, calMonth, d);
    const ds = thisDate.toDateString();
    let cls = 'cal-day';
    if (ds === todayStr) cls += ' today';
    else if (periodDays.includes(ds)) cls += ' period-day';
    else if (thisDate >= fertileStart && thisDate <= fertileEnd) {
      if (ds === ovulation.toDateString()) cls += ' ovulation-day';
      else cls += ' fertile-day';
    }
    html += `<div class="${cls}">${d}</div>`;
  }

  el.innerHTML = html;

  const nextPeriod = new Date(lastPeriodStart); nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
  const diff = Math.ceil((nextPeriod - today()) / (1000*60*60*24));
  const du = document.getElementById('days-until');
  if (du) du.textContent = diff > 0 ? diff : 0;
  const cd = document.getElementById('cycle-length-disp');
  if (cd) cd.textContent = cycleLength;
}

async function updateCycle() {
  const inp = document.getElementById('cycle-len-input');
  if (inp) { 
      cycleLength = parseInt(inp.value) || 28; 
      renderCalendar(); 
      
      try {
          await fetch('http://localhost:5005/api/health/period', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cycleLength })
          });
      } catch(e) { console.error(e); }
  }
}

async function startNewPeriod() {
    lastPeriodStart = today();
    renderCalendar();
    showToast('🩸', 'Period Started', 'Your new cycle has been recorded today.');
    
    const btn = document.getElementById('btn-start-period');
    setBtnLoading(btn, true, 'Logging...');
    try {
        await fetch('http://localhost:5005/api/health/period', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastPeriodStart: lastPeriodStart.toISOString() })
        });
    } catch(e) { console.error(e); }
    setBtnLoading(btn, false, '', '🩸 Period Started Today');
}

function toggleSymp(btn) { btn.classList.toggle('active'); }

async function savePeriodLog() {
  const active = [...document.querySelectorAll('.symp-btn.active')].map(b => b.textContent.trim());
  
  const btn = document.querySelector('.symptom-card .btn-save');
  setBtnLoading(btn, true, 'Saving Log...');
  
  try {
      await fetch('http://localhost:5005/api/health/period', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log: { symps: active, date: new Date().toISOString() } })
      });
  } catch(e) { console.error(e); }
  
  setBtnLoading(btn, false, '', "Save Today's Log");

  const note = document.getElementById('symp-saved');
  if (note) { note.style.display = 'block'; setTimeout(() => note.style.display = 'none', 3000); }
  showToast('🌸', 'Period Log Saved', active.length ? `${active.length} symptom(s) logged securely.` : 'No symptoms logged today.');
}

// ── INIT CALENDAR ──
document.addEventListener('DOMContentLoaded', () => { fetchPeriodData(); });

/* ══════════════════════════════
   2. MOOD TRACKER
══════════════════════════════ */
let selectedMood = null;
const moodColors = { happy:'#22c55e', calm:'#3b82f6', tired:'#94a3b8', stressed:'#f97316', anxious:'#a855f7', low:'#64748b', angry:'#ef4444', overwhelmed:'#ec4899' };
const moodEmojis = { happy:'😄', calm:'😌', tired:'😴', stressed:'😤', anxious:'😰', low:'😔', angry:'😠', overwhelmed:'🤯' };
let moodHistory = {};

function selectMood(btn, mood) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedMood = mood;
}

async function saveMood() {
  if (!selectedMood) { showToast('😊', 'Select a Mood', 'Please choose how you are feeling today.'); return; }
  
  const btn = document.querySelector('.mood-selector-card .btn-save');
  setBtnLoading(btn, true, 'Saving Mood...');

  const key = today().toDateString();
  const note = document.getElementById('mood-note')?.value || '';
  
  moodHistory[key] = { mood: selectedMood, note, time: new Date().toISOString() };
  
  await apiService.saveMoods(moodHistory);
  
  setBtnLoading(btn, false, '', "Save Today's Mood");
  renderMoodWeek();
  renderMoodBars();
  
  const saved = document.getElementById('mood-saved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 3000); }
  showToast(moodEmojis[selectedMood], 'Mood Logged', `Feeling ${selectedMood} — saved privately.`);
}

function renderMoodWeek() {
  const el = document.getElementById('mood-week');
  if (!el) return;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayD = today();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayD); d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const entry = moodHistory[key];
    const isToday = i === 0;
    html += `<div class="mw-day ${isToday ? 'mw-today' : ''}">
      <div class="mw-dot" style="${entry ? `background:${moodColors[entry.mood]}22;border:2px solid ${moodColors[entry.mood]}55;` : ''}">
        ${entry ? moodEmojis[entry.mood] : '·'}
      </div>
      <div class="mw-label">${days[d.getDay()]}</div>
    </div>`;
  }
  el.innerHTML = html;

  const insight = document.getElementById('insight-text');
  if (insight) {
    const moods = Object.values(moodHistory).map(e => e.mood);
    if (!moods.length) return;
    const freq = {};
    moods.forEach(m => freq[m] = (freq[m]||0) + 1);
    const top = Object.entries(freq).sort((a,b) => b[1]-a[1])[0][0];
    const msgs = {
      happy:'You\'ve been feeling happy lately — keep doing what\'s working! ✨',
      calm:'You\'ve had a calm week. That\'s beautiful. 💙',
      tired:'You\'ve been feeling tired. Make sure to rest and be gentle with yourself. 🌙',
      stressed:'High stress detected this week. Try the breathing exercise below. 🍃',
      anxious:'Anxiety has been present. You\'re not alone — try the calm section. 💜',
      low:'You\'ve had some low days. It\'s okay. Reach out if you need support. 🤝',
      angry:'Anger has been present. It\'s valid — try a journaling release. 📓',
      overwhelmed:'You\'ve felt overwhelmed. One thing at a time. You\'ve got this. 🌸'
    };
    insight.textContent = msgs[top] || 'Log moods daily to see your weekly emotional pattern.';
  }
}

function renderMoodBars() {
  const el = document.getElementById('mood-bars');
  if (!el) return;
  const freq = {};
  Object.values(moodHistory).forEach(e => freq[e.mood] = (freq[e.mood]||0)+1);
  const max = Math.max(...Object.values(freq), 1);
  const order = ['happy','calm','tired','stressed','anxious','low','angry','overwhelmed'];
  const labels = { happy:'Happy', calm:'Calm', tired:'Tired', stressed:'Stressed', anxious:'Anxious', low:'Low', angry:'Angry', overwhelmed:'Overwhelmed' };
  el.innerHTML = order.filter(m => freq[m]).map(m =>
    `<div class="mb-row">
      <span class="mb-label">${labels[m]}</span>
      <div class="mb-track"><div class="mb-fill" style="width:${(freq[m]/max)*100}%;background:${moodColors[m]};"></div></div>
      <span class="mb-count">${freq[m]}</span>
    </div>`
  ).join('') || '<p style="font-size:0.75rem;color:var(--muted);">Log moods to see frequency chart.</p>';
}

document.addEventListener('DOMContentLoaded', async () => {
  const md = document.getElementById('mood-today-date');
  if (md) md.textContent = formatDate(today());
  
  // Fetch from mock API
  moodHistory = await apiService.getMoods();
  
  renderMoodWeek();
  renderMoodBars();
});

/* ══════════════════════════════
   3. MENTAL WELLNESS CHECK-IN
══════════════════════════════ */
const checkinQuestions = [
  { q: 'How are you feeling right now, in this moment?', opts: ['😄 Wonderful and happy', '😌 Okay, getting by', '😔 A little low today', '😤 Stressed or tense'] },
  { q: 'Did you feel stressed or overwhelmed today?', opts: ['Not at all', 'A little bit', 'Yes, quite a lot', 'Very overwhelmed'] },
  { q: 'How is your emotional wellbeing today?', opts: ['I feel emotionally strong', 'I\'m doing okay', 'I\'m feeling fragile', 'I\'m really struggling'] },
  { q: 'Do you feel connected to the people around you?', opts: ['Yes, I feel supported', 'Somewhat', 'Not really', 'I feel quite alone'] },
  { q: 'Do you need any support or care today?', opts: ['No, I\'m good today', 'A little self-care would help', 'Yes, I could use some support', 'Yes, I really need help'] }
];
const checkinResults = [
  { icon:'🌸', title:'You\'re doing wonderfully', msg:'You seem to be in a good emotional space today. Keep nurturing yourself with small joys and self-compassion.' },
  { icon:'🌿', title:'You\'re getting through it', msg:'Today may not be easy, but you\'re showing up for yourself. That takes strength. Be gentle and patient with yourself.' },
  { icon:'💜', title:'You deserve extra care today', msg:'It sounds like today has been tough. Please be kind to yourself — try the Calm section or write in your journal.' },
  { icon:'🤝', title:'Reach out — you\'re not alone', msg:'It takes courage to acknowledge when you\'re struggling. Please use our community, try a breathing exercise, or call a helpline.' }
];

let ciStep = 0;
let ciAnswers = [];

function renderCheckin() {
  const q = document.getElementById('checkin-q');
  const opts = document.getElementById('checkin-opts');
  const fill = document.getElementById('cp-fill');
  const stepLabel = document.getElementById('step-label');
  const prev = document.getElementById('ci-prev');

  if (!q || ciStep >= checkinQuestions.length) return;

  const curr = checkinQuestions[ciStep];
  q.textContent = curr.q;
  opts.innerHTML = curr.opts.map((o, i) =>
    `<button class="ci-option ${ciAnswers[ciStep] === i ? 'chosen' : ''}" onclick="chooseCI(${i})">${o}</button>`
  ).join('');
  fill.style.width = `${(ciStep / checkinQuestions.length) * 100}%`;
  stepLabel.textContent = `Question ${ciStep + 1} of ${checkinQuestions.length}`;
  prev.style.display = ciStep > 0 ? 'block' : 'none';
}

function chooseCI(idx) {
  ciAnswers[ciStep] = idx;
  document.querySelectorAll('.ci-option').forEach((b, i) => {
    b.classList.toggle('chosen', i === idx);
  });
}

function ciNext() {
  if (ciAnswers[ciStep] === undefined) { showToast('💜', 'Choose an option', 'Please select one of the options to continue.'); return; }
  ciStep++;
  if (ciStep >= checkinQuestions.length) { showCheckinResult(); return; }
  renderCheckin();
}

function ciPrev() {
  if (ciStep > 0) { ciStep--; renderCheckin(); }
}

function showCheckinResult() {
  const wrap = document.getElementById('checkin-wrap');
  const res = document.getElementById('checkin-result');
  if (!wrap || !res) return;

  const score = ciAnswers.reduce((s, a) => s + a, 0);
  const max = (checkinQuestions.length - 1) * 3;
  const pct = score / max;
  let r;
  if (pct < 0.25) r = checkinResults[0];
  else if (pct < 0.5) r = checkinResults[1];
  else if (pct < 0.75) r = checkinResults[2];
  else r = checkinResults[3];

  document.getElementById('cr-icon').textContent = r.icon;
  document.getElementById('cr-title').textContent = r.title;
  document.getElementById('cr-msg').textContent = r.msg;

  wrap.style.display = 'none';
  res.style.display = 'block';
  showToast(r.icon, 'Check-In Complete', r.title);
}

function resetCheckin() {
  ciStep = 0; ciAnswers = [];
  document.getElementById('checkin-wrap').style.display = 'block';
  document.getElementById('checkin-result').style.display = 'none';
  document.getElementById('cp-fill').style.width = '0%';
  renderCheckin();
}

document.addEventListener('DOMContentLoaded', renderCheckin);

/* ══════════════════════════════
   4. QUICK CALM
══════════════════════════════ */
let hapticInterval = null;

function setupBreathing() {
  const circle = document.getElementById('breath-circle');
  if (!circle) return;

  circle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (navigator.vibrate) navigator.vibrate(50);
    circle.classList.remove('exhaling');
    circle.classList.add('inhaling');
    document.getElementById('breath-text').textContent = 'Inhaling...';
    document.getElementById('breath-phase').textContent = 'Keep holding to breathe in';

    let count = 0;
    hapticInterval = setInterval(() => {
      if(count < 4 && navigator.vibrate) navigator.vibrate([30]);
      count++;
    }, 1000);
  });

  const endBreathing = (e) => {
    e.preventDefault();
    clearInterval(hapticInterval);
    if (circle.classList.contains('inhaling')) {
      if (navigator.vibrate) navigator.vibrate([40, 50, 40]);
      circle.classList.remove('inhaling');
      circle.classList.add('exhaling');
      document.getElementById('breath-text').textContent = 'Exhaling...';
      document.getElementById('breath-phase').textContent = 'Release and let it out';
      
      setTimeout(() => {
        if(circle.classList.contains('exhaling')) {
           circle.classList.remove('exhaling');
           document.getElementById('breath-text').textContent = 'Touch & Hold';
           document.getElementById('breath-phase').textContent = 'Rest your thumb here to inhale';
        }
      }, 4000);
    }
  };

  circle.addEventListener('pointerup', endBreathing);
  circle.addEventListener('pointercancel', endBreathing);
  circle.addEventListener('pointerout', endBreathing);
}

document.addEventListener('DOMContentLoaded', setupBreathing);

const prompts = [
  '"You are doing better than you think you are."',
  '"Rest is not giving up. Rest is showing up for tomorrow."',
  '"Your feelings are valid, always — every single one."',
  '"You are allowed to take up space, exactly as you are."',
  '"One step at a time. One breath at a time. You\'ve got this."',
  '"Being strong doesn\'t mean you can\'t ask for help."',
  '"You have survived every hard day so far. That is strength."',
  '"Small progress is still beautiful progress."',
  '"You are worthy of love, care, and good things."',
  '"It\'s okay to not be okay. You are human and that is okay."',
  '"Your body is doing its best. Be gentle with it."',
  '"You deserve the same compassion you give to others."'
];
let promptIdx = 0;

function nextPrompt() {
  promptIdx = (promptIdx + 1) % prompts.length;
  const el = document.getElementById('prompt-text');
  const cnt = document.getElementById('prompt-count');
  if (el) { el.style.opacity = '0'; setTimeout(() => { el.textContent = prompts[promptIdx]; el.style.opacity = '1'; el.style.transition = 'opacity 0.4s'; }, 200); }
  if (cnt) cnt.textContent = `${promptIdx + 1} / ${prompts.length}`;
}

/* ══════════════════════════════
   5. SELF-CARE ROUTINE BUILDER
══════════════════════════════ */
const defaultHabits = [
  { emoji:'💧', label:'Drink 8 glasses of water', done:false },
  { emoji:'🌙', label:'Get 7–8 hours of sleep', done:false },
  { emoji:'🧴', label:'Complete skincare routine', done:false },
  { emoji:'🚶‍♀️', label:'Walk or gentle movement', done:false },
  { emoji:'📓', label:'Journal for 5 minutes', done:false },
  { emoji:'😊', label:'Mood check-in', done:false },
  { emoji:'🧘', label:'5 minutes of mindfulness', done:false },
  { emoji:'🍎', label:'Eat a nourishing meal', done:false },
  { emoji:'📵', label:'Screen-free time (30 min)', done:false },
];
let habits = [];
let weekData = {};

function renderRoutine() {
  const list = document.getElementById('routine-list');
  const dateEl = document.getElementById('routine-date');
  if (dateEl) dateEl.textContent = today().toLocaleDateString('en-IN', { weekday:'long', month:'short', day:'numeric' });
  if (!list) return;
  list.innerHTML = habits.map((h, i) =>
    `<div class="routine-item ${h.done ? 'checked' : ''}" onclick="toggleHabit(${i})">
      <div class="ri-checkbox">${h.done ? '✓' : ''}</div>
      <span class="ri-emoji">${h.emoji}</span>
      <span class="ri-label">${h.label}</span>
    </div>`
  ).join('');
  updateRoutineProgress();
}

function toggleHabit(i) {
  habits[i].done = !habits[i].done;
  // Use instant save for fast UI
  apiService.saveHabitsInstant(habits);
  renderRoutine();
}

function updateRoutineProgress() {
  const done = habits.filter(h => h.done).length;
  const total = habits.length;
  const pct = total ? (done / total) * 100 : 0;
  const fill = document.getElementById('rpb-fill');
  const dc = document.getElementById('done-count');
  const tc = document.getElementById('total-count');
  if (fill) fill.style.width = pct + '%';
  if (dc) dc.textContent = done;
  if (tc) tc.textContent = total;
}

function addCustomHabit() {
  const inp = document.getElementById('custom-habit');
  if (!inp?.value.trim()) return;
  habits.push({ emoji: '✨', label: inp.value.trim(), done: false });
  inp.value = '';
  apiService.saveHabitsInstant(habits);
  renderRoutine();
  showToast('✨', 'Habit Added', 'Your custom habit has been added to today\'s routine.');
}

async function saveRoutine() {
  const btn = document.querySelector('.selfcare-main .btn-save');
  setBtnLoading(btn, true, 'Saving Progress...', "Save Today's Progress");

  const done = habits.filter(h => h.done).length;
  const dayKey = today().toDateString();
  weekData[dayKey] = done > 0;
  
  await apiService.saveWeekData(weekData);

  setBtnLoading(btn, false, '', "Save Today's Progress");
  renderWeekDots();
  const saved = document.getElementById('routine-saved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 3000); }
  showToast('🌸', 'Routine Saved', `${done} of ${habits.length} habits completed today!`);
}

function renderWeekDots() {
  const days = ['mon','tue','wed','thu','fri','sat','sun'];
  const now = today();
  const dayOfWeek = now.getDay(); // 0=Sun
  days.forEach((d, i) => {
    const el = document.getElementById(`cg-${d}`);
    if (!el) return;
    const offset = i - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const dd = new Date(now); dd.setDate(now.getDate() + offset);
    const isToday = dd.toDateString() === now.toDateString();
    if (isToday) el.classList.add('today-day');
    if (weekData[dd.toDateString()]) el.classList.add('completed');
  });
}

function updateSkinScore() {
  const checks = document.querySelectorAll('.sk-check');
  const done = [...checks].filter(c => c.checked).length;
  const pct = Math.round((done / checks.length) * 100);
  const fill = document.getElementById('ssb-fill');
  const pctEl = document.getElementById('ssb-pct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Use mock API to fetch user's selfcare configs
  habits = await apiService.getHabits(defaultHabits.map(h => ({...h})));
  weekData = await apiService.getWeekData();
  
  renderRoutine();
  renderWeekDots();
});

/* ══════════════════════════════
   6. PRIVATE HEALTH JOURNAL
══════════════════════════════ */
let currentTag = 'mood';
let journalEntries = [];

function setJournalTag(btn, tag) {
  document.querySelectorAll('.jtag').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTag = tag;
}

async function saveJournalEntry() {
  const title = document.getElementById('journal-title')?.value.trim();
  const body = document.getElementById('journal-body')?.value.trim();
  if (!body) { showToast('📓', 'Empty Entry', 'Write something before saving.'); return; }

  const btn = document.querySelector('.journal-footer .btn-save');
  setBtnLoading(btn, true, 'Encrypting...', "Save Entry 🔒");

  const entry = {
    id: Date.now(),
    title: title || 'Untitled',
    body,
    tag: currentTag,
    date: new Date().toISOString()
  };
  journalEntries.unshift(entry);
  if (journalEntries.length > 30) journalEntries.pop(); 
  
  await apiService.saveJournal(journalEntries);

  setBtnLoading(btn, false, '', "Save Entry 🔒");

  if (document.getElementById('journal-title')) document.getElementById('journal-title').value = '';
  if (document.getElementById('journal-body')) document.getElementById('journal-body').value = '';
  document.getElementById('jf-chars').textContent = '0 words';

  renderJournalSidebar();
  const saved = document.getElementById('journal-saved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 3000); }
  showToast('🔒', 'Journal Entry Saved', 'Your entry has been securely saved.');
}

function clearJournal() {
  if (document.getElementById('journal-title')) document.getElementById('journal-title').value = '';
  if (document.getElementById('journal-body')) document.getElementById('journal-body').value = '';
  document.getElementById('jf-chars').textContent = '0 words';
}

function renderJournalSidebar() {
  const el = document.getElementById('js-entries');
  if (!el) return;
  if (!journalEntries.length) {
    el.innerHTML = `<div class="js-empty"><span class="jse-icon">📓</span><p>No entries yet. Start writing your first reflection.</p></div>`;
    return;
  }
  const tagLabels = { mood:'😊 Mood', health:'💊 Health', body:'🌸 Body', stress:'😤 Stress', gratitude:'🙏 Gratitude' };
  el.innerHTML = journalEntries.slice(0, 5).map(e => {
    const d = new Date(e.date);
    const ds = d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    const preview = e.body.slice(0, 80) + (e.body.length > 80 ? '...' : '');
    return `<div class="js-entry">
      <div class="je-header">
        <span class="je-title">${e.title}</span>
        <span class="je-date">${ds}</span>
      </div>
      <span class="je-tag">${tagLabels[e.tag] || e.tag}</span>
      <div class="je-preview">${preview}</div>
    </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const textarea = document.getElementById('journal-body');
  if (textarea) {
    textarea.addEventListener('input', () => {
      const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('jf-chars');
      if (el) el.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    });
  }

  const dateEl = document.getElementById('journal-date-disp');
  if (dateEl) dateEl.textContent = formatDate(today());

  journalEntries = await apiService.getJournal();
  renderJournalSidebar();
});

/* ══════════════════════════════
   7. ANONYMOUS COMMUNITY (Real-time Backend)
══════════════════════════════ */
let activeTopic = 'period';
let communityPosts = [];

const anonNames = ['AnonymousSister', 'PetalWings', 'SoftMoon', 'WildFlower', 'QuietSoul', 'StarDust', 'GentleRose', 'TigerLily', 'CalmSea', 'MorningLight'];
const topicLabels = { period:'🌸 Period', pcos:'🩺 PCOS', stress:'😤 Stress', bodyimage:'🦋 Body Image', skincare:'🧴 Skincare', emotional:'💜 Emotional', selfcare:'✨ Self-Care' };

function setTopic(btn, topic) {
  activeTopic = topic;
  document.querySelectorAll('.topic-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function submitPost() {
  const ta = document.getElementById('community-post');
  const body = ta?.value.trim();
  if (!body) { showToast('👭', 'Empty Post', 'Write something to share with the community.'); return; }
  if (body.length < 10) { showToast('👭', 'Too Short', 'Please write at least a sentence to share.'); return; }

  const btn = document.querySelector('.post-composer .btn-save');
  setBtnLoading(btn, true, 'Sharing safely...', "Share Anonymously");

  try {
      const resp = await fetch('http://localhost:5005/api/community', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: activeTopic, body })
      });
      const json = await resp.json();
      if(json.success) {
          communityPosts.unshift(json.post);
          renderCommunityFeed();
      }
  } catch(e) { console.error('Error sharing post', e); }

  setBtnLoading(btn, false, '', "Share Anonymously");
  if (ta) ta.value = '';
  showToast('👭', 'Shared Anonymously', 'Your post is live globally! 💜');
}

function renderCommunityFeed() {
  const feed = document.getElementById('community-feed');
  if (!feed) return;
  
  const nameIdx = (str) => str.split('').reduce((a,c) => a+c.charCodeAt(0), 0) % anonNames.length;
  
  feed.innerHTML = communityPosts.map((p, idx) => {
    const nameI = nameIdx(p.body.slice(0,10) + idx);
    const initials = anonNames[nameI].slice(0, 2);
    const repCount = p.repliesArr ? p.repliesArr.length : 0;
    
    // Custom replies layout
    const repliesHtml = (p.repliesArr || []).map(r => `<div style="font-size: 13px; color: #555; background: #fffafb; padding: 8px 12px; margin-top: 6px; border-left: 2px solid #FF6B8A; border-radius: 4px;"><strong>Anon:</strong> ${r}</div>`).join('');

    return `<div class="cf-post">
      <div class="cf-header">
        <div class="cf-avatar">${initials}</div>
        <div class="cf-meta">
          <div class="cf-name">Anonymous Sister</div>
          <div class="cf-time">${p.time}</div>
        </div>
        <span class="cf-topic-tag">${topicLabels[p.topic] || p.topic}</span>
      </div>
      <div class="cf-body">${p.body}</div>
      <div class="cf-actions">
        <button class="cf-action-btn" onclick="heartPost(${p.id}, this)">♡ ${p.hearts}</button>
        <button class="cf-action-btn" onclick="toggleReplyBox(${p.id})">💬 ${repCount} replies</button>
      </div>
      
      <!-- Replies Section -->
      <div class="cf-replies" id="replies-sec-${p.id}" style="margin-top: 10px;">
         ${repliesHtml}
         <div id="reply-box-${p.id}" style="display: none; margin-top: 8px; align-items: center; gap: 8px;">
            <input type="text" id="reply-input-${p.id}" placeholder="Write a supportive reply..." style="flex:1; padding: 8px; border: 1px solid #FFCDD2; border-radius: 6px; font-size: 13px;" outline="none">
            <button onclick="submitReply(${p.id})" style="background: #FF6B8A; color: #fff; border:none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">Reply</button>
         </div>
      </div>
    </div>`;
  }).join('');
}

function toggleReplyBox(id) {
    const box = document.getElementById(`reply-box-${id}`);
    if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}

async function submitReply(id) {
    const input = document.getElementById(`reply-input-${id}`);
    const rep = input.value.trim();
    if (!rep) return;
    
    input.value = 'Sending...';
    try {
        const resp = await fetch('http://localhost:5005/api/community/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, reply: rep })
        });
        const json = await resp.json();
        if (json.success) {
            const post = communityPosts.find(p => p.id === id);
            if (post) post.repliesArr = json.repliesArr;
            renderCommunityFeed();
        }
    } catch(e) { console.error(e); }
}

async function heartPost(id, btn) {
  try {
      const resp = await fetch('http://localhost:5005/api/community/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
      });
      const json = await resp.json();
      if(json.success) {
          btn.textContent = `♡ ${json.hearts}`;
          btn.style.color = '#FF6B8A';
          const post = communityPosts.find(p => p.id === id);
          if (post) post.hearts = json.hearts;
      }
  } catch(e) { console.error(e); }
}

async function fetchCommunity() {
    try {
        const resp = await fetch('http://localhost:5005/api/community');
        const json = await resp.json();
        if(json.success) {
            communityPosts = json.posts;
            renderCommunityFeed();
        }
    } catch(e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', async () => {
  fetchCommunity();
});

/* ══════════════════════════════
   MISC INIT
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ms-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.ms-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
    });
  });
});
