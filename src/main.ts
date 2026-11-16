import { createClient } from '@supabase/supabase-js';
import './style.css';

const env = import.meta.env;
const supabase = createClient(
  env.VITE_SUPABASE_URL || 'https://rkenxijtbmiqcgwhvtgr.supabase.co',
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MPWfzhBBPHCTjz-mH3ff4Q_8G1XSfnm'
);
const serverUrl = (env.VITE_SERVER_URL || 'https://YOUR-RENDER-SERVICE.onrender.com').replace(/\/$/, '');
type BuildingType = 'city'|'factory'|'port'|'defense_post'|'market'|'farm';
type Building = {type:BuildingType;level:number};
type Tile = { owner: string | null; terrain: 'plain' | 'forest' | 'mountain' | 'water'; troops: number; buildings?: Building[] };
type Player = { id: string; name: string; color: string; gold: number; score: number; connected: boolean; home: number; team?:number };
type GameState = { width: number; height: number; tiles: Tile[]; players: Player[]; tick: number; round?: number; mapName?: string; capacity?: number };
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="menu-screen" class="screen menu-screen">
 <div class="menu-brand">PIXEL <span>FRONTIER</span><small>THE WORLD IS YOURS TO CLAIM</small></div>
 <div class="menu-card">
  <div class="eyebrow">COMMANDER ACCESS</div>
  <h1>Choose your<br><em>frontier.</em></h1>
  <label class="field-label" for="nickname">COMMANDER NAME</label><input id="nickname" maxlength="18" placeholder="Enter nickname" autocomplete="nickname">
  <div class="menu-actions"><button id="menu-single" class="primary big">SINGLE PLAYER <small>CONFIGURE A SOLO CAMPAIGN</small></button><button id="menu-multi" class="secondary big">🌐 JOIN LIVE MATCH <small>RANDOM WORLD · UP TO 50 COMMANDERS</small></button></div>
  <details class="match-setup" open><summary>SOLO MATCH SETUP</summary>
   <div class="setup-grid">
    <label>MODE <select id="solo-mode"><option value="ffa">Free for All</option><option value="duos">Duos</option><option value="trios">Trios</option><option value="squads">Squads</option></select></label>
    <label>🗺 MAP <select id="solo-map"><option value="random">🎲 Random World</option><option value="continents">🌎 Continents</option><option value="islands">🏝 Island Chain</option><option value="pangaea">🌐 Pangaea</option><option value="highlands">⛰ Highlands</option><option value="twin-worlds">🌗 Twin Worlds</option><option value="inland-sea">🌊 Inland Sea</option><option value="atolls">🪸 Atolls</option><option value="supercontinent">🧭 Supercontinent</option><option value="fractal">🌀 Fractal Wilds</option><option value="earthlike">🌍 Earthlike</option></select></label>
    <label>🧭 START REGION <select id="start-region"><option value="auto">🎲 Anywhere</option><option value="northwest">↖ Northwest</option><option value="north">↑ North</option><option value="northeast">↗ Northeast</option><option value="west">← West</option><option value="center" selected>◎ Center</option><option value="east">→ East</option><option value="southwest">↙ Southwest</option><option value="south">↓ South</option><option value="southeast">↘ Southeast</option></select></label>
    <label>🤖 AI OPPONENTS <select id="solo-bots"><option>0</option><option>1</option><option>2</option><option>3</option><option>5</option><option>8</option><option>12</option><option>16</option><option>20</option><option selected>24</option><option>32</option><option>40</option><option>49</option></select></label>
    <label>AI DIFFICULTY <select id="solo-difficulty"><option value="relaxed">Relaxed</option><option value="balanced" selected>Balanced</option><option value="intense">Intense</option><option value="impossible">Impossible</option></select></label>
    <label>🏆 LAND WIN TARGET <select id="solo-win"><option value="60">60%</option><option value="70">70%</option><option value="80" selected>80% · WORLD CONTROL</option><option value="90">90%</option></select></label>
    <label>⏱ MATCH LENGTH <select id="solo-length"><option value="0" selected>Unlimited</option><option value="10">10 Minutes</option><option value="20">20 Minutes</option><option value="40">40 Minutes</option></select></label>
   </div>
  </details>
  <details class="sandbox-settings"><summary>SANDBOX MODIFIERS</summary>
   <div class="sandbox-grid">
    <label><input id="sandbox-random" type="checkbox"> RANDOM SPAWN</label>
    <label><input id="sandbox-gold" type="checkbox"> INFINITE GOLD</label>
    <label><input id="sandbox-troops" type="checkbox"> INFINITE TROOPS</label>
    <label><input id="sandbox-anonymous" type="checkbox"> ANONYMOUS NAMES</label>
   </div>
  </details>
  <details class="account-details"><summary>ACCOUNT / SIGN IN</summary><form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password" required><button class="primary">SIGN IN</button></form><div class="auth-actions"><button id="signup" class="secondary">CREATE ACCOUNT</button><button id="resend" class="secondary">RESEND VERIFY EMAIL</button><button id="logout" class="secondary hidden">SIGN OUT</button></div><p id="auth-message" class="muted">Sign in to keep your account identity.</p></details>
  <button id="menu-settings" class="text-button">⚙ SETTINGS</button>
 </div><div class="menu-version">PIXEL FRONTIER · REALM CONQUEST · BETA</div>
</div>
<div id="settings-screen" class="screen modal-screen hidden"><div class="settings-card"><div class="modal-head"><div><div class="eyebrow">GAME OPTIONS</div><h2>SETTINGS</h2></div><button id="settings-close" class="secondary">CLOSE ✕</button></div>
 <label class="setting-row">PIXEL SCALE <select id="pixel-scale"><option value="0.5">Micro pixels</option><option value="0.75" selected>Fine pixels</option><option value="1">Standard</option></select></label>
 <label class="setting-row">MAP GRID <input id="grid-toggle" type="checkbox" checked></label>
 <label class="setting-row">SOUND EFFECTS <input id="sound-toggle" type="checkbox"></label>
 <label class="setting-row">SHOW TROOP COUNTS <input id="count-toggle" type="checkbox" checked></label>
 <button id="settings-save" class="primary">SAVE SETTINGS</button>
 </div></div>
