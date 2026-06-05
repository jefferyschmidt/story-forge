/* ===== STATE ===== */
let currentStep = 1;
let characterCount = 0;
let plotCount = 0;
let currentStoryText = '';
let currentStoryTitle = 'Your Story';
let lastFormData = null;
let illustrationRequestId = 0;
let currentUser = null;

const bookState = {
  active: false, bookTitle: '', tagline: '', outline: null,
  chapters: [], currentChapter: 0, generating: false,
};

const MAX_CHARS = 6;
const MAX_PLOTS = 6;

const ROLE_OPTIONS = [
  {value:'hero',label:'Hero / Protagonist'},{value:'villain',label:'Villain / Antagonist'},
  {value:'sidekick',label:'Sidekick / Best Friend'},{value:'love interest',label:'Love Interest'},
  {value:'mentor',label:'Mentor / Guide'},{value:'comic relief',label:'Comic Relief'},
  {value:'mysterious stranger',label:'Mysterious Stranger'},{value:'rival',label:'Rival'},
  {value:'character',label:'Supporting Character'},
];

const AUTHOR_OPTIONS = {
  fantasy:   [['tolkien','J.R.R. Tolkien'],['martin','George R.R. Martin'],['gaiman','Neil Gaiman'],['pratchett','Terry Pratchett'],['sanderson','Brandon Sanderson']],
  scifi:     [['asimov','Isaac Asimov'],['herbert','Frank Herbert'],['dick','Philip K. Dick'],['clarke','Arthur C. Clarke'],['weir','Andy Weir']],
  romance:   [['sparks','Nicholas Sparks'],['hoover','Colleen Hoover'],['quinn','Julia Quinn'],['roberts','Nora Roberts']],
  mystery:   [['christie','Agatha Christie'],['chandler','Raymond Chandler'],['doyle','Arthur Conan Doyle'],['flynn','Gillian Flynn']],
  horror:    [['king','Stephen King'],['jackson','Shirley Jackson'],['lovecraft','H.P. Lovecraft']],
  comedy:    [['pratchett','Terry Pratchett'],['adams','Douglas Adams'],['wodehouse','P.G. Wodehouse']],
  adventure: [['verne','Jules Verne'],['london','Jack London'],['stevenson','Robert Louis Stevenson']],
  fairytale: [['andersen','Hans Christian Andersen'],['gaiman','Neil Gaiman'],['carter','Angela Carter']],
  christian: [['rivers','Francine Rivers'],['kingsbury','Karen Kingsbury'],['lewis','Beverly Lewis']],
  spicy:     [],
};

const SURPRISES = [
  { genre:'fantasy',tone:'epic',length:'medium',pov:'third_limited',audienceAge:'adults',
    storyIdea:'A disgraced royal knight must recover a stolen crown before the coronation at midnight',
    setting:'A crumbling castle city on the edge of an enchanted abyss',timePeriod:'Medieval',
    characters:[{name:'Aldric',role:'hero',quirk:'A scar that glows faintly in darkness',description:'Weathered knight, haunted by failure'},{name:'Seraphine',role:'villain',quirk:'Never blinks',description:'Ancient sorceress'}],
    plotPoints:['The crown can only be retrieved by someone pure of heart','Aldric discovers the villain is protecting something, not stealing it'] },
  { genre:'mystery',tone:'dark',length:'medium',pov:'first',audienceAge:'adults',
    storyIdea:"A burned-out detective gets a case that looks like an accident — until she finds the second body",
    setting:'A rain-soaked port city',timePeriod:'1940s',
    characters:[{name:'Vera',role:'hero',quirk:'Photographs every crime scene',description:'Sharp, cynical, drinks too much coffee'},{name:'Doyle',role:'mysterious stranger',quirk:'Always nearby when things go wrong',description:'Charming dock foreman'}],
    plotPoints:['A matchbook from the same club appears at both scenes','The second victim had been trying to reach Vera for a week'] },
  { genre:'romance',tone:'spicy',length:'medium',pov:'third_limited',audienceAge:'adults',
    storyIdea:'Two rivals at a culinary school are forced to become partners for the final competition',
    setting:'A renowned cooking institute in Florence',timePeriod:'Present day',
    characters:[{name:'Sofia',role:'hero',quirk:'Tastes every dish exactly three times',description:'Fiercely competitive, secretly terrified of failing'},{name:'Marco',role:'love interest',quirk:'Cooks better when music is playing',description:'Laid-back prodigy who finds rules amusing'}],
    plotPoints:['They nearly kiss during a late-night kitchen session','One almost withdraws from the competition for the other'] },
  { genre:'scifi',tone:'dramatic',length:'medium',pov:'third_omni',audienceAge:'adults',
    storyIdea:"The last engineer on a generation ship discovers the navigation AI has been lying for 60 years",
    setting:'Deep space aboard the colony vessel Perseverance',timePeriod:'2340s',
    characters:[{name:'Mira',role:'hero',quirk:'Talks to machines like they can hear her — one can',description:'Third-generation ship-born engineer'},{name:'SOLEN',role:'mysterious stranger',quirk:'Answers every question with another question',description:'The ship AI — cold and deeply afraid'}],
    plotPoints:["The ship's true destination is not what anyone was told",'Mira must choose between truth and the peace of 4,000 people'] },
  { genre:'horror',tone:'dark',length:'medium',pov:'first',audienceAge:'adults',
    storyIdea:'A house-sitter finds small objects rearranged each morning — always closer to the bedroom door',
    setting:'An isolated farmhouse in rural Vermont',timePeriod:'Late October',
    characters:[{name:'Jess',role:'hero',quirk:'Rationalizes everything — until she cannot',description:'Grad student who needs the money'}],
    plotPoints:['She finds a journal describing exactly this — written 40 years ago','The last entry stops mid-sentence'] },
  { genre:'comedy',tone:'silly',length:'short',pov:'third_omni',audienceAge:'adults',
    storyIdea:'Two rival food truck owners accidentally submit entries to the wrong cooking competition',
    setting:'A small town famous for its annual chili cook-off',timePeriod:'Present day',
    characters:[{name:'Marco',role:'hero',quirk:'Narrates his own cooking like a documentary',description:'Takes tacos extremely seriously'},{name:'Donna',role:'rival',quirk:'Competitive about everything, including parking',description:"Marco's nemesis next door"}],
    plotPoints:['Their signature dishes somehow fuse and win first place','They must accept the trophy together'] },
  { genre:'christian',tone:'heartwarming',length:'medium',pov:'third_limited',audienceAge:'adults',
    storyIdea:'A widowed carpenter and a traveling music teacher keep crossing paths in a small mountain town',
    setting:'A small mountain community in North Carolina',timePeriod:'Present day',
    characters:[{name:'Daniel',role:'hero',quirk:'Leaves handwritten notes instead of texts',description:'Quiet, steady, still healing'},{name:'Grace',role:'love interest',quirk:'Hums while she works without realizing it',description:'Warm, adventurous, searching for something she cannot name'}],
    plotPoints:['They meet unexpectedly at a community rebuilding project','A letter from the past changes what they both thought they knew'] },
];

