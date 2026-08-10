const VALIDATION_PROVENANCE={human:.9,peer:.85,model:.7,deterministic:.95};
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
const validations=()=>Array.isArray(read(KEYS.validations,[]))?read(KEYS.validations,[]):[];

function validationWeight(v){
  const score=Math.max(0,Math.min(100,Number(v.score)||0));
  const threshold=Math.max(0,Math.min(100,Number(v.threshold)||50));
  const margin=Math.min(1,Math.abs(score-threshold)/50);
  const reliability=clamp01(v.reliability??VALIDATION_PROVENANCE[v.provenance]??.7);
  const confidence=clamp01(v.confidence??.7);
  const strength=reliability*confidence*(.35+.65*margin);
  return{direction:score>=threshold?1:-1,strength,score,threshold,reliability,confidence,margin};
}

function validationRollup(recordId){
  const rows=validations().filter(v=>v.targetId===recordId&&!v.remoteTarget),weighted=rows.map(v=>({...v,...validationWeight(v)}));
  const evidenceTypes=new Set(rows.map(v=>v.evidenceType).filter(Boolean));
  const provenances=new Set(rows.map(v=>v.provenance).filter(Boolean));
  const devices=new Set(rows.map(v=>v.validatorDeviceId).filter(Boolean));
  const diversityBonus=Math.min(.3,Math.max(0,evidenceTypes.size-1)*.1+Math.max(0,provenances.size-1)*.1+Math.max(0,devices.size-1)*.1);
  const multiplier=1+diversityBonus;
  const pass=weighted.filter(v=>v.direction>0).reduce((n,v)=>n+v.strength,0)*multiplier;
  const fail=weighted.filter(v=>v.direction<0).reduce((n,v)=>n+v.strength,0)*multiplier;
  const net=pass-fail,required=Math.max(.1,Number(settings().validationConfidenceThreshold)||.85);
  const status=pass>=required&&net>0?'pass':fail>=required&&net<0?'fail':'gathering';
  const crossDevice=devices.size>=2;
  return{schema:'civweave.chat.validation-rollup.v2',recordId,count:rows.length,pass:Number(pass.toFixed(3)),fail:Number(fail.toFixed(3)),net:Number(net.toFixed(3)),required,status,diversity:{evidenceTypes:evidenceTypes.size,provenances:provenances.size,devices:devices.size,bonus:Number(diversityBonus.toFixed(2))},crossDevice,payoutEligible:status==='pass'&&crossDevice,updatedAt:now()};
}

function validationBadge(recordId){const r=validationRollup(recordId),klass=r.status==='pass'?'ok':r.status==='fail'?'warn':'';return `<span class="chip ${klass}">${r.status} · ${Math.max(r.pass,r.fail).toFixed(2)}/${r.required.toFixed(2)}</span>${r.payoutEligible?'<span class="chip ok">cross-device payout ready</span>':r.status==='pass'?'<span class="chip warn">needs cross-device payout proof</span>':''}`;}
