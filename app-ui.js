function manifest(){
  const data={name:'Civweave Chat',short_name:'Civweave',start_url:'./',display:'standalone',background_color:'#0d1117',theme_color:'#0d1117',icons:[]};
  const link=document.createElement('link');link.rel='manifest';link.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/manifest+json'}));document.head.append(link);
}
function installPwa(){manifest();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}

function guideHeader(id){const g=GUIDES[id]||GUIDES.weaveling;return `${g.emoji} ${g.name} · ${g.trinket}`}
function addMessage({role='assistant',guide='weaveling',html='',text='',persist=true}){
  const node=tpl.content.firstElementChild.cloneNode(true);node.classList.toggle('user',role==='user');
  node.querySelector('.message-head').textContent=role==='user'?'You':guideHeader(guide);
  const body=node.querySelector('.message-body');body.innerHTML=html||`<p>${escapeHtml(text).replace(/\n/g,'<br>')}</p>`;
  transcript.append(node);transcript.scrollTop=transcript.scrollHeight;
  if(persist){const log=read(KEYS.transcript,[]);log.push({id:uid('msg'),role,guide,html:body.innerHTML,at:now()});write(KEYS.transcript,log.slice(-120));}
  bindMessageActions(node);
  return node;
}
function restoreTranscript(){const log=read(KEYS.transcript,[]);for(const item of log)addMessage({...item,persist:false});if(!log.length)welcome();}
function setStatus(text){statusPill.textContent=text}

function renderGuides(){guideStrip.innerHTML=Object.entries(GUIDES).map(([id,g])=>`<button class="guide-card" data-guide="${id}" aria-pressed="${id===activeGuide}"><span class="emoji">${g.emoji}</span><span><strong>${g.name}</strong><small>${g.trinket}</small></span></button>`).join('');}
function selectGuide(id){if(!GUIDES[id])return;activeGuide=id;renderGuides();addMessage({guide:id,html:`<p><strong>${GUIDES[id].name}</strong> is holding the thread. Ask naturally, or use the + button for a direct tool.</p>`});}

function card(title,body){return `<div class="card"><h3>${title}</h3>${body}</div>`}
function button(action,label,extra=''){return `<button type="button" data-action="${action}" ${extra}>${label}</button>`}

function welcome(){
  addMessage({guide:'weaveling',html:card('Everything lives here',`<p>This is Civweave reduced to one conversation. Learning, work, exchange, governance, wallet, downloads, peer pairing and records appear as chat objects instead of pages.</p><div class="row">${button('tool:tools','Open tools')}${button('tool:downloads','Recommended tiny LM')}</div><small>Nothing consequential is activated, spent, published, paired or submitted without a visible confirmation.</small>`)});
}

function toolMenu(){return card('Tools',`<div class="tool-grid">${TOOLS.map(([id,label,desc])=>`<button type="button" data-action="tool:${id}"><strong>${label}</strong><small>${desc}</small></button>`).join('')}</div>`)}

