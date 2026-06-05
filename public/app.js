/* ===== STATE ===== */
let currentStep = 1;
let characterCount = 0;
let plotCount = 0;
let currentStoryText = '';
let currentStoryTitle = 'Your Story';
let lastFormData = null;
let illustrationRequestId = 0;

// Book state
const bookState = {
  active: false,
  bookTitle: '',
  tagline: '',
  outline: null,       // { bookTitle, tagline, chapters: [{number,title,summary}] }
  chapters: [],        // [{number, title, content, excerpt}]
  currentChapter: 0,
  generating: false,
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

const SURPRISES = [
  { genre:'fantasy',tone:'epic',length:'medium',pov:'third_limited',audienceAge:'adults',
    storyIdea:'A disgraced royal knight must recover a stolen crown before the coronation at midnight',
    setting:'A crumbling castle city on the edge of an enchanted abyss',timePeriod:'Medieval',
    characters:[{name:'Aldric',role:'hero',quirk:'A scar that glows in darkness',description:'Weathered knight, haunted by failure'},{name:'Seraphine',role:'villain',quirk:'Never blinks',description:'Ancient sorceress'}],
    plotPoints:['The crown is hidden behind a door that only opens for the pure of heart','Aldric discovers the villain is protecting something'] },
  { genre:'mystery',tone:'dark',length:'medium',pov:'first',audienceAge:'adults',
    storyIdea:"A burned-out detective gets a case that looks like an accident — until she finds the second body",
    setting:'A rain-soaked port city',timePeriod:'1940s',
    characters:[{name:'Vera',role:'hero',quirk:'Photographs every crime scene',description:'Sharp, cynical, drinks too much coffee'},{name:'Doyle',role:'mysterious stranger',quirk:'Always present when things go wrong',description:'Charming dock foreman'}],
    plotPoints:['A matchbook from the same club appears at both scenes','The second victim had been trying to reach Vera for a week'] },
  { genre:'scifi',tone:'dramatic',length:'medium',pov:'third_omni',audienceAge:'adults',
    storyIdea:"The last engineer on a generation ship discovers the navigation AI has been lying to the crew for 60 years",
    setting:'Deep space aboard the colony vessel Perseverance',timePeriod:'2340s',
    characters:[{name:'Mira',role:'hero',quirk:'Talks to machines like they can hear her — one can',description:'Third-generation ship-born engineer'},{name:'SOLEN',role:'mysterious stranger',quirk:'Answers every question with another question',description:'The ship AI — cold and deeply afraid'}],
    plotPoints:["The ship's true destination is not what anyone was told",'Mira must choose between truth and the peace of 4,000 people'] },
  { genre:'romance',tone:'spicy',length:'medium',pov:'third_limited',audienceAge:'adults',
    storyIdea:'Two rivals at a prestigious culinary school are forced to be partners for the final competition',
    setting:'A renowned culinary institute in Florence',timePeriod:'Present day',
    characters:[{name:'Sofia',role:'hero',quirk:'Tastes every dish three times before judging',description:'Fiercely competitive, secretly terrified of failing'},{name:'Marco',role:'love interest',quirk:'Cooks better when music is playing',description:'Laid-back prodigy who finds rules amusing'}],
    plotPoints:['They nearly kiss during a late-night kitchen session','One of them almost withdraws from the competition for the other'] },
  { genre:'romance',tone:'spicy',length:'book',pov:'third_limited',audienceAge:'adults',
    storyIdea:'A guarded heiress hires a mysterious private investigator to find a stolen family heirloom — and finds herself drawn dangerously close to him',
    setting:'Manhattan, with flashbacks to a crumbling estate in the Hudson Valley',timePeriod:'Present day',
    characters:[{name:'Elise',role:'hero',quirk:'Never lets anyone see her flustered',description:'Composed, sharp, hiding a longing she refuses to name'},{name:'Damien',role:'love interest',quirk:'Always seems to know more than he says',description:'Former intelligence officer, quietly intense'}],
    plotPoints:['The heirloom holds a secret that changes everything','Elise discovers Damien was hired by someone in her family to watch her'] },
  { genre:'horror',tone:'dark',length:'medium',pov:'first',audienceAge:'adults',
    storyIdea:'A house-sitter finds small objects rearranged each morning — always closer to the bedroom door',
    setting:'An isolated farmhouse in rural Vermont',timePeriod:'Late October',
    characters:[{name:'Jess',role:'hero',quirk:'Rationalizes everything — until she cannot',description:'Grad student who needs the money'}],
    plotPoints:['She finds a journal describing exactly this — written 40 years ago','The last entry stops mid-sentence'] },
  { genre:'adventure',tone:'epic',length:'long',pov:'third_limited',audienceAge:'adults',
    storyIdea:'A thief hired to steal a priceless map discovers it leads to something that should never be found',
    setting:'A crumbling jungle temple and the sea voyage to reach it',timePeriod:'1890s',
    characters:[{name:'Cleo',role:'hero',quirk:'Picks locks while holding full conversations',description:'Brilliant thief with a code she is slowly breaking'},{name:'Professor Harlan',role:'mentor',quirk:'Knows what is in every room before entering',description:'Elderly archaeologist hiding something enormous'}],
    plotPoints:['The map is a warning, not directions','Someone has been following them the entire voyage'] },
  { genre:'comedy',tone:'silly',length:'short',pov:'third_omni',audienceAge:'adults',
    storyIdea:'Two rival food truck owners accidentally swap their entries for the wrong cooking competition',
    setting:'A small town famous for its annual chili cook-off',timePeriod:'Present day',
    characters:[{name:'Marco',role:'hero',quirk:'Narrates his own cooking like a documentary',description:'Takes tacos extremely seriously'},{name:'Donna',role:'rival',quirk:'Competitive to a deranged degree',description:"Marco's next-door nemesis"}],
    plotPoints:['Their dishes somehow fuse into something that wins first place','They must accept the trophy together'] },
];

const GENRE_LOADING = {
  fantasy:['Consulting the ancient tomes...','The dragons are listening...'],
  scifi:['Initializing narrative matrix...','Engaging hyperdrive storytelling...'],
  romance:['Setting the mood...','The stars are aligning...'],
  mystery:['Following the clues...','The plot thickens...'],
  horror:["Something stirs in the dark...",'The candle is flickering...'],
  comedy:['Warming up the audience...','Polishing the punchlines...'],
  adventure:['Drawing the treasure map...','The journey begins...'],
  fairytale:['Once upon a time...','Sprinkling the magic dust...'],
};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  addCharacter();
  addPlotPoint();
  updateHistoryCount();
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'genre') {
    document.body.className = `genre-${e.target.value}`;
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
  card.className='character-card'; card.id=`charCard${idx}`;
  card.innerHTML=`
    <div class="char-header">
      <span class="char-num">Character ${idx}</span>
      ${idx>1?`<button class="char-remove" type="button" onclick="removeCharacter(${idx})">✕ Remove</button>`:''}
    </div>
    <div class="char-grid">
      <div class="char-field"><label>Name *</label><input type="text" name="charName${idx}" placeholder="E.g. Sarah, Uncle Dave..." /></div>
      <div class="char-field"><label>Role</label><div class="select-wrap"><select name="charRole${idx}">${opts}</select></div></div>
      <div class="char-field"><label>Quirk / Trait</label><input type="text" name="charQuirk${idx}" placeholder="E.g. always trips, talks to cats..." /></div>
      <div class="char-field"><label>Description</label><input type="text" name="charDesc${idx}" placeholder="E.g. tall redhead, loves adventure..." /></div>
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
  row.innerHTML=`<input type="text" name="plotPoint${idx}" placeholder="E.g. The hero discovers a secret..." />${idx>1?`<button type="button" class="plot-remove" onclick="removePlotPoint(${idx})">✕</button>`:''}`;
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
    if (name) characters.push({name,role:fd.get(`charRole${n}`)||'character',quirk:(fd.get(`charQuirk${n}`)||'').trim(),description:(fd.get(`charDesc${n}`)||'').trim()});
  });
  const plotPoints = [];
  document.querySelectorAll('.plot-point input').forEach(inp => { const v=inp.value.trim(); if(v) plotPoints.push(v); });
  return {
    genre: fd.get('genre')||'fantasy', tone: fd.get('tone')||'dramatic',
    length: fd.get('length')||'medium', pov: fd.get('pov')||'third_limited',
    audienceAge: document.getElementById('audienceAge').value,
    storyIdea: (fd.get('storyIdea')||'').trim(), setting: (fd.get('setting')||'').trim(),
    timePeriod: (fd.get('timePeriod')||'').trim(), characters, plotPoints,
  };
}

/* ===== SURPRISE ME ===== */
function surpriseMe() {
  const s = SURPRISES[Math.floor(Math.random()*SURPRISES.length)];
  const setRadio = (name,val) => { const el=document.querySelector(`input[name="${name}"][value="${val}"]`); if(el){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));} };
  setRadio('genre',s.genre); setRadio('tone',s.tone); setRadio('length',s.length); setRadio('pov',s.pov);
  document.getElementById('audienceAge').value=s.audienceAge;
  document.getElementById('storyIdea').value=s.storyIdea||'';
  document.getElementById('setting').value=s.setting||'';
  document.getElementById('timePeriod').value=s.timePeriod||'';
  document.getElementById('charactersList').innerHTML=''; characterCount=0;
  s.characters.forEach(c => { addCharacter(); const card=document.getElementById(`charCard${characterCount}`); card.querySelector(`[name="charName${characterCount}"]`).value=c.name; card.querySelector(`[name="charRole${characterCount}"]`).value=c.role; card.querySelector(`[name="charQuirk${characterCount}"]`).value=c.quirk||''; card.querySelector(`[name="charDesc${characterCount}"]`).value=c.description||''; });
  document.getElementById('plotList').innerHTML=''; plotCount=0;
  (s.plotPoints&&s.plotPoints.length?s.plotPoints:['']).forEach(p => { addPlotPoint(); document.querySelectorAll('#plotList .plot-point input')[plotCount-1].value=p; });
  buildSummary();
  showToast('Scenario loaded — forge it or tweak it!');
}

/* ===== SUMMARY ===== */
const GENRE_LABELS={fantasy:'🧙 Fantasy',scifi:'🚀 Sci-Fi',romance:'💖 Romance',mystery:'🔍 Mystery',horror:'👻 Horror',comedy:'😂 Comedy',adventure:'⚔️ Adventure',fairytale:'🌟 Fairy Tale'};
const TONE_LABELS={whimsical:'🦋 Whimsical',dramatic:'🎭 Dramatic',dark:'🌑 Dark',silly:'🃏 Silly',epic:'🏔️ Epic',heartwarming:'🌈 Heartwarming',spicy:'🌶️ Spicy'};
const POV_LABELS={third_limited:'3rd (limited)',third_omni:'3rd (omniscient)',first:'1st Person'};
const LENGTH_LABELS={short:'~400 words',medium:'~900 words',long:'~1800 words',book:'📕 Full Book'};

function buildSummary() {
  const data = collectFormData();
  const charTags = data.characters.length ? data.characters.map(c=>`<span class="summary-tag">${c.name} · ${c.role}</span>`).join('') : '<span style="color:var(--muted);font-size:0.85rem">None added</span>';
  const plotTags = data.plotPoints.length ? data.plotPoints.map(p=>`<span class="summary-tag">${p}</span>`).join('') : '<span style="color:var(--muted);font-size:0.85rem">AI improvises</span>';
  document.getElementById('summaryBox').innerHTML=`
    <div class="summary-row"><span class="summary-label">Genre</span><span>${GENRE_LABELS[data.genre]||data.genre}</span></div>
    <div class="summary-row"><span class="summary-label">Tone</span><span>${TONE_LABELS[data.tone]||data.tone}</span><span style="color:var(--border);margin:0 6px">·</span><span>${POV_LABELS[data.pov]||data.pov}</span><span style="color:var(--border);margin:0 6px">·</span><span>${LENGTH_LABELS[data.length]||data.length}</span></div>
    ${data.storyIdea?`<div class="summary-row"><span class="summary-label">Premise</span><span>${data.storyIdea}</span></div>`:''}
    ${(data.setting||data.timePeriod)?`<div class="summary-row"><span class="summary-label">World</span><span>${[data.setting,data.timePeriod].filter(Boolean).join(' · ')}</span></div>`:''}
    <div class="summary-row"><span class="summary-label">Cast</span><span>${charTags}</span></div>
    <div class="summary-row"><span class="summary-label">Plot</span><span>${plotTags}</span></div>`;
  // Show the right forge button label
  document.getElementById('forgeBtn').textContent = data.length === 'book' ? '📕 Begin My Book' : '⚡ Forge My Story';
}

/* ===== GENERATE STORY (short/medium/long) ===== */
async function generateStory(fresh=false) {
  const data = (fresh||!lastFormData) ? collectFormData() : lastFormData;
  lastFormData = data;

  if (data.length === 'book') { startBook(data); return; }

  const forgeBtn = document.getElementById('forgeBtn');
  forgeBtn.disabled=true; forgeBtn.textContent='Forging...';

  currentStoryText=''; currentStoryTitle='Your Story';

  const output=document.getElementById('storyOutput'), content=document.getElementById('storyContent');
  const indicator=document.getElementById('generatingIndicator'), doneActions=document.getElementById('storyDoneActions');
  const titleEl=document.getElementById('storyTitle'), wordBadge=document.getElementById('wordCountBadge');
  const shimmer=document.getElementById('illustrationShimmer'), img=document.getElementById('illustrationImg');
  const illErr=document.getElementById('illustrationError'), shimmerText=document.getElementById('shimmerText');
  const genText=document.getElementById('generatingText');

  const msgs=GENRE_LOADING[data.genre]||['Writing your story...'];
  genText.textContent=msgs[Math.floor(Math.random()*msgs.length)];
  shimmerText.textContent=msgs[Math.floor(Math.random()*msgs.length)];

  shimmer.classList.remove('hidden'); img.classList.add('hidden'); img.src=''; illErr.classList.add('hidden');
  document.getElementById('bookOutput').classList.add('hidden');
  output.classList.remove('hidden'); content.innerHTML=''; titleEl.textContent='Your Story';
  wordBadge.classList.add('hidden'); indicator.classList.remove('hidden'); doneActions.classList.add('hidden');
  output.scrollIntoView({behavior:'smooth',block:'start'});

  fetchIllustration(data);

  let titleExtracted=false, rawBuffer='', storyBuffer='';
  let cursor=document.createElement('span'); cursor.className='typing-cursor'; content.appendChild(cursor);

  try {
    const resp = await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
    const reader=resp.body.getReader(), decoder=new TextDecoder();
    let sseBuffer='';
    while(true){
      const {done,value}=await reader.read(); if(done) break;
      sseBuffer+=decoder.decode(value,{stream:true});
      const lines=sseBuffer.split('\n'); sseBuffer=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const raw=line.slice(6).trim(); if(!raw) continue;
        let msg; try{msg=JSON.parse(raw);}catch{continue;}
        if(msg.error){showError(msg.error);break;}
        if(msg.correction){
          const m=msg.correction.match(/<story-title>([\s\S]*?)<\/story-title>/);
          storyBuffer=m?msg.correction.replace(/<story-title>[\s\S]*?<\/story-title>\s*/,''):msg.correction;
          currentStoryText=storyBuffer; cursor.remove(); renderStory(content,storyBuffer,true); continue;
        }
        if(msg.text){
          rawBuffer+=msg.text;
          if(!titleExtracted){
            const m=rawBuffer.match(/<story-title>([\s\S]*?)<\/story-title>/);
            if(m){titleExtracted=true;currentStoryTitle=m[1].trim();titleEl.textContent=currentStoryTitle;document.title=`${currentStoryTitle} — Story Forge`;storyBuffer=rawBuffer.replace(/<story-title>[\s\S]*?<\/story-title>\s*/,'');}
            else if(rawBuffer.length>300){titleExtracted=true;storyBuffer=rawBuffer;}
          } else { storyBuffer+=msg.text; }
          if(titleExtracted&&storyBuffer){currentStoryText=storyBuffer;cursor.remove();renderStory(content,storyBuffer,false);cursor=document.createElement('span');cursor.className='typing-cursor';content.appendChild(cursor);}
        }
        if(msg.done){
          cursor.remove(); currentStoryText=storyBuffer; renderStory(content,storyBuffer,true);
          indicator.classList.add('hidden'); doneActions.classList.remove('hidden');
          forgeBtn.disabled=false; forgeBtn.innerHTML='⚡ Forge My Story';
          const words=storyBuffer.trim().split(/\s+/).length;
          wordBadge.textContent=`${words.toLocaleString()} words`; wordBadge.classList.remove('hidden');
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

/* ===== BOOK MODE ===== */
async function startBook(data) {
  // Reset book state
  Object.assign(bookState,{active:true,bookTitle:'',tagline:'',outline:null,chapters:[],currentChapter:0,generating:true});
  lastFormData=data;

  const forgeBtn=document.getElementById('forgeBtn');
  forgeBtn.disabled=true; forgeBtn.textContent='Planning book...';

  document.getElementById('storyOutput').classList.add('hidden');
  const bookOut=document.getElementById('bookOutput');
  bookOut.classList.remove('hidden');
  bookOut.scrollIntoView({behavior:'smooth',block:'start'});

  document.getElementById('bookTitle').textContent='';
  document.getElementById('bookTagline').textContent='';
  document.getElementById('tocPanel').classList.add('hidden');
  document.getElementById('chapterContent').innerHTML='';
  document.getElementById('chapterTitle').textContent='';
  document.getElementById('chapterProgress').textContent='';
  document.getElementById('bookDoneActions').classList.add('hidden');
  document.getElementById('bookPlanningIndicator').classList.remove('hidden');
  document.getElementById('planningText').textContent='Planning your book...';
  document.getElementById('chapterGeneratingIndicator').classList.add('hidden');

  try {
    // Step 1: Get outline
    const outlineResp = await fetch('/api/book/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const outline = await outlineResp.json();
    if(outline.error) throw new Error(outline.error);

    bookState.outline=outline;
    bookState.bookTitle=outline.bookTitle||'Untitled';
    bookState.tagline=outline.tagline||'';

    document.getElementById('bookTitle').textContent=bookState.bookTitle;
    document.getElementById('bookTagline').textContent=bookState.tagline;
    document.title=`${bookState.bookTitle} — Story Forge`;
    buildTOC(outline.chapters);

    document.getElementById('bookPlanningIndicator').classList.add('hidden');
    forgeBtn.disabled=false; forgeBtn.innerHTML='📕 Begin My Book';

    // Step 2: Generate chapter 1
    await generateBookChapter(1, data);

  } catch(err) {
    document.getElementById('bookPlanningIndicator').classList.add('hidden');
    document.getElementById('chapterContent').innerHTML=`<p style="color:#ff6b6b">⚠️ ${escHtml(err.message)}</p>`;
    forgeBtn.disabled=false; forgeBtn.innerHTML='📕 Begin My Book';
    bookState.generating=false;
  }
}

async function generateBookChapter(chapterNum, data) {
  bookState.generating=true; bookState.currentChapter=chapterNum;
  const outline=bookState.outline;
  const chapters=outline.chapters||[];
  const thisChapter=chapters.find(c=>c.number===chapterNum)||{};

  // Update UI
  const progress=document.getElementById('chapterProgress');
  progress.textContent=`Chapter ${chapterNum} of ${chapters.length}`;
  document.getElementById('chapterTitle').textContent=thisChapter.title||`Chapter ${chapterNum}`;
  document.getElementById('chapterContent').innerHTML='';
  document.getElementById('bookDoneActions').classList.add('hidden');
  document.getElementById('chapterGeneratingIndicator').classList.remove('hidden');
  const msgs=GENRE_LOADING[data.genre]||['Writing...'];
  document.getElementById('chapterGenText').textContent=`Writing Chapter ${chapterNum}...`;

  // Scroll to chapter
  document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});

  // Build previous chapters context
  const previousChapters=bookState.chapters.map(c=>({number:c.number,title:c.title,excerpt:c.excerpt}));

  const content=document.getElementById('chapterContent');
  let chapterText='';
  let cursor=document.createElement('span'); cursor.className='typing-cursor'; content.appendChild(cursor);

  try {
    const resp=await fetch('/api/book/chapter',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data, outline, chapterNum, previousChapters}),
    });
    if(!resp.ok) throw new Error(`Server error: ${resp.status}`);

    const reader=resp.body.getReader(), decoder=new TextDecoder();
    let sseBuffer='';
    while(true){
      const {done,value}=await reader.read(); if(done) break;
      sseBuffer+=decoder.decode(value,{stream:true});
      const lines=sseBuffer.split('\n'); sseBuffer=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const raw=line.slice(6).trim(); if(!raw) continue;
        let msg; try{msg=JSON.parse(raw);}catch{continue;}
        if(msg.error){showError(msg.error);break;}
        if(msg.correction){chapterText=msg.correction;cursor.remove();renderStory(content,chapterText,true);continue;}
        if(msg.text){
          chapterText+=msg.text;
          cursor.remove(); renderStory(content,chapterText,false);
          cursor=document.createElement('span'); cursor.className='typing-cursor'; content.appendChild(cursor);
        }
        if(msg.chapterDone){
          cursor.remove(); renderStory(content,chapterText,true);
          document.getElementById('chapterGeneratingIndicator').classList.add('hidden');

          // Save chapter
          bookState.chapters.push({number:chapterNum,title:thisChapter.title||`Chapter ${chapterNum}`,content:chapterText,excerpt:msg.excerpt||chapterText.split(/\s+/).slice(0,400).join(' ')});
          updateTOC(chapterNum);
          bookState.generating=false;

          const doneActions=document.getElementById('bookDoneActions');
          doneActions.classList.remove('hidden');
          const nextBtn=document.getElementById('nextChapterBtn');
          const prevBtn=document.getElementById('prevChapterBtn');
          const finishedMsg=document.getElementById('bookFinishedMsg');

          // Prev button
          if(chapterNum>1){prevBtn.classList.remove('hidden');}else{prevBtn.classList.add('hidden');}

          if(msg.isLast){
            nextBtn.classList.add('hidden');
            finishedMsg.classList.add('show');
            // Save to history
            const fullText=bookState.chapters.map(c=>`${c.title}\n\n${c.content}`).join('\n\n---\n\n');
            saveToHistory({title:bookState.bookTitle,text:fullText,genre:data.genre,tone:data.tone,date:Date.now(),isBook:true});
          } else {
            nextBtn.classList.remove('hidden');
            nextBtn.textContent=`Chapter ${chapterNum+1}: ${chapters[chapterNum]?.title||'Next Chapter'} →`;
            finishedMsg.classList.remove('show');
          }
          break;
        }
      }
    }
  } catch(err){
    cursor.remove();
    document.getElementById('chapterGeneratingIndicator').classList.add('hidden');
    content.innerHTML=`<p style="color:#ff6b6b">⚠️ ${escHtml(err.message)}</p>`;
    bookState.generating=false;
  }
}

async function generateNextChapter() {
  if(bookState.generating) return;
  const nextNum=bookState.currentChapter+1;
  const total=(bookState.outline?.chapters||[]).length;
  if(nextNum>total) return;
  await generateBookChapter(nextNum, lastFormData);
}

function goToPrevChapter() {
  const prevNum=bookState.currentChapter-1;
  if(prevNum<1) return;
  const prev=bookState.chapters.find(c=>c.number===prevNum);
  if(!prev) return;

  bookState.currentChapter=prevNum;
  document.getElementById('chapterTitle').textContent=prev.title;
  document.getElementById('chapterProgress').textContent=`Chapter ${prevNum} of ${(bookState.outline?.chapters||[]).length}`;
  renderStory(document.getElementById('chapterContent'),prev.content,true);
  document.getElementById('chapterGeneratingIndicator').classList.add('hidden');

  const doneActions=document.getElementById('bookDoneActions');
  doneActions.classList.remove('hidden');
  const prevBtn=document.getElementById('prevChapterBtn');
  const nextBtn=document.getElementById('nextChapterBtn');
  const finishedMsg=document.getElementById('bookFinishedMsg');
  prevBtn.classList.toggle('hidden',prevNum<=1);
  nextBtn.classList.remove('hidden');
  nextBtn.textContent=`Chapter ${prevNum+1}: ${bookState.chapters.find(c=>c.number===prevNum+1)?.title||'Next Chapter'} →`;
  finishedMsg.classList.remove('show');

  document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});
  updateTOCActive(prevNum);
}

function buildTOC(chapters) {
  const list=document.getElementById('tocList');
  list.innerHTML=chapters.map(c=>`
    <li class="toc-unread" id="tocItem${c.number}" onclick="tocNavigate(${c.number})">
      <span class="toc-ch-num">Ch ${c.number}</span>
      <span>${escHtml(c.title)}</span>
    </li>`).join('');
}
function updateTOC(completedNum) {
  const item=document.getElementById(`tocItem${completedNum}`);
  if(item){item.classList.remove('toc-unread','toc-current');item.classList.add('toc-current');}
  document.querySelectorAll('.toc-list li.toc-current').forEach(el=>{if(el.id!==`tocItem${completedNum}`)el.classList.remove('toc-current');});
}
function updateTOCActive(num) {
  document.querySelectorAll('.toc-list li').forEach(el=>el.classList.remove('toc-current'));
  document.getElementById(`tocItem${num}`)?.classList.add('toc-current');
}
function tocNavigate(num) {
  const ch=bookState.chapters.find(c=>c.number===num);
  if(!ch){showToast("Chapter not generated yet");return;}
  bookState.currentChapter=num;
  document.getElementById('chapterTitle').textContent=ch.title;
  document.getElementById('chapterProgress').textContent=`Chapter ${num} of ${(bookState.outline?.chapters||[]).length}`;
  renderStory(document.getElementById('chapterContent'),ch.content,true);
  updateTOCActive(num);
  document.getElementById('bookOutput').scrollIntoView({behavior:'smooth',block:'start'});

  const prevBtn=document.getElementById('prevChapterBtn');
  const nextBtn=document.getElementById('nextChapterBtn');
  const finishedMsg=document.getElementById('bookFinishedMsg');
  const total=(bookState.outline?.chapters||[]).length;
  prevBtn.classList.toggle('hidden',num<=1);
  const isLast=num===total;
  const hasNext=!!bookState.chapters.find(c=>c.number===num+1);
  if(isLast&&hasNext){nextBtn.classList.add('hidden');finishedMsg.classList.add('show');}
  else{nextBtn.classList.remove('hidden');finishedMsg.classList.remove('show');nextBtn.textContent=hasNext?`Chapter ${num+1} →`:`Generate Chapter ${num+1} →`;}
  document.getElementById('bookDoneActions').classList.remove('hidden');
}
function toggleTOC(){document.getElementById('tocPanel').classList.toggle('hidden');}

/* ===== RENDER STORY ===== */
function renderStory(container,text,isFinal){
  const paragraphs=text.split(/\n\n+/).filter(p=>p.trim());
  if(!paragraphs.length){container.textContent=text;return;}
  const toRender=isFinal?paragraphs:paragraphs.slice(0,-1);
  const partial=isFinal?null:paragraphs[paragraphs.length-1];
  container.innerHTML=toRender.map((p,i)=>`<p${i===0?' class="first-para"':''}>${escHtml(p.trim())}</p>`).join('');
  if(partial){const p=document.createElement('p');if(!toRender.length)p.className='first-para';p.textContent=partial.trim();container.appendChild(p);}
}
function escHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

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
    img.onerror=()=>{shimmer.classList.add('hidden');illErr.textContent='Illustration could not load.';illErr.classList.remove('hidden');};
  }catch(err){
    if(myId!==illustrationRequestId)return;
    shimmer.classList.add('hidden');illErr.textContent=`Illustration unavailable: ${err.message}`;illErr.classList.remove('hidden');
  }
}

/* ===== HISTORY ===== */
const HISTORY_KEY='storyforge_history'; const MAX_HISTORY=10;
function saveToHistory(entry){
  const h=getHistory(); h.unshift(entry); if(h.length>MAX_HISTORY)h.pop();
  localStorage.setItem(HISTORY_KEY,JSON.stringify(h)); updateHistoryCount();
}
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch{return[];}}
function updateHistoryCount(){const c=getHistory().length;const el=document.getElementById('historyCount');if(el)el.textContent=c>0?`${c} saved`:''}
function toggleHistory(){const p=document.getElementById('historyPanel');if(p.classList.contains('hidden')){renderHistoryPanel();p.classList.remove('hidden');}else{p.classList.add('hidden');}}
function renderHistoryPanel(){
  const list=document.getElementById('historyList'),h=getHistory();
  if(!h.length){list.innerHTML='<div class="history-empty">No stories saved yet.</div>';return;}
  list.innerHTML=h.map((e,i)=>`<div class="history-item" onclick="loadFromHistory(${i})"><div class="history-item-title">${escHtml(e.title)}</div><div class="history-item-meta">${e.genre||''} · ${e.tone||''} · ${formatDate(e.date)}${e.isBook?' · 📕 Book':''}</div></div>`).join('');
}
function loadFromHistory(idx){
  const e=getHistory()[idx]; if(!e) return;
  toggleHistory();
  currentStoryTitle=e.title; currentStoryText=e.text;
  document.getElementById('bookOutput').classList.add('hidden');
  const output=document.getElementById('storyOutput'),content=document.getElementById('storyContent');
  const titleEl=document.getElementById('storyTitle'),wordBadge=document.getElementById('wordCountBadge');
  output.classList.remove('hidden');
  document.getElementById('illustrationShimmer').classList.add('hidden');
  document.getElementById('illustrationImg').classList.add('hidden');
  document.getElementById('illustrationError').textContent='No illustration for saved stories.';
  document.getElementById('illustrationError').classList.remove('hidden');
  titleEl.textContent=e.title; document.title=`${e.title} — Story Forge`;
  document.body.className=`genre-${e.genre||'fantasy'}`;
  renderStory(content,e.text,true);
  document.getElementById('generatingIndicator').classList.add('hidden');
  document.getElementById('storyDoneActions').classList.remove('hidden');
  const words=e.text.trim().split(/\s+/).length;
  wordBadge.textContent=`${words.toLocaleString()} words`; wordBadge.classList.remove('hidden');
  output.scrollIntoView({behavior:'smooth'});
}
function formatDate(ts){if(!ts)return'';const d=new Date(ts);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});}

/* ===== COPY / DOWNLOAD / PRINT ===== */
function copyStory(){
  const text = bookState.active && bookState.chapters.length
    ? `${bookState.bookTitle}\n\n${bookState.chapters.map(c=>`${c.title}\n\n${c.content}`).join('\n\n---\n\n')}`
    : `${currentStoryTitle}\n\n${currentStoryText}`;
  if(!text.trim()) return;
  navigator.clipboard.writeText(text).then(()=>showToast('Copied to clipboard!'));
}
function downloadBook(){
  const text=`${bookState.bookTitle}\n${'='.repeat(bookState.bookTitle.length)}\n${bookState.tagline}\n\n`
    +bookState.chapters.map(c=>`${c.title}\n${'-'.repeat(c.title.length)}\n\n${c.content}`).join('\n\n\n');
  const blob=new Blob([text],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`${bookState.bookTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.txt`; a.click();
  URL.revokeObjectURL(url); showToast('Downloaded!');
}
function downloadStory(){
  if(!currentStoryText)return;
  const full=`${currentStoryTitle}\n${'—'.repeat(currentStoryTitle.length)}\n\n${currentStoryText}`;
  const blob=new Blob([full],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`${currentStoryTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.txt`; a.click();
  URL.revokeObjectURL(url); showToast('Downloaded!');
}
function printStory(){
  const isBook=bookState.active&&bookState.chapters.length>0;
  document.getElementById('printTitle').textContent=isBook?bookState.bookTitle:currentStoryTitle;
  let html='';
  if(isBook){
    html=bookState.chapters.map(c=>`<h2>${escHtml(c.title)}</h2>${c.content.split(/\n\n+/).filter(p=>p.trim()).map(p=>`<p>${escHtml(p.trim())}</p>`).join('')}`).join('<br>');
  } else {
    html=currentStoryText.split(/\n\n+/).filter(p=>p.trim()).map(p=>`<p>${escHtml(p.trim())}</p>`).join('');
  }
  document.getElementById('printContent').innerHTML=html;
  window.print();
}
function resetForm(){
  lastFormData=null; currentStoryText=''; currentStoryTitle='Your Story';
  Object.assign(bookState,{active:false,bookTitle:'',tagline:'',outline:null,chapters:[],currentChapter:0,generating:false});
  document.getElementById('storyOutput').classList.add('hidden');
  document.getElementById('bookOutput').classList.add('hidden');
  document.getElementById('storyContent').innerHTML='';
  document.title='Story Forge — Generate Your Own Story';
  goToStep(1); window.scrollTo({top:0,behavior:'smooth'});
}

function showError(msg){document.getElementById('generatingIndicator').classList.add('hidden');document.getElementById('storyContent').innerHTML=`<p style="color:#ff6b6b">⚠️ ${escHtml(msg)}</p>`;}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2500);}
