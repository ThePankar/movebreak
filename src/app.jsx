const { useState, useEffect, useMemo } = React;

const STORAGE_KEY = "movebreak_state_v1";
const todayKey = () => new Date().toISOString().slice(0,10);
const defaultState = () => ({
  points:0, streak:0, lastActiveDate:null,
  pausesByDay:{}, refusalsByDay:{},
  goalPerDay:6, reminderIntervalMin:50, nextReminderAt:null, teamCode:null,
  // Mock agenda — V2 : statut lu depuis Outlook/Google via OAuth.
  // calendarMockEnabled = future option à activer dans l'écran Réglages.
  inMeeting:false, calendarMockEnabled:true,
  // Exercices (écran 3). exerciseDurationSec = future option Réglages (base 60 s).
  // exercisesShownByDay : pour ne pas répéter le même exercice dans la journée.
  exerciseDurationSec:60, exercisesShownByDay:{},
  // Réglages (écran 5)
  activeStartHour:9, activeEndHour:18, soundOn:true, vibrationOn:true,
  // Profil local (V2 : remplacer par auth réelle — loadProfile()/fetch('/api/me')).
  // null => écran de bienvenue. {name, avatar, guest}
  profile:null,
  // Stats & progression (écran 6)
  maxStreak:0, exercisesDoneIds:[],
});
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s={...defaultState(),...JSON.parse(raw)};
    const t=todayKey();
    if(s.lastActiveDate && s.lastActiveDate!==t){
      const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
      const completedYest=(s.pausesByDay[s.lastActiveDate]||0)>=3;
      if(s.lastActiveDate!==yest) s.streak=0;
      else if(!completedYest) s.streak=0;
    }
    return s;
  }catch(e){ return defaultState(); }
}
const saveState = s => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

// ============================================================
// Mascotte « Esprit » — SVG original, 5 stades d'évolution (mappés aux niveaux)
// + humeurs (sleepy/neutral/happy/hero). Inspirée du concept Éveil→Harmonie.
// ============================================================
const MASCOT_STAGE_NAMES = ["L'Éveil","Le Souffle","La Vitalité","L'Équilibre","L'Harmonie"];
const STAGE_STYLE = {
  1:{from:"#F6FCFF",to:"#D6ECFB",stroke:"#ABD6F2",halo:"#CFE9FF",accent:"#7DB9E8"},
  2:{from:"#F0FFF7",to:"#CFF3E0",stroke:"#9FDcC0",halo:"#C9F4DC",accent:"#46C99A"},
  3:{from:"#EFFCFF",to:"#CFF0F3",stroke:"#9FE0E6",halo:"#CFF3EC",accent:"#2FBEC0"},
  4:{from:"#F2F0FF",to:"#DAF7EF",stroke:"#C9BDF7",halo:"#D8D0FF",accent:"#7C5CFF"},
  5:{from:"#FFF8EE",to:"#FDE9C9",stroke:"#F0D49E",halo:"#FFE6BD",accent:"#FBBF24"},
};
function stageForLevel(level){ return level<3?1 : level<5?2 : level<8?3 : level<12?4 : 5; }

function Mascot({ mood="neutral", size=140, stage=1, float=true }){
  const uid = (React.useId ? React.useId() : "m").replace(/[:]/g,"");
  const S = STAGE_STYLE[stage] || STAGE_STYLE[1];
  const ref = (n)=>"url(#"+n+uid+")";
  const cheeks = mood==="happy"||mood==="hero";
  const eyeRy = mood==="sleepy"?2.5:(mood==="hero"?11:9.5);
  const mouth = ({sleepy:"M92 106 Q100 109 108 106", neutral:"M91 106 Q100 114 109 106", happy:"M88 104 Q100 120 112 104", hero:"M86 102 Q100 124 114 102"})[mood] || "M91 106 Q100 114 109 106";
  const body = "M100 30 C141 30 166 60 166 100 C166 132 150 150 150 150 C150 150 140 142 132 150 C124 158 120 150 112 154 C104 158 96 158 88 154 C80 150 76 158 68 150 C60 142 50 150 50 150 C50 150 34 132 34 100 C34 60 59 30 100 30 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={float?"blob-float":""}>
      <defs>
        <filter id={"glow"+uid} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id={"body"+uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.from}/><stop offset="100%" stopColor={S.to}/></linearGradient>
        <radialGradient id={"halo"+uid} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={S.halo} stopOpacity="0.9"/><stop offset="100%" stopColor={S.halo} stopOpacity="0"/></radialGradient>
        <radialGradient id={"core"+uid} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFF7DC"/><stop offset="40%" stopColor="#FFD873"/><stop offset="100%" stopColor="#FFD873" stopOpacity="0"/></radialGradient>
        <linearGradient id={"ring"+uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={S.accent}/><stop offset="50%" stopColor="#34D399"/><stop offset="100%" stopColor={S.accent}/></linearGradient>
      </defs>
      <circle cx="100" cy="104" r="80" fill={ref("halo")} className="pulse-soft"/>
      {stage>=5 && (<g className="spin-slow" style={{transformOrigin:"100px 100px"}} opacity="0.6">
        {[0,45,90,135,180,225,270,315].map(a=>(<path key={a} d="M100 16 q11 17 0 32 q-11 -15 0 -32 z" fill={S.accent} opacity="0.5" transform={"rotate("+a+" 100 100)"}/>))}
      </g>)}
      {stage>=4 && (<circle cx="100" cy="102" r="86" fill="none" stroke={ref("ring")} strokeWidth="3" strokeDasharray="6 10" opacity="0.8" className="spin-slow" style={{transformOrigin:"100px 102px"}}/>)}
      <g>
        <path d={body} fill={ref("body")} stroke={S.stroke} strokeWidth="2.5"/>
        <ellipse cx="100" cy="118" rx="40" ry="30" fill="#fff" opacity="0.22"/>
        {stage===2 && (<g fill={S.accent} opacity="0.55">
          <rect x="76" y="96" width="7" height="7" rx="1" transform="rotate(45 79.5 99.5)"/>
          <rect x="117" y="96" width="7" height="7" rx="1" transform="rotate(45 120.5 99.5)"/>
          <rect x="96.5" y="74" width="7" height="7" rx="1" transform="rotate(45 100 77.5)"/>
        </g>)}
        {stage>=3 && (<path d="M100 150 q-9 14 -4 26 q9 -6 7 -18 q6 10 0 20 q11 -8 4 -28 z" fill={S.accent} opacity="0.5"/>)}
        {stage>=4 && (<path d="M100 48 l4.5 8 9 1.5 -6.5 6.5 1.5 9 -8.5 -4.5 -8.5 4.5 1.5 -9 -6.5 -6.5 9 -1.5 z" fill="#FFE08A" stroke="#F4C752" strokeWidth="1"/>)}
        <circle cx="100" cy="120" r="18" fill={ref("core")} filter={"url(#glow"+uid+")"}/>
        <circle cx="100" cy="120" r="5" fill="#FFF3C4"/>
        <g className="blink" style={{transformOrigin:"100px 92px"}}>
          <ellipse cx="83" cy="92" rx="7.5" ry={eyeRy} fill="#2B3A55"/>
          <ellipse cx="117" cy="92" rx="7.5" ry={eyeRy} fill="#2B3A55"/>
          <circle cx="85" cy="89" r="2.3" fill="#fff"/><circle cx="119" cy="89" r="2.3" fill="#fff"/>
        </g>
        <path d={mouth} stroke="#2B3A55" strokeWidth="3" fill="none" strokeLinecap="round"/>
        {cheeks && (<><circle cx="70" cy="104" r="6" fill="#FFC6D2" opacity="0.7"/><circle cx="130" cy="104" r="6" fill="#FFC6D2" opacity="0.7"/></>)}
        {stage>=4 && (<g stroke={S.stroke} strokeWidth="8" strokeLinecap="round" fill="none">
          <path d="M58 132 q-12 8 -14 20"/><path d="M142 132 q12 8 14 20"/>
        </g>)}
      </g>
      {(stage>=3 || mood==="hero") && (<g fill="#FFE08A" className="pulse-soft">
        <circle cx="40" cy="60" r="2.5"/><circle cx="160" cy="56" r="2"/><circle cx="166" cy="120" r="2.5"/><circle cx="34" cy="120" r="2"/>
      </g>)}
    </svg>
  );
}

