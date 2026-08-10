import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PORT=Math.max(1,Math.min(65535,Number(process.env.PORT)||8787));
const STRIPE_API_VERSION='2026-06-24.dahlia';
const STRIPE_API_KEY=String(process.env.STRIPE_API_KEY||'').trim();
const STRIPE_WEBHOOK_SECRET=String(process.env.STRIPE_WEBHOOK_SECRET||'').trim();
const CONFIGURED_APP_ORIGIN=normalizeOrigin(process.env.APP_ORIGIN||'');
const MAX_BODY_BYTES=32*1024;
const MAX_CHECKOUT_CENTS=Math.max(50,Number(process.env.STRIPE_MAX_CHECKOUT_CENTS)||1_000_000);
const STATIC_FILES=new Set(['index.html','app.css','mesh.js','core.js','weave.js','validation.js','payments.js','realms.js','peers.js','ai.js','actions.js','boot.js','sw.js']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const rateBuckets=new Map();
let stripePromise=null;

function normalizeOrigin(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.origin:''}catch{return''}}
function requestOrigin(req){
  if(CONFIGURED_APP_ORIGIN)return CONFIGURED_APP_ORIGIN;
  const host=String(req.headers.host||'');
  const hostname=host.replace(/^\[/,'').replace(/\].*$/,'').split(':')[0];
  if(!['localhost','127.0.0.1','::1'].includes(hostname))return'';
  return `http://${host}`;
}
function securityHeaders(req,{api=false}={}){
  const headers={
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'DENY',
    'Cross-Origin-Opener-Policy':'same-origin',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self'; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'none'; media-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'self' blob:; manifest-src 'self' blob:"
  };
  if(api)headers['Cache-Control']='no-store, max-age=0';
  const proto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
  if(proto==='https')headers['Strict-Transport-Security']='max-age=31536000; includeSubDomains';
  return headers;
}
function json(res,status,body,req){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...securityHeaders(req,{api:true})});res.end(JSON.stringify(body))}
function text(res,status,body,req){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...securityHeaders(req)});res.end(body)}
function clean(value,max=200){return String(value??'').trim().slice(0,max)}
function safeReference(value){const v=clean(value,180);return /^[A-Za-z0-9._:-]+$/.test(v)?v:''}
function safeCurrency(value){const v=clean(value,3).toLowerCase();return /^[a-z]{3}$/.test(v)?v:''}
function amountToCents(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)return 0;const cents=Math.round((n+Number.EPSILON)*100);return cents>=50&&cents<=MAX_CHECKOUT_CENTS?cents:0}
function integrationIdentifier(){const letters='abcdefghijklmnopqrstuvwxyz';let suffix='';for(const b of randomBytes(8))suffix+=letters[b%letters.length];return `civweave_chat_${suffix}`}
function clientIp(req){return clean(String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0],120)}
function rateAllowed(req){const ip=clientIp(req)||'unknown',minute=Math.floor(Date.now()/60000),key=`${ip}:${minute}`,count=(rateBuckets.get(key)||0)+1;rateBuckets.set(key,count);if(rateBuckets.size>2000)for(const k of rateBuckets.keys())if(!k.endsWith(`:${minute}`))rateBuckets.delete(k);return count<=30}
function sameOriginRequest(req,appOrigin){const origin=normalizeOrigin(req.headers.origin||'');return !origin||origin===appOrigin}
async function readBody(req,{raw=false}={}){const chunks=[];let total=0;for await(const chunk of req){total+=chunk.length;if(total>MAX_BODY_BYTES)throw Object.assign(new Error('Request body too large.'),{status:413});chunks.push(chunk)}const body=Buffer.concat(chunks);if(raw)return body;if(!body.length)return{};try{return JSON.parse(body.toString('utf8'))}catch{throw Object.assign(new Error('Invalid JSON body.'),{status:400})}}
async function getStripe(){if(!STRIPE_API_KEY)throw Object.assign(new Error('Stripe is not configured.'),{status:503});if(!stripePromise)stripePromise=import('stripe').then(({default:Stripe})=>new Stripe(STRIPE_API_KEY,{apiVersion:STRIPE_API_VERSION,maxNetworkRetries:2,timeout:15000}));return stripePromise}
function returnUrl(req,kind,referenceId){const origin=requestOrigin(req);if(!origin)throw Object.assign(new Error('APP_ORIGIN is required outside localhost.'),{status:503});const u=new URL('/',origin);u.searchParams.set('payment',kind);u.searchParams.set('referenceId',referenceId);if(kind==='success')u.searchParams.set('session_id','{CHECKOUT_SESSION_ID}');return u.href.replace('%7BCHECKOUT_SESSION_ID%7D','{CHECKOUT_SESSION_ID}')}
function stripeReceipt(session,referenceId){const status=session.payment_status==='paid'?'paid':session.payment_status==='no_payment_required'?'paid':session.payment_status||'unpaid';return{schema:'civweave.payment-receipt.v1',provider:'stripe',referenceId,status,providerReference:session.id,amount:Number(session.amount_total||0)/100,currency:String(session.currency||'').toUpperCase(),paymentStatus:session.payment_status||null,createdAt:session.created?new Date(session.created*1000).toISOString():null}}

