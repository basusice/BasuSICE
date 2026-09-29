const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {URL}=require('url');

const PORT=Number(process.env.PORT||8080);
const DB=path.join(__dirname,'data','db.json');
const ADMIN_KEY=process.env.BASUSICE_ADMIN_KEY;
const CORS_ORIGIN=process.env.BASUSICE_CORS_ORIGIN||'*';
const SESSION_HOURS=Number(process.env.BASUSICE_SESSION_HOURS||168);
const IS_PROD=process.env.NODE_ENV==='production';
if(IS_PROD&&!ADMIN_KEY) console.warn('WARNING: BASUSICE_ADMIN_KEY is not set. Admin endpoints are disabled.');

function load(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch{return {users:[],records:[],events:[],sessions:[]}}}
function save(db){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB,JSON.stringify(db,null,2),'utf8')}
function headers(){return {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':CORS_ORIGIN,'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Admin-Key','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'}}
function json(res,code,data){res.writeHead(code,headers());res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let b='';let n=0;req.on('data',c=>{n+=c.length;if(n>2_000_000){req.destroy();return reject(new Error('Payload too large'))}b+=c});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}})})}
function token(){return crypto.randomBytes(32).toString('hex')}
function passwordHash(password,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(password,salt,64).toString('hex');return {hash,salt}}
function verifyPassword(password,stored,salt){const a=Buffer.from(crypto.scryptSync(password,salt,64).toString('hex'),'hex');const b=Buffer.from(stored,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function auth(req,db){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const s=db.sessions.find(x=>x.token===h.slice(7));if(!s||Date.now()-Date.parse(s.createdAt)>SESSION_HOURS*3600000)return null;return db.users.find(u=>u.id===s.userId)||null}
function aggregate(records){let total=0,kg=0,gps=0,bySource={},byCat={};for(const r of records){total+=Number(r.total)||0;kg+=Number(r.weightKg)||0;if(r.gps)gps++;bySource[r.source]=(bySource[r.source]||0)+(Number(r.total)||0);for(const i of(r.items||[]))byCat[i.category]=(byCat[i.category]||0)+(Number(i.quantity)||0)}return {records:records.length,waste:total,kg:+kg.toFixed(2),gpsRate:records.length?Math.round(gps/records.length*100):0,bySource,byCat}}
function admin(req){return !!ADMIN_KEY&&req.headers['x-admin-key']===ADMIN_KEY}
function safeUser(u){return {id:u.id,name:u.name,username:u.username,role:u.role,createdAt:u.createdAt}}

const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS')return json(res,204,{});
 const u=new URL(req.url,`http://${req.headers.host||'localhost'}`),p=u.pathname,db=load();
 try{
  if(req.method==='GET'&&p==='/api/health')return json(res,200,{ok:true,app:'BasuSICE',version:'1.0.0',author:'Mg. Erquinio Alberto Taborda Martinez',time:new Date().toISOString()});
  if(req.method==='POST'&&p==='/api/register'){
   const x=await body(req);const username=String(x.username||'').trim().toLowerCase();const password=String(x.password||'');
   if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<8)return json(res,400,{error:'Usuario válido y contraseña de mínimo 8 caracteres.'});
   if(db.users.some(u=>u.username===username))return json(res,409,{error:'El usuario ya existe.'});
   const ph=passwordHash(password);const id=crypto.randomUUID();db.users.push({id,username,name:String(x.name||username).slice(0,80),passwordHash:ph.hash,passwordSalt:ph.salt,role:'participant',createdAt:new Date().toISOString()});save(db);return json(res,201,{ok:true,id});
  }
  if(req.method==='POST'&&p==='/api/login'){
   const x=await body(req),username=String(x.username||'').trim().toLowerCase(),u=db.users.find(v=>v.username===username);
   if(!u||!verifyPassword(String(x.password||''),u.passwordHash,u.passwordSalt))return json(res,401,{error:'Credenciales incorrectas.'});
   const t=token();db.sessions=db.sessions.filter(s=>Date.now()-Date.parse(s.createdAt)<SESSION_HOURS*3600000);db.sessions.push({token:t,userId:u.id,createdAt:new Date().toISOString()});save(db);return json(res,200,{token:t,user:safeUser(u)});
  }
  const user=auth(req,db);
  if(req.method==='POST'&&p==='/api/sync'){
   if(!user)return json(res,401,{error:'Sesión requerida.'});const x=await body(req),arr=Array.isArray(x.records)?x.records:[],events=Array.isArray(x.events)?x.events:[],now=new Date().toISOString();let accepted=0;
   for(const r of arr){const id=r.id||crypto.randomUUID();if(!db.records.some(v=>v.clientId===id)){db.records.push({...r,clientId:id,userId:user.id,syncedAt:now});accepted++}}
   for(const e of events){const id=e.id||crypto.randomUUID();if(!db.events.some(v=>v.clientId===id))db.events.push({...e,clientId:id,userId:user.id,syncedAt:now})}
   save(db);return json(res,200,{ok:true,recordsAccepted:accepted,totalRecords:db.records.length});
  }
  if(req.method==='GET'&&p==='/api/me'){if(!user)return json(res,401,{error:'Sesión requerida.'});return json(res,200,safeUser(user))}
  if(req.method==='GET'&&p==='/api/stats'){if(!user)return json(res,401,{error:'Sesión requerida.'});return json(res,200,aggregate(db.records))}
  if(req.method==='GET'&&p==='/api/ranking'){
   const scores={};for(const r of db.records)scores[r.userId]=(scores[r.userId]||0)+(Number(r.total)||0)*2;
   return json(res,200,Object.entries(scores).map(([id,points])=>{const u=db.users.find(x=>x.id===id);return {name:u?.name||'Participante',points}}).sort((a,b)=>b.points-a.points).slice(0,20));
  }
  if(req.method==='GET'&&p==='/api/admin/summary'){
   if(!admin(req))return json(res,403,{error:'Acceso administrativo no autorizado.'});return json(res,200,{app:'BasuSICE',version:'1.0.0',author:'Mg. Erquinio Alberto Taborda Martinez',users:db.users.map(safeUser),stats:aggregate(db.records),events:db.events.length,records:db.records.slice(-100).reverse()});
  }
  if(req.method==='GET'&&p==='/api/admin/export'){
   if(!admin(req))return json(res,403,{error:'Acceso administrativo no autorizado.'});return json(res,200,{app:'BasuSICE',version:'1.0.0',author:'Mg. Erquinio Alberto Taborda Martinez',generatedAt:new Date().toISOString(),stats:aggregate(db.records),records:db.records,events:db.events});
  }
  return json(res,404,{error:'Ruta no encontrada.'});
 }catch(e){console.error(e);return json(res,500,{error:'Error interno del servidor.'})}
});
server.listen(PORT,()=>console.log(`BasuSICE API escuchando en puerto ${PORT}`));
