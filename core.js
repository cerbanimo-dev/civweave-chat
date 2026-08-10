'use strict';

const VERSION='0.3.0-pass3-mvp';
const KEYS={
  state:'civweave.chat.state.v1', transcript:'civweave.chat.transcript.v1', peers:'civweave.chat.peers.v1',
  creator:'civweave.chat.creator.v1', settings:'civweave.chat.settings.v1', inbox:'civweave.realm-inbox.v1',
  working:'civweave.working-campus.v1', rewards:'civweave.chat.rewards.v1', records:'civweave.chat.records.v1',
  sessions:'civweave.node-ai-marketplace.sessions.v1', validations:'civweave.chat.validations.v2',
  pairingInbox:'civweave.chat.pairing-inbox.v2', addons:'civweave.chat.addons.v1', events:'civweave.chat.events.v1',
  projections:'civweave.chat.projections.v1', paymentReceipts:'civweave.chat.payment-receipts.v1'
};

const GUIDES={
  weaveling:{name:'Weaveling',emoji:'🧭',trinket:'Compass',role:'orchestrator',prompt:'Mirror the intention, coordinate the other guides, preserve review gates, and make the next useful move obvious.'},
  moss:{name:'Moss',emoji:'🌰',trinket:'Acorn',role:'learning',prompt:'Turn intentions into learnable skills, modules, evidence, practice, and competency checkpoints.'},
  kamiya:{name:'Kamiya',emoji:'🎁',trinket:'Gift',role:'work',prompt:'Turn intentions into skilled work, quests, submissions, evidence, and validated completion.'},
  rook:{name:'Rook',emoji:'🔘',trinket:'Button',role:'exchange',prompt:'Help find materials, services, agreements, prices, fair edges, and resource exchange.'},
  merlin:{name:'Merlin',emoji:'🧙',trinket:'Wizard hat',role:'governance',prompt:'Handle consent, roles, proposals, validations, appeals, reviews, and shared-state changes.'}
};

const TOOLS=[
  ['journey','🧭 Journey','17-step Civweave golden path'], ['wish','✨ Wish','Create, revise, activate the weave'],
  ['learn','🌰 Learn','Paths, modules, quizzes, competencies'], ['work','🎁 Work','Quests, submissions, evidence, rewards'],
  ['market','🔘 Market','Threads, agreements and exchange'], ['govern','🧙 Govern','Passport, proposals, roles and consent'],
  ['validate','✓ Validate','Weighted confidence and payout gates'], ['wallet','💳 Wallet','Rewards, plans, node credit, payment wiring'],
  ['nodes','📡 Nodes','Nearby peer radar, pairing and gossip'], ['creator','🪪 Creator','Paid-service profile shared with peers'],
  ['downloads','⬇ Downloads','Optional model package only'], ['records','🗃 Records','Local ledgers and system handoffs'],
  ['settings','⚙ Settings','AI, hosts, privacy and payments'], ['parity','◎ Parity','MVP parity matrix'],
  ['backup','↗ Backup','Export or restore local state']
];

const JOURNEY=[
  ['civweave.model-setup','Set up a model','settings'], ['civweave.state-wish','State a wish','wish'],
  ['civweave.clarify-wish','Clarify the wish','wish'], ['civweave.skill-posture','Choose skill posture','wish'],
  ['civweave.generate-weave','Generate three paths','wish'], ['civweave.review-weave','Review and revise weave','wish'],
  ['civweave.activate-weave','Activate weave','wish'], ['living-school.start-path','Start learning path','learn'],
  ['living-school.follow-modules','Follow modules','learn'], ['living-school.send-quest','Send work quest','learn'],
  ['cerbanimo.manage-quests','Manage quests','work'], ['cerbanimo.submit-work','Submit work/evidence','work'],
  ['cerbanimo.settle-reward','Settle rewards','work'], ['fellowfare.browse-threads','Browse exchange threads','market'],
  ['fellowfare.accept-agreement','Accept agreement','market'], ['fellowfare.settle-exchange','Settle exchange','market'],
  ['civweave.reward-wallet','View Acorns and Buttons','wallet']
];