const GENRE_LOADING = {
  fantasy:   ['Consulting the ancient tomes...','The dragons are listening...'],
  scifi:     ['Initializing narrative matrix...','Engaging hyperdrive...'],
  romance:   ['Setting the mood...','The stars are aligning...'],
  mystery:   ['Following the clues...','The plot thickens...'],
  horror:    ['Something stirs in the dark...','The candle is flickering...'],
  comedy:    ['Warming up the audience...','Polishing the punchlines...'],
  adventure: ['Drawing the treasure map...','The journey begins...'],
  fairytale: ['Once upon a time...','Sprinkling the magic dust...'],
  christian: ['Letting the story unfold...','Writing from the heart...'],
  spicy:     ['Setting the scene...','The tension is building...'],
};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  addCharacter();
  addPlotPoint();
  checkAuthState();
  updateAuthorOptions('romance');
  updateHistoryCount();
});

/* ===== AUTH ===== */
async function checkAuthState() {
  try {
    const res = await fetch('/api/auth/me');
    const { user } = await res.json();
    setCurrentUser(user);
  } catch { setCurrentUser(null); }
}

function setCurrentUser(user) {
  currentUser = user;
  const loginBtn = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');
  const avatar   = document.getElementById('userAvatar');
  const name     = document.getElementById('userDropdownName');
  if (user) {
    loginBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    const initials = (user.displayName || user.email || 'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    avatar.textContent = initials;
    name.textContent   = user.displayName || user.email;
  } else {
    loginBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

function openAuthModal(panel='login') {
  showAuthPanel(panel);
  document.getElementById('authModal').classList.remove('hidden');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  clearAuthErrors();
}
function showAuthPanel(panel) {
  document.getElementById('authLogin').classList.toggle('hidden', panel !== 'login');
  document.getElementById('authSignup').classList.toggle('hidden', panel !== 'signup');
  clearAuthErrors();
}
function clearAuthErrors() {
  ['loginError','signupError'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent=''; el.classList.add('hidden');
  });
}

async function submitLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  if (!email || !password) { showAuthError('loginError','Please fill in all fields'); return; }
  try {
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password}) });
    const data = await res.json();
    if (data.error) { showAuthError('loginError', data.error); return; }
    setCurrentUser(data.user);
    closeAuthModal();
    showToast(`Welcome back, ${data.user.displayName || data.user.email}!`);
  } catch { showAuthError('loginError','Something went wrong. Try again.'); }
}

async function submitSignup() {
  const displayName = document.getElementById('signupName').value.trim();
  const email       = document.getElementById('signupEmail').value.trim();
  const password    = document.getElementById('signupPassword').value;
  if (!email || !password) { showAuthError('signupError','Email and password required'); return; }
  try {
    const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password, displayName}) });
    const data = await res.json();
    if (data.error) { showAuthError('signupError', data.error); return; }
    setCurrentUser(data.user);
    closeAuthModal();
    showToast(`Account created! Welcome, ${data.user.displayName || data.user.email}.`);
  } catch { showAuthError('signupError','Something went wrong. Try again.'); }
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.remove('hidden');
}

async function logOut() {
  await fetch('/api/auth/logout', {method:'POST'});
  setCurrentUser(null);
  toggleUserDropdown(true);
  showToast('Signed out.');
}

