'use strict';

const MODEL_REGISTRY_KEY='civweave.chat.browser-models.v1';
const MODEL_CACHE_KEY='civweave-transformers-cache-v1';
const BROWSER_MODELS=[
  {id:'smollm2-135m',name:'SmolLM2 135M Instruct',modelId:'onnx-community/SmolLM2-135M-Instruct-ONNX',tier:'older / low-memory',description:'Smallest built-in recommendation. Best first try on older phones or browsers without WebGPU.',approx:'~120–180 MB quantized'},
  {id:'smollm2-360m',name:'SmolLM2 360M Instruct',modelId:'onnx-community/SmolLM2-360M-Instruct-ONNX',tier:'balanced',description:'Balanced local routing and short chat model. This is the original Civweave tiny-model family.',approx:'~270 MB quantized'},
  {id:'qwen3-06b',name:'Qwen3 0.6B',modelId:'onnx-community/Qwen3-0.6B-ONNX',tier:'capable device',description:'Larger browser model for devices with more RAM and working WebGPU. WASM fallback remains available.',approx:'larger browser package'}
];
let modelWorker=null,modelSeq=0,modelPending=new Map(),browserLoaded=null,browserLoading=null;

function modelRegistry(){const raw=read(MODEL_REGISTRY_KEY,{});return{activeId:raw.activeId||'',custom:Array.isArray(raw.custom)?raw.custom:[],states:raw.states||{},warmOnLaunch:Boolean(raw.warmOnLaunch)}}
function saveModelRegistry(next){write(MODEL_REGISTRY_KEY,next);return next}
function allBrowserModels(){return [...BROWSER_MODELS,...modelRegistry().custom].filter((m,i,a)=>m?.id&&a.findIndex(x=>x.id===m.id)===i)}
function browserModelById(id){return allBrowserModels().find(m=>m.id===id)||null}
function activeBrowserModel(){const r=modelRegistry();return browserModelById(r.activeId)||browserModelById('smollm2-135m')}
function modelHardware(){return{webgpu:Boolean(navigator.gpu),memoryGB:Number(navigator.deviceMemory)||null,threads:Number(navigator.hardwareConcurrency)||null}}
function recommendedBrowserModelId(){const h=modelHardware();if(!h.webgpu||(h.memoryGB&&h.memoryGB<=4))return'smollm2-135m';if(h.memoryGB&&h.memoryGB>=8)return'qwen3-06b';return'smollm2-360m'}
function modelProfileLabel(){const h=modelHardware(),recommended=browserModelById(recommendedBrowserModelId());return `${h.webgpu?'WebGPU':'WASM'} · ${h.memoryGB?`${h.memoryGB} GB reported RAM · `:''}${h.threads?`${h.threads} threads · `:''}recommended: ${recommended?.name||'custom'}`}
function ensureModelWorker(){
  if(modelWorker)return modelWorker;
  modelWorker=new Worker('./model-worker.js');
  modelWorker.addEventListener('message',event=>{const msg=event.data||{};if(msg.type==='progress'){for(const el of document.querySelectorAll('[data-model-progress]')){if(Number.isFinite(msg.progress))el.style.width=`${Math.max(0,Math.min(100,msg.progress))}%`}for(const el of document.querySelectorAll('[data-model-status]'))if(msg.file)el.textContent=`${msg.status||'loading'} · ${msg.file}`;return}if(msg.type==='fallback'){for(const el of document.querySelectorAll('[data-model-status]'))el.textContent='WebGPU load failed; retrying on WASM…';return}const pending=modelPending.get(msg.id);if(!pending)return;modelPending.delete(msg.id);msg.type==='error'?pending.reject(new Error(msg.error||'Model worker failed.')):pending.resolve(msg.result)});
  modelWorker.addEventListener('error',event=>{for(const pending of modelPending.values())pending.reject(new Error(event.message||'Model worker crashed.'));modelPending.clear();modelWorker=null;browserLoaded=null});
  return modelWorker;
}
function modelCall(cmd,payload={}){const worker=ensureModelWorker(),id=`m${++modelSeq}`;return new Promise((resolve,reject)=>{modelPending.set(id,{resolve,reject});worker.postMessage({id,cmd,payload})})}
function updateModelState(id,patch){const r=modelRegistry();r.states[id]={...(r.states[id]||{}),...patch};saveModelRegistry(r);return r.states[id]}
async function requestPersistentModelStorage(){try{return await navigator.storage?.persist?.()}catch{return false}}
async function storageEstimate(){try{const e=await navigator.storage?.estimate?.();return{usage:Number(e?.usage)||0,quota:Number(e?.quota)||0}}catch{return{usage:0,quota:0}}}
function modelLoadOptions(model){const state=modelRegistry().states[model.id]||{},device=state.device||'auto',dtype=state.dtype||'auto';return{device,dtype}}
async function activateBrowserModel(id,{root=null,test=false}={}){
  const model=browserModelById(id);if(!model)throw new Error('Browser model not found.');if(browserLoading)return browserLoading;
  const status=root?.querySelector?.('[data-model-status]');if(status)status.textContent=`Activating ${model.name}…`;
  browserLoading=(async()=>{await requestPersistentModelStorage();const opts=modelLoadOptions(model),loaded=await modelCall('load',{modelId:model.modelId,...opts,fallback:true});browserLoaded={...loaded,id};const r=modelRegistry();r.activeId=id;r.states[id]={...(r.states[id]||{}),cached:true,lastReadyAt:now(),actualDevice:loaded.device,actualDtype:loaded.dtype};saveModelRegistry(r);statePatch({modelSetupAt:now()});audit('model.browser.activated',{id,modelId:model.modelId,device:loaded.device,dtype:loaded.dtype});if(status)status.textContent=`Active now · ${loaded.device} · ${loaded.dtype}`;if(test){const out=await browserGenerate('Reply with exactly: local model ready',{maxNewTokens:12});addMessage({guide:'weaveling',text:out||'No model output.'})}return browserLoaded})().finally(()=>{browserLoading=null});return browserLoading
}
async function ensureActiveBrowserModel(){const model=activeBrowserModel(),r=modelRegistry(),state=r.states[model.id]||{};if(browserLoaded?.id===model.id)return browserLoaded;if(!state.cached&&!r.activeId)return null;try{return await activateBrowserModel(model.id)}catch{return null}}
async function browserGenerate(prompt,{maxNewTokens=null}={}){const loaded=browserLoaded||await ensureActiveBrowserModel();if(!loaded)return'';const s=settings();return clean(await modelCall('generate',{prompt,maxNewTokens:Number(maxNewTokens)||Number(s.browserMaxNewTokens)||128,temperature:0}),5000)}
async function clearBrowserModelCache(){if(!confirm('Clear all cached browser model weights for Civweave? You can download them again later.'))return false;try{await modelCall('unload');browserLoaded=null}catch{}try{await caches?.delete?.(MODEL_CACHE_KEY);await caches?.delete?.('civweave-model-runtime-v1')}catch{}const r=modelRegistry();r.states={};r.activeId='';saveModelRegistry(r);audit('model.browser.cache-cleared',{});return true}
function addCustomBrowserModel(root){const modelId=field(root,'customModelId');if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(modelId))throw new Error('Use a Hugging Face model ID such as onnx-community/Model-ONNX.');const r=modelRegistry(),id=`custom-${modelId.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,48)}`;r.custom=r.custom.filter(m=>m.id!==id);r.custom.push({id,name:field(root,'customModelName')||modelId.split('/').pop(),modelId,tier:'custom',description:'Custom Transformers.js-compatible text-generation model.',approx:'model-dependent'});r.states[id]={device:field(root,'customDevice')||'auto',dtype:field(root,'customDtype')||'auto'};saveModelRegistry(r);return id}