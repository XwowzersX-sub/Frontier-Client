import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rkenxijtbmiqcgwhvtgr.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MPWfzhBBPHCTjz-mH3ff4Q_8G1XSfnm';
const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'https://YOUR-RENDER-SERVICE.onrender.com').replace(/\/$/, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
<header><div class="brand"><span class="mark">✦</span><div><b>PIXEL FRONTIER</b><small>REAL-TIME STRATEGY</small></div></div><div class="status"><i id="dot"></i><span id="connection">OFFLINE</span></div></header>
<main><section class="side"><div class="eyebrow">COMMANDER ACCESS</div><h1>Build your<br><em>frontier.</em></h1><p class="muted">Sign in to save your commander profile and join the battlefield.</p>
<form id="auth"><input id="email" type="email" placeholder="Email address" required/><input id="password" type="password" placeholder="Password (6+ characters)" minlength="6" required/><button id="authButton">SIGN IN</button></form><button class="subtle" id="signup">CREATE ACCOUNT</button><p id="message" class="message">You can explore the map without signing in.</p>
<div class="profile" id="profile" hidden><span>LOGGED IN AS</span><b id="who"></b><button class="subtle" id="logout">SIGN OUT</button></div>
<div class="server"><span>GAME SERVER</span><b id="serverLabel">Waiting for server URL</b><button id="connect">WAKE / CONNECT</button></div></section>
<section class="arena"><div class="arenaTop"><span>SECTOR 07 · THE OUTER REACH</span><span id="players">0 COMMANDERS ONLINE</span></div><canvas id="map" width="900" height="600" aria-label="Pixel strategy map"></canvas><div class="legend"><span><i class="blue"></i> YOUR TERRITORY</span><span><i class="red"></i> RIVAL</span><span><i class="gold"></i> NEUTRAL</span><span id="selection">SELECT A REGION</span></div><div class="help">CLICK A TILE TO SELECT IT · SERVER STATUS APPEARS ABOVE</div></section></main>
<footer><span>PIXEL FRONTIER · EARLY BUILD</span><span>Original game prototype</span></footer>`;

const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const message = $('message');
const dot = $('dot');
const connection = $('connection');
const serverLabel = $('serverLabel');
let socket: WebSocket | null = null;
let reconnectTimer = 0;
let currentUser: string | null = null;

function setStatus(text:string, good=false) { connection.textContent=text; dot.className=good?'good':''; }
async function refreshUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user?.email ?? null;
  $('profile').hidden = !currentUser;
  $('who').textContent = currentUser || '';
}
$('auth').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('email').value.trim(), password = $('password').value;
  $('authButton').textContent = 'PLEASE WAIT…';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  $('authButton').textContent = 'SIGN IN';
  message.textContent = error ? error.message : 'Welcome back, commander.';
  if (!error) await refreshUser();
});
$('signup').addEventListener('click', async () => {
  const email = $('email').value.trim(), password = $('password').value;
  if (!email || password.length < 6) { message.textContent='Enter an email and a password with at least 6 characters.'; return; }
  const { error } = await supabase.auth.signUp({ email, password });
  message.textContent = error ? error.message : 'Account created. Check your email if confirmation is enabled, then sign in.';
});
$('logout').addEventListener('click', async () => { await supabase.auth.signOut(); await refreshUser(); });
supabase.auth.onAuthStateChange(() => { void refreshUser(); });
void refreshUser();

async function wakeAndConnect() {
  if (!SERVER_URL.includes('onrender.com') && !SERVER_URL.startsWith('http')) { message.textContent='Set VITE_SERVER_URL in your deployment settings.'; return; }
  if (SERVER_URL.includes('YOUR-RENDER-SERVICE')) { message.textContent='Add your Render server URL as VITE_SERVER_URL, then redeploy.'; return; }
  clearTimeout(reconnectTimer);
  setStatus('WAKING SERVER…');
  serverLabel.textContent = SERVER_URL;
  message.textContent = 'Contacting the game server. A sleeping free instance can take a little while to start.';
  for (let attempt=0; attempt<12; attempt++) {
    try {
      const response = await fetch(SERVER_URL + '/health', { cache:'no-store', signal:AbortSignal.timeout(10000) });
      if (response.ok) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const wsUrl = SERVER_URL.replace(/^http/, 'ws') + '/ws' + (token ? '?token=' + encodeURIComponent(token) : '');
        socket = new WebSocket(wsUrl);
        socket.onopen = () => { setStatus('CONNECTED',true); message.textContent='Connected. Your frontier is ready.'; };
        socket.onmessage = ev => { try { const data=JSON.parse(ev.data); if(data.type==='welcome') $('players').textContent=data.players+' COMMANDERS ONLINE'; } catch {} };
        socket.onclose = () => { setStatus('DISCONNECTED'); reconnectTimer=window.setTimeout(()=>void wakeAndConnect(),5000); };
        socket.onerror = () => setStatus('CONNECTION ERROR');
        return;
      }
    } catch {}
    await new Promise(resolve=>setTimeout(resolve, Math.min(1500 * (attempt+1), 8000)));
  }
  setStatus('SERVER UNAVAILABLE');
  message.textContent='Could not wake the server. Check the Render service and try again.';
}
$('connect').addEventListener('click', () => void wakeAndConnect());

const canvas = $('map'), ctx = canvas.getContext('2d')!;
const cols=30, rows=20, tile=30;
let selected=-1;
const cells = Array.from({length:cols*rows},(_,i)=> {
  const x=i%cols,y=Math.floor(i/cols);
  const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
  const v=n-Math.floor(n);
  const owner=(x<8&&y>6&&y<15)?'blue':(x>21&&y>4&&y<14)?'red':'neutral';
  return {owner,forest:v>.82,water:v<.08};
});
function draw() {
  ctx.fillStyle='#101a24';ctx.fillRect(0,0,canvas.width,canvas.height);
  cells.forEach((c,i)=>{
    const x=(i%cols)*tile,y=Math.floor(i/cols)*tile;
    ctx.fillStyle=c.water?'#182f43':c.owner==='blue'?'#245c91':c.owner==='red'?'#873e45':'#34483b';
    ctx.fillRect(x+1,y+1,tile-2,tile-2);
    if(c.forest&&!c.water){ctx.fillStyle='#78935b';ctx.fillRect(x+12,y+10,5,5);ctx.fillRect(x+9,y+16,11,5);}
    if(selected===i){ctx.strokeStyle='#f6d879';ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,tile-4,tile-4);}
  });
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
  for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(x*tile,0);ctx.lineTo(x*tile,rows*tile);ctx.stroke();}
  for(let y=0;y<=rows;y++){ctx.beginPath();ctx.moveTo(0,y*tile);ctx.lineTo(cols*tile,y*tile);ctx.stroke();}
}
canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*canvas.width/r.width/tile),y=Math.floor((e.clientY-r.top)*canvas.height/r.height/tile);
  selected=y*cols+x;const c=cells[selected];$('selection').textContent='SECTOR '+String(x+1).padStart(2,'0')+'-'+String(y+1).padStart(2,'0')+' · '+c.owner.toUpperCase();draw();
});
draw();