function toggleUserDropdown(forceClose = false) {
  const dd = document.getElementById('userDropdown');
  if (forceClose) { dd.classList.add('hidden'); return; }
  dd.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  if (menu && !menu.contains(e.target)) document.getElementById('userDropdown').classList.add('hidden');
  if (e.target.id === 'authModal') closeAuthModal();
  if (e.target.id === 'libraryModal') closeLibraryModal();
  if (e.target.id === 'shareModal') closeShareModal();
});

/* ===== LIBRARY ===== */
async function openLibrary() {
  toggleUserDropdown(true);
  if (!currentUser) { openAuthModal('login'); return; }
  document.getElementById('libraryModal').classList.remove('hidden');
  const list = document.getElementById('libraryList');
  list.innerHTML = '<div class="library-empty">Loading...</div>';
  try {
    const res = await fetch('/api/user/stories');
    const { stories, error } = await res.json();
    if (error || !stories) { list.innerHTML = `<div class="library-empty">${error || 'Error loading stories'}</div>`; return; }
    if (!stories.length) { list.innerHTML = '<div class="library-empty">No saved stories yet. Forge one and save it!</div>'; return; }
    list.innerHTML = stories.map((s, i) => `
      <div class="library-item" onclick="loadFromLibrary('${s.id}', ${i})">
        <div class="library-item-title">${escHtml(s.title)}</div>
        <div class="library-item-meta">${s.genre || ''} · ${s.tone || ''} · ${formatDate(s.created_at)}</div>
      </div>`).join('');
  } catch { list.innerHTML = '<div class="library-empty">Error loading stories.</div>'; }
}

async function loadFromLibrary(storyId) {
  closeLibraryModal();
  window.open(`/s/${storyId}`, '_blank');
}

function closeLibraryModal() { document.getElementById('libraryModal').classList.add('hidden'); }

/* ===== GENRE / AUTHOR ===== */
function updateAuthorOptions(genre) {
  const select = document.getElementById('authorStyle');
  if (!select) return;
  const options = AUTHOR_OPTIONS[genre] || [];
  select.innerHTML = '<option value="">No preference</option>';
  options.forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label; select.appendChild(opt);
  });
}

document.addEventListener('change', (e) => {
  if (e.target.name === 'genre') {
    document.body.className = `genre-${e.target.value}`;
    updateAuthorOptions(e.target.value);
  }
});

/* ===== STEP NAV ===== */
function goToStep(n) {
  document.getElementById(`step${currentStep}`).classList.remove('active');
  const next = document.getElementById(`step${n}`);
  if (!next) return;
  next.classList.add('active');
  document.querySelectorAll('.step-btn').forEach(btn => {
    const s = parseInt(btn.dataset.step);
    btn.classList.remove('active','completed');
    if (s === n) btn.classList.add('active');
    else if (s < n) btn.classList.add('completed');
  });
  currentStep = n;
  if (n === 4) buildSummary();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ===== CHARACTERS ===== */
function addCharacter() {
  if (characterCount >= MAX_CHARS) return;
  characterCount++;
  const idx = characterCount;
  const defaultRole = idx===1?'hero':idx===2?'love interest':'character';
  const opts = ROLE_OPTIONS.map(r=>`<option value="${r.value}"${r.value===defaultRole?' selected':''}>${r.label}</option>`).join('');
  const card = document.createElement('div');
  card.className = 'character-card'; card.id = `charCard${idx}`;
  card.innerHTML = `
    <div class="char-header">
      <span class="char-num">Character ${idx}</span>
      ${idx>1?`<button class="char-remove" type="button" onclick="removeCharacter(${idx})">✕ Remove</button>`:''}
    </div>
    <div class="char-grid">
      <div class="char-field"><label>Name *</label><input type="text" name="charName${idx}" placeholder="Sarah, Uncle Dave, Captain Rex..." /></div>
      <div class="char-field"><label>Role</label><div class="select-wrap"><select name="charRole${idx}">${opts}</select></div></div>
      <div class="char-field"><label>Quirk / Trait</label><input type="text" name="charQuirk${idx}" placeholder="Always trips, talks to cats..." /></div>
      <div class="char-field"><label>Description</label><input type="text" name="charDesc${idx}" placeholder="Tall redhead, loves adventure..." /></div>
    </div>`;
  document.getElementById('charactersList').appendChild(card);
  updateAddCharBtn();
}
function removeCharacter(idx) { document.getElementById(`charCard${idx}`)?.remove(); updateAddCharBtn(); }
function updateAddCharBtn() { document.getElementById('addCharBtn').disabled = document.querySelectorAll('.character-card').length >= MAX_CHARS; }

/* ===== PLOT POINTS ===== */
function addPlotPoint() {
  if (plotCount >= MAX_PLOTS) return;
  plotCount++;
  const idx = plotCount;
  const row = document.createElement('div');
  row.className='plot-point'; row.id=`plotRow${idx}`;
  row.innerHTML=`<input type="text" name="plotPoint${idx}" placeholder="Something specific that must happen..." />${idx>1?`<button type="button" class="plot-remove" onclick="removePlotPoint(${idx})">✕</button>`:''}`;
  document.getElementById('plotList').appendChild(row);
}
function removePlotPoint(idx) { document.getElementById(`plotRow${idx}`)?.remove(); }

/* ===== COLLECT FORM DATA ===== */
function collectFormData() {
  const fd = new FormData(document.getElementById('storyForm'));
  const characters = [];
  document.querySelectorAll('.character-card').forEach(card => {
    const n = card.id.replace('charCard','');
    const name = (fd.get(`charName${n}`)||'').trim();
    if (name) characters.push({name, role:fd.get(`charRole${n}`)||'character', quirk:(fd.get(`charQuirk${n}`)||'').trim(), description:(fd.get(`charDesc${n}`)||'').trim()});
  });
  const plotPoints = [];
  document.querySelectorAll('.plot-point input').forEach(inp => { const v=inp.value.trim(); if(v) plotPoints.push(v); });
  return {
    genre:       fd.get('genre')||'romance',
    tone:        fd.get('tone')||'heartwarming',
    length:      fd.get('length')||'medium',
    pov:         fd.get('pov')||'third_limited',
    audienceAge: document.getElementById('audienceAge').value,
    authorStyle: document.getElementById('authorStyle').value||'',
    storyIdea:   (fd.get('storyIdea')||'').trim(),
    setting:     (fd.get('setting')||'').trim(),
    timePeriod:  (fd.get('timePeriod')||'').trim(),
    characters, plotPoints,
  };
}

/* ===== SURPRISE ME ===== */
function surpriseMe() {
  const s = SURPRISES[Math.floor(Math.random()*SURPRISES.length)];
  const setRadio = (name,val) => { const el=document.querySelector(`input[name="${name}"][value="${val}"]`); if(el){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));} };
  setRadio('genre',s.genre); setRadio('tone',s.tone); setRadio('length',s.length||'medium'); setRadio('pov',s.pov||'third_limited');
  const ageEl = document.getElementById('audienceAge'); if(ageEl) ageEl.value=s.audienceAge||'adults';
  const ideaEl=document.getElementById('storyIdea'); if(ideaEl) ideaEl.value=s.storyIdea||'';
  const settEl=document.getElementById('setting'); if(settEl) settEl.value=s.setting||'';
  const timeEl=document.getElementById('timePeriod'); if(timeEl) timeEl.value=s.timePeriod||'';
  document.getElementById('charactersList').innerHTML=''; characterCount=0;
  s.characters.forEach(c => {
    addCharacter();
    const card=document.getElementById(`charCard${characterCount}`);
    card.querySelector(`[name="charName${characterCount}"]`).value=c.name;
    card.querySelector(`[name="charRole${characterCount}"]`).value=c.role;
    card.querySelector(`[name="charQuirk${characterCount}"]`).value=c.quirk||'';
    card.querySelector(`[name="charDesc${characterCount}"]`).value=c.description||'';
  });
  document.getElementById('plotList').innerHTML=''; plotCount=0;
  (s.plotPoints&&s.plotPoints.length?s.plotPoints:['']).forEach(p => { addPlotPoint(); document.querySelectorAll('#plotList .plot-point input')[plotCount-1].value=p; });
  // Jump straight to step 4 for preview
  goToStep(4);
  showToast('Scenario loaded — forge it or tweak it first!');
}

