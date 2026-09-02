export function configurationPage() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Beepster settings</title><style>
:root{color-scheme:light dark;font:17px system-ui}body{max-width:34rem;margin:0 auto;padding:24px;background:#101820;color:#f7fbff}
h1{color:#55d6be}label{display:block;margin:18px 0 7px}input,select,button{box-sizing:border-box;width:100%;font:inherit;padding:12px;border-radius:10px;border:1px solid #789;background:#172633;color:inherit}
button{margin-top:22px;background:#55d6be;color:#07120f;border:0;font-weight:700}.hint{color:#b7c7d4;font-size:.9rem}.error{color:#ff9c9c}</style></head>
<body><h1>Beepster</h1><p>Pair this Pebble with your private Mac companion.</p>
<form id="form"><label>One-time pairing code</label><input id="code" inputmode="numeric" autocomplete="one-time-code" required>
<label>Theme</label><select id="theme"><option value="classic">Classic</option><option value="dark">Dark</option><option value="ocean">Ocean</option><option value="contrast">High contrast</option></select>
<label>Text size</label><select id="textSize"><option value="normal">Normal</option><option value="large">Large</option></select>
<label>Refresh interval</label><select id="refresh"><option value="60">1 minute</option><option value="180">3 minutes</option><option value="300">5 minutes</option><option value="0">Manual only</option></select>
<button>Test connection & pair</button><p id="status" class="hint">The code can be viewed or rotated on your Mac.</p></form>
<script>const f=document.getElementById('form'),s=document.getElementById('status');
f.onsubmit=async(e)=>{e.preventDefault();s.className='hint';s.textContent='Testing…';try{const r=await fetch('/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:document.getElementById('code').value.trim()})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Pairing failed');const value={gatewayURL:location.origin,gatewayToken:j.gatewayToken,theme:document.getElementById('theme').value,textSize:document.getElementById('textSize').value,refresh:Number(document.getElementById('refresh').value)};location.href='pebblejs://close#'+encodeURIComponent(JSON.stringify(value));}catch(err){s.className='error';s.textContent=err.message;}};</script></body></html>`;
}