<div id="game-screen" class="game-screen hidden">
 <canvas id="map" width="2400" height="1600" aria-label="Fullscreen Pixel Frontier world map"></canvas>
 <div class="world-topbar">
  <div class="world-brand"><b>✦ PIXEL FRONTIER</b><span id="connection">● OFFLINE</span></div>
  <div class="world-metrics"><span>👑 <b id="commander-label">COMMANDER</b></span><span>🪙 <b id="gold">0</b></span><span>🗺 <b id="territory">0</b></span><span>🏅 <b id="rank-label">IRON</b></span><span>⏱ <b id="turn">0</b></span><span>⌛ <b id="time-left">∞</b></span><span>🌐 <b id="online">0/50</b></span><span>🌎 <b id="world-name">—</b></span><span>🔁 <b id="round">1</b></span></div>
  <div class="world-actions"><div id="solo-toolbar" class="solo-toolbar"><button id="pause-solo" class="world-icon">Ⅱ PAUSE</button><button id="speed-solo" class="world-icon">1× SPEED</button></div><button id="game-settings" class="world-icon">⚙</button><button id="main-menu" class="world-icon">MENU</button></div>
 </div>
 <div id="match-banner" class="match-banner hidden"><b id="match-result">VICTORY</b><span id="match-result-detail">Campaign complete</span><button id="new-solo" class="world-icon">NEW CAMPAIGN</button></div>
 <div class="map-inspector"><b id="tile-title">FRONTIER MAP</b><span id="tile-info">🧭 SELECT A SOURCE · CLICK A DESTINATION TO MARCH TROOPS</span><span class="camera-help">WASD PAN · Q/E ZOOM · C CENTER · M GRID · SPACE PAUSE</span><span id="score">SCORE 0</span></div>
 <div class="floating-dock">
  <div class="dock-profile"><i id="player-swatch"></i><div><small>👑 COMMANDER</small><b id="hud-name">GUEST</b></div><div class="dock-gold"><small>⚔ TROOPS TO SEND</small><b id="available-troops">0</b></div></div>
  <div class="dock-main">
   <div class="dock-tabs"><button class="dock-tab active" data-tab="command">COMMAND</button><button class="dock-tab" data-tab="build">BUILD</button><button class="dock-tab" data-tab="units">UNITS</button></div>
   <div id="command-panel" class="dock-panel">
    <div class="ratio-control"><small>⚔ TROOPS TO SEND</small><div class="troop-choices"><button data-force="25">25%</button><button data-force="50" class="chosen">50%</button><button data-force="75">75%</button><button data-force="100">100%</button></div></div>
    <div class="dock-actions"><button id="recruit" class="dock-action">＋ RECRUIT <small>25 GOLD</small></button><button id="center-map" class="dock-action">◎ CENTER</button></div>
   </div>
   <div id="build-panel" class="dock-panel hidden">
    <div class="build-grid">
     <button data-building="city"><kbd>1</kbd><b>▦ CITY</b><small>100 G</small></button>
     <button data-building="factory"><kbd>2</kbd><b>⚙ FACTORY</b><small>150 G</small></button>
     <button data-building="port"><kbd>3</kbd><b>⚓ PORT</b><small>120 G</small></button>
     <button data-building="defense_post"><kbd>4</kbd><b>▥ DEFENSE</b><small>80 G</small></button>
     <button data-building="market"><kbd>5</kbd><b>¤ MARKET</b><small>130 G</small></button>
     <button data-building="farm"><kbd>6</kbd><b>♣ FARM</b><small>80 G</small></button>
     
    </div><div class="dock-hint" id="build-hint">🏗 Choose a structure, then click one of your land tiles. Ports need a coastline.</div>
   </div>
   <div id="units-panel" class="dock-panel hidden">
    <div class="unit-actions"><button id="recruit-large" class="dock-action">＋ RECRUIT TROOPS <small>25 GOLD · +15</small></button><button id="clear-selection" class="dock-action">CANCEL BUILD / SELECT</button></div>
    <div class="quick-chat">
     <div class="chat-quick-buttons"><button data-chat="👋 Hello!">👋</button><button data-chat="👍 Nice!">👍</button><button data-chat="🤝 Team up?">🤝</button><button data-chat="🛡️ Defending here">🛡️</button><button data-chat="🏰 Building up">🏰</button></div>
     <div class="chat-entry"><input id="chat-input" maxlength="80" placeholder="Send a quick message…"><button id="send-chat" class="dock-action">SEND</button></div>
    </div>
    <div id="solo-save-actions" class="save-actions"><button id="save-solo" class="dock-action">SAVE</button><button id="load-solo" class="dock-action">LOAD</button><button id="export-solo" class="dock-action">EXPORT</button><button id="import-solo" class="dock-action">IMPORT</button><input id="solo-file" class="hidden" type="file" accept=".json,application/json"></div>
    <div class="dock-hint">🧭 Select one of your territories, set a troop percentage, then click a destination up to 15 tiles away. Your army marches that direction and captures reachable land. WASD pans · Q/E zoom · C centers · M grid · Space pause.</div>
   </div>

  </div>
  <div class="dock-report"><small>FIELD REPORT</small><p id="report">Choose a game mode to begin.</p><div id="selected-info">No territory selected</div></div>
 </div>