function GoodPosture(){
  return (
    <svg viewBox="0 0 280 220" className="w-full h-auto">
      <line x1="10" y1="200" x2="270" y2="200" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="155" y="120" width="105" height="6" rx="2" fill="#9CA3AF"/>
      <rect x="158" y="126" width="4" height="74" fill="#9CA3AF"/>
      <rect x="253" y="126" width="4" height="74" fill="#9CA3AF"/>
      <rect x="180" y="55" width="70" height="48" rx="4" fill="#1F2937"/>
      <rect x="183" y="58" width="64" height="42" rx="2" fill="#7C5CFF" opacity=".35"/>
      <rect x="210" y="103" width="10" height="14" fill="#6B7280"/>
      <rect x="195" y="117" width="40" height="3" rx="1" fill="#6B7280"/>
      <rect x="76" y="100" width="6" height="60" fill="#34D399"/>
      <rect x="60" y="158" width="50" height="6" rx="2" fill="#34D399"/>
      <line x1="68" y1="164" x2="68" y2="195" stroke="#34D399" strokeWidth="3"/>
      <line x1="100" y1="164" x2="100" y2="195" stroke="#34D399" strokeWidth="3"/>
      <circle cx="110" cy="78" r="14" fill="#FCD9B6"/>
      <circle cx="116" cy="80" r="1.5" fill="#1F2937"/>
      <rect x="107" y="90" width="6" height="10" fill="#FCD9B6"/>
      <path d="M92,100 L128,100 L122,158 L98,158 Z" fill="#7C5CFF"/>
      <path d="M120,108 q14,4 18,18" stroke="#7C5CFF" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M138,126 L180,126" stroke="#FCD9B6" strokeWidth="10" strokeLinecap="round"/>
      <path d="M118,158 L150,158" stroke="#1F2937" strokeWidth="12" strokeLinecap="round"/>
      <path d="M150,158 L150,195" stroke="#1F2937" strokeWidth="12" strokeLinecap="round"/>
      <ellipse cx="155" cy="198" rx="10" ry="3" fill="#1F2937"/>
      <g fontFamily="system-ui" fontSize="9" fill="#059669">
        <text x="6" y="62">✓ Écran à hauteur des yeux</text>
        <line x1="80" y1="64" x2="178" y2="76" stroke="#34D399" strokeDasharray="3 3"/>
        <text x="6" y="120">✓ Dos droit, soutenu</text>
        <line x1="62" y1="124" x2="92" y2="124" stroke="#34D399" strokeDasharray="3 3"/>
        <text x="6" y="180">✓ Pieds à plat</text>
        <line x1="50" y1="184" x2="142" y2="196" stroke="#34D399" strokeDasharray="3 3"/>
        <text x="170" y="148">✓ Coudes à 90°</text>
      </g>
    </svg>
  );
}

function BadPosture(){
  return (
    <svg viewBox="0 0 280 220" className="w-full h-auto">
      <line x1="10" y1="200" x2="270" y2="200" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="155" y="135" width="105" height="6" rx="2" fill="#9CA3AF"/>
      <rect x="158" y="141" width="4" height="59" fill="#9CA3AF"/>
      <rect x="253" y="141" width="4" height="59" fill="#9CA3AF"/>
      <rect x="180" y="100" width="60" height="35" rx="3" fill="#1F2937"/>
      <rect x="183" y="103" width="54" height="29" rx="2" fill="#F87171" opacity=".35"/>
      <rect x="76" y="120" width="6" height="40" fill="#FBBF24"/>
      <rect x="60" y="158" width="50" height="6" rx="2" fill="#FBBF24"/>
      <circle cx="128" cy="105" r="13" fill="#FCD9B6"/>
      <circle cx="132" cy="108" r="1.5" fill="#1F2937"/>
      <path d="M118,118 Q92,135 100,158" stroke="#F87171" strokeWidth="16" strokeLinecap="round" fill="none"/>
      <path d="M124,128 Q150,130 168,142" stroke="#FCD9B6" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M105,158 L155,178" stroke="#1F2937" strokeWidth="10" strokeLinecap="round"/>
      <path d="M115,158 L145,182" stroke="#1F2937" strokeWidth="10" strokeLinecap="round"/>
      <ellipse cx="160" cy="195" rx="9" ry="3" fill="#1F2937"/>
      <g fontFamily="system-ui" fontSize="9" fill="#B91C1C">
        <text x="6" y="100">✗ Dos courbé</text>
        <line x1="46" y1="104" x2="100" y2="138" stroke="#F87171" strokeDasharray="3 3"/>
        <text x="6" y="160">✗ Jambes croisées</text>
        <line x1="62" y1="164" x2="130" y2="170" stroke="#F87171" strokeDasharray="3 3"/>
        <text x="170" y="92">✗ Écran trop bas</text>
        <line x1="200" y1="96" x2="210" y2="100" stroke="#F87171" strokeDasharray="3 3"/>
      </g>
    </svg>
  );
}

function EyeRule(){
  return (
    <svg viewBox="0 0 280 110" className="w-full h-auto">
      <rect x="20" y="40" width="60" height="40" rx="3" fill="#1F2937"/>
      <rect x="23" y="43" width="54" height="34" rx="2" fill="#7C5CFF" opacity=".4"/>
      <circle cx="115" cy="60" r="13" fill="#FCD9B6"/>
      <circle cx="119" cy="58" r="2" fill="#1F2937"/>
      <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#34D399"/>
      </marker></defs>
      <path d="M135,60 L230,60" stroke="#34D399" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arr)"/>
      <path d="M245,80 L245,55" stroke="#92400E" strokeWidth="3"/>
      <circle cx="245" cy="48" r="12" fill="#34D399"/>
      <text x="35" y="100" fontSize="9" fill="#6B7280">Écran</text>
      <text x="160" y="55" fontSize="10" fill="#059669" fontWeight="bold">6 mètres</text>
      <text x="225" y="100" fontSize="9" fill="#6B7280">Au loin</text>
    </svg>
  );
}

// ============================================================
// V2 — ÉDITION ADMIN
// Données chargées depuis une API (ou panneau admin) à terme.
// Structure stable {id, icon, text, src} → facile à brancher backend.
// V1 : valeurs en dur ci-dessous, hook loadFacts() prêt à brancher.
// ============================================================
const DEFAULT_FACTS = [
  {id:"cardio", icon:"❤️", text:"Rester assis +8h/j augmente le risque cardiovasculaire de 40%.", src:"JAMA, 2015"},
  {id:"focus",  icon:"🧠", text:"Une pause active toutes les 50 min améliore la concentration de 30%.", src:"Univ. Illinois"},
  {id:"eyes",   icon:"👁️", text:"Devant un écran, on cligne 60% moins → fatigue oculaire.", src:"AAO"},
  {id:"back",   icon:"🦴", text:"80% des actifs souffrent de douleurs dorsales liées au bureau.", src:"INRS"},
  {id:"calm",   icon:"😌", text:"5 min de marche réduisent l'anxiété de façon mesurable.", src:"Univ. Vermont"},
];
function loadFacts(){
  // V2 hook : remplacer par fetch('/api/facts') ou similaire
  try{
    const custom = localStorage.getItem("movebreak_facts_custom");
    if(custom){ const arr = JSON.parse(custom); if(Array.isArray(arr) && arr.length) return arr; }
  }catch(e){}
  return DEFAULT_FACTS;
}
const FACTS = loadFacts();

