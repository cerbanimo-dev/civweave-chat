async function handleWalletAction(action,root){
  if(action==='wallet:plans'){await hostedPlans(root);return true}
  if(action==='wallet:node'){addMessage({guide:'rook',html:await nodeCreditCard()});return true}
  if(action.startsWith('wallet:pay:')){await payNode(action.split(':')[2],root);return true}
  if(action.startsWith('wallet:session:')){const id=action.slice('wallet:session:'.length);addMessage({guide:'rook',html:walletSessionCard(id)});return true}
  if(action.startsWith('wallet:sessionsave:')){const id=action.slice('wallet:sessionsave:'.length);saveWalletSession(id,root);addMessage({guide:'rook',html:`<p class="success">Node wallet session held for this browser session.</p>${await peerCard(id)}`});return true}
  if(action.startsWith('wallet:nodecard:')){const id=action.split(':')[2],p=peers().find(x=>x.id===id);addMessage({guide:'rook',html:card('Node credit',`<div data-pay-node="${escapeHtml(id)}">${creatorPreview(p?.creator||{},p)}<label><span>Dollars</span><input type="number" min="1" max="1000" value="5" data-field="amount"></label>${button(`wallet:pay:${id}`,'Open secure checkout','class="primary"')}</div>`)});return true}
  if(action==='creator:save'){const c=saveCreator(root);addMessage({guide:'rook',html:`<p class="success">Creator card saved.</p>${creatorPreview(c)}`});return true}
  return false
}
