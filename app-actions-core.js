async function handleCoreAction(action,root){
  if(action.startsWith('tool:')){await openTool(action.split(':')[1]);return true}
  if(action==='wish:draft'){const wish=field(root,'wish');if(!wish)throw new Error('Write a wish first.');buildWeave(wish,{outcome:field(root,'outcome'),constraints:field(root,'constraints'),posture:field(root,'posture'),level:field(root,'level')});addMessage({guide:'weaveling',html:wishCard()});return true}
  if(action==='wish:activate'){activateWeave();addMessage({guide:'weaveling',html:`<p class="success">Weave activated. Realm handoffs are staged as reviewable records, not silently executed.</p>${wishCard()}`});return true}
  if(action==='wish:pause'){const s=read(KEYS.working,{});if(s.plan){s.plan.state='review';s.plan.updatedAt=now();write(KEYS.working,s)}addMessage({guide:'weaveling',html:wishCard()});return true}
  if(action==='wish:passport'){addMessage({guide:'merlin',html:passportCard()});return true}
  if(action==='passport:seal'){const check=root.querySelector('[data-field="confirmPassport"]');if(!check?.checked)throw new Error('Confirm the local Passport seal first.');const state=read(KEYS.working,{});if(!state.plan)throw new Error('No weave to seal.');state.plan.passport={pledge:field(root,'pledge'),sealedAt:now()};state.plan.updatedAt=now();write(KEYS.working,state);addMessage({guide:'merlin',html:`<p class="success">Passport intention sealed locally.</p>${wishCard()}`});return true}
  if(action==='wish:clear'){localStorage.removeItem(KEYS.working);addMessage({guide:'weaveling',html:wishCard()});return true}
  if(action.startsWith('record:new:')){addMessage({guide:RECORD_CONFIG[action.split(':')[2]].guide,html:recordEditor(action.split(':')[2])});return true}
  if(action.startsWith('record:save:')){const type=action.split(':')[2],item=saveRecord(type,root);addMessage({guide:RECORD_CONFIG[type].guide,html:`<p class="success">Saved “${escapeHtml(item.title||'Untitled')}”.</p>${recordTool(type)}`});return true}
  if(action.startsWith('validation:add:')){const id=action.slice('validation:add:'.length);addMessage({guide:'merlin',html:validationEvidenceCard(id)});return true}
  if(action.startsWith('validation:save:')){const id=action.slice('validation:save:'.length),result=await saveValidation(id,root);addMessage({guide:'merlin',html:`<p class="success">Weighted validation evidence recorded.</p><div class="row">${validationBadge(id)}</div><small>Net confidence: ${result.rollup.net.toFixed(2)} · evidence ${result.rollup.count}</small>`});return true}
  return false
}
