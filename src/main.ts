import { createClient } from '@supabase/supabase-js';
import './style.css';
import { WorldRenderer } from './world-renderer';

const env = import.meta.env;
const supabase = createClient(
  env.VITE_SUPABASE_URL || 'https://rkenxijtbmiqcgwhvtgr.supabase.co',
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MPWfzhBBPHCTjz-mH3ff4Q_8G1XSfnm'
);
const serverUrl = (env.VITE_SERVER_URL || 'https://YOUR-RENDER-SERVICE.onrender.com').replace(/\/$/, '');
type BuildingType = 'city'|'factory'|'port'|'defense_post'|'market'|'farm';
type Building = {type:BuildingType;level:number};
type Tile = { owner: string | null; terrain: 'plain' | 'forest' | 'mountain' | 'water'; troops: number; buildings?: Building[] };
type Player = { id: string; name: string; color: string; gold: number; score: number; connected: boolean; home: number; team?:number; workerRatio?:number; territory?:number; troopsTotal?:number; troopMax?:number; troopRate?:number; goldRate?:number };
type ShipView = {id:string;owner:string;x:number;y:number;kind:string;path?:number[];step?:number;from?:number;to?:number;destinationOwner?:string};
type GameState = { width: number; height: number; tiles: Tile[]; players: Player[]; tick: number; round?: number; mapName?: string; mapSeed?:number; playable?:number; capacity?: number; ships?:ShipView[]; updates?:Array<[number,Tile]> };
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="menu-screen" class="screen menu-screen">
 <div class="menu-brand">PIXEL <span>FRONTIER</span><small>THE WORLD IS YOURS TO CLAIM</small></div>
 <div class="menu-card">
  <div class="eyebrow">✦ COMMANDER ACCESS</div>
  <h1>Choose your<br><em>frontier.</em></h1>
  <label class="field-label" for="nickname">COMMANDER NAME</label><input id="nickname" maxlength="18" placeholder="Enter nickname" autocomplete="nickname">
  <div class="menu-actions"><button id="menu-single" class="primary big">🎮 SINGLE PLAYER <small>CONFIGURE A SOLO CAMPAIGN</small></button><button id="menu-multi" class="secondary big">🌐 JOIN LIVE MATCH <small>RANDOM WORLD · UP TO 50 COMMANDERS</small></button></div>
  <details class="match-setup" open><summary>🎮 SOLO MATCH SETUP</summary>
   <div class="setup-grid">
    <label>MODE <select id="solo-mode"><option value="ffa">Free for All</option><option value="duos">Duos</option><option value="trios">Trios</option><option value="squads">Squads</option></select></label>
    <label>🗺 MAP <select id="solo-map"><option value="random">🎲 Random World</option><option value="continents">🌎 Continents</option><option value="islands">🏝 Island Chain</option><option value="pangaea">🌐 Pangaea</option><option value="highlands">⛰ Highlands</option><option value="twin-worlds">🌗 Twin Worlds</option><option value="inland-sea">🌊 Inland Sea</option><option value="atolls">🪸 Atolls</option><option value="supercontinent">🧭 Supercontinent</option><option value="fractal">🌀 Fractal Wilds</option><option value="earthlike">🌍 Earthlike</option></select></label>
    <label>🧭 START REGION <select id="start-region"><option value="auto">🎲 Anywhere</option><option value="northwest">↖ Northwest</option><option value="north">↑ North</option><option value="northeast">↗ Northeast</option><option value="west">← West</option><option value="center" selected>◎ Center</option><option value="east">→ East</option><option value="southwest">↙ Southwest</option><option value="south">↓ South</option><option value="southeast">↘ Southeast</option></select></label>
    <label>🤖 AI OPPONENTS <select id="solo-bots"><option>0</option><option>1</option><option>2</option><option>3</option><option>5</option><option>8</option><option>12</option><option>16</option><option>20</option><option selected>24</option><option>32</option><option>40</option><option>49</option></select></label>
    <label>AI DIFFICULTY <select id="solo-difficulty"><option value="relaxed">Relaxed</option><option value="balanced" selected>Balanced</option><option value="intense">Intense</option><option value="impossible">Impossible</option></select></label>
    <label>🏆 WIN CONDITION <select id="solo-win" disabled><option value="80" selected>80% WORLD CONTROL OR LAST STANDING</option></select></label>
    <label>⏱ MATCH LENGTH <select id="solo-length"><option value="0" selected>Unlimited</option><option value="10">10 Minutes</option><option value="20">20 Minutes</option><option value="40">40 Minutes</option></select></label>
   </div>
  </details>
  <details class="sandbox-settings"><summary>🧪 SANDBOX MODIFIERS</summary>
   <div class="sandbox-grid">
    <label><input id="sandbox-random" type="checkbox"> RANDOM SPAWN</label>
    <label><input id="sandbox-gold" type="checkbox"> INFINITE GOLD</label>
    <label><input id="sandbox-troops" type="checkbox"> INFINITE TROOPS</label>
    <label><input id="sandbox-anonymous" type="checkbox"> ANONYMOUS NAMES</label>
   </div>
  </details>
  <details class="account-details"><summary>👤 ACCOUNT / SIGN IN</summary><form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password" required><button class="primary">SIGN IN</button></form><div class="auth-actions"><button id="signup" class="secondary">CREATE ACCOUNT</button><button id="resend" class="secondary">RESEND VERIFY EMAIL</button><button id="logout" class="secondary hidden">SIGN OUT</button></div><p id="auth-message" class="muted">Sign in to keep your account identity.</p></details>
  <button id="menu-settings" class="text-button">⚙ SETTINGS</button>
 </div><div class="menu-version">PIXEL FRONTIER · REALM CONQUEST · BETA</div>
</div>
<div id="settings-screen" class="screen modal-screen hidden"><div class="settings-card"><div class="modal-head"><div><div class="eyebrow">⚙ GAME OPTIONS</div><h2>SETTINGS</h2></div><button id="settings-close" class="secondary">CLOSE ✕</button></div>
 <label class="setting-row">PIXEL SCALE <select id="pixel-scale"><option value="0.5">Micro pixels</option><option value="0.75" selected>Fine pixels</option><option value="1">Standard</option></select></label>
 <label class="setting-row">MAP GRID <input id="grid-toggle" type="checkbox" checked></label>
 <label class="setting-row">SOUND EFFECTS <input id="sound-toggle" type="checkbox"></label>
 <label class="setting-row">SHOW TROOP COUNTS <input id="count-toggle" type="checkbox" checked></label>
 <button id="settings-save" class="primary">✓ SAVE SETTINGS</button>
 </div></div>