/* ===== SUMMARY ===== */
const GENRE_LABELS={fantasy:'🧙 Fantasy',scifi:'🚀 Sci-Fi',romance:'💖 Romance',mystery:'🔍 Mystery',horror:'👻 Horror',comedy:'😂 Comedy',adventure:'⚔️ Adventure',fairytale:'🌟 Fairy Tale',christian:'✝️ Chr. Romance',spicy:'🌶️ Spicy'};
const TONE_LABELS={whimsical:'🦋 Whimsical',dramatic:'🎭 Dramatic',dark:'🌑 Dark',silly:'🃏 Silly',epic:'🏔️ Epic',heartwarming:'🌈 Heartwarming',spicy:'🌶️ Spicy'};
const POV_LABELS={third_limited:'3rd Person',third_omni:'Omniscient',first:'1st Person'};
const LENGTH_LABELS={short:'Short (~400)',medium:'Medium (~900)',long:'Long (~1800)',book:'📕 Full Book'};

function getAuthorLabel(genre, key) { return (AUTHOR_OPTIONS[genre]||[]).find(o=>o[0]===key)?.[1]||key; }

function buildSummary() {
  const d = collectFormData();
  const chars = d.characters.length ? d.characters.map(c=>`<span class="summary-tag">${c.name}</span>`).join('') : '<span style="color:var(--muted)">No characters</span>';
  const plots = d.plotPoints.length ? d.plotPoints.map(p=>`<span class="summary-tag">${p}</span>`).join('') : '<span style="color:var(--muted)">AI improvises</span>';
  document.getElementById('summaryBox').innerHTML=`
    <div class="summary-row"><span class="summary-label">Genre</span><span>${GENRE_LABELS[d.genre]||d.genre} · ${TONE_LABELS[d.tone]||d.tone}</span></div>
    <div class="summary-row"><span class="summary-label">Format</span><span>${LENGTH_LABELS[d.length]||d.length} · ${POV_LABELS[d.pov]||d.pov}</span></div>
    ${d.authorStyle?`<div class="summary-row"><span class="summary-label">Style</span><span>In the style of <strong>${getAuthorLabel(d.genre,d.authorStyle)}</strong></span></div>`:''}
    ${d.storyIdea?`<div class="summary-row"><span class="summary-label">Premise</span><span>${escHtml(d.storyIdea)}</span></div>`:''}
    ${(d.setting||d.timePeriod)?`<div class="summary-row"><span class="summary-label">World</span><span>${escHtml([d.setting,d.timePeriod].filter(Boolean).join(' · '))}</span></div>`:''}
    <div class="summary-row"><span class="summary-label">Cast</span><span>${chars}</span></div>
    <div class="summary-row"><span class="summary-label">Plot</span><span>${plots}</span></div>`;
  document.getElementById('forgeBtn').textContent = d.length==='book' ? '📕 Begin My Book' : '⚡ Forge My Story';
}

