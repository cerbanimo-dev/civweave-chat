async function bindActions(scope){if(scope.__bound)return;scope.__bound=true;scope.addEventListener('click',async e=>{const target=e.target.closest?.('[data-action]');if(!target)return;const action=target.dataset.action,root=findRoot(target);try{
  if(action.startsWith('tool:')){await openTool(action.slice(5));return}
  if(action==='wish:draft'){const wish=field(root,'wish');if(!wish)throw new Error('Write a wish first.');buildWeave(wish,{outcome:field(root,'outcome'),context:field(root,'context'),constraints:field(root,'constraints'),posture:field(root,'posture'),level:field(root,'level')});addMessage({guide:'weaveling',html:wishCard()});return}
  if(action==='wish:review'){addMessage({guide:'weaveling',html:reviewWeaveCard()});return}
  if(action==='wish:save-review'){saveWeaveReview(root);addMessage({guide:'weaveling',html:`<p class="success">Reviewed weave saved.</p>${wishCard()}`});return}
  if(action==='wish:activate-card'){addMessage({guide:'weaveling',html:activateWeaveCard()});return}
  if(action==='wish:activate'){if(!checked(root,'confirmActivate'))throw new Error('Confirm the activation handoff first.');activateWeave();addMessage({guide:'weaveling',html:`<p class="success">Weave activated and handoffs staged.</p>${journeyCard()}`});return}
  if(action==='wish:pause'){const s=read(KEYS.working,{});if(s.plan){s.plan.state='review';s.plan.activatedAt=null;s.plan.updatedAt=now();write(KEYS.working,s);audit('civweave.weave.paused',{weaveId:s.plan.id})}addMessage({guide:'weaveling',html:wishCard()});return}
  if(action==='wish:passport'){addMessage({guide:'merlin',html:passportCard()});return}
  if(action==='passport:seal'){if(!checked(root,'confirmPassport'))throw new Error('Confirm the Passport seal first.');const s=read(KEYS.working,{});if(!s.plan)throw new Error('No weave to seal.');s.plan.passport={pledge:field(root,'pledge'),sealedAt:now()};s.plan.updatedAt=now();write(KEYS.working,s);draftSystemEvent('anarchadia.passport.updated','anarchadia','civweave',{weaveId:s.plan.id});audit('anarchadia.passport.sealed',{weaveId:s.plan.id});addMessage({guide:'merlin',html:`<p class="success">Passport intention sealed locally.</p>${wishCard()}`});return}
  if(action==='wish:clear'){localStorage.removeItem(KEYS.working);addMessage({guide:'weaveling',html:wishCard()});return}

  if(action==='learning:new'){addMessage({guide:'moss',html:learningNewCard()});return}
  if(action==='learning:save-new'){const r=newRecord('learning','learning-path',{title:field(root,'title')||'Learning path',goal:field(root,'goal'),status:'ready',modules:[]});addMessage({guide:'moss',html:learningPathCard(r.id)});return}
  if(action.startsWith('learning:start:')){const id=action.slice(15);startLearning(id);addMessage({guide:'moss',html:learningPathCard(id)});return}
  if(action.startsWith('learning:open:')){addMessage({guide:'moss',html:learningPathCard(action.slice(14))});return}
  if(action.startsWith('learning:module-save:')){const parts=action.split(':'),pathId=parts[2],moduleId=parts[3];completeModule(pathId,moduleId,root);addMessage({guide:'moss',html:learningPathCard(pathId)});return}
  if(action.startsWith('learning:module:')){const parts=action.split(':');addMessage({guide:'moss',html:moduleEvidenceCard(parts[2],parts[3])});return}
  if(action.startsWith('learning:sendquest:')){const id=action.slice('learning:sendquest:'.length),q=sendLearningQuest(id);addMessage({guide:'kamiya',html:`<p class="success">Quest handed to Cerbanimo.</p>${questManageCard(q.id)}`});return}

  if(action==='work:new'){addMessage({guide:'kamiya',html:workNewCard()});return}
  if(action==='work:save-new'){const q=newRecord('work','work-quest',{title:field(root,'title')||'Quest',deliverable:field(root,'deliverable'),evidence:'',status:'queued'});addMessage({guide:'kamiya',html:questManageCard(q.id)});return}
  if(action.startsWith('work:manage:')){addMessage({guide:'kamiya',html:questManageCard(action.slice(12))});return}
  if(action.startsWith('work:submit-card:')){addMessage({guide:'kamiya',html:workSubmitCard(action.slice(17))});return}
  if(action.startsWith('work:submit:')){const id=action.slice(12);submitWork(id,root);addMessage({guide:'kamiya',html:`<p class="success">Work submitted for validation.</p>${questManageCard(id)}`});return}
  if(action.startsWith('work:settle:')){const id=action.slice(12);settleReward(id);addMessage({guide:'kamiya',html:`<p class="success">Reward settled.</p>${rewardWallet()}`});return}

  if(action==='market:new'){addMessage({guide:'rook',html:marketNewCard()});return}
  if(action==='market:save-new'){const t=newRecord('market','market-thread',{title:field(root,'title')||'Market thread',needOrOffer:field(root,'needOrOffer'),terms:field(root,'terms'),amount:Math.max(0,Number(field(root,'amount'))||0),currency:(field(root,'currency')||settings().currency).toUpperCase(),status:'open'});draftSystemEvent('fellowfare.resource.available','fellowfare','civweave',{threadId:t.id});addMessage({guide:'rook',html:marketCard()});return}
  if(action.startsWith('market:agreement-save:')){const threadId=action.slice('market:agreement-save:'.length),a=createAgreementFromDraft(threadId,root);addMessage({guide:'rook',html:acceptAgreementCard(a.id)});return}
  if(action.startsWith('market:agreement:')){addMessage({guide:'rook',html:agreementDraftCard(action.slice('market:agreement:'.length))});return}
  if(action.startsWith('market:accept-card:')){const id=action.slice('market:accept-card:'.length);await prepareAgreementForSignature(id);addMessage({guide:'rook',html:acceptAgreementCard(id)});return}
  if(action.startsWith('market:accept:')){const id=action.slice('market:accept:'.length);await acceptAgreementSecure(id,root);addMessage({guide:'rook',html:settlementCard(id)});return}
  if(action.startsWith('market:settle-card:')){addMessage({guide:'rook',html:settlementCard(action.slice('market:settle-card:'.length))});return}
  if(action.startsWith('market:settle-manual:')){const id=action.slice('market:settle-manual:'.length);settleExchange(id,'manual');addMessage({guide:'rook',html:`<p class="success">Zero-cost exchange settled.</p>${marketCard()}`});return}
  if(action.startsWith('market:settle-paid:')){const id=action.slice('market:settle-paid:'.length);await settlePaidExchange(id);addMessage({guide:'rook',html:`<p class="success">Stripe verified the exact payment and the exchange is settled.</p>${marketCard()}`});return}

  if(action==='govern:new'){addMessage({guide:'merlin',html:governanceNewCard()});return}
  if(action==='govern:save-new'){const r=newRecord('governance',field(root,'subtype')||'proposal',{title:field(root,'title')||'Governance record',proposal:field(root,'proposal'),consent:field(root,'consent')||'review',status:'review'});addMessage({guide:'merlin',html:governanceOpenCard(r.id)});return}
  if(action.startsWith('govern:open:')){addMessage({guide:'merlin',html:governanceOpenCard(action.slice('govern:open:'.length))});return}
  if(action.startsWith('govern:approve:')){const id=action.slice('govern:approve:'.length);decideGovernance(id,'approved',root);addMessage({guide:'merlin',html:governanceCard()});return}
  if(action.startsWith('govern:reject:')){const id=action.slice('govern:reject:'.length);decideGovernance(id,'rejected',root);addMessage({guide:'merlin',html:governanceCard()});return}

  if(action.startsWith('validation:add:')){addMessage({guide:'merlin',html:validationEvidenceCard(action.slice('validation:add:'.length))});return}
  if(action.startsWith('validation:save:')){const id=action.slice('validation:save:'.length),result=await saveValidation(id,root);addMessage({guide:'merlin',html:`<p class="success">Weighted evidence recorded.</p><div class="row">${validationBadge(id)}</div><small>Net confidence ${result.rollup.net.toFixed(2)}</small>`});return}

  if(action.startsWith('payment:checkout:')){await requestAgreementCheckout(action.slice('payment:checkout:'.length));return}
  if(action.startsWith('payment:refresh:')){const id=action.slice('payment:refresh:'.length),receipt=await refreshAgreementReceipt(id);addMessage({guide:'rook',html:`<p class="${paymentReceiptFor(id)?'success':'warn'}">Payment status: ${escapeHtml(receipt.status)}</p>${settlementCard(id)}`});return}
  if(action==='wallet:payments'){addMessage({guide:'rook',html:await paymentStatusCard()});return}
  if(action==='wallet:plans'){await hostedPlans(root);return}
  if(action==='wallet:node'){addMessage({guide:'rook',html:await nodeCreditCard()});return}
  if(action.startsWith('wallet:pay:')){await payNode(action.slice('wallet:pay:'.length),root);return}
  if(action.startsWith('wallet:session:')){addMessage({guide:'rook',html:walletSessionCard(action.slice('wallet:session:'.length))});return}
  if(action.startsWith('wallet:sessionsave:')){const id=action.slice('wallet:sessionsave:'.length);saveWalletSession(id,root);addMessage({guide:'rook',html:`<p class="success">Node wallet session held for this browser session.</p>${await peerCard(id)}`});return}
  if(action.startsWith('wallet:nodecard:')){const id=action.slice('wallet:nodecard:'.length),p=peers().find(x=>x.id===id);addMessage({guide:'rook',html:card('Node credit',`<div data-pay-node="${escapeHtml(id)}">${creatorPreview(p?.creator||{},p)}<label><span>Dollars</span><input type="number" min="1" max="1000" value="5" data-field="amount"></label>${button(`wallet:pay:${id}`,'Open secure checkout','class="primary"')}</div>`)});return}

  if(action==='creator:save'){const c=saveCreator(root);addMessage({guide:'rook',html:`<p class="success">Creator card saved.</p>${creatorPreview(c)}`});return}
  if(action==='connect:onboard'){await startCreatorOnboarding(root);return}
  if(action==='connect:refresh'){const cs=await refreshCreatorConnectStatus();addMessage({guide:'rook',html:`<p class="${cs.ready?'success':'warn'}">Stripe payout status: ${escapeHtml(cs.status||'pending')}.</p>${creatorEditor()}`});return}
  if(action==='commerce:refresh'){await refreshCommerceState();addMessage({guide:'rook',html:marketCard()});return}
  if(action.startsWith('commerce:review:')){addMessage({guide:'rook',html:incomingAgreementReviewCard(decodeURIComponent(action.slice('commerce:review:'.length)))});return}
  if(action.startsWith('commerce:accept:')){await respondIncomingAgreement(decodeURIComponent(action.slice('commerce:accept:'.length)),true,root);addMessage({guide:'rook',html:`<p class="success">Agreement countersigned and returned.</p>${marketCard()}`});return}
  if(action.startsWith('commerce:reject:')){await respondIncomingAgreement(decodeURIComponent(action.slice('commerce:reject:'.length)),false);addMessage({guide:'rook',html:marketCard()});return}
  if(action==='nodes:locate'){await locateNodes(root);return}
  if(action==='nodes:refresh'){await refreshPeers(root);return}
  if(action==='nodes:add'){addMessage({guide:'rook',html:addPeerCard()});return}
  if(action==='node:save'){const id=savePeer(root);addMessage({guide:'rook',html:await peerCard(id)});return}
  if(action.startsWith('node:open:')){addMessage({guide:'rook',html:await peerCard(action.slice('node:open:'.length))});return}
  if(action.startsWith('node:pair:')){const id=action.slice('node:pair:'.length),p=await pairPeer(id);addMessage({guide:'merlin',html:`<p class="success">Pair request signed and queued for ${escapeHtml(p.name||p.id)}.</p>${await peerCard(id)}`});return}
  if(action.startsWith('node:sync:')){const id=action.slice('node:sync:'.length);await syncPeer(id);addMessage({guide:'merlin',html:await peerCard(id)});return}
  if(action.startsWith('node:unpair:')){const id=action.slice('node:unpair:'.length);await unpairPeer(id);addMessage({guide:'merlin',html:await peerCard(id)});return}
  if(action.startsWith('node:gossip:')){const id=action.slice('node:gossip:'.length),packet=await gossipPeer(id);addMessage({guide:'merlin',html:`<p class="success">Signed peer gossip exchanged.</p><small>${packet.knownPeers.length} known peers · ${packet.validationRequests.length} review requests.</small>`});return}
  if(action.startsWith('node:accept:')){await respondPairRequest(action.slice('node:accept:'.length),true);addMessage({guide:'merlin',html:minimapCard()});return}
  if(action.startsWith('node:reject:')){await respondPairRequest(action.slice('node:reject:'.length),false);addMessage({guide:'merlin',html:minimapCard()});return}
  if(action.startsWith('node:validations:')){addMessage({guide:'merlin',html:peerValidationRequestsCard(action.slice('node:validations:'.length))});return}
  if(action.startsWith('node:validate:')){const [, ,peerIdEnc,targetIdEnc]=action.split(':');addMessage({guide:'merlin',html:peerValidationEvidenceCard(decodeURIComponent(peerIdEnc),decodeURIComponent(targetIdEnc))});return}
  if(action.startsWith('node:validation-save:')){const parts=action.split(':'),peerId=decodeURIComponent(parts[2]),targetId=decodeURIComponent(parts[3]);await savePeerValidation(peerId,targetId,root);addMessage({guide:'merlin',html:'<p class="success">Signed validation evidence returned to peer.</p>'});return}

  if(action.startsWith('model:activate:')){const id=decodeURIComponent(action.slice('model:activate:'.length));saveModelOptionsFromRoot(root,id);await activateBrowserModel(id,{root});addMessage({guide:'weaveling',html:downloadsCard()});return}
  if(action.startsWith('model:test:')){const id=decodeURIComponent(action.slice('model:test:'.length));saveModelOptionsFromRoot(root,id);await activateBrowserModel(id,{root,test:true});return}
  if(action==='model:add'){const id=addCustomBrowserModel(root);addMessage({guide:'weaveling',html:`<p class="success">Model added to the local registry.</p>${downloadsCard()}`});return}
  if(action==='model:warm-save'){const enabled=saveModelWarmPreference(root);addMessage({guide:'weaveling',html:`<p class="success">Startup model warming ${enabled?'enabled':'disabled'}.</p>${downloadsCard()}`});return}
  if(action==='model:clear-cache'){if(await clearBrowserModelCache())addMessage({guide:'weaveling',html:downloadsCard()});return}
  if(action==='model:storage'){const e=await storageEstimate(),target=root.querySelector('[data-model-storage]');if(target)target.textContent=e.quota?`${Math.round(e.usage/1024/1024)} MB used of ${Math.round(e.quota/1024/1024)} MB browser storage`:'Storage estimate unavailable.';return}
  if(action.startsWith('download:tiny-router')){await activateBrowserModel('smollm2-360m',{root});return}
  if(action.startsWith('download:test:tiny-router')){await activateBrowserModel('smollm2-360m',{root,test:true});return}
  if(action==='settings:save'){saveSettings(root);addMessage({guide:'weaveling',html:`<p class="success">Settings saved.</p>${journeyCard()}`});return}
  if(action==='settings:testlocal'){saveSettings(root);await testLocalApi(root);return}
  if(action==='backup:export'){exportBackup();addMessage({guide:'weaveling',html:'<p class="success">Backup exported.</p>'});return}
  if(action==='backup:import-card'){addMessage({guide:'weaveling',html:backupCard()});return}
  if(action==='backup:restore'){restoreBackup(root);addMessage({guide:'weaveling',html:'<p class="success">Backup restored. Reloading local view…</p>'});setTimeout(()=>location.reload(),100);return}
  if(action==='records:clear'){if(!confirm('Clear Civweave Chat local state on this device?'))return;Object.values(KEYS).forEach(k=>localStorage.removeItem(k));for(const k of [MODEL_REGISTRY_KEY,CONNECT_STATE_KEY,CONNECT_INBOX_KEY,PAYMENT_SESSION_KEY])try{localStorage.removeItem(k)}catch{};sessionStorage.removeItem(KEYS.sessions);location.reload();return}
}catch(err){addMessage({guide:'weaveling',html:`<p class="error">${escapeHtml(err.message||String(err))}</p>`})}})}
