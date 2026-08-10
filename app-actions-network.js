async function handleNetworkAction(action,root){
  if(action==='nodes:locate'){await locateNodes(root);return true}
  if(action==='nodes:refresh'){await refreshPeers(root);return true}
  if(action==='nodes:add'){addMessage({guide:'rook',html:addPeerCard()});return true}
  if(action==='node:save'){const id=savePeer(root);addMessage({guide:'rook',html:await peerCard(id)});return true}
  if(action.startsWith('node:open:')){addMessage({guide:'rook',html:await peerCard(action.slice('node:open:'.length))});return true}
  if(action.startsWith('node:pair:')){const id=action.slice('node:pair:'.length),p=await pairPeer(id);addMessage({guide:'merlin',html:`<p class="success">Signed pair request sent to ${escapeHtml(p.name||p.id)}. Gossip stays locked until their acceptance receipt arrives.</p>${await peerCard(id)}`});return true}
  if(action.startsWith('node:sync:')){const id=action.slice('node:sync:'.length);await syncPeer(id);addMessage({guide:'merlin',html:await peerCard(id)});return true}
  if(action.startsWith('node:accept:')){const requestId=action.slice('node:accept:'.length),result=await respondPairRequest(requestId,true);addMessage({guide:'merlin',html:`<p class="success">Mutual pairing accepted and signed.</p>${await peerCard(result.peer.id)}`});return true}
  if(action.startsWith('node:reject:')){const requestId=action.slice('node:reject:'.length);await respondPairRequest(requestId,false);addMessage({guide:'merlin',html:'<p>Pair request rejected. No gossip permission was created.</p>'});return true}
  if(action.startsWith('node:unpair:')){const id=action.slice('node:unpair:'.length);await unpairPeer(id);addMessage({guide:'merlin',html:await peerCard(id)});return true}
  if(action.startsWith('node:gossip:')){const id=action.slice('node:gossip:'.length),packet=await gossipPeer(id);addMessage({guide:'merlin',html:`<p class="success">Peer gossip exchanged.</p><small>Shared: ${packet.creatorCard?'Creator card · ':''}${packet.validationSummary?'validation summary · ':''}${packet.knownPeers.length} known peers.</small>`});return true}
  if(action.startsWith('node:validations:')){const id=action.slice('node:validations:'.length);addMessage({guide:'merlin',html:peerValidationRequestsCard(id)});return true}
  if(action.startsWith('node:validate:')){const parts=action.split(':'),peerId=decodeURIComponent(parts[2]||''),targetId=decodeURIComponent(parts.slice(3).join(':')||'');addMessage({guide:'merlin',html:peerValidationEvidenceCard(peerId,targetId)});return true}
  if(action.startsWith('node:validation-save:')){const parts=action.split(':'),peerId=decodeURIComponent(parts[2]||''),targetId=decodeURIComponent(parts.slice(3).join(':')||''),result=await savePeerValidation(peerId,targetId,root);addMessage({guide:'merlin',html:`<p class="success">Signed validation sent to ${escapeHtml(peers().find(x=>x.id===peerId)?.name||peerId)}.</p><small>${escapeHtml(result.item.evidenceType)} · score ${result.item.score}/${result.item.threshold}</small>`});return true}
  return false
}
