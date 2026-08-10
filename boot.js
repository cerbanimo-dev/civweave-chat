function boot(){
  installPwa();renderGuides();restoreTranscript();
  guideStrip.addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(b)selectGuide(b.dataset.guide)});
  $('#toolButton').addEventListener('click',()=>addMessage({guide:'weaveling',html:toolMenu()}));
  composer.addEventListener('submit',async e=>{e.preventDefault();const text=clean(input.value,8000);if(!text)return;input.value='';addMessage({role:'user',text});await replyTo(text)});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(150,input.scrollHeight)}px`});
  setStatus(navigator.onLine?'local · online':'local · offline');
  addEventListener('online',()=>setStatus('local · online'));addEventListener('offline',()=>setStatus('local · offline'));
  refreshPairingState().catch(()=>{});importPeerValidations().catch(()=>{});
  const q=new URLSearchParams(location.search),ref=q.get('referenceId');
  if(q.get('payment')==='success'&&ref)refreshAgreementReceipt(ref).then(r=>addMessage({guide:'rook',html:`<p class="success">Payment return received: ${escapeHtml(r.status)}</p>${settlementCard(ref)}`})).catch(()=>{});
  if(q.get('nodeTopup'))addMessage({guide:'rook',html:`<p>Node top-up returned: ${escapeHtml(q.get('nodeTopup'))}.</p>${walletCard()}`});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
