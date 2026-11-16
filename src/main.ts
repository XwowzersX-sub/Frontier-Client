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
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="main-menu" class="screen menu-screen">
 <div class="menu-brand">PIXEL <span>FRONTIER</span><small>THE WORLD IS YOURS TO CLAIM</small></div>
 <div class="menu-card">
  <div class="eyebrow">COMMANDER ACCESS</div>
  <h1>Choose your<br><em>frontier.</em></h1>
  <label class="field-label" for="nickname">COMMANDER NAME</label><input id="nickname" maxlength="18" placeholder="Enter nickname" autocomplete="nickname">
  <div class="menu-actions"><button id="menu-single" class="primary big">SINGLE PLAYER <small>PLAY AGAINST AI COMMANDERS</small></button><button id="menu-multi" class="secondary big">MULTIPLAYER <small>JOIN THE ONLINE WORLD</small></button></div>
  <details class="account-details"><summary>ACCOUNT / SIGN IN</summary><form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password" required><button class="primary">SIGN IN</button></form><div class="auth-actions"><button id="signup" class="secondary">CREATE ACCOUNT</button><button id="resend" class="secondary">RESEND VERIFY EMAIL</button><button id="logout" class="secondary hidden">SIGN OUT</button></div><p id="auth-message" class="muted">Sign in to keep your account identity.</p></details>
  <button id="menu-settings" class="text-button">⚙ SETTINGS</button>
 </div><div class="menu-version">PIXEL FRONTIER · REALM CONQUEST · BETA</div>
</div>
<div id="settings-screen" class="screen modal-screen hidden"><div class="settings-card"><div class="modal-head"><div><div class="eyebrow">GAME OPTIONS</div><h2>SETTINGS</h2></div><button id="settings-close" class="secondary">CLOSE ✕</button></div>
 <label class="setting-row">PIXEL SCALE <select id="pixel-scale"><option value="1">Crisp</option><option value="2" selected>Chunky</option><option value="3">Extra chunky</option></select></label>
 <label class="setting-row">MAP GRID <input id="grid-toggle" type="checkbox" checked></label>
 <label class="setting-row">SOUND EFFECTS <input id="sound-toggle" type="checkbox"></label>
 <label class="setting-row">SHOW TROOP COUNTS <input id="count-toggle" type="checkbox" checked></label>
 <button id="settings-save" class="primary">SAVE SETTINGS</button>
 </div></div>
<div id="game-screen" class="game-screen hidden">
 <header><div class="brand">✦ PIXEL FRONTIER <small>REALM CONQUEST</small></div><div class="head-center"><span id="connection" class="connection">● OFFLINE</span><b id="commander-label">COMMANDER</b></div><div class="right-head"><button id="game-settings" class="secondary">⚙</button><button id="main-menu" class="account">MENU</button></div></header>
 <main class="battle-layout">
  <section class="battlefield">
   <div class="game-top"><div><div class="eyebrow">LIVE THEATER</div><strong>SECTOR 07 <span>·</span> THE OUTER REACH</strong></div><div class="top-stats"><div><small>TURN</small><b id="turn">0</b></div><div><small>LAND</small><b id="territory">0</b></div><div><small>INCOME</small><b id="income">+0</b></div><div><small>COMMANDERS</small><b id="online">0</b></div></div></div>
   <div class="map-wrap"><canvas id="map" width="1500" height="1000" aria-label="Pixel Frontier world map"></canvas></div>
   <div class="map-foot"><span id="tile-info">SELECT A TILE · DRAG FROM YOUR LAND TO EXPAND</span><span id="score">SCORE 0</span></div>
   <div class="bottom-hud">
    <div class="hud-commander"><i id="player-swatch"></i><div><small>COMMANDER</small><b id="hud-name">GUEST</b></div><div class="gold-stat"><small>GOLD</small><b id="gold">0</b></div></div>
    <div class="troop-control"><small>DEPLOY TROOPS</small><div class="troop-choices"><button data-force="25">25%</button><button data-force="50" class="chosen">50%</button><button data-force="75">75%</button><button data-force="100">ALL IN</button></div><span id="available-troops">Select your territory</span></div>
    <div class="action-controls"><button id="expand" class="primary" disabled>⚑ EXPAND / ATTACK</button><button id="recruit" class="secondary" disabled>＋ RECRUIT</button></div>
   </div>
   <div class="hint-bar">SELECT ONE OF YOUR TERRITORIES, THEN DRAG ACROSS THE MAP TO DRAW AN EXPANSION ROUTE. TROOPS FIGHT FOR EACH TILE.</div>
  </section>
  <aside class="right-panel"><div class="section-title">COMMANDERS</div><div id="leaderboard" class="leaderboard"></div><div class="section-title">FIELD REPORT</div><div id="report" class="report">Choose a mode to enter the frontier.</div><div class="section-title">SELECTED TILE</div><div id="selected-info" class="selected-info">No tile selected</div></aside>
 </main>