<div id="game-screen" class="game-screen hidden">
 <canvas id="map" width="2400" height="1600" aria-label="Fullscreen Pixel Frontier world map"></canvas><canvas id="map-overlay" aria-hidden="true"></canvas>
 <div class="world-topbar">
  <div class="world-brand"><b>✦ PIXEL FRONTIER</b><span id="connection">● OFFLINE</span></div>
  <div class="world-metrics"><span>👑 <b id="commander-label">COMMANDER</b></span><span>🪙 <b id="gold">0</b></span><span>🗺 <b id="territory">0</b></span><span>🏅 <b id="rank-label">IRON</b></span><span>⏱ <b id="turn">0</b></span><span>⌛ <b id="time-left">∞</b></span><span>🌐 <b id="online">0/50</b></span><span>🌎 <b id="world-name">—</b></span><span>🔁 <b id="round">1</b></span></div>
  <div class="world-actions"><div id="solo-toolbar" class="solo-toolbar"><button id="pause-solo" class="world-icon">Ⅱ PAUSE</button><button id="speed-solo" class="world-icon">1× SPEED</button></div><button id="game-settings" class="world-icon">⚙ SETTINGS</button><button id="main-menu" class="world-icon">⌂ MENU</button></div>
 </div>
 <div id="match-banner" class="match-banner hidden"><b id="match-result">VICTORY</b><span id="match-result-detail">Campaign complete</span><button id="new-solo" class="world-icon">NEW CAMPAIGN</button></div>
 <div class="map-inspector"><b id="tile-title">FRONTIER MAP</b><span id="tile-info">🧭 CLICK ANY LAND DIRECTION TO EXPAND · SEND 25% OF YOUR TOTAL TROOPS</span><span class="camera-help">WASD PAN · Q/E ZOOM · C CENTER · M GRID · SPACE PAUSE</span><span id="score">SCORE 0</span></div>
 <div class="minimap-panel"><div>🧭 WORLD RADAR <span>CLICK TO JUMP</span></div><canvas id="mini-map" width="180" height="180"></canvas></div>
 <div class="floating-dock">
  <div class="dock-profile"><i id="player-swatch"></i><div><small>👑 COMMANDER</small><b id="hud-name">GUEST</b></div><div class="dock-gold"><small>⚔ SELECTED TILE</small><b id="available-troops">0</b></div><div class="troop-stock"><div class="troop-stock-label"><small>⚔ TOTAL ARMY</small><b id="troop-cap-label">0 / 0</b></div><div class="troop-stock-track"><i id="troop-cap-fill"></i></div></div></div>
  <div class="dock-main">
   <div class="dock-tabs"><button class="dock-tab active" data-tab="command">⚔ COMMAND</button><button class="dock-tab" data-tab="build">🏗 BUILD</button><button class="dock-tab" data-tab="units">🎒 UNITS</button></div>
   <div id="command-panel" class="dock-panel">
    <div class="ratio-control"><small>⚔ NATION-WIDE EXPANSION</small><div class="troop-choices"><button data-force="25" class="chosen">25%</button><button data-force="50">50%</button><button data-force="75">75%</button><button data-force="100">100%</button></div></div>
    <div class="economy-rates"><div><small>⚔ TROOP GROWTH</small><b id="troop-rate-label">+0.0/s</b></div><div><small>🪙 GOLD INCOME</small><b id="gold-rate-label">+1.0/s</b></div></div>
    <div class="dock-actions"><button id="recruit" class="dock-action">＋ RECRUIT <small>25 GOLD</small></button><button id="boat-mode" class="dock-action">🚢 SETTLE ISLAND <small>60 GOLD · PORT</small></button><button id="center-map" class="dock-action">◎ CENTER MAP</button></div>
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
    <div class="unit-actions"><button id="recruit-large" class="dock-action">＋ RECRUIT TROOPS <small>25 GOLD · +15</small></button><button id="clear-selection" class="dock-action">✕ CLEAR SELECTION</button></div>
    <div class="quick-chat">
     <div class="chat-quick-buttons"><button data-chat="👋 Hello!">👋</button><button data-chat="👍 Nice!">👍</button><button data-chat="🤝 Team up?">🤝</button><button data-chat="🛡️ Defending here">🛡️</button><button data-chat="🏰 Building up">🏰</button></div>
     <div class="chat-entry"><input id="chat-input" maxlength="80" placeholder="Send a quick message…"><button id="send-chat" class="dock-action">SEND</button></div>
    </div>
    <div id="solo-save-actions" class="save-actions"><button id="save-solo" class="dock-action">SAVE</button><button id="load-solo" class="dock-action">LOAD</button><button id="export-solo" class="dock-action">EXPORT</button><button id="import-solo" class="dock-action">IMPORT</button><input id="solo-file" class="hidden" type="file" accept=".json,application/json"></div>
    <div class="dock-hint">🧭 Click any neutral or rival land in the direction you want to expand. No source selection needed: your nation automatically sends the selected share of its total troops. WASD pans · Q/E zoom · C centers · M grid · Space pause.</div>
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
let forcePercent=25,selectedSource=-1,activeBuilding:BuildingType|null=null,mode:'single'|'multi'='single',nickname=localStorage.getItem('frontier-nickname')||'';
let soloMode:'ffa'|'duos'|'trios'|'squads'='ffa',soloMap='random',soloBotCount=24,soloDifficulty:'relaxed'|'balanced'|'intense'|'impossible'='balanced',soloWinPercent=80,soloLengthMinutes=0,soloSpeed=1,soloPaused=false,matchWinner:string|null=null,soloRandomSpawn=false,soloInfiniteGold=false,soloInfiniteTroops=false,soloAnonymous=false,soloSpawnPreference='center',soloWorkerRatio=30,boatMode=false;
let socket:WebSocket|null=null,game:GameState|null=null,myId='',reconnecting=false,localTimer:ReturnType<typeof setInterval>|null=null;
let cameraZoom=8,cameraX=500,cameraY=500,cameraDragging=false,cameraPointer=0,cameraStart:{x:number;y:number;cx:number;cy:number}|null=null,hoverTile=-1;
let requestedChunks=new Set<string>(),receivedChunks=new Set<string>();
const canvas=el('map') as HTMLCanvasElement,overlayCanvas=el('map-overlay') as HTMLCanvasElement,ctx=overlayCanvas.getContext('2d')!;
let worldRenderer:WorldRenderer|null=null;try{worldRenderer=new WorldRenderer(canvas);}catch(error){console.error('Could not initialize the GPU renderer:',error);report('WebGL2 is required for the map renderer.');}
const miniMap=el('mini-map') as HTMLCanvasElement,miniCtx=miniMap.getContext('2d')!;
let selectedLandmassCanvas:HTMLCanvasElement|null=null;
let selectedLandmassMask:Uint8Array|null=null;
let selectedLandmassSeed=-1,selectedLandmassName='',selectedLandmassSize=0;
function clearLandmassSelection(){
 selectedLandmassCanvas=null;selectedLandmassMask=null;selectedLandmassSeed=-1;selectedLandmassName='';selectedLandmassSize=0;
}
function selectLandmass(startIndex:number){
 const current=game;if(!current)return;
 const mapId=mapIdFromTitle(current.mapName||'continents'),seed=current.mapSeed||1;
 if(selectedLandmassMask&&selectedLandmassSeed===seed&&selectedLandmassName===mapId&&selectedLandmassMask[startIndex])return;
 const startX=startIndex%current.width,startY=Math.floor(startIndex/current.width);
 const startTerrain=current.tiles[startIndex]?.terrain||terrainAt(startX,startY,mapId,seed);
 if(startTerrain==='water'){clearLandmassSelection();return;}
 const size=current.width*current.height,mask=new Uint8Array(size),queue=new Int32Array(size);
 let head=0,tail=0;mask[startIndex]=1;queue[tail++]=startIndex;
 const isLand=(index:number)=>{
  const known=current.tiles[index];
  if(known)return known.terrain!=='water';
  return terrainAt(index%current.width,Math.floor(index/current.width),mapId,seed)!=='water';
 };
 while(head<tail){
  const index=queue[head++]!,x=index%current.width,y=Math.floor(index/current.width);
  const visit=(next:number)=>{if(next<0||next>=size||mask[next]||!isLand(next))return;mask[next]=1;queue[tail++]=next;};
  if(x>0)visit(index-1);
  if(x<current.width-1)visit(index+1);
  if(y>0)visit(index-current.width);
  if(y<current.height-1)visit(index+current.width);
 }
 const image=new ImageData(current.width,current.height),pixels=image.data;
 for(let n=0;n<tail;n++){
  const index=queue[n]!,x=index%current.width,y=Math.floor(index/current.width),p=index*4;
  const edge=(x===0||!mask[index-1]||x===current.width-1||!mask[index+1]||
    y===0||!mask[index-current.width]||y===current.height-1||!mask[index+current.width]);
  pixels[p]=edge?115:72;pixels[p+1]=edge?237:190;pixels[p+2]=edge?255:239;pixels[p+3]=edge?190:34;
 }
 const overlay=document.createElement('canvas');overlay.width=current.width;overlay.height=current.height;
 const overlayContext=overlay.getContext('2d');
 if(overlayContext)overlayContext.putImageData(image,0,0);
 selectedLandmassCanvas=overlay;selectedLandmassMask=mask;selectedLandmassSeed=seed;selectedLandmassName=mapId;selectedLandmassSize=tail;
}
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
miniMap.addEventListener('click',event=>{
 if(!game)return;
 const rect=miniMap.getBoundingClientRect();
 cameraX=Math.max(0,Math.min(game.width,((event.clientX-rect.left)/rect.width)*game.width));
 cameraY=Math.max(0,Math.min(game.height,((event.clientY-rect.top)/rect.height)*game.height));
 applyCamera();
});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
el('menu-single').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();startSinglePlayer();showScreen('game');}catch(error){console.error('Single player failed to start:',error);report('Could not start the solo match. Reload the page and try again.');showScreen('menu');}});
el('menu-multi').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();showScreen('game');void connect();}catch(error){console.error('Multiplayer failed to start:',error);report('Could not open multiplayer. Check the server configuration and try again.');showScreen('menu');}});
async function connect(){
 mode='multi';el('solo-toolbar').classList.add('hidden');el('solo-save-actions').classList.add('hidden');if(reconnecting)return;if(serverUrl.includes('YOUR-RENDER')){report('Set VITE_SERVER_URL in GitHub Actions Variables.');return;}
 if(socket?.readyState===WebSocket.OPEN){report('Already connected.');return;}
 setConnection('WAKING SERVER…');report('Waking the online world. Render may take up to a minute.');reconnecting=true;
 for(let attempt=0;attempt<14;attempt++){if(!reconnecting)return;try{const response=await fetch(serverUrl+'/health',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(response.ok){const {data}=await supabase.auth.getSession();const token=data.session?.access_token;socket=new WebSocket(serverUrl.replace(/^http/,'ws')+'/ws',token?['frontier','auth.'+token]:['frontier']);socket.onopen=()=>{setConnection('ONLINE',true);socket?.send(JSON.stringify({type:'join',name:getNickname(),spawnPreference:(el('start-region') as HTMLSelectElement).value}));reconnecting=false;};socket.onmessage=event=>{const packet=JSON.parse(event.data);if(packet.type==='welcome')myId=packet.id;if(packet.type==='state')handleNetworkState(packet.state as GameState);if(packet.type==='chunk')handleNetworkChunk(packet);if(packet.type==='notice'||packet.type==='error')report(packet.text);};socket.onclose=()=>{if(mode==='multi'){setConnection('DISCONNECTED');report('Connection lost. Return to menu and reconnect.');}};socket.onerror=()=>setConnection('CONNECTION ERROR');return;}}catch{}await new Promise(resolve=>setTimeout(resolve,Math.min(1500*(attempt+1),9000)));}
 reconnecting=false;setConnection('SERVER UNAVAILABLE');report('Could not wake server. Check Render and try again.');
}
function neighborsLocal(i:number){if(!game)return[];const x=i%game.width,y=Math.floor(i/game.width);return [x?i-1:-1,x<game.width-1?i+1:-1,y?i-game.width:-1,y<game.height-1?i+game.width:-1].filter(n=>n>=0);}

const WORLD_WIDTH=1000,WORLD_HEIGHT=1000,CHUNK_SIZE=64,MAX_MARCH_DISTANCE=15;
const WORLD_MAPS=[
 {id:'continents',name:'Continents'},{id:'islands',name:'Island Chain'},{id:'pangaea',name:'Pangaea'},
 {id:'highlands',name:'Highlands'},{id:'twin-worlds',name:'Twin Worlds'},{id:'inland-sea',name:'Inland Sea'},
 {id:'atolls',name:'Atolls'},{id:'supercontinent',name:'Supercontinent'},{id:'fractal',name:'Fractal Wilds'},{id:'earthlike',name:'Earthlike'}
];
const SPAWN_POINTS:Record<string,[number,number]>={northwest:[.16,.16],north:[.5,.12],northeast:[.84,.16],west:[.12,.5],center:[.5,.5],east:[.88,.5],southwest:[.16,.84],south:[.5,.88],southeast:[.84,.84]};
function mapTitle(id:string){return WORLD_MAPS.find(m=>m.id===id)?.name||'Random World';}
function mapIdFromTitle(name:string){return WORLD_MAPS.find(m=>m.name.toLowerCase()===String(name).toLowerCase())?.id||String(name||'continents').toLowerCase().replace(/[^a-z]+/g,'-');}
function handleNetworkState(incoming:GameState){
 if(!incoming||!Number.isInteger(incoming.width)||!Number.isInteger(incoming.height))return;
 const newWorld=!game||game.width!==incoming.width||game.height!==incoming.height||game.mapSeed!==incoming.mapSeed;
 if(newWorld){
  game={...incoming,tiles:new Array<Tile>(incoming.width*incoming.height),ships:incoming.ships||[]};
  requestedChunks.clear();receivedChunks.clear();selectedSource=-1;boatMode=false;clearLandmassSelection();localExpansions.length=0;
  const me=incoming.players.find(p=>p.id===myId);
  cameraZoom=8;cameraX=me&&me.home>=0?me.home%incoming.width:incoming.width/2;
  cameraY=me&&me.home>=0?Math.floor(me.home/incoming.width):incoming.height/2;
 }else if(game){
  game.players=incoming.players;game.tick=incoming.tick;game.round=incoming.round;game.mapName=incoming.mapName;game.mapSeed=incoming.mapSeed;game.playable=incoming.playable;game.capacity=incoming.capacity;game.ships=incoming.ships||[];
  for(const [index,tile] of incoming.updates||[])if(index>=0&&index<game.tiles.length)game.tiles[index]=tile;
 }
 setConnection('ONLINE',true);draw();requestChunksForView();updateStats();
}
function handleNetworkChunk(packet:any){
 if(!game||!Array.isArray(packet.items)||Number(packet.mapSeed)!==Number(game.mapSeed))return;
 for(const item of packet.items)if(item&&Number.isInteger(item.i)&&item.tile&&item.i>=0&&item.i<game.tiles.length)game.tiles[item.i]=item.tile as Tile;
 const key=packet.cx+':'+packet.cy;receivedChunks.add(key);requestedChunks.delete(key);render();requestChunksForView();
}
function requestChunkForTile(index:number){
 if(mode!=='multi'||!game||socket?.readyState!==WebSocket.OPEN)return;
 const cx=Math.floor((index%game.width)/CHUNK_SIZE),cy=Math.floor(Math.floor(index/game.width)/CHUNK_SIZE),key=cx+':'+cy;
 if(receivedChunks.has(key)||requestedChunks.has(key))return;
 requestedChunks.add(key);socket.send(JSON.stringify({type:'chunks',chunks:[{x:cx,y:cy}]}));
}
function requestChunksForView(){
 if(mode!=='multi'||!game||socket?.readyState!==WebSocket.OPEN)return;
 const width=canvas.clientWidth||window.innerWidth,height=canvas.clientHeight||window.innerHeight;
 const halfW=width/(2*cameraZoom),halfH=height/(2*cameraZoom);
 const minX=Math.max(0,Math.floor((cameraX-halfW)/CHUNK_SIZE)),maxX=Math.min(Math.ceil(game.width/CHUNK_SIZE)-1,Math.floor((cameraX+halfW)/CHUNK_SIZE));
 const minY=Math.max(0,Math.floor((cameraY-halfH)/CHUNK_SIZE)),maxY=Math.min(Math.ceil(game.height/CHUNK_SIZE)-1,Math.floor((cameraY+halfH)/CHUNK_SIZE));
 const list:{x:number;y:number;d:number}[]=[];
 for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){const key=cx+':'+cy;if(!receivedChunks.has(key)&&!requestedChunks.has(key))list.push({x:cx,y:cy,d:Math.hypot((cx+.5)*CHUNK_SIZE-cameraX,(cy+.5)*CHUNK_SIZE-cameraY)});}
 list.sort((a,b)=>a.d-b.d);const take=list.slice(0,36);
 if(take.length){for(const v of take)requestedChunks.add(v.x+':'+v.y);socket.send(JSON.stringify({type:'chunks',chunks:take.map(v=>({x:v.x,y:v.y}))}));}
}
function latticeNoise(x:number,y:number,seed:number){
 let n=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1442695041))|0;
 n=Math.imul(n^(n>>>13),1274126177);
 return((n^(n>>>16))>>>0)/4294967295;
}
function valueNoise(x:number,y:number,seed:number){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 const a=latticeNoise(ix,iy,seed),b=latticeNoise(ix+1,iy,seed),c=latticeNoise(ix,iy+1,seed),d=latticeNoise(ix+1,iy+1,seed);
 const top=a+(b-a)*sx,bottom=c+(d-c)*sx;
 return top+(bottom-top)*sy;
}
function terrainAt(x:number,y:number,mapId:string,seed:number):Tile['terrain']{
 const nx=(x-WORLD_WIDTH/2)/(WORLD_WIDTH/2),ny=(y-WORLD_HEIGHT/2)/(WORLD_HEIGHT/2);
 const warpX=(valueNoise(x*.004,y*.004,seed+811)-.5)*44;
 const warpY=(valueNoise(x*.004,y*.004,seed+977)-.5)*44;
 const px=x+warpX,py=y+warpY;
 const macro=valueNoise(px*.0032,py*.0032,seed+11)-.5;
 const regional=valueNoise(px*.012,py*.012,seed+73)-.5;
 const detail=valueNoise(px*.04,py*.04,seed+137)-.5;
 const field=macro*.62+regional*.28+detail*.10;
 const d1=Math.hypot((nx+.48)*.94,(ny+.05)*1.12),d2=Math.hypot((nx-.43)*1.05,(ny-.1)*1.06);
 const key=String(mapId||'continents').toLowerCase().replace(/[^a-z]+/g,'-');
 let land=false;
 if(key==='islands'||key==='island-chain')land=field>.12;
 else if(key==='pangaea'){
  const radius=Math.sqrt(nx*nx*.86+ny*ny*1.2);
  land=field+(.88-radius)*.55>-.05;
  if(Math.abs(nx+.16)<.035&&Math.abs(ny-.02)<.16)land=false;
 }else if(key==='highlands')land=field>-.12;
 else if(key==='twin-worlds')land=field+(.9-Math.min(d1/.73,d2/.72))*.44>-.05;
 else if(key==='inland-sea'){
  const seaRadius=Math.sqrt(Math.pow(nx/.42,2)+Math.pow(ny/.34,2));
  land=field>-.03&&seaRadius>.92+detail*.24;
 }else if(key==='atolls'){
  const ring1=Math.abs(Math.hypot(nx+.42,ny+.08)-.34);
  const ring2=Math.abs(Math.hypot(nx-.4,ny-.13)-.3);
  const atoll=Math.max(1-ring1/.17,1-ring2/.16);
  land=atoll+field*.22>.12||(field>.3&&Math.abs(nx)<.8);
 }else if(key==='supercontinent'){
  const edge=Math.max(Math.abs(nx)/.91,Math.abs(ny)/.82);
  land=field+(.98-edge)*.55>-.2;
 }else if(key==='fractal'||key==='fractal-wilds')land=field>-.04;
 else if(key==='earthlike'){
  const continents=Math.max(field+(.78-d1)*.56,field+(.72-d2)*.48);
  land=continents>-.08&&(nx<.28||ny>-.38||d1<.62);
 }else land=field>-.02;
 if(x<2||y<2||x>=WORLD_WIDTH-2||y>=WORLD_HEIGHT-2)land=false;
 if(!land)return'water';
 const elevation=macro*.45+regional*.4+detail*.15;
 const moisture=valueNoise(px*.021,py*.021,seed+313)-.5;
 if(elevation>(key==='highlands'?.075:.205))return'mountain';
 return moisture>.035?'forest':'plain';
}
function baseTileAt(index:number,mapId=mapIdFromTitle(game?.mapName||'continents'),seed=game?.mapSeed||1):Tile{
 const x=index%WORLD_WIDTH,y=Math.floor(index/WORLD_WIDTH);
 return{owner:null,terrain:terrainAt(x,y,mapId||'continents',seed),troops:0,buildings:[]};
}
function getGameTile(index:number):Tile{
 if(!game||index<0||index>=game.width*game.height)return{owner:null,terrain:'water',troops:0,buildings:[]};
 return game.tiles[index]||baseTileAt(index,mapIdFromTitle(game.mapName||'continents'),game.mapSeed||1);
}
function createWorldTiles(mapId:string,seed:number):{tiles:Tile[];playable:number}{
 const tiles=new Array<Tile>(WORLD_WIDTH*WORLD_HEIGHT);let playable=0;
 for(let i=0;i<WORLD_WIDTH*WORLD_HEIGHT;i++){const terrain=terrainAt(i%WORLD_WIDTH,Math.floor(i/WORLD_WIDTH),mapId,seed);if(terrain!=='water'&&terrain!=='mountain')playable++;}
 return{tiles,playable};
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
function clearSpawnArea(tiles:Tile[],at:number,owner:string,playerColor:string,mapId:string,seed:number){
 const sx=at%WORLD_WIDTH,sy=Math.floor(at/WORLD_WIDTH);
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const x=sx+dx,y=sy+dy;if(x<1||y<1||x>=WORLD_WIDTH-1||y>=WORLD_HEIGHT-1)continue;
  const index=y*WORLD_WIDTH+x,existing=tiles[index],terrain=existing?.terrain||terrainAt(x,y,mapId,seed);
  if(terrain==='water'||terrain==='mountain')tiles[index]={owner:null,terrain:'plain',troops:0,buildings:[]};
 }
 tiles[at]={owner,terrain:'plain',troops:36,buildings:[]};
}
function playerColor(slot:number){return 'hsl('+((slot*137.508+195)%360).toFixed(1)+' 66% 58%)';}
const BOT_NAMES=['Astra','Vex','Orion','Nova','Mako','Sable','Atlas','Echo','Rune','Nyx','Sol','Kestrel','Mira','Drift','Onyx','Lumen','Rook','Cinder','Aero','Quill','Zephyr','Iris','Juno','Comet','Flint','Argo','Talon','Lyra','Kairo','Ember','Pixel','Nori','Cobalt','Warden','Basil','Riven','Mistral','Sora','Piper','Tundra','Vega','Fable','Koda','Boreal','Axiom','Indigo','Marble','Skye','Tessera'];
function startSinglePlayer(){
 mode='single';if(socket){socket.close();socket=null;}if(localTimer)clearInterval(localTimer);
 localExpansions.length=0;clearLandmassSelection();selectedSource=-1;activeBuilding=null;matchWinner=null;soloPaused=false;soloSpeed=1;resetCamera();myId='human';
 soloMode=(el('solo-mode') as HTMLSelectElement).value as typeof soloMode;
 soloMap=(el('solo-map') as HTMLSelectElement).value;
 soloBotCount=Math.max(0,Math.min(49,Number((el('solo-bots') as HTMLSelectElement).value)||0));
 const teamMinimum=soloMode==='duos'?3:soloMode==='trios'?5:soloMode==='squads'?7:0;
 if(soloBotCount<teamMinimum){soloBotCount=teamMinimum;(el('solo-bots') as HTMLSelectElement).value=String(teamMinimum);}
 soloDifficulty=(el('solo-difficulty') as HTMLSelectElement).value as typeof soloDifficulty;
 soloWinPercent=80;
 soloLengthMinutes=0;
 soloSpawnPreference=(el('start-region') as HTMLSelectElement).value;
 soloRandomSpawn=(el('sandbox-random') as HTMLInputElement).checked;soloInfiniteGold=(el('sandbox-gold') as HTMLInputElement).checked;soloInfiniteTroops=(el('sandbox-troops') as HTMLInputElement).checked;soloAnonymous=(el('sandbox-anonymous') as HTMLInputElement).checked;
 const actualMap=soloMap==='random'?WORLD_MAPS[Math.floor(Math.random()*WORLD_MAPS.length)]!.id:soloMap;
 const mapName=mapTitle(actualMap);
 const mapSeed=Math.random()*1000,generated=createWorldTiles(actualMap,mapSeed),tiles=generated.tiles;
 const teamSize=soloMode==='duos'?2:soloMode==='trios'?3:soloMode==='squads'?4:1;
 const totalPlayers=soloBotCount+1,used:number[]=[];
 const preference=soloRandomSpawn?['northwest','north','northeast','west','center','east','southwest','south','southeast'][Math.floor(Math.random()*9)]!:soloSpawnPreference;
 const humanHome=chooseSpawnSite(preference,used,false);used.push(humanHome);
 const names=soloAnonymous?['Commander',...Array.from({length:49},(_,i)=>'Nation '+String(i+1))]:[nickname,...BOT_NAMES.slice(0,49)];
 const players:Player[]=Array.from({length:totalPlayers},(_,i)=>{
  const home=i===0?humanHome:chooseSpawnSite('center',used,true);
  if(i>0)used.push(home);
  const id=i===0?'human':'bot-'+i;
  clearSpawnArea(tiles,home,id,playerColor(i),actualMap,mapSeed);
  return{id,name:(names[i]||('Commander '+(i+1)))+(i>BOT_NAMES.length?' '+i:''),color:playerColor(i),gold:160,score:0,connected:true,home,team:Math.floor(i/teamSize),workerRatio:30};
 });
 game={width:WORLD_WIDTH,height:WORLD_HEIGHT,tiles,players,tick:0,round:1,mapName,mapSeed,playable:generated.playable,capacity:50,ships:[]};
 soloWorkerRatio=30;boatMode=false;requestedChunks.clear();receivedChunks.clear();cameraZoom=8;cameraX=humanHome%WORLD_WIDTH;cameraY=Math.floor(humanHome/WORLD_WIDTH);
 setConnection('SOLO MATCH',true);
 el('solo-toolbar').classList.remove('hidden');el('solo-save-actions').classList.remove('hidden');
 (el('pause-solo') as HTMLButtonElement).textContent='Ⅱ PAUSE';
 (el('speed-solo') as HTMLButtonElement).textContent='1× SPEED';
 el('match-banner').classList.add('hidden');
 el('world-name').textContent=mapName.toUpperCase();el('round').textContent='1';
 report(players.length===1?'🌌 Empty frontier. Click any land direction to expand.':'🤖 '+soloBotCount+' AI commanders · '+soloMode.toUpperCase()+' · '+soloDifficulty.toUpperCase()+' · '+mapName.toUpperCase()+'. Click any land direction to expand using 25% of national troops.');
 applyCamera();render();resetSoloTimer();
}
function resetSoloTimer(){
 if(localTimer)clearInterval(localTimer);
 if(mode==='single'&&!soloPaused&&!matchWinner)localTimer=setInterval(localTick,4000/soloSpeed);
}
function checkSoloWinner(){
 if(!game||mode!=='single'||matchWinner)return;
 const playable=game.playable||0;if(!playable)return;
 const landCounts=new Map<string,number>();for(const p of game.players)landCounts.set(p.id,0);
 game.tiles.forEach(tile=>{if(tile?.owner&&landCounts.has(tile.owner))landCounts.set(tile.owner,(landCounts.get(tile.owner)||0)+1);});
 const groups=new Map<number,{name:string;id:string;land:number}>();
 for(const p of game.players){
  const team=soloMode==='ffa'?game.players.indexOf(p):(p.team??0);
  const current=groups.get(team)||{name:p.name,id:p.id,land:0};
  current.land+=(landCounts.get(p.id)||0);
  if(p.id==='human'){current.name=p.name;current.id=p.id;}
  groups.set(team,current);
 }
 const winningEntry=[...groups.entries()].find(([,group])=>group.land/playable>=.8);
 const surviving=[...groups.entries()].filter(([,group])=>group.land>0);
 const lastStanding=groups.size>1&&surviving.length===1;
 const winnerEntry=winningEntry||(lastStanding?surviving[0]:undefined);
 if(!winnerEntry)return;
 const [winningTeam,winner]=winnerEntry;
 const human=game.players.find(p=>p.id==='human');
 const isPlayerTeam=soloMode==='ffa'?winner.id==='human':(human?.team??0)===winningTeam;
 matchWinner=winner.name;soloPaused=true;if(localTimer)clearInterval(localTimer);
 el('match-result').textContent=isPlayerTeam?'VICTORY':'DEFEAT';
 const landPercent=Math.round(winner.land/playable*100);
 el('match-result-detail').textContent=(soloMode==='ffa'?winner.name:'Team '+(winningTeam+1))+(lastStanding?' is the last commander standing.':' reached 80% of the playable world.')+' ('+landPercent+'%).';
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
type SoloSave = {version:2;meta:Omit<GameState,'tiles'|'updates'>;entries:Array<[number,Tile]>;soloMode:'ffa'|'duos'|'trios'|'squads';soloMap:string;soloBotCount:number;soloDifficulty:'relaxed'|'balanced'|'intense'|'impossible';soloWinPercent:number;soloLengthMinutes:number;soloSpeed:number;soloRandomSpawn:boolean;soloInfiniteGold:boolean;soloInfiniteTroops:boolean;soloAnonymous:boolean;soloSpawnPreference?:string;soloWorkerRatio:number};
function makeSoloSave():SoloSave|null{
 if(!game||mode!=='single')return null;
 const entries:Array<[number,Tile]>=[];
 game.tiles.forEach((tile,index)=>{if(tile)entries.push([index,tile]);});
 const {tiles:_tiles,updates:_updates,...meta}=game;
 return{version:2,meta,entries,soloMode,soloMap,soloBotCount,soloDifficulty,soloWinPercent:80,soloLengthMinutes:0,soloSpeed,soloRandomSpawn,soloInfiniteGold,soloInfiniteTroops,soloAnonymous,soloSpawnPreference,soloWorkerRatio};
}
function restoreSoloSave(value:unknown):boolean{
 if(!value||typeof value!=='object')return false;
 const save=value as Partial<SoloSave>&{game?:GameState};
 if(save.version!==2||!save.meta||save.meta.width!==WORLD_WIDTH||save.meta.height!==WORLD_HEIGHT||!Array.isArray(save.entries)||!Array.isArray(save.meta.players)||!save.meta.players.some(p=>p.id==='human'))return false;
 const tiles=new Array<Tile>(WORLD_WIDTH*WORLD_HEIGHT);
 for(const entry of save.entries){
  if(!Array.isArray(entry)||!Number.isInteger(entry[0])||entry[0]<0||entry[0]>=tiles.length||!entry[1])continue;
  tiles[entry[0]]={...entry[1],buildings:Array.isArray(entry[1].buildings)?entry[1].buildings:[]};
 }
 game={...save.meta,tiles,ships:save.meta.ships||[]};
 soloMode=save.soloMode==='duos'||save.soloMode==='trios'||save.soloMode==='squads'?save.soloMode:'ffa';
 soloMap=save.soloMap||'random';soloBotCount=Math.max(0,Math.min(49,Number(save.soloBotCount)||0));
 soloDifficulty=save.soloDifficulty==='relaxed'||save.soloDifficulty==='intense'||save.soloDifficulty==='impossible'?save.soloDifficulty:'balanced';
 soloWinPercent=80;soloLengthMinutes=0;soloSpeed=[1,2,4].includes(Number(save.soloSpeed))?Number(save.soloSpeed):1;
 soloRandomSpawn=Boolean(save.soloRandomSpawn);soloInfiniteGold=Boolean(save.soloInfiniteGold);soloInfiniteTroops=Boolean(save.soloInfiniteTroops);soloAnonymous=Boolean(save.soloAnonymous);
 soloSpawnPreference=save.soloSpawnPreference||'center';soloWorkerRatio=Math.max(0,Math.min(100,Number(save.soloWorkerRatio)||30));
 mode='single';myId='human';localExpansions.length=0;clearLandmassSelection();selectedSource=-1;activeBuilding=null;matchWinner=null;soloPaused=false;boatMode=false;
 (el('solo-mode') as HTMLSelectElement).value=soloMode;(el('solo-map') as HTMLSelectElement).value=soloMap;(el('solo-bots') as HTMLSelectElement).value=String(soloBotCount);
 (el('solo-difficulty') as HTMLSelectElement).value=soloDifficulty;(el('solo-win') as HTMLSelectElement).value='80';
 (el('sandbox-random') as HTMLInputElement).checked=soloRandomSpawn;(el('sandbox-gold') as HTMLInputElement).checked=soloInfiniteGold;(el('sandbox-troops') as HTMLInputElement).checked=soloInfiniteTroops;(el('sandbox-anonymous') as HTMLInputElement).checked=soloAnonymous;(el('start-region') as HTMLSelectElement).value=soloSpawnPreference;(el('solo-length') as HTMLSelectElement).value='0';
 // Worker allocation was replaced by live OpenFront-style income-rate displays.
 (el('speed-solo') as HTMLButtonElement).textContent=soloSpeed+'× SPEED';(el('pause-solo') as HTMLButtonElement).textContent='Ⅱ PAUSE';
 el('match-banner').classList.add('hidden');el('solo-toolbar').classList.remove('hidden');el('solo-save-actions').classList.remove('hidden');
 cameraZoom=8;const me=game.players.find(p=>p.id==='human');cameraX=me?me.home%WORLD_WIDTH:WORLD_WIDTH/2;cameraY=me?Math.floor(me.home/WORLD_WIDTH):WORLD_HEIGHT/2;
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
function marchPath(from:number,to:number){
 if(!game)return[];let x0=from%game.width,y0=Math.floor(from/game.width);const x1=to%game.width,y1=Math.floor(to/game.width);
 const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy,steps=0;const path:number[]=[];
 while(steps<MAX_MARCH_DISTANCE){if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}steps++;if(x0<0||x0>=game.width||y0<0||y0>=game.height)break;path.push(y0*game.width+x0);}
 return path;
}
function areAllies(attackerId:string,ownerId:string|null){
 if(!game||!ownerId||soloMode==='ffa')return false;
 const attacker=game.players.find(p=>p.id===attackerId),defender=game.players.find(p=>p.id===ownerId);
 return !!attacker&&!!defender&&attacker.team===defender.team;
}
type ExpansionCandidate={index:number;edge:number;pressure:number};
type LocalExpansion={owner:string;sent:number;launchIndex:number;candidates:ExpansionCandidate[];cursor:number;captured:number};
const localExpansions:LocalExpansion[]=[];
function localMarch(attackerId:string,targetIndex:number,percent:number){
 if(!game||targetIndex<0||targetIndex>=game.width*game.height)return 0;
 const current=game;
 const target=current.tiles[targetIndex]||getGameTile(targetIndex),attacker=current.players.find(p=>p.id===attackerId);
 if(!attacker||!target||target.owner===attackerId||target.terrain==='water'||target.terrain==='mountain')return 0;
 if(areAllies(attackerId,target.owner)){if(attackerId==='human')report('🤝 That territory belongs to an ally.');return 0;}
 if(localExpansions.filter(exp=>exp.owner===attackerId).length>=2){
  if(attackerId==='human')report('🌐 Your nation already has two expansion fronts moving. Let them advance first.');
  return 0;
 }

 const owned:{index:number;x:number;y:number;tile:Tile}[]=[];
 let totalTroops=0,centerX=0,centerY=0;
 current.tiles.forEach((tile,index)=>{
  if(!tile||tile.owner!==attackerId)return;
  const x=index%current.width,y=Math.floor(index/current.width);
  owned.push({index,x,y,tile});totalTroops+=tile.troops;centerX+=x;centerY+=y;
 });
 if(!owned.length||totalTroops<1){if(attackerId==='human')report('⚔ Your nation has no available troops.');return 0;}
 centerX/=owned.length;centerY/=owned.length;
 const tx=targetIndex%current.width,ty=Math.floor(targetIndex/current.width);
 let dirX=tx-centerX,dirY=ty-centerY,distance=Math.hypot(dirX,dirY);
 if(distance<0.001&&attacker.home>=0){
  dirX=(attacker.home%current.width)-centerX;dirY=Math.floor(attacker.home/current.width)-centerY;distance=Math.hypot(dirX,dirY);
 }
 if(distance<0.001){dirX=1;dirY=0;distance=1;}
 dirX/=distance;dirY/=distance;

 let launchIndex=-1,bestScore=-Infinity;
 for(const cell of owned){
  const border=neighborsLocal(cell.index).some(next=>{
   const t=getGameTile(next);
   return t.owner!==attackerId&&t.terrain!=='water'&&t.terrain!=='mountain';
  });
  if(!border)continue;
  const rx=cell.x-centerX,ry=cell.y-centerY;
  const forward=rx*dirX+ry*dirY,lateral=Math.abs(rx*dirY-ry*dirX);
  const targetDistance=Math.hypot(tx-cell.x,ty-cell.y);
  const score=forward-lateral*.32-targetDistance*.015;
  if(score>bestScore){bestScore=score;launchIndex=cell.index;}
 }
 if(launchIndex<0){
  let nearest=Infinity;
  for(const cell of owned){const d=Math.hypot(tx-cell.x,ty-cell.y);if(d<nearest){nearest=d;launchIndex=cell.index;}}
 }
 const sx=launchIndex%current.width,sy=Math.floor(launchIndex/current.width);
 const sent=Math.floor(totalTroops*Math.max(1,Math.min(100,percent))/100);
 if(sent<1){if(attackerId==='human')report('⚔ Not enough troops available.');return 0;}

 const radius=Math.min(18,Math.max(2.5,1.7+Math.sqrt(sent)*.28));
 const extent=Math.ceil(radius*1.45),fieldSeed=(current.mapSeed||1)+launchIndex*17+targetIndex*31+sent*13;
 const minX=Math.max(0,sx-extent),maxX=Math.min(current.width-1,sx+extent);
 const minY=Math.max(0,sy-extent),maxY=Math.min(current.height-1,sy+extent);
 const candidates:ExpansionCandidate[]=[];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const rx=x-sx,ry=y-sy,forward=rx*dirX+ry*dirY,lateral=Math.abs(rx*dirY-ry*dirX);
  const normalized=Math.hypot(lateral/(radius*.86),(forward-radius*.13)/(radius*1.1));
  const warped=normalized-(valueNoise(x*.16,y*.16,fieldSeed)-.5)*.14;
  if(warped>=1||forward< -radius*.55||(!rx&&!ry))continue;
  const falloff=Math.pow(Math.max(0,1-warped),.72);
  const pressure=sent/(radius*radius*.96)*falloff*(.86+.14*Math.max(0,forward/radius));
  if(pressure>=1)candidates.push({index:y*current.width+x,edge:warped,pressure});
 }
 candidates.sort((a,b)=>a.edge-b.edge);
 if(!candidates.length){if(attackerId==='human')report('🛡 There is no reachable land in that direction.');return 0;}

 // Reserve the troop percentage now; land ownership advances as the front moves.
 const withdrawal=sent/totalTroops;
 for(const cell of owned)cell.tile.troops=Math.max(0,cell.tile.troops*(1-withdrawal));
 localExpansions.push({owner:attackerId,sent,launchIndex,candidates,cursor:0,captured:0});
 if(attackerId==='human')report('🌐 Expansion front launched from your outer border. The highlighted continent is selected while the border advances.');
 return candidates.length;
}
function localClaim(targetIndex:number,percent:number){return localMarch('human',targetIndex,percent)>0;}
function advanceLocalExpansions(){
 const current=game;
 if(!current||mode!=='single'||soloPaused||matchWinner||!localExpansions.length)return;
 let changed=false,finished=false;
 for(let e=localExpansions.length-1;e>=0;e--){
  const expansion=localExpansions[e]!;
  const attacker=current.players.find(p=>p.id===expansion.owner);
  if(!attacker){localExpansions.splice(e,1);continue;}
  const batch=Math.max(1,Math.ceil(expansion.candidates.length/42));
  const end=Math.min(expansion.candidates.length,expansion.cursor+batch);
  while(expansion.cursor<end){
   const candidate=expansion.candidates[expansion.cursor++]!;
   const index=candidate.index,tile=current.tiles[index]||getGameTile(index);
   current.tiles[index]=tile;
   if(tile.terrain==='water'||tile.terrain==='mountain'||tile.owner===expansion.owner||areAllies(expansion.owner,tile.owner))continue;
   const defender=Math.ceil(tile.troops*((tile.buildings||[]).some(b=>b.type==='defense_post')?2:1));
   const required=defender+1;
   if(candidate.pressure<required){
    if(tile.owner&&defender>0){tile.troops=Math.max(0,defender-Math.floor(candidate.pressure));changed=true;}
    continue;
   }
   if(tile.owner){const previous=current.players.find(p=>p.id===tile.owner);if(previous)previous.score=Math.max(0,previous.score-1);}
   tile.owner=expansion.owner;tile.troops=Math.max(0,Math.floor(candidate.pressure-required));
   attacker.score++;expansion.captured++;changed=true;
  }
  if(expansion.cursor>=expansion.candidates.length){
   if(!expansion.captured){
    const refund=Math.floor(expansion.sent*.7),home=current.tiles[attacker.home]?.owner===expansion.owner?attacker.home:expansion.launchIndex;
    if(home>=0){current.tiles[home]!.troops+=refund;changed=true;}
    if(expansion.owner==='human')report('🛡 The advancing front ran out of strength; most troops returned.');
   }else if(expansion.owner==='human'){
    report('🌎 Border expansion complete. '+expansion.captured+' land tiles joined your continent.');
   }
   localExpansions.splice(e,1);finished=true;
  }
 }
 if(changed||finished){render();checkSoloWinner();}
}
setInterval(advanceLocalExpansions,110);
const buildCosts:Record<BuildingType,number>={city:100,factory:150,port:120,defense_post:80,market:130,farm:80};
function localBuild(index:number,type:BuildingType){
 if(!game)return false;const tile=game.tiles[index]||getGameTile(index),me=game.players.find(p=>p.id===myId);game.tiles[index]=tile;if(!tile||!me||tile.owner!==myId||tile.terrain==='water'||tile.terrain==='mountain'){report('Build on one of your own land territories.');return false;}
 tile.buildings=tile.buildings||[];const existing=tile.buildings.filter(b=>b.type===type);
 if(type==='port'&&!neighborsLocal(index).some(n=>getGameTile(n).terrain==='water')){report('Ports must be built on a coastline.');return false;}
 const max=type==='city'?4:type==='factory'?3:(type==='market'||type==='farm')?3:1;const currentLevel=type==='city'?(existing[0]?.level||0):existing.length;
 if(currentLevel>=max){report('That building is already at its maximum here.');return false;}
 const cost=buildCosts[type]*(type==='city'?currentLevel+1:1);if(!soloInfiniteGold&&me.gold<cost){report('You need '+cost+' gold for this build.');return false;}
 if(!soloInfiniteGold)me.gold-=cost;if(type==='city'&&existing.length)existing[0]!.level=currentLevel+1;else tile.buildings.push({type,level:1});
 report(type.replace('_',' ').toUpperCase()+' constructed.');return true;
}
function tryBuild(index:number,type:BuildingType){if(mode==='single'){localBuild(index,type);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'build',tile:index,building:type}));}
function localRecruit(player:Player){if(!game||(!soloInfiniteGold&&player.gold<25))return;const home=game.tiles[player.home]||getGameTile(player.home);game.tiles[player.home]=home;if(home?.owner===player.id){if(!soloInfiniteGold)player.gold-=25;home.troops+=15;}}
function botTurn(bot:Player,ownedInput?:number[]){
 if(!game)return false;
 const owned=ownedInput||[];
 if(!ownedInput)game.tiles.forEach((tile,i)=>{if(tile&&tile.owner===bot.id&&tile.troops>=8)owned.push(i);});

 if(!owned.length)return false;
 const directions:[number,number][]=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const stride=Math.max(1,Math.floor(owned.length/90)),candidates:{source:number;target:number;score:number}[]=[];
 for(let oi=0;oi<owned.length;oi+=stride){
  const source=owned[oi]!,sx=source%game.width,sy=Math.floor(source/game.width),army=game.tiles[source]!.troops;
  for(const [dx,dy] of directions){
   for(const distance of [5,9,13,MAX_MARCH_DISTANCE]){
    const x=sx+dx*distance,y=sy+dy*distance;if(x<0||y<0||x>=game.width||y>=game.height)continue;
    const target=y*game.width+x,targetTile=getGameTile(target);if(targetTile.owner===bot.id)continue;
    const route=marchPath(source,target);let reachable=0,score=0;
    for(const step of route){
     const tile=getGameTile(step);game.tiles[step]=tile;
     if(tile.terrain==='water'||tile.terrain==='mountain'||areAllies(bot.id,tile.owner))break;
     if(tile.owner===bot.id)continue;
     reachable++;
     if(tile.owner){score+=7-Math.min(6,tile.troops*.28);const defender=game.players.find(p=>p.id===tile.owner);if(defender&&defender.home===step)score+=5;}
     else score+=3.7;
     if(reachable>=12)break;
    }
    if(!reachable)continue;
    score+=reachable*1.5+Math.random()*1.8-distance*.035-Math.max(0,18-army)*.28;
    candidates.push({source,target,score});
   }
  }
 }
 candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)return false;
 const pick=candidates[Math.floor(Math.random()*Math.min(3,candidates.length))]!;
 const sendPercent:Record<typeof soloDifficulty,number>={relaxed:48,balanced:66,intense:82,impossible:94};
 const captured=localMarch(bot.id,pick.target,sendPercent[soloDifficulty]);
 if(captured&&bot.gold>=25&&game.tick%2===0)localRecruit(bot);
 return captured>0;
}
function botBuild(bot:Player,ownedInput?:number[]){
 if(!game)return;
 const personality=bot.id==='bot-1'?'builder':bot.id==='bot-2'?'raider':'warden';
 const choices:BuildingType[]=personality==='builder'?['factory','market','farm']:personality==='warden'?['defense_post','farm','market']:['farm','factory'];
 const land:{tile:Tile;index:number}[]=[];
 if(ownedInput){for(const index of ownedInput){const tile=getGameTile(index);if(tile.owner===bot.id)land.push({tile,index});}}
 else game.tiles.forEach((tile,index)=>{if(tile&&tile.owner===bot.id&&tile.terrain!=='mountain'&&tile.terrain!=='water')land.push({tile,index});});
 for(const type of choices){
  const cost=buildCosts[type];if(bot.gold<cost)continue;
  const eligible=land.find(({tile,index})=>{
   const count=(tile.buildings||[]).filter(b=>b.type===type).length;
   if(type==='port'&&!neighborsLocal(index).some(n=>getGameTile(n).terrain==='water'))return false;
   return count<(type==='factory'||type==='market'||type==='farm'?3:1);
  });
  if(!eligible)continue;
  eligible.tile.buildings=eligible.tile.buildings||[];eligible.tile.buildings.push({type,level:1});game.tiles[eligible.index]=eligible.tile;
  if(!soloInfiniteGold)bot.gold-=cost;return;
 }
}
function localSeaRoute(from:number,to:number):number[]{
 if(!game)return[];
 const starts=neighborsLocal(from).filter(i=>getGameTile(i).terrain==='water');
 const goals=new Set(neighborsLocal(to).filter(i=>getGameTile(i).terrain==='water'));
 if(!starts.length||!goals.size)return[];
 const previous=new Int32Array(game.tiles.length);previous.fill(-2);
 const queue=new Int32Array(game.tiles.length);let head=0,tail=0,goal=-1;
 for(const i of starts){previous[i]=-1;queue[tail++]=i;}
 while(head<tail&&tail<game.tiles.length){
  const current=queue[head++];if(goals.has(current)){goal=current;break;}
  for(const next of neighborsLocal(current)){if(previous[next]!==-2||getGameTile(next).terrain!=='water')continue;previous[next]=current;queue[tail++]=next;}
 }
 if(goal<0)return[];
 const path:number[]=[];let at=goal;while(at>=0){path.push(at);at=previous[at]!;}path.reverse();return[from,...path,to];
}
function localSendBoat(sourceIndex:number,targetIndex:number){
 if(!game)return false;
 const source=getGameTile(sourceIndex),target=getGameTile(targetIndex),me=game.players.find(p=>p.id==='human');
 if(!me||source.owner!=='human'||!(source.buildings||[]).some(b=>b.type==='port')||!neighborsLocal(sourceIndex).some(n=>getGameTile(n).terrain==='water')){report('🚢 Build a Port on your coast and select it first.');return false;}
 if(target.owner!==null||target.terrain==='water'||target.terrain==='mountain'||!neighborsLocal(targetIndex).some(n=>getGameTile(n).terrain==='water')){report('🏝 Ferries can only settle an unclaimed coastal tile.');return false;}
 if(!soloInfiniteGold&&me.gold<60){report('A settlement ferry costs 60 gold.');return false;}
 const path=localSeaRoute(sourceIndex,targetIndex);if(path.length<3){report('No open sea route reaches that coast.');return false;}
 if(!soloInfiniteGold)me.gold-=60;
 game.ships=game.ships||[];game.ships.push({id:'colony-'+game.tick+'-'+Math.random().toString(36).slice(2),owner:'human',x:sourceIndex%game.width,y:Math.floor(sourceIndex/game.width),kind:'colony',from:sourceIndex,to:targetIndex,path,step:0});
 report('🚢 Settlement ferry launched. It will establish a new coastal settlement when it arrives.');
 return true;
}
function advanceLocalShips(){
 if(!game)return;
 const fleet=game.ships||[];
 for(let i=fleet.length-1;i>=0;i--){
  const ship=fleet[i] as ShipView & {path?:number[];step?:number;from?:number;to?:number;destinationOwner?:string};
  if(!ship.path?.length)continue;
  ship.step=Math.min(ship.path.length-1,(ship.step||0)+8);
  const pos=ship.path[ship.step]||ship.from||0;ship.x=pos%game.width;ship.y=Math.floor(pos/game.width);
  if(ship.step>=ship.path.length-1){
   if(ship.kind==='colony'){
    const tile=getGameTile(ship.to??pos);
    if(tile.owner===null&&tile.terrain!=='water'&&tile.terrain!=='mountain'){tile.owner=ship.owner;tile.troops=1;game.tiles[ship.to??pos]=tile;const owner=game.players.find(p=>p.id===ship.owner);if(owner)owner.score++;if(ship.owner==='human')report('🏝 New island settlement established!');}
   }else if(ship.kind==='trade'){
    const from=game.players.find(p=>p.id===ship.owner),to=ship.destinationOwner?game.players.find(p=>p.id===ship.destinationOwner):from;
    const payout=Math.min(250,Math.max(20,Math.floor(ship.path.length*.3)));if(from)from.gold+=payout;if(to&&to.id!==from?.id)to.gold+=payout;
   }
   fleet.splice(i,1);
  }
 }
 game.ships=fleet;
}
function troopGrowthPerSecond(troops:number,maxTroops:number,multiplier=1){
 if(maxTroops<=0||troops>=maxTroops)return 0;
 const openFrontScaledPerTick=.01+Math.pow(Math.max(0,troops),.73)/(4*Math.pow(1000,.27));
 return Math.max(0,openFrontScaledPerTick*10*(1-troops/maxTroops)*multiplier);
}
function localTick(){
 if(!game||mode!=='single'||soloPaused||matchWinner)return;
 game.tick++;
 const durationSeconds=4*soloSpeed;
 const summary=new Map<string,{land:number;troops:number;cityLevels:number;farms:number;income:number;owned:number[]}>();
 for(const p of game.players)summary.set(p.id,{land:0,troops:0,cityLevels:0,farms:0,income:0,owned:[]});
 for(let i=0;i<game.tiles.length;i++){
  const tile=game.tiles[i];if(!tile||!tile.owner)continue;
  const stats=summary.get(tile.owner);if(!stats)continue;
  stats.land++;stats.troops+=tile.troops;stats.owned.push(i);
  for(const building of tile.buildings||[]){
   if(building.type==='city'){stats.cityLevels+=building.level;stats.income+=building.level*2;}
   if(building.type==='factory')stats.income+=3;
   if(building.type==='port')stats.income+=2;
   if(building.type==='market')stats.income+=4;
   if(building.type==='farm')stats.farms++;
  }
 }
 for(const p of game.players){
  const stats=summary.get(p.id)!;
  const maxTroops=Math.floor(2*(Math.pow(Math.max(1,stats.land),.6)+50)+stats.cityLevels*250);
  const bot=p.id.startsWith('bot-');
  const baseGoldPerSecond=bot ? 0.5 : 1;
  const troopRate=troopGrowthPerSecond(stats.troops,maxTroops,bot?.5:1)*(1+Math.min(12,stats.farms)*.08);
  p.territory=stats.land;p.troopsTotal=stats.troops;p.troopMax=maxTroops;
  p.troopRate=soloInfiniteTroops&&p.id==='human'?0:troopRate;
  p.goldRate=baseGoldPerSecond+stats.income/durationSeconds;
  p.gold=(soloInfiniteGold&&p.id==='human')?999999:Math.min(999999,p.gold+baseGoldPerSecond*durationSeconds+stats.income);
  if(soloInfiniteTroops&&p.id==='human'){
   for(const i of stats.owned)game.tiles[i]!.troops=9999;
   p.troopsTotal=stats.owned.length*9999;
  }else if(stats.owned.length){
   const home=game.tiles[p.home]?.owner===p.id?p.home:stats.owned[0]!;
   const add=Math.min(Math.max(0,maxTroops-stats.troops),troopRate*durationSeconds);
   if(add>0){game.tiles[home]!.troops+=add;p.troopsTotal=stats.troops+add;}
  }
 }
 advanceLocalShips();
 if(game.tick%20===0&&(game.ships||[]).filter(s=>s.kind==='trade').length<6){
  const ports:number[]=[];game.tiles.forEach((tile,i)=>{if(tile&&tile.owner&&(tile.buildings||[]).some(b=>b.type==='port'))ports.push(i);});
  if(ports.length>=2){const a=ports[Math.floor(Math.random()*ports.length)]!,b=ports.find(i=>i!==a);if(b){const path=localSeaRoute(a,b);if(path.length>2){const owner=game.tiles[a]!.owner||'human',targetOwner=game.tiles[b]!.owner||owner;game.ships=game.ships||[];game.ships.push({id:'trade-'+game.tick,owner,x:a%game.width,y:Math.floor(a/game.width),kind:'trade',from:a,to:b,path,step:0,destinationOwner:targetOwner} as any);}}}
 }
 for(const botPlayer of game.players.filter(p=>p.id.startsWith('bot-'))){
  if(soloDifficulty==='relaxed'&&game.tick%2!==0)continue;
  const owned=summary.get(botPlayer.id)?.owned||[];
  const actions=soloDifficulty==='impossible'?3:soloDifficulty==='intense'?2:1;
  for(let a=0;a<actions;a++)botTurn(botPlayer,owned);
  if(game.tick%3===0)botBuild(botPlayer,owned);
 }
 render();checkSoloWinner();
}
function applyCamera(){draw();drawMiniMap();requestChunksForView();}
function resetCamera(){
 cameraZoom=8;
 if(game){const me=game.players.find(p=>p.id===myId);if(me&&me.home>=0){cameraX=me.home%game.width;cameraY=Math.floor(me.home/game.width);}else{cameraX=game.width/2;cameraY=game.height/2;}}
 else{cameraX=WORLD_WIDTH/2;cameraY=WORLD_HEIGHT/2;}
 applyCamera();
}
function zoomCamera(delta:number){cameraZoom=Math.max(2,Math.min(32,cameraZoom*(1+delta)));applyCamera();}
function tileAt(event:MouseEvent|PointerEvent){
 if(!game)return-1;
 const r=canvas.getBoundingClientRect(),x=Math.floor(cameraX+(event.clientX-r.left-r.width/2)/cameraZoom),y=Math.floor(cameraY+(event.clientY-r.top-r.height/2)/cameraZoom);
 return x>=0&&x<game.width&&y>=0&&y<game.height?y*game.width+x:-1;
}
function drawMiniMap(){
 if(!game)return;
 const w=miniMap.width,h=miniMap.height;
 miniCtx.clearRect(0,0,w,h);miniCtx.fillStyle='#071a29';miniCtx.fillRect(0,0,w,h);
 const sx=game.width/w,sy=game.height/h,ownerMap=new Map(game.players.map(p=>[p.id,p]));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const wx=Math.min(game.width-1,Math.floor((x+.5)*sx)),wy=Math.min(game.height-1,Math.floor((y+.5)*sy)),i=wy*game.width+wx;
  const tile=game.tiles[i]||baseTileAt(i,mapIdFromTitle(game.mapName||'continents'),game.mapSeed||1);
  const owner=tile.owner?ownerMap.get(tile.owner):undefined;
  miniCtx.fillStyle=owner?.color||(tile.terrain==='water'?'#123e58':tile.terrain==='mountain'?'#627481':tile.terrain==='forest'?'#24543e':'#527b57');
  miniCtx.fillRect(x,y,1,1);
 }
 for(const player of game.players){
  if(player.home<0)continue;
  const x=(player.home%game.width)/game.width*w,y=Math.floor(player.home/game.width)/game.height*h;
  miniCtx.fillStyle=player.color;miniCtx.beginPath();miniCtx.arc(x,y,player.id===myId?3:2,0,Math.PI*2);miniCtx.fill();
 }
 const viewW=Math.min(w,(window.innerWidth/cameraZoom)/game.width*w);
 const viewH=Math.min(h,(window.innerHeight/cameraZoom)/game.height*h);
 const left=Math.max(0,Math.min(w-viewW,(cameraX-viewW*sx/2)/game.width*w));
 const top=Math.max(0,Math.min(h-viewH,(cameraY-viewH*sy/2)/game.height*h));
 miniCtx.strokeStyle='#9af4ff';miniCtx.lineWidth=1.5;miniCtx.shadowColor='#5beaff';miniCtx.shadowBlur=5;
 miniCtx.strokeRect(left,top,Math.max(2,viewW),Math.max(2,viewH));miniCtx.shadowBlur=0;
}
function draw(){
 const cssW=canvas.clientWidth||window.innerWidth,cssH=canvas.clientHeight||window.innerHeight;
 const dpr=Math.min(window.devicePixelRatio||1,1.75),bufferW=Math.max(1,Math.round(cssW*dpr)),bufferH=Math.max(1,Math.round(cssH*dpr));
 if(overlayCanvas.width!==bufferW||overlayCanvas.height!==bufferH){overlayCanvas.width=bufferW;overlayCanvas.height=bufferH;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
 const current=game;
 if(!current){worldRenderer?.clear();return;}
 if(worldRenderer){
  try{
   const mapId=mapIdFromTitle(current.mapName||'continents'),seed=current.mapSeed||1;
   worldRenderer.draw({width:current.width,height:current.height,tiles:current.tiles,players:current.players,mapName:current.mapName||mapId,mapSeed:seed,cameraX,cameraY,zoom:cameraZoom,showGrid:settings.grid},
    (x,y)=>terrainAt(x,y,mapId,seed));
  }catch(error){console.error('GPU world rendering failed:',error);report('GPU renderer error: '+(error instanceof Error?error.message:'unknown error'));worldRenderer=null;}
 }
 const tilePx=cameraZoom;
 if(current.ships)for(const ship of current.ships){
  let sx=ship.x,sy=ship.y;
  if(ship.path?.length){const at=ship.path[Math.min(ship.step||0,ship.path.length-1)]!;sx=at%current.width;sy=Math.floor(at/current.width);}
  const x=(sx-cameraX)*tilePx+cssW/2,y=(sy-cameraY)*tilePx+cssH/2;
  if(x<-tilePx||y<-tilePx||x>cssW+tilePx||y>cssH+tilePx)continue;
  ctx.save();ctx.font='bold '+Math.max(9,tilePx*1.15)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#79ecff';ctx.shadowBlur=9;ctx.fillStyle='#e7fdff';ctx.fillText(ship.kind==='trade'?'⛴':'🚢',x+tilePx/2,y+tilePx/2);ctx.restore();
 }
 if(selectedLandmassCanvas&&selectedLandmassSeed===(current.mapSeed||1)){
  const sx=Math.max(0,Math.floor(cameraX-cssW/(2*tilePx))-2),sy=Math.max(0,Math.floor(cameraY-cssH/(2*tilePx))-2);
  const ex=Math.min(current.width,Math.ceil(cameraX+cssW/(2*tilePx))+2),ey=Math.min(current.height,Math.ceil(cameraY+cssH/(2*tilePx))+2);
  const sw=Math.max(0,ex-sx),sh=Math.max(0,ey-sy);
  if(sw&&sh){
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.9;ctx.imageSmoothingEnabled=true;
   ctx.drawImage(selectedLandmassCanvas,sx,sy,sw,sh,(sx-cameraX)*tilePx+cssW/2,(sy-cameraY)*tilePx+cssH/2,sw*tilePx,sh*tilePx);
   ctx.restore();
  }
 }

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
 const current=game,me=current?.players.find(p=>p.id===myId);
 let owned=0,troopCurrent=0,cityLevels=0;
 current?.tiles.forEach(tile=>{
  if(!tile||tile.owner!==myId)return;
  owned++;troopCurrent+=tile.troops;
  for(const building of tile.buildings||[])if(building.type==='city')cityLevels+=building.level;
 });
 if(mode==='multi'&&me?.territory!==undefined)owned=me.territory;
 if(mode==='multi'&&me?.troopsTotal!==undefined)troopCurrent=me.troopsTotal;
 const calculatedCap=Math.floor(2*(Math.pow(Math.max(1,owned),.6)+50)+cityLevels*250);
 const troopMaximum=mode==='multi'?(me?.troopMax??calculatedCap):calculatedCap;
 const troopRate=me?.troopRate??troopGrowthPerSecond(troopCurrent,troopMaximum);
 const goldRate=me?.goldRate??1;
 const rateText=(value:number)=>value>=100?Math.round(value).toLocaleString():value.toFixed(1);
 el('troop-cap-label').textContent=Math.round(troopCurrent).toLocaleString()+' / '+troopMaximum.toLocaleString();
 (el('troop-cap-fill') as HTMLElement).style.width=(troopMaximum?Math.min(100,troopCurrent/troopMaximum*100):0)+'%';
 el('troop-rate-label').textContent='+'+rateText(troopRate)+'/s';
 el('gold-rate-label').textContent='+'+rateText(goldRate)+'/s';
 el('gold').textContent=me?String(Math.floor(me.gold)):'0';el('territory').textContent=String(owned);el('score').textContent='SCORE '+(me?.score||0);
 el('rank-label').textContent=fieldRank(me?.score||0);
 el('online').textContent=(mode==='single'?String(current?.players.length||0):String(current?.players.filter(p=>p.connected).length||0))+'/'+(current?.capacity||50);
 el('world-name').textContent=(current?.mapName||'LIVE WORLD').toUpperCase();el('round').textContent=String(current?.round||1);
 const selected=selectedSource>=0&&current?getGameTile(selectedSource):null;
 el('available-troops').textContent=selected&&selected.owner===myId?String(Math.floor(selected.troops)):'—';
 el('selected-info').textContent=selectedLandmassSize?'CONTINENT HIGHLIGHTED · '+selectedLandmassSize.toLocaleString()+' LAND CELLS'+(selected&&selected.owner===myId?' · '+Math.floor(selected.troops)+' TROOPS AT CLICKED TILE':''):'No continent selected';
 el('tile-info').textContent=boatMode?'🚢 FERRY MODE · SELECT A COASTAL DESTINATION':activeBuilding?'🏗 BUILD MODE · '+activeBuilding.replace('_',' ').toUpperCase()+' · CLICK YOUR LAND':'⚔ CLICK A LAND DIRECTION · '+forcePercent+'% OF NATIONAL TROOPS · SLOW BORDER SPREAD';
 el('tile-title').textContent=boatMode?'🚢 SETTLEMENT FERRY':activeBuilding?'🏗 CONSTRUCTION MODE':'🌎 '+(current?.mapName||'WORLD MAP');
 el('turn').textContent=String(current?.tick||0);
 if(mode==='single'&&soloLengthMinutes>0&&current){const remaining=Math.max(0,soloLengthMinutes*15-current.tick)*4;el('time-left').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');}else el('time-left').textContent='∞';
 const hint=el('build-hint');
 if(boatMode)hint.textContent='🚢 Select a coastal Port tile first, then choose an unclaimed coastal landing site. Ferries establish peaceful island settlements.';
 else if(activeBuilding)hint.textContent='Selected: '+activeBuilding.replace('_',' ').toUpperCase()+'. Click one of your own land tiles to construct it. ESC cancels.';
 else hint.textContent='Click a neutral or rival land direction to expand. Your national troop pool automatically launches from the nearest outer border. Cities increase capacity; factories and markets add gold.';
 document.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>button.classList.toggle('build-selected',button.dataset.building===activeBuilding));
 (el('boat-mode') as HTMLButtonElement).classList.toggle('build-selected',boatMode);
}
function render(){if(!game)return;const me=game.players.find(p=>p.id===myId);(el('player-swatch') as HTMLElement).style.background=me?.color||'#e8c76e';el('hud-name').textContent=me?.name||nickname;updateStats();draw();drawMiniMap();}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
canvas.addEventListener('click',event=>{
 if(!game)return;
 const index=tileAt(event);if(index<0)return;
 if(mode==='multi'&&!game.tiles[index]){requestChunkForTile(index);report('🗺 Loading this section of the map…');return;}
 const tile=mode==='single'?getGameTile(index):game.tiles[index]!;
 if(tile.terrain==='water')clearLandmassSelection();else selectLandmass(index);
 draw();updateStats();
 if(activeBuilding){tryBuild(index,activeBuilding);if(mode==='single'&&game)render();return;}
 if(boatMode){
  const source=selectedSource>=0?getGameTile(selectedSource):null;
  const hasPort=!!source&&source.owner===myId&&(source.buildings||[]).some(b=>b.type==='port');
  if(tile.owner===myId){
   selectedSource=index;const isPort=(tile.buildings||[]).some(b=>b.type==='port');
   report(isPort?'⚓ Port selected. Now click an unclaimed coastal tile to send a ferry.':'🚢 This tile has no Port. Select one of your coastal Ports.');
   updateStats();draw();return;
  }
  if(!hasPort){report('🚢 Select one of your coastal Ports first.');return;}
  if(tile.terrain==='water'||tile.terrain==='mountain'||tile.owner){report('🚢 Choose unclaimed coastal land for the settlement ferry.');return;}
  if(mode==='single')localSendBoat(selectedSource,index);
  else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'boat',source:selectedSource,target:index}));
  boatMode=false;updateStats();render();return;
 }
 if(tile.owner===myId){
  selectedSource=index;hoverTile=-1;
  const isPort=(tile.buildings||[]).some(b=>b.type==='port');
  report(isPort?'⚓ Port selected for inspection. You can start expansion from anywhere on your border.':'📍 Territory selected for inspection. Click any neutral or rival land to expand from your whole nation.');
  updateStats();draw();return;
 }
 if(tile.terrain==='water'||tile.terrain==='mountain'){report('🧭 Aim at land to expand in that direction.');return;}
 if(mode==='single'){localClaim(index,forcePercent);render();checkSoloWinner();}
 else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'claim',tile:index,percent:forcePercent}));
});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));el('command-panel').classList.toggle('hidden',tab!=='command');el('build-panel').classList.toggle('hidden',tab!=='build');el('units-panel').classList.toggle('hidden',tab!=='units');}));
document.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>button.addEventListener('click',()=>{activeBuilding=button.dataset.building as BuildingType;document.querySelectorAll('[data-building]').forEach(b=>b.classList.toggle('build-selected',b===button));report('Build mode: '+activeBuilding.replace('_',' ').toUpperCase()+'. Click one of your territories.');updateStats();}));
el('boat-mode').addEventListener('click',()=>{
 if(!game)return;
 if(boatMode){boatMode=false;report('🚢 Ferry mode cancelled.');}
 else{
  const source=selectedSource>=0?getGameTile(selectedSource):null;
  if(!source||source.owner!==myId||!(source.buildings||[]).some(b=>b.type==='port')){
   boatMode=true;report('🚢 Ferry mode on. Select one of your Port territories, then click an unclaimed coast.');
  }else{boatMode=true;report('🚢 Port selected. Click an unclaimed coastal tile to dispatch a settlement ferry.');}
 }
 activeBuilding=null;updateStats();draw();
});
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
canvas.addEventListener('pointerdown',event=>{if(event.button!==1&&!(event.button===0&&event.shiftKey))return;event.preventDefault();cameraDragging=true;cameraPointer=event.pointerId;cameraStart={x:event.clientX,y:event.clientY,cx:cameraX,cy:cameraY};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(cameraDragging&&cameraStart&&event.pointerId===cameraPointer){cameraX=cameraStart.cx-(event.clientX-cameraStart.x)/cameraZoom;cameraY=cameraStart.cy-(event.clientY-cameraStart.y)/cameraZoom;applyCamera();return;}if(selectedSource>=0){const next=tileAt(event);if(next!==hoverTile){hoverTile=next;draw();}}});
canvas.addEventListener('pointerup',event=>{if(event.pointerId===cameraPointer){cameraDragging=false;cameraStart=null;}});
canvas.addEventListener('pointercancel',()=>{cameraDragging=false;cameraStart=null;});canvas.addEventListener('pointerleave',()=>{hoverTile=-1;if(selectedSource>=0)draw();});
canvas.addEventListener('contextmenu',event=>{event.preventDefault();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab==='build'));el('command-panel').classList.add('hidden');el('units-panel').classList.add('hidden');el('build-panel').classList.remove('hidden');});
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'){activeBuilding=null;boatMode=false;updateStats();draw();return;}
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