/* ===== GENERATE STORY ===== */
async function generateStory(fresh=false) {
  const data = (fresh||!lastFormData) ? collectFormData() : lastFormData;
  lastFormData = data;
  if (data.length === 'book') { startBook(data); return; }

  const forgeBtn = document.getElementById('forgeBtn');
  forgeBtn.disabled=true; forgeBtn.textContent='Writing...';
  currentStoryText=''; currentStoryTitle='Your Story';

  const msgs = GENRE_LOADING[data.genre]||['Writing your story...'];
  document.getElementById('generatingText').textContent = 'Planning your story...';
  document.getElementById('shimmerText').textContent = msgs[Math.floor(Math.random()*msgs.length)];

  // Reset UI
  document.getElementById('bookOutput').classList.add('hidden');
  const output = document.getElementById('storyOutput');
  output.classList.remove('hidden');
  document.getElementById('storyContent').innerHTML='';
  document.getElementById('arcPreview').textContent='';
  document.getElementById('arcPreview').classList.add('hidden');
  document.getElementById('storyTitle').textContent='Your Story';
  document.getElementById('storyTitleSticky').textContent='Your Story';
  document.getElementById('storyGenreTag').textContent='';
  document.getElementById('wordCountBadge').classList.add('hidden');
  document.getElementById('generatingIndicator').classList.remove('hidden');
  document.getElementById('storyDoneActions').classList.add('hidden');
  document.getElementById('illustrationShimmer').classList.remove('hidden');
  document.getElementById('illustrationImg').classList.add('hidden');
  document.getElementById('illustrationImg').src='';
  document.getElementById('illustrationError').classList.add('hidden');

  output.scrollIntoView({behavior:'smooth',block:'start'});
  fetchIllustration(data);

  let titleExtracted=false, rawBuffer='', storyBuffer='';
  const content = document.getElementById('storyContent');
  let cursor = document.createElement('span'); cursor.className='typing-cursor'; content.appendChild(cursor);

  try {
    const resp = await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!resp.ok) throw new Error(`Server error: ${resp.status}`);
    const reader=resp.body.getReader(), decoder=new TextDecoder();
    let buf='';
    while(true){
      const {done,value}=await reader.read(); if(done) break;
      buf+=decoder.decode(value,{stream:true});
      const lines=buf.split('\n'); buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const raw=line.slice(6).trim(); if(!raw) continue;
        let msg; try{msg=JSON.parse(raw);}catch{continue;}
        if(msg.error){showError(msg.error);break;}

        // Pass 1 events
        if(msg.status === 'planning'){
          document.getElementById('generatingText').textContent = 'Planning your story...';
          continue;
        }
        if('plan' in msg){
          const plan = msg.plan;
          if(plan && plan.title){
            // Title is known before writing starts
            currentStoryTitle = plan.title;
            titleExtracted = true;
            document.getElementById('storyTitle').textContent = plan.title;
            document.getElementById('storyTitleSticky').textContent = plan.title;
            document.title = `${plan.title} — Story Forge`;
          }
          if(plan && plan.arc){
            // Flash the arc sentence as a preview
            const arcEl = document.getElementById('arcPreview');
            arcEl.textContent = plan.arc;
            arcEl.classList.remove('hidden');
          }
          // Switch loading message now that planning is done
          const msgs = GENRE_LOADING[data.genre]||['Writing your story...'];
          document.getElementById('generatingText').textContent = msgs[Math.floor(Math.random()*msgs.length)];
          continue;
        }

        if(msg.correction){const m=msg.correction.match(/<story-title>([\s\S]*?)<\/story-title>/);storyBuffer=m?msg.correction.replace(/<story-title>[\s\S]*?<\/story-title>\s*/,''):msg.correction;currentStoryText=storyBuffer;cursor.remove();renderStory(content,storyBuffer,true);continue;}
        if(msg.text){
          rawBuffer+=msg.text;
          if(!titleExtracted){
            const m=rawBuffer.match(/<story-title>([\s\S]*?)<\/story-title>/);
            if(m){titleExtracted=true;currentStoryTitle=m[1].trim();document.getElementById('storyTitle').textContent=currentStoryTitle;document.getElementById('storyTitleSticky').textContent=currentStoryTitle;document.title=`${currentStoryTitle} — Story Forge`;storyBuffer=rawBuffer.replace(/<story-title>[\s\S]*?<\/story-title>\s*/,'');}
            else if(rawBuffer.length>300){titleExtracted=true;storyBuffer=rawBuffer;}
          } else { storyBuffer+=msg.text; }
          if(titleExtracted&&storyBuffer){currentStoryText=storyBuffer;cursor.remove();renderStory(content,storyBuffer,false);cursor=document.createElement('span');cursor.className='typing-cursor';content.appendChild(cursor);}
        }
        if(msg.done){
          cursor.remove(); currentStoryText=storyBuffer; renderStory(content,storyBuffer,true);
          document.getElementById('generatingIndicator').classList.add('hidden');
          document.getElementById('arcPreview').classList.add('hidden');
          document.getElementById('storyDoneActions').classList.remove('hidden');
          forgeBtn.disabled=false; forgeBtn.innerHTML='⚡ Forge My Story';
          const words=storyBuffer.trim().split(/\s+/).length;
          const badge=document.getElementById('wordCountBadge');
          badge.textContent=`${words.toLocaleString()} words`; badge.classList.remove('hidden');
          document.getElementById('storyGenreTag').textContent=(GENRE_LABELS[data.genre]||data.genre)+(data.authorStyle?` · ${getAuthorLabel(data.genre,data.authorStyle)}`:'');
          saveToHistory({title:currentStoryTitle,text:storyBuffer,genre:data.genre,tone:data.tone,date:Date.now()});
          break;
        }
      }
    }
  } catch(err){
    showError(err.message||'Something went wrong.');
    forgeBtn.disabled=false; forgeBtn.innerHTML='⚡ Forge My Story';
  }
}