</div>`;


const el=(id:string)=>document.getElementById(id)!;
const report=(value:string)=>{el('report').textContent=value;};
const setConnection=(value:string,good=false)=>{el('connection').textContent='● '+value;el('connection').className='connection '+(good?'good':'');};
type Settings={pixelScale:number;grid:boolean;sound:boolean;counts:boolean};
let settings:Settings={pixelScale:2,grid:true,sound:false,counts:true};
let previousScreen:'menu'|'game'='menu';
try{settings={...settings,...JSON.parse(localStorage.getItem('frontier-settings')||'{}')};}catch{}
let forcePercent=50,selectedSource=-1,route:number[]=[],dragging=false,mode:'single'|'multi'='single',nickname=localStorage.getItem('frontier-nickname')||'';
let socket:WebSocket|null=null,game:GameState|null=null,myId='',reconnecting=false,localTimer:ReturnType<typeof setInterval>|null=null;
const canvas=el('map') as HTMLCanvasElement,ctx=canvas.getContext('2d')!;
const menu=el('main-menu'),gameScreen=el('game-screen');
(el('nickname') as HTMLInputElement).value=nickname;
function showScreen(name:'menu'|'game'|'settings'){menu.classList.toggle('hidden',name!=='menu');gameScreen.classList.toggle('hidden',name!=='game');el('settings-screen').classList.toggle('hidden',name!=='settings');}
function getNickname(){const field=el('nickname') as HTMLInputElement;nickname=(field.value.trim().replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,18)||'Commander');field.value=nickname;localStorage.setItem('frontier-nickname',nickname);el('commander-label').textContent=nickname.toUpperCase();el('hud-name').textContent=nickname;return nickname;}
function showAccount(user:{email?:string|null}|null){const b=el('logout');b.classList.toggle('hidden',!user);el('auth-message').textContent=user?'Signed in as '+(user.email||'commander'):'Sign in to keep your account identity.';}
void supabase.auth.getUser().then(({data})=>showAccount(data.user));
supabase.auth.onAuthStateChange((_event,session)=>showAccount(session?.user??null));
el('login').addEventListener('submit',async event=>{event.preventDefault();const {error}=await supabase.auth.signInWithPassword({email:(el('email') as HTMLInputElement).value,password:(el('password') as HTMLInputElement).value});el('auth-message').textContent=error?.message||'Signed in.';});
el('signup').addEventListener('click',async()=>{const email=(el('email') as HTMLInputElement).value,password=(el('password') as HTMLInputElement).value;if(!email||password.length<6){el('auth-message').textContent='Enter email and a password with at least 6 characters.';return;}const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});el('auth-message').textContent=error?.message||(data.session?'Account created.':'Verification email sent.');});
el('resend').addEventListener('click',async()=>{const email=(el('email') as HTMLInputElement).value;if(!email){el('auth-message').textContent='Enter your email first.';return;}const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin+window.location.pathname}});el('auth-message').textContent=error?.message||'Verification email requested.';});
el('logout').addEventListener('click',async()=>{await supabase.auth.signOut();showAccount(null);if(socket)socket.close();});
function applySettings(){(el('pixel-scale') as HTMLSelectElement).value=String(settings.pixelScale);(el('grid-toggle') as HTMLInputElement).checked=settings.grid;(el('sound-toggle') as HTMLInputElement).checked=settings.sound;(el('count-toggle') as HTMLInputElement).checked=settings.counts;draw();}
function openSettings(){previousScreen=game?'game':'menu';applySettings();showScreen('settings');}
el('menu-settings').addEventListener('click',openSettings);el('game-settings').addEventListener('click',openSettings);
el('settings-close').addEventListener('click',()=>showScreen(previousScreen));
el('settings-save').addEventListener('click',()=>{settings={pixelScale:Number((el('pixel-scale') as HTMLSelectElement).value),grid:(el('grid-toggle') as HTMLInputElement).checked,sound:(el('sound-toggle') as HTMLInputElement).checked,counts:(el('count-toggle') as HTMLInputElement).checked};localStorage.setItem('frontier-settings',JSON.stringify(settings));draw();showScreen(game?'game':'menu');});
el('main-menu').addEventListener('click',()=>{if(localTimer)clearInterval(localTimer);if(socket){socket.close();socket=null;}game=null;selectedSource=-1;route=[];showScreen('menu');});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
el('menu-single').addEventListener('click',()=>{getNickname();startSinglePlayer();showScreen('game');});
el('menu-multi').addEventListener('click',()=>{getNickname();showScreen('game');void connect();});
async function connect(){
 mode='multi';if(reconnecting)return;if(serverUrl.includes('YOUR-RENDER')){report('Set VITE_SERVER_URL in GitHub Actions Variables.');return;}
 if(socket?.readyState===WebSocket.OPEN){report('Already connected.');return;}
 setConnection('WAKING SERVER…');report('Waking the online world. Render may take up to a minute.');reconnecting=true;
 for(let attempt=0;attempt<14;attempt++){if(!reconnecting)return;try{const response=await fetch(serverUrl+'/health',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(response.ok){const {data}=await supabase.auth.getSession();const token=data.session?.access_token;socket=new WebSocket(serverUrl.replace(/^http/,'ws')+'/ws',token?['frontier','auth.'+token]:['frontier']);socket.onopen=()=>{setConnection('ONLINE',true);socket?.send(JSON.stringify({type:'join',name:getNickname()}));reconnecting=false;};socket.onmessage=event=>{const packet=JSON.parse(event.data);if(packet.type==='welcome')myId=packet.id;if(packet.type==='state'){game=packet.state as GameState;render();}if(packet.type==='notice'||packet.type==='error')report(packet.text);};socket.onclose=()=>{if(mode==='multi'){setConnection('DISCONNECTED');report('Connection lost. Return to menu and reconnect.');}};socket.onerror=()=>setConnection('CONNECTION ERROR');return;}}catch{}await new Promise(resolve=>setTimeout(resolve,Math.min(1500*(attempt+1),9000)));}
 reconnecting=false;setConnection('SERVER UNAVAILABLE');report('Could not wake server. Check Render and try again.');
}
function neighborsLocal(i:number){if(!game)return[];const x=i%game.width,y=Math.floor(i/game.width);return [x?i-1:-1,x<game.width-1?i+1:-1,y?i-game.width:-1,y<game.height-1?i+game.width:-1].filter(n=>n>=0);}
function startSinglePlayer(){
 mode='single';if(socket){socket.close();socket=null;}if(localTimer)clearInterval(localTimer);selectedSource=-1;route=[];myId='human';
 const palette=['#4b9bd1','#db755e','#b18be0','#d2ad4f'],names=[nickname,'Astra','Vex','Orion'],starts=[62,537,542,17];
 const players:Player[]=names.map((name,i)=>({id:i===0?'human':'bot-'+i,name,color:palette[i]!,gold:60,score:0,connected:true,home:starts[i]!}));
 const tiles:Tile[]=Array.from({length:600},(_,i)=>{const n=Math.abs(Math.sin(i*12.9898+Math.floor(i/30)*78.233)*43758.5453)%1;return{owner:null,terrain:n>.9?'mountain':n>.73?'forest':'plain',troops:0};});
 starts.forEach((at,i)=>{tiles[at]={owner:players[i]!.id,terrain:'plain',troops:35};});
 game={width:30,height:20,tiles,players,tick:0};setConnection('SOLO CAMPAIGN',true);report('Three rival commanders are active. Select your land and drag to draw a route.');render();localTimer=setInterval(localTick,4000);
}
function pathAdjacent(path:number[]){for(let i=1;i<path.length;i++)if(!neighborsLocal(path[i-1]!).includes(path[i]!))return false;return true;}
function localExpand(source:number,path:number[],percent:number){
 if(!game)return false;const player=game.players.find(p=>p.id===myId),origin=game.tiles[source];if(!player||!origin||origin.owner!==myId)return false;
 let force=Math.max(1,Math.floor(origin.troops*percent/100));if(force<1)return false;origin.troops-=force;let moved=false,lastCaptured=-1;
 for(const target of path.slice(1,81)){const tile=game.tiles[target]!;if(tile.owner===myId)continue;if(tile.terrain==='mountain')break;const defense=tile.owner?tile.troops:0;if(force<=defense)break;const defender=game.players.find(p=>p.id===tile.owner);if(defender)defender.score=Math.max(0,defender.score-1);force-=defense+1;if(lastCaptured>=0&&lastCaptured!==source)game.tiles[lastCaptured]!.troops=0;tile.owner=myId;tile.troops=0;player.score++;moved=true;lastCaptured=target;if(force<=0)break;}
 if(!moved)origin.troops+=Math.max(0,force);else if(lastCaptured>=0)game.tiles[lastCaptured]!.troops+=force;return moved;
}
function localRecruit(player:Player){if(!game||player.gold<25)return;const home=game.tiles[player.home];if(home?.owner===player.id){player.gold-=25;home.troops+=15;}}
function botTurn(bot:Player){
 if(!game)return;const owned=game.tiles.map((t,i)=>t.owner===bot.id?i:-1).filter(i=>i>=0);if(!owned.length)return;
 const opts=owned.flatMap(i=>neighborsLocal(i).filter(n=>game!.tiles[n]!.owner!==bot.id&&game!.tiles[n]!.terrain!=='mountain').map(n=>({source:i,target:n,t:game!.tiles[n]!})));
 const personality=bot.id==='bot-1'?'builder':bot.id==='bot-2'?'raider':'warden';
 opts.sort((a,b)=>{const score=(o:typeof opts[number])=>(o.t.owner?15:8)+(o.t.troops*.35)+(neighborsLocal(o.target).filter(n=>game!.tiles[n]!.owner!==bot.id).length*2)+(personality==='builder'&&!o.t.owner?5:0)+(personality==='raider'&&o.t.owner?7:0);return score(b)-score(a);});
 const pick=opts.find(o=>o.source!==bot.home||game!.tiles[o.source]!.troops>12);if(!pick)return;
 const source=game.tiles[pick.source]!,send=Math.max(1,Math.floor(source.troops*(personality==='warden'?.3:.65)));if(send<=pick.t.troops)return;
 const tile=pick.t,defender=game.players.find(p=>p.id===tile.owner);source.troops-=send;const survivors=send-(tile.owner?tile.troops:0)-1;if(defender)defender.score=Math.max(0,defender.score-1);tile.owner=bot.id;tile.troops=Math.max(1,survivors);bot.score++;
 if(bot.gold>=25&&personality==='warden'&&game.tick%2===0)localRecruit(bot);
}
function localTick(){if(!game||mode!=='single')return;game.tick++;for(const p of game.players){const land=game.tiles.filter(t=>t.owner===p.id);p.gold=Math.min(9999,p.gold+Math.max(1,Math.floor(land.length/3)));if(game.tick%2===0)for(const t of land)if(t.troops<200)t.troops+=2;}for(const bot of game.players.filter(p=>p.id.startsWith('bot-'))){botTurn(bot);if(game.tick%3===0)botTurn(bot);}render();}
function tileAt(event:PointerEvent){if(!game)return-1;const r=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)*game.width/r.width),y=Math.floor((event.clientY-r.top)*game.height/r.height);return x>=0&&x<game.width&&y>=0&&y<game.height?y*game.width+x:-1;}
function draw(){
 const targetWidth=Math.round(1500/settings.pixelScale),targetHeight=Math.round(1000/settings.pixelScale);if(canvas.width!==targetWidth||canvas.height!==targetHeight){canvas.width=targetWidth;canvas.height=targetHeight;}
 const current=game;ctx.clearRect(0,0,canvas.width,canvas.height);if(!current){ctx.fillStyle='#101b24';ctx.fillRect(0,0,canvas.width,canvas.height);return;}
 const w=canvas.width/current.width,h=canvas.height/current.height;
 current.tiles.forEach((tile,i)=>{const x=i%current.width*w,y=Math.floor(i/current.width)*h,owner=current.players.find(p=>p.id===tile.owner);
  const seed=(i*17+Math.floor(i/current.width)*13)%11;ctx.fillStyle=tile.terrain==='mountain'?'#66747b':owner?.color||'#344e42';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=tile.terrain==='mountain'?'#8d9ba0':tile.terrain==='forest'?'#294d38':owner?owner.color:'#405e4a';ctx.fillRect(x+3,y+3,w-6,h-6);
  if(tile.terrain==='forest'){ctx.fillStyle='#1e3d2e';for(let k=0;k<3;k++){const tx=x+8+((seed*7+k*13)%(w-16)),ty=y+10+((seed*5+k*11)%(h-22));ctx.fillRect(tx,ty,8,13);ctx.fillRect(tx-4,ty+5,16,7);ctx.fillStyle='#71975b';ctx.fillRect(tx+2,ty+2,4,5);ctx.fillStyle='#1e3d2e';}}
  else if(tile.terrain==='mountain'){ctx.fillStyle='#c1c9c6';ctx.beginPath();ctx.moveTo(x+8,y+h-7);ctx.lineTo(x+w*.5,y+8);ctx.lineTo(x+w-7,y+h-7);ctx.fill();ctx.fillStyle='#e3e1cc';ctx.beginPath();ctx.moveTo(x+w*.5,y+8);ctx.lineTo(x+w*.38,y+h*.38);ctx.lineTo(x+w*.61,y+h*.38);ctx.fill();}
  else {ctx.fillStyle=owner?'#ffffff15':'#a2ba8322';for(let k=0;k<5;k++)ctx.fillRect(x+6+((seed*3+k*17)%(w-12)),y+7+((seed*5+k*19)%(h-14)),3,3);}
  if(tile.owner&&settings.counts){ctx.fillStyle='#0b1218';ctx.fillRect(x+w*.28,y+h*.67,w*.44,h*.2);ctx.fillStyle='#fff';ctx.font='bold '+Math.max(5,15/settings.pixelScale)+'px monospace';ctx.textAlign='center';ctx.fillText(String(tile.troops),x+w*.5,y+h*.83);}
  if(route.includes(i)){ctx.fillStyle='#fff0a8';ctx.fillRect(x+5,y+5,w-10,h-10);}
  if(i===selectedSource){ctx.strokeStyle='#fff0a8';ctx.lineWidth=5;ctx.strokeRect(x+4,y+4,w-8,h-8);}
 });
 if(settings.grid){ctx.strokeStyle='rgba(6,13,16,.34)';ctx.lineWidth=1;for(let x=0;x<=current.width;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,canvas.height);ctx.stroke();}for(let y=0;y<=current.height;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(canvas.width,y*h);ctx.stroke();}}
}
function updateStats(){
 const current=game,me=current?.players.find(p=>p.id===myId),owned=current?.tiles.filter(t=>t.owner===myId).length||0;
 el('gold').textContent=me?String(me.gold):'0';el('territory').textContent=String(owned);el('score').textContent='SCORE '+(me?.score||0);el('online').textContent=String(current?.players.filter(p=>p.connected).length||0);
 el('available-troops').textContent=selectedSource>=0&&current?.tiles[selectedSource]?.owner===myId?current.tiles[selectedSource]!.troops+' TROOPS AVAILABLE':'Select one of your territories';
 const source=current&&selectedSource>=0?current.tiles[selectedSource]:null;const force=source?Math.floor(source.troops*forcePercent/100):0;
 (el('expand') as HTMLButtonElement).disabled=!source||source.owner!==myId||force<1||route.length<2;
 (el('recruit') as HTMLButtonElement).disabled=!me||me.gold<25;
 el('selected-info').textContent=selectedSource>=0&&source?'SOURCE · '+source.troops+' TROOPS · SEND '+force+' ('+forcePercent+'%)':'Choose a tile to inspect.';
 if(current&&selectedSource>=0){const sourceTile=current.tiles[selectedSource]!;el('tile-info').textContent='SOURCE '+(selectedSource%current.width+1)+','+(Math.floor(selectedSource/current.width)+1)+' · '+sourceTile.troops+' TROOPS · ROUTE '+Math.max(0,route.length-1)+' TILES';}else el('tile-info').textContent='SELECT YOUR LAND · DRAG TO DRAW AN EXPANSION ROUTE';
 el('income').textContent='+'+Math.max(1,Math.floor(owned/3))+' TROOPS / TURN';el('turn').textContent=String(current?.tick||0);
}
function render(){if(!game)return;el('leaderboard').innerHTML=game.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>'<div class="rank"><b>'+(i+1)+'</b><i style="background:'+p.color+'"></i><span>'+escapeHtml(p.name)+(p.id===myId?' (YOU)':'')+'</span><strong>'+p.score+'</strong></div>').join('');const me=game.players.find(p=>p.id===myId);(el('player-swatch') as HTMLElement).style.background=me?.color||'#e8c76e';el('hud-name').textContent=me?.name||nickname;updateStats();draw();}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
canvas.addEventListener('pointerdown',event=>{if(!game)return;const i=tileAt(event);if(i<0)return;const tile=game.tiles[i]!;if(tile.owner===myId){selectedSource=i;route=[i];dragging=true;canvas.setPointerCapture(event.pointerId);}else if(selectedSource>=0&&neighborsLocal(selectedSource).includes(i)){route=[selectedSource,i];dragging=true;canvas.setPointerCapture(event.pointerId);}updateStats();draw();});
canvas.addEventListener('pointermove',event=>{if(!dragging||!game)return;const i=tileAt(event);if(i<0||!route.length||i===route[route.length-1])return;if(!neighborsLocal(route[route.length-1]!).includes(i)||route.includes(i)||route.length>=80)return;route.push(i);updateStats();draw();});
canvas.addEventListener('pointerup',()=>{if(!dragging)return;dragging=false;if(route.length>1)report('Route ready: '+(route.length-1)+' tiles. Press EXPAND / ATTACK to send troops.');updateStats();draw();});
canvas.addEventListener('pointercancel',()=>{dragging=false;});
el('expand').addEventListener('click',()=>{if(!game||selectedSource<0||route.length<2)return;const payload={type:'expand',source:selectedSource,path:route.slice(1),percent:forcePercent};if(mode==='single'){if(localExpand(selectedSource,route,forcePercent))report('Troops advanced along the route.');else report('Not enough troops to complete that route.');render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(payload));route=[selectedSource];updateStats();draw();});
el('recruit').addEventListener('click',()=>{if(mode==='single'&&game){const p=game.players.find(v=>v.id===myId);if(p)localRecruit(p);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'recruit'}));});
applySettings();showScreen('menu');getNickname();