// ============================================================
// Bibliothèque d'exercices — structure "BDD-ready" (même schéma que DEFAULT_FACTS).
// IDs stables + schéma fixe → en V2, loadExercises() lira une vraie base
// (Firebase/Supabase) éditable par l'admin via fetch('/api/exercises').
// V1 : données en dur ci-dessous, override possible via localStorage.
// ============================================================
const DEFAULT_EXERCISES = [
  {id:"neck",      emoji:"🙆", name:"Étirement de la nuque",     zone:"Nuque",    desc:"Inclinez lentement la tête vers chaque épaule, 5 respirations de chaque côté. Relâche les tensions cervicales.", src:"INRS"},
  {id:"neck_up",   emoji:"🧘", name:"Auto-grandissement",        zone:"Nuque",    desc:"Imaginez un fil tirant le sommet du crâne vers le haut, menton légèrement rentré, 5 respirations. Réaligne la nuque.", src:"INRS"},
  {id:"shoulders", emoji:"🔄", name:"Rotation des épaules",      zone:"Épaules",  desc:"Roulez les épaules en arrière en grands cercles lents, 10 fois. Détend le haut du dos.", src:"INRS"},
  {id:"wrists",    emoji:"🙌", name:"Assouplir les poignets",    zone:"Poignets", desc:"Bras tendus, étirez les poignets paume vers le haut puis vers le bas. Prévient les troubles musculo-squelettiques.", src:"Assurance Maladie"},
  {id:"eyes",      emoji:"👁️", name:"Repos des yeux (20-20-20)", zone:"Yeux",     desc:"Fixez un point à ~6 mètres pendant 20 s en clignant doucement. Repose l'accommodation oculaire.", src:"AAO"},
  {id:"palming",   emoji:"🤲", name:"Palming des yeux",          zone:"Yeux",     desc:"Frottez les paumes pour les réchauffer, puis couvrez les yeux fermés 20 s sans appuyer. Détend les muscles oculaires.", src:"AAO"},
  {id:"calves",    emoji:"🦵", name:"Pointe des pieds",          zone:"Jambes",   desc:"Debout, montez sur la pointe des pieds puis redescendez, 15 fois. Relance la circulation des jambes.", src:"OMS"},
  {id:"march",     emoji:"🚶", name:"Marche sur place",          zone:"Jambes",   desc:"Marchez sur place en levant bien les genoux pendant 30 s. Réveille le corps et la circulation.", src:"OMS"},
  {id:"back",      emoji:"🧍", name:"Extension du dos",          zone:"Dos",      desc:"Debout, mains au creux des reins, cambrez doucement en regardant le plafond, 5 respirations. Décompresse la colonne.", src:"INRS"},
  {id:"twist",     emoji:"🌀", name:"Torsion sur la chaise",     zone:"Dos",      desc:"Assis, tournez doucement le buste vers la droite en vous aidant du dossier, 5 respirations, puis à gauche. Mobilise la colonne.", src:"INRS"},
];
function loadExercises(){
  // V2 hook : remplacer par fetch('/api/exercises') (base éditable par l'admin)
  try{
    const custom = localStorage.getItem("movebreak_exercises_custom");
    if(custom){ const arr = JSON.parse(custom); if(Array.isArray(arr) && arr.length) return arr; }
  }catch(e){}
  return DEFAULT_EXERCISES;
}
const EXERCISES = loadExercises();

// ============================================================
// Équipe (écran 7) — teaser V1. Pré-câblage V2 : schéma BDD-ready + hook.
// En V2 : remplacer loadTeamScores() par fetch(`/api/team/${code}`) et
// activer la saisie de code (auth équipe à 6 caractères, prévu en V2).
// ============================================================
const MOCK_TEAM = [
  {name:"Marie", avatar:"😎", points:320},
  {name:"Karim", avatar:"💪", points:285},
  {name:"Toi",   avatar:"🙂", points:240},
  {name:"Léa",   avatar:"🌟", points:180},
  {name:"Tom",   avatar:"🦊", points:120},
];
function loadTeamScores(code){
  // V1 : pas de backend → données mock pour l'aperçu (teaser).
  // V2 : return fetch(`/api/team/${code}`).then(r=>r.json());
  return MOCK_TEAM;
}

