/* ═══════════ State ═══════════ */
const KEY='maxim_tagesplan_v1';
const TEMPLATE_VERSION=3;   // hochzählen, wenn DEFAULT_TEMPLATE geändert wird
let S={mode:'normal',days:{},template:null};
let selOffset=0;      // 0 = heute, +1 = morgen, ...
let editingIdx=null;  // Index des Blocks, der gerade bearbeitet wird (null = keiner)
let popTaskId=null;   // Aufgabe, die gerade angetippt wurde (für die Animation)
let feiern=false;     // true, wenn mit diesem Tipp alle Pflichten erfüllt wurden

function uid(){ return 'x'+Math.random().toString(36).slice(2,9); }

const DEFAULT_TEMPLATE={
  normal:[
    {id:'start',t:'07:30 – 08:00',n:'Start',h:'Aufstehen ohne Handy. Wasser, anziehen, 15 Min Buch lesen.',counter:null,tasks:[]},
    {id:'anlauf',t:'08:00 – 08:45',n:'Anlauf',h:'Kurz an den Rechner, bevor der Tag richtig losgeht.',counter:null,tasks:[]},
    {id:'fruehstueck',t:'08:45 – 09:45',n:'Frühstück',h:'Richtig essen, nicht nebenbei. Gehört fest zum Tag.',counter:null,tasks:[]},
    {id:'bauen',t:'09:45 – 12:15',n:'Bauen',h:'Beste Energie für die wichtigste Arbeit. Keine Mails, kein Insta vorher.',counter:null,tasks:[
      {id:'deep',l:'Deep-Work-Block gemacht',duty:true}
    ]},
    {id:'train',t:'12:15 – 13:15',n:'Training',h:'Calisthenics als Reset. Kurz mitfilmen, das ist später Content.',counter:null,tasks:[
      {id:'sport',l:'Training gemacht'}
    ]},
    {id:'verkaufen',t:'13:15 – 14:45',n:'Verkaufen',h:'Personalisierte Erstkontakte plus fällige Follow-ups. 3 sind besser als 0.',counter:{goal:5},tasks:[
      {id:'fu',l:'Follow-ups aus der Pipeline erledigt'}
    ]},
    {id:'pause',t:'14:45 – 15:45',n:'Pause',h:'Essen, raus, bewusst offline.',counter:null,tasks:[]},
    {id:'kunden',t:'15:45 – 18:45',n:'Kundenarbeit',h:'Laufende Projekte, GmbH-Marketing, Calls. Calls nie in den Morgen legen.',counter:null,tasks:[
      {id:'client',l:'Wichtigste Kundenaufgabe erledigt'}
    ]},
    {id:'doku',t:'18:45 – 19:30',n:'Dokumentieren',h:'Ein Piece über das, was du heute wirklich gemacht hast.',counter:null,tasks:[
      {id:'content',l:'1 Content-Piece gepostet',duty:true}
    ]},
  ],
  baustelle:[
    {id:'mini',t:'05:45 – 06:30',n:'Verkaufen Mini',h:'Vor der Baustelle. 3 Kontakte oder Follow-ups, dann raus.',counter:{goal:3},tasks:[]},
    {id:'bau',t:'07:00 – 17:00',n:'Baustelle',h:'Der Marketer, der wirklich auf dem Dach steht. Clips mitnehmen.',counter:null,tasks:[
      {id:'clip',l:'Kurzen Clip gefilmt (optional)'}
    ]},
    {id:'ads',t:'17:15 – 17:30',n:'Ads-Check',h:'Einmal Zahlen checken, nichts umbauen, wenn es läuft.',counter:null,tasks:[
      {id:'adcheck',l:'Kampagnen-Zahlen gecheckt'}
    ]},
    {id:'doku',t:'18:00 – 18:30',n:'Dokumentieren',h:'Ein Piece posten, gern der Baustellen-Clip. Kette hält.',counter:null,tasks:[
      {id:'content',l:'1 Content-Piece gepostet',duty:true}
    ]},
  ]
};

function clonePlan(p){ return JSON.parse(JSON.stringify(p)); }