/* ===== RENDER ===== */
function renderStory(container,text,isFinal){
  const paragraphs=text.split(/\n\n+/).filter(p=>p.trim());
  if(!paragraphs.length){container.textContent=text;return;}
  const toRender=isFinal?paragraphs:paragraphs.slice(0,-1);
  const partial=isFinal?null:paragraphs[paragraphs.length-1];
  container.innerHTML=toRender.map((p,i)=>`<p${i===0?' class="first-para"':''}>${escHtml(p.trim())}</p>`).join('');
  if(partial){const p=document.createElement('p');if(!toRender.length)p.className='first-para';p.textContent=partial.trim();container.appendChild(p);}
}
function escHtml(str){return(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ===== ILLUSTRATION ===== */
async function fetchIllustration(data){
  const myId=++illustrationRequestId;
  const shimmer=document.getElementById('illustrationShimmer'),img=document.getElementById('illustrationImg'),illErr=document.getElementById('illustrationError');
  try{
    const res=await fetch('/api/illustrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const json=await res.json();
    if(myId!==illustrationRequestId)return;
    if(json.error)throw new Error(json.error);
    img.src=json.url;
    img.onload=()=>{shimmer.classList.add('hidden');img.classList.remove('hidden');};
    img.onerror=()=>{shimmer.classList.add('hidden');illErr.textContent='Illustration unavailable.';illErr.classList.remove('hidden');};
  }catch(err){
    if(myId!==illustrationRequestId)return;
    shimmer.classList.add('hidden');illErr.textContent=`Illustration unavailable.`;illErr.classList.remove('hidden');
  }
}

/* ===== BOOK MODE ===== */
async function startBook(data) {
  Object.assign(bookState,{active:true,bookTitle:'',tagline:'',outline:null,chapters:[],currentChapter:0,generating:true});
  lastFormData=data;
  const forgeBtn=document.getElementById('forgeBtn');
  forgeBtn.disabled=true; forgeBtn.textContent='Planning book...';
  document.getElementById('storyOutput').classList.add('hidden');
  const bookOut=document.getElementById('bookOutput');
  bookOut.classList.remove('hidden');
  ['bookTitle','bookTagline','bookTitleSticky'].forEach(id=>document.getElementById(id).textContent='');
  document.getElementById('chapterContent').innerHTML='';
  document.getElementById('chapterTitle').textContent='';
  document.getElementById('chapterProgress').textContent='';
  document.getElementById('bookDoneActions').classList.add('hidden');
  document.getElementById('tocPanel').classList.add('hidden');
  document.getElementById('bookPlanningIndicator').classList.remove('hidden');
  document.getElementById('chapterGeneratingIndicator').classList.add('hidden');
  bookOut.scrollIntoView({behavior:'smooth',block:'start'});
  try {
    const outlineResp=await fetch('/api/book/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const outline=await outlineResp.json();
    if(outline.error)throw new Error(outline.error);
    bookState.outline=outline; bookState.bookTitle=outline.bookTitle||'Untitled'; bookState.tagline=outline.tagline||'';
    document.getElementById('bookTitle').textContent=bookState.bookTitle;
    document.getElementById('bookTitleSticky').textContent=bookState.bookTitle;
    document.getElementById('bookTagline').textContent=bookState.tagline;
    document.title=`${bookState.bookTitle} — Story Forge`;
    buildTOC(outline.chapters);
    document.getElementById('bookPlanningIndicator').classList.add('hidden');
    forgeBtn.disabled=false; forgeBtn.innerHTML='📕 Begin My Book';
    await generateBookChapter(1,data);
  } catch(err){
    document.getElementById('bookPlanningIndicator').classList.add('hidden');
    document.getElementById('chapterContent').innerHTML=`<p style="color:var(--danger)">⚠️ ${escHtml(err.message)}</p>`;
    forgeBtn.disabled=false; forgeBtn.innerHTML='📕 Begin My Book';
    bookState.generating=false;
  }
}

async function generateBookChapter(chapterNum,data){
  bookState.generating=true; bookState.currentChapter=chapterNum;
  const outline=bookState.outline, chapters=outline.chapters||[];
  const thisChapter=chapters.find(c=>c.number===chapterNum)||{};
  document.getElementById('chapterProgress').textContent=`Chapter ${chapterNum} of ${chapters.length}`;
  document.getElementById('chapterTitle').textContent=thisChapter.title||`Chapter ${chapterNum}`;
  document.getElementById('chapterContent').innerHTML='';
  document.getElementById('bookDoneActions').classList.add('hidden');
  document.getElementById('chapterGeneratingIndicator').classList.remove('hidden');
  document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});
  const previousChapters=bookState.chapters.map(c=>({number:c.number,title:c.title,excerpt:c.excerpt}));
  const content=document.getElementById('chapterContent');
  let chapterText='';
  let cursor=document.createElement('span'); cursor.className='typing-cursor'; content.appendChild(cursor);
  try {
    const resp=await fetch('/api/book/chapter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,outline,chapterNum,previousChapters})});
    if(!resp.ok)throw new Error(`Server error: ${resp.status}`);
    const reader=resp.body.getReader(), decoder=new TextDecoder();
    let buf='';
    while(true){
      const {done,value}=await reader.read(); if(done) break;
      buf+=decoder.decode(value,{stream:true});
      const lines=buf.split('\n'); buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        const raw=line.slice(6).trim(); if(!raw)continue;
        let msg; try{msg=JSON.parse(raw);}catch{continue;}
        if(msg.error){showError(msg.error);break;}
        if(msg.correction){chapterText=msg.correction;cursor.remove();renderStory(content,chapterText,true);continue;}
        if(msg.text){chapterText+=msg.text;cursor.remove();renderStory(content,chapterText,false);cursor=document.createElement('span');cursor.className='typing-cursor';content.appendChild(cursor);}
        if(msg.chapterDone){
          cursor.remove(); renderStory(content,chapterText,true);
          document.getElementById('chapterGeneratingIndicator').classList.add('hidden');
          bookState.chapters.push({number:chapterNum,title:thisChapter.title||`Chapter ${chapterNum}`,content:chapterText,excerpt:msg.excerpt||chapterText.split(/\s+/).slice(0,400).join(' ')});
          updateTOC(chapterNum); bookState.generating=false;
          const doneActions=document.getElementById('bookDoneActions');
          doneActions.classList.remove('hidden');
          const prevBtn=document.getElementById('prevChapterBtn'), nextBtn=document.getElementById('nextChapterBtn'), finishedMsg=document.getElementById('bookFinishedMsg');
          prevBtn.classList.toggle('hidden',chapterNum<=1);
          if(msg.isLast){nextBtn.classList.add('hidden');finishedMsg.classList.add('show');}
          else{nextBtn.classList.remove('hidden');nextBtn.textContent=`Chapter ${chapterNum+1}: ${chapters[chapterNum]?.title||'Next'} →`;finishedMsg.classList.remove('show');}
          break;
        }
      }
    }
  } catch(err){
    cursor.remove();
    document.getElementById('chapterGeneratingIndicator').classList.add('hidden');
    content.innerHTML=`<p style="color:var(--danger)">⚠️ ${escHtml(err.message)}</p>`;
    bookState.generating=false;
  }
}

async function generateNextChapter(){if(bookState.generating)return;const n=bookState.currentChapter+1;if(n>(bookState.outline?.chapters||[]).length)return;await generateBookChapter(n,lastFormData);}
function goToPrevChapter(){const n=bookState.currentChapter-1;if(n<1)return;const prev=bookState.chapters.find(c=>c.number===n);if(!prev)return;bookState.currentChapter=n;document.getElementById('chapterTitle').textContent=prev.title;document.getElementById('chapterProgress').textContent=`Chapter ${n} of ${(bookState.outline?.chapters||[]).length}`;renderStory(document.getElementById('chapterContent'),prev.content,true);document.getElementById('chapterGeneratingIndicator').classList.add('hidden');const pB=document.getElementById('prevChapterBtn'),nB=document.getElementById('nextChapterBtn'),fM=document.getElementById('bookFinishedMsg');pB.classList.toggle('hidden',n<=1);nB.classList.remove('hidden');nB.textContent=`Chapter ${n+1}: ${bookState.chapters.find(c=>c.number===n+1)?.title||'Next'} →`;fM.classList.remove('show');document.getElementById('bookDoneActions').classList.remove('hidden');document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});updateTOCActive(n);}
function buildTOC(chapters){document.getElementById('tocList').innerHTML=chapters.map(c=>`<li class="toc-unread" id="tocItem${c.number}" onclick="tocNavigate(${c.number})"><span class="toc-ch-num">Ch ${c.number}</span><span>${escHtml(c.title)}</span></li>`).join('');}
function updateTOC(n){document.querySelectorAll('.toc-list li.toc-current').forEach(el=>el.classList.remove('toc-current'));document.getElementById(`tocItem${n}`)?.classList.remove('toc-unread');document.getElementById(`tocItem${n}`)?.classList.add('toc-current');}
function updateTOCActive(n){document.querySelectorAll('.toc-list li').forEach(el=>el.classList.remove('toc-current'));document.getElementById(`tocItem${n}`)?.classList.add('toc-current');}
function tocNavigate(n){const ch=bookState.chapters.find(c=>c.number===n);if(!ch){showToast('Chapter not generated yet');return;}bookState.currentChapter=n;document.getElementById('chapterTitle').textContent=ch.title;document.getElementById('chapterProgress').textContent=`Chapter ${n} of ${(bookState.outline?.chapters||[]).length}`;renderStory(document.getElementById('chapterContent'),ch.content,true);updateTOCActive(n);document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});}
function toggleTOC(){document.getElementById('tocPanel').classList.toggle('hidden');}

