async function handleSystemAction(action,root){
  if(action.startsWith('download:tiny-router')){await ensureTiny(root);return true}
  if(action.startsWith('download:test:tiny-router')){const out=await tinyGenerate('Reply with exactly: local model ready',root);addMessage({guide:'weaveling',html:`<p>${escapeHtml(out||'No output')}</p>`});return true}
  if(action==='settings:save'){saveSettings(root);addMessage({guide:'weaveling',html:'<p class="success">Settings saved locally.</p>'});return true}
  if(action==='settings:testlocal'){saveSettings(root);await testLocalApi(root);return true}
  if(action==='export:json'){exportBackup();return true}
  if(action==='records:clear'){if(!confirm('Clear Civweave Chat local records, peers, creator card, weave and transcript?'))return true;Object.values(KEYS).forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(KEYS.sessions);location.reload();return true}
  return false
}
