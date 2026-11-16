import { createClient } from '@supabase/supabase-js';
import './style.css';

const env = import.meta.env;
const supabase = createClient(
  env.VITE_SUPABASE_URL || 'https://rkenxijtbmiqcgwhvtgr.supabase.co',
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MPWfzhBBPHCTjz-mH3ff4Q_8G1XSfnm'
);
const serverUrl = (env.VITE_SERVER_URL || 'https://YOUR-RENDER-SERVICE.onrender.com').replace(/\/$/, '');
type Tile = { owner: string | null; terrain: 'plain' | 'forest' | 'mountain'; troops: number };
type Player = { id: string; name: string; color: string; gold: number; score: number; connected: boolean; home: number };
type GameState = { width: number; height: number; tiles: Tile[]; players: Player[]; tick: number };
let socket: WebSocket | null = null, game: GameState | null = null, myId = '', selected = -1, reconnecting = false;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><div class="brand">✦ PIXEL FRONTIER <small>REALM CONQUEST</small></div><div class="right-head"><span id="connection" class="connection">● OFFLINE</span><button id="account" class="account">GUEST</button></div></header>
<main>
 <aside class="panel">
  <div class="eyebrow">COMMANDER TERMINAL</div><h1>Claim your<br><em>frontier.</em></h1>
  <div class="auth-box"><form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password (6+ characters)" required><button class="primary">SIGN IN</button></form><div class="auth-actions"><button id="signup" class="secondary">CREATE ACCOUNT</button><button id="logout" class="secondary hidden">SIGN OUT</button></div><p id="auth-message" class="muted">Sign in to keep your commander identity.</p></div>
  <div class="section-title">YOUR EMPIRE</div>
  <div class="stats"><div><small>GOLD</small><b id="gold">—</b></div><div><small>TERRITORY</small><b id="territory">—</b></div><div><small>SCORE</small><b id="score">—</b></div></div>
  <div class="section-title">ORDERS</div><button id="expand" class="primary" disabled>EXPAND SELECTED TILE <span>−4g</span></button><button id="recruit" class="secondary" disabled>RECRUIT 5 TROOPS <span>−25g</span></button>
  <p class="hint">Select a neighboring neutral tile, then expand. Mountains cannot be occupied. Enemy tiles with 4+ defenders are protected.</p>
  <div class="section-title">FIELD REPORT</div><div id="report" class="report">Connect to the server to enter the match.</div>
 </aside>
 <section class="battlefield">
  <div class="game-top"><div><div class="eyebrow">LIVE THEATER</div><strong>SECTOR 07 <span>·</span> THE OUTER REACH</strong></div><div class="online"><b id="online">0</b><small>COMMANDERS</small></div></div>
  <div class="resource-strip"><span>TURN <b id="turn">0</b></span><span>GOLD INCOME <b id="income">+1 / 5s</b></span><span>MAP <b>30 × 20</b></span></div>
  <div class="map-wrap"><canvas id="map" width="900" height="600" aria-label="Pixel Frontier territory map"></canvas></div>
  <div class="map-foot"><span id="tile-info">SELECT A TILE TO INSPECT</span><span>CLICK A TILE · ISSUE AN ORDER</span></div>
  <div class="lower"><div><div class="section-title">COMMANDERS</div><div id="leaderboard" class="leaderboard"><span class="muted">Waiting for players…</span></div></div><div><div class="section-title">HOW TO PLAY</div><p class="rules">Expand from your borders to claim land. Each territory adds gold income. Recruit troops at your home tile. Build a larger empire than the other commanders.</p></div></div>
 </section>