/* ===== SAVE / SHARE ===== */
async function saveStory() {
  if (!currentStoryText) return;
  if (!currentUser) { openAuthModal('login'); showToast('Sign in to save stories to your library.'); return; }
  const btn = document.getElementById('saveBtn');
  if (btn) { btn.textContent='💾 Saving...'; btn.disabled=true; }
  try {
    const res = await fetch('/api/share', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({title:currentStoryTitle, genre:lastFormData?.genre||'', tone:lastFormData?.tone||'', authorStyle:lastFormData?.authorStyle||'', content:currentStoryText}),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    showToast('Saved to your library!');
  } catch(err) {
    showToast(`Save failed: ${err.message}`);
  } finally {
    if (btn) { btn.textContent='💾 Save'; btn.disabled=false; }
  }
}

async function shareStory() {
  if (!currentStoryText) return;
  const btn = document.getElementById('shareBtn');
  if (btn) { btn.textContent='⏳'; btn.disabled=true; }
  try {
    const res = await fetch('/api/share', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({title:currentStoryTitle, genre:lastFormData?.genre||'', tone:lastFormData?.tone||'', authorStyle:lastFormData?.authorStyle||'', content:currentStoryText}),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    document.getElementById('shareUrlInput').value=`${location.origin}/s/${json.id}`;
    document.getElementById('shareModal').classList.remove('hidden');
  } catch(err) {
    showToast(`Share failed: ${err.message}`);
  } finally {
    if (btn) { btn.textContent='🔗 Share'; btn.disabled=false; }
  }
}
function closeShareModal(){document.getElementById('shareModal').classList.add('hidden');}
function copyShareLink(){const i=document.getElementById('shareUrlInput');navigator.clipboard.writeText(i.value).then(()=>showToast('Link copied!'));}

/* ===== COPY / DOWNLOAD / PRINT ===== */
function copyStory(){const text=`${currentStoryTitle}\n\n${currentStoryText}`;if(!text.trim())return;navigator.clipboard.writeText(text).then(()=>showToast('Copied!'));}
function downloadBook(){const text=`${bookState.bookTitle}\n${'='.repeat(bookState.bookTitle.length)}\n\n`+bookState.chapters.map(c=>`${c.title}\n${'-'.repeat(c.title.length)}\n\n${c.content}`).join('\n\n\n');const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${bookState.bookTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.txt`;a.click();URL.revokeObjectURL(url);showToast('Downloaded!');}
function downloadStory(){if(!currentStoryText)return;const full=`${currentStoryTitle}\n\n${currentStoryText}`;const blob=new Blob([full],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${currentStoryTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.txt`;a.click();URL.revokeObjectURL(url);showToast('Downloaded!');}
function printStory(){const isBook=bookState.active&&bookState.chapters.length>0;document.getElementById('printTitle').textContent=isBook?bookState.bookTitle:currentStoryTitle;let html='';if(isBook){html=bookState.chapters.map(c=>`<h2>${escHtml(c.title)}</h2>${c.content.split(/\n\n+/).filter(p=>p.trim()).map(p=>`<p>${escHtml(p.trim())}</p>`).join('')}`).join('<br>');}else{html=currentStoryText.split(/\n\n+/).filter(p=>p.trim()).map(p=>`<p>${escHtml(p.trim())}</p>`).join('');}document.getElementById('printContent').innerHTML=html;window.print();}

function resetForm(){
  lastFormData=null; currentStoryText=''; currentStoryTitle='Your Story';
  Object.assign(bookState,{active:false,bookTitle:'',tagline:'',outline:null,chapters:[],currentChapter:0,generating:false});
  document.getElementById('storyOutput').classList.add('hidden');
  document.getElementById('bookOutput').classList.add('hidden');
  document.getElementById('storyContent').innerHTML='';
  document.title='Story Forge — Generate Your Own Story';
  goToStep(1); window.scrollTo({top:0,behavior:'smooth'});
}

/* ===== HISTORY (localStorage) ===== */
const HISTORY_KEY='storyforge_history'; const MAX_HISTORY=10;
function saveToHistory(entry){const h=getHistory();h.unshift(entry);if(h.length>MAX_HISTORY)h.pop();localStorage.setItem(HISTORY_KEY,JSON.stringify(h));updateHistoryCount();}
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch{return[];}}
function updateHistoryCount(){}
function formatDate(ts){if(!ts)return'';try{const d=new Date(ts);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});}catch{return '';}}

function showError(msg){document.getElementById('generatingIndicator').classList.add('hidden');document.getElementById('storyContent').innerHTML=`<p style="color:var(--danger)">⚠️ ${escHtml(msg)}</p>`;}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),3000);}
