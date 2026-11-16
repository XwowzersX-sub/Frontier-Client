import { createClient } from '@supabase/supabase-js';
import './style.css';
const env = import.meta.env;
const supabase = createClient(env.VITE_SUPABASE_URL || 'https://rkenxijtbmiqcgwhvtgr.supabase.co', env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MPWfzhBBPHCTjz-mH3ff4Q_8G1XSfnm');
const serverUrl = (env.VITE_SERVER_URL || 'https://YOUR-RENDER-SERVICE.onrender.com').replace(/\/$/, '');
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><div class="brand">✦ PIXEL FRONTIER</div><div class="status"><i id="dot"></i><span id="status">OFFLINE</span></div></header>
<main><aside><small>COMMANDER ACCESS</small><h1>Build your<br><em>frontier.</em></h1><p>Sign in to save your commander profile.</p>
<form id="login"><input id="email" type="email" placeholder="Email address" required><input id="password" type="password" minlength="6" placeholder="Password (6+ characters)" required><button>SIGN IN</button></form>
<button id="signup" class="alt">CREATE ACCOUNT</button><p id="message">Explore the map without signing in.</p><div id="profile"></div><hr><small>GAME SERVER</small><button id="connect">WAKE / CONNECT</button></aside>
<section><div class="bar">SECTOR 07 · THE OUTER REACH <span id="online">0 COMMANDERS ONLINE</span></div><canvas id="map" width="900" height="600"></canvas><p class="legend">BLUE: YOUR TERRITORY　 RED: RIVAL　 GREEN: NEUTRAL　 <span id="tile">SELECT A TILE</span></p></section></main><footer>PIXEL FRONTIER · EARLY PROTOTYPE</footer>`;
const el = (id: string) => document.getElementById(id)!;
const message = el('message');
async function refreshUser() { const { data } = await supabase.auth.getUser(); el('profile').textContent = data.user ? 'SIGNED IN · ' + (data.user.email || 'COMMANDER') : 'GUEST MODE'; }
void refreshUser();
supabase.auth.onAuthStateChange(() => void refreshUser());
el('login').addEventListener('submit', async event => {
 event.preventDefault();
 const { error } = await supabase.auth.signInWithPassword({ email: (el('email') as HTMLInputElement).value, password: (el('password') as HTMLInputElement).value });
 message.textContent = error?.message || 'Signed in successfully.'; void refreshUser();
});
el('signup').addEventListener('click', async () => {
 const email = (el('email') as HTMLInputElement).value, password = (el('password') as HTMLInputElement).value;
 if (!email || password.length < 6) { message.textContent = 'Enter an email and a password with at least 6 characters.'; return; }
 const { error } = await supabase.auth.signUp({ email, password });
 message.textContent = error?.message || 'Account created. Check your email if confirmation is enabled.';
});
el('connect').addEventListener('click', async () => {
 if (serverUrl.includes('YOUR-RENDER')) { message.textContent = 'Set VITE_SERVER_URL to your Render service URL in GitHub Actions Variables.'; return; }
 el('status').textContent = 'WAKING SERVER…'; message.textContent = 'Waking the server. A sleeping free instance may take a minute or more.';
 for (let attempt = 0; attempt < 12; attempt++) {
  try {
   const response = await fetch(serverUrl + '/health', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
   if (response.ok) {
    const { data } = await supabase.auth.getSession();
    const ws = new WebSocket(serverUrl.replace(/^http/, 'ws') + '/ws' + (data.session ? '?token=' + encodeURIComponent(data.session.access_token) : ''));
    ws.onopen = () => { el('status').textContent = 'CONNECTED'; el('dot').className = 'good'; message.textContent = 'Connected to the game server.'; };
    ws.onmessage = event => { const packet = JSON.parse(event.data); if (packet.players !== undefined) el('online').textContent = packet.players + ' COMMANDERS ONLINE'; };
    ws.onclose = () => { el('status').textContent = 'DISCONNECTED'; el('dot').className = ''; };
    return;
   }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, Math.min(1500 * (attempt + 1), 8000)));
 }
 el('status').textContent = 'SERVER UNAVAILABLE'; message.textContent = 'Could not wake the server. Check Render and try again.';
});
const canvas = el('map') as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
const cols = 30, rows = 20, size = 30; let selected = -1;
const tiles = Array.from({ length: cols * rows }, (_, i) => {
 const x = i % cols, y = Math.floor(i / cols), n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
 return { owner: x < 8 && y > 6 && y < 15 ? 'blue' : x > 21 && y > 4 && y < 14 ? 'red' : 'neutral', forest: n > .82 };
});
function draw() {
 ctx.fillStyle = '#101a24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
 tiles.forEach((tile, i) => {
  const x = i % cols * size, y = Math.floor(i / cols) * size;
  ctx.fillStyle = tile.owner === 'blue' ? '#285e8e' : tile.owner === 'red' ? '#87444a' : '#354b3c';
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  if (tile.forest) { ctx.fillStyle = '#9caf70'; ctx.fillRect(x + 12, y + 9, 6, 13); ctx.fillRect(x + 8, y + 15, 14, 7); }
  if (selected === i) { ctx.strokeStyle = '#f4d57c'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, size - 4, size - 4); }
 });
 ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
 for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * size, 0); ctx.lineTo(x * size, canvas.height); ctx.stroke(); }
 for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * size); ctx.lineTo(canvas.width, y * size); ctx.stroke(); }
}
canvas.addEventListener('click', event => {
 const rect = canvas.getBoundingClientRect(), x = Math.floor((event.clientX - rect.left) * canvas.width / rect.width / size), y = Math.floor((event.clientY - rect.top) * canvas.height / rect.height / size);
 selected = y * cols + x; el('tile').textContent = 'TILE ' + (x + 1) + '-' + (y + 1) + ' · ' + tiles[selected].owner.toUpperCase(); draw();
});
draw();
