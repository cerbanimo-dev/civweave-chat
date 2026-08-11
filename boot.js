function boot(){
  installPwa();renderGuides();restoreTranscript();
  guideStrip.addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(b)selectGuide(b.dataset.guide)});
  $('#toolButton').addEventListener('click',()=>addMessage({guide:'weaveling',html:toolMenu()}));
  composer.addEventListener('submit',async e=>{e.preventDefault();const text=clean(input.value,8000);if(!text)return;input.value='';addMessage({role:'user',text});await replyTo(text)});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(150,input.scrollHeight)}px`});
  setStatus(navigator.onLine?'local · online':'local · offline');
  addEventListener('online',()=>setStatus('local · online'));addEventListener('offline',()=>setStatus('local · offline'));
  refreshPairingState().catch(()=>{});importPeerValidations().catch(()=>{});refreshCommerceState().catch(()=>{});warmActiveBrowserModel().catch(()=>{});
  const q=new URLSearchParams(location.search),ref=q.get('referenceId'),sessionId=q.get('session_id'),payment=q.get('payment'),nodeTopup=q.get('nodeTopup'),connect=q.get('connect'),connectAccount=q.get('account_id');
  if(payment==='success'&&ref&&sessionId){rememberPaymentSession(ref,sessionId);refreshAgreementReceipt(ref,sessionId).then(r=>addMessage({guide:'rook',html:`<p class="${receiptMatchesAgreement(getRecord(ref),r)?'success':'warn'}">Stripe return verified: ${escapeHtml(r.status)}</p>${settlementCard(ref)}`})).catch(e=>addMessage({guide:'rook',html:`<p class="error">${escapeHtml(e.message)}</p>${settlementCard(ref)}`}))}
  if(payment==='cancelled'&&ref)addMessage({guide:'rook',html:`<p>Stripe checkout was cancelled. No settlement was recorded.</p>${settlementCard(ref)}`});
  if(nodeTopup)addMessage({guide:'rook',html:`<p>Node top-up returned: ${escapeHtml(nodeTopup)}.</p>${walletCard()}`});
  if((connect==='return'||connect==='refresh')&&connectAccount){refreshCreatorConnectStatus(connectAccount).then(cs=>addMessage({guide:'rook',html:`<p class="${cs.ready?'success':'warn'}">Stripe Creator payout status: ${escapeHtml(cs.status||'pending')}.</p>${creatorEditor()}`})).catch(e=>addMessage({guide:'rook',html:`<p class="error">${escapeHtml(e.message)}</p>${creatorEditor()}`}))}
  if(payment||nodeTopup||connect){const cleanUrl=new URL(location.href);for(const key of ['payment','referenceId','session_id','nodeTopup','connect','account_id'])cleanUrl.searchParams.delete(key);history.replaceState(null,'',`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