</main><footer>PIXEL FRONTIER <span>PROTOTYPE BUILD · MATCH STATE RESETS WHEN THE SERVER RESTARTS</span></footer>`;
const el = (id: string) => document.getElementById(id)!;
const report = (text: string) => { el('report').textContent = text; };
const setConnection = (text: string, good = false) => { el('connection').textContent = '● ' + text; el('connection').className = 'connection ' + (good ? 'good' : ''); };
async function refreshAuth() {
 const { data } = await supabase.auth.getUser();
 el('account').textContent = data.user ? (data.user.email?.split('@')[0] || 'COMMANDER').slice(0,16) : 'GUEST';
 el('logout').classList.toggle('hidden', !data.user);
}
void refreshAuth();
supabase.auth.onAuthStateChange(() => void refreshAuth());
el('login').addEventListener('submit', async event => {
 event.preventDefault();
 const { error } = await supabase.auth.signInWithPassword({ email: (el('email') as HTMLInputElement).value, password: (el('password') as HTMLInputElement).value });
 el('auth-message').textContent = error?.message || 'Signed in. Reconnect to join with your account identity.';
 if (!error) void refreshAuth();
});
el('signup').addEventListener('click', async () => {
 const email = (el('email') as HTMLInputElement).value, password = (el('password') as HTMLInputElement).value;
 if (!email || password.length < 6) { el('auth-message').textContent = 'Enter an email and password with at least 6 characters.'; return; }
 const { error } = await supabase.auth.signUp({ email, password });
 el('auth-message').textContent = error?.message || 'Account created. Check your email if confirmation is enabled.';
});
el('logout').addEventListener('click', async () => { await supabase.auth.signOut(); await refreshAuth(); if (socket) socket.close(); });
el('connect').addEventListener('click', () => void connect());
async function connect() {
 if (serverUrl.includes('YOUR-RENDER')) { report('Set VITE_SERVER_URL in GitHub Actions Variables first.'); return; }
 if (socket && socket.readyState === WebSocket.OPEN) { socket.close(); return; }
 setConnection('WAKING SERVER…'); report('Sending a health request to wake Render. A sleeping free instance may take a minute.');
 reconnecting = true;
 for (let attempt = 0; attempt < 14; attempt++) {
  if (!reconnecting) return;
  try {
   const response = await fetch(serverUrl + '/health', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
   if (response.ok) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    socket = new WebSocket(serverUrl.replace(/^http/, 'ws') + '/ws' + (token ? '?token=' + encodeURIComponent(token) : ''));
    socket.onopen = () => { setConnection('CONNECTED', true); report('Connected. Entering the frontier…'); const name = data.session?.user.email?.split('@')[0] || 'Commander'; socket?.send(JSON.stringify({ type: 'join', name })); reconnecting = false; };
    socket.onmessage = event => {
     const packet = JSON.parse(event.data);
     if (packet.type === 'welcome') myId = packet.id;
     if (packet.type === 'state') { game = packet.state as GameState; render(); }
     if (packet.type === 'notice' || packet.type === 'error') report(packet.text);
    };
    socket.onclose = () => { setConnection('DISCONNECTED'); report('Connection closed. Press Connect to rejoin.'); game = null; updateStats(); draw(); };
    socket.onerror = () => { setConnection('CONNECTION ERROR'); };
    return;
   }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, Math.min(1500 * (attempt + 1), 9000)));
 }
 reconnecting = false; setConnection('SERVER UNAVAILABLE'); report('Could not wake the server. Check the Render service and try again.');
}
const canvas = el('map') as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
function tileAt(event: MouseEvent) {
 if (!game) return -1;
 const rect = canvas.getBoundingClientRect(), x = Math.floor((event.clientX - rect.left) * game.width / rect.width), y = Math.floor((event.clientY - rect.top) * game.height / rect.height);
 return x >= 0 && x < game.width && y >= 0 && y < game.height ? y * game.width + x : -1;
}
function draw() {
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if (!game) {
  ctx.fillStyle='#15232c';ctx.fillRect(0,0,900,600);ctx.fillStyle='#93a3a4';ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText('CONNECT TO ENTER THE FRONTIER',450,300);return;
 }
 const w=canvas.width/game.width,h=canvas.height/game.height;
 game.tiles.forEach((tile,i)=>{
  const x=i%game.width*w,y=Math.floor(i/game.width)*h;
  const owner=game!.players.find(p=>p.id===tile.owner);
  ctx.fillStyle=tile.terrain==='mountain'?'#59636a':owner?.color||'#334c3e';ctx.fillRect(x+1,y+1,w-2,h-2);
  if(tile.terrain==='forest'){ctx.fillStyle='#a6b879';ctx.fillRect(x+w*.43,y+h*.28,w*.14,h*.45);ctx.fillRect(x+w*.28,y+h*.48,w*.44,h*.25);}
  if(tile.terrain==='mountain'){ctx.fillStyle='#b3bdc0';ctx.beginPath();ctx.moveTo(x+w*.2,y+h*.78);ctx.lineTo(x+w*.5,y+h*.2);ctx.lineTo(x+w*.82,y+h*.78);ctx.fill();}
  if(tile.owner){ctx.fillStyle='#101820';ctx.fillRect(x+w*.28,y+h*.67,w*.44,h*.2);ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(String(tile.troops),x+w*.5,y+h*.82);}
  if(i===selected){ctx.strokeStyle='#ffe18b';ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,w-4,h-4);}
 });
 ctx.strokeStyle='rgba(8,14,18,.55)';ctx.lineWidth=1;
 for(let x=0;x<=game.width;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,600);ctx.stroke();}
 for(let y=0;y<=game.height;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(900,y*h);ctx.stroke();}
}
function updateStats(){
 const me=game?.players.find(p=>p.id===myId);
 const owned=game?.tiles.filter(t=>t.owner===myId).length||0;
 el('gold').textContent=me?String(me.gold):'—';el('territory').textContent=me?String(owned):'—';el('score').textContent=me?String(me.score):'—';
 const target=game?.tiles[selected],adjacent=game&&selected>=0&&[selected-1,selected+1,selected-game.width,selected+game.width].some(i=>i>=0&&i<game.tiles.length&&game!.tiles[i]!.owner===myId);
 (el('expand') as HTMLButtonElement).disabled=!me||!target||target.owner===myId||!adjacent||target.terrain==='mountain'||me.gold<(target.owner?8:4)||Boolean(target.owner&&target.troops>=4);
 (el('recruit') as HTMLButtonElement).disabled=!me||me.gold<25;
 if(target&&game){const owner=game.players.find(p=>p.id===target.owner);el('tile-info').textContent='TILE '+(selected%game.width+1)+' / '+(Math.floor(selected/game.width)+1)+' · '+(owner?.name||'NEUTRAL')+' · '+target.terrain.toUpperCase()+' · '+target.troops+' TROOPS';}else el('tile-info').textContent='SELECT A TILE TO INSPECT';
}
function render(){
 if(!game)return;
 el('turn').textContent=String(game.tick);el('online').textContent=String(game.players.filter(p=>p.connected).length);
 const me=game.players.find(p=>p.id===myId),land=game.tiles.filter(t=>t.owner===myId).length;
 el('income').textContent='+'+Math.max(1,Math.floor(land/3))+' / 5s';
 el('leaderboard').innerHTML=game.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>'<div class="rank"><b>'+(i+1)+'</b><i style="background:'+p.color+'"></i><span>'+escapeHtml(p.name)+(p.id===myId?' (YOU)':'')+'</span><strong>'+p.score+'</strong><small>'+(p.connected?'ONLINE':'AWAY')+'</small></div>').join('')||'<span class="muted">No commanders yet.</span>';
 updateStats();draw();
}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
canvas.addEventListener('click',event=>{const index=tileAt(event);if(index<0)return;selected=index;updateStats();draw();});
el('expand').addEventListener('click',()=>{if(socket?.readyState===WebSocket.OPEN&&selected>=0)socket.send(JSON.stringify({type:'claim',tile:selected}));});
el('recruit').addEventListener('click',()=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'recruit'}));});
draw();updateStats();
