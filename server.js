import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRIPE_API_KEY, securityHeaders, json, text } from './server-common.js';
import { handleConnect } from './server-connect.js';
import { handlePayments } from './server-payments.js';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PORT=Math.max(1,Math.min(65535,Number(process.env.PORT)||8787));
const STATIC_FILES=new Set(['index.html','app.css','mesh.js','commerce-mesh.js','core.js','weave.js','validation.js','payments.js','realms.js','hardening.js','peers.js','connect-creator.js','connect-agreement.js','connect-settlement.js','ai.js','models-core.js','models-ui.js','model-worker.js','actions.js','boot.js','sw.js']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};

async function handleStatic(req,res,url){if(req.method!=='GET'&&req.method!=='HEAD')return text(res,405,'Method not allowed.',req);const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(!STATIC_FILES.has(name)||name.includes('/')||name.includes('\\'))return text(res,404,'Not found.',req);try{const body=await readFile(resolve(ROOT,name));const headers={'Content-Type':MIME[extname(name)]||'application/octet-stream','Cache-Control':name==='sw.js'||name==='index.html'?'no-cache':'public, max-age=3600',...securityHeaders(req)};res.writeHead(200,headers);if(req.method==='HEAD')res.end();else res.end(body)}catch{text(res,404,'Not found.',req)}}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/payments/'))await handlePayments(req,res,url);else if(url.pathname.startsWith('/api/connect/'))await handleConnect(req,res,url);else await handleStatic(req,res,url)}catch(error){json(res,Number(error?.status)||500,{error:Number(error?.status)<500?error.message:'Request failed.'},req)}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Civweave Chat listening on ${PORT}${STRIPE_API_KEY?' · Stripe + Connect enabled':' · Stripe disabled'}`));