</div>`;


const el=(id:string)=>document.getElementById(id)!;
const report=(value:string)=>{el('report').textContent=value;};
const setConnection=(value:string,good=false)=>{el('connection').textContent='● '+value;el('connection').className='connection '+(good?'good':'');};
type Settings={pixelScale:number;grid:boolean;sound:boolean;counts:boolean};
let settings:Settings={pixelScale:0.75,grid:false,sound:false,counts:true};
let previousScreen:'menu'|'game'='menu';
try{settings={...settings,...JSON.parse(localStorage.getItem('frontier-settings')||'{}')};}catch{}if(![0.5,0.75,1].includes(settings.pixelScale))settings.pixelScale=0.75;
let forcePercent=50,selectedSource=-1,activeBuilding:BuildingType|null=null,mode:'single'|'multi'='single',nickname=localStorage.getItem('frontier-nickname')||'';
let soloMode:'ffa'|'duos'|'trios'|'squads'='ffa',soloMap='random',soloBotCount=24,soloDifficulty:'relaxed'|'balanced'|'intense'|'impossible'='balanced',soloWinPercent=80,soloLengthMinutes=0,soloSpeed=1,soloPaused=false,matchWinner:string|null=null,soloRandomSpawn=false,soloInfiniteGold=false,soloInfiniteTroops=false,soloAnonymous=false,soloSpawnPreference='center';
let socket:WebSocket|null=null,game:GameState|null=null,myId='',reconnecting=false,localTimer:ReturnType<typeof setInterval>|null=null;
let cameraZoom=1,cameraX=0,cameraY=0,cameraDragging=false,cameraPointer=0,cameraStart:{x:number;y:number;cx:number;cy:number}|null=null;
const canvas=el('map') as HTMLCanvasElement,ctx=canvas.getContext('2d')!;
const menu=el('menu-screen'),gameScreen=el('game-screen');
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
el('main-menu').addEventListener('click',()=>{if(localTimer)clearInterval(localTimer);if(socket){socket.close();socket=null;}game=null;selectedSource=-1;activeBuilding=null;matchWinner=null;soloPaused=false;showScreen('menu');});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
el('menu-single').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();startSinglePlayer();showScreen('game');}catch(error){console.error('Single player failed to start:',error);report('Could not start the solo match. Reload the page and try again.');showScreen('menu');}});
el('menu-multi').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();showScreen('game');void connect();}catch(error){console.error('Multiplayer failed to start:',error);report('Could not open multiplayer. Check the server configuration and try again.');showScreen('menu');}});
async function connect(){
 mode='multi';el('solo-toolbar').classList.add('hidden');el('solo-save-actions').classList.add('hidden');if(reconnecting)return;if(serverUrl.includes('YOUR-RENDER')){report('Set VITE_SERVER_URL in GitHub Actions Variables.');return;}
 if(socket?.readyState===WebSocket.OPEN){report('Already connected.');return;}
 setConnection('WAKING SERVER…');report('Waking the online world. Render may take up to a minute.');reconnecting=true;
 for(let attempt=0;attempt<14;attempt++){if(!reconnecting)return;try{const response=await fetch(serverUrl+'/health',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(response.ok){const {data}=await supabase.auth.getSession();const token=data.session?.access_token;socket=new WebSocket(serverUrl.replace(/^http/,'ws')+'/ws',token?['frontier','auth.'+token]:['frontier']);socket.onopen=()=>{setConnection('ONLINE',true);socket?.send(JSON.stringify({type:'join',name:getNickname()}));reconnecting=false;};socket.onmessage=event=>{const packet=JSON.parse(event.data);if(packet.type==='welcome')myId=packet.id;if(packet.type==='state'){game=packet.state as GameState;render();}if(packet.type==='notice'||packet.type==='error')report(packet.text);};socket.onclose=()=>{if(mode==='multi'){setConnection('DISCONNECTED');report('Connection lost. Return to menu and reconnect.');}};socket.onerror=()=>setConnection('CONNECTION ERROR');return;}}catch{}await new Promise(resolve=>setTimeout(resolve,Math.min(1500*(attempt+1),9000)));}
 reconnecting=false;setConnection('SERVER UNAVAILABLE');report('Could not wake server. Check Render and try again.');
}
function neighborsLocal(i:number){if(!game)return[];const x=i%game.width,y=Math.floor(i/game.width);return [x?i-1:-1,x<game.width-1?i+1:-1,y?i-game.width:-1,y<game.height-1?i+game.width:-1].filter(n=>n>=0);}

const WORLD_WIDTH=180,WORLD_HEIGHT=110,MAX_MARCH_DISTANCE=15;
const WORLD_MAPS=[
 {id:'continents',name:'Continents'},{id:'islands',name:'Island Chain'},{id:'pangaea',name:'Pangaea'},
 {id:'highlands',name:'Highlands'},{id:'twin-worlds',name:'Twin Worlds'},{id:'inland-sea',name:'Inland Sea'},
 {id:'atolls',name:'Atolls'},{id:'supercontinent',name:'Supercontinent'},{id:'fractal',name:'Fractal Wilds'},{id:'earthlike',name:'Earthlike'}
];
const SPAWN_POINTS:Record<string,[number,number]>={northwest:[.16,.16],north:[.5,.12],northeast:[.84,.16],west:[.12,.5],center:[.5,.5],east:[.88,.5],southwest:[.16,.84],south:[.5,.88],southeast:[.84,.84]};
function mapTitle(id:string){return WORLD_MAPS.find(m=>m.id===id)?.name||'Random World';}
function createWorldTiles(mapId:string,seed:number):Tile[]{
 return Array.from({length:WORLD_WIDTH*WORLD_HEIGHT},(_,i)=>{
  const x=i%WORLD_WIDTH,y=Math.floor(i/WORLD_WIDTH),nx=(x-WORLD_WIDTH/2)/(WORLD_WIDTH/2),ny=(y-WORLD_HEIGHT/2)/(WORLD_HEIGHT/2);
  const wave=Math.sin(x*.055+seed)*.42+Math.cos(y*.073-seed*.7)*.36+Math.sin((x+y)*.031+seed*1.4)*.27+Math.cos((x-y)*.039-seed)*.2;
  const n=Math.abs(Math.sin((x+seed*31.7)*12.9898+(y-seed*17.3)*78.233)*43758.5453)%1;
  const d1=Math.hypot((nx+.48)*.94,(ny+.05)*1.12),d2=Math.hypot((nx-.43)*1.05,(ny-.1)*1.06);
  let land=wave>-.2;
  if(mapId==='islands')land=wave>.18;
  if(mapId==='pangaea')land=nx*nx*.86+ny*ny*1.2<.82&&wave>-.95;
  if(mapId==='highlands')land=wave>-.32;
  if(mapId==='twin-worlds')land=(d1<.73||d2<.72)&&wave>-.48;
  if(mapId==='inland-sea')land=wave>-.18&&!(Math.pow(nx/.42,2)+Math.pow(ny/.34,2)<1);
  if(mapId==='atolls'){const r1=Math.abs(Math.hypot(nx+.42,ny+.08)-.34)<.15,r2=Math.abs(Math.hypot(nx-.4,ny-.13)-.3)<.14;land=r1||r2||(wave>.45&&Math.abs(nx)<.8);}
  if(mapId==='supercontinent')land=Math.abs(nx)<.91&&Math.abs(ny)<.82&&wave>-.78;
  if(mapId==='fractal')land=wave>-.05;
  if(mapId==='earthlike')land=(wave>-.08&&(nx<.28||ny>-.38))||(d1<.62&&wave>-.55);
  if(x<2||y<2||x>=WORLD_WIDTH-2||y>=WORLD_HEIGHT-2)land=false;
  if(mapId==='pangaea'&&Math.abs(nx+.16)<.035&&Math.abs(ny-.02)<.16)land=false;
  if(mapId==='inland-sea'&&Math.abs(nx)<.42&&Math.abs(ny)<.34)land=false;
  const mountainChance=mapId==='highlands'?.77:.955;
  const terrain:Tile['terrain']=!land?'water':n>mountainChance?'mountain':n>.66?'forest':'plain';
  return{owner:null,terrain,troops:0,buildings:[]};
 });
}
function getSpawnSites(){
 const sites:number[]=[];
 for(let row=0;row<5;row++)for(let col=0;col<10;col++){
  const x=Math.round(12+col*(WORLD_WIDTH-24)/9),y=Math.round(10+row*(WORLD_HEIGHT-20)/4);
  sites.push(y*WORLD_WIDTH+x);
 }
 return sites;
}
function chooseSpawnSite(preference:string,used:number[],farthest=false){
 const available=getSpawnSites().filter(s=>!used.includes(s));
 if(!available.length)return getSpawnSites().find(s=>!used.includes(s))??Math.floor(WORLD_HEIGHT/2)*WORLD_WIDTH+Math.floor(WORLD_WIDTH/2);
 const point=SPAWN_POINTS[preference]||SPAWN_POINTS.center!;
 available.sort((a,b)=>{
  const ax=(a%WORLD_WIDTH)/WORLD_WIDTH-point[0],ay=Math.floor(a/WORLD_WIDTH)/WORLD_HEIGHT-point[1];
  const bx=(b%WORLD_WIDTH)/WORLD_WIDTH-point[0],by=Math.floor(b/WORLD_WIDTH)/WORLD_HEIGHT-point[1];
  const da=ax*ax+ay*ay,db=bx*bx+by*by;
  if(farthest&&used.length){
   const minA=Math.min(...used.map(u=>Math.hypot(a%WORLD_WIDTH-u%WORLD_WIDTH,Math.floor(a/WORLD_WIDTH)-Math.floor(u/WORLD_WIDTH))));
   const minB=Math.min(...used.map(u=>Math.hypot(b%WORLD_WIDTH-u%WORLD_WIDTH,Math.floor(b/WORLD_WIDTH)-Math.floor(u/WORLD_WIDTH))));
   return minB-minA||da-db;
  }
  return da-db;
 });
 return available[0]!;
}
function clearSpawnArea(tiles:Tile[],at:number,owner:string,playerColor:string){
 const sx=at%WORLD_WIDTH,sy=Math.floor(at/WORLD_WIDTH);
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const x=sx+dx,y=sy+dy;if(x<1||y<1||x>=WORLD_WIDTH-1||y>=WORLD_HEIGHT-1)continue;
  const tile=tiles[y*WORLD_WIDTH+x]!;
  if(tile.terrain==='water'||tile.terrain==='mountain')tile.terrain='plain';
 }
 tiles[at]={owner,terrain:'plain',troops:36,buildings:[]};
}
function playerColor(slot:number){return 'hsl('+((slot*137.508+195)%360).toFixed(1)+' 66% 58%)';}
const BOT_NAMES=['Astra','Vex','Orion','Nova','Mako','Sable','Atlas','Echo','Rune','Nyx','Sol','Kestrel','Mira','Drift','Onyx','Lumen','Rook','Cinder','Aero','Quill','Zephyr','Iris','Juno','Comet','Flint','Argo','Talon','Lyra','Kairo','Ember','Pixel','Nori','Cobalt','Warden','Basil','Riven','Mistral','Sora','Piper','Tundra','Vega','Fable','Koda','Boreal','Axiom','Indigo','Marble','Skye','Tessera'];
function startSinglePlayer(){
 mode='single';if(socket){socket.close();socket=null;}if(localTimer)clearInterval(localTimer);
 selectedSource=-1;activeBuilding=null;matchWinner=null;soloPaused=false;soloSpeed=1;resetCamera();myId='human';
 soloMode=(el('solo-mode') as HTMLSelectElement).value as typeof soloMode;
 soloMap=(el('solo-map') as HTMLSelectElement).value;
 soloBotCount=Math.max(0,Math.min(49,Number((el('solo-bots') as HTMLSelectElement).value)||0));
 const teamMinimum=soloMode==='duos'?3:soloMode==='trios'?5:soloMode==='squads'?7:0;
 if(soloBotCount<teamMinimum){soloBotCount=teamMinimum;(el('solo-bots') as HTMLSelectElement).value=String(teamMinimum);}
 soloDifficulty=(el('solo-difficulty') as HTMLSelectElement).value as typeof soloDifficulty;
 soloWinPercent=Number((el('solo-win') as HTMLSelectElement).value);
 soloLengthMinutes=Number((el('solo-length') as HTMLSelectElement).value);
 soloSpawnPreference=(el('start-region') as HTMLSelectElement).value;
 soloRandomSpawn=(el('sandbox-random') as HTMLInputElement).checked;soloInfiniteGold=(el('sandbox-gold') as HTMLInputElement).checked;soloInfiniteTroops=(el('sandbox-troops') as HTMLInputElement).checked;soloAnonymous=(el('sandbox-anonymous') as HTMLInputElement).checked;
 const actualMap=soloMap==='random'?WORLD_MAPS[Math.floor(Math.random()*WORLD_MAPS.length)]!.id:soloMap;
 const mapName=mapTitle(actualMap);
 const tiles=createWorldTiles(actualMap,Math.random()*1000);
 const teamSize=soloMode==='duos'?2:soloMode==='trios'?3:soloMode==='squads'?4:1;
 const totalPlayers=soloBotCount+1,used:number[]=[];
 const preference=soloRandomSpawn?['northwest','north','northeast','west','center','east','southwest','south','southeast'][Math.floor(Math.random()*9)]!:soloSpawnPreference;
 const humanHome=chooseSpawnSite(preference,used,false);used.push(humanHome);
 const names=soloAnonymous?['Commander',...Array.from({length:49},(_,i)=>'Nation '+String(i+1))]:[nickname,...BOT_NAMES.slice(0,49)];
 const players:Player[]=Array.from({length:totalPlayers},(_,i)=>{
  const home=i===0?humanHome:chooseSpawnSite('center',used,true);
  if(i>0)used.push(home);
  const id=i===0?'human':'bot-'+i;
  clearSpawnArea(tiles,home,id,playerColor(i));
  return{id,name:(names[i]||('Commander '+(i+1)))+(i>BOT_NAMES.length?' '+i:''),color:playerColor(i),gold:160,score:0,connected:true,home,team:Math.floor(i/teamSize)};
 });
 game={width:WORLD_WIDTH,height:WORLD_HEIGHT,tiles,players,tick:0,round:1,mapName,capacity:50};
 setConnection('SOLO MATCH',true);
 el('solo-toolbar').classList.remove('hidden');el('solo-save-actions').classList.remove('hidden');
 (el('pause-solo') as HTMLButtonElement).textContent='Ⅱ PAUSE';
 (el('speed-solo') as HTMLButtonElement).textContent='1× SPEED';
 el('match-banner').classList.add('hidden');
 el('world-name').textContent=mapName.toUpperCase();el('round').textContent='1';
 report(players.length===1?'🌌 Empty frontier. Expand to the land victory target.':'🤖 '+soloBotCount+' AI commanders · '+soloMode.toUpperCase()+' · '+soloDifficulty.toUpperCase()+' · '+mapName.toUpperCase()+'. Select a territory and send an army.');
 render();resetSoloTimer();
}
function resetSoloTimer(){
 if(localTimer)clearInterval(localTimer);
 if(mode==='single'&&!soloPaused&&!matchWinner)localTimer=setInterval(localTick,4000/soloSpeed);
}
function checkSoloWinner(){
 if(!game||mode!=='single'||matchWinner)return;
 const playable=game.tiles.filter(t=>t.terrain!=='water'&&t.terrain!=='mountain').length;
 if(!playable)return;
 const groups=new Map<number,{name:string;id:string;land:number}>();
 for(const p of game.players){
  const team=soloMode==='ffa'?game.players.indexOf(p):(p.team??0);
  const current=groups.get(team)||{name:p.name,id:p.id,land:0};
  current.land+=game.tiles.filter(t=>t.owner===p.id).length;
  if(p.id==='human'){current.name=p.name;current.id=p.id;}
  groups.set(team,current);
 }
 let winningEntry=[...groups.entries()].find(([,group])=>group.land/playable>=soloWinPercent/100);
 const timeExpired=soloLengthMinutes>0&&game.tick>=soloLengthMinutes*15;
 if(!winningEntry&&timeExpired)winningEntry=[...groups.entries()].sort((a,b)=>b[1].land-a[1].land)[0];
 if(!winningEntry)return;
 const [winningTeam,winner]=winningEntry;
 const human=game.players.find(p=>p.id==='human');
 const isPlayerTeam=soloMode==='ffa'?winner.id==='human':(human?.team??0)===winningTeam;
 matchWinner=winner.name;soloPaused=true;if(localTimer)clearInterval(localTimer);
 el('match-result').textContent=isPlayerTeam?'VICTORY':'DEFEAT';
 const landPercent=Math.round(winner.land/playable*100);
 el('match-result-detail').textContent=timeExpired?'Time expired · '+landPercent+'% of playable land.':(soloMode==='ffa'?winner.name:'Team '+(winningTeam+1))+' reached '+soloWinPercent+'% land.';
 el('match-banner').classList.remove('hidden');
 report(winner.name+(soloMode==='ffa'?'':' and their allies')+' won the campaign. Start a new match to play again.');
}
el('pause-solo').addEventListener('click',()=>{
 if(mode!=='single'||matchWinner)return;
 soloPaused=!soloPaused;
 (el('pause-solo') as HTMLButtonElement).textContent=soloPaused?'▶ RESUME':'Ⅱ PAUSE';
 if(soloPaused){if(localTimer)clearInterval(localTimer);report('Campaign paused.');}
 else{report('Campaign resumed.');resetSoloTimer();}
});
el('speed-solo').addEventListener('click',()=>{
 soloSpeed=soloSpeed===1?2:soloSpeed===2?4:1;
 (el('speed-solo') as HTMLButtonElement).textContent=soloSpeed+'× SPEED';
 resetSoloTimer();
});
el('new-solo').addEventListener('click',()=>{startSinglePlayer();});
type SoloSave = {version:1;game:GameState;soloMode:'ffa'|'duos'|'trios'|'squads';soloMap:string;soloBotCount:number;soloDifficulty:'relaxed'|'balanced'|'intense'|'impossible';soloWinPercent:number;soloLengthMinutes:number;soloSpeed:number;soloRandomSpawn:boolean;soloInfiniteGold:boolean;soloInfiniteTroops:boolean;soloAnonymous:boolean};
function makeSoloSave():SoloSave|null{
 if(!game||mode!=='single')return null;
 return {version:1,game:JSON.parse(JSON.stringify(game)) as GameState,soloMode,soloMap,soloBotCount,soloDifficulty,soloWinPercent,soloLengthMinutes,soloSpeed,soloRandomSpawn,soloInfiniteGold,soloInfiniteTroops,soloAnonymous};
}
function restoreSoloSave(value:unknown):boolean{
 if(!value||typeof value!=='object')return false;
 const save=value as Partial<SoloSave>;
 if(save.version!==1||!save.game||save.game.width!==60||save.game.height!==40||!Array.isArray(save.game.tiles)||save.game.tiles.length!==2400||!Array.isArray(save.game.players)||!save.game.players.some(p=>p.id==='human'))return false;
 game={...save.game,tiles:save.game.tiles.map(t=>({...t,buildings:Array.isArray(t.buildings)?t.buildings:[]}))};
 soloMode=save.soloMode==='duos'||save.soloMode==='trios'||save.soloMode==='squads'?save.soloMode:'ffa';
 soloMap=save.soloMap||'continents';soloBotCount=Math.max(0,Math.min(7,Number(save.soloBotCount)||0));
 soloDifficulty=save.soloDifficulty==='relaxed'||save.soloDifficulty==='intense'||save.soloDifficulty==='impossible'?save.soloDifficulty:'balanced';
 soloWinPercent=[60,70,80,90].includes(Number(save.soloWinPercent))?Number(save.soloWinPercent):80;
 soloLengthMinutes=[0,10,20,40].includes(Number(save.soloLengthMinutes))?Number(save.soloLengthMinutes):20;
 soloSpeed=[1,2,4].includes(Number(save.soloSpeed))?Number(save.soloSpeed):1;
 soloRandomSpawn=Boolean(save.soloRandomSpawn);soloInfiniteGold=Boolean(save.soloInfiniteGold);soloInfiniteTroops=Boolean(save.soloInfiniteTroops);soloAnonymous=Boolean(save.soloAnonymous);
 mode='single';myId='human';selectedSource=-1;activeBuilding=null;matchWinner=null;soloPaused=false;resetCamera();
 (el('solo-mode') as HTMLSelectElement).value=soloMode;(el('solo-map') as HTMLSelectElement).value=soloMap;(el('solo-bots') as HTMLSelectElement).value=String(soloBotCount);
 (el('solo-difficulty') as HTMLSelectElement).value=soloDifficulty;(el('solo-win') as HTMLSelectElement).value=String(soloWinPercent);
 (el('sandbox-random') as HTMLInputElement).checked=soloRandomSpawn;(el('sandbox-gold') as HTMLInputElement).checked=soloInfiniteGold;(el('sandbox-troops') as HTMLInputElement).checked=soloInfiniteTroops;(el('sandbox-anonymous') as HTMLInputElement).checked=soloAnonymous;(el('solo-length') as HTMLSelectElement).value=String(soloLengthMinutes);
 (el('speed-solo') as HTMLButtonElement).textContent=soloSpeed+'× SPEED';
 (el('pause-solo') as HTMLButtonElement).textContent='Ⅱ PAUSE';
 el('match-banner').classList.add('hidden');el('solo-toolbar').classList.remove('hidden');el('solo-save-actions').classList.remove('hidden');
 setConnection('SOLO CAMPAIGN',true);showScreen('game');render();resetSoloTimer();return true;
}
el('save-solo').addEventListener('click',()=>{
 const save=makeSoloSave();if(!save){report('Campaign saves are available in Single Player.');return;}
 try{localStorage.setItem('frontier-solo-save',JSON.stringify(save));report('Campaign saved on this device.');}
 catch{report('Could not save. Browser storage may be full. Try exporting the save instead.');}
});
el('load-solo').addEventListener('click',()=>{
 try{const raw=localStorage.getItem('frontier-solo-save');if(!raw){report('No local campaign save found.');return;}if(!restoreSoloSave(JSON.parse(raw)))report('That save file is invalid or incompatible.');else report('Campaign loaded.');}
 catch{report('Could not load the local campaign save.');}
});
el('export-solo').addEventListener('click',()=>{
 const save=makeSoloSave();if(!save){report('Start a solo campaign before exporting.');return;}
 const blob=new Blob([JSON.stringify(save)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='pixel-frontier-campaign.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);report('Campaign export prepared as a JSON save file.');
});
el('import-solo').addEventListener('click',()=>{(el('solo-file') as HTMLInputElement).click();});
el('solo-file').addEventListener('change',async()=>{
 const file=(el('solo-file') as HTMLInputElement).files?.[0];if(!file)return;
 try{const value=JSON.parse(await file.text());if(!restoreSoloSave(value)){report('That campaign file is invalid or from an incompatible version.');return;}localStorage.setItem('frontier-solo-save',JSON.stringify(makeSoloSave()));report('Campaign imported successfully.');}
 catch{report('Could not read that campaign file.');}
 (el('solo-file') as HTMLInputElement).value='';
});
function localClaim(targetIndex:number,percent:number){
 if(!game)return false;const tile=game.tiles[targetIndex];if(!tile||tile.owner===myId||tile.terrain==='mountain'||tile.terrain==='water')return false;
 const targetPlayer=game.players.find(p=>p.id===tile.owner),self=game.players.find(p=>p.id===myId);if(targetPlayer&&self&&soloMode!=='ffa'&&targetPlayer.team===self.team){report('That territory belongs to an ally.');return false;}
 const adjacent=neighborsLocal(targetIndex).filter(n=>game!.tiles[n]!.owner===myId).sort((a,b)=>game!.tiles[b]!.troops-game!.tiles[a]!.troops);
 if(!adjacent.length)return false;const source=game.tiles[adjacent[0]!]!;const sent=Math.floor(source.troops*percent/100);if(sent<1)return false;
 const defense=Math.ceil(tile.troops*((tile.buildings||[]).some(b=>b.type==='defense_post')?2:1));source.troops-=sent;
 if(sent<=defense){tile.troops=Math.max(0,defense-sent);report('Attack repelled. Try a higher troop ratio.');return false;}
 const defender=game.players.find(p=>p.id===tile.owner);if(defender)defender.score=Math.max(0,defender.score-1);
 tile.owner=myId;tile.troops=Math.max(1,sent-defense-1);const me=game.players.find(p=>p.id===myId);if(me)me.score++;return true;
}
const buildCosts:Record<BuildingType,number>={city:100,factory:150,port:120,defense_post:80,market:130,farm:80};
function localBuild(index:number,type:BuildingType){
 if(!game)return false;const tile=game.tiles[index],me=game.players.find(p=>p.id===myId);if(!tile||!me||tile.owner!==myId||tile.terrain==='water'||tile.terrain==='mountain'){report('Build on one of your own land territories.');return false;}
 tile.buildings=tile.buildings||[];const existing=tile.buildings.filter(b=>b.type===type);
 if(type==='port'&&!neighborsLocal(index).some(n=>game!.tiles[n]!.terrain==='water')){report('Ports must be built on a coastline.');return false;}
 const max=type==='city'?4:type==='factory'?3:(type==='market'||type==='farm')?3:1;const currentLevel=type==='city'?(existing[0]?.level||0):existing.length;
 if(currentLevel>=max){report('That building is already at its maximum here.');return false;}
 const cost=buildCosts[type]*(type==='city'?currentLevel+1:1);if(!soloInfiniteGold&&me.gold<cost){report('You need '+cost+' gold for this build.');return false;}
 if(!soloInfiniteGold)me.gold-=cost;if(type==='city'&&existing.length)existing[0]!.level=currentLevel+1;else tile.buildings.push({type,level:1});
 report(type.replace('_',' ').toUpperCase()+' constructed.');return true;
}
function tryBuild(index:number,type:BuildingType){if(mode==='single'){localBuild(index,type);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'build',tile:index,building:type}));}
function localRecruit(player:Player){if(!game||(!soloInfiniteGold&&player.gold<25))return;const home=game.tiles[player.home];if(home?.owner===player.id){if(!soloInfiniteGold)player.gold-=25;home.troops+=15;}}
function botTurn(bot:Player){
 if(!game)return;const owned=game.tiles.map((t,i)=>t.owner===bot.id?i:-1).filter(i=>i>=0);if(!owned.length)return;
 const opts=owned.flatMap(i=>neighborsLocal(i).filter(n=>{const owner=game!.players.find(p=>p.id===game!.tiles[n]!.owner);return game!.tiles[n]!.owner!==bot.id&&game!.tiles[n]!.terrain!=='mountain'&&game!.tiles[n]!.terrain!=='water'&&!(soloMode!=='ffa'&&owner&&owner.team===bot.team);}).map(n=>({source:i,target:n,t:game!.tiles[n]!})));
 const personality=bot.id==='bot-1'?'builder':bot.id==='bot-2'?'raider':'warden';
 opts.sort((a,b)=>{const score=(o:typeof opts[number])=>(o.t.owner?15:8)+(o.t.troops*.35)+(neighborsLocal(o.target).filter(n=>game!.tiles[n]!.owner!==bot.id).length*2)+(personality==='builder'&&!o.t.owner?5:0)+(personality==='raider'&&o.t.owner?7:0);return score(b)-score(a);});
 const pick=opts.find(o=>o.source!==bot.home||game!.tiles[o.source]!.troops>12);if(!pick)return;
 const source=game.tiles[pick.source]!,difficultyForce:Record<typeof soloDifficulty,number>={relaxed:.35,balanced:.62,intense:.8,impossible:.94},personalityScale=personality==='warden'?.75:personality==='raider'?1.12:.9,send=Math.max(1,Math.floor(source.troops*difficultyForce[soloDifficulty]*personalityScale));if(send<=pick.t.troops)return;
 const tile=pick.t,defender=game.players.find(p=>p.id===tile.owner);source.troops-=send;const survivors=send-(tile.owner?tile.troops:0)-1;if(defender)defender.score=Math.max(0,defender.score-1);tile.owner=bot.id;tile.troops=Math.max(1,survivors);bot.score++;
 if(bot.gold>=25&&personality==='warden'&&game.tick%2===0)localRecruit(bot);
}
function botBuild(bot:Player){
 if(!game)return;
 const personality=bot.id==='bot-1'?'builder':bot.id==='bot-2'?'raider':'warden';
 const choices:BuildingType[]=personality==='builder'?['factory','market','farm']:personality==='warden'?['defense_post','farm','market']:['farm','factory'];
 const land=game.tiles.map((tile,index)=>({tile,index})).filter(v=>v.tile.owner===bot.id&&v.tile.terrain!=='mountain'&&v.tile.terrain!=='water');
 for(const type of choices){
  const cost=buildCosts[type];if(bot.gold<cost)continue;
  const eligible=land.find(({tile,index})=>{
   const count=(tile.buildings||[]).filter(b=>b.type===type).length;
   if(type==='port'&&!neighborsLocal(index).some(n=>game!.tiles[n]!.terrain==='water'))return false;
   return count<(type==='factory'||type==='market'||type==='farm'?3:1);
  });
  if(!eligible)continue;
  eligible.tile.buildings=eligible.tile.buildings||[];
  eligible.tile.buildings.push({type,level:1});if(!soloInfiniteGold)bot.gold-=cost;return;
 }
}
function localTick(){if(!game||mode!=='single'||soloPaused||matchWinner)return;game.tick++;for(const p of game.players){const land=game.tiles.filter(t=>t.owner===p.id);const bonus=land.reduce((sum,t)=>sum+(t.buildings||[]).reduce((n,b)=>n+(b.type==='factory'?3:b.type==='city'?b.level*2:b.type==='port'?2:b.type==='market'?4:0),0),0);p.gold=soloInfiniteGold?9999:Math.min(9999,p.gold+Math.max(1,Math.floor(land.length/3))+bonus);if(soloInfiniteTroops)for(const t of land)t.troops=9999;else if(game.tick%2===0)for(const t of land)if(t.troops<(99+((t.buildings||[]).find(b=>b.type==='city')?.level||0)*50))t.troops+=2+(t.buildings||[]).filter(b=>b.type==='farm').length;}for(const bot of game.players.filter(p=>p.id.startsWith('bot-'))){if(soloDifficulty==='relaxed'&&game.tick%2!==0)continue;botTurn(bot);if(soloDifficulty==='intense'||soloDifficulty==='impossible')botTurn(bot);if(soloDifficulty==='impossible'&&game.tick%2===0)botTurn(bot);if(game.tick%3===0)botBuild(bot);}render();checkSoloWinner();}
function applyCamera(){canvas.style.transformOrigin='center center';canvas.style.transform='translate3d('+cameraX+'px,'+cameraY+'px,0) scale('+cameraZoom+')';}
function resetCamera(){cameraZoom=1;cameraX=0;cameraY=0;applyCamera();}
function zoomCamera(delta:number){cameraZoom=Math.max(1,Math.min(2.8,cameraZoom+delta));applyCamera();}
function tileAt(event:MouseEvent|PointerEvent){if(!game)return-1;const r=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)*game.width/r.width),y=Math.floor((event.clientY-r.top)*game.height/r.height);return x>=0&&x<game.width&&y>=0&&y<game.height?y*game.width+x:-1;}
function draw(){
 const targetWidth=Math.max(1800,Math.round(window.innerWidth*1.3/settings.pixelScale)),targetHeight=Math.max(1200,Math.round(window.innerHeight*1.3/settings.pixelScale));
 if(canvas.width!==targetWidth||canvas.height!==targetHeight){canvas.width=targetWidth;canvas.height=targetHeight;}
 const current=game;ctx.clearRect(0,0,canvas.width,canvas.height);if(!current){ctx.fillStyle='#152c31';ctx.fillRect(0,0,canvas.width,canvas.height);return;}
 const w=canvas.width/current.width,h=canvas.height/current.height;
 current.tiles.forEach((tile,i)=>{const x=i%current.width*w,y=Math.floor(i/current.width)*h,owner=current.players.find(p=>p.id===tile.owner),seed=(i*17+Math.floor(i/current.width)*13)%11;
  if(tile.terrain==='water'){ctx.fillStyle='#1c5264';ctx.fillRect(x,y,w,h);ctx.fillStyle='#286d7a';ctx.fillRect(x+2,y+2,w-4,h-4);for(let k=0;k<4;k++){ctx.fillStyle='#65a6aa55';ctx.fillRect(x+((seed*7+k*17)%(w-10)),y+((seed*5+k*13)%(h-5)),Math.max(2,w*.05),2);}return;}
  ctx.fillStyle=owner?.color||'#405c47';ctx.fillRect(x,y,w,h);
  if(tile.terrain==='mountain'){ctx.fillStyle='#98a6a3';ctx.fillRect(x+2,y+2,w-4,h-4);ctx.fillStyle='#d7d9c9';ctx.beginPath();ctx.moveTo(x+w*.12,y+h*.83);ctx.lineTo(x+w*.5,y+h*.15);ctx.lineTo(x+w*.9,y+h*.83);ctx.fill();ctx.fillStyle='#727f7c';ctx.fillRect(x+w*.38,y+h*.69,w*.25,h*.09);}
  else if(tile.terrain==='forest'){ctx.fillStyle=owner?owner.color:'#294c39';ctx.fillRect(x+2,y+2,w-4,h-4);for(let k=0;k<6;k++){const tx=x+((seed*11+k*23)%(w-8))+3,ty=y+((seed*7+k*17)%(h-12))+3;ctx.fillStyle='#18382b';ctx.fillRect(tx,ty,4,7);ctx.fillStyle='#5f8d50';ctx.fillRect(tx-2,ty+2,8,3);}}
  else{ctx.fillStyle=owner?'#ffffff12':'#d4ddb333';for(let k=0;k<12;k++)ctx.fillRect(x+((seed*13+k*19)%(w-4))+2,y+((seed*9+k*11)%(h-4))+2,2,2);}
  const buildings=tile.buildings||[];if(buildings.length){const glyph:Record<string,string>={city:'C',factory:'F',port:'P',defense_post:'D',market:'M',farm:'f'};ctx.fillStyle='#111c20';ctx.fillRect(x+w*.65,y+h*.05,w*.3,h*.25);ctx.fillStyle='#f8e8ad';ctx.font='bold '+Math.max(9,h*.2)+'px monospace';ctx.textAlign='center';ctx.fillText(buildings.slice(0,2).map(b=>glyph[b.type]||'•').join(''),x+w*.8,y+h*.23);}
  if(tile.owner&&settings.counts){ctx.fillStyle='#071116bb';ctx.fillRect(x+w*.22,y+h*.72,w*.56,h*.2);ctx.fillStyle='#fff';ctx.font='bold '+Math.max(7,h*.15)+'px monospace';ctx.textAlign='center';ctx.fillText(String(tile.troops),x+w*.5,y+h*.87);}
  if(i===selectedSource){ctx.strokeStyle='#ffe49a';ctx.lineWidth=Math.max(3,w*.035);ctx.strokeRect(x+2,y+2,w-4,h-4);}
 });
 if(settings.grid){ctx.strokeStyle='rgba(6,13,16,.25)';ctx.lineWidth=1;for(let x=0;x<=current.width;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,canvas.height);ctx.stroke();}for(let y=0;y<=current.height;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(canvas.width,y*h);ctx.stroke();}}
}
function fieldRank(score:number){
 if(score>=180)return 'GRANDMASTER';
 if(score>=120)return 'MASTER';
 if(score>=80)return 'DIAMOND';
 if(score>=50)return 'PLATINUM';
 if(score>=30)return 'GOLD';
 if(score>=15)return 'SILVER';
 if(score>=5)return 'BRONZE';
 return 'IRON';
}
function updateStats(){
 const current=game,me=current?.players.find(p=>p.id===myId),owned=current?.tiles.filter(t=>t.owner===myId).length||0;
 el('gold').textContent=me?String(me.gold):'0';el('territory').textContent=String(owned);el('score').textContent='SCORE '+(me?.score||0);el('rank-label').textContent=fieldRank(me?.score||0);el('online').textContent=String(current?.players.filter(p=>p.connected).length||0);
 el('available-troops').textContent=selectedSource>=0&&current?.tiles[selectedSource]?.owner===myId?String(current.tiles[selectedSource]!.troops):'—';
 const source=current&&selectedSource>=0?current.tiles[selectedSource]:null;
 el('selected-info').textContent=source?'TROOPS '+source.troops+' · '+(source.terrain||'land').toUpperCase()+' · '+(source.buildings||[]).map(b=>b.type.replace('_',' ')).join(', '):'No territory selected';
 el('tile-info').textContent=activeBuilding?'BUILD MODE · '+activeBuilding.replace('_',' ').toUpperCase()+' · CLICK YOUR LAND':'CLICK ADJACENT LAND TO EXPAND · SELECTED '+(selectedSource>=0?'TILE '+selectedSource:'NONE');
 el('tile-title').textContent=activeBuilding?'CONSTRUCTION MODE':'WORLD MAP';
 el('turn').textContent=String(current?.tick||0);
 if(mode==='single'&&soloLengthMinutes>0&&current){const remaining=Math.max(0,soloLengthMinutes*15-current.tick)*4;el('time-left').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');}else el('time-left').textContent='∞';
  const hint=el('build-hint');if(activeBuilding)hint.textContent='Selected: '+activeBuilding.replace('_',' ').toUpperCase()+'. Click one of your own land tiles to construct it. ESC cancels.';else hint.textContent='Choose a structure, then click one of your land tiles. Ports need a coastline; Markets add income; Farms boost troop growth.';
 document.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>button.classList.toggle('build-selected',button.dataset.building===activeBuilding));
}
function render(){if(!game)return;const me=game.players.find(p=>p.id===myId);(el('player-swatch') as HTMLElement).style.background=me?.color||'#e8c76e';el('hud-name').textContent=me?.name||nickname;updateStats();draw();}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
canvas.addEventListener('click',event=>{
 if(!game)return;const index=tileAt(event);if(index<0)return;const tile=game.tiles[index]!;
 if(activeBuilding){tryBuild(index,activeBuilding);if(mode==='single'&&game)render();return;}
 if(tile.owner===myId){selectedSource=index;report('Territory selected. Click adjacent neutral or enemy land to expand.');updateStats();draw();return;}
 const adjacent=neighborsLocal(index).filter(n=>game!.tiles[n]!.owner===myId);
 if(!adjacent.length){selectedSource=-1;updateStats();draw();return;}
 if(mode==='single'){const won=localClaim(index,forcePercent);report(won?'Territory captured!':'Attack failed or was repelled. Try sending more troops.');render();checkSoloWinner();}
 else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'claim',tile:index,percent:forcePercent}));
});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));el('command-panel').classList.toggle('hidden',tab!=='command');el('build-panel').classList.toggle('hidden',tab!=='build');el('units-panel').classList.toggle('hidden',tab!=='units');}));
document.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>button.addEventListener('click',()=>{activeBuilding=button.dataset.building as BuildingType;document.querySelectorAll('[data-building]').forEach(b=>b.classList.toggle('build-selected',b===button));report('Build mode: '+activeBuilding.replace('_',' ').toUpperCase()+'. Click one of your territories.');updateStats();}));
el('recruit').addEventListener('click',()=>{if(mode==='single'&&game){const p=game.players.find(v=>v.id===myId);if(p)localRecruit(p);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'recruit'}));});
function sendQuickChat(message:string){
 const clean=message.split('').map((ch:string)=>{const code=ch.charCodeAt(0);return code<32||code===127?' ':ch;}).join('').trim().slice(0,80);if(!clean)return;
 if(mode==='multi'&&socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'chat',text:clean}));
 else report(nickname+': '+clean);
}
document.querySelectorAll<HTMLButtonElement>('[data-chat]').forEach(button=>button.addEventListener('click',()=>sendQuickChat(button.dataset.chat||'')));
el('send-chat').addEventListener('click',()=>{const input=el('chat-input') as HTMLInputElement;sendQuickChat(input.value);input.value='';});
el('chat-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();el('send-chat').click();}});
el('recruit-large').addEventListener('click',()=>el('recruit').click());
el('clear-selection').addEventListener('click',()=>{activeBuilding=null;selectedSource=-1;updateStats();draw();});
el('center-map').addEventListener('click',resetCamera);
canvas.addEventListener('wheel',event=>{event.preventDefault();zoomCamera(event.deltaY<0?.12:-.12);},{passive:false});
canvas.addEventListener('pointerdown',event=>{if(event.button!==1)return;event.preventDefault();cameraDragging=true;cameraPointer=event.pointerId;cameraStart={x:event.clientX,y:event.clientY,cx:cameraX,cy:cameraY};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(!cameraDragging||!cameraStart||event.pointerId!==cameraPointer)return;cameraX=cameraStart.cx+event.clientX-cameraStart.x;cameraY=cameraStart.cy+event.clientY-cameraStart.y;applyCamera();});
canvas.addEventListener('pointerup',event=>{if(event.pointerId===cameraPointer){cameraDragging=false;cameraStart=null;}});
canvas.addEventListener('pointercancel',()=>{cameraDragging=false;cameraStart=null;});
canvas.addEventListener('contextmenu',event=>{event.preventDefault();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab==='build'));el('command-panel').classList.add('hidden');el('units-panel').classList.add('hidden');el('build-panel').classList.remove('hidden');});
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'){activeBuilding=null;updateStats();draw();return;}
 if(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement||document.activeElement instanceof HTMLSelectElement)return;
 if(event.code==='Space'&&mode==='single'&&!matchWinner){event.preventDefault();el('pause-solo').click();return;}
 if(event.key.toLowerCase()==='c'){resetCamera();return;}
 if(event.key.toLowerCase()==='m'){settings.grid=!settings.grid;draw();return;}
 if(event.key.toLowerCase()==='q'){zoomCamera(-.12);return;}
 if(event.key.toLowerCase()==='e'){zoomCamera(.12);return;}
 const pans:Record<string,[number,number]>={w:[0,48],s:[0,-48],a:[48,0],d:[-48,0]};
 const pan=pans[event.key.toLowerCase()];if(pan){cameraX+=pan[0];cameraY+=pan[1];applyCamera();return;}
 const key=Number(event.key);const list:BuildingType[]=['city','factory','port','defense_post','market','farm'];
 if(key>=1&&key<=6){activeBuilding=list[key-1]!;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab==='build'));el('command-panel').classList.add('hidden');el('units-panel').classList.add('hidden');el('build-panel').classList.remove('hidden');updateStats();}
});
window.addEventListener('resize',()=>{draw();applyCamera();});
applySettings();showScreen('menu');getNickname();
