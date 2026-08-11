'use strict';

const RUNTIME='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';
let runtime=null, pipe=null, loaded=null;

function post(type,data={}){self.postMessage({type,...data})}
async function getRuntime(){
  if(runtime)return runtime;
  runtime=await import(RUNTIME);
  const {env}=runtime;
  if(env){
    env.allowRemoteModels=true;
    env.allowLocalModels=false;
    env.useBrowserCache=true;
    env.useWasmCache=true;
    env.cacheKey='civweave-transformers-cache-v1';
  }
  return runtime;
}
async function dispose(){
  try{await pipe?.dispose?.()}catch{}
  pipe=null;loaded=null;
}
async function loadModel({modelId,device='auto',dtype='auto',fallback=true}={}){
  if(!modelId)throw new Error('Model ID is required.');
  const {pipeline}=await getRuntime();
  const webgpu=Boolean(self.navigator?.gpu),chosenDevice=device==='auto'?(webgpu?'webgpu':'wasm'):device;
  const chosenDtype=dtype==='auto'?(chosenDevice==='webgpu'?'q4f16':'q4'):dtype;
  if(loaded?.modelId===modelId&&loaded?.device===chosenDevice&&loaded?.dtype===chosenDtype&&pipe)return loaded;
  await dispose();
  const tryLoad=async(dev,dt)=>{
    const options={dtype:dt,progress_callback:p=>post('progress',{progress:Number(p?.progress)||0,status:p?.status||'loading',file:p?.file||''})};
    if(dev==='webgpu')options.device='webgpu';
    pipe=await pipeline('text-generation',modelId,options);
    loaded={modelId,device:dev,dtype:dt,loadedAt:new Date().toISOString()};
    return loaded;
  };
  try{return await tryLoad(chosenDevice,chosenDtype)}catch(error){
    if(chosenDevice==='webgpu'&&fallback){
      if(dtype==='auto'&&chosenDtype==='q4f16'){
        post('fallback',{from:'webgpu/q4f16',to:'webgpu/q4',reason:error?.message||String(error)});
        await dispose();
        try{return await tryLoad('webgpu','q4')}catch(secondError){error=secondError}
      }
      post('fallback',{from:'webgpu',to:'wasm',reason:error?.message||String(error)});
      await dispose();
      return tryLoad('wasm',dtype==='auto'?'q4':dtype==='q4f16'?'q4':dtype);
    }
    throw error;
  }
}
function generatedText(out){
  const value=out?.[0]?.generated_text??out?.generated_text??'';
  if(Array.isArray(value)){const assistant=[...value].reverse().find(x=>x?.role==='assistant')||value[value.length-1];return String(assistant?.content||assistant?.text||'').trim()}
  return String(value||'').trim();
}
async function generate({prompt,maxNewTokens=128,temperature=0,topP=.9}={}){
  if(!pipe)throw new Error('No browser model is loaded.');
  const args={max_new_tokens:Math.max(1,Math.min(1024,Number(maxNewTokens)||128)),do_sample:Number(temperature)>0};
  if(args.do_sample){args.temperature=Math.max(.05,Math.min(2,Number(temperature)||.7));args.top_p=Math.max(.1,Math.min(1,Number(topP)||.9))}
  const text=String(prompt||'');
  try{const out=await pipe([{role:'user',content:text}],args),reply=generatedText(out);if(reply)return reply}catch{}
  const out=await pipe(text,{...args,return_full_text:false});
  return generatedText(out);
}
self.addEventListener('message',async event=>{
  const {id,cmd,payload}=event.data||{};
  try{
    if(cmd==='probe')return post('result',{id,result:{webgpu:Boolean(self.navigator?.gpu),hardwareConcurrency:Number(self.navigator?.hardwareConcurrency)||null}});
    if(cmd==='load')return post('result',{id,result:await loadModel(payload)});
    if(cmd==='generate')return post('result',{id,result:await generate(payload)});
    if(cmd==='unload'){await dispose();return post('result',{id,result:true})}
    throw new Error('Unknown model worker command.');
  }catch(error){post('error',{id,error:error?.message||String(error)})}
});
