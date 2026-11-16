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
let socket: WebSocket | null = null, game: GameState | null = null, myId = '', selected = -1, reconnecting = false, mode: 'single' | 'multi' = 'single', localTimer: ReturnType<typeof setInterval> | null = null;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><div class="brand">✦ PIXEL FRONTIER <small>REALM CONQUEST</small></div><div class="right-head"><span id="connection" class="connection">● OFFLINE</span><button id="account" class="account">GUEST</button></div></header>
<main>
 <aside class="panel">
  <div class="eyebrow">COMMANDER TERMINAL</div><h1>Claim your<br><em>frontier.</em></h1>
  <div class="auth-box"><form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password (6+ characters)" required><button class="primary">SIGN IN</button></form><div class="auth-actions"><button id="signup" class="secondary">CREATE ACCOUNT</button><button id="resend" class="secondary">RESEND VERIFY EMAIL</button><button id="logout" class="secondary hidden">SIGN OUT</button></div><p id="auth-message" class="muted">Sign in to keep your commander identity.</p></div>
  <div class="mode-picker"><button id="single-mode" class="primary">SINGLE PLAYER</button><button id="multi-mode" class="secondary">MULTIPLAYER</button></div><button id="connect" class="primary connect-btn hidden">WAKE / CONNECT TO MATCH</button>
  <div class="section-title">YOUR EMPIRE</div>
  <div class="stats"><div><small>GOLD</small><b id="gold">—</b></div><div><small>TERRITORY</small><b id="territory">—</b></div><div><small>SCORE</small><b id="score">—</b></div></div>
  <div class="section-title">ORDERS</div><button id="expand" class="primary" disabled>EXPAND SELECTED TILE <span>−4g</span></button><button id="recruit" class="secondary" disabled>RECRUIT 5 TROOPS <span>−25g</span></button>
  <p class="hint">Select a neighboring neutral tile, then expand. Mountains cannot be occupied. Captures require more nearby troops than the defending garrison.</p>
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
function showAccount(user: { email?: string | null } | null) {
 el('account').textContent = user ? (user.email?.split('@')[0] || 'COMMANDER').slice(0,16) : 'GUEST';
 el('logout').classList.toggle('hidden', !user);
}
void supabase.auth.getUser().then(({data}) => showAccount(data.user));
supabase.auth.onAuthStateChange((_event, session) => showAccount(session?.user ?? null));
el('login').addEventListener('submit', async event => {
 event.preventDefault();
 const { error } = await supabase.auth.signInWithPassword({ email: (el('email') as HTMLInputElement).value, password: (el('password') as HTMLInputElement).value });
 el('auth-message').textContent = error?.message || 'Signed in. Reconnect to join with your account identity.';
 if (!error) { const {data} = await supabase.auth.getUser(); showAccount(data.user); }
});
el('signup').addEventListener('click', async () => {
 const email = (el('email') as HTMLInputElement).value, password = (el('password') as HTMLInputElement).value;
 if (!email || password.length < 6) { el('auth-message').textContent = 'Enter an email and password with at least 6 characters.'; return; }
 const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
 el('auth-message').textContent = error?.message || (data.session ? 'Account created and signed in.' : 'Verification email sent. Check inbox and spam, then click the newest link.');
});
el('resend').addEventListener('click', async () => { const email=(el('email') as HTMLInputElement).value; if(!email){el('auth-message').textContent='Enter your email address first.';return;} const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin+window.location.pathname}}); el('auth-message').textContent=error?.message||'A fresh verification email was requested. Check inbox and spam.'; });
el('logout').addEventListener('click', async () => { await supabase.auth.signOut(); showAccount(null); if (socket) socket.close(); });
el('connect').addEventListener('click', () => void connect());
el('single-mode').addEventListener('click',()=>startSinglePlayer());
el('multi-mode').addEventListener('click',()=>{mode='multi';if(localTimer)clearInterval(localTimer);localTimer=null;game=null;myId='';selected=-1;el('connect').classList.remove('hidden');el('single-mode').classList.remove('primary');el('single-mode').classList.add('secondary');el('multi-mode').classList.remove('secondary');el('multi-mode').classList.add('primary');report('Multiplayer selected. Connect to the shared online world.');setConnection('OFFLINE');draw();updateStats();});
async function connect() {
 mode='multi';
 if (reconnecting) return;
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
    const protocols = token ? ['frontier', 'auth.' + token] : ['frontier'];
    socket = new WebSocket(serverUrl.replace(/^http/, 'ws') + '/ws', protocols);
    socket.onopen = () => { setConnection('CONNECTED', true); report('Connected. Entering the frontier…'); const name = data.session?.user.email?.split('@')[0] || 'Commander'; socket?.send(JSON.stringify({ type: 'join', name })); reconnecting = false; };
    socket.onmessage = event => {
     const packet = JSON.parse(event.data);
     if (packet.type === 'welcome') myId = packet.id;
     if (packet.type === 'state') { game = packet.state as GameState; render(); }
     if (packet.type === 'notice' || packet.type === 'error') report(packet.text);
    };
    socket.onclose = () => { if(mode==='multi'){setConnection('DISCONNECTED');report('Connection closed. Press Connect to rejoin.');game=null;updateStats();draw();} };
    socket.onerror = () => { setConnection('CONNECTION ERROR'); };
    return;
   }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, Math.min(1500 * (attempt + 1), 9000)));
 }
 reconnecting = false; setConnection('SERVER UNAVAILABLE'); report('Could not wake the server. Check the Render service and try again.');
}
const canvas = el('map') as HTMLCanvasElement, ctx = canvas.getContext('2d')!;

