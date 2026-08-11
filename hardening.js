'use strict';

function settlementCard(id){
  const a=getRecord(id);if(!a)return marketCard();
  const receipt=paymentReceiptFor(id),hasSession=Boolean(paymentSessionFor(id));
  return card(`Settle · ${escapeHtml(a.title)}`,`${paymentSummary(a,receipt)}<div class="row">${a.amount>0&&!hasSession?button(`payment:checkout:${id}`,'Open Stripe checkout','class="primary"'):''}${a.amount>0&&hasSession?button(`payment:refresh:${id}`,'Check Stripe receipt'):a.amount<=0?button(`market:settle-manual:${id}`,'Settle zero-cost exchange','class="primary"'):''}</div>${a.amount>0&&hasSession?`<div class="row">${button(`market:settle-paid:${id}`,'Verify with Stripe & settle','class="primary"')}</div>`:''}`)
}

function settleExchange(id,mode='manual',verifiedReceipt=null){
  const a=getRecord(id);if(!a?.acceptedAt)throw new Error('Accept the agreement first.');
  if(Number(a.amount||0)>0){
    if(mode!=='paid'||!receiptMatchesAgreement(a,verifiedReceipt))throw new Error('Paid settlement requires a fresh exact Stripe verification.');
  }else if(mode!=='manual')throw new Error('Zero-cost exchange uses manual settlement.');
  if(a.settledAt)return a;
  const next=updateRecord(id,{status:'settled',settledAt:now(),settlementMode:mode,paymentProvider:verifiedReceipt?.provider||null,paymentReference:verifiedReceipt?.providerReference||null});
  draftSystemEvent('fellowfare.exchange.completed','fellowfare','civweave',{agreementId:id,amount:a.amount,currency:a.currency});
  audit('fellowfare.exchange.settled',{recordId:id,mode});return next
}

function exportBackup(){
  const safeSettings={...settings(),allowRemotePrompts:false};
  const safeConnect={...read('civweave.chat.connect.v1',{}),ready:false,status:'needs-verification'};const payload={schema:'civweave.chat.backup.v4',version:VERSION,exportedAt:now(),working:read(KEYS.working,{}),inbox:read(KEYS.inbox,[]),records:records(),validations:validations(),rewards:read(KEYS.rewards,{}),creator:creator(),peers:peers(),pairingInbox:pairingInbox(),settings:safeSettings,events:events(),projections:read(KEYS.projections,[]),browserModels:read('civweave.chat.browser-models.v1',{}),connect:safeConnect};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`civweave-chat-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);audit('backup.exported',{})
}

function restoreBackup(root){
  if(!checked(root,'confirmRestore'))throw new Error('Confirm restore first.');
  const b=parse(field(root,'backupJson'),null);if(!b||!/^civweave\.chat\.backup\.v[234]$/.test(b.schema||''))throw new Error('Unsupported Civweave Chat backup.');
  write(KEYS.working,b.working||{});write(KEYS.inbox,Array.isArray(b.inbox)?b.inbox:[]);write(KEYS.records,Array.isArray(b.records)?b.records:[]);write(KEYS.validations,Array.isArray(b.validations)?b.validations:[]);write(KEYS.rewards,b.rewards||{});write(KEYS.creator,b.creator||{});write(KEYS.peers,Array.isArray(b.peers)?b.peers:[]);write(KEYS.pairingInbox,Array.isArray(b.pairingInbox)?b.pairingInbox:[]);write(KEYS.settings,normalizedSettings({...b.settings,allowRemotePrompts:false}));write(KEYS.events,Array.isArray(b.events)?b.events:[]);write(KEYS.projections,Array.isArray(b.projections)?b.projections:[]);write('civweave.chat.browser-models.v1',b.browserModels||{});write('civweave.chat.connect.v1',{...(b.connect||{}),ready:false,status:'needs-verification'});write(KEYS.paymentReceipts,[]);localStorage.removeItem(PAYMENT_SESSION_KEY);audit('backup.restored',{remotePromptsReset:true,paymentAssertionsDropped:true});return true
}
