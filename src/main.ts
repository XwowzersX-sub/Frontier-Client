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
type Player = { id: string; name: string; color: string; gold: number; score: number; connected: boolean; home: number };
type GameState = { width: number; height: number; tiles: Tile[]; players: Player[]; tick: number };
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="menu-screen" class="screen menu-screen">
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
  <div class="world-metrics"><span>COMMANDER <b id="commander-label">COMMANDER</b></span><span>GOLD <b id="gold">0</b></span><span>LAND <b id="territory">0</b></span><span>TURN <b id="turn">0</b></span><span>ONLINE <b id="online">0</b></span></div>
  <div class="world-actions"><button id="game-settings" class="world-icon">⚙</button><button id="main-menu" class="world-icon">MENU</button></div>
 </div>
 <div class="map-inspector"><b id="tile-title">FRONTIER MAP</b><span id="tile-info">CLICK YOUR LAND TO SELECT IT · CLICK ADJACENT LAND TO EXPAND</span><span id="score">SCORE 0</span></div>
 <div class="floating-dock">
  <div class="dock-profile"><i id="player-swatch"></i><div><small>COMMANDER</small><b id="hud-name">GUEST</b></div><div class="dock-gold"><small>TROOPS</small><b id="available-troops">0</b></div></div>
  <div class="dock-main">
   <div class="dock-tabs"><button class="dock-tab active" data-tab="command">COMMAND</button><button class="dock-tab" data-tab="build">BUILD</button><button class="dock-tab" data-tab="units">UNITS</button></div>
   <div id="command-panel" class="dock-panel">
    <div class="ratio-control"><small>ATTACK RATIO</small><div class="troop-choices"><button data-force="25">25%</button><button data-force="50" class="chosen">50%</button><button data-force="75">75%</button><button data-force="100">100%</button></div></div>
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
     
    </div><div class="dock-hint" id="build-hint">Choose a structure, then click one of your land tiles. Ports need a coastline; Warships need a Port.</div>
   </div>
   <div id="units-panel" class="dock-panel hidden">
    <div class="unit-actions"><button id="recruit-large" class="dock-action">＋ RECRUIT TROOPS <small>25 GOLD · +5</small></button><button id="clear-selection" class="dock-action">CANCEL BUILD / SELECT</button></div>
    <div class="dock-hint">Click adjacent neutral or enemy territory to attack using the selected troop ratio. Buildings provide passive bonuses.</div>
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
let socket:WebSocket|null=null,game:GameState|null=null,myId='',reconnecting=false,localTimer:ReturnType<typeof setInterval>|null=null;
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
el('main-menu').addEventListener('click',()=>{if(localTimer)clearInterval(localTimer);if(socket){socket.close();socket=null;}game=null;selectedSource=-1;activeBuilding=null;showScreen('menu');});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
el('menu-single').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();startSinglePlayer();showScreen('game');}catch(error){console.error('Single player failed to start:',error);report('Could not start the solo match. Reload the page and try again.');showScreen('menu');}});
el('menu-multi').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{getNickname();showScreen('game');void connect();}catch(error){console.error('Multiplayer failed to start:',error);report('Could not open multiplayer. Check the server configuration and try again.');showScreen('menu');}});
async function connect(){
 mode='multi';if(reconnecting)return;if(serverUrl.includes('YOUR-RENDER')){report('Set VITE_SERVER_URL in GitHub Actions Variables.');return;}
 if(socket?.readyState===WebSocket.OPEN){report('Already connected.');return;}
 setConnection('WAKING SERVER…');report('Waking the online world. Render may take up to a minute.');reconnecting=true;
 for(let attempt=0;attempt<14;attempt++){if(!reconnecting)return;try{const response=await fetch(serverUrl+'/health',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(response.ok){const {data}=await supabase.auth.getSession();const token=data.session?.access_token;socket=new WebSocket(serverUrl.replace(/^http/,'ws')+'/ws',token?['frontier','auth.'+token]:['frontier']);socket.onopen=()=>{setConnection('ONLINE',true);socket?.send(JSON.stringify({type:'join',name:getNickname()}));reconnecting=false;};socket.onmessage=event=>{const packet=JSON.parse(event.data);if(packet.type==='welcome')myId=packet.id;if(packet.type==='state'){game=packet.state as GameState;render();}if(packet.type==='notice'||packet.type==='error')report(packet.text);};socket.onclose=()=>{if(mode==='multi'){setConnection('DISCONNECTED');report('Connection lost. Return to menu and reconnect.');}};socket.onerror=()=>setConnection('CONNECTION ERROR');return;}}catch{}await new Promise(resolve=>setTimeout(resolve,Math.min(1500*(attempt+1),9000)));}
 reconnecting=false;setConnection('SERVER UNAVAILABLE');report('Could not wake server. Check Render and try again.');
}
function neighborsLocal(i:number){if(!game)return[];const x=i%game.width,y=Math.floor(i/game.width);return [x?i-1:-1,x<game.width-1?i+1:-1,y?i-game.width:-1,y<game.height-1?i+game.width:-1].filter(n=>n>=0);}
function startSinglePlayer(){
 mode='single';if(socket){socket.close();socket=null;}if(localTimer)clearInterval(localTimer);selectedSource=-1;activeBuilding=null;myId='human';
 const palette=['#4b9bd1','#db755e','#b18be0','#d2ad4f'],names=[nickname,'Astra','Vex','Orion'],starts=[305,354,2045,2094];
 const players:Player[]=names.map((name,i)=>({id:i===0?'human':'bot-'+i,name,color:palette[i]!,gold:160,score:0,connected:true,home:starts[i]!}));
 const tiles:Tile[]=Array.from({length:2400},(_,i)=>{const x=i%60,y=Math.floor(i/60),n=Math.abs(Math.sin(i*12.9898+Math.floor(i/60)*78.233)*43758.5453)%1;const coast=x<2||y<2||x>=58||y>=38;const lake=Math.abs(x-43)<3&&Math.abs(y-19)<4;return{owner:null,terrain:coast||lake?'water':n>.9?'mountain':n>.72?'forest':'plain',troops:0,buildings:[]};});
 starts.forEach((at,i)=>{tiles[at]={owner:players[i]!.id,terrain:'plain',troops:20,buildings:[]};});
 game={width:60,height:40,tiles,players,tick:0};setConnection('SOLO CAMPAIGN',true);report('The campaign is live. Click adjacent land to expand, or choose a structure below and click one of your own territories.');render();localTimer=setInterval(localTick,4000);
}
function localClaim(targetIndex:number,percent:number){
 if(!game)return false;const tile=game.tiles[targetIndex];if(!tile||tile.owner===myId||tile.terrain==='mountain'||tile.terrain==='water')return false;
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
 const cost=buildCosts[type]*(type==='city'?currentLevel+1:1);if(me.gold<cost){report('You need '+cost+' gold for this build.');return false;}
 me.gold-=cost;if(type==='city'&&existing.length)existing[0]!.level=currentLevel+1;else tile.buildings.push({type,level:1});
 report(type.replace('_',' ').toUpperCase()+' constructed.');return true;
}
function tryBuild(index:number,type:BuildingType){if(mode==='single'){localBuild(index,type);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'build',tile:index,building:type}));}
function localRecruit(player:Player){if(!game||player.gold<25)return;const home=game.tiles[player.home];if(home?.owner===player.id){player.gold-=25;home.troops+=15;}}
function botTurn(bot:Player){
 if(!game)return;const owned=game.tiles.map((t,i)=>t.owner===bot.id?i:-1).filter(i=>i>=0);if(!owned.length)return;
 const opts=owned.flatMap(i=>neighborsLocal(i).filter(n=>game!.tiles[n]!.owner!==bot.id&&game!.tiles[n]!.terrain!=='mountain'&&game!.tiles[n]!.terrain!=='water').map(n=>({source:i,target:n,t:game!.tiles[n]!})));
 const personality=bot.id==='bot-1'?'builder':bot.id==='bot-2'?'raider':'warden';
 opts.sort((a,b)=>{const score=(o:typeof opts[number])=>(o.t.owner?15:8)+(o.t.troops*.35)+(neighborsLocal(o.target).filter(n=>game!.tiles[n]!.owner!==bot.id).length*2)+(personality==='builder'&&!o.t.owner?5:0)+(personality==='raider'&&o.t.owner?7:0);return score(b)-score(a);});
 const pick=opts.find(o=>o.source!==bot.home||game!.tiles[o.source]!.troops>12);if(!pick)return;
 const source=game.tiles[pick.source]!,send=Math.max(1,Math.floor(source.troops*(personality==='warden'?.3:.65)));if(send<=pick.t.troops)return;
 const tile=pick.t,defender=game.players.find(p=>p.id===tile.owner);source.troops-=send;const survivors=send-(tile.owner?tile.troops:0)-1;if(defender)defender.score=Math.max(0,defender.score-1);tile.owner=bot.id;tile.troops=Math.max(1,survivors);bot.score++;
 if(bot.gold>=25&&personality==='warden'&&game.tick%2===0)localRecruit(bot);
}
function localTick(){if(!game||mode!=='single')return;game.tick++;for(const p of game.players){const land=game.tiles.filter(t=>t.owner===p.id);const bonus=land.reduce((sum,t)=>sum+(t.buildings||[]).reduce((n,b)=>n+(b.type==='factory'?3:b.type==='city'?b.level*2:b.type==='port'?2:b.type==='market'?4:0),0),0);p.gold=Math.min(9999,p.gold+Math.max(1,Math.floor(land.length/3))+bonus);if(game.tick%2===0)for(const t of land)if(t.troops<(99+((t.buildings||[]).find(b=>b.type==='city')?.level||0)*50))t.troops+=2+(t.buildings||[]).filter(b=>b.type==='farm').length;}for(const bot of game.players.filter(p=>p.id.startsWith('bot-'))){botTurn(bot);if(game.tick%3===0)botTurn(bot);}render();}
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
function updateStats(){
 const current=game,me=current?.players.find(p=>p.id===myId),owned=current?.tiles.filter(t=>t.owner===myId).length||0;
 el('gold').textContent=me?String(me.gold):'0';el('territory').textContent=String(owned);el('score').textContent='SCORE '+(me?.score||0);el('online').textContent=String(current?.players.filter(p=>p.connected).length||0);
 el('available-troops').textContent=selectedSource>=0&&current?.tiles[selectedSource]?.owner===myId?String(current.tiles[selectedSource]!.troops):'—';
 const source=current&&selectedSource>=0?current.tiles[selectedSource]:null;
 el('selected-info').textContent=source?'TROOPS '+source.troops+' · '+(source.terrain||'land').toUpperCase()+' · '+(source.buildings||[]).map(b=>b.type.replace('_',' ')).join(', '):'No territory selected';
 el('tile-info').textContent=activeBuilding?'BUILD MODE · '+activeBuilding.replace('_',' ').toUpperCase()+' · CLICK YOUR LAND':'CLICK ADJACENT LAND TO EXPAND · SELECTED '+(selectedSource>=0?'TILE '+selectedSource:'NONE');
 el('tile-title').textContent=activeBuilding?'CONSTRUCTION MODE':'WORLD MAP';
 el('turn').textContent=String(current?.tick||0);
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
 if(mode==='single'){const won=localClaim(index,forcePercent);report(won?'Territory captured!':'Attack failed or was repelled. Try sending more troops.');render();}
 else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'claim',tile:index,percent:forcePercent}));
});
document.querySelectorAll<HTMLButtonElement>('[data-force]').forEach(button=>button.addEventListener('click',()=>{forcePercent=Number(button.dataset.force);document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('chosen',b===button));updateStats();}));
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));el('command-panel').classList.toggle('hidden',tab!=='command');el('build-panel').classList.toggle('hidden',tab!=='build');el('units-panel').classList.toggle('hidden',tab!=='units');}));
document.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>button.addEventListener('click',()=>{activeBuilding=button.dataset.building as BuildingType;document.querySelectorAll('[data-building]').forEach(b=>b.classList.toggle('build-selected',b===button));report('Build mode: '+activeBuilding.replace('_',' ').toUpperCase()+'. Click one of your territories.');updateStats();}));
el('recruit').addEventListener('click',()=>{if(mode==='single'&&game){const p=game.players.find(v=>v.id===myId);if(p)localRecruit(p);render();}else if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'recruit'}));});
el('recruit-large').addEventListener('click',()=>el('recruit').click());
el('clear-selection').addEventListener('click',()=>{activeBuilding=null;selectedSource=-1;updateStats();draw();});
el('center-map').addEventListener('click',()=>{canvas.style.transform='translate(0,0) scale(1)';});
window.addEventListener('keydown',event=>{if(event.key==='Escape'){activeBuilding=null;updateStats();draw();}if(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement)return;const key=Number(event.key);const list:BuildingType[]=['city','factory','port','defense_post','market','farm'];if(key>=1&&key<=6){activeBuilding=list[key-1]!;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab==='build'));el('command-panel').classList.add('hidden');el('units-panel').classList.add('hidden');el('build-panel').classList.remove('hidden');updateStats();}});
window.addEventListener('resize',()=>draw());
applySettings();showScreen('menu');getNickname();