function startSinglePlayer(){
 mode='single';if(socket){socket.close();socket=null;}if(localTimer)clearInterval(localTimer);reconnecting=false;selected=-1;myId='human';
 const palette=['#4b9bd1','#db755e','#b18be0','#d2ad4f'],names=['You','Astra','Vex','Orion'],starts=[62,537,542,17];
 const localPlayers:Player[]=names.map((name,i)=>({id:i===0?'human':'bot-'+i,name,color:palette[i]!,gold:60,score:0,connected:true,home:starts[i]!}));
 const localTiles:Tile[]=Array.from({length:600},(_,i)=>{const n=Math.abs(Math.sin(i*12.9898+Math.floor(i/30)*78.233)*43758.5453)%1;return {owner:null,terrain:n>.9?'mountain':n>.73?'forest':'plain',troops:0};});
 starts.forEach((at,i)=>{localTiles[at]={owner:localPlayers[i]!.id,terrain:'plain',troops:14};});
 game={width:30,height:20,tiles:localTiles,players:localPlayers,tick:0};
 el('connect').classList.add('hidden');el('single-mode').classList.remove('secondary');el('single-mode').classList.add('primary');el('multi-mode').classList.remove('primary');el('multi-mode').classList.add('secondary');
 setConnection('SOLO CAMPAIGN',true);report('Solo campaign started. Three advanced rivals expand, recruit, defend borders, and compete for territory.');render();localTimer=setInterval(localTick,5000);
}
function neighborsLocal(i:number){const x=i%30,y=Math.floor(i/30);return [x?i-1:-1,x<29?i+1:-1,y?i-30:-1,y<19?i+30:-1].filter(n=>n>=0);}
function localClaim(player:Player,target:number){
 if(!game||target<0||target>=game.tiles.length)return false;const tile=game.tiles[target]!;
 if(tile.owner===player.id||tile.terrain==='mountain')return false;
 const near=neighborsLocal(target).filter(n=>game!.tiles[n]!.owner===player.id);if(!near.length)return false;
 const force=near.reduce((v,n)=>v+game!.tiles[n]!.troops,0),cost=tile.owner?8:4;if(player.gold<cost||(tile.owner&&force<=tile.troops))return false;
 const wasEnemy=Boolean(tile.owner);player.gold-=cost;tile.owner=player.id;tile.troops=wasEnemy?1:Math.max(1,tile.troops+2);player.score++;return true;
}
function localRecruit(player:Player){if(!game||player.gold<25)return;const home=game.tiles[player.home];if(home?.owner===player.id){player.gold-=25;home.troops+=5;}}
function botTurn(bot:Player){
 if(!game)return;const owned=game.tiles.map((t,i)=>t.owner===bot.id?i:-1).filter(i=>i>=0);if(!owned.length)return;
 const options=owned.flatMap(i=>neighborsLocal(i).filter(n=>game!.tiles[n]!.owner!==bot.id&&game!.tiles[n]!.terrain!=='mountain').map(n=>({to:n,t:game!.tiles[n]!})));
 const ranked=options.map(o=>{const friendly=neighborsLocal(o.to).filter(n=>game!.tiles[n]!.owner===bot.id);const force=friendly.reduce((v,n)=>v+game!.tiles[n]!.troops,0);const canTake=!o.t.owner||force>o.t.troops;const score=(o.t.owner?12:0)+neighborsLocal(o.to).filter(n=>game!.tiles[n]!.owner!==bot.id).length*2+o.t.troops*.2+(o.t.terrain==='forest'?1:0);return {...o,canTake,score};}).filter(o=>o.canTake).sort((a,b)=>b.score-a.score);
 if(bot.gold>=25&&owned.length>1&&Math.random()<.45)localRecruit(bot);if(ranked.length)localClaim(bot,ranked[0]!.to);if(bot.gold>=25&&Math.random()<.2)localRecruit(bot);
}
function localTick(){
 if(!game||mode!=='single')return;game.tick++;
 for(const p of game.players){const land=game.tiles.filter(t=>t.owner===p.id);p.gold=Math.min(9999,p.gold+Math.max(1,Math.floor(land.length/3)));if(game.tick%3===0)for(const t of land)if(t.troops<99)t.troops++;}
 for(const bot of game.players.filter(p=>p.id.startsWith('bot-'))){botTurn(bot);if(game.tick%3===0)botTurn(bot);}render();
}

