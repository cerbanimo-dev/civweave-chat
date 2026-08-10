function bindMessageActions(scope){if(scope.__bound)return;scope.__bound=true;scope.addEventListener('click',async e=>{const target=e.target.closest?.('[data-action]');if(!target)return;const action=target.dataset.action,root=findRoot(target);try{
  if(action.startsWith('tool:'))return openTool(action.split(':')[1]);
  if(action==='wish:draft'){const wish=field(root,'wish');if(!wish)throw new Error('Write a wish first.');buildWeave(wish,{outcome:field(root,'outcome'),constraints:field(root,'constraints'),posture:field(root,'posture'),level:field(root,'level')});addMessage({guide:'weaveling',html:wishCard()});return}
  if(action==='wish:activate'){activateWeave();addMessage({guide:'weaveling',html:`<p class="success">Weave activated. Realm handoffs are staged as reviewable records, not silently executed.</p>${wishCard()}`});return}
  if(action==='wish:pause'){const s=read(KEYS.working,{});if(s.plan){s.plan.state='review';s.plan.updatedAt=now();write(KEYS.working,s)}addMessage({guide:'weaveling',html:wishCard()});return}
  if(action==='wish:passport'){addMessage({guide:'merlin',html:passportCard()});return}
  if(action==='passport:seal'){const check=root.querySelector('[data-field="confirmPassport"]');if(!check?.checked)throw new Error('Confirm the local Passport seal first.');const state=read(KEYS.working,{});if(!state.plan)throw new Error('No weave to seal.');state.plan.passport={pledge:field(root,'pledge'),sealedAt:now()};state.plan.updatedAt=now();write(KEYS.working,state);addMessage({guide:'merlin',html:`<p class="success">Passport intention sealed locally.</p>${wishCard()}`});return}
  if(action==='wish:clear'){localStorage.removeItem(KEYS.working);addMessage({guide:'weaveling',html:wishCard()});return}
  if(action.startsWith('record:new:'))return addMessage({guide:RECORD_CONFIG[action.split(':')[2]].guide,html:recordEditor(action.split(':')[2])});
  if(action.startsWith('record:save:')){const type=action.split(':')[2],item=saveRecord(type,root);addMessage({guide:RECORD_CONFIG[type].guide,html:`<p class="success">Saved “${escapeHtml(item.title||'Untitled')}”.</p>${recordTool(type)}`});return}
  if(action==='wallet:plans')return hostedPlans(root);
  if(action==='wallet:node')return addMessage({guide:'rook',html:await nodeCreditCard()});
  if(action.startsWith('wallet:pay:'))return payNode(action.split(':')[2],root);
  if(action.startsWith('wallet:session:')){const id=action.slice('wallet:session:'.length);addMessage({guide:'rook',html:walletSessionCard(id)});return}
  if(action.startsWith('wallet:sessionsave:')){const id=action.slice('wallet:sessionsave:'.length);saveWalletSession(id,root);addMessage({guide:'rook',html:`<p class="success">Node wallet session held for this browser session.</p>${await peerCard(id)}`});return}
  if(action.startsWith('wallet:nodecard:')){const id=action.split(':')[2],p=peers().find(x=>x.id===id);return addMessage({guide:'rook',html:card('Node credit',`<div data-pay-node="${escapeHtml(id)}">${creatorPreview(p?.creator||{},p)}<label><span>Dollars</span><input type="number" min="1" max="1000" value="5" data-field="amount"></label>${button(`wallet:pay:${id}`,'Open secure checkout','class="primary"')}</div>`)})}
  if(action==='creator:save'){const c=saveCreator(root);addMessage({guide:'rook',html:`<p class="success">Creator card saved.</p>${creatorPreview(c)}`});return}
  if(action==='nodes:locate')return locateNodes(root);
  if(action==='nodes:refresh')return refreshPeers(root);
  if(action==='nodes:add')return addMessage({guide:'rook',html:addPeerCard()});
  if(action==='node:save'){const id=savePeer(root);addMessage({guide:'rook',html:await peerCard(id)});return}
  if(action.startsWith('node:open:'))return addMessage({guide:'rook',html:await peerCard(action.slice('node:open:'.length))});
  if(action.startsWith('node:pair:')){const id=action.slice('node:pair:'.length),p=await pairPeer(id);addMessage({guide:'merlin',html:`<p class="success">Paired with ${escapeHtml(p.name||p.id)}.</p>${await peerCard(id)}`});return}
  if(action.startsWith('node:unpair:')){const id=action.slice('node:unpair:'.length);await unpairPeer(id);addMessage({guide:'merlin',html:await peerCard(id)});return}
  if(action.startsWith('node:gossip:')){const id=action.slice('node:gossip:'.length),packet=await gossipPeer(id);addMessage({guide:'merlin',html:`<p class="success">Peer gossip exchanged.</p><small>Shared: ${packet.creatorCard?'Creator card · ':''}${packet.validationSummary?'validation summary · ':''}${packet.knownPeers.length} known peers.</small>`});return}
  if(action.startsWith('download:tiny-router')){await ensureTiny(root);return}
  if(action.startsWith('download:test:tiny-router')){const out=await tinyGenerate('Reply with exactly: local model ready',root);addMessage({guide:'weaveling',html:`<p>${escapeHtml(out||'No output')}</p>`});return}
  if(action==='settings:save'){saveSettings(root);addMessage({guide:'weaveling',html:'<p class="success">Settings saved locally.</p>'});return}
  if(action==='export:json')return exportBackup();
  if(action==='records:clear'){if(!confirm('Clear Civweave Chat local records, peers, creator card, weave and transcript?'))return;Object.values(KEYS).forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(KEYS.sessions);location.reload();return}
}catch(err){addMessage({guide:'weaveling',html:`<p class="error">${escapeHtml(err.message||String(err))}</p>`});}});}