async function handleApi(req,res,url){
  if(url.pathname==='/api/payments/status'&&req.method==='GET')return json(res,200,{provider:'stripe',checkoutEnabled:Boolean(STRIPE_API_KEY),webhookConfigured:Boolean(STRIPE_WEBHOOK_SECRET),apiVersion:STRIPE_API_VERSION},req);
  if(url.pathname==='/api/payments/checkout'&&req.method==='POST'){
    if(!rateAllowed(req))return json(res,429,{error:'Too many checkout requests.'},req);
    const appOrigin=requestOrigin(req);if(!appOrigin)return json(res,503,{error:'APP_ORIGIN is required outside localhost.'},req);
    if(!sameOriginRequest(req,appOrigin))return json(res,403,{error:'Origin rejected.'},req);
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return json(res,415,{error:'Expected application/json.'},req);
    const body=await readBody(req),referenceId=safeReference(body.referenceId),currency=safeCurrency(body.currency),cents=amountToCents(body.amount),title=clean(body.title||'Civweave agreement',120);
    if(body.schema!=='civweave.payment-checkout-request.v1'||body.purpose!=='fellowfare.exchange'||!referenceId||!currency||!cents)return json(res,400,{error:'Invalid checkout request.'},req);
    const stripe=await getStripe(),metadata={civweave_reference_id:referenceId,civweave_purpose:'fellowfare.exchange'};
    const session=await stripe.checkout.sessions.create({mode:'payment',client_reference_id:referenceId,line_items:[{price_data:{currency,unit_amount:cents,product_data:{name:title||'Civweave agreement'}},quantity:1}],metadata,payment_intent_data:{metadata},success_url:returnUrl(req,'success',referenceId),cancel_url:returnUrl(req,'cancelled',referenceId),integration_identifier:integrationIdentifier()},{idempotencyKey:`civweave:${referenceId}:${cents}:${currency}`});
    if(!session?.url)return json(res,502,{error:'Stripe did not return a Checkout URL.'},req);
    return json(res,200,{provider:'stripe',checkoutUrl:session.url,sessionId:session.id,referenceId},req);
  }
  if(url.pathname==='/api/payments/receipt'&&req.method==='GET'){
    if(!rateAllowed(req))return json(res,429,{error:'Too many receipt checks.'},req);
    const referenceId=safeReference(url.searchParams.get('referenceId')),sessionId=clean(url.searchParams.get('sessionId'),200);
    if(!referenceId||!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return json(res,400,{error:'referenceId and Stripe sessionId are required.'},req);
    const stripe=await getStripe(),session=await stripe.checkout.sessions.retrieve(sessionId);
    if(session.client_reference_id!==referenceId||session.metadata?.civweave_reference_id!==referenceId)return json(res,409,{error:'Stripe session does not match this Civweave agreement.'},req);
    return json(res,200,{receipt:stripeReceipt(session,referenceId)},req);
  }
  if(url.pathname==='/api/payments/webhook'&&req.method==='POST'){
    if(!STRIPE_WEBHOOK_SECRET)return json(res,503,{error:'Stripe webhook secret is not configured.'},req);
    const signature=clean(req.headers['stripe-signature'],2000);if(!signature)return json(res,400,{error:'Missing Stripe signature.'},req);
    const raw=await readBody(req,{raw:true}),stripe=await getStripe();
    let event;try{event=stripe.webhooks.constructEvent(raw,signature,STRIPE_WEBHOOK_SECRET)}catch{return json(res,400,{error:'Invalid Stripe webhook signature.'},req)}
    return json(res,200,{received:true,eventId:event.id,type:event.type},req);
  }
  return json(res,404,{error:'Not found.'},req);
}

async function handleStatic(req,res,url){
  if(req.method!=='GET'&&req.method!=='HEAD')return text(res,405,'Method not allowed.',req);
  const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  if(!STATIC_FILES.has(name)||name.includes('/')||name.includes('\\'))return text(res,404,'Not found.',req);
  try{const body=await readFile(resolve(ROOT,name));const headers={'Content-Type':MIME[extname(name)]||'application/octet-stream','Cache-Control':name==='sw.js'||name==='index.html'?'no-cache':'public, max-age=3600',...securityHeaders(req)};res.writeHead(200,headers);if(req.method==='HEAD')res.end();else res.end(body)}catch{text(res,404,'Not found.',req)}
}

const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/payments/'))await handleApi(req,res,url);else await handleStatic(req,res,url)}catch(error){json(res,Number(error?.status)||500,{error:Number(error?.status)<500?error.message:'Request failed.'},req)}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Civweave Chat listening on ${PORT}${STRIPE_API_KEY?' · Stripe enabled':' · Stripe disabled'}`));
