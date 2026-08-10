composer.addEventListener('submit',async e=>{e.preventDefault();const text=clean(input.value,8000);if(!text)return;input.value='';input.style.height='auto';addMessage({role:'user',text});await replyTo(text);});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(150,input.scrollHeight)}px`;});
$('#toolButton').addEventListener('click',()=>openTool('tools'));
guideStrip.addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(b)selectGuide(b.dataset.guide)});

function boot(){installPwa();renderGuides();restoreTranscript();setStatus(navigator.onLine?'local · online':'local · offline');refreshPairingState().catch(()=>{});addEventListener('online',()=>setStatus('local · online'));addEventListener('offline',()=>setStatus('local · offline'));}
boot();