function tileAt(event: MouseEvent) {
 if (!game) return -1;
 const rect = canvas.getBoundingClientRect(), x = Math.floor((event.clientX - rect.left) * game.width / rect.width), y = Math.floor((event.clientY - rect.top) * game.height / rect.height);
 return x >= 0 && x < game.width && y >= 0 && y < game.height ? y * game.width + x : -1;
}
function draw() {
 const current=game;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if (!current) {
  ctx.fillStyle='#15232c';ctx.fillRect(0,0,900,600);ctx.fillStyle='#93a3a4';ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText('CONNECT TO ENTER THE FRONTIER',450,300);return;
 }
 const w=canvas.width/current.width,h=canvas.height/current.height;
 current.tiles.forEach((tile,i)=>{
  const x=i%current.width*w,y=Math.floor(i/current.width)*h;
  const owner=current.players.find(p=>p.id===tile.owner);
  ctx.fillStyle=tile.terrain==='mountain'?'#59636a':owner?.color||'#334c3e';ctx.fillRect(x+1,y+1,w-2,h-2);
  if(tile.terrain==='forest'){ctx.fillStyle='#a6b879';ctx.fillRect(x+w*.43,y+h*.28,w*.14,h*.45);ctx.fillRect(x+w*.28,y+h*.48,w*.44,h*.25);}
  if(tile.terrain==='mountain'){ctx.fillStyle='#b3bdc0';ctx.beginPath();ctx.moveTo(x+w*.2,y+h*.78);ctx.lineTo(x+w*.5,y+h*.2);ctx.lineTo(x+w*.82,y+h*.78);ctx.fill();}
  if(tile.owner){ctx.fillStyle='#101820';ctx.fillRect(x+w*.28,y+h*.67,w*.44,h*.2);ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(String(tile.troops),x+w*.5,y+h*.82);}
  if(i===selected){ctx.strokeStyle='#ffe18b';ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,w-4,h-4);}
 });
 ctx.strokeStyle='rgba(8,14,18,.55)';ctx.lineWidth=1;
 for(let x=0;x<=current.width;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,600);ctx.stroke();}
 for(let y=0;y<=current.height;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(900,y*h);ctx.stroke();}
}
function updateStats(){
 const current=game;
 const me=current?.players.find(p=>p.id===myId);
 const owned=current?.tiles.filter(t=>t.owner===myId).length||0;
 el('gold').textContent=me?String(me.gold):'—';el('territory').textContent=me?String(owned):'—';el('score').textContent=me?String(me.score):'—';
 const target=current?.tiles[selected];
 const x=current && selected>=0 ? selected%current.width : -1, y=current && selected>=0 ? Math.floor(selected/current.width) : -1;
 const adjacentIndexes=current&&selected>=0?[x>0?selected-1:-1,x<current.width-1?selected+1:-1,y>0?selected-current.width:-1,y<current.height-1?selected+current.width:-1]:[];
 const adjacent=Boolean(current&&adjacentIndexes.some(i=>i>=0&&current.tiles[i]!.owner===myId));
 const attackForce=current&&selected>=0?adjacentIndexes.reduce((sum,i)=>i>=0&&current.tiles[i]!.owner===myId?sum+current.tiles[i]!.troops:sum,0):0;
 (el('expand') as HTMLButtonElement).disabled=!me||!target||target.owner===myId||!adjacent||target.terrain==='mountain'||me.gold<(target.owner?8:4)||Boolean(target.owner&&attackForce<=target.troops);
 const costLabel=el('expand').querySelector('span');if(costLabel)costLabel.textContent=target?.owner?'−8g':'−4g';
 (el('recruit') as HTMLButtonElement).disabled=!me||me.gold<25;
 if(target&&current){const owner=current.players.find(p=>p.id===target.owner);el('tile-info').textContent='TILE '+(selected%current.width+1)+' / '+(Math.floor(selected/current.width)+1)+' · '+(owner?.name||'NEUTRAL')+' · '+target.terrain.toUpperCase()+' · '+target.troops+' TROOPS';}else el('tile-info').textContent='SELECT A TILE TO INSPECT';
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
el('expand').addEventListener('click',()=>{if(mode==='single'&&game){const me=game.players.find(p=>p.id===myId);if(me&&localClaim(me,selected)){report('Territory secured. Keep expanding your borders.');render();}else report('Cannot claim that tile yet. Expand from a border with enough troops.');}else if(socket?.readyState===WebSocket.OPEN&&selected>=0)socket.send(JSON.stringify({type:'claim',tile:selected}));});
el('recruit').addEventListener('click',()=>{if(mode==='single'&&game){const me=game.players.find(p=>p.id===myId);if(me){localRecruit(me);render();}}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'recruit'}));});
draw();updateStats();
startSinglePlayer();
