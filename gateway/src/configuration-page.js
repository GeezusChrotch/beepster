export function configurationPage() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Beepster settings</title><style>
:root{color-scheme:dark;font:17px system-ui}*{box-sizing:border-box}body{max-width:38rem;margin:0 auto;padding:22px;background:#101820;color:#f7fbff}
h1{margin-bottom:5px;color:#55d6be}h2{margin:28px 0 8px;font-size:1.08rem}label{display:block;margin:15px 0 6px}.hint{color:#b7c7d4;font-size:.9rem}.error{color:#ff9c9c}
input,select,button{width:100%;font:inherit;padding:11px;border-radius:10px;border:1px solid #789;background:#172633;color:inherit}button{border:0;background:#55d6be;color:#07120f;font-weight:700}.secondary{background:#314555;color:#fff}.danger{background:#742f3a;color:#fff}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.swatches{display:grid;grid-template-columns:1fr 1fr;gap:10px}.swatches label{margin-top:10px}.swatches input{height:46px;padding:4px}
#preview{margin:16px 0;padding:13px;border-radius:12px;min-height:132px}.preview-title{font-size:1.2rem;font-weight:700}.preview-body{margin-top:9px}.preview-muted{margin-top:9px;font-size:.85rem}.preview-button{display:inline-block;margin-top:12px;padding:6px 10px;border-radius:7px;font-weight:700}
#save{margin-top:22px}.hidden{display:none}</style></head>
<body><h1>Beepster</h1><p id="intro">Pair this Pebble with your private Mac companion.</p>
<form id="form"><div id="pairing"><label>One-time pairing code</label><input id="code" inputmode="numeric" autocomplete="one-time-code"></div>
<h2>Saved themes</h2><label for="theme">Theme</label><select id="theme"></select>
<div class="buttons"><button type="button" id="newTheme" class="secondary">New custom theme</button><button type="button" id="deleteTheme" class="danger">Delete custom theme</button></div>
<p class="hint" id="deleteHint">Built-in themes cannot be deleted.</p>
<div id="preview"><div class="preview-title">Beepster preview</div><div class="preview-body">Alex: Dinner at seven? 😃</div><div class="preview-muted">2 minutes ago</div><div class="preview-button">Reply</div></div>
<h2>Theme editor</h2><label for="themeName">Theme name</label><input id="themeName" maxlength="32">
<div class="swatches"><label>Background<input type="color" id="background"></label><label>Text<input type="color" id="text"></label><label>Muted text<input type="color" id="muted"></label><label>Accent<input type="color" id="accent"></label><label>Accent text<input type="color" id="accentText"></label></div>
<div class="row"><label>Font<select id="font"><option value="gothic">Gothic</option><option value="roboto">Roboto Condensed</option><option value="bitham">Bitham</option></select></label><label>Text size<select id="textSize"><option value="normal">Normal</option><option value="large">Large</option></select></label></div>
<label>Refresh interval</label><select id="refresh"><option value="60">1 minute</option><option value="180">3 minutes</option><option value="300">5 minutes</option><option value="0">Manual only</option></select>
<button id="save">Test connection &amp; pair</button><p id="status" class="hint">The code can be viewed or rotated on your Mac.</p></form>
<script>
const f=document.getElementById('form'),s=document.getElementById('status'),themeSelect=document.getElementById('theme');let initial={};
try{initial=JSON.parse(decodeURIComponent(location.hash.slice(1)||'%7B%7D'));}catch(e){}
const defaults=[
{id:'classic',name:'Classic',background:'#FFFFFF',text:'#000000',muted:'#555555',accent:'#0055AA',accentText:'#FFFFFF',font:'gothic',textSize:'normal',builtIn:true},
{id:'dark',name:'Midnight',background:'#000000',text:'#FFFFFF',muted:'#AAAAAA',accent:'#00AAFF',accentText:'#000000',font:'gothic',textSize:'normal',builtIn:true},
{id:'ocean',name:'Ocean',background:'#001133',text:'#FFFFFF',muted:'#AAFFFF',accent:'#00AAFF',accentText:'#000000',font:'roboto',textSize:'normal',builtIn:true},
{id:'contrast',name:'High Contrast',background:'#FFFFFF',text:'#000000',muted:'#000000',accent:'#000000',accentText:'#FFFFFF',font:'gothic',textSize:'large',builtIn:true},
{id:'plum',name:'Plum',background:'#330033',text:'#FFFFFF',muted:'#FFAAFF',accent:'#AA00AA',accentText:'#FFFFFF',font:'bitham',textSize:'normal',builtIn:true},
{id:'forest',name:'Forest',background:'#003300',text:'#FFFFFF',muted:'#AAFFAA',accent:'#00AA55',accentText:'#000000',font:'roboto',textSize:'normal',builtIn:true}
];
const fields=['themeName','background','text','muted','accent','accentText','font','textSize'];
let themes=defaults.concat((initial.themes||[]).filter(t=>!t.builtIn&&!defaults.some(d=>d.id===t.id))).slice(0,26),currentId=(initial.theme&&initial.theme.id)||'classic';
function selected(){return themes.find(t=>t.id===currentId)||themes[0];}
function renderOptions(){themeSelect.innerHTML='';themes.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=(t.builtIn?'Preset — ':'Custom — ')+t.name;themeSelect.appendChild(o);});themeSelect.value=currentId;}
function loadEditor(){const t=selected();document.getElementById('themeName').value=t.name;['background','text','muted','accent','accentText','font','textSize'].forEach(k=>document.getElementById(k).value=t[k]);document.getElementById('deleteTheme').disabled=Boolean(t.builtIn);renderPreview();}
function renderPreview(){const t=selected(),p=document.getElementById('preview');p.style.background=t.background;p.style.color=t.text;p.style.fontFamily=t.font==='roboto'?'Arial Narrow,Arial,sans-serif':t.font==='bitham'?'Arial Black,sans-serif':'Arial,sans-serif';p.style.fontSize=t.textSize==='large'?'20px':'17px';p.querySelector('.preview-muted').style.color=t.muted;const b=p.querySelector('.preview-button');b.style.background=t.accent;b.style.color=t.accentText;}
function updateTheme(){let t=selected();if(t.builtIn){t=Object.assign({},t,{id:'custom-'+Date.now(),name:t.name+' Custom',builtIn:false});themes.push(t);currentId=t.id;}t.name=document.getElementById('themeName').value.trim()||'Custom';['background','text','muted','accent','accentText','font','textSize'].forEach(k=>t[k]=document.getElementById(k).value);renderOptions();document.getElementById('deleteTheme').disabled=false;renderPreview();}
renderOptions();if(!themes.some(t=>t.id===currentId)){themes.push(Object.assign({},initial.theme,{builtIn:false}));currentId=initial.theme.id;renderOptions();}loadEditor();
themeSelect.onchange=()=>{currentId=themeSelect.value;loadEditor();};fields.forEach(id=>document.getElementById(id).oninput=updateTheme);
document.getElementById('newTheme').onclick=()=>{const base=selected(),id='custom-'+Date.now();themes.push(Object.assign({},base,{id:id,name:'My theme',builtIn:false}));currentId=id;renderOptions();loadEditor();document.getElementById('themeName').focus();};
document.getElementById('deleteTheme').onclick=()=>{const t=selected();if(t.builtIn)return;themes=themes.filter(x=>x.id!==t.id);currentId='classic';renderOptions();loadEditor();};
const paired=Boolean(initial.gatewayToken);if(paired){document.getElementById('pairing').className='hidden';document.getElementById('intro').textContent='Adjust Beepster without pairing again.';document.getElementById('save').textContent='Test connection, save & apply';s.textContent='Your gateway credential remains on the phone.';}
if(typeof initial.refresh==='number')document.getElementById('refresh').value=String(initial.refresh);
f.onsubmit=async(e)=>{e.preventDefault();updateTheme();s.className='hint';s.textContent='Testing…';try{let token=initial.gatewayToken||'';if(token){const test=await fetch('/v1/chats?limit=1',{headers:{authorization:'Bearer '+token}});if(!test.ok)throw new Error('Saved connection failed with '+test.status);}else{const r=await fetch('/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:document.getElementById('code').value.trim()})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Pairing failed');token=j.gatewayToken;}const chosen=selected(),custom=themes.filter(t=>!t.builtIn).slice(0,20);const value={gatewayURL:location.origin,gatewayToken:token,theme:chosen,themes:custom,textSize:chosen.textSize,refresh:Number(document.getElementById('refresh').value)};location.href='pebblejs://close#'+encodeURIComponent(JSON.stringify(value));}catch(err){s.className='error';s.textContent=err.message;}};
</script></body></html>`;
}