const SYSTEMS={
  civweave:{guide:'weaveling',families:['model setup','wish intake','clarification','skill posture','weave generation/review/activation','reward wallet','backup/restore','orchestration']},
  'living-school':{guide:'moss',families:['learning paths','modules','content notes','quizzes','competency evidence','peer validation','final-project handoff','history']},
  cerbanimo:{guide:'kamiya',families:['quests','tasks','submissions','evidence','acceptance','reward settlement','project work']},
  fellowfare:{guide:'rook',families:['needs/offers','service listings','search','agreements','payment checkout','settlement receipts','creator cards']},
  anarchadia:{guide:'merlin',families:['passport','proposals','roles','consent','votes','review','appeals','system draft/projection handoffs']}
};

const ADDONS=[{id:'tiny-router',name:'Tiny Router LM',modelId:'HuggingFaceTB/SmolLM2-360M-Instruct',modelCandidates:['onnx-community/SmolLM2-360M-Instruct-ONNX','HuggingFaceTB/SmolLM2-360M-Instruct'],approxBytes:272737275,runtime:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm',recommended:true,required:false,description:'Optional local route-lock and short-response model. The base app ships without model weights.'}];

const $=sel=>document.querySelector(sel), transcript=$('#transcript'), composer=$('#composer'), input=$('#messageInput'), guideStrip=$('#guideStrip'), statusPill=$('#statusPill'), tpl=$('#messageTemplate');
let activeGuide='weaveling', tinyPipeline=null, tinyLoading=null;
const now=()=>new Date().toISOString();
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const clean=(v,max=8000)=>String(v??'').trim().slice(0,max);
const parse=(v,f)=>{try{return JSON.parse(v)??f}catch{return f}};
const read=(key,f)=>parse(localStorage.getItem(key),f);
const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{}return v};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const originOf=value=>{try{return new URL(value,location.href).origin}catch{return''}};
const settings=()=>({...{serviceHost:location.origin,aiMode:'auto',hostedPath:'/api/ai/chat',localEndpoint:'',localModel:'',locationPrecisionKm:5,shareValidationSummaries:true,shareCreatorCard:true,validationConfidenceThreshold:.85,paymentsPath:'/api/payments',currency:'USD'},...read(KEYS.settings,{})});
const peers=()=>Array.isArray(read(KEYS.peers,[]))?read(KEYS.peers,[]):[];
const records=()=>Array.isArray(read(KEYS.records,[]))?read(KEYS.records,[]):[];
const events=()=>Array.isArray(read(KEYS.events,[]))?read(KEYS.events,[]):[];
const sessions=()=>{try{return parse(sessionStorage.getItem(KEYS.sessions),{})||{}}catch{return{}}};
const saveSessions=v=>{try{sessionStorage.setItem(KEYS.sessions,JSON.stringify(v))}catch{}return v};

function audit(type,payload={}){const all=events();all.unshift({id:uid('event'),schema:'civweave.chat.audit-event.v1',type,at:now(),payload});write(KEYS.events,all.slice(0,1000));}
function field(root,name){const el=root?.querySelector?.(`[data-field="${name}"]`);return clean(el?.value,8000)}
function checked(root,name){return Boolean(root?.querySelector?.(`[data-field="${name}"]`)?.checked)}
function findRoot(target){return target.closest('.message-body')||target.parentElement}
function card(title,body){return `<div class="card"><h3>${title}</h3>${body}</div>`}
function button(action,label,extra=''){return `<button type="button" data-action="${action}" ${extra}>${label}</button>`}
function guideHeader(id){const g=GUIDES[id]||GUIDES.weaveling;return `${g.emoji} ${g.name} · ${g.trinket}`}
function setStatus(text){statusPill.textContent=text}

function addMessage({role='assistant',guide='weaveling',html='',text='',persist=true}){
  const node=tpl.content.firstElementChild.cloneNode(true);node.classList.toggle('user',role==='user');
  node.querySelector('.message-head').textContent=role==='user'?'You':guideHeader(guide);
  const body=node.querySelector('.message-body');body.innerHTML=html||`<p>${escapeHtml(text).replace(/\n/g,'<br>')}</p>`;
  transcript.append(node);transcript.scrollTop=transcript.scrollHeight;
  if(persist){const log=read(KEYS.transcript,[]);log.push({id:uid('msg'),role,guide,html:body.innerHTML,at:now()});write(KEYS.transcript,log.slice(-160));}
  bindActions(node);return node;
}
function restoreTranscript(){const log=read(KEYS.transcript,[]);for(const item of log)addMessage({...item,persist:false});if(!log.length)welcome();}
function renderGuides(){guideStrip.innerHTML=Object.entries(GUIDES).map(([id,g])=>`<button class="guide-card" data-guide="${id}" aria-pressed="${id===activeGuide}"><span class="emoji">${g.emoji}</span><span><strong>${g.name}</strong><small>${g.trinket}</small></span></button>`).join('')}
function selectGuide(id){if(!GUIDES[id])return;activeGuide=id;renderGuides();addMessage({guide:id,html:`<p><strong>${GUIDES[id].name}</strong> is holding the thread.</p>`})}
function toolMenu(){return card('Civweave tools',`<div class="tool-grid">${TOOLS.map(([id,label,desc])=>`<button type="button" data-action="tool:${id}"><strong>${label}</strong><small>${desc}</small></button>`).join('')}</div>`)}
function welcome(){addMessage({guide:'weaveling',html:card('Civweave Chat MVP',`<p>The full working loop is compressed into one conversation: intention → learning → work → validation → exchange → rewards, with peer mesh and payment hooks beside it.</p><div class="row">${button('tool:journey','Continue journey','class="primary"')}${button('tool:tools','All tools')}</div><small>Consequential actions use visible review or explicit confirmation gates.</small>`)})}

function creator(){return {...{displayName:'Creator',blurb:'',services:[],rate:'',availability:'Open',contact:'',updatedAt:now()},...read(KEYS.creator,{})}}
function creatorPreview(c=creator(),peer=null){return `<div class="creator-preview"><h3>${escapeHtml(c.displayName||peer?.name||'Creator')}</h3><p>${escapeHtml(c.blurb||'No paid services advertised yet.')}</p><div class="services">${(c.services||[]).map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join('')}</div>${c.rate?`<div class="price">${escapeHtml(c.rate)}</div>`:''}<small>${escapeHtml(c.availability||'')}${c.contact?` · ${escapeHtml(c.contact)}`:''}</small></div>`}
function creatorEditor(){const c=creator();return card('Creator card',`<label><span>Display name</span><input data-field="displayName" value="${escapeHtml(c.displayName)}"></label><label><span>Paid services</span><textarea data-field="blurb" maxlength="280">${escapeHtml(c.blurb)}</textarea></label><label><span>Service tags</span><input data-field="services" value="${escapeHtml((c.services||[]).join(', '))}"></label><div class="split"><label><span>Rate / starting price</span><input data-field="rate" value="${escapeHtml(c.rate)}"></label><label><span>Availability</span><input data-field="availability" value="${escapeHtml(c.availability)}"></label></div><label><span>Contact/action endpoint</span><input data-field="contact" value="${escapeHtml(c.contact)}"></label><div class="row">${button('creator:save','Save Creator card','class="primary"')}</div><small>Shared only with paired peers when Creator-card gossip is enabled.</small>`)}
function saveCreator(root){const c={displayName:field(root,'displayName')||'Creator',blurb:field(root,'blurb'),services:field(root,'services').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),rate:field(root,'rate'),availability:field(root,'availability')||'Open',contact:field(root,'contact'),updatedAt:now()};write(KEYS.creator,c);audit('creator.updated',{displayName:c.displayName});return c}

function manifest(){const icon=`data:image/svg+xml,${encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect width=\"512\" height=\"512\" rx=\"112\" fill=\"%230d1117\"/><text x=\"256\" y=\"330\" text-anchor=\"middle\" font-size=\"270\">🧭</text></svg>')}`;const data={name:'Civweave Chat',short_name:'Civweave',start_url:'./',display:'standalone',background_color:'#0d1117',theme_color:'#0d1117',icons:[{src:icon,sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]};const link=document.createElement('link');link.rel='manifest';link.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/manifest+json'}));document.head.append(link)}
function installPwa(){manifest();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}