function keyOf(date){
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
function selDate(){
  const d=new Date(); d.setDate(d.getDate()+selOffset); return d;
}
function selKey(){ return keyOf(selDate()); }

function dayRec(k,mode){
  if(!S.days[k]){
    const m=mode||S.mode;
    S.days[k]={outreach:0,tasks:{},shutdown:{kpi:'',top:''},closed:false,mode:m,
               plan:clonePlan(S.template[m])};
  }
  const d=S.days[k];
  if(!d.plan) d.plan=clonePlan(S.template[d.mode||'normal']); // Migration alter Tage
  return d;
}
function sel(){ return dayRec(selKey()); }

function hasLocalStorage(){
  try{
    const t='__ls_test__';
    localStorage.setItem(t,'1');
    localStorage.removeItem(t);
    return true;
  }catch(e){ return false; }
}
const LS_AVAILABLE=hasLocalStorage();

async function load(){
  try{
    if(LS_AVAILABLE){
      const raw=localStorage.getItem(KEY);
      if(raw) S=JSON.parse(raw);
    }
  }catch(e){}
  if(!S.days) S.days={};
  if(!S.mode) S.mode='normal';
  if(!S.template) S.template=clonePlan(DEFAULT_TEMPLATE);

  /* Migration: neue Standard-Zeiten (Start 07:30) übernehmen.
     Vergangene Tage bleiben unangetastet, damit der Verlauf stimmt. */
  if(S.templateVersion!==TEMPLATE_VERSION){
    S.template=clonePlan(DEFAULT_TEMPLATE);
    const todayKey=keyOf(new Date());
    Object.keys(S.days).forEach(k=>{
      if(k>=todayKey){
        const rec=S.days[k];
        rec.plan=clonePlan(S.template[rec.mode||'normal']);
      }
    });
    S.templateVersion=TEMPLATE_VERSION;
    persist();
  }
}
let saveTimer=null;
function persist(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    if(!LS_AVAILABLE) return;
    try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){}
  },300);
}

/* ═══════════ Export / Import ═══════════ */
function exportData(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const d=new Date();
  const stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const a=document.createElement('a');
  a.href=url;
  a.download='tagesplan-backup-'+stamp+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function triggerImport(){
  document.getElementById('importFile').click();
}
function importData(ev){
  const file=ev.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      if(!parsed||typeof parsed!=='object'||!parsed.days||!parsed.template){
        alert('Diese Datei sieht nicht wie eine gültige Tagesplan-Sicherung aus.');
        return;
      }
      if(!confirm('Die aktuellen Daten auf diesem Gerät werden durch die Sicherung ersetzt. Fortfahren?')) return;
      S=parsed;
      persist();
      render();
      alert('Daten wurden wiederhergestellt.');
    }catch(e){
      alert('Datei konnte nicht gelesen werden.');
    }
  };
  reader.readAsText(file);
  ev.target.value='';
}

/* ═══════════ Logik ═══════════ */
function counterBlock(d){ return (d.plan||[]).find(b=>b.counter); }
function goalOf(d){
  const cb=counterBlock(d);
  return cb?cb.counter.goal:goalFallback(d.mode);
}
function goalFallback(m){ return m==='baustelle'?3:5; }
function dutyList(d){
  const list=[];
  if(counterBlock(d)) list.push((d.outreach||0)>=goalOf(d));
  for(const b of (d.plan||[])) for(const t of b.tasks) if(t.duty) list.push(!!d.tasks[t.id]);
  return list.length?list:[(d.outreach||0)>=goalFallback(d.mode)];
}
function isComplete(d){ return dutyList(d).every(Boolean); }
function isPartial(d){ return (d.outreach||0)>0 || Object.values(d.tasks||{}).some(v=>v); }

function calcStreak(){
  let s=0;
  const now=new Date();
  const t=S.days[keyOf(now)];
  if(t&&isComplete(t)) s++;
  for(let i=1;i<=365;i++){
    const c=new Date(now); c.setDate(now.getDate()-i);
    if(c.getDay()===0||c.getDay()===6) continue;
    const rec=S.days[keyOf(c)];
    if(rec&&isComplete(rec)) s++;
    else break;
  }
  return s;
}

