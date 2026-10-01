const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {URL}=require('url');
const {Pool}=require('pg');

const PORT=Number(process.env.PORT||8080);
const DB_FILE=path.join(__dirname,'data','db.json');
const DATABASE_URL=process.env.DATABASE_URL||'';
const CORS_ORIGIN=process.env.BASUSICE_CORS_ORIGIN||'https://basusice.github.io';
const SESSION_HOURS=Number(process.env.BASUSICE_SESSION_HOURS||168);
const ADMIN_KEY=process.env.BASUSICE_ADMIN_KEY||'';
const APP_VERSION='1.2.0';
const AUTHOR='Mg. Erquinio Alberto Taborda Martinez';
const usePg=Boolean(DATABASE_URL);
const pool=usePg?new Pool({connectionString:DATABASE_URL,ssl:process.env.PGSSL==='disable'?false:{rejectUnauthorized:false},max:Number(process.env.PGPOOL_MAX||5)}):null;

function jsonHeaders(){return {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':CORS_ORIGIN,'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Admin-Key','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'}}
function json(res,code,data){res.writeHead(code,jsonHeaders());res.end(JSON.stringify(data))}
function readBody(req){return new Promise((resolve,reject)=>{let b='';let n=0;req.on('data',c=>{n+=c.length;if(n>5_000_000){req.destroy();reject(new Error('Payload too large'));return}b+=c});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}})})}
function token(){return crypto.randomBytes(32).toString('hex')}
function passwordHash(password,salt=crypto.randomBytes(16).toString('hex')){return {hash:crypto.scryptSync(password,salt,64).toString('hex'),salt}}
function verifyPassword(password,stored,salt){const a=Buffer.from(crypto.scryptSync(password,salt,64).toString('hex'),'hex');const b=Buffer.from(stored,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function safeUser(u){return {id:u.id,name:u.name,username:u.username,role:u.role,createdAt:u.createdAt}}
function aggregate(records){let total=0,kg=0,gps=0,bySource={},byCat={};for(const r of records){total+=Number(r.total)||0;kg+=Number(r.weightKg)||0;if(r.gps)gps++;bySource[r.source]=(bySource[r.source]||0)+(Number(r.total)||0);for(const i of(r.items||[]))byCat[i.category]=(byCat[i.category]||0)+(Number(i.quantity)||0)}return {records:records.length,waste:total,kg:+kg.toFixed(2),gpsRate:records.length?Math.round(gps/records.length*100):0,bySource,byCat}}

let fileDb={users:[],records:[],events:[],sessions:[]};
function loadFile(){try{fileDb=JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch{fileDb={users:[],records:[],events:[],sessions:[]}}return fileDb}
function saveFile(){fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});fs.writeFileSync(DB_FILE,JSON.stringify(fileDb,null,2),'utf8')}
async function initPg(){await pool.query(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'participant', created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS records(id BIGSERIAL PRIMARY KEY, client_id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, payload JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS events(id BIGSERIAL PRIMARY KEY, client_id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, payload JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);CREATE INDEX IF NOT EXISTS idx_records_synced ON records(synced_at);`)}
async function findUserByUsername(username){if(usePg){const r=await pool.query('SELECT id,username,name,role,created_at AS "createdAt",password_hash AS "passwordHash",password_salt AS "passwordSalt" FROM users WHERE username=$1',[username]);return r.rows[0]||null}return loadFile().users.find(u=>u.username===username)||null}
async function findUserByToken(t){if(!t)return null;if(usePg){const r=await pool.query('SELECT u.id,u.username,u.name,u.role,u.created_at AS "createdAt" FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.created_at > now()-($2::text || \' hours\')::interval',[t,String(SESSION_HOURS)]);return r.rows[0]||null}const db=loadFile(),s=db.sessions.find(x=>x.token===t);if(!s||Date.now()-Date.parse(s.createdAt)>SESSION_HOURS*3600000)return null;return db.users.find(u=>u.id===s.userId)||null}
async function createUser({id,username,name,hash,salt}){if(usePg){await pool.query('INSERT INTO users(id,username,name,password_hash,password_salt) VALUES($1,$2,$3,$4,$5)',[id,username,name,hash,salt]);return}const db=loadFile();db.users.push({id,username,name,passwordHash:hash,passwordSalt:salt,role:'participant',createdAt:new Date().toISOString()});saveFile()}
async function createSession(t,userId){if(usePg)await pool.query('INSERT INTO sessions(token,user_id) VALUES($1,$2)',[t,userId]);else{const db=loadFile();db.sessions=db.sessions.filter(s=>Date.now()-Date.parse(s.createdAt)<SESSION_HOURS*3600000);db.sessions.push({token:t,userId,createdAt:new Date().toISOString()});saveFile()}}
async function syncRecords(user,records,events){let accepted=0;if(usePg){const client=await pool.connect();try{await client.query('BEGIN');for(const r of records){const id=String(r.id||crypto.randomUUID());const q=await client.query('INSERT INTO records(client_id,user_id,payload) VALUES($1,$2,$3) ON CONFLICT(client_id) DO NOTHING',[id,user.id,JSON.stringify({...r,id,_userId:user.id})]);accepted+=q.rowCount}for(const e of events){const id=String(e.id||crypto.randomUUID());await client.query('INSERT INTO events(client_id,user_id,payload) VALUES($1,$2,$3) ON CONFLICT(client_id) DO NOTHING',[id,user.id,JSON.stringify({...e,id})])}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}return accepted}const db=loadFile(),now=new Date().toISOString();for(const r of records){const id=r.id||crypto.randomUUID();if(!db.records.some(v=>v.clientId===id)){db.records.push({...r,clientId:id,userId:user.id,_userId:user.id,syncedAt:now});accepted++}}for(const e of events){const id=e.id||crypto.randomUUID();if(!db.events.some(v=>v.clientId===id))db.events.push({...e,clientId:id,userId:user.id,syncedAt:now})}saveFile();return accepted}
async function allRecords(){if(usePg){const r=await pool.query('SELECT payload FROM records ORDER BY id ASC');return r.rows.map(x=>x.payload)}return loadFile().records}
async function allEvents(){if(usePg){const r=await pool.query('SELECT payload FROM events ORDER BY id ASC');return r.rows.map(x=>x.payload)}return loadFile().events}
async function allUsers(){if(usePg){const r=await pool.query('SELECT id,username,name,role,created_at AS "createdAt" FROM users ORDER BY created_at DESC');return r.rows}return loadFile().users.map(safeUser)}

async function admin(req){return Boolean(ADMIN_KEY&&req.headers['x-admin-key']===ADMIN_KEY)}

const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS')return json(res,204,{});
 const u=new URL(req.url,`http://${req.headers.host||'localhost'}`),p=u.pathname;
 try{
  if(req.method==='GET'&&p==='/api/health')return json(res,200,{ok:true,app:'BasuSICE',version:APP_VERSION,author:AUTHOR,database:usePg?'postgresql':'local-json',time:new Date().toISOString()});
  if(req.method==='POST'&&p==='/api/register'){
   const x=await readBody(req),username=String(x.username||'').trim().toLowerCase(),password=String(x.password||''),name=String(x.name||username).trim().slice(0,80);
   if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<8||name.length<2)return json(res,400,{error:'Nombre válido, usuario de 3-40 caracteres y contraseña de mínimo 8 caracteres.'});
   if(await findUserByUsername(username))return json(res,409,{error:'El usuario ya existe.'});
   const ph=passwordHash(password),id=crypto.randomUUID();await createUser({id,username,name,hash:ph.hash,salt:ph.salt});return json(res,201,{ok:true,id});
  }
  if(req.method==='POST'&&p==='/api/login'){
   const x=await readBody(req),username=String(x.username||'').trim().toLowerCase(),u=await findUserByUsername(username);
   if(!u||!verifyPassword(String(x.password||''),u.passwordHash,u.passwordSalt))return json(res,401,{error:'Credenciales incorrectas.'});
   const t=token();await createSession(t,u.id);return json(res,200,{token:t,user:safeUser(u)});
  }
  const h=req.headers.authorization||'', user=await findUserByToken(h.startsWith('Bearer ')?h.slice(7):'');
  if(req.method==='POST'&&p==='/api/sync'){
   if(!user)return json(res,401,{error:'Sesión requerida.'});const x=await readBody(req),arr=Array.isArray(x.records)?x.records:[],events=Array.isArray(x.events)?x.events:[],accepted=await syncRecords(user,arr,events);return json(res,200,{ok:true,recordsAccepted:accepted,totalRecords:(await allRecords()).length});
  }
  if(req.method==='GET'&&p==='/api/me'){if(!user)return json(res,401,{error:'Sesión requerida.'});return json(res,200,safeUser(user))}
  if(req.method==='GET'&&p==='/api/stats'){if(!user)return json(res,401,{error:'Sesión requerida.'});return json(res,200,aggregate(await allRecords()))}
  if(req.method==='GET'&&p==='/api/ranking'){const records=await allRecords(),scores={};for(const r of records){const uid=r.userId||r._userId||'unknown';scores[uid]=(scores[uid]||0)+(Number(r.total)||0)*2}const users=await allUsers();return json(res,200,Object.entries(scores).map(([id,points])=>{const u=users.find(x=>x.id===id);return {name:u?.name||'Participante',points}}).sort((a,b)=>b.points-a.points).slice(0,20))}
  if(req.method==='GET'&&p==='/api/admin/summary'){
   if(!(await admin(req)))return json(res,403,{error:'Acceso administrativo no autorizado.'});const records=await allRecords(),events=await allEvents();return json(res,200,{app:'BasuSICE',version:APP_VERSION,author:AUTHOR,database:usePg?'postgresql':'local-json',users:await allUsers(),stats:aggregate(records),events:events.length,records:records.slice(-100).reverse()});
  }
  if(req.method==='GET'&&p==='/api/admin/export'){
   if(!(await admin(req)))return json(res,403,{error:'Acceso administrativo no autorizado.'});return json(res,200,{app:'BasuSICE',version:APP_VERSION,author:AUTHOR,generatedAt:new Date().toISOString(),stats:aggregate(await allRecords()),records:await allRecords(),events:await allEvents()});
  }
  return json(res,404,{error:'Ruta no encontrada.'});
 }catch(e){console.error(e);return json(res,500,{error:'Error interno del servidor.'})}
});

async function start(){if(usePg)await initPg();else loadFile();server.listen(PORT,'0.0.0.0',()=>console.log(`BasuSICE API ${APP_VERSION} escuchando en ${PORT} · DB ${usePg?'PostgreSQL':'JSON local'}`))}
start().catch(e=>{console.error('No se pudo iniciar BasuSICE:',e);process.exit(1)});
