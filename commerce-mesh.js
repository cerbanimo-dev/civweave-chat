'use strict';

const AGREEMENT_OFFER_KIND='fellowfare.agreement-offer.v1';
const AGREEMENT_ACCEPT_KIND='fellowfare.agreement-acceptance.v1';

function agreementCents(amount){return Math.max(0,Math.round((Number(amount)||0)*100))}
async function publishAgreementOffer(record,peer){
  if(!globalThis.CivweaveChatMesh)throw new Error('Signed mesh is unavailable.');
  const buyerNodeId=await globalThis.CivweaveChatMesh.deviceId(),creatorNodeId=peerMeshId(peer);
  if(!creatorNodeId||!peer?.paired)throw new Error('A mutually paired Creator is required.');
  const amountCents=agreementCents(record.amount),platformFeeBps=Math.max(0,Math.min(5000,Number(record.platformFeeBps)||0)),platformFeeCents=Math.round(amountCents*platformFeeBps/10000),creatorPayoutCents=amountCents-platformFeeCents,payload={schema:AGREEMENT_OFFER_KIND,referenceId:record.id,title:clean(record.title,160),terms:clean(record.terms,4000),amountCents,currency:clean(record.currency||settings().currency,3).toUpperCase(),platformFeeBps,platformFeeCents,creatorPayoutCents,buyerNodeId,creatorNodeId,createdAt:now()};
  const object=await globalThis.CivweaveChatMesh.createObject({kind:AGREEMENT_OFFER_KIND,purpose:'Mutually sign the exact FellowFare agreement before payment or Creator payout.',consent:'direct',audience:[creatorNodeId],payload,hopLimit:1,publish:true});
  if(peer.endpoint)await globalThis.CivweaveChatMesh.syncGateway(peer.endpoint,creatorNodeId);
  return object;
}
async function publishAgreementAcceptance(offer,{accepted,connectedAccountId=''}){
  if(!globalThis.CivweaveChatMesh)throw new Error('Signed mesh is unavailable.');
  const creatorNodeId=await globalThis.CivweaveChatMesh.deviceId(),buyerNodeId=offer?.origin?.nodeId;
  if(!buyerNodeId||offer?.kind!==AGREEMENT_OFFER_KIND||offer?.payload?.creatorNodeId!==creatorNodeId)throw new Error('This agreement offer is not addressed to this Creator.');
  return globalThis.CivweaveChatMesh.createObject({kind:AGREEMENT_ACCEPT_KIND,purpose:'Sign the Creator response to an exact FellowFare agreement.',consent:'direct',audience:[buyerNodeId],parentIds:[offer.id],payload:{schema:AGREEMENT_ACCEPT_KIND,referenceId:offer.payload.referenceId,offerId:offer.id,offerRevisionHash:offer.revisionHash,accepted:Boolean(accepted),buyerNodeId,creatorNodeId,connectedAccountId:clean(connectedAccountId,220),acceptedAt:now()},hopLimit:1,publish:true});
}
async function signedAgreementObjects(){if(!globalThis.CivweaveChatMesh)return[];return (await globalThis.CivweaveChatMesh.listObjects()).filter(o=>o.kind===AGREEMENT_OFFER_KIND||o.kind===AGREEMENT_ACCEPT_KIND)}
async function signedAgreementBundle(referenceId){
  if(!globalThis.CivweaveChatMesh)throw new Error('Signed mesh is unavailable.');
  const objects=await signedAgreementObjects(),offer=objects.find(o=>o.kind===AGREEMENT_OFFER_KIND&&o.payload?.referenceId===referenceId&&o.origin?.nodeId===o.payload?.buyerNodeId),acceptance=offer&&objects.find(o=>o.kind===AGREEMENT_ACCEPT_KIND&&o.payload?.referenceId===referenceId&&o.payload?.offerRevisionHash===offer.revisionHash&&o.parentIds?.includes(offer.id)&&o.payload?.accepted===true);
  if(!offer||!acceptance)throw new Error('Mutual signed agreement is not complete yet.');
  for(const object of [offer,acceptance]){const check=await globalThis.CivweaveChatMesh.validateObject(object);if(!check.ok)throw new Error(check.error||'Agreement signature rejected.');}
  return{schema:'fellowfare.signed-agreement-bundle.v1',offer,acceptance};
}