function parseTime(t){
  const m=String(t).match(/(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/);
  if(!m) return null;
  return {from:+m[1]*60+ +m[2], to:+m[3]*60+ +m[4]};
}
/* Verbleibende Zeit im laufenden Block, z. B. "Noch 40 Minuten" */
function restText(min){
  if(min<1) return '';
  if(min<60) return 'Noch '+min+(min===1?' Minute':' Minuten');
  const h=Math.floor(min/60), r=min%60;
  return 'Noch '+h+(h===1?' Stunde':' Stunden')+(r?' '+r+' Min':'');
}
/* Minuten → "HH:MM" für die Zeitfelder im Bearbeiten-Modus */
function minToHHMM(m){
  return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
}
/* "07:30 – 08:00" → {from:'07:30', to:'08:00'}
   Beide Seiten werden einzeln gelesen, damit eine leere Hälfte
   die andere nicht mitreißt. */
function timeFields(t){
  const half=s=>{
    const m=String(s||'').trim().match(/^(\d{1,2})[:.](\d{2})$/);
    return m?String(+m[1]).padStart(2,'0')+':'+m[2]:'';
  };
  const s=String(t||'');
  /* Trenner mit Leerzeichen zuerst, damit Bindestriche im Platzhalter
     "--:--" nicht als Trenner missverstanden werden. */
  let parts=s.split(/\s+[–—-]\s+/);
  if(parts.length<2) parts=s.split(/[–—]/);
  if(parts.length<2) parts=s.split('-');
  return {from:half(parts[0]), to:half(parts[1])};
}

/* ═══════════ Actions ═══════════ */
function shiftDay(v){
  selOffset=Math.max(-14,Math.min(14,selOffset+v));
  editingIdx=null;
  render();
}
function goToday(){ selOffset=0; editingIdx=null; render(); }
function setMode(m){
  const d=sel();
  if(d.mode!==m && !d.closed){
    d.mode=m;
    /* Plan nur ersetzen, wenn er noch unangetastet dem anderen Template entspricht */
    d.plan=clonePlan(S.template[m]);
    d.tasks={}; d.outreach=0;
  }
  if(selOffset===0) S.mode=m;
  editingIdx=null;
  persist(); render();
}
function startEdit(bi){ editingIdx=bi; render(); }
function stopEdit(){ editingIdx=null; render(); }
function toggleTask(tid){
  const d=sel();
  const warKomplett=isComplete(d);
  d.tasks[tid]=!d.tasks[tid];
  /* Nur die gerade angetippte Zeile animieren, nicht alle abgehakten */
  popTaskId = d.tasks[tid] ? tid : null;
  feiern = !warKomplett && isComplete(d);
  persist(); render();
  popTaskId=null; feiern=false;
}
function bump(v){
  const d=sel();
  const warKomplett=isComplete(d);
  d.outreach=Math.max(0,(d.outreach||0)+v);
  feiern = !warKomplett && isComplete(d);
  persist(); render();
  feiern=false;
}
function closeDay(){
  const d=sel();
  d.shutdown.kpi=document.getElementById('inKpi').value.trim();
  d.shutdown.top=document.getElementById('inTop').value.trim();
  d.closed=true; persist(); render();
}
function reopenDay(){ sel().closed=false; persist(); render(); }

/* Edit-Aktionen */
function updBlock(bi,field,el){
  const d=sel();
  if(field==='goal'){ d.plan[bi].counter.goal=Math.max(1,parseInt(el.value)||1); }
  else d.plan[bi][field]=el.value;
  persist();
}
/* Von-/Bis-Feld ändern und daraus wieder "HH:MM – HH:MM" bauen */
function updTime(bi,which,el){
  const d=sel();
  const cur=timeFields(d.plan[bi].t);
  cur[which]=el.value;
  d.plan[bi].t=(cur.from||'--:--')+' – '+(cur.to||'--:--');
  persist();
}
function updTask(bi,ti,el){
  sel().plan[bi].tasks[ti].l=el.value; persist();
}
function addTask(bi){
  sel().plan[bi].tasks.push({id:uid(),l:'Neue Aufgabe'});
  persist(); render();
}
function delTask(bi,ti){
  const d=sel();
  const t=d.plan[bi].tasks[ti];
  delete d.tasks[t.id];
  d.plan[bi].tasks.splice(ti,1);
  persist(); render();
}
function addBlock(){
  const p=sel().plan;
  p.push({id:uid(),t:'18:00 – 19:00',n:'Neuer Block',h:'',counter:null,tasks:[]});
  editingIdx=p.length-1;   // neuen Block direkt zum Bearbeiten öffnen
  persist(); render();
}
function delBlock(bi){
  const d=sel();
  for(const t of d.plan[bi].tasks) delete d.tasks[t.id];
  d.plan.splice(bi,1);
  editingIdx=null;
  persist(); render();
}
function moveBlock(bi,dir){
  const p=sel().plan;
  const ni=bi+dir;
  if(ni<0||ni>=p.length) return;
  [p[bi],p[ni]]=[p[ni],p[bi]];
  if(editingIdx===bi) editingIdx=ni;   // Bearbeitung folgt dem Block
  persist(); render();
}
function saveAsTemplate(){
  const d=sel();
  const modeName=(d.mode==='baustelle')?'Baustellenwoche':'Normale Woche';
  if(!confirm('Aufbau dieses Tages als Standard für alle künftigen Tage im Modus „'+modeName+'" speichern?')) return;
  S.template[d.mode||'normal']=clonePlan(d.plan);
  editingIdx=null;
  persist(); render();
}

/* ═══════════ Render ═══════════ */
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const WDAYS=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function render(){
  const d=sel();
  const sd=selDate();
  const isToday=selOffset===0;
  document.body.dataset.mode=d.mode||'normal';

  const now=new Date();
  const mins=now.getHours()*60+now.getMinutes();
  const weekend=(sd.getDay()===0||sd.getDay()===6);

  /* Kopf */
  document.getElementById('dateLine').textContent =
    WDAYS[now.getDay()]+', '+now.getDate()+'. '+MONTHS[now.getMonth()];

  /* Tages-Navigation */
  document.getElementById('selDayName').textContent =
    isToday?'Heute':(selOffset===1?'Morgen':(selOffset===-1?'Gestern':WDAYS[sd.getDay()]));
  document.getElementById('selDayDate').textContent =
    sd.getDate()+'. '+MONTHS[sd.getMonth()]+(weekend?' · Wochenende':'');
  document.getElementById('prevBtn').disabled=(selOffset<=-14);
  document.getElementById('nextBtn').disabled=(selOffset>=14);
  document.getElementById('planBanner').innerHTML =
    isToday?'':
    '<div class="planbanner">'+(selOffset>0?'Du planst diesen Tag im Voraus':'Rückblick, nur zur Ansicht')+
    ' · <a href="javascript:goToday()" style="color:inherit;font-weight:600">Zu Heute</a></div>';

  /* Modus */
  document.getElementById('mNormal').classList.toggle('active',(d.mode||'normal')==='normal');
  document.getElementById('mBau').classList.toggle('active',d.mode==='baustelle');

  /* Streak + Pflichten */
  const streak=calcStreak();
  document.getElementById('streak').textContent=streak;
  document.getElementById('streakUnit').textContent=(streak===1)?'Tag':'Tage';
  const du=dutyList(d);
  const done=du.filter(Boolean).length;
  document.getElementById('dutyLabel').textContent='Pflichten '+(isToday?'heute':'an dem Tag');
  document.getElementById('dutyCount').textContent=done+'/'+du.length;
  document.getElementById('dutyBar').style.width=(done/du.length*100)+'%';
  const dutyStat=document.getElementById('dutyStat');
  dutyStat.classList.toggle('done',done===du.length);
  if(feiern){
    dutyStat.classList.remove('celebrate');
    void dutyStat.offsetWidth;          // Animation neu starten
    dutyStat.classList.add('celebrate');
  }else{
    dutyStat.classList.remove('celebrate');
  }

  /* Verlauf */
  const list=[];
  const c=new Date();
  while(list.length<14){
    if(c.getDay()!==0&&c.getDay()!==6) list.unshift(keyOf(c));
    c.setDate(c.getDate()-1);
  }
  const tk=keyOf(new Date());
  let dotsHtml='';
  for(const k of list){
    const rec=S.days[k];
    let cls='d';
    if(rec&&isComplete(rec)) cls+=' full';
    else if(rec&&isPartial(rec)) cls+=' part';
    if(k===tk) cls+=' today';
    dotsHtml+='<div class="'+cls+'"></div>';
  }
  document.getElementById('dots').innerHTML=dotsHtml;

  /* Top-Aufgabe (nur heute) */
  let carry='';
  if(isToday){
    for(let i=1;i<=4;i++){
      const p=new Date(); p.setDate(p.getDate()-i);
      const rec=S.days[keyOf(p)];
      if(rec&&rec.shutdown&&rec.shutdown.top){
        carry='<div class="topcarry"><div class="icon">1</div><div>'
          +'<div class="t">Zuerst anfassen</div>'
          +'<div class="x">'+esc(rec.shutdown.top)+'</div></div></div>';
        break;
      }
    }
  }
  document.getElementById('carry').innerHTML=carry;

  document.getElementById('planHead').textContent =
    isToday?'Dein Tag':WDAYS[sd.getDay()]+' planen';

  /* Blöcke */
  document.getElementById('blocks').innerHTML = renderView(d,isToday,weekend,mins);
}

function renderView(d,isToday,weekend,mins){
  let html='';
  d.plan.forEach((b,bi)=>{
    if(editingIdx===bi){ html+=renderBlockEdit(b,bi,d); return; }
    const tm=parseTime(b.t);
    const isNow=isToday&&!weekend&&tm&&mins>=tm.from&&mins<tm.to;
    const isPast=isToday&&!weekend&&tm&&mins>=tm.to;
    html+='<div class="block'+(isNow?' now':'')+(isPast?' past':'')+'">';
    html+='<div class="bhead"><div class="brow1"><span class="btime">'+esc(b.t)+'</span>'
      +'<span class="bactions">'
      +(isNow?'<span class="nowpill">Jetzt</span>':'')
      +'<button class="editlink" onclick="startEdit('+bi+')">Bearbeiten</button>'
      +'</span></div>';
    html+='<div class="bname">'+esc(b.n)+'</div>';
    if(b.h) html+='<div class="bhint">'+esc(b.h)+'</div>';
    if(isNow){
      const rest=restText(tm.to-mins);
      if(rest) html+='<div class="brest">'+rest+'</div>';
    }
    html+='</div>';
    if(b.counter){
      const v=d.outreach||0;
      const hit=v>=b.counter.goal;
      html+='<div class="steprow">'
        +'<div class="stepval">Kontakte: <b class="'+(hit?'hit':'')+'">'+v+' / '+b.counter.goal+'</b>'+(hit?' ✓':'')+'</div>'
        +'<div class="stepper"><button onclick="bump(-1)">−</button><div class="div"></div><button onclick="bump(1)">+</button></div>'
        +'</div>';
    }
    b.tasks.forEach(t=>{
      const ck=!!d.tasks[t.id];
      const pop=(popTaskId===t.id)?' pop':'';
      html+='<div class="row'+(ck?' checked':'')+pop+'" onclick="toggleTask(\''+t.id+'\')">'
        +'<div class="check"></div><div class="rlabel">'+esc(t.l)+(t.duty?' <span class="rduty">· Pflicht</span>':'')+'</div></div>';
    });
    html+='</div>';
  });

  html+='<div class="planactions">'
    +'<button class="footerbtn" onclick="addBlock()">+ Block hinzufügen</button>'
    +'<span class="footersep"> · </span>'
    +'<button class="footerbtn" onclick="saveAsTemplate()">Als Standard speichern</button>'
    +'</div>';

  /* Shutdown nur heute */
  if(isToday){
    const allDone=isComplete(d);
    html+='<div class="sechead">Abends · 10 Minuten</div>';
    html+='<div class="block'+(!weekend&&mins>=1170?' now':'')+'">'
      +'<div class="bhead"><div class="brow1"><span class="btime">Shutdown</span>'
      +(!weekend&&mins>=1170?'<span class="nowpill">Jetzt</span>':'')+'</div>'
      +'<div class="bname">Tag abschließen</div>'
      +'<div class="bhint">Zahlen festhalten, Top-Aufgabe für morgen setzen, Kopf frei.</div></div>'
      +'<div class="form">'
      +'<label>Wichtigste Ad-Kennzahl heute</label>'
      +'<input id="inKpi" value="'+esc(d.shutdown.kpi||'')+'" placeholder="z. B. CPL 14,20 €"'+(d.closed?' disabled':'')+'>'
      +'<label>Top-Aufgabe für morgen früh</label>'
      +'<input id="inTop" value="'+esc(d.shutdown.top||'')+'" placeholder="Das Erste, was du morgen anfasst"'+(d.closed?' disabled':'')+'>'
      +(d.closed
        ?'<div class="savedmsg">✓ Abgeschlossen · '+(allDone?'Alle Pflichten erfüllt':'Teilweise, morgen wieder voll')+'</div>'
         +'<button class="savebtn" style="background:var(--fill);color:var(--accent);margin-top:10px" onclick="reopenDay()">Bearbeiten</button>'
        :'<button class="savebtn" onclick="closeDay()">Tag abschließen</button>')
      +'</div></div>';
  }
  return html;
}

/* Bearbeitungs-Karte für genau einen Block */
function renderBlockEdit(b,bi,d){
  let html='<div class="editcard">';
  const tf=timeFields(b.t);
  html+='<label>Zeit</label>'
    +'<div class="timeedit">'
    +'<input type="time" value="'+tf.from+'" onchange="updTime('+bi+',\'from\',this)">'
    +'<span class="timesep">bis</span>'
    +'<input type="time" value="'+tf.to+'" onchange="updTime('+bi+',\'to\',this)">'
    +'</div>';
  html+='<label>Titel</label><input value="'+esc(b.n)+'" onchange="updBlock('+bi+',\'n\',this)">';
  html+='<label>Beschreibung</label><input value="'+esc(b.h||'')+'" onchange="updBlock('+bi+',\'h\',this)">';
  if(b.counter){
    html+='<label>Kontakt-Ziel (Pflicht)</label><input type="number" min="1" value="'+b.counter.goal+'" onchange="updBlock('+bi+',\'goal\',this)">';
  }
  if(b.tasks.length) html+='<label>Aufgaben</label>';
  b.tasks.forEach((t,ti)=>{
    html+='<div class="taskedit"><input value="'+esc(t.l)+'" onchange="updTask('+bi+','+ti+',this)">'
      +'<button class="delx" onclick="delTask('+bi+','+ti+')">✕</button></div>';
  });
  html+='<div class="editactions">'
    +'<span><button class="minorbtn" onclick="addTask('+bi+')">+ Aufgabe</button>'
    +' <button class="minorbtn" onclick="moveBlock('+bi+',-1)">↑</button>'
    +' <button class="minorbtn" onclick="moveBlock('+bi+',1)">↓</button></span>'
    +'<button class="minorbtn red" onclick="delBlock('+bi+')">Block löschen</button></div>';
  html+='<button class="bigbtn primary" onclick="stopEdit()">Fertig</button>';
  html+='</div>';
  return html;
}

if('serviceWorker' in navigator){
  /* Beim allerersten Besuch gibt es noch keinen Controller – dann ist der
     Wechsel keine Aktualisierung und ein Neuladen wäre unnötig. */
  const hatteController=!!navigator.serviceWorker.controller;
  let ladeNeu=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hatteController || ladeNeu) return;
    if(editingIdx!==null) return;   // nicht mitten im Bearbeiten stören
    ladeNeu=true;
    window.location.reload();
  });
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

load().then(()=>{ render(); setInterval(()=>{ if(editingIdx===null) render(); },60000); });