const BENEFITS = [
  {icon:"💪", title:"Soulage le dos", desc:"Décompression des disques et muscles posturaux"},
  {icon:"🧠", title:"Booste la concentration", desc:"Le cerveau ré-oxygéné regagne en focus"},
  {icon:"👁️", title:"Repose les yeux", desc:"Réduit fatigue oculaire et maux de tête"},
  {icon:"❤️", title:"Active la circulation", desc:"Évite la stagnation veineuse"},
  {icon:"😌", title:"Réduit le stress", desc:"Baisse du cortisol après effort léger"},
];
function StickyFactCard(){
  const [factIdx, setFactIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(()=>{ const id=setInterval(()=>setFactIdx(i=>(i+1)%FACTS.length),7000); return ()=>clearInterval(id); },[]);
  const fact = FACTS[factIdx];
  return (
    <div className="px-5 pt-4 pb-3 bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
      <div className="rounded-2xl text-white shadow-soft overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600">
        <button onClick={()=>setCollapsed(c=>!c)} className="w-full px-4 pt-3 pb-2 flex items-center justify-between hover:bg-white/5 transition">
          <div className="text-[10px] uppercase tracking-widest opacity-90 font-bold flex items-center gap-1.5">
            💡 Le saviez-vous ?
          </div>
          <span className={"text-white/80 text-xs transition-transform duration-300 "+(collapsed?"rotate-180":"")}>▾</span>
        </button>
        {!collapsed && (
          <div className="px-4 pb-4 fade-swap" key={factIdx}>
            <div className="flex gap-3">
              <div className="text-3xl leading-none">{fact.icon}</div>
              <div>
                <p className="text-sm leading-snug font-medium">{fact.text}</p>
                <p className="text-[10px] opacity-75 mt-1.5">Source : {fact.src}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {FACTS.map((_,i)=>(<span key={i} className={"h-1 flex-1 rounded-full "+(i===factIdx?"bg-white":"bg-white/30")}/>))}
            </div>
          </div>
        )}
        {collapsed && (<div className="px-4 pb-3 text-xs opacity-80 truncate">{fact.icon} {fact.text}</div>)}
      </div>
    </div>
  );
}

function Sidebar({ onClose, onCollapse }){
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between shrink-0">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-violet-500 font-bold">Le coin santé</div>
          <h2 className="text-lg font-bold mt-0.5">Pourquoi prendre une pause ?</h2>
        </div>
        {onCollapse && (<button onClick={onCollapse} title="Réduire le panneau" aria-label="Réduire le coin santé" className="text-gray-400 hover:text-violet-600 text-xl leading-none px-1">»</button>)}
        {onClose && (<button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>)}
      </div>
      <div className="flex-1 overflow-y-auto scroll-pretty">
        <StickyFactCard/>
        <div className="px-5 py-4 space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 grid place-items-center text-emerald-600 text-xs font-bold">✓</div>
              <h3 className="font-bold text-sm">La bonne posture</h3>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100"><GoodPosture/></div>
            <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
              <li className="flex gap-2"><span className="text-emerald-500">•</span>Haut de l'écran au niveau des yeux, à 50–70 cm</li>
              <li className="flex gap-2"><span className="text-emerald-500">•</span>Dos plaqué contre le dossier, épaules relâchées</li>
              <li className="flex gap-2"><span className="text-emerald-500">•</span>Coudes, hanches et genoux ≈ 90°</li>
              <li className="flex gap-2"><span className="text-emerald-500">•</span>Pieds à plat (ou sur un repose-pieds)</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-rose-100 grid place-items-center text-rose-600 text-xs font-bold">✗</div>
              <h3 className="font-bold text-sm">À éviter</h3>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100"><BadPosture/></div>
            <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
              <li className="flex gap-2"><span className="text-rose-500">•</span>Tête penchée en avant (cervicales surchargées)</li>
              <li className="flex gap-2"><span className="text-rose-500">•</span>Jambes croisées (circulation entravée)</li>
              <li className="flex gap-2"><span className="text-rose-500">•</span>Écran trop bas ou trop loin</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-violet-100 grid place-items-center text-violet-600 text-xs">👁️</div>
              <h3 className="font-bold text-sm">La règle 20-20-20</h3>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100">
              <EyeRule/>
              <p className="text-xs text-gray-600 mt-2 leading-snug">
                Toutes les <b>20 minutes</b>, regarde un objet à <b>~6 mètres</b> pendant <b>20 secondes</b>. Le cristallin se détend, la fatigue oculaire diminue.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 grid place-items-center text-amber-600 text-xs">★</div>
              <h3 className="font-bold text-sm">Bénéfices d'une pause</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {BENEFITS.map(b=>(
                <div key={b.title} className="bg-white rounded-xl p-3 border border-gray-100 flex gap-3 items-start">
                  <div className="text-xl">{b.icon}</div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{b.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100 text-center">
            <div className="text-3xl mb-1">🌿</div>
            <p className="text-xs text-emerald-800 font-medium leading-snug">
              Même <b>2 minutes</b> de mouvement valent mieux que zéro.<br/>Lève-toi à ton prochain rappel !
            </p>
          </section>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 text-[10px] text-gray-400 text-center shrink-0">
        Conseils inspirés de l'INRS, OMS et études scientifiques publiques.
      </div>
    </div>
  );
}

// Vagues SVG décoratives — habillage subtil de la zone vide
function BackgroundWaves(){
  return (
    <div className="pointer-events-none fixed inset-0 lg:right-[380px] xl:right-[420px] overflow-hidden -z-10">
      <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0"/>
            <stop offset="50%" stopColor="#7C5CFF" stopOpacity=".18"/>
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A593FF" stopOpacity="0"/>
            <stop offset="50%" stopColor="#A593FF" stopOpacity=".22"/>
            <stop offset="100%" stopColor="#A593FF" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="wg3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0"/>
            <stop offset="50%" stopColor="#34D399" stopOpacity=".14"/>
            <stop offset="100%" stopColor="#34D399" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M-100,180 C150,80 350,260 550,150 C750,40 900,200 1100,120" stroke="url(#wg1)" strokeWidth="2.5" fill="none"/>
        <path d="M-100,360 C200,300 380,460 600,360 C800,270 950,400 1100,340" stroke="url(#wg2)" strokeWidth="2" fill="none"/>
        <path d="M-100,560 C180,500 400,640 600,540 C800,440 950,580 1100,520" stroke="url(#wg1)" strokeWidth="1.5" fill="none"/>
        <path d="M-100,720 C200,660 400,780 620,700 C820,620 980,720 1100,680" stroke="url(#wg3)" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );
}

function moodFor(p,g){ if(p>=g) return "hero"; if(p>=Math.ceil(g/2)) return "happy"; if(p>=1) return "neutral"; return "sleepy"; }
function greetingFor(mood){
  const map = {
    sleepy:["On démarre en douceur ? 🌱","Une pause pour réveiller le corps ?","Coucou, prêt·e à bouger ?"],
    neutral:["Joli début, on continue !","Tu prends soin de toi, j'adore.","Encore quelques pauses et c'est gagné."],
    happy:["Tu cartonnes aujourd'hui !","Ton corps te dit merci 💜","Continue, on est super bien partis."],
    hero:["Objectif atteint, champion·ne !","Bravo ! Tu es au top 🏆","Légende vivante du bureau !"]
  };
  return map[mood][new Date().getDate() % map[mood].length];
}
function fmtMMSS(ms){ if(ms<0) ms=0; const s=Math.floor(ms/1000); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }

function StatCard({ icon, label, value, accent="#7C5CFF", sub }){
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl grid place-items-center" style={{background:accent+"1A"}}><Icon name={icon} size={24}/></div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-2xl font-bold leading-tight" style={{color:accent}}>{value}</div>
        {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function CountdownRing({ msLeft, totalMs }){
  const size=120, stroke=10, r=(size-stroke)/2, C=2*Math.PI*r;
  const pct=Math.max(0,Math.min(1,msLeft/totalMs));
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#EFEAFF" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke="#7C5CFF" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)} transform={"rotate(-90 "+(size/2)+" "+(size/2)+")"} className="ring-progress"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase text-gray-400 tracking-wider">prochain rappel</div>
        <div className="text-2xl font-bold text-gray-800 tabular-nums">{fmtMMSS(msLeft)}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max }){
  const pct=Math.min(100,(value/max)*100);
  return <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:pct+"%",background:"linear-gradient(90deg,#7C5CFF,#34D399)"}}/></div>;
}

// ============================================================
// Jeu d'icônes — Fluent Emoji Flat via Iconify (web component, chargé par CDN).
// Colorées, douces, rendu IDENTIQUE sur tous les OS. <Icon name size className/>.
// V2 : bundler les icônes (Iconify offline) sans changer les appels.
// ============================================================
const ICON_MAP = {
  home:"house", exercises:"flexed-biceps", team:"busts-in-silhouette",
  profile:"bust-in-silhouette", settings:"gear",
  streak:"fire", points:"sparkles", bell:"bell", calendar:"spiral-calendar",
};
function Icon({ name, size=24, className="" }){
  return (<iconify-icon icon={"fluent-emoji-flat:"+(ICON_MAP[name]||name)} style={{fontSize:size+"px"}} className={className} aria-hidden="true"></iconify-icon>);
}

// Sections de navigation (toutes actives en V1).
const NAV_ITEMS = [
  {id:"home",icon:"home",label:"Accueil"},
  {id:"library",icon:"exercises",label:"Exercices"},
  {id:"team",icon:"team",label:"Équipe"},
  {id:"profile",icon:"profile",label:"Profil"},
  {id:"settings",icon:"settings",label:"Réglages"},
];
function BottomNav({ active, onNavigate }){
  return (
    <nav className="fixed bottom-0 inset-x-0 lg:hidden bg-white/95 backdrop-blur border-t border-gray-100 z-30">
      <ul className="max-w-md mx-auto grid grid-cols-5">
        {NAV_ITEMS.map(it=>{
          const isActive=it.id===active;
          return (
            <li key={it.id} className={"relative "+(it.locked?"nav-locked":"")}>
              <button disabled={it.locked} onClick={()=>!it.locked&&onNavigate(it.id)} className={"w-full py-2.5 flex flex-col items-center gap-0.5 "+(it.locked?"opacity-50 cursor-not-allowed":"")}>
                <Icon name={it.icon} size={26} className={isActive?"pop":""}/>
                <span className={"text-[10px] "+(isActive?"text-violet-600 font-semibold":"text-gray-500")}>{it.label}</span>
                {isActive && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-violet-500"/>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]"/>
    </nav>
  );
}
// Rail de navigation vertical (desktop lg+) ; la bottom-nav reste sur mobile.
function LeftRail({ active, onNavigate }){
  return (
    <nav className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[88px] bg-white border-r border-gray-100 z-30 py-5 items-center gap-1">
      {NAV_ITEMS.map(it=>{
        const isActive=it.id===active;
        return (
          <button key={it.id} disabled={it.locked} onClick={()=>!it.locked&&onNavigate(it.id)} title={it.locked?it.label+" (à venir)":it.label}
            className={"relative w-[72px] py-2.5 rounded-2xl flex flex-col items-center gap-1 transition "+(it.locked?"opacity-40 cursor-not-allowed":"hover:bg-violet-50")+(isActive?" bg-violet-100":"")}>
            <Icon name={it.icon} size={26} className={isActive?"pop":""}/>
            <span className={"text-[10px] "+(isActive?"text-violet-700 font-semibold":"text-gray-500")}>{it.label}</span>
            {it.locked && <span className="absolute top-1.5 right-2.5 text-[8px] opacity-70">🔒</span>}
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// Écran 2 — Modal de rappel
// Affichée quand un rappel "se déclenche" (V1 : bouton démo "Simuler un
// rappel" ; V2 : automatiquement quand le compte à rebours atteint 0).
// La suppression "en réunion" est gérée en amont (cf. fireReminder), pas ici.
// "OK j'y vais" → valide la pause (+10) ; V2 : mènera à l'écran Exercice (3).
// "Plus tard" → malus -5 + report 10 min.
// ============================================================
function ReminderModal({ onAccept, onPostpone, onClose, stage }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 drawer-bg" onClick={onClose}/>
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-soft pop text-center">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-4 text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
        <div className="flex justify-center -mt-2"><Mascot mood="happy" size={130} stage={stage}/></div>
        <div className="text-[10px] uppercase tracking-widest text-violet-500 font-bold">C'est l'heure</div>
        <h2 className="text-xl font-bold mt-1 leading-snug">Et si on bougeait un peu ? 🙆</h2>
        <p className="text-sm text-gray-500 mt-2 leading-snug">Ton corps te dira merci. Une courte pause active et on repart plus concentré·e.</p>
        <button onClick={onAccept} className="btn-press mt-5 w-full py-3 rounded-2xl text-white font-semibold shadow-soft" style={{background:"linear-gradient(135deg,#7C5CFF,#5B3DF5)"}}>OK, j'y vais 💪</button>
        <button onClick={onPostpone} className="btn-press mt-2 w-full py-2.5 rounded-2xl text-gray-500 font-medium bg-gray-50 hover:bg-gray-100">Plus tard <span className="text-rose-400 text-xs">(−5 pts)</span></button>
        <p className="text-[10px] text-gray-400 mt-3">Astuce : même 2 minutes comptent.</p>
      </div>
    </div>
  );
}

// ============================================================
// Écran 3 — Exercice guidé (MODAL par-dessus la page courante)
// Timer circulaire (durée = state.exerciseDurationSec, base 60 s, future option Réglages).
// Contrôles : Quitter (abandon, sans points) / Passer (autre exercice).
// Points attribués à la FIN : +10 en mode "break", +3 en "practice" (bibliothèque).
// ============================================================
function ExerciseModal({ exercise, msLeft, totalMs, mode, onSkip, onQuit }){
  const secLeft = Math.max(0, Math.ceil(msLeft/1000));
  const size=180, stroke=12, r=(size-stroke)/2, C=2*Math.PI*r;
  const pct=Math.max(0,Math.min(1,msLeft/totalMs));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 drawer-bg"/>
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-soft pop text-center">
        <div className="text-[10px] uppercase tracking-widest text-violet-500 font-bold">{mode==="practice"?"Pratique libre":"Exercice en cours"}</div>
        <div className="text-5xl mt-2 blob-float">{exercise.emoji}</div>
        <h2 className="text-xl font-bold mt-2">{exercise.name}</h2>
        <div className="mt-1"><span className="text-[10px] uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{exercise.zone}</span></div>
        <p className="text-sm text-gray-500 mt-2 leading-snug">{exercise.desc}</p>
        <div className="relative mx-auto my-5" style={{width:size,height:size}}>
          <svg width={size} height={size}>
            <circle cx={size/2} cy={size/2} r={r} stroke="#EFEAFF" strokeWidth={stroke} fill="none"/>
            <circle cx={size/2} cy={size/2} r={r} stroke="#7C5CFF" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)} transform={"rotate(-90 "+(size/2)+" "+(size/2)+")"} className="ring-progress"/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-gray-800 tabular-nums">{secLeft}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">secondes</div>
          </div>
        </div>
        <div className="text-[11px] text-gray-400">Source : {exercise.src}</div>
        <div className="flex gap-3 mt-5">
          <button onClick={onQuit} className="btn-press flex-1 py-3 rounded-2xl font-semibold bg-white border border-gray-200 text-gray-600">✕ Quitter</button>
          <button onClick={onSkip} className="btn-press flex-1 py-3 rounded-2xl font-semibold bg-violet-100 text-violet-700">⏭ Passer</button>
        </div>
      </div>
    </div>
  );
}

function RewardModal({ exercise, gained, onContinue, stage }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 drawer-bg"/>
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-soft pop text-center">
        <div className="flex justify-center pop"><Mascot mood="hero" size={140} stage={stage}/></div>
        <div className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mt-1">Bravo !</div>
        <h2 className="text-xl font-bold mt-1">Exercice terminé 🎉</h2>
        <p className="text-sm text-gray-500 mt-2 leading-snug">{exercise ? "« "+exercise.name+" » — ton corps te remercie." : "Ton corps te remercie."}</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-violet-100 text-violet-700 font-bold px-5 py-3 rounded-2xl text-lg pop">+{gained} points ✨</div>
        <button onClick={onContinue} className="btn-press mt-6 w-full py-3 rounded-2xl text-white font-semibold shadow-soft" style={{background:"linear-gradient(135deg,#7C5CFF,#5B3DF5)"}}>Continuer</button>
        <p className="text-[10px] text-gray-400 mt-3">Retour automatique…</p>
      </div>
    </div>
  );
}

// ============================================================
// Écran 4 — Bibliothèque d'exercices
// Liste filtrable par zone du corps. Clic sur une carte → exercice (pratique libre, +3).
// Données : EXERCISES (loadExercises) — schéma BDD-ready, triables par l'admin en V2.
// ============================================================
function Library({ onPick }){
  const [zone, setZone] = useState("all");
  const zones = ["all", ...Array.from(new Set(EXERCISES.map(e=>e.zone)))];
  const list = zone==="all" ? EXERCISES : EXERCISES.filter(e=>e.zone===zone);
  return (
    <div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Bibliothèque</div>
        <h1 className="text-xl font-bold leading-snug">Choisis un exercice</h1>
        <p className="text-xs text-gray-500 mt-0.5">Pratique libre quand tu veux — chaque exercice complété rapporte <b>+3 pts</b>.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scroll-pretty">
        {zones.map(z=>(
          <button key={z} onClick={()=>setZone(z)} className={"shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border transition "+(zone===z?"bg-violet-600 text-white border-violet-600":"bg-white text-gray-500 border-gray-200 hover:bg-violet-50")}>
            {z==="all"?"Tout":z}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
        {list.map(ex=>(
          <button key={ex.id} onClick={()=>onPick(ex)} className="btn-press text-left bg-white rounded-2xl p-4 shadow-soft hover:shadow-md transition flex gap-3 items-start">
            <div className="text-3xl leading-none">{ex.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">{ex.name}</div>
              <div className="text-[10px] uppercase tracking-wide text-violet-600 bg-violet-50 inline-block px-2 py-0.5 rounded-full mt-1">{ex.zone}</div>
              <div className="text-[11px] text-gray-500 mt-1.5 leading-snug">{ex.desc}</div>
              <div className="text-[10px] text-gray-400 mt-1.5 flex items-center justify-between">
                <span>Source : {ex.src}</span>
                <span className="text-violet-600 font-semibold">Faire ▶︎</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Écran 5 — Paramètres
// Chaque réglage écrit dans le state (localStorage) → effet immédiat.
// ============================================================
function SettingSegment({ label, value, options, unit, onPick }){
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map(o=>(
          <button key={o} onClick={()=>onPick(o)} className={"btn-press text-sm px-3 py-2 rounded-xl font-semibold border "+(value===o?"bg-violet-600 text-white border-violet-600":"bg-white text-gray-600 border-gray-200 hover:bg-violet-50")}>{o}{unit}</button>
        ))}
      </div>
    </div>
  );
}
function SettingToggle({ label, desc, on, onToggle }){
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft mb-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>}
      </div>
      <button onClick={onToggle} aria-label={label} className={"shrink-0 w-12 h-7 rounded-full transition relative "+(on?"bg-violet-600":"bg-gray-300")}>
        <span className={"absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all "+(on?"left-[22px]":"left-0.5")}/>
      </button>
    </div>
  );
}
function Settings({ state, profile, onPatch, onReset, onLogout, onOpenProfile }){
  const hours = Array.from({length:17},(_,i)=>i+6); // 6h..22h
  return (
    <div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Réglages</div>
        <h1 className="text-xl font-bold leading-snug">Paramètres</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tout est enregistré localement, effet immédiat.</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3 flex items-center gap-3">
        <button onClick={onOpenProfile} title="Voir mon profil" className="shrink-0 rounded-full hover:opacity-80 transition"><ProfileAvatar size={48} photoUrl={profile.avatarUrl}/></button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{profile.name}</div>
          <div className="text-[11px] text-gray-500">{profile.guest?"Invité · profil local":"Profil local (compte en ligne à venir)"}</div>
        </div>
        <button onClick={onLogout} className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-semibold">Déconnexion</button>
      </div>
      <SettingSegment label="Fréquence des rappels" value={state.reminderIntervalMin} options={[30,45,60,90]} unit=" min" onPick={v=>onPatch({reminderIntervalMin:v, nextReminderAt:Date.now()+v*60*1000})}/>
      <SettingSegment label="Durée d'un exercice" value={state.exerciseDurationSec} options={[30,60,90]} unit=" s" onPick={v=>onPatch({exerciseDurationSec:v})}/>
      <SettingSegment label="Objectif de pauses / jour" value={state.goalPerDay} options={[4,6,8]} unit="" onPick={v=>onPatch({goalPerDay:v})}/>
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
        <div className="text-sm font-semibold mb-2">Plage horaire active</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">De</span>
          <select value={state.activeStartHour} onChange={e=>onPatch({activeStartHour:parseInt(e.target.value,10)})} className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white">{hours.map(h=><option key={h} value={h}>{h}h</option>)}</select>
          <span className="text-gray-500">à</span>
          <select value={state.activeEndHour} onChange={e=>onPatch({activeEndHour:parseInt(e.target.value,10)})} className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white">{hours.map(h=><option key={h} value={h}>{h}h</option>)}</select>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Hors de cette plage, les rappels automatiques ne se déclencheront pas (effectif avec les rappels auto, V2).</p>
      </div>
      <SettingToggle label="Éviter les réunions (agenda)" desc="Mock en V1 ; lié à Outlook en V2" on={state.calendarMockEnabled} onToggle={()=>onPatch({calendarMockEnabled:!state.calendarMockEnabled})}/>
      <SettingToggle label="Sons" desc="Cosmétique en V1, réel en V2" on={state.soundOn} onToggle={()=>onPatch({soundOn:!state.soundOn})}/>
      <SettingToggle label="Vibrations" desc="Cosmétique en V1, réel en V2" on={state.vibrationOn} onToggle={()=>onPatch({vibrationOn:!state.vibrationOn})}/>
      <button onClick={onReset} className="btn-press w-full mt-2 py-3 rounded-2xl font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100">Réinitialiser mes statistiques</button>
      <p className="text-[10px] text-gray-400 text-center mt-2">Points, streak et pauses repartent à zéro. Les réglages sont conservés.</p>
    </div>
  );
}

// ============================================================
// Profil & connexion (locale en V1 ; seam pour l'auth réelle en V2)
// ============================================================
// Avatar de profil — V1 : placeholder = Esprit niveau 1 (gris).
// V2 (seam) : si `photoUrl` est renseignée (upload utilisateur / import Outlook/Google),
// on affiche la photo de son choix ; sinon le placeholder. Aucune UI d'upload en V1.
function ProfileAvatar({ size=40, rounded="rounded-full", photoUrl }){
  return (
    <div className={"bg-slate-100 grid place-items-center overflow-hidden "+rounded} style={{width:size,height:size}}>
      {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover"/> : (<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 13 C72 13 87 29 87 50 C87 71 72 87 50 87 C28 87 13 71 13 50 C13 29 28 13 50 13 Z" fill="#D7DEE6" stroke="#AEB9C5" strokeWidth="2.5"/>
        <ellipse cx="50" cy="58" rx="21" ry="14" fill="#ffffff" opacity="0.5"/>
        <circle cx="50" cy="60" r="8.5" fill="#E7E0CF"/>
        <circle cx="50" cy="60" r="2.8" fill="#ffffff"/>
        <ellipse cx="40.5" cy="46" rx="3.7" ry="4.9" fill="#5B6B80"/>
        <ellipse cx="59.5" cy="46" rx="3.7" ry="4.9" fill="#5B6B80"/>
        <circle cx="41.5" cy="44.5" r="1.1" fill="#ffffff"/>
        <circle cx="60.5" cy="44.5" r="1.1" fill="#ffffff"/>
        <path d="M44 53 Q50 58 56 53" stroke="#5B6B80" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>)}
    </div>
  );
}

function Welcome({ onStart }){
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-soft text-center">
        <div className="flex justify-center"><Mascot mood="happy" size={120}/></div>
        <h1 className="text-2xl font-bold mt-2">Bienvenue sur MoveBreak</h1>
        <p className="text-sm text-gray-500 mt-1 leading-snug">Crée ton profil pour personnaliser ton expérience. Local pour l'instant — compte en ligne à venir.</p>
        <div className="text-left mt-5">
          <label className="text-xs font-semibold text-gray-600">Ton prénom</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex : Marie" className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-400"/>
        </div>
        <button onClick={()=>onStart(name)} className="btn-press mt-5 w-full py-3 rounded-2xl text-white font-semibold shadow-soft" style={{background:"linear-gradient(135deg,#7C5CFF,#5B3DF5)"}}>Commencer</button>
        <button onClick={()=>onStart("")} className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-violet-600">Continuer en invité</button>
      </div>
    </div>
  );
}

function Profile({ state, onPatch }){
  const profile = state.profile;
  const points = state.points, streak = state.streak;
  const level = Math.floor((points||0)/100)+1;
  const currentStage = stageForLevel(level);
  return (
    <div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Profil</div>
        <h1 className="text-xl font-bold leading-snug">Mon profil</h1>
        <p className="text-xs text-gray-500 mt-0.5">Profil local — un compte en ligne arrivera en V2.</p>
      </div>
      <div className="bg-white rounded-3xl p-5 shadow-soft mb-4 flex items-center gap-4">
        <ProfileAvatar size={80} rounded="rounded-2xl" photoUrl={profile.avatarUrl}/>
        <div className="flex-1 min-w-0">
          <input value={profile.name} onChange={e=>onPatch({name:e.target.value, guest:false})} className="w-full text-lg font-bold border-b border-transparent hover:border-gray-200 focus:border-violet-400 focus:outline-none"/>
          <div className="text-[11px] text-gray-500 mt-1">{profile.guest?"Invité · profil local":"Profil local"} · Niveau {level}</div>
          <div className="text-[10px] text-gray-400 mt-1">📷 Photo de profil bientôt (import ou Outlook)</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-4">
        <div className="text-sm font-semibold">Évolution de l'esprit</div>
        <div className="text-[11px] text-gray-500 mb-3">Ta mascotte grandit avec ton niveau — débloque les stades suivants.</div>
        <div className="grid grid-cols-5 gap-1">
          {MASCOT_STAGE_NAMES.map((name,i)=>{
            const sn=i+1, reached=sn<=currentStage, isCurrent=sn===currentStage;
            return (
              <div key={sn} className={"flex flex-col items-center text-center rounded-2xl py-1 "+(isCurrent?"bg-violet-50 ring-1 ring-violet-200":"")}>
                <div className={reached?"":"grayscale opacity-40"}><Mascot stage={sn} size={52} mood={reached?"happy":"neutral"}/></div>
                <div className={"text-[9px] leading-tight mt-0.5 "+(reached?(isCurrent?"font-bold text-violet-700":"font-semibold text-violet-600"):"text-gray-400")}>{name}</div>
                <div className="text-[9px] h-3 leading-none text-gray-300">{reached?(isCurrent?"● actuel":""):"🔒"}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Progression (anciennement onglet Stats, fusionné ici) */}
      <Stats pausesByDay={state.pausesByDay} points={points} streak={streak} maxStreak={state.maxStreak} goalPerDay={state.goalPerDay} exercisesDoneIds={state.exercisesDoneIds}/>
    </div>
  );
}

// ============================================================
// Écran 6 — Stats & progression
// Graphique barres maison (SVG/flex, zéro dépendance), 7/30 j depuis pausesByDay.
// Total pauses, record de streak, niveau, badges. V2 : loadStats()/sync.
// ============================================================
function Stats({ pausesByDay, points, streak, maxStreak, goalPerDay, exercisesDoneIds }){
  const [range, setRange] = useState(7);
  const series = [];
  for(let i=range-1;i>=0;i--){ const d=new Date(Date.now()-i*86400000); series.push({key:d.toISOString().slice(0,10), day:d, val: pausesByDay[d.toISOString().slice(0,10)]||0}); }
  const total = Object.values(pausesByDay).reduce((a,b)=>a+b,0);
  const level = Math.floor((points||0)/100)+1;
  const maxVal = Math.max(1, ...series.map(s=>s.val));
  const hasData = total>0;
  const goalEver = Object.values(pausesByDay).some(v=>v>=goalPerDay);
  const eyesDone = (exercisesDoneIds||[]).some(id=>{ const ex=EXERCISES.find(e=>e.id===id); return ex && ex.zone==="Yeux"; });
  const badges = [
    {icon:"🌱", name:"Première pause", on: total>=1},
    {icon:"🔥", name:"Streak 3 jours", on: (maxStreak||0)>=3},
    {icon:"💪", name:"50 pauses", on: total>=50},
    {icon:"👁️", name:"Yeux reposés", on: eyesDone},
    {icon:"🎯", name:"Objectif atteint", on: goalEver},
    {icon:"⭐", name:"Niveau 5", on: level>=5},
  ];
  const dayLetters=["D","L","M","M","J","V","S"];
  return (
    <div>
      <div className="mb-3 mt-1">
        <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Progression</div>
        <div className="text-lg font-bold leading-snug">Tes statistiques</div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Pauses par jour</div>
          <div className="flex gap-1">
            {[7,30].map(r=>(<button key={r} onClick={()=>setRange(r)} className={"text-xs px-2.5 py-1 rounded-full font-semibold "+(range===r?"bg-violet-600 text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200")}>{r} j</button>))}
          </div>
        </div>
        {hasData ? (
          <>
            <div className="flex items-end gap-1 h-32">
              {series.map(s=>(
                <div key={s.key} className="flex-1 flex flex-col justify-end h-full" title={s.key+" : "+s.val+" pause(s)"}>
                  <div className="w-full rounded-t transition-all" style={{height:(s.val/maxVal*100)+"%", minHeight: s.val>0?4:0, background: s.val>=goalPerDay?"#34D399":"#7C5CFF"}}/>
                </div>
              ))}
            </div>
            {range===7 && (<div className="flex gap-1 mt-1">{series.map(s=>(<div key={s.key} className="flex-1 text-center text-[9px] text-gray-400">{dayLetters[s.day.getDay()]}</div>))}</div>)}
            <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-3"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:"#34D399"}}/>objectif atteint</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:"#7C5CFF"}}/>en dessous</span></div>
          </>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-center text-gray-400 text-sm">
            <div className="text-2xl mb-1">📊</div>
            Pas encore de données — tes pauses s'afficheront ici jour après jour.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[{icon:"✅",label:"Total",value:total},{icon:"🔥",label:"Record",value:(maxStreak||0)+"j"},{icon:"🏅",label:"Niveau",value:level}].map(c=>(
          <div key={c.label} className="bg-white rounded-2xl p-3 shadow-soft text-center">
            <div className="text-xl">{c.icon}</div>
            <div className="text-xl font-bold text-gray-800 mt-1">{c.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="text-sm font-semibold mb-3">Badges <span className="text-xs text-gray-400 font-normal">({badges.filter(b=>b.on).length}/{badges.length})</span></div>
        <div className="grid grid-cols-3 gap-3">
          {badges.map(b=>(
            <div key={b.name} className={"rounded-2xl p-3 text-center border "+(b.on?"bg-violet-50 border-violet-200":"bg-gray-50 border-gray-100")}>
              <div className={"text-3xl "+(b.on?"":"grayscale opacity-40")}>{b.icon}</div>
              <div className={"text-[11px] font-semibold mt-1 leading-tight "+(b.on?"":"text-gray-400")}>{b.name}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">{b.on?"débloqué":"verrouillé"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Écran 7 — Tableau d'équipe (teaser V1, tout est mock/désactivé)
// ============================================================
function Team(){
  const scores = loadTeamScores(null); // V2 : loadTeamScores(state.teamCode)
  return (
    <div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Équipe</div>
        <h1 className="text-xl font-bold leading-snug">Tableau d'équipe</h1>
        <p className="text-xs text-gray-500 mt-0.5">Rejoins ton équipe et compare ta progression avec tes collègues. <span className="text-violet-600 font-semibold">Bientôt 🚀</span></p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft mb-4">
        <div className="text-sm font-semibold mb-2">Rejoindre une équipe</div>
        <div className="flex gap-2">
          <input disabled placeholder="CODE À 6 CARACTÈRES" maxLength={6} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 tracking-widest uppercase text-sm bg-gray-50 text-gray-400 cursor-not-allowed placeholder:tracking-normal"/>
          <button disabled className="px-4 py-2.5 rounded-xl bg-violet-200 text-white font-semibold cursor-not-allowed">Rejoindre</button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">🔒 Disponible en V2 (nécessite un compte en ligne et un backend de synchronisation).</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft relative overflow-hidden">
        <div className="text-sm font-semibold mb-3">Classement de la semaine <span className="text-[10px] text-gray-400 font-normal">(aperçu)</span></div>
        <ul className="space-y-2 blur-[3px] select-none pointer-events-none" aria-hidden="true">
          {scores.map((m,i)=>(
            <li key={m.name} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
              <span className="w-6 text-center font-bold text-gray-400">{i+1}</span>
              <span className="w-9 h-9 rounded-full bg-violet-100 grid place-items-center text-lg">{m.avatar}</span>
              <span className="flex-1 text-sm font-semibold">{m.name}</span>
              <span className="text-sm font-bold text-violet-600">{m.points} pts</span>
            </li>
          ))}
        </ul>
        <div className="absolute inset-0 grid place-items-center">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold text-violet-700 shadow-soft">🚀 Bientôt disponible</div>
        </div>
      </div>
    </div>
  );
}

function App(){
  const [state, setState] = useState(loadState);
  const [now, setNow] = useState(Date.now());
  const [justAwarded, setJustAwarded] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState("home"); // page affichée : "home" | "library"
  const [exPhase, setExPhase] = useState("none"); // modal exercice : "none" | "exercise" | "reward"
  const [exMode, setExMode] = useState("break"); // "break" (+10, pause) | "practice" (+3, hors objectif)
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseEndsAt, setExerciseEndsAt] = useState(null);
  const [santeOpen, setSanteOpen] = useState(()=> typeof window!=="undefined" && window.innerWidth>=1024); // ouvert par défaut sur desktop, réduit (languette) sur mobile
  const intervalMs = state.reminderIntervalMin*60*1000;

  useEffect(()=>{
    if(!state.nextReminderAt || state.nextReminderAt<Date.now()){
      const s={...state,nextReminderAt:Date.now()+intervalMs};
      setState(s); saveState(s);
    }
  },[]);
  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ saveState(state); },[state]);
  // Fin de l'exercice → récompense + attribution des points (selon le mode)
  useEffect(()=>{
    if(exPhase==="exercise" && exerciseEndsAt && now>=exerciseEndsAt){
      finishExercise();
    }
  },[now,exPhase,exerciseEndsAt]);
  // Récompense : retour automatique après 5 s
  useEffect(()=>{
    if(exPhase!=="reward") return;
    const id=setTimeout(()=>{ closeReward(); },5000);
    return ()=>clearTimeout(id);
  },[exPhase]);

  const t = todayKey();
  const pausesToday = state.pausesByDay[t]||0;
  const refusalsToday = state.refusalsByDay[t]||0;
  const mood = moodFor(pausesToday,state.goalPerDay);
  const greet = useMemo(()=>greetingFor(mood),[mood]);
  const msLeft = (state.nextReminderAt||Date.now())-now;
  const level = Math.floor((state.points||0)/100)+1;
  const mascotStage = stageForLevel(level);
  const stageName = MASCOT_STAGE_NAMES[mascotStage-1];
  const exTotalMs = state.exerciseDurationSec*1000;
  const exMsLeft = (exerciseEndsAt||now)-now;

  function takeBreakNow(){
    const next={...state};
    next.pausesByDay={...next.pausesByDay,[t]:pausesToday+1};
    next.points+=10; next.lastActiveDate=t;
    if(pausesToday+1===3) next.streak+=1;
    next.maxStreak=Math.max(state.maxStreak||0, next.streak);
    next.nextReminderAt=Date.now()+intervalMs;
    setState(next); setJustAwarded(true); setTimeout(()=>setJustAwarded(false),900);
  }
  function snooze(){
    const next={...state};
    next.refusalsByDay={...next.refusalsByDay,[t]:refusalsToday+1};
    next.points=Math.max(0,next.points-5);
    next.nextReminderAt=Date.now()+10*60*1000;
    setState(next);
  }
  function resetDemo(){
    const fresh=defaultState(); fresh.nextReminderAt=Date.now()+fresh.reminderIntervalMin*60*1000;
    fresh.profile=state.profile; // on garde le profil au reset démo
    setState(fresh);
  }
  function seedDemoHistory(){
    setState(s=>{
      const days={};
      for(let i=0;i<30;i++){ const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10); days[d]=Math.floor(Math.random()*(s.goalPerDay+2)); }
      days[todayKey()]=s.goalPerDay; // objectif du jour atteint
      const total=Object.values(days).reduce((a,b)=>a+b,0);
      return {...s, pausesByDay:days, points:total*10, streak:4, maxStreak:7, lastActiveDate:todayKey(), exercisesDoneIds:["neck","eyes","calves","back"]};
    });
  }
  function showNotice(msg){ setNotice(msg); setTimeout(()=>setNotice(null),3200); }
  function fireReminder(){
    // V2 : appelé automatiquement quand msLeft atteint 0 (le bouton démo sera retiré).
    if(state.calendarMockEnabled && state.inMeeting){
      const next={...state,nextReminderAt:Date.now()+10*60*1000};
      setState(next);
      showNotice("🔕 Réunion en cours — rappel reporté de 10 min");
      return;
    }
    setReminderOpen(true);
  }
  function acceptBreak(){ launchBreak(); } // → écran Exercice (3)
  function postponeReminder(){ snooze(); setReminderOpen(false); }
  function toggleMeeting(){ setState(s=>({...s,inMeeting:!s.inMeeting})); }

  // --- Écran 3 : sélection d'exercice sans répétition dans la journée ---
  function pickExercise(excludeIds){
    const shown = state.exercisesShownByDay[t]||[];
    const exclude = new Set([...shown, ...(excludeIds||[])]);
    let pool = EXERCISES.filter(e=>!exclude.has(e.id));
    if(pool.length===0) pool = EXERCISES.filter(e=>!(excludeIds||[]).includes(e.id)); // tous vus aujourd'hui → nouveau cycle
    if(pool.length===0) pool = EXERCISES;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function markShown(id){
    setState(s=>{ const list=s.exercisesShownByDay[t]||[]; if(list.includes(id)) return s; return {...s,exercisesShownByDay:{...s.exercisesShownByDay,[t]:[...list,id]}}; });
  }
  function launchBreak(){ // pause programmée / "Pause maintenant" / "OK j'y vais" → +10
    const ex=pickExercise([]); markShown(ex.id);
    setCurrentExercise(ex); setExMode("break"); setExerciseEndsAt(Date.now()+exTotalMs);
    setReminderOpen(false); setExPhase("exercise");
  }
  function launchPractice(ex){ // depuis la bibliothèque → +3, hors objectif
    markShown(ex.id);
    setCurrentExercise(ex); setExMode("practice"); setExerciseEndsAt(Date.now()+exTotalMs);
    setExPhase("exercise");
  }
  function skipExercise(){
    const ex=pickExercise(currentExercise?[currentExercise.id]:[]); markShown(ex.id);
    setCurrentExercise(ex); setExerciseEndsAt(Date.now()+exTotalMs);
  }
  function quitExercise(){ setExPhase("none"); setCurrentExercise(null); setExerciseEndsAt(null); }
  function recordExerciseDone(id){ if(!id) return; setState(s=>({...s, exercisesDoneIds: (s.exercisesDoneIds||[]).includes(id)? s.exercisesDoneIds : [...(s.exercisesDoneIds||[]), id]})); }
  function finishExercise(){
    if(exMode==="practice") setState(s=>({...s, points:s.points+3}));
    else takeBreakNow();
    if(currentExercise) recordExerciseDone(currentExercise.id);
    setExPhase("reward");
  }
  function closeReward(){ setExPhase("none"); setCurrentExercise(null); setExerciseEndsAt(null); }
  function navigate(id){ if(id==="home") setView("home"); else if(id==="library") setView("library"); else if(id==="team") setView("team"); else if(id==="settings") setView("settings"); else if(id==="profile") setView("profile"); }
  function patchState(patch){ setState(s=>({...s, ...patch})); }
  function resetStats(){ setState(s=>({...s, points:0, streak:0, pausesByDay:{}, refusalsByDay:{}, exercisesShownByDay:{}, lastActiveDate:null})); }
  function startProfile(name){ const n=(name&&name.trim())?name.trim():"Invité"; setView("home"); setState(s=>({...s, profile:{name:n, guest:!(name&&name.trim())}})); }
  function patchProfile(patch){ setState(s=>({...s, profile:{...s.profile, ...patch}})); }
  function logout(){ setView("home"); setState(s=>({...s, profile:null})); }

  const moodLabel = {sleepy:"endormie",neutral:"motivée",happy:"joyeuse",hero:"héroïque"}[mood];

  // Gate : tant qu'aucun profil local, on affiche l'écran de bienvenue (skippable en invité)
  if(!state.profile){ return <Welcome onStart={startProfile}/>; }

  return (
    <div className={"min-h-screen relative lg:pl-[88px] transition-[padding] duration-300 "+(santeOpen?"lg:pr-[380px] xl:pr-[420px]":"lg:pr-0")}>
      <BackgroundWaves/>
      <LeftRail active={view} onNavigate={navigate}/>
      <main className="relative max-w-2xl mx-auto px-4 pt-6 pb-28 lg:pb-10">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500 text-white grid place-items-center font-bold shadow-soft">M</div>
            <div>
              <div className="text-base font-bold leading-none font-display">MoveBreak</div>
              <div className="text-[11px] text-gray-500">vendredi 29 mai</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>navigate("profile")} title="Mon profil" aria-label="Mon profil" className="rounded-full hover:opacity-80 transition"><ProfileAvatar size={36} photoUrl={state.profile.avatarUrl}/></button>
            <button onClick={resetDemo} title="Réinitialiser (démo)" className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">↻ démo</button>
          </div>
        </header>

        {view==="home" && (<>
        <section className="bg-white rounded-3xl p-5 shadow-soft flex items-center gap-4 mb-4">
          <Mascot mood={mood} size={120} stage={mascotStage}/>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-violet-500 font-semibold">Bonjour {state.profile.name} 👋</div>
            <h1 className="text-xl font-bold leading-snug mt-0.5">{greet}</h1>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 bg-violet-50 px-2 py-1 rounded-full">
              Humeur du jour : <span className="font-semibold text-violet-600 capitalize">{moodLabel}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1.5">✨ Niveau {level} · Esprit « {stageName} »</div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon="streak" label="Streak" value={state.streak+" j"} accent="#FB923C" sub="jours consécutifs"/>
          <StatCard icon="points" label="Points" value={state.points} accent="#7C5CFF" sub={justAwarded?"+10 bravo !":"total cumulés"}/>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-soft mb-4 flex items-center gap-4">
          <CountdownRing msLeft={msLeft} totalMs={intervalMs}/>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-gray-500">Prochaine pause prévue</div>
            <div className="text-lg font-semibold mt-0.5">dans {fmtMMSS(msLeft)}</div>
            <div className={"text-xs mt-1 "+((state.calendarMockEnabled&&state.inMeeting)?"text-amber-600 font-medium":"text-gray-500")}>{(state.calendarMockEnabled&&state.inMeeting)?"📅 Réunion en cours — rappels en pause":"📅 Aucun conflit avec ton agenda"}</div>
            {/* Action proactive : lance directement l'exercice (la pause), sans passer par la modal de rappel */}
            <button onClick={launchBreak} className="btn-press mt-3 w-full py-3 rounded-2xl text-white font-semibold shadow-soft" style={{background:"linear-gradient(135deg,#7C5CFF,#5B3DF5)"}}>▶︎ Pause maintenant</button>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-soft mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Objectif du jour</div>
            <div className="text-xs text-gray-500">{pausesToday}/{state.goalPerDay} pauses</div>
          </div>
          <ProgressBar value={pausesToday} max={state.goalPerDay}/>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="text-gray-500">✅ {pausesToday} prises · ❌ {refusalsToday} refusées</div>
            <button onClick={snooze} className="text-violet-600 hover:underline">Plus tard (−5)</button>
          </div>
        </section>

        <section className="rounded-3xl p-4 mb-2 border border-dashed border-violet-300 bg-violet-50/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white grid place-items-center"><Icon name="team" size={22}/></div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-violet-700">Tableau d'équipe</div>
            <div className="text-xs text-violet-700/80">Rejoins ton équipe avec un code et compare-toi à tes collègues — bientôt 🚀</div>
          </div>
          <button onClick={()=>navigate("team")} className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-700">Découvrir →</button>
        </section>

        <section className="rounded-3xl p-4 mb-2 border border-dashed border-gray-300 bg-white/70">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">🔧 Zone démo (test V1)</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fireReminder} className="btn-press text-xs px-3 py-2 rounded-full bg-violet-100 text-violet-700 font-semibold">🔔 Simuler un rappel</button>
            <button onClick={toggleMeeting} className={"btn-press text-xs px-3 py-2 rounded-full font-semibold border "+(state.inMeeting?"bg-amber-100 text-amber-700 border-amber-200":"bg-white text-gray-500 border-gray-200")}>📅 Agenda : {state.inMeeting?"en réunion":"libre"}</button>
            <button onClick={seedDemoHistory} className="btn-press text-xs px-3 py-2 rounded-full bg-violet-100 text-violet-700 font-semibold">📊 Historique démo</button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Provisoire : le rappel passera en automatique (compte à rebours à 0) et l'agenda sera lié à Outlook. Le mock deviendra une option dans les Réglages.</p>
        </section>
        </>)}

        {view==="library" && (<Library onPick={launchPractice}/>)}

        {view==="settings" && (<Settings state={state} profile={state.profile} onPatch={patchState} onReset={resetStats} onLogout={logout} onOpenProfile={()=>navigate("profile")}/>)}

        {view==="profile" && (<Profile state={state} onPatch={patchProfile}/>)}

        {view==="team" && (<Team/>)}
      </main>

      {santeOpen && (
        <aside className="hidden lg:flex lg:flex-col fixed top-0 right-0 bottom-0 lg:w-[380px] xl:w-[420px] bg-white border-l border-gray-100 shadow-[-10px_0_30px_-15px_rgba(124,92,255,0.15)] z-20">
          <Sidebar onCollapse={()=>setSanteOpen(false)}/>
        </aside>
      )}
      {/* Replié : petite languette horizontale ancrée au bord droit (toutes tailles) */}
      {!santeOpen && (
        <button onClick={()=>setSanteOpen(true)} title="Ouvrir le coin santé" aria-label="Ouvrir le coin santé"
          className="flex items-center gap-2 fixed right-0 top-24 z-30 bg-white border border-r-0 border-gray-200 rounded-l-2xl shadow-soft pl-3 pr-3 py-2 hover:bg-violet-50 transition">
          <span className="text-base">💡</span>
          <span className="text-xs font-bold text-violet-600 whitespace-nowrap">Le coin santé</span>
          <span className="text-violet-400 text-sm">‹</span>
        </button>
      )}

      {/* Coin santé sur mobile : ouvert en drawer overlay (déclenché par la languette) */}
      {santeOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 drawer-bg" onClick={()=>setSanteOpen(false)}/>
          <div className="absolute top-0 right-0 h-full w-[88%] max-w-sm bg-white shadow-2xl drawer-in">
            <Sidebar onClose={()=>setSanteOpen(false)}/>
          </div>
        </div>
      )}

      {notice && (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900/95 text-white text-xs px-4 py-2 rounded-full shadow-soft fade-swap">{notice}</div>)}

      {reminderOpen && (<ReminderModal onAccept={acceptBreak} onPostpone={postponeReminder} onClose={()=>setReminderOpen(false)} stage={mascotStage}/>)}

      {exPhase==="exercise" && currentExercise && (<ExerciseModal exercise={currentExercise} msLeft={exMsLeft} totalMs={exTotalMs} mode={exMode} onSkip={skipExercise} onQuit={quitExercise}/>)}

      {exPhase==="reward" && (<RewardModal exercise={currentExercise} gained={exMode==="practice"?3:10} onContinue={closeReward} stage={mascotStage}/>)}

      <BottomNav active={view} onNavigate={navigate}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App/>);
