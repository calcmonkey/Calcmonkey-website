(function(){
'use strict';
var host=document.getElementById('cm-host');
if(!host||host.shadowRoot) return;
var cssEl=document.getElementById('cm-css'),root=document.getElementById('cm-app');
if(!cssEl||!root) return;
/* Shadow DOM keeps Squarespace's own fonts/colors from leaking into CalcMonkey */
var shadow=host.attachShadow({mode:'open'});
shadow.appendChild(cssEl);shadow.appendChild(root);
var view=root.querySelector('#cm-view');

/* ================= storage & state ================= */
var store={
get:function(k,d){try{var v=localStorage.getItem('cm_'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},
set:function(k,v){try{localStorage.setItem('cm_'+k,JSON.stringify(v));}catch(e){}}
};
var S={grade:store.get('grade',2),bananas:store.get('bananas',0),xp:store.get('xp',0),look:store.get('look',{head:'cap',eyes:'',neck:'',top:'tee',bottom:'jeans',feet:'sneakers',hand:'banana'}),scene:store.get('scene','jungle'),mname:(function(n){return !n||n==='Milo'?'Mochi':n;})(store.get('mname','Mochi')),newsc:store.get('newsc',''),sound:store.get('sound',true),best:store.get('best',{})};
function setBest(k,v,lowerIsBetter){var b=S.best[k];if(b==null||(lowerIsBetter?v<b:v>b)){S.best[k]=v;store.set('best',S.best);return true;}return false;}

/* ================= helpers ================= */
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function rndNZ(a,b){var v;do{v=rnd(a,b);}while(v===0);return v;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function seq(n){var a=[];for(var i=0;i<n;i++)a.push(i);return a;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t;}return a||1;}
function r1(n){return Math.round(n*10)/10;}
function r2(n){return Math.round(n*100)/100;}
function isInt(n){return Math.abs(n-Math.round(n))<1e-9;}
function num(n){n=Math.round(n*10000)/10000;if(Object.is(n,-0))n=0;return (n<0?'−':'')+Math.abs(n);}
function par(n){return n<0?'('+num(n)+')':num(n);}
function frac(n,d){
if(d===0) return 'undefined';
if(!isInt(n)||!isInt(d)) return num(n/d);
if(d<0){n=-n;d=-d;}
var g=gcd(n,d);n/=g;d/=g;
return d===1?num(n):(n<0?'−':'')+Math.abs(n)+'/'+d;
}
function pow(n){return n===0?'':n===1?'x':'x<sup>'+n+'</sup>';}
function poly(terms){
var s='';
terms.forEach(function(t){
var c=t[0],v=t[1];if(!c) return;
var abs=Math.abs(c),body=(abs===1&&v)?v:num(abs)+v;
if(s==='') s=(c<0?'−':'')+body; else s+=(c<0?' − ':' + ')+body;
});
return s||'0';
}
function polyT(terms){return poly(terms.map(function(t){return [t[0],pow(t[1])];}));}
function simpSqrt(n){for(var i=Math.floor(Math.sqrt(n));i>1;i--){if(n%(i*i)===0)return [i,n/(i*i)];}return [1,n];}
function rootStr(n){if(!isInt(n))return '√'+num(n);var s=simpSqrt(n);return s[1]===1?String(s[0]):(s[0]>1?s[0]:'')+'√'+s[1];}
function ord(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function q(box,name){return box.querySelector('[data-r="'+name+'"]');}
function chip(h){return '<span class="cm-chip">'+h+'</span>';}
function matHTML(m){return '<span class="cm-mat" style="--c:'+m[0].length+'">'+m.map(function(r){return r.map(function(x){return '<span>'+num(x)+'</span>';}).join('');}).join('')+'</span>';}
function erf(x){var s=x<0?-1:1;x=Math.abs(x);var t=1/(1+0.3275911*x);var y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;}
function normCdf(z){return 0.5*(1+erf(z/Math.SQRT2));}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

/* cleanup registry so games stop when you leave a page */
var cleanups=[];
function onCleanup(f){cleanups.push(f);}
function runCleanups(){while(cleanups.length){try{cleanups.pop()();}catch(e){}}}
function listen(t,ev,fn,opt){t.addEventListener(ev,fn,opt);onCleanup(function(){t.removeEventListener(ev,fn,opt);});}
function timers(){var ids=[];var o={every:function(f,ms){ids.push(['i',setInterval(f,ms)]);},after:function(f,ms){ids.push(['t',setTimeout(f,ms)]);},clear:function(){ids.forEach(function(x){if(x[0]==='i')clearInterval(x[1]);else clearTimeout(x[1]);});ids=[];}};onCleanup(o.clear);return o;}
function rafLoop(fn){var alive=true,id,last=0;function f(t){if(!alive)return;var dt=last?Math.min(0.05,(t-last)/1000):0;last=t;fn(dt);id=requestAnimationFrame(f);}id=requestAnimationFrame(f);onCleanup(function(){alive=false;cancelAnimationFrame(id);});}
function setupCanvas(cv,h){var dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(280,cv.parentNode.clientWidth-0);cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx:ctx,w:w,h:h};}

/* sound effects (tiny Web Audio beeps — no files needed) */
var actx=null;
function tone(f,d,type,delay){if(!S.sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();var t0=actx.currentTime+(delay||0),o=actx.createOscillator(),g=actx.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0.07,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+d);o.connect(g);g.connect(actx.destination);o.start(t0);o.stop(t0+d+0.02);}catch(e){}}
function sfxGood(){tone(660,.12,'triangle');tone(990,.18,'triangle',.08);}
function sfxBad(){tone(170,.25,'sawtooth');}
function sfxWin(){[523,659,784,1047].forEach(function(f,i){tone(f,.2,'triangle',i*.11);});}

/* ================= rewards ================= */
function updStats(bump){
var b=root.querySelector('#cm-ban'),x=root.querySelector('#cm-xp');
b.querySelector('b').textContent=S.bananas;x.querySelector('b').textContent=S.xp;
if(bump){var el=bump==='xp'?x:b;el.classList.remove('cm-bump');void el.offsetWidth;el.classList.add('cm-bump');}
root.querySelector('#cm-snd').textContent=S.sound?'🔊':'🔇';
}
function addBananas(n){
var before=S.bananas;S.bananas+=n;store.set('bananas',S.bananas);updStats('ban');
SCENES.forEach(function(sc){if(sc.need>before&&sc.need<=S.bananas){S.newsc=sc.id;store.set('newsc',sc.id);unlockToast(sc);}});
}
function addXP(n){S.xp+=n;store.set('xp',S.xp);updStats('xp');}

/* ================= the monkey (original art) ================= */
var INK='#2b2350',O=' stroke="#3b2414" stroke-opacity=".26" stroke-width="2.2" stroke-linejoin="round"',O2=' stroke="#3b2414" stroke-opacity=".26" stroke-width="1.6" stroke-linejoin="round"';
var HEAD_ACC={
party:'<path d="M60 1 C55 10 48 22 42 30 Q60 37 78 30 C72 22 65 10 60 1 Z" fill="#ff5fa2"'+O+'/><path d="M50 18 Q60 21 70 18 M46 25 Q60 29 74 25" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="60" cy="2" r="6.5" fill="#ffd23f"'+O2+'/><circle cx="58" cy="0" r="2" fill="#fff" opacity=".6"/>',
shades:'<rect x="34" y="45" width="24" height="15" rx="6" fill="#1b1838"/><rect x="62" y="45" width="24" height="15" rx="6" fill="#1b1838"/><path d="M57 50 h6" stroke="#1b1838" stroke-width="3"/><path d="M38 49 h8 M66 49 h8" stroke="#fff" stroke-width="2" opacity=".55"/>',
crown:'<path d="M36 30 C35 22 37 15 40 9 Q46 17 50 19 Q55 10 60 3 Q65 10 70 19 Q74 17 80 9 C83 15 85 22 84 30 Q60 36 36 30 Z" fill="#ffd23f"'+O+'/><circle cx="40" cy="8" r="3.2" fill="#ffd23f"'+O2+'/><circle cx="60" cy="2" r="3.6" fill="#ffd23f"'+O2+'/><circle cx="80" cy="8" r="3.2" fill="#ffd23f"'+O2+'/><path d="M40 27 Q60 32 80 27" stroke="#f59e0b" stroke-width="2.5" fill="none"/><circle cx="60" cy="22" r="3.5" fill="#ff5fa2"/><circle cx="46" cy="25" r="2.5" fill="#38bdf8"/><circle cx="74" cy="25" r="2.5" fill="#22c55e"/>',
wizard:'<path d="M38 28 C46 18 52 8 56 0 C60 -8 70 -12 78 -6 C70 -6 66 -2 66 6 C68 14 74 22 84 28 Q60 33 38 28 Z" fill="#6c4bd8"'+O+'/><circle cx="78" cy="-6" r="3.5" fill="#ffd23f"'+O2+'/><ellipse cx="60" cy="28" rx="33" ry="6" fill="#6c4bd8"'+O+'/><text x="58" y="21" font-size="12" text-anchor="middle" fill="#ffd23f">★</text><text x="68" y="8" font-size="8" text-anchor="middle" fill="#ffd23f">π</text>'
};
var MID=0,FUR='#a0632f',FUR_D='#7c4a20',FUR_L='#c98a50',CRM='#f8d5a8';
function mDefs(id){return '<defs><radialGradient id="'+id+'f" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="'+FUR_L+'"/><stop offset=".6" stop-color="'+FUR+'"/><stop offset="1" stop-color="'+FUR_D+'"/></radialGradient><radialGradient id="'+id+'s" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fff1dc"/><stop offset="1" stop-color="#efc391"/></radialGradient></defs>';}
/* Plush Mochi head, centred at (60,60). mood 'yay' = excited face */
function headInner(id,mood){
var own=!id;if(own)id='cmm'+(++MID);var F='url(#'+id+'f)',C='url(#'+id+'s)';
return (own?mDefs(id):'')+
'<circle cx="21" cy="61" r="16" fill="'+F+'"/><circle cx="22" cy="61.5" r="8.5" fill="#f4a6a0"/><circle cx="99" cy="61" r="16" fill="'+F+'"/><circle cx="98" cy="61.5" r="8.5" fill="#f4a6a0"/>'+
'<circle cx="60" cy="60" r="40" fill="'+F+'"/>'+
'<path d="M51.6 20.4 Q54 10.8 61.2 15.6 Q64.8 7.2 70.8 16.8" stroke="'+FUR+'" stroke-width="5.5" fill="none" stroke-linecap="round"/>'+
'<path d="M60.0 46.8 C54.0 34.8 31.2 36.0 31.2 56.4 C31.2 64.8 34.8 69.6 37.2 73.2 C32.4 80.4 36.0 98.4 60.0 98.4 C84.0 98.4 87.6 80.4 82.8 73.2 C85.2 69.6 88.8 64.8 88.8 56.4 C88.8 36.0 66.0 34.8 60.0 46.8 Z" fill="'+C+'"/>'+
(mood==='yay'?
'<path d="M41 56 Q48 47 55 56 M65 56 Q72 47 79 56" stroke="#2a1a10" stroke-width="3.6" fill="none" stroke-linecap="round"/>'+
'<ellipse cx="37" cy="70" rx="7" ry="4.5" fill="#ff8fa3" opacity=".65"/><ellipse cx="83" cy="70" rx="7" ry="4.5" fill="#ff8fa3" opacity=".65"/>'+
'<path d="M57 64.5 Q60 62.5 63 64.5 Q60 68.5 57 64.5 Z" fill="#6b3a1e"/>'+
'<path d="M50 71 Q60 89 70 71 Z" fill="#7a2e2e" stroke="#6b3a1e" stroke-width="2" stroke-linejoin="round"/><path d="M54.5 78.5 Q60 84.5 65.5 78.5 Q60 81 54.5 78.5 Z" fill="#ff8fa3"/>'
:
[48,72].map(function(x){return '<ellipse cx="'+x+'" cy="55" rx="6.2" ry="7.6" fill="#2a1a10"/><circle cx="'+(x+2)+'" cy="52.4" r="2.6" fill="#fff"/><circle cx="'+(x-1.8)+'" cy="58.4" r="1.2" fill="#fff"/>';}).join('')+
'<ellipse cx="38" cy="70" rx="6.6" ry="4.2" fill="#ff8fa3" opacity=".6"/><ellipse cx="82" cy="70" rx="6.6" ry="4.2" fill="#ff8fa3" opacity=".6"/>'+
'<path d="M56.6 65 Q60 62.6 63.4 65 Q60 69.8 56.6 65 Z" fill="#6b3a1e"/>'+
'<path d="M54 73.5 Q60 80 66 73.5" stroke="#6b3a1e" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
}
/* head-only monkey: used for the little logo */
function monkeySVG(acc,cls){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 120 128" class="'+(cls||'')+'" aria-hidden="true">'+headInner()+(HEAD_ACC[acc]||'')+'</svg>';}
function refreshLogo(){root.querySelector('#cm-logo').innerHTML=monkeySVG('');}

/* ---------- full-body monkey + clothes ---------- */
var TEE='M74 124 Q100 138 126 124 C134 128 139 140 139 158 C139 174 136 186 130 195 Q100 207 70 195 C64 186 61 174 61 158 C61 140 66 128 74 124 Z';
var SHORTS='M66 186 Q100 198 134 186 C136 196 135 206 133 218 Q120 225 106 220 L103 211 Q100 207 97 211 L94 220 Q80 225 67 218 C65 206 64 196 66 186 Z';
var PANTS='M66 186 Q100 198 134 186 C136 196 134 206 131 214 L130 243 Q118 251 106 243 L104 215 Q100 208 96 215 L94 243 Q82 251 70 243 L69 214 C66 206 64 196 66 186 Z';
var SHOE_L='M61 258 C58 244 70 238 79 239 C90 240 96 248 95 258 Q78 263 61 258 Z',SHOE_R='M139 258 C142 244 130 238 121 239 C110 240 104 248 105 258 Q122 263 139 258 Z';
function tg(acc){return '<g transform="translate(40,12)">'+acc+'</g>';}
function sleeves(col){var a='M72 132 Q54 158 56 182',b='M128 132 Q146 158 144 182';return '<path d="'+a+'" stroke="#2b2350" stroke-width="19" fill="none" stroke-linecap="round"/><path d="'+b+'" stroke="#2b2350" stroke-width="19" fill="none" stroke-linecap="round"/><path d="'+a+'" stroke="'+col+'" stroke-width="13" fill="none" stroke-linecap="round"/><path d="'+b+'" stroke="'+col+'" stroke-width="13" fill="none" stroke-linecap="round"/>';}
function shoes(fill,extra){return '<path d="'+SHOE_L+'" fill="'+fill+'"'+O+'/><path d="'+SHOE_R+'" fill="'+fill+'"'+O+'/>'+(extra||'');}
function heart(x,y){return '<path d="M'+x+' '+(y+6)+' C'+(x-13)+' '+(y-3)+' '+(x-7)+' '+(y-12)+' '+x+' '+(y-5)+' C'+(x+7)+' '+(y-12)+' '+(x+13)+' '+(y-3)+' '+x+' '+(y+6)+' Z" fill="#ef4444"'+O2+'/>';}
function ring(n,rx,ry,cy,fn){var s='';for(var i=0;i<n;i++){var a=Math.PI*(i/(n-1));s+=fn(100+Math.cos(a)*rx,cy+Math.sin(a)*ry,i);}return s;}
var ITEMS={
/* tops */
tee:{slot:'top',pf:'#ffd23f',name:'Banana Tee',scene:'jungle',svg:'<path d="'+TEE+'" fill="#ffd23f"'+O+'/><path d="M90 160 Q100 174 114 158" stroke="#f59e0b" stroke-width="6" fill="none" stroke-linecap="round"/>'},
hawaii:{slot:'top',pf:'#14b8a6',name:'Hawaiian Shirt',scene:'beach',svg:'<path d="'+TEE+'" fill="#14b8a6"'+O+'/><path d="M86 123 L100 142 L114 123" fill="#fff"'+O2+'/>'+[[82,150],[114,148],[96,172],[122,180],[78,184],[106,192],[68,140],[132,140]].map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#fb7185"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="2" fill="#fde047"/>';}).join('')},
striped:{slot:'top',pf:'#f472b6',name:'Party Shirt',scene:'party',svg:'<path d="'+TEE+'" fill="#f472b6"'+O+'/><path d="M64 142 H136 M62 158 H138 M63 174 H137 M68 189 H132" stroke="#fff" stroke-width="5" stroke-linecap="round" clip-path="url(#CLIP)"/><path d="'+TEE+'" fill="none"'+O+'/>'},
puffer:{slot:'top',pf:'#ef4444',name:'Puffy Coat',scene:'snow',sl:'#ef4444',svg:'<path d="'+TEE+'" fill="#ef4444"'+O+'/><path d="M70 148 Q100 156 130 148 M69 170 Q100 178 131 170" stroke="#b91c1c" stroke-width="3" fill="none"/><path d="M100 128 L100 203" stroke="#fde047" stroke-width="3"/><path d="M80 120 Q100 134 120 120 L122 128 Q100 142 78 128 Z" fill="#fca5a5"'+O2+'/>'},
jersey:{slot:'top',pf:'#2563eb',name:'Team Jersey',scene:'soccer',svg:'<path d="'+TEE+'" fill="#2563eb"'+O+'/><path d="M88 123 L100 136 L112 123" fill="#fff"'+O2+'/><text x="100" y="182" font-size="30" font-weight="900" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">10</text>'},
tux:{slot:'top',name:'Tuxedo Jacket',scene:'opera',sl:'#1f2937',svg:'<path d="'+TEE+'" fill="#1f2937"'+O+'/><path d="M85 121 L100 168 L115 121 Q100 131 85 121 Z" fill="#fff"/><path d="M85 121 L95 160 M115 121 L105 160" stroke="#6b7280" stroke-width="3"/><circle cx="100" cy="178" r="2.5" fill="#e5e7eb"/><circle cx="100" cy="190" r="2.5" fill="#e5e7eb"/><path d="M116 146 L126 146 L121 140 Z" fill="#ef4444"/>'},
gown:{slot:'top',pf:'#a855f7',name:'Sparkly Gown',scene:'opera',svg:'<path d="M70 176 Q100 188 130 176 C146 196 158 222 156 244 Q100 264 44 244 C42 222 54 196 70 176 Z" fill="#9333ea"'+O+'/><path d="M76 122 Q100 134 124 122 C132 138 134 160 131 180 Q100 192 69 180 C66 160 68 138 76 122 Z" fill="#a855f7"'+O+'/><path d="M70 178 Q100 188 130 178" stroke="#fbbf24" stroke-width="4" fill="none"/>'+[[80,214],[118,224],[98,236],[66,236],[134,236],[104,204]].map(function(p){return '<text x="'+p[0]+'" y="'+p[1]+'" font-size="10" fill="#fde68a" text-anchor="middle">✦</text>';}).join('')},
spacesuit:{slot:'top',pf:'#f8fafc',name:'Space Suit',scene:'space',sl:'#e2e8f0',svg:'<path d="'+TEE+'" fill="#f8fafc"'+O+'/><path d="M58 166 L66 166 M134 166 L142 166" stroke="#f97316" stroke-width="5"/><rect x="85" y="146" width="30" height="22" rx="4" fill="#cbd5e1"'+O2+'/><circle cx="93" cy="157" r="3.5" fill="#ef4444"/><circle cx="103" cy="157" r="3.5" fill="#22c55e"/><circle cx="111" cy="152" r="2.5" fill="#3b82f6"/>'},
robe:{slot:'top',pf:'#7c3aed',name:'Royal Robe',scene:'palace',back:'<path d="M70 116 Q100 108 130 116 L164 270 Q100 286 36 270 Z" fill="#b91c1c"'+O+'/>',svg:'<path d="'+TEE+'" fill="#7c3aed"'+O+'/><rect x="68" y="180" width="64" height="9" fill="#fbbf24"'+O2+'/><path d="M64 116 Q100 150 136 116 L132 130 Q100 156 68 130 Z" fill="#fff"'+O2+'/><circle cx="80" cy="130" r="2" fill="#111"/><circle cx="100" cy="141" r="2" fill="#111"/><circle cx="120" cy="130" r="2" fill="#111"/>'},
/* bottoms */
jeans:{slot:'bottom',name:'Blue Jeans',scene:'jungle',svg:'<path d="'+PANTS+'" fill="#3b82f6"'+O+'/><path d="M80 200 L80 243 M120 200 L120 243" stroke="#1d4ed8" stroke-width="2"/><path d="M74 194 Q80 200 88 196 M112 196 Q120 200 126 194" stroke="#1d4ed8" stroke-width="2" fill="none"/>'},
trunks:{slot:'bottom',name:'Swim Trunks',scene:'beach',svg:'<path d="'+SHORTS+'" fill="#fb923c"'+O+'/><path d="M72 192 L70 218 M128 192 L130 218" stroke="#fff" stroke-width="4"/><circle cx="114" cy="206" r="5" fill="#fde047"/><circle cx="86" cy="202" r="4" fill="#fff"/>'},
tutu:{slot:'bottom',name:'Tutu',scene:'party',svg:'<path d="M66 186 Q100 198 134 186 L150 214 L134 208 L126 222 L114 210 L104 224 L96 210 L86 222 L74 208 L50 214 Z" fill="#f9a8d4"'+O+'/><path d="M67 188 Q100 200 133 188" stroke="#ec4899" stroke-width="5" fill="none"/>'},
snowpants:{slot:'bottom',name:'Snow Pants',scene:'snow',svg:'<path d="'+PANTS+'" fill="#1e40af"'+O+'/><rect x="71" y="220" width="18" height="10" rx="4" fill="#3b82f6"/><rect x="111" y="220" width="18" height="10" rx="4" fill="#3b82f6"/>'},
sshorts:{slot:'bottom',name:'Soccer Shorts',scene:'soccer',svg:'<path d="'+SHORTS+'" fill="#fff"'+O+'/><path d="M71 190 L69 219 M129 190 L131 219" stroke="#2563eb" stroke-width="5"/>'},
tuxpants:{slot:'bottom',name:'Fancy Pants',scene:'opera',svg:'<path d="'+PANTS+'" fill="#111827"'+O+'/><path d="M73 194 L72 244 M127 194 L128 244" stroke="#6b7280" stroke-width="3"/>'},
spacepants:{slot:'bottom',name:'Space Pants',scene:'space',svg:'<path d="'+PANTS+'" fill="#f1f5f9"'+O+'/><rect x="71" y="218" width="18" height="12" rx="5" fill="#cbd5e1"/><rect x="111" y="218" width="18" height="12" rx="5" fill="#cbd5e1"/><path d="M70 236 H92 M108 236 H130" stroke="#f97316" stroke-width="4"/>'},
/* shoes */
sneakers:{slot:'feet',name:'Red Sneakers',scene:'jungle',svg:shoes('#ef4444','<rect x="61" y="255" width="34" height="7" rx="3" fill="#fff"'+O2+'/><rect x="105" y="255" width="34" height="7" rx="3" fill="#fff"'+O2+'/><path d="M74 247 L82 245 M73 251 L84 249 M118 245 L126 247 M116 249 L127 251" stroke="#fff" stroke-width="2"/>')},
flipflops:{slot:'feet',name:'Flip-Flops',scene:'beach',svg:'<ellipse cx="78" cy="262" rx="18" ry="4.5" fill="#22c55e"'+O2+'/><ellipse cx="122" cy="262" rx="18" ry="4.5" fill="#22c55e"'+O2+'/><path d="M70 252 L79 257 L87 251 M113 251 L121 257 L130 252" stroke="#16a34a" stroke-width="3.5" fill="none" stroke-linecap="round"/>'},
boots:{slot:'feet',over:1,name:'Snow Boots',scene:'snow',svg:'<path d="M66 232 Q78 228 91 232 L93 250 C98 255 97 263 89 263 L66 263 C58 263 57 254 63 249 Z" fill="#92400e"'+O+'/><path d="M134 232 Q122 228 109 232 L107 250 C102 255 103 263 111 263 L134 263 C142 263 143 254 137 249 Z" fill="#92400e"'+O+'/><path d="M60 260 Q78 264 96 260 M104 260 Q122 264 140 260" stroke="#5b2a0a" stroke-width="3" fill="none" stroke-linecap="round"/>'+[64,71,78,85,92,108,115,122,129,136].map(function(x,i){return '<circle cx="'+x+'" cy="'+(229+(i%2))+'" r="5.5" fill="#fff"/>';}).join('')+'<ellipse cx="72" cy="244" rx="3" ry="7" fill="#fff" opacity=".18"/><ellipse cx="116" cy="244" rx="3" ry="7" fill="#fff" opacity=".18"/>'},
cleats:{slot:'feet',name:'Cleats',scene:'soccer',svg:shoes('#111827','<path d="M66 260 v4 M74 260 v4 M82 260 v4 M90 260 v4 M110 260 v4 M118 260 v4 M126 260 v4 M134 260 v4" stroke="#9ca3af" stroke-width="3"/><path d="M70 249 L88 247 M112 247 L130 249" stroke="#22c55e" stroke-width="3"/>')},
dressshoes:{slot:'feet',name:'Shiny Shoes',scene:'opera',svg:shoes('#111827','<ellipse cx="74" cy="248" rx="5" ry="2" fill="#fff" opacity=".6"/><ellipse cx="126" cy="248" rx="5" ry="2" fill="#fff" opacity=".6"/>')},
moonboots:{slot:'feet',name:'Moon Boots',scene:'space',svg:'<rect x="59" y="229" width="38" height="34" rx="16" fill="#f8fafc"'+O+'/><rect x="103" y="229" width="38" height="34" rx="16" fill="#f8fafc"'+O+'/><path d="M61 245 Q78 250 95 245 M105 245 Q122 250 139 245" stroke="#94a3b8" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M63 257 Q78 261 93 257 M107 257 Q122 261 137 257" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="237" rx="4" ry="5" fill="#fff"/>'},
goldslippers:{slot:'feet',name:'Golden Slippers',scene:'palace',svg:shoes('#fbbf24','<circle cx="80" cy="249" r="3" fill="#ef4444"/><circle cx="120" cy="249" r="3" fill="#ef4444"/>')},
/* hats */
cap:{slot:'head',name:'Ball Cap',scene:'jungle',svg:'<path d="M60 60 C58 32 78 24 100 24 C122 24 142 32 140 60 Q100 52 60 60 Z" fill="#ef4444"'+O+'/><path d="M116 55 Q148 48 166 58 Q166 66 150 66 Q132 66 116 62 Z" fill="#dc2626"'+O+'/><circle cx="100" cy="24" r="4.5" fill="#38bdf8"'+O2+'/>'},
sunhat:{slot:'head',name:'Sun Hat',scene:'beach',svg:'<path d="M70 44 C68 20 82 11 100 11 C118 11 132 20 130 44 Z" fill="#fde68a"'+O+'/><path d="M71 34 Q100 40 129 34 L130 42 Q100 48 70 42 Z" fill="#ef4444"/><path d="M40 46 Q42 36 70 38 Q100 44 130 38 Q158 36 160 46 Q158 55 100 54 Q42 55 40 46 Z" fill="#fde68a"'+O+'/><circle cx="124" cy="36" r="6" fill="#f472b6"'+O2+'/>'},
party:{slot:'head',name:'Party Hat',scene:'party',svg:tg(HEAD_ACC.party)},
beanie:{slot:'head',name:'Beanie',scene:'snow',svg:'<path d="M60 56 C58 30 78 18 100 18 C122 18 142 30 140 56 Z" fill="#10b981"'+O+'/><path d="M80 26 Q78 36 80 46 M100 22 V46 M120 26 Q122 36 120 46" stroke="#059669" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M56 50 Q100 38 144 50 Q147 56 143 62 Q100 50 57 62 Q53 56 56 50 Z" fill="#059669"'+O+'/><circle cx="100" cy="15" r="10" fill="#fff"'+O+'/><circle cx="93" cy="12" r="5" fill="#fff"/><circle cx="107" cy="12" r="5" fill="#fff"/><circle cx="100" cy="9" r="5" fill="#fff"/>'},
sweatband:{slot:'head',name:'Sweatband',scene:'soccer',svg:'<path d="M62 48 Q100 34 138 48 L138 58 Q100 44 62 58 Z" fill="#fff"'+O+'/><path d="M63 53 Q100 39 137 53" stroke="#ef4444" stroke-width="3" fill="none"/>'},
tophat:{slot:'head',name:'Top Hat',scene:'opera',svg:'<path d="M74 -6 Q100 -13 126 -6 Q122 14 124 36 Q100 41 76 36 Q78 14 74 -6 Z" fill="#111827"'+O+'/><path d="M77 27 Q100 31 123 27 L123.5 34 Q100 38 76.5 34 Z" fill="#dc2626"/><path d="M84 -4 Q82 14 84 30" stroke="#fff" stroke-opacity=".18" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M56 38 Q58 31 76 34 Q100 40 124 34 Q142 31 144 38 Q142 46 100 45 Q58 46 56 38 Z" fill="#111827"'+O+'/>'},
helmet:{slot:'head',name:'Space Helmet',scene:'space',svg:'<circle cx="100" cy="72" r="58" fill="rgba(186,230,253,.28)" stroke="#e2e8f0" stroke-width="6"/><circle cx="100" cy="72" r="58" fill="none" stroke="#2b2350" stroke-width="2"/><path d="M62 44 Q74 24 96 18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/><ellipse cx="100" cy="128" rx="36" ry="8" fill="#cbd5e1"'+O+'/>'},
crown:{slot:'head',name:'Crown',scene:'palace',svg:tg(HEAD_ACC.crown)},
wizard:{slot:'head',name:'Wizard Hat',scene:'palace',svg:tg(HEAD_ACC.wizard)},
/* glasses */
shades:{slot:'eyes',name:'Sunglasses',scene:'beach',svg:tg(HEAD_ACC.shades)},
hearts:{slot:'eyes',name:'Heart Glasses',scene:'party',svg:heart(88,66)+heart(112,66)+'<path d="M97 63 L103 63" stroke="#2b2350" stroke-width="2"/>'},
goggles:{slot:'eyes',name:'Ski Goggles',scene:'snow',svg:'<path d="M58 60 Q100 52 142 60 L142 68 Q100 60 58 68 Z" fill="#111827"/><rect x="74" y="54" width="52" height="22" rx="10" fill="#fb923c"'+O+'/><path d="M80 61 L92 59" stroke="#fff" stroke-width="3" opacity=".75" stroke-linecap="round"/>'},
operaglasses:{slot:'eyes',name:'Opera Glasses',scene:'opera',svg:'<circle cx="88" cy="66" r="9" fill="rgba(255,255,255,.35)" stroke="#d4a017" stroke-width="3"/><circle cx="112" cy="66" r="9" fill="rgba(255,255,255,.35)" stroke="#d4a017" stroke-width="3"/><path d="M97 66 L103 66 M120 72 L138 104" stroke="#d4a017" stroke-width="3" stroke-linecap="round"/>'},
/* neck */
lei:{slot:'neck',name:'Flower Lei',scene:'beach',svg:ring(11,30,13,113,function(x,y,i){return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+['#f472b6','#fde047','#fb923c'][i%3]+'"'+O2+'/>';})},
bowtie:{slot:'neck',name:'Bow Tie',scene:'party',svg:'<path d="M86 114 L100 120 L86 126 Z M114 114 L100 120 L114 126 Z" fill="#ef4444"'+O2+'/><circle cx="100" cy="120" r="4" fill="#b91c1c"'+O2+'/>'},
scarf:{slot:'neck',name:'Scarf',scene:'snow',svg:'<path d="M68 108 Q100 126 132 108 L134 120 Q100 140 66 120 Z" fill="#dc2626"'+O+'/><path d="M110 126 L122 162 L108 164 L100 130 Z" fill="#dc2626"'+O+'/><path d="M110 152 L121 150 M112 158 L122 156" stroke="#fff" stroke-width="3"/>'},
medal:{slot:'neck',name:'Gold Medal',scene:'soccer',svg:'<path d="M84 112 L100 146 L116 112" stroke="#2563eb" stroke-width="7" fill="none"/><circle cx="100" cy="151" r="11" fill="#fbbf24"'+O+'/><text x="100" y="156" font-size="13" text-anchor="middle" fill="#92400e">★</text>'},
pearls:{slot:'neck',name:'Pearl Necklace',scene:'opera',svg:ring(13,26,12,112,function(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="3.6" fill="#fff" stroke="#9ca3af" stroke-width="1.5"/>';})},
/* hold */
banana:{slot:'hand',name:'Banana',scene:'jungle',svg:'<path d="M140 194 Q144 160 172 150 Q160 170 157 197 Z" fill="#ffd23f"'+O+'/><path d="M170 149 L177 144" stroke="#5a3418" stroke-width="4" stroke-linecap="round"/>'},
surf:{slot:'hand',name:'Surfboard',scene:'beach',back:'<ellipse cx="172" cy="182" rx="16" ry="84" fill="#38bdf8"'+O+'/><path d="M172 102 L172 262" stroke="#fde047" stroke-width="5"/>',svg:''},
icecream:{slot:'hand',name:'Ice Cream',scene:'beach',svg:'<path d="M136 186 L152 186 L144 214 Z" fill="#f4c26b"'+O+'/><circle cx="144" cy="177" r="10" fill="#f9a8d4"'+O+'/><circle cx="144" cy="165" r="8" fill="#a7f3d0"'+O+'/><circle cx="147" cy="156" r="3" fill="#ef4444"/>'},
balloon:{slot:'hand',name:'Balloon',scene:'party',svg:'<path d="M146 188 Q162 140 168 94" stroke="#2b2350" stroke-width="1.5" fill="none"/><ellipse cx="168" cy="70" rx="20" ry="24" fill="#ef4444"'+O+'/><path d="M164 96 L172 96 L168 91 Z" fill="#ef4444"'+O2+'/><ellipse cx="161" cy="61" rx="5" ry="8" fill="#fff" opacity=".5"/>'},
snowboard:{slot:'hand',name:'Snowboard',scene:'snow',back:'<rect x="16" y="96" width="28" height="170" rx="14" fill="#8b5cf6"'+O+'/><path d="M20 150 h20 M20 212 h20" stroke="#fde047" stroke-width="4"/>',svg:''},
cocoa:{slot:'hand',name:'Hot Cocoa',scene:'snow',svg:'<path d="M156 178 Q166 184 156 192" stroke="#2b2350" stroke-width="3" fill="none"/><rect x="134" y="172" width="22" height="25" rx="4" fill="#fff"'+O+'/><rect x="136" y="175" width="18" height="5" fill="#7c2d12"/><path d="M140 168 Q136 160 141 152 M150 168 Q146 160 151 152" stroke="#94a3b8" stroke-width="2" fill="none"/>'},
ball:{slot:'hand',name:'Soccer Ball',scene:'soccer',svg:'<circle cx="160" cy="248" r="16" fill="#fff"'+O+'/><polygon points="160,240 167,245 164,253 156,253 153,245" fill="#111827"/><path d="M160 240 L160 232 M167 245 L175 242 M164 253 L169 260 M156 253 L151 260 M153 245 L145 242" stroke="#111827" stroke-width="2"/>'},
rose:{slot:'hand',name:'Rose',scene:'opera',svg:'<path d="M146 194 L158 146" stroke="#16a34a" stroke-width="3"/><path d="M152 170 Q161 163 163 172 Q156 174 152 170 Z" fill="#22c55e"/><circle cx="159" cy="142" r="9" fill="#e11d48"'+O2+'/><path d="M154 140 Q159 135 164 141" stroke="#9f1239" stroke-width="2" fill="none"/>'},
flag:{slot:'hand',name:'Planet Flag',scene:'space',svg:'<path d="M146 202 L152 86" stroke="#64748b" stroke-width="4" stroke-linecap="round"/><path d="M152 88 L190 94 L186 116 L150 112 Z" fill="#22d3ee"'+O2+'/><text x="170" y="109" font-size="13" text-anchor="middle" fill="#fff">★</text>'},
scepter:{slot:'hand',name:'Scepter',scene:'palace',svg:'<path d="M144 206 L152 118" stroke="#92400e" stroke-width="8" stroke-linecap="round"/><path d="M144 206 L152 118" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/><circle cx="153" cy="110" r="10" fill="#a855f7"'+O+'/><circle cx="150" cy="107" r="3" fill="#fff" opacity=".7"/>'}
};
var SLOTS=[['head','🎩','Hats'],['eyes','🕶️','Glasses'],['neck','🎀','Neck'],['top','👕','Tops'],['bottom','👖','Bottoms'],['feet','👟','Shoes'],['hand','🍌','Hold']];
var DEFAULT_LOOK={head:'cap',eyes:'',neck:'',top:'tee',bottom:'jeans',feet:'sneakers',hand:'banana'};
function monkeyBody(L,mood){
L=L||{};var yay=mood==='yay',id='cmm'+(++MID),F='url(#'+id+'f)',C='url(#'+id+'s)';function it(s){var i=ITEMS[L[s]];return i||null;}
var back='';SLOTS.forEach(function(s){if(yay&&s[0]==='hand')return;var i=it(s[0]);if(i&&i.back)back+=i.back;});
function part(s){if(yay&&s==='hand')return '';var i=it(s);return i?i.svg.replace(/CLIP/g,id+'c'):'';}
var top=it('top'),sl=top&&top.sl,pf=top&&top.pf,puffs=pf?'<ellipse cx="67" cy="139" rx="12.5" ry="10.5" fill="'+pf+'"'+O+' transform="rotate(-30 67 139)"/><ellipse cx="133" cy="139" rx="12.5" ry="10.5" fill="'+pf+'"'+O+' transform="rotate(30 133 139)"/><path d="M60 135 Q65 131 70 133 M140 135 Q135 131 130 133" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" fill="none" stroke-linecap="round"/>':'',shine=top?'<ellipse cx="80" cy="152" rx="6" ry="14" fill="#fff" opacity=".2" transform="rotate(18 80 152)"/>':'',ac=sl||FUR,ae=sl?'#5a3a28':FUR_D;
var ARMS=yay?'M74 134 Q38 106 42 40 M126 134 Q162 106 158 40':'M72 132 Q54 158 56 186 M128 132 Q146 158 144 186';
var arms='<path d="'+ARMS+'" stroke="'+ae+'" stroke-width="'+(sl?19:18)+'" fill="none" stroke-linecap="round"/><path d="'+ARMS+'" stroke="'+ac+'" stroke-width="'+(sl?14.5:14)+'" fill="none" stroke-linecap="round"/>';
var hands=yay?'<circle cx="42" cy="32" r="10.5" fill="'+C+'"/><circle cx="158" cy="32" r="10.5" fill="'+C+'"/>':'<circle cx="56" cy="192" r="9.5" fill="'+C+'"/><circle cx="144" cy="192" r="9.5" fill="'+C+'"/>';
return mDefs(id).replace('</defs>','<clipPath id="'+id+'c"><path d="'+TEE+'"/></clipPath></defs>')+back+
'<path d="M120 206 C150 226 186 228 187 204 C188 188 168 186 167 199" stroke="'+FUR_D+'" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M120 206 C150 226 186 228 187 204 C188 188 168 186 167 199" stroke="'+FUR+'" stroke-width="8" fill="none" stroke-linecap="round"/>'+
'<path d="M86 192 L82 246 M114 192 L118 246" stroke="'+FUR_D+'" stroke-width="22" stroke-linecap="round"/><path d="M86 192 L82 246 M114 192 L118 246" stroke="'+FUR+'" stroke-width="18" stroke-linecap="round"/>'+
'<ellipse cx="78" cy="254" rx="16" ry="9" fill="'+C+'" stroke="#d9a066" stroke-width="1.5"/><ellipse cx="122" cy="254" rx="16" ry="9" fill="'+C+'" stroke="#d9a066" stroke-width="1.5"/>'+
'<ellipse cx="100" cy="160" rx="36" ry="48" fill="'+F+'"/><ellipse cx="100" cy="168" rx="24" ry="31" fill="'+C+'"/>'+
(it('feet')&&it('feet').over?part('bottom')+part('feet'):part('feet')+part('bottom'))+
(yay?arms+hands+part('top')+puffs:part('top')+arms+puffs+hands)+shine+
part('hand')+
part('neck')+
'<g transform="translate(100 72) scale(1.18) translate(-100 -72)"><g transform="translate(40,12)">'+headInner(id,mood)+'</g>'+part('eyes')+part('head')+'</g>';
}
function monkeyFull(L,cls,mood){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -24 212 304" class="'+(cls||'')+'" aria-hidden="true">'+monkeyBody(L,mood)+'</svg>';}
function yayMochi(){var sp=function(x,y,c,k){return '<path d="M'+x+' '+(y-10*k)+' L'+(x+3*k)+' '+(y-3*k)+' L'+(x+10*k)+' '+y+' L'+(x+3*k)+' '+(y+3*k)+' L'+x+' '+(y+10*k)+' L'+(x-3*k)+' '+(y+3*k)+' L'+(x-10*k)+' '+y+' L'+(x-3*k)+' '+(y-3*k)+' Z" fill="'+c+'"/>';};
return '<a class="cm-yay" href="#cm/kids/monkey" data-go="kids/monkey" title="Dress up '+esc(S.mname)+'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -30 212 310" aria-hidden="true"><g class="cm-twinkle">'+sp(10,20,'#ffd23f',1.2)+sp(194,100,'#38bdf8',1)+sp(186,6,'#ff5fa2',.9)+sp(6,150,'#22c55e',.8)+'</g><g class="cm-yhop">'+monkeyBody(S.look,'yay')+'</g></svg><small>Tap '+esc(S.mname)+' to dress up!</small></a>';}
function monkeyURI(L){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(monkeyFull(L||S.look));}

/* ---------- adventures (scenes) ---------- */
var SCENES=[
{id:'jungle',name:'Jungle Home',icon:'🌴',need:0,blurb:'Home sweet treehouse — swinging on vines all day.',look:{head:'cap',top:'tee',bottom:'jeans',feet:'sneakers',hand:'banana'}},
{id:'beach',name:'Beach Day',icon:'🏖️',need:15,blurb:'Sun, sand and surfing! Don’t forget the sunglasses.',look:{head:'sunhat',eyes:'shades',neck:'lei',top:'hawaii',bottom:'trunks',feet:'flipflops',hand:'surf'}},
{id:'party',name:'Birthday Party',icon:'🎉',need:40,blurb:'Cake, balloons and a dance party!',look:{head:'party',eyes:'hearts',neck:'bowtie',top:'striped',bottom:'tutu',feet:'sneakers',hand:'balloon'}},
{id:'snow',name:'Snowy Mountain',icon:'🏔️',need:75,blurb:'Bundle up — it’s time to hit the slopes!',look:{head:'beanie',eyes:'goggles',neck:'scarf',top:'puffer',bottom:'snowpants',feet:'boots',hand:'snowboard'}},
{id:'soccer',name:'Soccer Stadium',icon:'⚽',need:120,blurb:'The crowd is cheering — score the winning goal!',look:{head:'sweatband',neck:'medal',top:'jersey',bottom:'sshorts',feet:'cleats',hand:'ball'}},
{id:'opera',name:'Night at the Opera',icon:'🎭',need:175,blurb:'Dress your fanciest — the curtain is rising!',look:{head:'tophat',eyes:'operaglasses',neck:'bowtie',top:'tux',bottom:'tuxpants',feet:'dressshoes',hand:'rose'}},
{id:'space',name:'Trip to Space',icon:'🚀',need:250,blurb:'3… 2… 1… blast off to a brand-new planet!',look:{head:'helmet',top:'spacesuit',bottom:'spacepants',feet:'moonboots',hand:'flag'}},
{id:'palace',name:'Royal Palace',icon:'👑',need:350,blurb:'Make way for royalty — the Banana King has arrived!',look:{head:'crown',neck:'pearls',top:'robe',bottom:'tuxpants',feet:'goldslippers',hand:'scepter'}}
];
function sceneById(id){return SCENES.filter(function(s){return s.id===id;})[0]||SCENES[0];}
function sceneOpen(sc){return S.bananas>=sc.need;}
function itemOpen(id){var i=ITEMS[id];return !i||sceneOpen(sceneById(i.scene));}
function nextScene(){return SCENES.filter(function(s){return s.need>S.bananas;})[0]||null;}
var BG={
jungle:'<defs><linearGradient id="cmg-j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be7ff"/><stop offset="1" stop-color="#e8ffd6"/></linearGradient></defs><rect width="400" height="300" fill="url(#cmg-j)"/><circle class="cm-sun" cx="335" cy="58" r="28" fill="#ffe066"/><ellipse cx="90" cy="300" rx="200" ry="72" fill="#7ed957"/><ellipse cx="335" cy="306" rx="175" ry="82" fill="#5cc93f"/><path d="M48 300 Q58 220 40 148" stroke="#8b5a2b" stroke-width="13" fill="none" stroke-linecap="round"/>'+[[-40,'#22a03b'],[10,'#2fb344'],[60,'#1e8f35'],[110,'#2fb344'],[160,'#22a03b']].map(function(a){return '<ellipse cx="40" cy="148" rx="46" ry="12" fill="'+a[1]+'" transform="rotate('+a[0]+' 40 148) translate(36 0)"/>';}).join('')+'<path d="M250 0 Q262 50 244 96" stroke="#2f9e44" stroke-width="5" fill="none"/><path d="M300 0 Q290 34 304 64" stroke="#2f9e44" stroke-width="5" fill="none"/><ellipse cx="250" cy="60" rx="9" ry="5" fill="#3fcf55"/><ellipse cx="296" cy="40" rx="9" ry="5" fill="#3fcf55"/><circle cx="352" cy="232" r="7" fill="#ff5fa2"/><circle cx="30" cy="252" r="6" fill="#ffd23f"/>',
beach:'<defs><linearGradient id="cmg-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="400" height="300" fill="url(#cmg-b)"/><g class="cm-sun"><circle cx="330" cy="58" r="30" fill="#fde047"/>'+seq(8).map(function(i){return '<path d="M330 58 L'+(330+Math.cos(i*Math.PI/4)*48)+' '+(58+Math.sin(i*Math.PI/4)*48)+'" stroke="#fde047" stroke-width="4"/>';}).join('')+'</g><rect y="150" width="400" height="70" fill="#38bdf8"/><path class="cm-wave" d="M-40 160 Q-20 152 0 160 T40 160 T80 160 T120 160 T160 160 T200 160 T240 160 T280 160 T320 160 T360 160 T400 160 T440 160" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/><path class="cm-wave" d="M-40 182 Q-20 174 0 182 T40 182 T80 182 T120 182 T160 182 T200 182 T240 182 T280 182 T320 182 T360 182 T400 182 T440 182" stroke="#e0f2fe" stroke-width="3" fill="none"/><path d="M0 206 Q200 186 400 210 L400 300 L0 300 Z" fill="#fde68a"/><path d="M330 290 L330 186" stroke="#7c2d12" stroke-width="4"/><path d="M270 196 Q330 128 390 196 Z" fill="#ef4444" stroke="#2b2350" stroke-width="2"/><path d="M310 196 Q330 140 330 140 Q330 140 350 196 Z" fill="#fff"/><polygon points="52,262 56,272 67,272 58,278 62,288 52,282 42,288 46,278 37,272 48,272" fill="#fb923c"/><ellipse cx="90" cy="280" rx="8" ry="5" fill="#fbcfe8"/>',
party:'<defs><linearGradient id="cmg-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ddd6fe"/><stop offset="1" stop-color="#fbcfe8"/></linearGradient></defs><rect width="400" height="300" fill="url(#cmg-p)"/><rect y="236" width="400" height="64" fill="#f5d0fe"/><path d="M0 22 Q200 76 400 22" stroke="#7c3aed" stroke-width="2" fill="none"/>'+seq(9).map(function(i){var x=20+i*45,y=22+Math.sin(i/8*Math.PI)*27;return '<polygon points="'+(x-12)+','+(y)+' '+(x+12)+','+(y)+' '+x+','+(y+22)+'" fill="'+['#f472b6','#fde047','#22c55e','#38bdf8'][i%4]+'"/>';}).join('')+'<path d="M40 190 Q36 120 46 80" stroke="#2b2350" stroke-width="1.5" fill="none"/><ellipse cx="46" cy="70" rx="18" ry="22" fill="#22c55e"/><path d="M70 190 Q74 130 76 100" stroke="#2b2350" stroke-width="1.5" fill="none"/><ellipse cx="76" cy="90" rx="16" ry="20" fill="#38bdf8"/><path d="M360 200 Q362 140 356 110" stroke="#2b2350" stroke-width="1.5" fill="none"/><ellipse cx="356" cy="98" rx="18" ry="22" fill="#fde047"/><rect x="292" y="236" width="96" height="10" fill="#a16207"/><rect x="306" y="206" width="68" height="30" rx="4" fill="#fbcfe8" stroke="#2b2350" stroke-width="2"/><rect x="314" y="186" width="52" height="22" rx="4" fill="#fff" stroke="#2b2350" stroke-width="2"/><path d="M330 186 v-10 M340 186 v-10 M350 186 v-10" stroke="#38bdf8" stroke-width="3"/><circle cx="330" cy="173" r="3" fill="#fb923c"/><circle cx="340" cy="173" r="3" fill="#fb923c"/><circle cx="350" cy="173" r="3" fill="#fb923c"/>'+seq(14).map(function(i){return '<rect x="'+((i*67)%390)+'" y="'+(110+(i*37)%110)+'" width="6" height="9" fill="'+['#f472b6','#fde047','#22c55e','#38bdf8'][i%4]+'" transform="rotate('+(i*30)+' '+((i*67)%390)+' '+(110+(i*37)%110)+')"/>';}).join(''),
snow:'<defs><linearGradient id="cmg-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfdbfe"/><stop offset="1" stop-color="#eff6ff"/></linearGradient></defs><rect width="400" height="300" fill="url(#cmg-s)"/><polygon points="-20,230 90,70 200,230" fill="#e2e8f0"/><polygon points="90,70 115,106 100,100 82,112 70,98" fill="#fff"/><polygon points="140,230 290,40 430,230" fill="#cbd5e1"/><polygon points="290,40 320,82 302,76 284,90 268,74" fill="#fff"/><path d="M0 230 Q200 206 400 234 L400 300 L0 300 Z" fill="#fff"/>'+[[30,236],[358,240],[380,214]].map(function(t){return '<polygon points="'+t[0]+','+(t[1]-60)+' '+(t[0]-20)+','+t[1]+' '+(t[0]+20)+','+t[1]+'" fill="#166534"/><rect x="'+(t[0]-3)+'" y="'+t[1]+'" width="6" height="10" fill="#7c2d12"/>';}).join('')+'<g class="cm-snowfall">'+seq(26).map(function(i){return '<circle cx="'+((i*53)%400)+'" cy="'+((i*71)%280)+'" r="'+(2+i%3)+'" fill="#fff"/>';}).join('')+'</g>',
soccer:'<rect width="400" height="300" fill="#93c5fd"/><rect y="40" width="400" height="90" fill="#64748b"/>'+seq(60).map(function(i){return '<circle cx="'+(8+(i%20)*20)+'" cy="'+(52+Math.floor(i/20)*24)+'" r="7" fill="'+['#f87171','#fde047','#60a5fa','#f9a8d4','#86efac'][i%5]+'"/>';}).join('')+'<rect y="128" width="400" height="172" fill="#22c55e"/>'+seq(5).map(function(i){return '<rect x="'+(i*80)+'" y="128" width="40" height="172" fill="#16a34a"/>';}).join('')+'<path d="M0 214 H400 M200 128 V300" stroke="#fff" stroke-width="3" opacity=".7"/><circle cx="200" cy="214" r="34" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/><rect x="300" y="150" width="90" height="60" fill="none" stroke="#fff" stroke-width="5"/><path d="M310 150 V210 M325 150 V210 M340 150 V210 M355 150 V210 M370 150 V210 M300 165 H390 M300 180 H390 M300 195 H390" stroke="#fff" stroke-width="1.2" opacity=".7"/>',
opera:'<rect width="400" height="300" fill="#3b0a18"/><rect x="40" y="30" width="320" height="220" fill="#581c2c"/><polygon points="200,0 120,300 280,300" fill="rgba(255,240,180,.22)"/><rect y="244" width="400" height="56" fill="#92400e"/><path d="M0 244 H400" stroke="#fbbf24" stroke-width="4"/><path d="M0 0 H90 Q70 80 92 160 Q70 220 84 300 H0 Z" fill="#b91c1c"/><path d="M20 0 Q30 150 18 300 M50 0 Q62 150 48 300" stroke="#7f1d1d" stroke-width="5" fill="none"/><path d="M400 0 H310 Q330 80 308 160 Q330 220 316 300 H400 Z" fill="#b91c1c"/><path d="M380 0 Q370 150 382 300 M350 0 Q338 150 352 300" stroke="#7f1d1d" stroke-width="5" fill="none"/>'+seq(8).map(function(i){return '<path d="M'+(i*50)+' 0 Q'+(i*50+25)+' 34 '+(i*50+50)+' 0 Z" fill="#991b1b"/>';}).join('')+'<path d="M200 0 V22" stroke="#fbbf24" stroke-width="2"/><path d="M178 22 H222 L214 36 H186 Z" fill="#fbbf24"/>'+[184,200,216].map(function(x){return '<circle cx="'+x+'" cy="40" r="4" fill="#fff7cc"/>';}).join(''),
space:'<rect width="400" height="300" fill="#0b1026"/>'+seq(40).map(function(i){return '<circle class="'+(i%3?'':'cm-twinkle')+'" cx="'+((i*97)%400)+'" cy="'+((i*61)%230)+'" r="'+(1+i%2)+'" fill="#fff"/>';}).join('')+'<circle cx="320" cy="70" r="34" fill="#f472b6"/><ellipse cx="320" cy="70" rx="58" ry="12" fill="none" stroke="#fde68a" stroke-width="5" transform="rotate(-18 320 70)"/><circle cx="62" cy="58" r="22" fill="#3b82f6"/><path d="M50 50 Q60 44 66 54 Q58 62 50 58 Z M64 66 Q74 60 78 70 Q70 76 64 66 Z" fill="#22c55e"/><path d="M0 238 Q200 214 400 240 L400 300 L0 300 Z" fill="#94a3b8"/><ellipse cx="70" cy="266" rx="26" ry="8" fill="#64748b"/><ellipse cx="330" cy="276" rx="20" ry="6" fill="#64748b"/><ellipse cx="250" cy="256" rx="12" ry="4" fill="#64748b"/>',
palace:'<defs><linearGradient id="cmg-k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs><rect width="400" height="300" fill="url(#cmg-k)"/><rect x="60" y="110" width="280" height="140" fill="#e9d5ff" stroke="#2b2350" stroke-width="2"/>'+seq(9).map(function(i){return '<rect x="'+(60+i*31)+'" y="98" width="16" height="14" fill="#e9d5ff" stroke="#2b2350" stroke-width="2"/>';}).join('')+[40,330].map(function(x){return '<rect x="'+x+'" y="70" width="40" height="180" fill="#ddd6fe" stroke="#2b2350" stroke-width="2"/><polygon points="'+(x-6)+',70 '+(x+20)+',24 '+(x+46)+',70" fill="#7c3aed" stroke="#2b2350" stroke-width="2"/><path d="M'+(x+20)+' 24 V8" stroke="#2b2350" stroke-width="2"/><path d="M'+(x+20)+' 8 L'+(x+38)+' 13 L'+(x+20)+' 18 Z" fill="#ef4444"/><rect x="'+(x+12)+'" y="110" width="16" height="22" rx="8" fill="#7c3aed"/>';}).join('')+'<path d="M170 250 V190 Q200 160 230 190 V250 Z" fill="#7c3aed" stroke="#2b2350" stroke-width="2"/><polygon points="160,300 240,300 222,250 178,250" fill="#dc2626"/><rect y="250" width="400" height="50" fill="#bbf7d0" opacity=".6"/><polygon points="160,300 240,300 222,250 178,250" fill="#dc2626"/>'
};
function sceneSVG(id,L,cls){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" class="cm-scene '+(cls||'')+'" role="img" aria-label="'+sceneById(id).name+'">'+(BG[id]||BG.jungle)+'<g transform="translate(116,36) scale(.84)"><g class="cm-mbob">'+monkeyBody(L)+'</g></g></svg>';}
var PENDING_ADV=null;
function announceAdv(){
var sc=PENDING_ADV;if(!sc)return;PENDING_ADV=null;var old=root.querySelector('.cm-toast');if(old)old.remove();
var F=FUN[sc.id],o=root.querySelector('.cm-annc');if(o)o.remove();
var d=document.createElement('div');d.className='cm-annc';
d.innerHTML='<div class="cm-annbox"><div class="cm-annburst">🎉</div><h2>New adventure ready to play!</h2><div class="cm-annscene">'+sceneSVG(sc.id,sc.look)+'</div><p>You earned <b>'+sc.need+' bananas</b>! '+esc(S.mname)+' can go to <b>'+sc.icon+' '+sc.name+'</b> — with new clothes to wear and a new game: <b>'+F.icon+' '+F.name+'</b>!</p><div class="cm-ovbtns"><button class="cm-bigbtn next" data-a="play">'+F.icon+' Play '+F.name+' ▶</button><button class="cm-bigbtn alt" data-a="dress">👕 Dress up for '+sc.name+'</button><button class="cm-bigbtn alt" data-a="later">Later</button></div></div>';
root.appendChild(d);sfxWin();confetti(d.querySelector('.cm-annbox'));
d.onclick=function(e){var b=e.target.closest('[data-a]');if(!b)return;var a=b.getAttribute('data-a');d.remove();if(a==='later')return;S.scene=sc.id;store.set('scene',sc.id);go(a==='play'?'kids/fun-'+sc.id:'kids/monkey');};
}
function unlockToast(sc){
var old=root.querySelector('.cm-toast');if(old)old.remove();
var t=document.createElement('div');t.className='cm-toast';
t.innerHTML='<div class="cm-toast-ic">'+sc.icon+'</div><div><b>🎉 New adventure ready to play!</b><span>'+S.mname+' can go to '+sc.name+' — with new clothes and a new fun game: '+FUN[sc.id].icon+' '+FUN[sc.id].name+'!</span></div><button>See it ▶</button><button class="x" aria-label="Close">✕</button>';
PENDING_ADV=sc;root.appendChild(t);sfxWin();
t.querySelector('button').onclick=function(){S.scene=sc.id;store.set('scene',sc.id);t.remove();go('kids/monkey');};
t.querySelector('.x').onclick=function(){t.remove();};
setTimeout(function(){if(t.parentNode)t.classList.add('out');setTimeout(function(){if(t.parentNode)t.remove();},500);},9000);
}

/* fun effects */
var CONF=['#ff5fa2','#ffd23f','#22c55e','#38bdf8','#8b5cf6','#ff8c42'];
function confetti(box){for(var i=0;i<26;i++){var c=document.createElement('i');c.className='cm-conf';c.style.left=rnd(2,96)+'%';c.style.background=pick(CONF);c.style.animationDelay=(Math.random()*.35)+'s';box.appendChild(c);(function(el){setTimeout(function(){el.remove();},1900);})(c);}}
function floatText(box,x,y,txt){var s=document.createElement('span');s.className='cm-float';s.style.left=x+'px';s.style.top=y+'px';s.textContent=txt;box.appendChild(s);setTimeout(function(){s.remove();},950);}
function showOv(ov,html,btn,cb){showOv2(ov,html,[[btn,cb]]);}
function showOv2(ov,html,btns){
ov.classList.remove('cm-ovcoach');
ov.innerHTML='<div class="cm-ovbox">'+html+'<div class="cm-ovbtns">'+btns.map(function(b,i){return '<button class="cm-bigbtn'+(b[2]?' '+b[2]:'')+'" data-i="'+i+'">'+b[0]+'</button>';}).join('')+'</div></div>';
ov.classList.remove('hide','cm-ovfix');ov.classList.toggle('cm-ovshort',ov.clientHeight>0&&ov.clientHeight<340);
var obx=ov.querySelector('.cm-ovbox');function fitOv(){if(!obx.isConnected||ov.classList.contains('hide')||ov.classList.contains('cm-ovfix'))return;if(ov.clientHeight>0&&(obx.scrollHeight>obx.clientHeight+2||obx.scrollHeight>ov.clientHeight-6)){ov.classList.remove('cm-ovshort');ov.classList.add('cm-ovfix');}}if(obx){fitOv();requestAnimationFrame(fitOv);setTimeout(fitOv,350);setTimeout(fitOv,1200);setTimeout(function(){if(!obx.isConnected||ov.classList.contains('hide')||ov.classList.contains('cm-ovfix'))return;var bb=obx.getBoundingClientRect();if(bb.bottom>window.innerHeight-8||bb.top<0)obx.scrollIntoView({block:'center',behavior:'smooth'});},800);}
ov.querySelectorAll('.cm-ovbtns button').forEach(function(el){el.onclick=function(){ov.classList.add('hide');btns[+el.getAttribute('data-i')][1]();};});
}
function kNum(s){return numIn(String(s==null?'':s).replace(/[\s,$¢]/g,''));}
function same(a,b){return !isNaN(a)&&Math.abs(a-b)<1e-6;}

/* ================= KIDS: quick facts (easy mental math only) ================= */
var GRADE_DESC={1:'Grade 1: adding & subtracting within 20, tens and ones, the number line',2:'Grade 2: adding & subtracting to 100, place value to 1,000, word problems',3:'Grade 3: times tables, 3-digit adding & subtracting, fractions, word problems',4:'Grade 4: multi-digit multiplying, long division, equivalent fractions',5:'Grade 5: decimals, 2-digit multiplying, adding fractions, order of operations',6:'Grade 6: negative numbers, long division, exponents, ratios & percents'};
var QUICK_DESC={1:'+ and − facts within 10',2:'+ and − facts within 20',3:'× and ÷ facts up to 10',4:'× and ÷ facts up to 12',5:'× and ÷ facts up to 12',6:'× and ÷ facts and perfect squares'};
function factProblem(g,force){
g=+g;var ops={1:['+','-'],2:['+','-'],3:['x','/'],4:['x','/'],5:['x','/'],6:['x','/','x','sq']}[g]||['+'],op=force||pick(ops),x,y,a,qs;
if(op==='+'){var L=g===1?10:20;do{x=rnd(0,L);y=rnd(0,L-x);}while(x+y<2);a=x+y;qs=x+' + '+y;}
else if(op==='-'){var L2=g===1?10:20;x=rnd(2,L2);y=rnd(0,x);a=x-y;qs=x+' − '+y;}
else if(op==='x'){var M=g===3?10:12;x=rnd(g===3?1:2,M);y=rnd(2,M);a=x*y;qs=x+' × '+y;}
else if(op==='/'){var M2=g===3?10:12;y=rnd(2,M2);a=rnd(1,M2);x=y*a;qs=x+' ÷ '+y;}
else{x=rnd(2,12);y=x;a=x*x;qs=x+'²';}
return {q:qs,a:a,op:op,x:x,y:y};
}
function choicesFor(ans,n){
var set=[ans],dec=!isInt(ans),spread=Math.max(3,Math.round(Math.abs(ans)*0.2)),tries=0;
while(set.length<n&&tries<300){
tries++;var c;
if(dec){c=r1(ans+(Math.random()<.5?-1:1)*(Math.random()<.5?rnd(1,9)/10:rnd(1,3)));}
else{var d=rnd(1,spread)*(Math.random()<.5?-1:1);if(Math.random()<.25&&Math.abs(ans)>=10)d=(Math.random()<.5?-10:10);c=ans+d;}
if(ans>=0&&c<0)continue;
if(set.indexOf(c)<0)set.push(c);
}
return shuffle(set);
}

/* ---------- Coach Monkey: mini lessons ---------- */
function bananaRow(n,cls){var s='';for(var i=0;i<n;i++)s+='<i class="'+(cls||'')+'">🍌</i>';return s;}
function chips(arr,hl){return '<div class="cm-chips2">'+arr.map(function(v,i){return '<span class="'+(hl&&hl(i,v)?'on':'')+'">'+v+'</span>';}).join('<b>›</b>')+'</div>';}
function groups(n,size){return '<div class="cm-groups">'+seq(n).map(function(){return '<span class="cm-grp">'+bananaRow(size)+'</span>';}).join('')+'</div>';}
function factLesson(p){
var x=p.x,y=p.y,a=p.a,L=[],arr=[],k;
if(p.op==='+'){
L.push({t:'Let’s add <b>'+x+' + '+y+'</b>. Here are the bananas:',v:'<div class="cm-bgrp">'+bananaRow(x)+'</div><div class="cm-plus">+</div><div class="cm-bgrp">'+bananaRow(y)+'</div>'});
var big=Math.max(x,y),sm=Math.min(x,y);
if(a>10&&big<10&&big>=6&&sm>=2){var need=10-big;
L.push({t:'<b>Make a ten!</b> '+big+' needs '+need+' more to make 10. Borrow '+need+' from the '+sm+'.',v:'<div class="cm-eq2">'+big+' + '+need+' = <b>10</b> &nbsp;and&nbsp; '+sm+' − '+need+' = <b>'+(sm-need)+'</b> left</div>'});
L.push({t:'Now it’s easy — 10 plus what’s left:',v:'<div class="cm-eq2">10 + '+(sm-need)+' = <b>'+a+'</b></div>'});
}else{for(k=big;k<=a;k++)arr.push(k);L.push({t:'Start at the <b>bigger number, '+big+'</b>, and count on '+sm+' more:',v:chips(arr,function(i){return i===arr.length-1;})});}
}else if(p.op==='-'){
L.push({t:'Let’s subtract <b>'+x+' − '+y+'</b>. Monkey has '+x+' bananas and eats '+y+' of them:',v:'<div class="cm-bgrp">'+bananaRow(x-y)+bananaRow(y,'gone')+'</div>'});
if(y<=4){for(k=x;k>=a;k--)arr.push(k);L.push({t:'Start at <b>'+x+'</b> and count back '+y+':',v:chips(arr,function(i){return i===arr.length-1;})});}
else{for(k=y;k<=x;k++)arr.push(k);L.push({t:'Think addition: <b>'+y+' + ? = '+x+'</b>. Count up from '+y+' to '+x+' — that’s '+a+' jumps:',v:chips(arr,function(i){return i===0||i===arr.length-1;})});}
}else if(p.op==='x'||p.op==='sq'){
if(p.op==='sq')L.push({t:'<b>'+x+'²</b> means '+x+' × '+x+' — a number times itself. (That’s why it’s called “squared”: it makes a square!)',v:''});
if(x===0||y===0)L.push({t:'Anything times <b>0</b> is <b>0</b> — zero groups of bananas is no bananas!',v:''});
else if(x===1||y===1)L.push({t:'Anything times <b>1</b> stays the same — one group of '+(x*y)+' is just '+(x*y)+'.',v:''});
else{
L.push({t:'<b>'+x+' × '+y+'</b> means '+x+' groups of '+y+'.',v:x*y<=60?groups(x,y):''});
var c=[2,5,10].indexOf(y)>-1?y:[2,5,10].indexOf(x)>-1?x:Math.min(x,y),n=c===y?x:y;
for(k=1;k<=n;k++)arr.push(c*k);
L.push({t:'Skip count by '+c+', '+n+' times:',v:chips(arr,function(i){return i===arr.length-1;})});
if(x===9||y===9){var o=x===9?y:x;L.push({t:'<b>9s trick:</b> '+o+' × 10 = '+(o*10)+', then take away one '+o+': '+(o*10)+' − '+o+' = '+a+'.',v:''});}
else if(x!==y)L.push({t:'<b>Tip:</b> you can flip it! '+x+' × '+y+' = '+y+' × '+x+'. Pick whichever is easier to count by.',v:''});
}
}else{
L.push({t:'<b>'+x+' ÷ '+y+'</b> means share '+x+' bananas into '+y+' equal groups.',v:x<=60?groups(y,a):''});
for(k=1;k<=a;k++)arr.push(y*k);
L.push({t:'Think multiplication: <b>'+y+' × ? = '+x+'</b>. Count by '+y+' until you reach '+x+':',v:chips(arr,function(i){return i===arr.length-1;})});
L.push({t:'You counted <b>'+a+'</b> times, so each group gets '+a+'.',v:''});
}
L.push({t:'So <b>'+p.q+' = '+a+'</b>! 🎉',v:''});
return L;
}
function runCoach(ov,title,steps,opts){
opts=opts||{};var i=0;
ov.classList.remove('hide');ov.classList.add('cm-ovcoach');
ov.innerHTML='<div class="cm-coach"><div class="cm-coach-h">'+monkeyFull(S.look)+'<div><small>Coach Monkey</small><h3>'+title+'</h3></div></div><ol class="cm-csteps" data-r="cs"></ol><div data-r="prac"></div><div class="cm-ovbtns"><button class="cm-bigbtn" data-r="cn">Next ▶</button></div></div>';
var cs=q(ov,'cs'),cn=q(ov,'cn');
function close(){ov.classList.add('hide');ov.classList.remove('cm-ovcoach');ov.innerHTML='';if(opts.onDone)opts.onDone();}
function show(){
var s=steps[i++],li=document.createElement('li');li.innerHTML='<p>'+s.t+'</p>'+(s.v?'<div class="cm-cvis">'+s.v+'</div>':'');cs.appendChild(li);tone(560,.05,'triangle');
if(i>=steps.length){if(opts.practice){cn.classList.add('hide');practice();}else{cn.textContent=opts.done||'Got it! ✓';cn.onclick=close;}}
setTimeout(function(){try{(i>=steps.length&&opts.practice?q(ov,'prac'):li).scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}},30);
}
function practice(){
var p=opts.practice(),pr=q(ov,'prac');
pr.innerHTML='<div class="cm-prac"><p><b>Your turn!</b> What is <b>'+p.q+'</b>?</p><div class="cm-pchoices">'+choicesFor(p.a,4).map(function(v){return '<button data-v="'+v+'">'+num(v)+'</button>';}).join('')+'</div><p class="cm-pmsg" data-r="pm"></p></div>';
pr.querySelector('.cm-pchoices').onclick=function(e){
var b=e.target.closest('button');if(!b||b.disabled)return;
if(+b.getAttribute('data-v')===p.a){b.classList.add('ok');pr.querySelectorAll('.cm-pchoices button').forEach(function(x){x.disabled=true;});sfxGood();q(pr,'pm').innerHTML='Yes! '+p.q+' = '+p.a+' 🎉 You’ve got this!';cn.classList.remove('hide');cn.textContent=opts.done||'Back to the game ▶';cn.onclick=close;}
else{b.classList.add('no');b.disabled=true;sfxBad();q(pr,'pm').innerHTML='Not quite — use the trick above and try again!';}
};
}
cn.onclick=show;show();
}
function factCoach(ov,miss,onDone,doneLabel){runCoach(ov,'How to solve '+miss.q,factLesson(miss),{practice:function(){return factProblem(S.grade,miss.op);},onDone:onDone,done:doneLabel});}
function struggled(st){return st.wrong>=3&&st.wrong>=st.score;}

/* ================= KIDS GAMES: quick skills ================= */
var KGAMES=[
{id:'banana',name:'Banana Grab',icon:'🍌',c:'#ffe27a',d:'Slide your monkey to catch the banana with the right answer!'},
{id:'balloon',name:'Balloon Pop',icon:'🎈',c:'#ffb3d4',d:'Pop the balloon with the right answer before the clock runs out.'},
{id:'race',name:'Jungle Race',icon:'🏁',c:'#a7ec8a',d:'Race the parrot to the finish line. Every right answer is a big hop!'},
{id:'feed',name:'Feed the Monkeys',icon:'🐵',c:'#ffc49e',d:'Drag each banana to the hungry monkey whose problem it answers!'}
];
function gHead(title){return '<div class="cm-ghead"><h2 class="cm-gtitle">'+title+'</h2><div class="cm-gstats" data-r="stats"></div></div><div class="cm-probbar"><span class="cm-prob" data-r="prob">Ready?</span></div>';}

/* --- Banana Grab --- */
function gBanana(box){
box.innerHTML=gHead('🍌 Banana Grab')+'<div class="cm-cwrap"><canvas aria-label="Banana Grab game"></canvas><div class="cm-overlay" data-r="ov"></div></div><p class="cm-tip">Know the answer? <b>Tap its banana</b> to grab it right away! Or move your monkey with ← → keys, your mouse or your finger.</p>';
var cv=box.querySelector('canvas'),ov=q(box,'ov'),probEl=q(box,'prob'),statEl=q(box,'stats');
var H=Math.round(clamp(window.innerHeight*0.62,380,480)),C,img=new Image(),keys={l:0,r:0},leaves=[];
img.src=monkeyURI(S.look);
for(var i=0;i<17;i++)leaves.push({x:i/16+Math.random()*.03,y:rnd(-16,24),r:rnd(20,36),a:Math.random()*3,c:pick(['#2fb344','#22a03b','#3fcf55','#1e8f35'])});
var st={run:false,hearts:3,score:0,wrong:0,mx:0,tx:0,items:[],q:[],sp:0,parts:[],shake:0};
function size(){var f=C?st.mx/C.w:.5;C=setupCanvas(cv,H);st.mx=st.tx=f*C.w;}
size();
function hud(){statEl.innerHTML=chip('❤️'.repeat(st.hearts)+'🤍'.repeat(3-st.hearts))+chip('🍌 '+st.score);}
function newProb(){st.prob=factProblem(S.grade);st.pt=0;probEl.textContent=st.prob.q+' = ?';st.items=[];wave();hud();}
function wave(){var n=C.w<520?3:4,ch=choicesFor(st.prob.a,n),lanes=shuffle(seq(n));st.q=ch.map(function(v,i){return {v:v,l:lanes[i],n:n};});st.sp=.2;}
function spawn(){var o=st.q.shift(),lw=C.w/o.n;st.items.push({x:lw*o.l+lw/2+(Math.random()-.5)*lw/3,y:-30,v:(52+S.grade*6)*(.85+Math.random()*.3),val:o.v,ok:o.v===st.prob.a,rot:Math.random()*6});}
function burst(x,y,txt,col){st.parts.push({t:txt,x:x,y:y,vx:0,vy:-70,life:1,c:col});for(var i=0;i<14;i++)st.parts.push({x:x,y:y,vx:rnd(-160,160),vy:rnd(-260,-60),life:.8,c:pick(CONF),g:1});}
function grab(it){
var my=C.h-140;
if(it.ok){st.score++;addBananas(1);sfxGood();burst(it.x,my,'+1 🍌','#ff5fa2');newProb();}
else{st.hearts--;st.wrong++;st.miss=st.prob;sfxBad();st.shake=.35;burst(it.x,my,'Oops!','#2b2350');hud();if(st.hearts<=0)end();}
}
function update(dt){
st.pt=(st.pt||0)+dt;
if(st.q.length){st.sp-=dt;if(st.sp<=0){spawn();st.sp=.75;}}
if(keys.l)st.tx-=480*dt;if(keys.r)st.tx+=480*dt;st.tx=clamp(st.tx,40,C.w-40);
st.mx+=(st.tx-st.mx)*Math.min(1,dt*14);
var my=C.h-140;
for(var i=st.items.length-1;i>=0;i--){
var it=st.items[i];it.y+=it.v*dt;it.rot+=dt*3;
if(it.y>my-6&&it.y<my+50&&Math.abs(it.x-st.mx)<52){st.items.splice(i,1);grab(it);break;}
if(it.y>C.h+30)st.items.splice(i,1);
}
if(st.run&&!st.items.length&&!st.q.length)wave();
}
function draw(dt){
var c=C.ctx,w=C.w,h=C.h;
for(var i=st.parts.length-1;i>=0;i--){var p=st.parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.g)p.vy+=600*dt;p.life-=dt;if(p.life<=0)st.parts.splice(i,1);}
st.shake=Math.max(0,st.shake-dt);
c.save();if(st.shake>0)c.translate(rnd(-6,6),rnd(-4,4));
var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#7dd8ff');g.addColorStop(.7,'#c9f3ff');g.addColorStop(1,'#eaffd6');c.fillStyle=g;c.fillRect(-10,-10,w+20,h+20);
c.fillStyle='#ffe066';c.beginPath();c.arc(w-70,70,30,0,7);c.fill();
c.fillStyle='#86df5e';c.beginPath();c.ellipse(w*.25,h,w*.42,62,0,0,7);c.fill();
c.fillStyle='#62cb45';c.beginPath();c.ellipse(w*.8,h+6,w*.45,72,0,0,7);c.fill();
c.strokeStyle='#2f9e44';c.lineWidth=4;[.12,.33,.58,.86].forEach(function(v){c.beginPath();c.moveTo(v*w,0);c.quadraticCurveTo(v*w+16,60,v*w,112);c.stroke();});
leaves.forEach(function(L){c.fillStyle=L.c;c.beginPath();c.ellipse(L.x*w,L.y,L.r*1.4,L.r,L.a,0,7);c.fill();});
st.items.forEach(function(it){
var hint=it.ok&&S.grade<=2&&st.pt>5;if(hint){c.save();c.globalAlpha=.45+.4*Math.sin(st.pt*10);c.fillStyle='#fff36b';c.beginPath();c.arc(it.x,it.y+8,52,0,7);c.fill();c.globalAlpha=1;c.lineWidth=4;c.strokeStyle='#22c55e';c.stroke();c.restore();}
c.save();c.translate(it.x,it.y);c.rotate(Math.sin(it.rot)*.25);c.font='44px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('🍌',0,-6);c.restore();
var label=num(it.val);c.font='900 19px Nunito, sans-serif';var tw=c.measureText(label).width+20;
c.fillStyle=hint&&Math.sin(st.pt*10)>0?'#22c55e':'#fff';rr(c,it.x-tw/2,it.y+14,tw,28,14);c.fill();c.lineWidth=3;c.strokeStyle='#2b2350';c.stroke();
c.fillStyle='#2b2350';c.textAlign='center';c.textBaseline='middle';c.fillText(label,it.x,it.y+29);
});
if(img.complete&&img.naturalWidth)c.drawImage(img,st.mx-47,h-150,94,135);
st.parts.forEach(function(p){c.globalAlpha=Math.max(0,Math.min(1,p.life*1.4));if(p.t){c.font='800 26px "Baloo 2", sans-serif';c.textAlign='center';c.fillStyle=p.c;c.fillText(p.t,p.x,p.y);}else{c.fillStyle=p.c;c.fillRect(p.x,p.y,7,9);}c.globalAlpha=1;});
c.restore();
}
rafLoop(function(dt){if(st.run)update(dt);draw(dt);});
function start(){st={run:true,hearts:3,score:0,wrong:0,mx:C.w/2,tx:C.w/2,items:[],q:[],sp:0,parts:[],shake:0};newProb();}
function end(){
st.run=false;st.items=[];st.q=[];var nb=setBest('banana'+S.grade,st.score),hard=st.wrong>=2&&st.score<=st.wrong;
var html=(hard?'<div class="cm-ovemoji">🤔</div>':yayMochi())+'<h3>'+(hard?'Those were tricky!':'Great job!')+'</h3><p>You grabbed <b>'+st.score+'</b> banana'+(st.score===1?'':'s')+'.'+(nb&&st.score>0?'<br>🏆 New best for grade '+S.grade+'!':'')+(hard?'<br>Want Coach Monkey to show you a trick for <b>'+st.miss.q+'</b>?':'')+'</p>';
showOv2(ov,html,hard?[['🐒 Show me how!',function(){factCoach(ov,st.miss,start,'Play again ▶');}],nextBtn(),['Play again',start,'alt']]:[nextBtn(),['Play again',start,'alt']]);
}
function mv(e){var r=cv.getBoundingClientRect();st.tx=clamp(e.clientX-r.left,40,C.w-40);}
listen(cv,'pointerdown',function(e){if(st.run){var r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=null;st.items.forEach(function(it){if(Math.abs(it.x-x)<48&&y>it.y-44&&y<it.y+50)hit=it;});if(hit){st.items.splice(st.items.indexOf(hit),1);st.tx=hit.x;grab(hit);return;}}mv(e);});listen(cv,'pointermove',function(e){if(e.pointerType==='mouse'||e.buttons)mv(e);});
listen(window,'keydown',function(e){if(!st.run)return;if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){keys.l=1;e.preventDefault();}if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){keys.r=1;e.preventDefault();}});
listen(window,'keyup',function(e){if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')keys.l=0;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')keys.r=0;});
listen(window,'resize',size);
hud();
showOv(ov,'<div class="cm-ovemoji">🍌</div><h3>Banana Grab</h3><p>Quick facts: <b>'+QUICK_DESC[S.grade]+'</b>.<br>Catch the banana with the right answer — or just tap it if you know it! Grab a wrong one and you lose a heart.</p>','Start! ▶',start);
}

/* --- Balloon Pop --- */
var BCOL=['#ff7eb6','#ffd23f','#7ee081','#6ecbff','#b79cff','#ffa463'];
function gBalloon(box){
box.innerHTML=gHead('🎈 Balloon Pop')+'<div class="cm-sky" data-r="sky"><div class="cm-cloud c1"></div><div class="cm-cloud c2"></div><div class="cm-overlay" data-r="ov"></div></div><p class="cm-tip">Tap the balloon with the right answer. A wrong tap costs 3 seconds!</p>';
var sky=q(box,'sky'),ov=q(box,'ov'),probEl=q(box,'prob'),statEl=q(box,'stats'),T=timers(),st={run:false,time:60,score:0,wrong:0,streak:0};
function hud(){statEl.innerHTML=chip('⏱ '+st.time+'s')+chip('🎈 '+st.score);}
function clearB(){sky.querySelectorAll('.cm-bwrap').forEach(function(b){b.classList.add('gone');setTimeout(function(){b.remove();},300);});}
function newProb(){st.prob=factProblem(S.grade);st.d=choicesFor(st.prob.a,5).filter(function(v){return v!==st.prob.a;});st.since=0;st.pt0=Date.now();st.hint=false;probEl.textContent=st.prob.q+' = ?';clearB();}
function spawn(){
if(!st.run)return;
var ok=st.since>=2||Math.random()<.35,v=ok?st.prob.a:pick(st.d);st.since=ok?0:st.since+1;
var w=document.createElement('div');w.className='cm-bwrap';w.style.left=rnd(2,80)+'%';w.style.animationDuration=(8.6-S.grade*.3+Math.random()*1.5)+'s';
var b=document.createElement('button');b.className='cm-balloon';b.style.setProperty('--b',pick(BCOL));b.textContent=num(v);b.setAttribute('data-v',v);if(st.hint&&v===st.prob.a)b.classList.add('hint');b.setAttribute('aria-label','Balloon '+num(v));
b.onclick=function(){
if(!st.run||w.classList.contains('gone'))return;
var sr=sky.getBoundingClientRect(),br=b.getBoundingClientRect();
if(v===st.prob.a){b.classList.add('pop');st.score++;st.streak=0;addBananas(1);sfxGood();floatText(sky,br.left-sr.left+10,br.top-sr.top,'+1 🍌');hud();newProb();}
else{b.classList.remove('nope');void b.offsetWidth;b.classList.add('nope');st.time=Math.max(0,st.time-3);st.wrong++;st.streak++;st.miss=st.prob;sfxBad();floatText(sky,br.left-sr.left+10,br.top-sr.top,'−3s');hud();if(st.time<=0)end();else if(st.streak>=3)offer();}
};
w.appendChild(b);w.addEventListener('animationend',function(e){if(e.target===w)w.remove();});sky.appendChild(w);
}
function tick(){st.time--;hud();if(S.grade<=2&&!st.hint&&Date.now()-st.pt0>5000){st.hint=true;sky.querySelectorAll('.cm-balloon').forEach(function(b){if(+b.getAttribute('data-v')===st.prob.a)b.classList.add('hint');});}if(st.time<=0)end();}
function timersOn(){T.every(spawn,850);T.every(tick,1000);}
function pause(){st.run=false;T.clear();sky.classList.add('cm-paused');}
function resume(){sky.classList.remove('cm-paused');st.streak=0;st.run=true;timersOn();}
function offer(){pause();showOv2(ov,'<div class="cm-ovemoji">🤔</div><h3>Tricky ones?</h3><p>Coach Monkey can show you a trick for problems like <b>'+st.miss.q+'</b>. The clock is paused!</p>',[['🐒 Show me how!',function(){factCoach(ov,st.miss,resume);}],['Keep playing',resume,'alt']]);}
function start(){sky.classList.remove('cm-paused');st={run:true,time:60,score:0,wrong:0,streak:0};hud();newProb();spawn();timersOn();}
function end(){st.run=false;T.clear();clearB();probEl.textContent='Time!';var nb=setBest('balloon'+S.grade,st.score),hard=struggled(st);if(st.score>0){confetti(sky);sfxWin();}
showOv2(ov,(hard?'<div class="cm-ovemoji">🤔</div>':yayMochi())+'<h3>Time’s up!</h3><p>You popped <b>'+st.score+'</b> balloon'+(st.score===1?'':'s')+'.'+(nb&&st.score>0?'<br>🏆 New best for grade '+S.grade+'!':'')+(hard?'<br>Want a quick lesson on <b>'+st.miss.q+'</b>?':'')+'</p>',hard?[['🐒 Show me how!',function(){factCoach(ov,st.miss,start,'Play again ▶');}],nextBtn(),['Play again',start,'alt']]:[nextBtn(),['Play again',start,'alt']]);}
hud();
showOv(ov,'<div class="cm-ovemoji">🎈</div><h3>Balloon Pop</h3><p>Quick facts: <b>'+QUICK_DESC[S.grade]+'</b>.<br>You have 60 seconds. Pop as many right-answer balloons as you can!</p>','Start! ▶',start);
}

/* --- Jungle Race --- */
function gRace(box){
box.innerHTML=gHead('🏁 Jungle Race')+'<div class="cm-track" data-r="track"><div class="cm-lane"><img class="cm-runner cm-runm" data-r="me" alt="Your monkey"><span class="cm-lane-lbl">You</span></div><div class="cm-lane"><span class="cm-runner cm-parrot" data-r="bot">🦜</span><span class="cm-lane-lbl">Parrot</span></div><div class="cm-finish">🏁</div><div class="cm-overlay" data-r="ov"></div></div><div class="cm-answers" data-r="ans"></div>';
var me=q(box,'me'),bot=q(box,'bot'),ans=q(box,'ans'),ov=q(box,'ov'),track=q(box,'track'),probEl=q(box,'prob'),statEl=q(box,'stats'),T=timers();
me.src=monkeyURI(S.look);
var need=10,secs=60,st={run:false,me:0,bot:0,right:0,wrong:0,streak:0};
function place(){me.style.left=(st.me*.84)+'%';bot.style.left=(st.bot*.84)+'%';}
function hud(){statEl.innerHTML=chip('✅ '+st.right+' / '+need);}
function ask(){st.prob=factProblem(S.grade);probEl.textContent=st.prob.q+' = ?';ans.innerHTML=choicesFor(st.prob.a,4).map(function(v){return '<button class="cm-abtn" data-v="'+v+'">'+num(v)+'</button>';}).join('');}
ans.onclick=function(e){
if(!st.run)return;var b=e.target.closest('.cm-abtn');if(!b||b.disabled)return;
if(parseFloat(b.getAttribute('data-v'))===st.prob.a){st.right++;st.streak=0;st.me=Math.min(100,st.me+100/need);sfxGood();me.classList.remove('hop');void me.offsetWidth;me.classList.add('hop');place();hud();if(st.right>=need)win();else ask();}
else{b.disabled=true;b.classList.add('wrong');st.wrong++;st.streak++;st.miss=st.prob;sfxBad();if(st.streak>=3)offer();}
};
function tick(){st.bot+=100/(secs*10);place();if(st.bot>=100)lose();}
function pause(){st.run=false;T.clear();}
function resume(){st.streak=0;st.run=true;T.every(tick,100);}
function offer(){pause();showOv2(ov,'<div class="cm-ovemoji">🤔</div><h3>Need a hand?</h3><p>The parrot is waiting. Want Coach Monkey to show you how to do <b>'+st.miss.q+'</b>?</p>',[['🐒 Show me how!',function(){factCoach(ov,st.miss,function(){ask();resume();});}],['Keep racing',resume,'alt']]);}
function start(){st={run:true,me:0,bot:0,right:0,wrong:0,streak:0};place();hud();ask();T.every(tick,100);}
function win(){st.run=false;T.clear();addBananas(5);sfxWin();confetti(track);showOv2(ov,yayMochi()+'<h3>You won!</h3><p>You beat the parrot! <b>+5 bananas</b> 🍌</p>',[nextBtn(),['Race again',start,'alt']]);}
function lose(){st.run=false;T.clear();addBananas(1);var hard=st.wrong>=3;showOv2(ov,'<div class="cm-ovemoji">🦜</div><h3>So close!</h3><p>The parrot won this time. You got <b>'+st.right+'</b> right. Here’s <b>+1 banana</b> for trying!'+(hard&&st.miss?'<br>Want a quick lesson first?':'')+'</p>',hard&&st.miss?[['🐒 Show me how!',function(){factCoach(ov,st.miss,start,'Race again ▶');}],nextBtn(),['Race again',start,'alt']]:[nextBtn(),['Race again',start,'alt']]);}
place();hud();ans.innerHTML='';
showOv(ov,'<div class="cm-ovemoji">🏁</div><h3>Jungle Race</h3><p>Quick facts: <b>'+QUICK_DESC[S.grade]+'</b>.<br>Answer '+need+' facts before the parrot reaches the finish line!</p>','Ready, set, GO!',start);
}

/* --- Coconut Match --- */
function gFeed(box){
box.innerHTML=gHead('🐵 Feed the Monkeys')+'<div class="cm-feed" data-r="area"><div class="cm-fmonks" data-r="monks"></div><div class="cm-fbans" data-r="bans"></div><div class="cm-overlay" data-r="ov"></div></div><p class="cm-tip">Drag a banana to the monkey it answers — or tap a banana, then tap the monkey.</p>';
var area=q(box,'area'),monks=q(box,'monks'),bans=q(box,'bans'),ov=q(box,'ov'),probEl=q(box,'prob'),statEl=q(box,'stats'),T=timers(),GOAL=12,st={run:false,fed:0,t:0,wrong:0,streak:0,score:0,slots:[],extra:[]},sel=null,drag=null,busy=false;
var SR=root.getRootNode();
function hud(){statEl.innerHTML=chip('🍌 Fed '+st.fed+' / '+GOAL)+chip('⏱ '+st.t+'s');}
function newMonkey(i){var p,g=0;do{p=factProblem(S.grade);}while(st.slots.some(function(s,j){return s&&j!==i&&s.p.a===p.a;})&&g++<60);st.slots[i]={p:p};}
function decoy(){var used=st.slots.map(function(s){return s.p.a;}),c=choicesFor(pick(used),5).filter(function(v){return used.indexOf(v)<0;});st.extra=c.length?[c[0]]:[];}
function paint(){
monks.innerHTML=st.slots.map(function(s,i){return '<div class="cm-fm" data-s="'+i+'"><div class="cm-fbub">'+s.p.q+'</div>'+monkeyFull({},'')+'</div>';}).join('');
bans.innerHTML=shuffle(st.slots.map(function(s){return s.p.a;}).concat(st.extra)).map(function(v){return '<button class="cm-fban" data-v="'+v+'" aria-label="Banana '+num(v)+'"><span>🍌</span><b>'+num(v)+'</b></button>';}).join('');
probEl.textContent=sel==null?'Feed the hungry monkeys!':'Now pick a monkey!';
}
function feed(v,i){
if(!st.run||busy)return;var s=st.slots[i],m=monks.querySelector('[data-s="'+i+'"]');if(!s||!m)return;
if(v===s.p.a){
st.fed++;st.score++;st.streak=0;st.last=Date.now();addBananas(1);sfxGood();busy=true;m.classList.add('yum');m.querySelector('.cm-fbub').textContent='Yum! '+s.p.q+' = '+num(v);
var ar=area.getBoundingClientRect(),mr=m.getBoundingClientRect();floatText(area,mr.left-ar.left+mr.width/2-30,mr.top-ar.top+20,'+1 🍌');
sel=null;hud();
T.after(function(){busy=false;if(st.fed>=GOAL){win();return;}newMonkey(i);decoy();paint();},650);
}else{
st.wrong++;st.streak++;st.miss=s.p;sfxBad();m.classList.remove('yuck');void m.offsetWidth;m.classList.add('yuck');var b=m.querySelector('.cm-fbub');b.textContent='Yuck! Not '+num(v);
T.after(function(){if(b.isConnected)b.textContent=s.p.q;},900);sel=null;bans.querySelectorAll('.cm-fban').forEach(function(x){x.classList.remove('sel');});probEl.textContent='Feed the hungry monkeys!';
if(st.streak>=3)offer();
}
}
function monkeyAt(x,y){var el=SR.elementFromPoint?SR.elementFromPoint(x,y):document.elementFromPoint(x,y);return el&&el.closest?el.closest('.cm-fm'):null;}
bans.addEventListener('pointerdown',function(e){
var b=e.target.closest('.cm-fban');if(!b||!st.run)return;e.preventDefault();
sel=+b.getAttribute('data-v');bans.querySelectorAll('.cm-fban').forEach(function(x){x.classList.toggle('sel',x===b);});probEl.textContent='Now pick a monkey!';tone(560,.05,'triangle');
var ar=area.getBoundingClientRect(),g=document.createElement('div');g.className='cm-fghost';g.innerHTML='<span>🍌</span><b>'+num(sel)+'</b>';g.style.left=(e.clientX-ar.left)+'px';g.style.top=(e.clientY-ar.top)+'px';g.style.display='none';area.appendChild(g);
drag={x0:e.clientX,y0:e.clientY,g:g,moved:false};try{area.setPointerCapture(e.pointerId);}catch(x){}
});
area.addEventListener('pointermove',function(e){
if(!drag)return;var ar=area.getBoundingClientRect();if(Math.abs(e.clientX-drag.x0)+Math.abs(e.clientY-drag.y0)>8){drag.moved=true;drag.g.style.display='';}
drag.g.style.left=(e.clientX-ar.left)+'px';drag.g.style.top=(e.clientY-ar.top)+'px';
monks.querySelectorAll('.cm-fm').forEach(function(m){m.classList.remove('target');});var t=drag.moved&&monkeyAt(e.clientX,e.clientY);if(t)t.classList.add('target');
});
function endDrag(e){
if(!drag)return;var d=drag;drag=null;d.g.remove();monks.querySelectorAll('.cm-fm').forEach(function(m){m.classList.remove('target');});
if(d.moved){var t=monkeyAt(e.clientX,e.clientY);if(t&&sel!=null)feed(sel,+t.getAttribute('data-s'));}
}
area.addEventListener('pointerup',endDrag);area.addEventListener('pointercancel',endDrag);
monks.addEventListener('click',function(e){var m=e.target.closest('.cm-fm');if(!m||sel==null)return;feed(sel,+m.getAttribute('data-s'));});
function tick(){st.t++;hud();if(S.grade<=2&&!busy&&Date.now()-(st.last||0)>6000&&!monks.querySelector('.hint')){var s0=st.slots[0],m=monks.querySelector('[data-s="0"]'),bn=bans.querySelector('.cm-fban[data-v="'+s0.p.a+'"]');if(m&&bn){m.classList.add('hint');bn.classList.add('hint');}}}
function pause(){st.run=false;T.clear();}
function resume(){st.streak=0;st.run=true;st.last=Date.now();T.every(tick,1000);}
function offer(){pause();showOv2(ov,'<div class="cm-ovemoji">🤔</div><h3>Tricky ones?</h3><p>Coach Monkey can show you how to solve <b>'+st.miss.q+'</b>. The clock is paused!</p>',[['🐒 Show me how!',function(){factCoach(ov,st.miss,resume);}],['Keep playing',resume,'alt']]);}
function start(){T.clear();st={run:true,fed:0,t:0,wrong:0,streak:0,score:0,slots:[],extra:[]};sel=null;busy=false;st.last=Date.now();for(var i=0;i<3;i++)newMonkey(i);decoy();paint();hud();T.every(tick,1000);}
function win(){
st.run=false;T.clear();addBananas(3);sfxWin();confetti(area);var nb=setBest('feed'+S.grade,st.t,true),hard=struggled(st);
showOv2(ov,yayMochi()+'<h3>Everyone’s full!</h3><p>You fed '+GOAL+' monkeys in <b>'+st.t+' seconds</b>. <b>+3 bonus bananas</b> 🍌'+(nb?'<br>🏆 Fastest time for grade '+S.grade+'!':'<br>Best: '+S.best['feed'+S.grade]+'s')+(hard?'<br>Want a quick lesson on <b>'+st.miss.q+'</b>?':'')+'</p>',hard?[['🐒 Show me how!',function(){factCoach(ov,st.miss,start,'Play again ▶');}],nextBtn(),['Play again',start,'alt']]:[nextBtn(),['Play again',start,'alt']]);
}
hud();
showOv(ov,'<div class="cm-ovemoji">🐵</div><h3>Feed the Monkeys</h3><p>Quick facts: <b>'+QUICK_DESC[S.grade]+'</b>.<br>Each hungry monkey is holding a problem. Give it the banana with the right answer! Feed '+GOAL+' monkeys as fast as you can.</p>','Start! ▶',start);
}
var KG_FN={banana:gBanana,balloon:gBalloon,race:gRace,feed:gFeed};

/* ================= KIDS GAMES: think it through (grade-specific, step by step) ================= */
function kfr(n,d){return '<span class="cm-kfr"><b>'+n+'</b><b>'+d+'</b></span>';}
function kIn(name,w){return '<input class="cm-kin" data-r="'+name+'" inputmode="decimal" autocomplete="off"'+(w?' style="width:'+w+'px"':'')+'>';}
function bread(parts,on,click,name){var s='<div class="cm-bread'+(click?' click':'')+'"'+(name?' data-r="'+name+'"':'')+'>';for(var i=0;i<parts;i++)s+=(click?'<button':'<span')+' class="cm-slice'+(on.indexOf(i)>-1?' on':'')+'" data-i="'+i+'"'+(click?' aria-label="Slice '+(i+1)+'"':'')+'>'+(click?'</button>':'</span>');return s+'</div>';}
function firstN(n){return seq(n);}
function kStep(api){var tries=0;return {reset:function(){tries=0;},miss:function(){tries++;api.miss();return tries;}};}

var THINK={};

/* ---------- Number Line Hop (grades 1, 6) ---------- */
THINK.hop={name:'Number Line Hop',icon:'🐾',c:'#bfe7ff',grades:[1,6],
d:{1:'Hop along the number line to add and subtract within 20.',6:'Hop past zero! Add and subtract with negative numbers on the number line.'},
gen:function(g){
var a,b,d,qs,rule;
if(g===1){
if(Math.random()<.5){a=rnd(1,13);b=rnd(3,Math.min(9,20-a));d=b;qs=a+' + '+b;rule='Adding moves to the <b>right</b> — toward bigger numbers.';}
else{a=rnd(8,20);b=rnd(3,Math.min(9,a));d=-b;qs=a+' − '+b;rule='Subtracting moves to the <b>left</b> — toward smaller numbers.';}
return {a:a,d:d,ans:a+d,qs:qs,min:0,max:20,rule:rule};
}
var t=rnd(0,2);do{a=rnd(-8,8);b=rnd(2,9);d=t===0?b:-b;}while(a+d<-12||a+d>12||a===0||(a<0)===(a+d<0));
qs=t===0?num(a)+' + '+b:t===1?num(a)+' + ('+num(-b)+')':num(a)+' − '+b;
rule=t===0?'Adding a positive number moves <b>right</b>.':t===1?'Adding a <b>negative</b> number moves <b>left</b>.':'Subtracting a positive number moves <b>left</b>.';
return {a:a,d:d,ans:a+d,qs:qs,min:-12,max:12,rule:rule};
},
mount:function(area,p,api){
var phase='start',pos=null,hops=0,steps=Math.abs(p.d),dir=p.d>0?1:-1,sp=kStep(api);
api.q('<span class="cm-bigq">'+p.qs+' = ?</span>');
var ticks='';for(var v=p.min;v<=p.max;v++)ticks+='<button class="cm-tick'+(v===0?' zero':'')+'" data-v="'+v+'"><span>'+num(v)+'</span></button>';
area.innerHTML='<div class="cm-nlwrap" data-r="wrap"><div class="cm-nl" data-r="nl">'+ticks+'<img class="cm-nlmk hide" data-r="mk" src="'+monkeyURI(S.look)+'" alt="Monkey"></div></div>'+
'<div class="cm-row cm-center hide" data-r="hb"><button class="cm-hop" data-d="-1">⬅ Hop left</button><span class="cm-chip" data-r="hc"></span><button class="cm-hop" data-d="1">Hop right ➡</button></div>'+
'<div class="cm-row cm-center hide" data-r="ar"><label class="cm-anslbl">'+p.qs+' = '+kIn('in',90)+'</label><button class="cm-bigbtn" data-r="ck">Check</button></div>';
var nl=q(area,'nl'),mk=q(area,'mk'),wrap=q(area,'wrap');
function tick(v){return nl.querySelector('[data-v="'+v+'"]');}
function place(){var t=tick(pos);mk.classList.remove('hide');mk.style.left=(t.offsetLeft+t.offsetWidth/2)+'px';t.classList.add('trail');try{wrap.scrollTo({left:t.offsetLeft-wrap.clientWidth/2,behavior:'smooth'});}catch(e){}}
api.say('<b>Step 1:</b> Tap the starting number, <b>'+num(p.a)+'</b>, on the number line.');
nl.onclick=function(e){
var b=e.target.closest('.cm-tick');if(!b||phase!=='start')return;var v=+b.getAttribute('data-v');
if(v===p.a){pos=v;nl.querySelectorAll('.glow').forEach(function(x){x.classList.remove('glow');});place();phase='hop';sp.reset();q(area,'hb').classList.remove('hide');q(area,'hc').textContent='Hops: 0 / '+steps;api.good();api.say('<b>Step 2:</b> '+p.rule+' Hop <b>'+steps+'</b> time'+(steps>1?'s':'')+'.');}
else{var t=sp.miss();api.say('That’s '+num(v)+'. Find <b>'+num(p.a)+'</b>.'+(t>=2?' (It’s glowing now!)':''),'no');if(t>=2)tick(p.a).classList.add('glow');}
};
q(area,'hb').onclick=function(e){
var b=e.target.closest('.cm-hop');if(!b||phase!=='hop')return;var d=+b.getAttribute('data-d');
if(d!==dir){sp.miss();api.say('Oops — wrong way! '+p.rule,'no');return;}
pos+=d;hops++;place();tone(500+hops*40,.06,'triangle');q(area,'hc').textContent='Hops: '+hops+' / '+steps;
if(hops===steps){phase='ans';sp.reset();q(area,'hb').classList.add('hide');q(area,'ar').classList.remove('hide');api.say('<b>Step 3:</b> Where did Monkey land? Type the answer.');q(area,'in').focus();}
else api.say('Keep hopping! '+(steps-hops)+' more.');
};
function check(){
var v=kNum(q(area,'in').value);
if(same(v,p.ans)){q(area,'ck').disabled=true;api.solved('🎯 '+p.qs+' = '+num(p.ans)+'!');}
else{var t=sp.miss();if(t>=2){q(area,'in').value=num(p.ans);q(area,'ck').disabled=true;api.say('Look where Monkey is standing: <b>'+num(p.ans)+'</b>. So '+p.qs+' = '+num(p.ans)+'.','no');setTimeout(function(){api.solved();},900);}else api.say('Look at the number under Monkey’s feet!','no');}
}
q(area,'ck').onclick=check;q(area,'in').addEventListener('keydown',function(e){if(e.key==='Enter')check();});
},
learn:function(p,g){var arr=[];for(var k=0;k<=Math.abs(p.d);k++)arr.push(num(p.a+k*(p.d>0?1:-1)));
return [{t:'A number line is a road of numbers. Numbers get <b>bigger to the right</b> and <b>smaller to the left</b>.'+(g===6?' Negative numbers live to the left of 0 — the farther left, the smaller they are.':'')},
{t:'Put Monkey on the first number: <b>'+num(p.a)+'</b>.'},{t:p.rule},
{t:'Count '+Math.abs(p.d)+' hops, one at a time:',v:chips(arr,function(i){return i===arr.length-1;})},
{t:'Monkey lands on <b>'+num(p.ans)+'</b>, so <b>'+p.qs+' = '+num(p.ans)+'</b>! 🎉'}];}
};

/* ---------- Tens Treehouse (grades 1, 2) ---------- */
function pvPic(h,t,o){var s='';for(var i=0;i<h;i++)s+='<span class="cm-crate">100</span>';for(i=0;i<t;i++)s+='<span class="cm-bunch">'+'<i>🍌</i>'.repeat(10)+'</span>';for(i=0;i<o;i++)s+='<span class="cm-one">🍌</span>';return '<div class="cm-pvpic">'+s+'</div>';}
THINK.tens={name:'Tens Treehouse',icon:'🏠',c:'#ffd9a8',grades:[1,2],
d:{1:'Build numbers with bunches of 10 bananas and single bananas.',2:'Build big numbers with crates of 100, bunches of 10 and singles — then trade!'},
gen:function(g){
var m=pick(g===1?['build','build','read','more']:['build','read','trade','build']),n;
if(m==='more'){var b=rnd(12,85),up=Math.random()<.6;return {m:'build',n:up?b+10:b-10,pre:b,qs:'Show the number that is <b>10 '+(up?'more':'less')+'</b> than '+b+'.',H:false};}
if(m==='trade'){n=rnd(3,9)*10+rnd(0,8);return {m:'trade',n:n,tens:Math.floor(n/10)-1,qs:'Show <b>'+n+'</b> using exactly <b>'+(Math.floor(n/10)-1)+' tens</b>.',H:false};}
n=g===1?rnd(11,99):rnd(102,989);
return {m:m,n:n,qs:m==='build'?'Build the number <b>'+n+'</b>.':'What number do these bananas show?',H:g===2};
},
mount:function(area,p,api){
var sp=kStep(api),c={h:0,t:0,o:0};
if(p.pre){c.t=Math.floor(p.pre/10);c.o=p.pre%10;}
api.q('<span class="cm-medq">'+p.qs+'</span>');
if(p.m==='read'){
var h=Math.floor(p.n/100),t=Math.floor(p.n/10)%10,o=p.n%10;
area.innerHTML=pvPic(h,t,o)+'<div class="cm-row cm-center"><label class="cm-anslbl">The number is '+kIn('in',110)+'</label><button class="cm-bigbtn" data-r="ck">Check</button></div>';
api.say('Count the '+(h?'crates by 100s, then the ':'')+'bunches by 10s, then the single bananas by 1s.');
var ck=function(){var v=kNum(q(area,'in').value);if(same(v,p.n)){q(area,'ck').disabled=true;api.solved('🎯 That’s '+p.n+'!');}else{var k=sp.miss();if(k>=2){q(area,'in').value=p.n;q(area,'ck').disabled=true;api.say((h?h+' hundreds, ':'')+t+' tens and '+o+' ones make <b>'+p.n+'</b>.','no');setTimeout(function(){api.solved();},1200);}else api.say('Not quite. How many bunches of 10 are there? How many singles?','no');}};
q(area,'ck').onclick=ck;q(area,'in').addEventListener('keydown',function(e){if(e.key==='Enter')ck();});return;
}
function bin(k,title,sub){return '<div class="cm-bin"><h4>'+title+'</h4><small>'+sub+'</small><div class="cm-binvis" data-r="v'+k+'"></div><div class="cm-binctl"><button data-k="'+k+'" data-d="-1" aria-label="Remove">−</button><b data-r="c'+k+'">0</b><button data-k="'+k+'" data-d="1" aria-label="Add">+</button></div></div>';}
area.innerHTML='<div class="cm-bins">'+(p.H?bin('h','Hundreds','crates of 100'):'')+bin('t','Tens','bunches of 10')+bin('o','Ones','single bananas')+'</div><div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check my number</button></div>';
function paint(){['h','t','o'].forEach(function(k){var cv=q(area,'c'+k);if(!cv)return;cv.textContent=c[k];q(area,'v'+k).innerHTML=k==='h'?pvPic(c.h,0,0):k==='t'?pvPic(0,c.t,0):pvPic(0,0,c.o);});}
area.querySelector('.cm-bins').onclick=function(e){var b=e.target.closest('button');if(!b)return;var k=b.getAttribute('data-k'),d=+b.getAttribute('data-d');c[k]=clamp(c[k]+d,0,k==='h'?9:19);tone(d>0?600:420,.05,'triangle');paint();};
api.say(p.m==='trade'?'Hint: a bunch of 10 is the same as 10 single bananas!':p.pre?'Monkey already built <b>'+p.pre+'</b>. Change it!':'Tap <b>+</b> to add '+(p.H?'crates, ':'')+'bunches and single bananas.');
q(area,'ck').onclick=function(){
var v=100*c.h+10*c.t+c.o,ok=v===p.n&&(p.m==='trade'?c.t===p.tens:(c.o<=9&&c.t<=9));
if(ok){q(area,'ck').disabled=true;api.solved('🎯 '+(p.m==='trade'?c.t+' tens and '+c.o+' ones = '+p.n+'. Nice trade!':'You built '+p.n+'!'));return;}
var k=sp.miss(),msg;
if(v===p.n&&p.m!=='trade')msg='That’s '+v+', but you have '+c.o+' single bananas — trade 10 of them for a bunch of 10!';
else if(p.m==='trade'&&v===p.n)msg='Right number, but you used '+c.t+' tens. You need exactly '+p.tens+' tens — trade a bunch for 10 singles.';
else msg='You built <b>'+v+'</b>. You need <b>'+p.n+'</b>.'+(p.m!=='trade'?' Check the '+(Math.floor(v/10)%10!==Math.floor(p.n/10)%10?'tens':Math.floor(v/100)!==Math.floor(p.n/100)?'hundreds':'ones')+'.':'');
if(k>=3&&p.m!=='trade'){c={h:Math.floor(p.n/100),t:Math.floor(p.n/10)%10,o:p.n%10};paint();msg='Here’s how: '+(c.h?c.h+' crates, ':'')+c.t+' bunches and '+c.o+' singles make '+p.n+'. Press Check!';}
if(k>=3&&p.m==='trade'){c={h:0,t:p.tens,o:p.n-10*p.tens};paint();msg='Here’s the trade: '+p.tens+' tens and '+c.o+' ones = '+p.n+'. Press Check!';}
api.say(msg,'no');
};
paint();
},
learn:function(p){
var h=Math.floor(p.n/100),t=Math.floor(p.n/10)%10,o=p.n%10;
if(p.m==='trade')return [{t:'One bunch of 10 bananas is <b>exactly the same</b> as 10 single bananas.',v:pvPic(0,1,0)+'<div class="cm-plus">=</div>'+pvPic(0,0,10)},
{t:p.n+' is usually <b>'+Math.floor(p.n/10)+' tens and '+o+' ones</b>.',v:pvPic(0,Math.floor(p.n/10),o)},
{t:'Trade one ten for 10 ones: '+(Math.floor(p.n/10)-1)+' tens and '+(o+10)+' ones. Same number, different look!',v:pvPic(0,Math.floor(p.n/10)-1,o+10)},
{t:'This is the same trick you use when you <b>borrow</b> in subtraction! 🎉'}];
return [{t:'Every digit has a job. In <b>'+p.n+'</b>:'+(h?' the '+h+' means <b>'+h+' hundreds</b>,':'')+' the '+t+' means <b>'+t+' tens</b>, and the '+o+' means <b>'+o+' ones</b>.'},
{t:(h?h+' crates of 100 + ':'')+t+' bunches of 10 + '+o+' single bananas:',v:pvPic(h,t,o)},
{t:'Count it: '+(h?seq(h).map(function(i){return (i+1)*100;}).join(', ')+', then ':'')+'count bunches by 10s, then singles by 1s.'},
{t:'So '+(h?h*100+' + ':'')+t*10+' + '+o+' = <b>'+p.n+'</b>! 🎉'}];}
};

/* ---------- Column Climb (grades 2–5) ---------- */
var PLACE=['ones','tens','hundreds','thousands','ten-thousands'],PLACE_D=['hundredths','tenths','ones','tens','hundreds','thousands'];
function digitsOf(n,W){var a=[];for(var i=0;i<W;i++){a.push(n%10);n=Math.floor(n/10);}return a;}
THINK.column={name:'Column Climb',icon:'🧗',c:'#c7f0d8',grades:[2,3,4,5],
d:{2:'Add and subtract 2-digit numbers one column at a time — with carrying and borrowing.',3:'3-digit adding and subtracting, column by column.',4:'Big 4-digit numbers, one column at a time.',5:'Line up the decimal points, then add or subtract decimals.'},
gen:function(g){
var dec=g===5?2:0,op=Math.random()<.5?'+':'-',A,B,lo,hi,tries=0,ghost=false;
if(g===5){lo=1050;hi=9899;}else{lo=Math.pow(10,(g===2?2:g===3?3:4)-1);hi=lo*10-1;}
while(tries++<500){
if(g===5){A=rnd(lo,hi);ghost=Math.random()<.5;B=ghost?rnd(11,98)*10:rnd(105,989);if(op==='-'&&B>A)continue;}
else if(op==='+'){A=rnd(lo,hi);B=rnd(lo,hi);if(g===2&&A+B>99)continue;}
else{A=rnd(lo*2,hi);B=rnd(lo,A-1);if(A-B<lo/4)continue;}
var W=String(Math.max(A,B)).length,da=digitsOf(A,W),db=digitsOf(B,W),regroup=false,ok=true;
if(op==='+'){var cr=0;for(var i=0;i<W;i++){if(da[i]+db[i]+cr>=10)regroup=true;cr=da[i]+db[i]+cr>=10?1:0;}}
else{var t=da.slice();for(i=0;i<W;i++){if(t[i]<db[i]){regroup=true;if(i+1>=W||t[i+1]===0){ok=false;break;}t[i+1]--;t[i]+=10;}}}
if(ok&&(regroup||Math.random()<.15))break;
}
W=String(Math.max(A,B)).length;
return {op:op,A:A,B:B,W:W,dec:dec,ghost:ghost,ans:op==='+'?A+B:A-B,lenB:String(B).length};
},
mount:function(area,p,api){
var W=p.W,da=digitsOf(p.A,W),db=digitsOf(p.B,W),tops=da.slice(),carry=[],ans=[],cur=0,cin=0,phase='',sp=kStep(api),borrowed={},isAdd=p.op==='+',NC=isAdd?W+1:W;
function fmt(n){return p.dec?num(n/100):String(n);}
function pname(i){return p.dec?PLACE_D[i]:PLACE[i];}
api.q('<span class="cm-bigq">'+fmt(p.A)+' '+(isAdd?'+':'−')+' '+fmt(p.B)+'</span>');
function cols(){var a=[];for(var i=NC-1;i>=0;i--){a.push(i);if(p.dec&&i===p.dec)a.push('.');}return a;}
function render(){
var C=cols(),g='<div class="cm-colgrid" style="grid-template-columns:34px repeat('+C.length+',minmax(30px,46px))">';
g+='<span></span>'+C.map(function(i){if(i==='.')return '<span></span>';return '<span class="cm-carry">'+(carry[i]!=null?carry[i]:'')+'</span>';}).join('');
g+='<span></span>'+C.map(function(i){if(i==='.')return '<span class="cm-dot">.</span>';var show=i<W&&(i<String(p.A).length||(p.dec&&i<=p.dec));return '<span class="cm-dg top'+(borrowed[i]?' struck':'')+(phase==='borrow'&&i===cur+1?' pick':'')+'" data-i="'+i+'">'+(show?da[i]:'')+'</span>';}).join('');
g+='<span class="cm-opc">'+(isAdd?'+':'−')+'</span>'+C.map(function(i){if(i==='.')return '<span class="cm-dot">.</span>';var show=i<p.lenB||(p.dec&&i<=p.dec);var gh=p.ghost&&i===0;return '<span class="cm-dg'+(gh?' ghost':'')+'">'+(show?db[i]:'')+'</span>';}).join('');
g+='<span class="cm-line" style="grid-column:1 / span '+(C.length+1)+'"></span>';
g+='<span></span>'+C.map(function(i){if(i==='.')return '<span class="cm-dot">.</span>';if(i===cur&&phase==='type')return '<span class="cm-dg ans" data-i="'+i+'"><input class="cm-colin" data-r="ci" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="'+pname(i)+' digit"></span>';return '<span class="cm-dg ans'+(i===cur&&phase!=='done'?' now':'')+'" data-i="'+i+'">'+(ans[i]!=null?ans[i]:'')+'</span>';}).join('');
area.innerHTML=g+'</div>'+(p.ghost?'<p class="cm-note">The gray 0 is a placeholder so both numbers have the same number of decimal places.</p>':'');
var ci=q(area,'ci');if(ci){ci.focus();ci.addEventListener('input',function(){if(/^\d$/.test(ci.value))check(+ci.value);else ci.value='';});}
area.querySelectorAll('.cm-dg.top').forEach(function(el){el.onclick=function(){if(phase!=='borrow')return;var i=+el.getAttribute('data-i');if(i===cur+1)doBorrow();else{sp.miss();api.say('Borrow from the column right next door — the '+pname(cur+1)+' column.','no');}};});
}
function exp(){return isAdd?(cur>=W?cin:(da[cur]+db[cur]+cin)%10):tops[cur]-db[cur];}
function prompt(pre){pre=pre||'';
if(isAdd){
if(cur>=W){if(!cin||cur>W)return finish();api.say(pre+'There’s a carried <b>1</b> left over. Bring it down into the answer!');}
else api.say(pre+'Add the <b>'+pname(cur)+'</b> column: '+da[cur]+' + '+db[cur]+(cin?' + 1 (carried)':'')+'. Type the ones digit of the total.');
phase='type';
}else{
if(cur>=W)return finish();
if(cur===W-1&&W>1&&tops[cur]-db[cur]===0&&tops[cur]>=db[cur]){ans[cur]='';phase='done';render();return finish('No need to write a 0 at the front of a number.');}
if(tops[cur]<db[cur]){phase='borrow';api.say(tops[cur]+' is smaller than '+db[cur]+', so you need to <b>borrow</b>. Tap the top digit in the next column to the left.');}
else{phase='type';api.say(pre+'Subtract the <b>'+pname(cur)+'</b> column: '+tops[cur]+' − '+db[cur]+' = ?');}
}
sp.reset();render();
}
function doBorrow(){tops[cur+1]--;tops[cur]+=10;borrowed[cur+1]=true;carry[cur+1]=tops[cur+1];carry[cur]=tops[cur];api.good();phase='type';api.say('The '+(tops[cur+1]+1)+' became '+tops[cur+1]+', and this column became '+tops[cur]+'. Now: '+tops[cur]+' − '+db[cur]+' = ?');sp.reset();render();}
function check(v){
var e=exp();
if(v===e){
ans[cur]=v;tone(620,.06,'triangle');
var pre='';
if(isAdd&&cur<W){var s=da[cur]+db[cur]+cin;cin=s>=10?1:0;if(cin){carry[cur+1]=1;api.good();pre='<b>Carry the 1!</b> '+s+' is 10 or more, so write '+v+' and move a ten over. ';}}
cur++;prompt(pre);
}else{
var k=sp.miss();
if(k>=2){ans[cur]=e;api.say('The digit is <b>'+e+'</b>'+(isAdd&&cur<W?' because '+da[cur]+' + '+db[cur]+(cin?' + 1':'')+' = '+(da[cur]+db[cur]+cin)+(da[cur]+db[cur]+cin>=10?' — write '+e+' and carry the 1':''):isAdd?'':' because '+tops[cur]+' − '+db[cur]+' = '+e)+'.','no');
if(isAdd&&cur<W){var s2=da[cur]+db[cur]+cin;cin=s2>=10?1:0;if(cin)carry[cur+1]=1;}cur++;setTimeout(prompt,1300);phase='wait';render();}
else{api.say(isAdd?(cur>=W?'Just bring the carried 1 down!':'Try again: '+da[cur]+' + '+db[cur]+(cin?' + 1':'')+' = ? If it’s 10 or more, type only the ones digit.'):'Try again: '+tops[cur]+' − '+db[cur]+' = ?','no');render();}
}
}
function finish(extra){phase='done';render();api.solved((extra?extra+' ':'')+'🎯 '+fmt(p.A)+' '+(isAdd?'+':'−')+' '+fmt(p.B)+' = <b>'+fmt(p.ans)+'</b>!');}
prompt();
},
learn:function(p){
var isAdd=p.op==='+',W=p.W,da=digitsOf(p.A,W),db=digitsOf(p.B,W),f=function(n){return p.dec?num(n/100):String(n);},L=[];
L.push({t:'Stack the numbers so each place lines up — ones under ones, tens under tens'+(p.dec?', and the <b>decimal points in a straight line</b>':'')+'.'});
L.push({t:'Always start with the column on the <b>right</b> and move left, one column at a time.'});
if(isAdd){L.push({t:'Add each column. If it adds up to <b>10 or more</b>, write the ones digit and <b>carry the 1</b> to the next column — it’s a whole bundle of ten!'});
L.push({t:'First column here: '+da[0]+' + '+db[0]+' = '+(da[0]+db[0])+(da[0]+db[0]>=10?' → write '+((da[0]+db[0])%10)+', carry 1.':' → write '+(da[0]+db[0])+'.')});}
else{L.push({t:'Subtract top minus bottom. If the top digit is <b>smaller</b>, <b>borrow</b>: take 1 from the next column — it becomes 10 more in your column.'});
var i=0;while(i<W&&da[i]>=db[i])i++;
if(i<W)L.push({t:'Example from this problem: in the '+(p.dec?PLACE_D[i]:PLACE[i])+' column, '+da[i]+' is smaller than '+db[i]+'. Borrow → it becomes '+(da[i]+10)+', and '+(da[i]+10)+' − '+db[i]+' = '+(da[i]+10-db[i])+'.'});}
L.push({t:'Answer: <b>'+f(p.A)+' '+(isAdd?'+':'−')+' '+f(p.B)+' = '+f(p.ans)+'</b> 🎉'});
return L;}
};

/* ---------- Multiply Mountain: area model (grades 3–5) ---------- */
function pvParts(n){var s=String(n),a=[];for(var i=0;i<s.length;i++){var v=+s[i]*Math.pow(10,s.length-1-i);if(v)a.push(v);}return a;}
THINK.area={name:'Multiply Mountain',icon:'⛰️',c:'#e2d4ff',grades:[3,4,5],
d:{3:'Break a number into tens and ones to multiply it — the area model.',4:'Multiply big numbers by breaking them into place-value boxes.',5:'2-digit × 2-digit with the area model — four boxes, then add!'},
gen:function(g){var a,b;if(g===3){do{a=rnd(12,29);}while(a%10===0);b=rnd(2,5);}else if(g===4){if(Math.random()<.6){a=rnd(13,98);b=rnd(3,9);}else{a=rnd(102,489);b=rnd(2,6);}}else{a=rnd(13,79);b=rnd(12,39);}
return {a:a,b:b,pa:pvParts(a),pb:pvParts(b),ans:a*b};},
mount:function(area,p,api){
var sp=kStep(api),phase='split',done={};
api.q('<span class="cm-bigq">'+p.a+' × '+p.b+' = ?</span>');
function splitHTML(){var h='<div class="cm-split"><div>'+p.a+' = '+p.pa.map(function(v,i){return kIn('a'+i,80);}).join(' + ')+'</div>';if(p.pb.length>1)h+='<div>'+p.b+' = '+p.pb.map(function(v,i){return kIn('b'+i,70);}).join(' + ')+'</div>';return h+'</div><div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check</button></div>';}
function gridHTML(){
var h='<div class="cm-agrid2" style="grid-template-columns:60px repeat('+p.pa.length+',minmax(80px,1fr))"><span></span>'+p.pa.map(function(v){return '<span class="cm-ahead">'+v+'</span>';}).join('');
p.pb.forEach(function(bv,j){h+='<span class="cm-ahead side">'+bv+'</span>'+p.pa.map(function(av,i){var k=i+'_'+j;return '<span class="cm-abox c'+((i+j)%4)+'">'+(done[k]!=null?'<b>'+done[k]+'</b>':'<small>'+av+' × '+bv+'</small>'+kIn('x'+k,80))+'</span>';}).join('');});
return h+'</div>'+(phase==='boxes'?'<div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check boxes</button></div>':'');
}
function sumHTML(){var parts=[];p.pb.forEach(function(bv){p.pa.forEach(function(av){parts.push(av*bv);});});return '<div class="cm-sumrow">'+parts.join(' + ')+' = '+kIn('sum',110)+'</div><div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check</button></div>';}
function render(){
if(phase==='split'){area.innerHTML=splitHTML();api.say('<b>Step 1:</b> Break '+(p.pb.length>1?'both numbers':p.a)+' into place-value parts (like 47 = 40 + 7).');}
else if(phase==='boxes'){area.innerHTML=gridHTML();api.say('<b>Step 2:</b> Multiply to fill each box. Tip: for 40 × 6, do 4 × 6 = 24, then tack on the zero → 240.');}
else{area.innerHTML=gridHTML()+sumHTML();api.say('<b>Step 3:</b> Add up all the boxes.');}
var ck=q(area,'ck');if(ck)ck.onclick=check;
area.querySelectorAll('.cm-kin').forEach(function(el){el.addEventListener('keydown',function(e){if(e.key==='Enter')check();});});
var f=area.querySelector('.cm-kin');if(f)f.focus();
}
function check(){
if(phase==='split'){
var ok=true;p.pa.forEach(function(v,i){var el=q(area,'a'+i);if(kNum(el.value)!==v){ok=false;el.classList.add('bad');}else el.classList.remove('bad');});
if(p.pb.length>1)p.pb.forEach(function(v,i){var el=q(area,'b'+i);if(kNum(el.value)!==v){ok=false;el.classList.add('bad');}else el.classList.remove('bad');});
if(ok){api.good();phase='boxes';sp.reset();render();return;}
var k=sp.miss();
if(k>=2){p.pa.forEach(function(v,i){q(area,'a'+i).value=v;});if(p.pb.length>1)p.pb.forEach(function(v,i){q(area,'b'+i).value=v;});api.say('Here it is: '+p.a+' = '+p.pa.join(' + ')+(p.pb.length>1?' and '+p.b+' = '+p.pb.join(' + '):'')+'. Press Check!','no');}
else api.say('Each digit has a value. In '+p.a+', the '+String(p.a)[0]+' is worth '+p.pa[0]+'. Try again!','no');
}else if(phase==='boxes'){
var bad=null;p.pb.forEach(function(bv,j){p.pa.forEach(function(av,i){var k=i+'_'+j;if(done[k]!=null)return;var el=q(area,'x'+k);if(kNum(el.value)===av*bv)done[k]=av*bv;else if(!bad)bad=[av,bv,k];});});
if(!bad){phase='sum';sp.reset();api.good();render();return;}
var t=sp.miss(),av=bad[0],bv=bad[1],z=String(av).replace(/^\d/,'').length+String(bv).replace(/^\d/,'').length,d1=+String(av)[0],d2=+String(bv)[0];
if(t>=3){done[bad[2]]=av*bv;sp.reset();render();api.say(av+' × '+bv+': '+d1+' × '+d2+' = '+(d1*d2)+', plus '+z+' zero'+(z===1?'':'s')+' → <b>'+(av*bv)+'</b>.','no');}
else{render();api.say('Check <b>'+av+' × '+bv+'</b>: multiply '+d1+' × '+d2+' = '+(d1*d2)+', then add '+z+' zero'+(z===1?'':'s')+'.','no');}
}else{
var v=kNum(q(area,'sum').value);
if(v===p.ans){q(area,'ck').disabled=true;api.solved('🎯 '+p.a+' × '+p.b+' = <b>'+p.ans+'</b>!');}
else{var t2=sp.miss();if(t2>=2){q(area,'sum').value=p.ans;q(area,'ck').disabled=true;api.say('Adding the boxes gives <b>'+p.ans+'</b>. Line them up in columns to add carefully!','no');setTimeout(function(){api.solved();},1300);}else api.say('Not quite — try adding the boxes in columns, ones under ones.','no');}
}
}
render();
},
learn:function(p){var parts=[],lines=[];p.pb.forEach(function(bv){p.pa.forEach(function(av){parts.push(av*bv);lines.push(av+' × '+bv+' = '+(av*bv));});});
return [{t:'Big multiplication is easier in pieces! Break each number into <b>place-value parts</b>:',v:'<div class="cm-eq2">'+p.a+' = '+p.pa.join(' + ')+(p.pb.length>1?'<br>'+p.b+' = '+p.pb.join(' + '):'')+'</div>'},
{t:'Draw a rectangle with a box for each pair of parts, and multiply each box. Zero trick: multiply the first digits, then add the zeros.',v:'<div class="cm-eq2">'+lines.join('<br>')+'</div>'},
{t:'Add all the boxes together:',v:'<div class="cm-eq2">'+parts.join(' + ')+' = <b>'+p.ans+'</b></div>'},
{t:'So <b>'+p.a+' × '+p.b+' = '+p.ans+'</b>! 🎉'}];}
};

/* ---------- Banana Split: long division (grades 4–6) ---------- */
function divSteps(N,d){var s=String(N).split('').map(Number),i=0,cur=s[0];while(cur<d&&i<s.length-1){i++;cur=cur*10+s[i];}var steps=[];while(true){var qd=Math.floor(cur/d),prod=qd*d,rem=cur-prod;steps.push({pos:i,cur:cur,qd:qd,prod:prod,rem:rem});if(i>=s.length-1)break;i++;cur=rem*10+s[i];}return {digits:s,steps:steps};}
THINK.divide={name:'Banana Split',icon:'🍨',c:'#ffe0b8',grades:[4,5,6],
d:{4:'Share bananas fairly with long division: divide, multiply, subtract, bring down.',5:'Long division with bigger numbers — and remainders!',6:'Long division with 2-digit divisors.'},
gen:function(g){var d,qn,r;
if(g===4){d=rnd(2,9);qn=rnd(12,99);}else if(g===5){if(Math.random()<.6){d=rnd(3,9);qn=rnd(102,999);}else{d=rnd(11,19);qn=rnd(12,60);}}else{d=rnd(12,35);qn=rnd(21,240);}
r=Math.random()<.45?rnd(1,d-1):0;var N=d*qn+r,ds=divSteps(N,d);return {N:N,d:d,q:qn,r:r,digits:ds.digits,steps:ds.steps};},
mount:function(area,p,api){
var k=0,phase='q',sp=kStep(api),L=p.digits.length,shown={q:[],rows:[]};
api.q('<span class="cm-medq">Share <b>'+p.N+'</b> bananas equally among <b>'+p.d+'</b> monkeys. How many does each get?</span>');
function rowAt(str,end){var a=[];for(var i=0;i<L;i++)a.push('');var s=String(str);for(var j=0;j<s.length;j++){var c=end-s.length+1+j;if(c>=0&&c<L)a[c]=s[j];}return a;}
function render(){
var g='<div class="cm-ldiv" style="grid-template-columns:auto repeat('+L+',30px)">';
var qrow=[];for(var i=0;i<L;i++)qrow.push('');shown.q.forEach(function(x){qrow[x.pos]=x.v;});
g+='<span></span>'+qrow.map(function(v){return '<span class="cm-lq">'+v+'</span>';}).join('');
var st=p.steps[k]||{},hl={};if(phase!=='done'&&st.pos!=null){var cl=String(st.cur).length;for(i=st.pos-cl+1;i<=st.pos;i++)hl[i]=1;}
g+='<span class="cm-ldv">'+p.d+'</span>'+p.digits.map(function(v,i){return '<span class="cm-lnum'+(i===0?' first':'')+(k===0&&hl[i]?' hl':'')+'">'+v+'</span>';}).join('');
shown.rows.forEach(function(r,ri){var last=ri===shown.rows.length-1;g+='<span class="cm-lsign">'+(r.sub?'−':'')+'</span>'+r.cells.map(function(v,i){return '<span class="cm-lcell'+(r.sub?' sub':'')+(last&&!r.sub&&hl[i]&&k>0?' hl':'')+'">'+v+'</span>';}).join('');});
area.innerHTML=g+'</div><div class="cm-lpanel" data-r="pan"></div>';
panel();
}
function panel(){
var pan=q(area,'pan'),st=p.steps[k];
if(phase==='done'){pan.innerHTML='';return;}
if(phase==='b'){var nd=p.digits[st.pos+1];pan.innerHTML='<button class="cm-bigbtn" data-r="bd">⬇ Bring down the '+nd+'</button>';q(pan,'bd').onclick=function(){shown.rows[shown.rows.length-1].cells[st.pos+1]=String(nd);k++;phase='q';sp.reset();tone(520,.06,'triangle');render();say();};return;}
var lab=phase==='q'?'How many times does <b>'+p.d+'</b> go into <b>'+st.cur+'</b>?':phase==='m'?'<b>Multiply:</b> '+st.qd+' × '+p.d+' =':'<b>Subtract:</b> '+st.cur+' − '+st.prod+' =';
pan.innerHTML='<label class="cm-anslbl">'+lab+' '+kIn('in',90)+'</label><button class="cm-bigbtn" data-r="ck">Check</button>';
var inp=q(pan,'in');inp.focus();inp.addEventListener('keydown',function(e){if(e.key==='Enter')check();});q(pan,'ck').onclick=check;
}
function say(){var st=p.steps[k];api.say(phase==='q'?'<b>Divide:</b> Use your times table — what’s the biggest number you can multiply by '+p.d+' without going over '+st.cur+'?':phase==='m'?'<b>Multiply</b> your answer by '+p.d+'.':phase==='s'?'<b>Subtract</b> to see what’s left over.':'');}
function advance(){
var st=p.steps[k];
if(phase==='q'){shown.q.push({pos:st.pos,v:st.qd});phase='m';}
else if(phase==='m'){shown.rows.push({sub:true,cells:rowAt(st.prod,st.pos)});phase='s';}
else{shown.rows.push({sub:false,cells:rowAt(st.rem,st.pos)});
if(k<p.steps.length-1){phase='b';api.say('<b>Bring down</b> the next digit.');render();return;}
phase='done';render();api.solved('🎯 '+p.N+' ÷ '+p.d+' = <b>'+p.q+(p.r?' R '+p.r:'')+'</b>. Each monkey gets '+p.q+' banana'+(p.q===1?'':'s')+(p.r?', with '+p.r+' left over for you!':'!'));return;}
sp.reset();render();say();
}
function check(){
var st=p.steps[k],v=kNum(q(area,'in').value),e=phase==='q'?st.qd:phase==='m'?st.prod:st.rem;
if(v===e){api.good();advance();return;}
var t=sp.miss(),msg;
if(phase==='q'&&!isNaN(v))msg=v*p.d>st.cur?'Too many! '+v+' × '+p.d+' = '+(v*p.d)+', which is more than '+st.cur+'.':'You can fit more! '+(v+1)+' × '+p.d+' = '+((v+1)*p.d)+' is still not more than '+st.cur+'.';
else msg=phase==='m'?'Check your multiplication: '+st.qd+' × '+p.d+'.':'Check your subtraction: '+st.cur+' − '+st.prod+'.';
if(t>=2){api.say('The answer is <b>'+e+'</b>. '+(phase==='q'?p.d+' × '+e+' = '+(e*p.d)+' fits in '+st.cur+'.':''),'no');setTimeout(advance,1200);q(area,'ck').disabled=true;}
else api.say(msg,'no');
}
render();say();
},
learn:function(p){var s=p.steps[0];
return [{t:'Long division repeats 4 steps: <b>Divide, Multiply, Subtract, Bring down</b>. (Remember it with <b>D</b>ad, <b>M</b>om, <b>S</b>ister, <b>B</b>rother!)'},
{t:'<b>Divide:</b> Start with the first part of '+p.N+' that '+p.d+' fits into: <b>'+s.cur+'</b>. How many '+p.d+'s fit? <b>'+s.qd+'</b> (because '+s.qd+' × '+p.d+' = '+s.prod+', and one more would be too many). Write '+s.qd+' on top.'},
{t:'<b>Multiply:</b> '+s.qd+' × '+p.d+' = <b>'+s.prod+'</b>. Write it under '+s.cur+'.'},
{t:'<b>Subtract:</b> '+s.cur+' − '+s.prod+' = <b>'+s.rem+'</b>. (It must be smaller than '+p.d+' — if not, you could fit more!)'},
{t:'<b>Bring down</b> the next digit next to the '+s.rem+' and repeat all 4 steps until there are no digits left.'},
{t:'Whatever is left at the end is the <b>remainder</b>. Here: '+p.N+' ÷ '+p.d+' = <b>'+p.q+(p.r?' R '+p.r:'')+'</b> 🎉'}];}
};

/* ---------- Banana Bread Bakery: fractions (grades 3–5) ---------- */
THINK.fraction={name:'Banana Bread Bakery',icon:'🍞',c:'#ffe7a8',grades:[3,4,5],
d:{3:'Slice banana bread to show, name and compare fractions.',4:'Cut bread into more slices to find equivalent fractions.',5:'Add and subtract fractions with different denominators, step by step.'},
gen:function(g){
var d,n,k;
if(g===3){var m=pick(['shade','name','compare']);d=pick([2,3,4,6,8]);n=rnd(1,d-1);
if(m!=='compare')return {m:m,n:n,d:d};
if(Math.random()<.5){var d2=pick([3,4,6,8]),a=rnd(1,d2-1),b;do{b=rnd(1,d2-1);}while(b===a&&Math.random()<.8);return {m:'compare',f1:[a,d2],f2:[b,d2]};}
var nn=rnd(1,2),x=pick([3,4,6,8]),y;do{y=pick([2,3,4,6,8]);}while(y<=nn||(y===x&&Math.random()<.8));if(x<=nn)x=nn+2;return {m:'compare',f1:[nn,x],f2:[nn,y]};}
if(g===4){d=pick([2,3,4,5,6]);n=rnd(1,d-1);var ks=[2,3,4].filter(function(z){return d*z<=12;});k=pick(ks);return {m:pick(['equiv','missing']),n:n,d:d,k:k};}
var pairs=[[2,3],[2,5],[3,4],[2,6],[4,6],[3,5],[2,8],[4,8],[3,6],[5,10],[4,5]],pr=pick(pairs);if(Math.random()<.5)pr=[pr[1],pr[0]];
var b1=pr[0],b2=pr[1],a1=rnd(1,b1-1),a2=rnd(1,b2-1),op=Math.random()<.6?'+':'-';
if(op==='-'&&a1/b1<=a2/b2){var t=[a1,b1];a1=a2;b1=b2;a2=t[0];b2=t[1];if(a1/b1===a2/b2)op='+';}
return {m:'add',op:op,a1:a1,b1:b1,a2:a2,b2:b2};
},
mount:function(area,p,api){
var sp=kStep(api);
function fin(msg){api.solved(msg);}
if(p.m==='shade'){
api.q('<span class="cm-medq">Shade '+kfr(p.n,p.d)+' of the banana bread.</span>');
area.innerHTML=bread(p.d,[],true,'br')+'<div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check</button></div>';
api.say('The <b>bottom</b> number ('+p.d+') says how many equal slices. The <b>top</b> number ('+p.n+') says how many to shade. Tap slices to shade them.');
q(area,'br').onclick=function(e){var b=e.target.closest('.cm-slice');if(b){b.classList.toggle('on');tone(520,.04,'triangle');}};
q(area,'ck').onclick=function(){var c=area.querySelectorAll('.cm-slice.on').length;if(c===p.n){q(area,'ck').disabled=true;fin('🎯 '+p.n+' out of '+p.d+' slices = '+p.n+'/'+p.d+'!');}else{var t=sp.miss();api.say('You shaded '+c+' slice'+(c===1?'':'s')+'. You need '+p.n+' out of '+p.d+'.','no');if(t>=3){area.querySelectorAll('.cm-slice').forEach(function(s,i){s.classList.toggle('on',i<p.n);});api.say('Like this: '+p.n+' shaded slices out of '+p.d+'. Press Check!','no');}}};
return;
}
if(p.m==='name'){
api.q('<span class="cm-medq">What fraction of the bread is shaded?</span>');
area.innerHTML=bread(p.d,firstN(p.n),false)+'<div class="cm-row cm-center"><span class="cm-fin">'+kIn('n',60)+'<i></i>'+kIn('d',60)+'</span><button class="cm-bigbtn" data-r="ck">Check</button></div>';
api.say('Top: how many slices are shaded? Bottom: how many slices in all?');
q(area,'ck').onclick=function(){var nn=kNum(q(area,'n').value),dd=kNum(q(area,'d').value);if(nn===p.n&&dd===p.d){q(area,'ck').disabled=true;fin('🎯 It’s '+p.n+'/'+p.d+'!');}else{var t=sp.miss();if(t>=2){q(area,'n').value=p.n;q(area,'d').value=p.d;q(area,'ck').disabled=true;api.say(p.n+' slices are shaded out of '+p.d+' total, so it’s <b>'+p.n+'/'+p.d+'</b>.','no');setTimeout(function(){fin();},1300);}else api.say(dd!==p.d?'Count ALL the slices for the bottom number.':'Count just the shaded slices for the top number.','no');}};
return;
}
if(p.m==='compare'){
var v1=p.f1[0]/p.f1[1],v2=p.f2[0]/p.f2[1],right=v1>v2?'>':v1<v2?'<':'=';
api.q('<span class="cm-medq">Which is more bread? '+kfr(p.f1[0],p.f1[1])+' ? '+kfr(p.f2[0],p.f2[1])+'</span>');
area.innerHTML='<div class="cm-cmp"><div>'+kfr(p.f1[0],p.f1[1])+bread(p.f1[1],firstN(p.f1[0]),false)+'</div><div>'+kfr(p.f2[0],p.f2[1])+bread(p.f2[1],firstN(p.f2[0]),false)+'</div></div><div class="cm-row cm-center" data-r="ops">'+['<','=','>'].map(function(o){return '<button class="cm-cmpbtn" data-o="'+o+'">'+o+'</button>';}).join('')+'</div>';
api.say('Compare the shaded parts. Pick &lt;, = or &gt;.');
q(area,'ops').onclick=function(e){var b=e.target.closest('button');if(!b||b.disabled)return;var o=b.getAttribute('data-o');
if(o===right){area.querySelectorAll('.cm-cmpbtn').forEach(function(x){x.disabled=true;});b.classList.add('ok');fin('🎯 '+p.f1[0]+'/'+p.f1[1]+' '+right+' '+p.f2[0]+'/'+p.f2[1]+(p.f1[1]===p.f2[1]?' — same size slices, so more slices means more bread!':' — fewer slices means each slice is BIGGER!'));}
else{b.disabled=true;var t=sp.miss();api.say(p.f1[1]===p.f2[1]?'Same size slices — which one has more shaded slices?':'Same number shaded — but which bread has BIGGER slices?','no');}};
return;
}
if(p.m==='equiv'||p.m==='missing'){
var D=p.d*p.k,N=p.n*p.k;
api.q('<span class="cm-medq">'+(p.m==='equiv'?'Make a fraction equal to '+kfr(p.n,p.d)+' using more slices.':kfr(p.n,p.d)+' = '+kfr('?',D))+'</span>');
if(p.m==='missing'){
area.innerHTML=bread(p.d,firstN(p.n),false)+'<div class="cm-row cm-center"><span class="cm-medq">'+kfr(p.n,p.d)+' = </span><span class="cm-fin">'+kIn('n',60)+'<i></i><b class="cm-fixd">'+D+'</b></span><button class="cm-bigbtn" data-r="ck">Check</button></div><div data-r="after"></div>';
api.say('The bottom went from '+p.d+' to '+D+' — that’s × '+p.k+'. Do the same to the top!');
q(area,'ck').onclick=function(){var nn=kNum(q(area,'n').value);if(nn===N){q(area,'ck').disabled=true;q(area,'after').innerHTML=bread(D,firstN(N),false);fin('🎯 '+p.n+'/'+p.d+' = '+N+'/'+D+' — see? Same amount of bread!');}else{var t=sp.miss();if(t>=2){q(area,'n').value=N;q(area,'ck').disabled=true;q(area,'after').innerHTML=bread(D,firstN(N),false);api.say(p.n+' × '+p.k+' = '+N+', so '+p.n+'/'+p.d+' = <b>'+N+'/'+D+'</b>.','no');setTimeout(function(){fin();},1400);}else api.say('Multiply the top by the same number as the bottom: '+p.n+' × '+p.k+' = ?','no');}};
return;
}
var opts=shuffle([D,p.d+1,p.d*(p.k===2?3:2)>12?p.d+2:p.d*(p.k===2?3:2)].filter(function(v,i,a){return a.indexOf(v)===i&&v!==p.d;})),slices=0;
area.innerHTML='<div class="cm-eqv"><div class="cm-eqlbl">'+kfr(p.n,p.d)+'</div>'+bread(p.d,firstN(p.n),false)+'</div><p class="cm-note">Cut the bottom bread into how many slices?</p><div class="cm-row cm-center" data-r="opt">'+opts.map(function(v){return '<button class="cm-cmpbtn" data-v="'+v+'">'+v+'</button>';}).join('')+'</div><div data-r="bot"></div>';
api.say('Pick how many slices, then shade the bottom bread so it has the <b>same amount</b> as the top.');
q(area,'opt').onclick=function(e){var b=e.target.closest('button');if(!b)return;slices=+b.getAttribute('data-v');area.querySelectorAll('[data-r=opt] button').forEach(function(x){x.classList.toggle('ok',x===b);});
q(area,'bot').innerHTML='<div class="cm-eqv"><div class="cm-eqlbl" data-r="lbl">?/'+slices+'</div>'+bread(slices,[],true,'br')+'</div><div class="cm-row cm-center"><button class="cm-bigbtn" data-r="ck">Check</button></div>';
if(slices%p.d)api.say('Hmm — with '+slices+' slices, the cuts won’t line up with the top bread. Try shading and see!');else api.say('Now shade slices until the bottom matches the top.');
q(area,'br').onclick=function(ev){var s=ev.target.closest('.cm-slice');if(s){s.classList.toggle('on');q(area,'lbl').textContent=area.querySelectorAll('[data-r=br] .cm-slice.on').length+'/'+slices;}};
q(area,'ck').onclick=function(){var c=area.querySelectorAll('[data-r=br] .cm-slice.on').length;if(c*p.d===p.n*slices){q(area,'ck').disabled=true;fin('🎯 '+p.n+'/'+p.d+' = '+c+'/'+slices+'! Multiply top and bottom by '+(slices/p.d)+' and you get the same amount.');}
else{var t=sp.miss();if(t>=3&&!(slices%p.d)){var need=p.n*slices/p.d;area.querySelectorAll('[data-r=br] .cm-slice').forEach(function(x,i){x.classList.toggle('on',i<need);});q(area,'lbl').textContent=need+'/'+slices;api.say('Like this: each top slice became '+(slices/p.d)+' bottom slices, so shade '+need+'. Press Check!','no');return;}api.say(slices%p.d?p.n+'/'+p.d+' can’t be made exactly with '+slices+' slices. Pick a number that '+p.d+' fits into evenly!':'Not the same amount yet. Each top slice became '+(slices/p.d)+' bottom slices, so you need '+p.n+' × '+(slices/p.d)+' = '+(p.n*slices/p.d)+' shaded.','no');}};};
return;
}
/* add / subtract unlike denominators */
var L=p.b1*p.b2/gcd(p.b1,p.b2),D2,n1,n2,res,phase='lcd',sym=p.op==='+'?'+':'−';
api.q('<span class="cm-medq">'+kfr(p.a1,p.b1)+' '+sym+' '+kfr(p.a2,p.b2)+' = ?</span>');
function show(){
var h='<div class="cm-cmp"><div>'+kfr(p.a1,p.b1)+bread(p.b1,firstN(p.a1),false)+'</div><div>'+kfr(p.a2,p.b2)+bread(p.b2,firstN(p.a2),false)+'</div></div>';
if(phase==='lcd')h+='<div class="cm-row cm-center"><label class="cm-anslbl">Common denominator: '+kIn('in',80)+'</label><button class="cm-bigbtn" data-r="ck">Check</button></div>';
if(phase==='rw')h+='<div class="cm-row cm-center cm-medq">'+kfr(p.a1,p.b1)+' = <span class="cm-fin">'+kIn('n1',56)+'<i></i><b class="cm-fixd">'+D2+'</b></span> &nbsp; '+kfr(p.a2,p.b2)+' = <span class="cm-fin">'+kIn('n2',56)+'<i></i><b class="cm-fixd">'+D2+'</b></span><button class="cm-bigbtn" data-r="ck">Check</button></div>';
if(phase==='op'||phase==='simp'||phase==='done'){h+='<div class="cm-cmp"><div>'+kfr(n1,D2)+bread(D2,firstN(n1),false)+'</div><div>'+kfr(n2,D2)+bread(D2,firstN(n2),false)+'</div></div>';}
if(phase==='op')h+='<div class="cm-row cm-center cm-medq">'+kfr(n1,D2)+' '+sym+' '+kfr(n2,D2)+' = <span class="cm-fin">'+kIn('n',56)+'<i></i><b class="cm-fixd">'+D2+'</b></span><button class="cm-bigbtn" data-r="ck">Check</button></div>';
if(phase==='simp')h+='<div class="cm-row cm-center cm-medq">'+kfr(res,D2)+' in simplest form = <span class="cm-fin">'+kIn('n',56)+'<i></i>'+kIn('d',56)+'</span><button class="cm-bigbtn" data-r="ck">Check</button></div>';
area.innerHTML=h;var ck=q(area,'ck');if(ck)ck.onclick=check;
area.querySelectorAll('.cm-kin').forEach(function(el){el.addEventListener('keydown',function(e){if(e.key==='Enter')check();});});
var f=area.querySelector('.cm-kin');if(f)f.focus();
}
function done(){var g=gcd(res,D2),sn=res/g,sd=D2/g;phase='done';show();fin('🎯 '+p.a1+'/'+p.b1+' '+sym+' '+p.a2+'/'+p.b2+' = <b>'+sn+'/'+sd+'</b>'+(sn>sd?' (that’s '+Math.floor(sn/sd)+' '+(sn%sd)+'/'+sd+' as a mixed number)':'')+'!');}
function check(){
if(phase==='lcd'){var v=kNum(q(area,'in').value);
if(v>0&&isInt(v)&&v%p.b1===0&&v%p.b2===0){D2=v;n1=p.a1*D2/p.b1;n2=p.a2*D2/p.b2;res=p.op==='+'?n1+n2:n1-n2;phase='rw';sp.reset();api.good();api.say((D2===L?'Perfect — that’s the <b>least</b> common denominator!':'That works! (The smallest one would be '+L+'.)')+' <b>Step 2:</b> rewrite each fraction with '+D2+' slices.');show();}
else{var t=sp.miss();if(t>=2){q(area,'in').value=L;api.say('Count by '+p.b1+'s and by '+p.b2+'s — the first number in both lists is <b>'+L+'</b>. Press Check!','no');}else api.say('You need a number that BOTH '+p.b1+' and '+p.b2+' divide into evenly.','no');}}
else if(phase==='rw'){var x=kNum(q(area,'n1').value),y=kNum(q(area,'n2').value);
if(x===n1&&y===n2){phase='op';sp.reset();api.good();api.say('<b>Step 3:</b> Now the slices are the same size, so just '+(p.op==='+'?'add':'subtract')+' the top numbers!');show();}
else{var t2=sp.miss();var m1=D2/p.b1,m2=D2/p.b2;if(t2>=2){q(area,'n1').value=n1;q(area,'n2').value=n2;api.say(p.a1+' × '+m1+' = '+n1+' and '+p.a2+' × '+m2+' = '+n2+'. Press Check!','no');}else api.say('Whatever you multiply the bottom by, multiply the top by too: '+p.b1+' × '+m1+' = '+D2+', so do '+p.a1+' × '+m1+'.','no');}}
else if(phase==='op'){var z=kNum(q(area,'n').value);
if(z===res){sp.reset();api.good();if(gcd(res,D2)>1){phase='simp';api.say('<b>Step 4:</b> '+res+' and '+D2+' can both be divided by '+gcd(res,D2)+'. Simplify!');show();}else done();}
else{var t3=sp.miss();if(t3>=2){q(area,'n').value=res;api.say(n1+' '+sym+' '+n2+' = '+res+'. The bottom stays '+D2+'. Press Check!','no');}else api.say((p.op==='+'?'Add':'Subtract')+' only the top numbers: '+n1+' '+sym+' '+n2+'. The bottom stays the same.','no');}}
else{var g=gcd(res,D2),sn=kNum(q(area,'n').value),sd=kNum(q(area,'d').value);
if(sn===res/g&&sd===D2/g)done();
else{var t4=sp.miss();if(t4>=2){q(area,'n').value=res/g;q(area,'d').value=D2/g;api.say('Divide top and bottom by '+g+': '+(res/g)+'/'+(D2/g)+'. Press Check!','no');}else api.say(sn&&sd&&sn*D2===sd*res?'Equal, but can it be simplified even more?':'Divide the top AND bottom by the same number ('+g+').','no');}}
}
api.say('<b>Step 1:</b> The slices are different sizes! Find a <b>common denominator</b> — a number both '+p.b1+' and '+p.b2+' divide into.');
show();
},
learn:function(p){
if(p.m==='shade'||p.m==='name')return [{t:'A fraction has two parts. The <b>bottom number</b> (denominator) says how many <b>equal</b> slices the whole bread is cut into.'},{t:'The <b>top number</b> (numerator) says how many of those slices we’re talking about.'},{t:kfr(p.n,p.d)+' means <b>'+p.n+'</b> slice'+(p.n>1?'s':'')+' out of <b>'+p.d+'</b>:',v:bread(p.d,firstN(p.n),false)},{t:'So shade '+p.n+' and leave '+(p.d-p.n)+' plain. 🎉'}];
if(p.m==='compare')return [{t:'If the bottom numbers are the <b>same</b>, the slices are the same size — more shaded slices means more bread.',v:bread(4,[0,1,2],false)+bread(4,[0],false)},{t:'If the top numbers are the <b>same</b>, look at the bottom: fewer slices means <b>bigger</b> slices! 1/3 is more than 1/8.',v:bread(3,[0],false)+bread(8,[0],false)},{t:'Always compare by looking at how much bread is shaded. 🎉'}];
if(p.m==='equiv'||p.m==='missing'){var D=p.d*p.k,N=p.n*p.k;return [{t:'Equivalent fractions are the <b>same amount</b> of bread, cut into a different number of slices.'},{t:'If you cut every slice into '+p.k+' smaller pieces, the bottom number gets multiplied by '+p.k+'…',v:bread(p.d,firstN(p.n),false)+bread(D,firstN(N),false)},{t:'…and the shaded part gets multiplied by '+p.k+' too:',v:'<div class="cm-eq2">'+p.n+' × '+p.k+' = '+N+' &nbsp;&nbsp; '+p.d+' × '+p.k+' = '+D+'</div>'},{t:'So '+kfr(p.n,p.d)+' = '+kfr(N,D)+'. 🎉 Multiply (or divide) top and bottom by the same number!'}];}
var L=p.b1*p.b2/gcd(p.b1,p.b2),n1=p.a1*L/p.b1,n2=p.a2*L/p.b2,res=p.op==='+'?n1+n2:n1-n2,g=gcd(res,L);
return [{t:'You can only add or subtract fractions when the slices are the <b>same size</b> — the denominators must match.'},{t:'<b>Step 1:</b> Find a common denominator. Count by '+p.b1+'s and by '+p.b2+'s until you hit the same number: <b>'+L+'</b>.'},{t:'<b>Step 2:</b> Rewrite each fraction with '+L+' slices:',v:'<div class="cm-eq2">'+p.a1+'/'+p.b1+' = '+n1+'/'+L+' &nbsp;&nbsp; '+p.a2+'/'+p.b2+' = '+n2+'/'+L+'</div>'},{t:'<b>Step 3:</b> '+(p.op==='+'?'Add':'Subtract')+' the tops, keep the bottom: '+n1+' '+(p.op==='+'?'+':'−')+' '+n2+' = '+res+', so '+res+'/'+L+'.'},{t:'<b>Step 4:</b> Simplify if you can'+(g>1?': divide by '+g+' → <b>'+(res/g)+'/'+(L/g)+'</b>':' — this one is already simplest!')+' 🎉'}];}
};

/* ---------- Peel the Problem: order of operations (grades 5, 6) ---------- */
function tokenize(s){var t=[],m,re=/\s*(\d+|[-+*/^()])/g;while((m=re.exec(s))){var x=m[1];if(/\d/.test(x))t.push({t:'n',v:+x});else if(x==='('||x===')')t.push({t:x});else t.push({t:'o',v:{'*':'×','/':'÷','-':'−','+':'+','^':'^'}[x]});}return t;}
function nextOpIdx(tk){var lo=0,hi=tk.length,close=-1,i;for(i=0;i<tk.length;i++)if(tk[i].t===')'){close=i;break;}if(close>-1){for(i=close;i>=0;i--)if(tk[i].t==='('){lo=i+1;hi=close;break;}}
var levels=[['^'],['×','÷'],['+','−']];for(var L=0;L<3;L++)for(i=lo;i<hi;i++)if(tk[i].t==='o'&&levels[L].indexOf(tk[i].v)>-1)return i;return -1;}
function applyOp(a,o,b){return o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:o==='÷'?a/b:Math.pow(a,b);}
function reduceAt(tk,i){var r=applyOp(tk[i-1].v,tk[i].v,tk[i+1].v),t=tk.slice(0,i-1).concat([{t:'n',v:r}],tk.slice(i+2)),j=i-1;if(t[j-1]&&t[j-1].t==='('&&t[j+1]&&t[j+1].t===')')t=t.slice(0,j-1).concat([t[j]],t.slice(j+2));return t;}
function tkHTML(tk,click){var h='',i=0;while(i<tk.length){var x=tk[i];if(x.t==='n'){if(tk[i+1]&&tk[i+1].v==='^'){h+='<span class="cm-tn">'+x.v+(click?'<button class="cm-opb exp" data-i="'+(i+1)+'"><sup>'+tk[i+2].v+'</sup></button>':'<sup>'+tk[i+2].v+'</sup>')+'</span>';i+=3;continue;}h+='<span class="cm-tn">'+x.v+'</span>';}else if(x.t==='o')h+=click?'<button class="cm-opb" data-i="'+i+'">'+x.v+'</button>':'<span class="cm-tn op">'+x.v+'</span>';else h+='<span class="cm-tp">'+x.t+'</span>';i++;}return h;}
function opWord(o){return o==='^'?'exponent':o==='×'?'multiply':o==='÷'?'divide':o==='+'?'add':'subtract';}
THINK.order={name:'Peel the Problem',icon:'🍌',c:'#fff1a8',grades:[5,6],
d:{5:'Peel a long problem one layer at a time — parentheses, then × ÷, then + −.',6:'Order of operations with exponents. Tap what comes first!'},
gen:function(g){
var a=rnd(2,9),b=rnd(2,9),c=rnd(2,9),d=rnd(2,6),T5=[
function(){return a+' + '+b+' * '+c;},
function(){return '('+a+' + '+b+') * '+c;},
function(){return a+' * '+b+' - '+(c*d)+' / '+d;},
function(){var x=a+rnd(2,8);return '('+x+' - '+a+') * '+c+' + '+d;},
function(){var x=c+rnd(1,6);return (a*2)+' + '+b+' * ('+x+' - '+c+')';},
function(){return (b*d)+' / '+d+' + '+a+' * '+c;},
function(){return '('+a+' + '+c+') * ('+b+' + '+d+') - '+a;}],
T6=[function(){var x=rnd(2,6);return x+'^2 + '+b+' * '+c;},
function(){var x=rnd(1,4),y=rnd(1,4);return '('+x+' + '+y+')^2 - '+c;},
function(){var x=rnd(2,5);return a+' * '+x+'^2 - '+b;},
function(){var x=a+rnd(1,5);return '2^3 + ('+x+' - '+a+') * '+c;},
function(){return (c*4)+' / 2^2 + '+a;}];
var list=g===6?T6.concat(T5.slice(1,4)):T5,s,tk,ok,guard=0;
do{s=pick(list)();tk=tokenize(s);var t=tk,val;ok=true;while(t.length>1){var i=nextOpIdx(t);var r=applyOp(t[i-1].v,t[i].v,t[i+1].v);if(r<0||!isInt(r)){ok=false;break;}t=reduceAt(t,i);}}while(!ok&&guard++<50);
return {tk:tk,ans:(function(){var t=tk;while(t.length>1)t=reduceAt(t,nextOpIdx(t));return t[0].v;})()};
},
mount:function(area,p,api){
var tk=p.tk,sp=kStep(api),hist=[],sel=null;
api.q('<span class="cm-medq">Tap the operation that comes <b>first</b>.</span>');
function render(){
area.innerHTML='<div class="cm-expr">'+tkHTML(tk,!sel)+'</div><div data-r="mini"></div><ol class="cm-ohist">'+hist.map(function(h){return '<li>'+h+'</li>';}).join('')+'</ol>';
area.querySelectorAll('.cm-opb').forEach(function(b){b.onclick=function(){pickOp(+b.getAttribute('data-i'),b);};});
if(sel!=null){var i=sel,a=tk[i-1].v,o=tk[i].v,b2=tk[i+1].v;q(area,'mini').innerHTML='<div class="cm-row cm-center"><label class="cm-anslbl">'+(o==='^'?a+'<sup>'+b2+'</sup>':a+' '+o+' '+b2)+' = '+kIn('in',90)+'</label><button class="cm-bigbtn" data-r="ck">Check</button></div>';
var inp=q(area,'in');inp.focus();inp.addEventListener('keydown',function(e){if(e.key==='Enter')calc();});q(area,'ck').onclick=calc;}
}
function pickOp(i,btn){
var right=nextOpIdx(tk);
if(i===right){sel=i;sp.reset();api.good();api.say('Yes! Now '+opWord(tk[i].v)+'.');render();return;}
var r=tk[right].v,w=tk[i].v,inPar=false,j;for(j=right;j>=0;j--){if(tk[j].t==='('){inPar=true;break;}if(tk[j].t===')')break;}
var msg=inPar&&!(function(){for(var k=i;k>=0;k--){if(tk[k].t==='(')return true;if(tk[k].t===')')return false;}return false;})()?'Not yet! <b>Parentheses</b> come first — do what’s inside ( ) before anything else.':r==='^'?'Not yet! <b>Exponents</b> come before × ÷ + −.':(['×','÷'].indexOf(r)>-1&&['+','−'].indexOf(w)>-1)?'Not yet! <b>Multiply and divide</b> before you add and subtract.':'Same level — work from <b>left to right</b>. There’s one further left to do first.';
var t=sp.miss();btn.classList.add('no');api.say(msg,'no');
if(t>=3){setTimeout(function(){var rb=area.querySelector('.cm-opb[data-i="'+right+'"]');if(rb)rb.classList.add('glow');},50);}
}
function calc(){
var i=sel,a=tk[i-1].v,o=tk[i].v,b=tk[i+1].v,e=applyOp(a,o,b),v=kNum(q(area,'in').value);
if(v===e||sp.miss()>=2){
if(v!==e)api.say((o==='^'?a+'<sup>'+b+'</sup> means '+seq(b).map(function(){return a;}).join(' × '):a+' '+o+' '+b)+' = <b>'+e+'</b>.','no');else api.good();
hist.push((o==='^'?a+'<sup>'+b+'</sup>':a+' '+o+' '+b)+' = '+e);tk=reduceAt(tk,i);sel=null;sp.reset();
if(tk.length===1){render();api.solved('🎯 The answer is <b>'+p.ans+'</b>!');return;}
render();if(v===e)api.say('Great! What comes next?');
}else api.say('Check your math: '+(o==='^'?a+'<sup>'+b+'</sup>':a+' '+o+' '+b)+' = ?','no');
}
api.say('Remember the order: <b>( )</b> → <b>exponents</b> → <b>× ÷</b> (left to right) → <b>+ −</b> (left to right).');
render();
},
learn:function(p){var t=p.tk,steps=[];while(t.length>1){var i=nextOpIdx(t),a=t[i-1].v,o=t[i].v,b=t[i+1].v,e=applyOp(a,o,b);steps.push((o==='^'?a+'<sup>'+b+'</sup>':a+' '+o+' '+b)+' = '+e+' → '+tkHTML(reduceAt(t,i),false));t=reduceAt(t,i);}
return [{t:'When a problem has lots of operations, everyone agrees on the same order so we all get the same answer:',v:'<div class="cm-eq2">1. ( ) Parentheses<br>2. Exponents<br>3. × ÷ from left to right<br>4. + − from left to right</div>'},
{t:'A silly way to remember it: <b>P</b>lease <b>E</b>xcuse <b>M</b>y <b>D</b>ear <b>A</b>unt <b>S</b>ally.'},
{t:'Here’s this problem, one layer at a time:',v:'<div class="cm-eq2">'+tkHTML(p.tk,false)+'<br>'+steps.join('<br>')+'</div>'},
{t:'Final answer: <b>'+p.ans+'</b> 🎉'}];}
};

/* ---------- Jungle Word Trek: multi-step word problems (grades 2–6) ---------- */
var KNAMES=['Mochi','Coco','Kiki','Bongo','Lulu','Zuri','Pip','Mango'];
function money(n){return '$'+(Math.round(n*100)/100).toFixed(2);}
var WORD={
2:[function(N){var a=rnd(15,45),b=rnd(12,40),c=rnd(10,a+b-5);return {story:N+' picked '+a+' bananas in the morning and '+b+' bananas in the afternoon. Then '+N+' gave '+c+' bananas to friends. How many bananas does '+N+' have now?',plan:['How many bananas '+N+' picked in all','How many friends '+N+' has','How many bananas the friends ate'],steps:[{q:'How many bananas did '+N+' pick in all?',a:a+b,hint:'Add the morning and afternoon bananas: '+a+' + '+b+'.'},{q:'How many are left after giving away '+c+'?',a:a+b-c,hint:'Subtract: '+(a+b)+' − '+c+'.'}],ans:a+b-c,unit:'bananas'};},
function(N){var k=rnd(3,5),e=rnd(2,5),c=rnd(2,6);return {story:N+' has '+k+' baskets. Each basket has '+e+' mangoes. '+N+' eats '+c+' mangoes. How many mangoes are left?',plan:['How many mangoes are in all the baskets','How many baskets are empty','How many mangoes '+N+' wants'],steps:[{q:'How many mangoes are in all '+k+' baskets?',a:k*e,hint:'Add '+e+' again and again, '+k+' times: '+seq(k).map(function(){return e;}).join(' + ')+'.'},{q:'How many are left after eating '+c+'?',a:k*e-c,hint:'Subtract: '+(k*e)+' − '+c+'.'}],ans:k*e-c,unit:'mangoes'};},
function(N){var have=rnd(60,95),a=rnd(15,35),b=rnd(10,have-a-5);return {story:N+' has '+have+'¢. '+N+' buys a banana for '+a+'¢ and an apple for '+b+'¢. How much money is left?',plan:['How much the banana and apple cost together','How much money '+N+' started with','How many apples '+N+' bought'],steps:[{q:'How much do the banana and apple cost together (in ¢)?',a:a+b,hint:'Add: '+a+' + '+b+'.'},{q:'How much money is left (in ¢)?',a:have-a-b,hint:'Subtract: '+have+' − '+(a+b)+'.'}],ans:have-a-b,unit:'¢'};}],
3:[function(N){var t=rnd(3,9),e=rnd(4,9),x=rnd(5,t*e-5);return {story:'There are '+t+' coconut trees. Each tree has '+e+' coconuts. The monkeys eat '+x+' coconuts. How many coconuts are left?',plan:['How many coconuts there are in all','How many monkeys there are','How many trees are left'],steps:[{q:'How many coconuts are on all '+t+' trees?',a:t*e,hint:t+' groups of '+e+': multiply '+t+' × '+e+'.'},{q:'How many are left after the monkeys eat '+x+'?',a:t*e-x,hint:'Subtract: '+(t*e)+' − '+x+'.'}],ans:t*e-x,unit:'coconuts'};},
function(N){var f=rnd(3,6),k=rnd(5,9),e=rnd(1,3);return {story:N+' has '+(f*k)+' bananas to share equally with '+f+' friends. Each friend eats '+e+' of their bananas right away. How many bananas does each friend have left?',plan:['How many bananas each friend gets','How many friends are hungry','How many bananas '+N+' eats'],steps:[{q:'How many bananas does each friend get?',a:k,hint:'Share equally means divide: '+(f*k)+' ÷ '+f+'.'},{q:'How many does each friend have after eating '+e+'?',a:k-e,hint:'Subtract: '+k+' − '+e+'.'}],ans:k-e,unit:'bananas'};},
function(N){var a=rnd(120,480),b=rnd(100,350),c=rnd(80,a+b-50);return {story:'The jungle library has '+a+' books. It gets '+b+' new books. Then '+c+' books are borrowed. How many books are still on the shelves?',plan:['How many books there are after the new ones arrive','How many shelves there are','How many readers there are'],steps:[{q:'How many books after the new ones arrive?',a:a+b,hint:'Add: '+a+' + '+b+'.'},{q:'How many are left after '+c+' are borrowed?',a:a+b-c,hint:'Subtract: '+(a+b)+' − '+c+'.'}],ans:a+b-c,unit:'books'};}],
4:[function(N){var s=rnd(110,240),d=rnd(3,7),w=rnd(20,90);return {story:'A banana stand sells '+s+' bananas each day for '+d+' days. Then '+w+' bananas are returned because they were too squishy. How many bananas were sold in the end?',plan:['How many bananas were sold over all '+d+' days','How many days the stand was open','How many bananas were squishy'],steps:[{q:'How many bananas were sold in '+d+' days?',a:s*d,hint:'Multiply: '+s+' × '+d+'.'},{q:'How many after '+w+' are returned?',a:s*d-w,hint:'Subtract: '+(s*d)+' − '+w+'.'}],ans:s*d-w,unit:'bananas'};},
function(N){var k=rnd(12,24),c=rnd(4,9),p=rnd(6,12);return {story:N+' packs '+(k*c)+' bananas into crates that hold '+k+' bananas each. Each full crate sells for $'+p+'. How much money will '+N+' make?',plan:['How many crates '+N+' can fill','How much one banana costs','How many bananas are left over'],steps:[{q:'How many crates can '+N+' fill?',a:c,hint:'Divide: '+(k*c)+' ÷ '+k+'.'},{q:'How many dollars for all the crates?',a:c*p,hint:'Multiply: '+c+' × $'+p+'.'}],ans:c*p,unit:'dollars'};},
function(N){var a=rnd(45,180),m=rnd(3,5),N2=pick(KNAMES.filter(function(x){return x!==N;}));return {story:N+'’s vine is '+a+' cm long. '+N2+'’s vine is '+m+' times as long. How much longer is '+N2+'’s vine than '+N+'’s?',plan:['How long '+N2+'’s vine is','How many vines there are','How tall '+N+' is'],steps:[{q:'How long is '+N2+'’s vine (in cm)?',a:a*m,hint:'"'+m+' times as long" means multiply: '+a+' × '+m+'.'},{q:'How much longer is it (in cm)?',a:a*m-a,hint:'Subtract to compare: '+(a*m)+' − '+a+'.'}],ans:a*m-a,unit:'cm'};}],
5:[function(N){var pr=rnd(5,19)*0.25,qn=rnd(3,6),pay=pr*qn<=20?20:50;return {story:'Mango smoothies cost '+money(pr)+' each. '+N+' buys '+qn+' smoothies and pays with a $'+pay+' bill. How much change does '+N+' get?',plan:['How much all the smoothies cost','How many smoothies '+N+' drinks','How big the cups are'],steps:[{q:'How much do '+qn+' smoothies cost (in dollars)?',a:pr*qn,hint:'Multiply: '+money(pr)+' × '+qn+'.'},{q:'How much change from $'+pay+'?',a:pay-pr*qn,hint:'Subtract: $'+pay+' − '+money(pr*qn)+'.'}],ans:pay-pr*qn,unit:'dollars',money:true};},
function(N){var l=rnd(3,8),w=rnd(2,6),h=rnd(2,5);return {story:N+' fills a box with 1-inch banana cubes. The box is '+l+' inches long, '+w+' inches wide and '+h+' inches tall. How many cubes fit inside?',plan:['How many cubes fit on the bottom layer','How heavy the box is','How many sides the box has'],steps:[{q:'How many cubes cover the bottom layer?',a:l*w,hint:'Length × width: '+l+' × '+w+'.'},{q:'How many cubes in all '+h+' layers?',a:l*w*h,hint:'Multiply by the height: '+(l*w)+' × '+h+'.'}],ans:l*w*h,unit:'cubes'};},
function(N){var dd=pick([3,4,5]),t=dd*rnd(6,15);return {story:N+' had '+t+' bananas and gave away 1/'+dd+' of them. How many bananas does '+N+' have left?',plan:['How many bananas 1/'+dd+' is','How many friends '+N+' has','How many bananas '+N+' ate'],steps:[{q:'How many bananas is 1/'+dd+' of '+t+'?',a:t/dd,hint:'1/'+dd+' of something means divide by '+dd+': '+t+' ÷ '+dd+'.'},{q:'How many are left?',a:t-t/dd,hint:'Subtract: '+t+' − '+(t/dd)+'.'}],ans:t-t/dd,unit:'bananas'};}],
6:[function(N){var r1=rnd(1,5),r2=rnd(2,7),k=rnd(3,9);if(r1===r2)r2++;return {story:'In the jungle, the ratio of red parrots to green parrots is '+r1+' : '+r2+'. There are '+((r1+r2)*k)+' parrots in all. How many red parrots are there?',plan:['How many parts the ratio has in all','How many trees there are','How many parrots are flying'],steps:[{q:'How many parts are in the ratio in all?',a:r1+r2,hint:'Add the ratio parts: '+r1+' + '+r2+'.'},{q:'How many parrots are in one part?',a:k,hint:'Divide: '+((r1+r2)*k)+' ÷ '+(r1+r2)+'.'},{q:'How many red parrots?',a:r1*k,hint:'Red is '+r1+' parts: '+r1+' × '+k+'.'}],ans:r1*k,unit:'red parrots'};},
function(N){var pc=pick([10,20,25,50]),pr=pc===25?pick([24,36,40,60,80]):pick([20,30,40,50,60,80]);return {story:'A jungle explorer hat costs $'+pr+'. It’s on sale for '+pc+'% off. What is the sale price?',plan:['How many dollars the discount is','How many hats are left','What color the hat is'],steps:[{q:'How many dollars is '+pc+'% of $'+pr+'?',a:pr*pc/100,hint:pc+'% = '+pc+'/100. Multiply: '+pr+' × '+(pc/100)+'.'},{q:'What is the sale price (in dollars)?',a:pr-pr*pc/100,hint:'Subtract the discount: '+pr+' − '+(pr*pc/100)+'.'}],ans:pr-pr*pc/100,unit:'dollars',money:true};},
function(N){var r=rnd(12,30),t1=rnd(3,6),t2=rnd(7,12);return {story:N+' swings through the trees and travels '+(r*t1)+' meters in '+t1+' seconds. At the same speed, how far will '+N+' go in '+t2+' seconds?',plan:['How far '+N+' goes in 1 second (the unit rate)','How tall the trees are','How tired '+N+' gets'],steps:[{q:'How many meters in 1 second?',a:r,hint:'Unit rate: divide '+(r*t1)+' ÷ '+t1+'.'},{q:'How many meters in '+t2+' seconds?',a:r*t2,hint:'Multiply: '+r+' × '+t2+'.'}],ans:r*t2,unit:'meters'};}]
};
function scratchPad(host){
host.innerHTML='<div class="cm-scratch"><div class="cm-scrh"><b>✏️ Scratch paper</b><div class="cm-scrbtns"><button data-m="pen" class="on">✏️ Pencil</button><button data-m="erase">🧽 Eraser</button><button data-m="clear">🗑️ Clear</button></div></div><canvas aria-label="Scratch paper — draw with your finger or mouse"></canvas><small>Work out the math here with your finger or mouse.</small></div>';
var cv=host.querySelector('canvas'),dpr=Math.min(window.devicePixelRatio||1,2),W=Math.max(260,cv.parentNode.clientWidth-4),H=300,g,mode='pen',down=false,last=null;
cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';g=cv.getContext('2d');g.scale(dpr,dpr);g.lineCap='round';g.lineJoin='round';
function pt(e){var r=cv.getBoundingClientRect();return [(e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height)];}
function style(){if(mode==='erase'){g.globalCompositeOperation='destination-out';g.lineWidth=26;}else{g.globalCompositeOperation='source-over';g.strokeStyle='#2b2350';g.fillStyle='#2b2350';g.lineWidth=3.5;}}
cv.addEventListener('pointerdown',function(e){down=true;last=pt(e);try{cv.setPointerCapture(e.pointerId);}catch(x){}e.preventDefault();style();g.beginPath();g.arc(last[0],last[1],g.lineWidth/2,0,7);g.fill();});
cv.addEventListener('pointermove',function(e){if(!down)return;var p=pt(e);style();g.beginPath();g.moveTo(last[0],last[1]);g.lineTo(p[0],p[1]);g.stroke();last=p;});
cv.addEventListener('pointerup',function(){down=false;});cv.addEventListener('pointercancel',function(){down=false;});
host.querySelector('.cm-scrbtns').onclick=function(e){var b=e.target.closest('button');if(!b)return;var m=b.getAttribute('data-m');if(m==='clear'){g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,cv.width,cv.height);g.restore();return;}mode=m;host.querySelectorAll('.cm-scrbtns button').forEach(function(x){x.classList.toggle('on',x===b);});};
}
THINK.word={name:'Jungle Word Trek',icon:'🗺️',c:'#d1f5c0',grades:[2,3,4,5,6],
d:{2:'Story problems with two steps: plan it, then solve it.',3:'Two-step story problems with groups and sharing.',4:'Multi-digit story problems — plan, solve, check.',5:'Story problems with money, volume and fractions.',6:'Ratios, percents and rates in jungle stories.'},
gen:function(g){var p=pick(WORD[g])(pick(KNAMES));p.planOpts=p.plan;return p;},
mount:function(area,p,api){
var k=-1,sp=kStep(api),notes=[],opts=shuffle(p.plan.map(function(t,i){return {t:t,ok:i===0};}));
area.innerHTML='<div class="cm-wgrid"><div data-r="wt"></div><div data-r="scr"></div></div>';var wt=q(area,'wt');scratchPad(q(area,'scr'));
api.q('<div class="cm-story"><span class="cm-storyic">📜</span><p>'+p.story+'</p></div>');
function fmt(v){return p.money?money(v):num(v);}
function render(){
var h='<ol class="cm-notes">'+notes.map(function(n){return '<li>'+n+'</li>';}).join('')+'</ol>';
if(k===-1)h+='<div class="cm-plan"><p><b>🧭 Plan it:</b> What should you figure out <b>first</b>?</p><div class="cm-pchoices v" data-r="pl">'+opts.map(function(o,i){return '<button data-i="'+i+'">'+o.t+'</button>';}).join('')+'</div></div>';
else if(k<p.steps.length){var st=p.steps[k];h+='<div class="cm-wstep"><p><b>Step '+(k+1)+':</b> '+st.q+'</p><div class="cm-row cm-center">'+(p.money?'<b class="cm-medq">$</b>':'')+kIn('in',120)+'<button class="cm-bigbtn" data-r="ck">Check</button></div></div>';}
wt.innerHTML=h;
var pl=q(area,'pl');if(pl)pl.onclick=function(e){var b=e.target.closest('button');if(!b||b.disabled)return;var o=opts[+b.getAttribute('data-i')];
if(o.ok){notes.push('Plan: first find '+o.t.charAt(0).toLowerCase()+o.t.slice(1)+'.');k=0;sp.reset();api.good();api.say('Good plan! Now solve it step by step.');render();}
else{b.disabled=true;b.classList.add('no');var t=sp.miss();api.say('Hmm — does the story need that to answer the question? Look at what you <b>know</b> and what you need <b>next</b>.','no');}};
var inp=q(area,'in');if(inp){inp.focus();inp.addEventListener('keydown',function(e){if(e.key==='Enter')check();});q(area,'ck').onclick=check;}
}
function check(){
var st=p.steps[k],v=kNum(q(area,'in').value);
if(same(v,st.a)){notes.push(st.q+' <b>'+fmt(st.a)+'</b>');next(true);return;}
var t=sp.miss();
if(t>=2){notes.push(st.q+' <b>'+fmt(st.a)+'</b> <small>('+st.hint+')</small>');api.say('Here’s how: '+st.hint+' = <b>'+fmt(st.a)+'</b>.','no');next(false);}
else api.say('<b>Hint:</b> '+st.hint,'no');
}
function next(good){k++;sp.reset();if(good)api.good();if(k>=p.steps.length){render();api.solved('🎯 Answer: <b>'+fmt(p.ans)+' '+(p.money?'':p.unit)+'</b>. Does that make sense? Always check!');}else render();}
api.say('Read the story carefully. What do you know? What do you need to find?');
render();
},
learn:function(p){var fmt=function(v){return p.money?money(v):num(v);};
return [{t:'Big story problems are easier with a plan. Use <b>R.A.P.S.</b>: <b>R</b>ead, <b>A</b>sk, <b>P</b>lan, <b>S</b>olve (then check!).'},
{t:'<b>Read</b> the whole story. <b>Ask:</b> what is the question really asking for?'},
{t:'<b>Plan:</b> what do you need to know first? Here: '+p.plan[0].charAt(0).toLowerCase()+p.plan[0].slice(1)+'.'},
{t:'<b>Solve</b> one step at a time:',v:'<div class="cm-eq2">'+p.steps.map(function(s,i){return (i+1)+'. '+s.hint+' → '+fmt(s.a);}).join('<br>')+'</div>'},
{t:'<b>Check:</b> does <b>'+fmt(p.ans)+'</b> make sense in the story? 🎉'}];}
};

var THINK_BY_GRADE={1:['hop','tens'],2:['tens','column','word'],3:['column','area','fraction','word'],4:['column','area','divide','fraction','word'],5:['column','area','divide','fraction','order','word'],6:['hop','divide','order','word']};
function gThink(box,id){
var G=THINK[id],g=G.grades.indexOf(+S.grade)>-1?+S.grade:G.grades[0],R=5,round=0,earned=0,p,mist=0;
box.innerHTML='<div class="cm-ghead"><h2 class="cm-gtitle">'+G.icon+' '+G.name+'</h2><div class="cm-gstats" data-r="stats"></div></div>'+
'<div class="cm-trail" data-r="trail"></div><div class="cm-tq" data-r="tq"></div><div class="cm-twork" data-r="area"></div><p class="cm-say" data-r="say"></p>'+
'<div class="cm-row cm-tbtns"><button class="cm-coachbtn" data-r="coach">🐒 How do I do this?</button><button class="cm-bigbtn hide" data-r="next">Next problem ▶</button></div><div class="cm-overlay hide" data-r="ov"></div>';
var ov=q(box,'ov');
function hud(){q(box,'stats').innerHTML=chip('🧭 Problem '+Math.min(round+1,R)+' of '+R)+chip('🍌 +'+earned)+(mist?chip('✏️ '+mist+' oops'):'');}
function trail(){q(box,'trail').innerHTML=seq(R).map(function(i){return '<span class="'+(i<round?'done':i===round?'now':'')+'">'+(i<round?'🍌':i===round?'<img src="'+monkeyURI(S.look)+'" alt="">':'')+'</span>';}).join('<i></i>');}
var api={
say:function(t,k){var el=q(box,'say');el.className='cm-say'+(k?' '+k:'');el.innerHTML=t||'';},
q:function(h){q(box,'tq').innerHTML=h;},
miss:function(){mist++;sfxBad();hud();return mist;},
good:function(){sfxGood();},
solved:function(msg){
var b=2+(mist===0?1:0);earned+=b;addBananas(b);sfxWin();
api.say((msg?msg+' ':'')+'<b>+'+b+' 🍌</b>'+(mist===0?' Perfect — no mistakes!':''),'ok');round++;hud();trail();
var nx=q(box,'next');nx.classList.remove('hide');nx.textContent=round>=R?'Finish 🏁':'Next problem ▶';
if(mist>=3)setTimeout(function(){showOv2(ov,'<div class="cm-ovemoji">🤔</div><h3>That one was tricky!</h3><p>Want Coach Monkey to show you how problems like this work, step by step?</p>',[['🐒 Show me how!',coach],['I’m OK',function(){},'alt']]);},900);
}
};
function load(){mist=0;p=G.gen(g);q(box,'next').classList.add('hide');api.say('');q(box,'area').innerHTML='';hud();trail();G.mount(q(box,'area'),p,api,g);}
function coach(){runCoach(ov,'How to: '+G.name,G.learn(p,g),{done:'Got it! ✓'});}
function finish(){confetti(box);showOv2(ov,yayMochi()+'<h3>Expedition complete!</h3><p>You solved '+R+' problems and earned <b>'+earned+' bananas</b>! 🍌</p>',[nextBtn(),['Play again',function(){round=0;earned=0;load();},'alt']]);}
q(box,'coach').onclick=coach;
q(box,'next').onclick=function(){if(round>=R)finish();else load();};
load();
}

/* ================= STEP-BY-STEP SOLVERS ================= */
function solveLinear(a,b,c,d){
var st=[],A=r2(a-c),B=r2(d-b),ans;
st.push({s:'Start with the equation.',m:poly([[a,'x'],[b,'']])+' = '+poly([[c,'x'],[d,'']])});
if(c!==0)st.push({s:(c>0?'Subtract '+poly([[c,'x']]):'Add '+poly([[-c,'x']]))+' on both sides to get all the x-terms on the left.',m:poly([[A,'x'],[b,'']])+' = '+num(d)});
if(b!==0)st.push({s:(b>0?'Subtract '+num(b):'Add '+num(-b))+' on both sides to move the constant to the right.',m:poly([[A,'x']])+' = '+num(B)});
if(A===0){var all=B===0;st.push({s:all?'The x-terms cancel and both sides match, so every x works.':'The x-terms cancel but 0 ≠ '+num(B)+', so no x works.',m:'0 = '+num(B)});return {steps:st,ans:all?'Infinitely many solutions':'No solution'};}
if(A!==1)st.push({s:'Divide both sides by '+num(A)+' to get x by itself.',m:'x = '+num(B)+' ÷ '+par(A)});
ans='x = '+frac(B,A);
if(!isInt(B/A)||A!==1)st.push({s:'Simplify.',m:ans+(isInt(B/A)?'':'  ≈ '+num(r2(B/A)))});
var xv=B/A;st.push({s:'Check: put x back into the original equation. Both sides should match.',m:'Left side = '+num(r2(a*xv+b))+',  Right side = '+num(r2(c*xv+d))+'  ✓'});
return {steps:st,ans:ans};
}
function solveQuad(a,b,c){
if(a===0){var r=solveLinear(b,c,0,0);r.steps.unshift({s:'Since a = 0 this is not a quadratic — it is a linear equation.',m:poly([[b,'x'],[c,'']])+' = 0'});return r;}
var st=[],ans,D=r2(b*b-4*a*c);
st.push({s:'Make sure the equation is in standard form ax² + bx + c = 0, then identify a, b and c.',m:poly([[a,'x²'],[b,'x'],[c,'']])+' = 0<br>a = '+num(a)+',  b = '+num(b)+',  c = '+num(c)});
st.push({s:'Find the discriminant D = b² − 4ac.',m:'D = '+par(b)+'² − 4·'+par(a)+'·'+par(c)+' = '+num(r2(b*b))+' − '+par(r2(4*a*c))+' = '+num(D)});
st.push({s:D>0?'D > 0, so there are two real solutions.':D===0?'D = 0, so there is exactly one real solution (a double root).':'D < 0, so there are no real solutions — the two solutions are complex numbers.',m:''});
st.push({s:'Plug into the quadratic formula.',m:'x = (−b ± √D) / 2a = ('+num(-b)+' ± √'+par(D)+') / '+num(2*a)});
if([a,b,c].every(isInt)){
var sq=Math.round(Math.sqrt(Math.abs(D)));
if(D>=0&&sq*sq===D){
var x1=frac(-b+sq,2*a),x2=frac(-b-sq,2*a);
if(D===0){st.push({s:'√0 = 0, so both signs give the same answer.',m:'x = '+num(-b)+' / '+num(2*a)+' = '+x1});ans='x = '+x1;}
else{st.push({s:'√'+num(D)+' = '+sq+'. Split the ± into two separate answers.',m:'x = ('+num(-b)+' + '+sq+') / '+num(2*a)+' = '+x1+'<br>x = ('+num(-b)+' − '+sq+') / '+num(2*a)+' = '+x2});ans='x = '+x1+'  or  x = '+x2;}
}else{
var s=simpSqrt(Math.abs(D)),k=s[0],m=s[1];
if(k>1||D<0)st.push({s:'Simplify the square root'+(D<0?' (the square root of a negative number uses i = √−1)':' by pulling out perfect squares')+'.',m:'√'+par(D)+' = '+(k>1?k:'')+(D<0?'i':'')+(m===1?'':'√'+m)});
var p=-b,qq=k,rr_=2*a,g=gcd(gcd(p,qq),rr_);p/=g;qq/=g;rr_/=g;if(rr_<0){p=-p;rr_=-rr_;}
var rad=(qq===1?'':qq)+(D<0?'i':'')+(m===1?'':'√'+m);if(rad==='')rad='1';
var top=p===0?'±'+rad:num(p)+' ± '+rad,exact=rr_===1?'x = '+top:'x = ('+top+') / '+rr_;
st.push({s:g>1?'Divide every term by the common factor '+g+'.':'Write the exact answer.',m:exact});
if(D>0){var d1=r2((-b+Math.sqrt(D))/(2*a)),d2=r2((-b-Math.sqrt(D))/(2*a));st.push({s:'Use a calculator for decimal approximations.',m:'x ≈ '+num(d1)+'  or  x ≈ '+num(d2)});ans=exact+'  (≈ '+num(d1)+', '+num(d2)+')';}
else ans=exact;
}
}else{
if(D>=0){var e1=r2((-b+Math.sqrt(D))/(2*a)),e2=r2((-b-Math.sqrt(D))/(2*a));st.push({s:'Calculate both answers.',m:'x ≈ '+num(e1)+'  or  x ≈ '+num(e2)});ans='x ≈ '+num(e1)+'  or  x ≈ '+num(e2);}
else{var re=r2(-b/(2*a)),im=r2(Math.sqrt(-D)/Math.abs(2*a));st.push({s:'Calculate the complex answers.',m:'x ≈ '+num(re)+' ± '+num(im)+'i'});ans='x ≈ '+num(re)+' ± '+num(im)+'i';}
}
return {steps:st,ans:ans};
}
function solveSystem(a1,b1,c1,a2,b2,c2){
var st=[],D=a1*b2-a2*b1,Nx=c1*b2-c2*b1,Ny=a1*c2-a2*c1;
st.push({s:'Write both equations and number them.',m:'(1)  '+poly([[a1,'x'],[b1,'y']])+' = '+num(c1)+'<br>(2)  '+poly([[a2,'x'],[b2,'y']])+' = '+num(c2)});
if(b1===0||b2===0){st.push({s:'One equation has no y-term, so it can be solved for x right away. Then substitute to find y.',m:''});}
else{
st.push({s:'Elimination: multiply (1) by '+num(b2)+' and (2) by '+num(b1)+' so both y-terms become '+poly([[b1*b2,'y']])+'.',m:poly([[a1*b2,'x'],[b1*b2,'y']])+' = '+num(c1*b2)+'<br>'+poly([[a2*b1,'x'],[b1*b2,'y']])+' = '+num(c2*b1)});
st.push({s:'Subtract the second new equation from the first. The y-terms cancel out.',m:poly([[D,'x']])+' = '+num(Nx)});
}
if(D===0){var inf=(Nx===0&&Ny===0);st.push({s:inf?'Everything cancels to 0 = 0. Both equations are the same line.':'We get 0 = a non-zero number. The lines are parallel and never cross.',m:''});return {steps:st,ans:inf?'Infinitely many solutions':'No solution'};}
var xs=frac(Nx,D),ys=frac(Ny,D);
st.push({s:'Solve for x.',m:'x = '+num(Nx)+' ÷ '+par(D)+' = '+xs});
var useE=b1!==0?1:2,ea=useE===1?a1:a2,eb=useE===1?b1:b2,ec=useE===1?c1:c2;
st.push({s:'Substitute x = '+xs+' into equation ('+useE+') and solve for y.',m:poly([[eb,'y']])+' = '+num(ec)+' − '+par(ea)+'·('+xs+')  →  y = '+ys});
st.push({s:'Check the answer in both equations.',m:'(1): '+num(r2(a1*Nx/D+b1*Ny/D))+' = '+num(c1)+' ✓<br>(2): '+num(r2(a2*Nx/D+b2*Ny/D))+' = '+num(c2)+' ✓'});
return {steps:st,ans:'x = '+xs+',  y = '+ys};
}
function lineEq(dy,dx,bn,bd){
var m=frac(dy,dx),mp=dy===0?'':m==='1'?'x':m==='−1'?'−x':(m.indexOf('/')>-1?'('+m+')x':m+'x');
var bv=bn/bd,bp=bv===0?'':((mp?(bv<0?' − ':' + '):(bv<0?'−':''))+frac(Math.abs(bn),Math.abs(bd)));
return 'y = '+(mp+bp||'0');
}
function solveLine(x1,y1,x2,y2){
var st=[],dx=x2-x1,dy=y2-y1;
st.push({s:'Label the two points.',m:'(x₁, y₁) = ('+num(x1)+', '+num(y1)+'),   (x₂, y₂) = ('+num(x2)+', '+num(y2)+')'});
st.push({s:'Find the slope: rise over run.',m:'m = (y₂ − y₁) / (x₂ − x₁) = ('+num(y2)+' − '+par(y1)+') / ('+num(x2)+' − '+par(x1)+') = '+num(dy)+' / '+num(dx)});
if(dx===0){st.push({s:'The run is 0, so the slope is undefined. This is a vertical line.',m:'x = '+num(x1)});return {steps:st,ans:'x = '+num(x1)+'  (vertical line)'};}
var ms=frac(dy,dx),bn=y1*dx-dy*x1,bs=frac(bn,dx);
st.push({s:'Simplify the slope.',m:'m = '+ms});
st.push({s:'Find the y-intercept b: plug point 1 into y = mx + b.',m:num(y1)+' = ('+ms+')('+num(x1)+') + b   →   b = '+bs});
var eq=lineEq(dy,dx,bn,dx);
st.push({s:'Write the equation in slope-intercept form.',m:eq});
st.push({s:'Bonus: the distance between the points and the midpoint.',m:'distance = √('+par(dx)+'² + '+par(dy)+'²) = '+rootStr(dx*dx+dy*dy)+(isInt(Math.sqrt(dx*dx+dy*dy))?'':' ≈ '+num(r2(Math.sqrt(dx*dx+dy*dy))))+'<br>midpoint = ('+num((x1+x2)/2)+', '+num((y1+y2)/2)+')'});
return {steps:st,ans:eq};
}
function solveTri(a,b,c){
var st=[{s:'In a right triangle, legs a and b and the hypotenuse c (the longest side, across from the right angle) follow the Pythagorean theorem.',m:'a² + b² = c²'}],ans,val;
if(c==null){
var s2=r2(a*a+b*b);val=Math.sqrt(s2);
st.push({s:'Plug in the two legs.',m:num(a)+'² + '+num(b)+'² = c²'});
st.push({s:'Square and add.',m:num(r2(a*a))+' + '+num(r2(b*b))+' = '+num(s2)});
var rs=rootStr(s2);
st.push({s:'Take the square root of both sides.',m:'c = √'+num(s2)+(rs!=='√'+num(s2)?' = '+rs:'')+(isInt(val)?'':' ≈ '+num(r2(val)))});
ans='c = '+(isInt(val)?num(val):rs+' ≈ '+num(r2(val)));
}else{
var known=a!=null?a:b,name=a!=null?'b':'a';
if(c<=known)return {err:'The hypotenuse c must be longer than the leg.'};
var d2=r2(c*c-known*known);val=Math.sqrt(d2);
st.push({s:'Plug in what you know.',m:num(known)+'² + '+name+'² = '+num(c)+'²'});
st.push({s:'Subtract to get '+name+'² alone.',m:name+'² = '+num(r2(c*c))+' − '+num(r2(known*known))+' = '+num(d2)});
var rs2=rootStr(d2);
st.push({s:'Take the square root.',m:name+' = √'+num(d2)+(rs2!=='√'+num(d2)?' = '+rs2:'')+(isInt(val)?'':' ≈ '+num(r2(val)))});
ans=name+' = '+(isInt(val)?num(val):rs2+' ≈ '+num(r2(val)));
if(a==null)a=val;else b=val;
}
var A=r1(Math.atan(a/b)*180/Math.PI);
st.push({s:'Bonus: the two acute angles (using inverse tangent).',m:'angle opposite a = tan⁻¹(a/b) ≈ '+num(A)+'°,   other angle ≈ '+num(r1(90-A))+'°'});
return {steps:st,ans:ans};
}
function parsePoly(str){
var s=String(str).replace(/\s+/g,'').replace(/[−–]/g,'-').replace(/\*\*/g,'^').replace(/X/g,'x').replace(/f\(x\)=|y=/,'');
if(!s)return null;if(s[0]!=='-'&&s[0]!=='+')s='+'+s;
var parts=s.match(/[+-][^+-]+/g);if(!parts||parts.join('')!==s)return null;
var terms={};
for(var i=0;i<parts.length;i++){
var m=parts[i].match(/^([+-])(\d*\.?\d*)\*?(x(?:\^(\d+))?)?$/);if(!m)return null;
if(m[2]===''&&!m[3])return null;
var c=m[2]===''?1:parseFloat(m[2]);if(isNaN(c))return null;if(m[1]==='-')c=-c;
var n=m[3]?(m[4]?parseInt(m[4],10):1):0;terms[n]=(terms[n]||0)+c;
}
return Object.keys(terms).map(Number).sort(function(a,b){return b-a;}).map(function(n){return [r2(terms[n]),n];}).filter(function(t){return t[0]!==0;});
}
function solveDeriv(str,at){
var t=parsePoly(str);if(!t||!t.length)return {err:'I couldn’t read that polynomial. Try something like 3x^4 − 2x^2 + 5x − 7 (whole-number powers).'};
var st=[{s:'Write the function.',m:'f(x) = '+polyT(t)},{s:'Power rule: bring the power down in front, then lower the power by 1. Constants become 0.',m:'d/dx [ c·x<sup>n</sup> ] = n·c·x<sup>n−1</sup>'}],d=[],lines=[];
t.forEach(function(tt){var c=tt[0],n=tt[1];if(n===0){lines.push('d/dx ['+num(c)+'] = 0');}else{var nc=r2(c*n);lines.push('d/dx ['+polyT([tt])+'] = '+n+'·'+par(c)+(n-1>0?pow(n-1):'')+' = '+polyT([[nc,n-1]]));d.push([nc,n-1]);}});
st.push({s:'Differentiate each term.',m:lines.join('<br>')});
var ds=polyT(d);st.push({s:'Put the pieces together.',m:'f′(x) = '+ds});
if(at!=null&&!isNaN(at)){var v=d.reduce(function(s,tt){return s+tt[0]*Math.pow(at,tt[1]);},0);st.push({s:'Plug in x = '+num(at)+'. This is the slope of the tangent line at that point.',m:'f′('+num(at)+') = '+num(r2(v))});}
return {steps:st,ans:'f′(x) = '+ds};
}
function solveStats(str){
var arr=String(str).replace(/[−–]/g,'-').split(/[\s,;]+/).filter(Boolean).map(Number);
if(arr.length<2||arr.some(isNaN))return {err:'Enter at least two numbers separated by commas.'};
var n=arr.length,s=arr.slice().sort(function(a,b){return a-b;}),sum=arr.reduce(function(a,b){return a+b;},0),mean=sum/n,st=[];
st.push({s:'Put the numbers in order from least to greatest.',m:s.map(num).join(', ')+'   (n = '+n+')'});
st.push({s:'Mean: add them all up, then divide by how many there are.',m:'mean = '+num(r2(sum))+' ÷ '+n+' = '+num(r2(mean))});
var med=n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;
st.push({s:n%2?'Median: the middle number of the ordered list.':'Median: there are two middle numbers, so average them.',m:n%2?'median = '+num(med):'median = ('+num(s[n/2-1])+' + '+num(s[n/2])+') ÷ 2 = '+num(r2(med))});
var cnt={},mx=0;s.forEach(function(v){cnt[v]=(cnt[v]||0)+1;mx=Math.max(mx,cnt[v]);});
var modes=mx===1?[]:Object.keys(cnt).filter(function(k){return cnt[k]===mx;}).map(Number);
st.push({s:'Mode: the value(s) that appear most often.',m:modes.length?'mode = '+modes.map(num).join(', ')+'  (appears '+mx+' times)':'no mode — every value appears once'});
st.push({s:'Range: biggest minus smallest.',m:'range = '+num(s[n-1])+' − '+par(s[0])+' = '+num(r2(s[n-1]-s[0]))});
var ss=arr.reduce(function(a,v){return a+(v-mean)*(v-mean);},0),sd=Math.sqrt(ss/(n-1));
st.push({s:'Sample standard deviation: square each distance from the mean, add them, divide by n − 1, then take the square root.',m:'s = √('+num(r2(ss))+' ÷ '+(n-1)+') ≈ '+num(r2(sd))});
return {steps:st,ans:'mean ≈ '+num(r2(mean))+', median = '+num(r2(med))+', mode = '+(modes.length?modes.map(num).join(', '):'none')+', range = '+num(r2(s[n-1]-s[0]))};
}

/* ================= PRACTICE GENERATORS (endless problems with steps) ================= */
function fracTerm(cn,cd,pw){if(cd<0){cn=-cn;cd=-cd;}var g=gcd(cn,cd);cn/=g;cd/=g;var an=Math.abs(cn),v=pow(pw),co=cd===1?(an===1&&v?'':String(an)):an+'/'+cd;return {neg:cn<0,body:(cd!==1&&v)?'('+co+')'+v:co+v};}
function joinTerms(arr){var s='';arr.forEach(function(t,i){s+=i===0?(t.neg?'−':'')+t.body:(t.neg?' − ':' + ')+t.body;});return s||'0';}
var GEN={
int:function(){var a=rndNZ(-20,20),b=rndNZ(-20,20),op=pick(['+','−','×']),p=num(a)+' '+op+' '+par(b),st=[],ans;
if(op==='+'){ans=a+b;st.push({s:(a<0)===(b<0)?'Same signs: add the absolute values and keep the sign.':'Different signs: subtract the smaller absolute value from the larger one, and keep the sign of the larger.',m:'|'+num(a)+'| = '+Math.abs(a)+',   |'+num(b)+'| = '+Math.abs(b)});}
else if(op==='−'){ans=a-b;st.push({s:'Subtracting means adding the opposite.',m:num(a)+' + '+par(-b)});st.push({s:((a<0)===(-b<0))?'Same signs: add the absolute values and keep the sign.':'Different signs: subtract the absolute values and keep the sign of the larger one.',m:''});}
else{ans=a*b;st.push({s:'Multiply the absolute values.',m:Math.abs(a)+' × '+Math.abs(b)+' = '+Math.abs(a*b)});st.push({s:(a<0)===(b<0)?'Same signs → the answer is positive.':'Different signs → the answer is negative.',m:''});}
st.push({s:'Final answer:',m:p+' = '+num(ans)});return {p:'Simplify: '+p,steps:st,a:num(ans)};},
linear1:function(){var a=pick([2,3,4,5,6,7,8,9,-2,-3,-4,-5]),x=rnd(-10,10),b=rnd(-15,15),c=a*x+b,r=solveLinear(a,b,0,c);return {p:'Solve for x:  '+poly([[a,'x'],[b,'']])+' = '+num(c),steps:r.steps,a:r.ans};},
linear:function(){var a=rnd(2,9),c;do{c=rnd(-6,8);}while(c===a);var x=rnd(-9,9),b=rnd(-12,12),d=(a-c)*x+b,r=solveLinear(a,b,c,d);return {p:'Solve for x:  '+poly([[a,'x'],[b,'']])+' = '+poly([[c,'x'],[d,'']]),steps:r.steps,a:r.ans};},
percent:function(){var p=pick([5,10,15,20,25,30,40,60,75]),n=pick([20,40,60,80,120,160,200,240,300]),dec=p/100,part=r2(dec*n);
if(Math.random()<.5)return {p:'What is '+p+'% of '+n+'?',steps:[{s:'“Percent” means “out of 100.” Turn the percent into a decimal by dividing by 100.',m:p+'% = '+p+' ÷ 100 = '+num(dec)},{s:'Multiply the decimal by the number.',m:num(dec)+' × '+n+' = '+num(part)}],a:num(part)};
return {p:'A $'+n+' video game is '+p+'% off. What is the sale price?',steps:[{s:'Find the discount: '+p+'% of $'+n+'.',m:num(dec)+' × '+n+' = $'+num(part)},{s:'Subtract the discount from the original price.',m:'$'+n+' − $'+num(part)+' = $'+num(r2(n-part))},{s:'Shortcut check: you pay '+(100-p)+'% of the price.',m:num(r2(1-dec))+' × '+n+' = $'+num(r2(n-part))}],a:'$'+num(r2(n-part))};},
expo:function(){var a=rnd(2,9),b=rnd(2,7),t=rnd(0,2),v=pick(['x','y','a','n']);function P(e){return e===1?v:v+'<sup>'+e+'</sup>';}
if(t===0)return {p:'Simplify: '+P(a)+' · '+P(b),steps:[{s:'Same base, multiplying → ADD the exponents.',m:P(a)+' · '+P(b)+' = '+v+'<sup>'+a+' + '+b+'</sup>'},{s:'Add.',m:P(a+b)}],a:P(a+b)};
if(t===1){if(a<b){var tmp=a;a=b;b=tmp;}if(a===b)a++;return {p:'Simplify: '+P(a)+' ÷ '+P(b),steps:[{s:'Same base, dividing → SUBTRACT the exponents.',m:v+'<sup>'+a+' − '+b+'</sup>'},{s:'Subtract.',m:P(a-b)}],a:P(a-b)};}
b=rnd(2,4);return {p:'Simplify: ('+P(a)+')<sup>'+b+'</sup>',steps:[{s:'A power raised to a power → MULTIPLY the exponents.',m:v+'<sup>'+a+' · '+b+'</sup>'},{s:'Multiply.',m:P(a*b)}],a:P(a*b)};},
slope:function(){var x1=rnd(-8,8),y1=rnd(-8,8),x2,y2=rnd(-8,8);do{x2=rnd(-8,8);}while(x2===x1);var r=solveLine(x1,y1,x2,y2);return {p:'Find the equation of the line through ('+num(x1)+', '+num(y1)+') and ('+num(x2)+', '+num(y2)+').',steps:r.steps,a:r.ans};},
system:function(){var x=rnd(-6,6),y=rnd(-6,6),a1,b1,a2,b2;do{a1=rndNZ(-5,5);b1=rndNZ(-5,5);a2=rndNZ(-5,5);b2=rndNZ(-5,5);}while(a1*b2-a2*b1===0);var c1=a1*x+b1*y,c2=a2*x+b2*y,r=solveSystem(a1,b1,c1,a2,b2,c2);return {p:'Solve the system:<br>'+poly([[a1,'x'],[b1,'y']])+' = '+num(c1)+'<br>'+poly([[a2,'x'],[b2,'y']])+' = '+num(c2),steps:r.steps,a:r.ans};},
factor:function(){var p1=rndNZ(-9,9),p2=rndNZ(-9,9),b=-(p1+p2),c=p1*p2,m=-p1,n=-p2,eq=poly([[1,'x²'],[b,'x'],[c,'']]);function bin(k){return k>0?'(x + '+k+')':'(x − '+(-k)+')';}
return {p:'Factor: '+eq,steps:[{s:'Look for two numbers that MULTIPLY to c = '+num(c)+' and ADD to b = '+num(b)+'.',m:''},{s:'Those numbers are '+num(m)+' and '+num(n)+'.',m:num(m)+' × '+par(n)+' = '+num(c)+',     '+num(m)+' + '+par(n)+' = '+num(b)},{s:'Use them to write the two factors.',m:eq+' = '+bin(m)+bin(n)},{s:'Bonus: if the expression equals 0, set each factor to 0 to find the roots.',m:'x = '+num(p1)+'   or   x = '+num(p2)}],a:bin(m)+bin(n)};},
quad:function(){var a=pick([1,1,1,2,3,-1,-2]),b=rnd(-10,10),c=rnd(-12,12),r=solveQuad(a,b,c);return {p:'Solve with the quadratic formula: '+poly([[a,'x²'],[b,'x'],[c,'']])+' = 0',steps:r.steps,a:r.ans};},
pyth:function(){var tr=pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10]]),k=rnd(1,3),a=tr[0]*k,b=tr[1]*k,c=tr[2]*k,res;
if(Math.random()<.5){if(Math.random()<.4){a=rnd(2,12);b=rnd(2,12);}res=solveTri(a,b,null);return {p:'A right triangle has legs of '+a+' and '+b+'. Find the hypotenuse c.',steps:res.steps,a:res.ans};}
res=solveTri(a,null,c);return {p:'A right triangle has one leg of '+a+' and a hypotenuse of '+c+'. Find the other leg b.',steps:res.steps,a:res.ans};},
angles:function(){var A=rnd(25,85),B=rnd(20,175-A-15),C=180-A-B,mx=Math.max(A,B,C);return {p:'A triangle has angles of '+A+'° and '+B+'°. What is the third angle?',steps:[{s:'The three angles of every triangle add up to 180°.',m:'A + B + C = 180°'},{s:'Add the two angles you know.',m:A+'° + '+B+'° = '+(A+B)+'°'},{s:'Subtract from 180°.',m:'C = 180° − '+(A+B)+'° = '+C+'°'},{s:mx===90?'One angle is exactly 90°, so this is a right triangle!':mx>90?'One angle is bigger than 90°, so this is an obtuse triangle.':'All three angles are less than 90°, so this is an acute triangle.',m:''}],a:C+'°'};},
circle:function(){var r=rnd(2,15),useD=Math.random()<.4,st=[];if(useD)st.push({s:'The radius is half the diameter.',m:'r = '+(2*r)+' ÷ 2 = '+r+' cm'});
st.push({s:'Area: A = πr².',m:'A = π('+r+')² = '+(r*r)+'π ≈ '+num(r2(Math.PI*r*r))+' cm²'});st.push({s:'Circumference: C = 2πr.',m:'C = 2π('+r+') = '+(2*r)+'π ≈ '+num(r2(2*Math.PI*r))+' cm'});
return {p:'A circle has a '+(useD?'diameter of '+(2*r):'radius of '+r)+' cm. Find its area and circumference.',steps:st,a:'A = '+(r*r)+'π ≈ '+num(r2(Math.PI*r*r))+' cm²,   C = '+(2*r)+'π ≈ '+num(r2(2*Math.PI*r))+' cm'};},
vol:function(){var r=rnd(2,9),h=rnd(3,15),v=r*r*h;return {p:'A cylinder has a radius of '+r+' in and a height of '+h+' in. Find its volume.',steps:[{s:'Volume of a cylinder = (area of the circle base) × height.',m:'V = πr²h'},{s:'Plug in r and h.',m:'V = π('+r+')²('+h+')'},{s:'Multiply.',m:'V = π · '+(r*r)+' · '+h+' = '+v+'π'},{s:'Approximate using π ≈ 3.14159.',m:'V ≈ '+num(r2(Math.PI*v))+' in³'}],a:v+'π ≈ '+num(r2(Math.PI*v))+' in³'};},
log:function(){var b=pick([2,3,4,5,10]),k=rnd(2,b===10?4:5),N=Math.pow(b,k);return {p:'Solve for x:  '+b+'<sup>x</sup> = '+N,steps:[{s:'Rewrite the exponential equation as a logarithm.',m:'x = log<sub>'+b+'</sub>('+N+')'},{s:'Ask yourself: '+b+' to what power gives '+N+'?',m:Array(k).fill(b).join(' × ')+' = '+N},{s:'So the exponent is '+k+'.',m:'x = '+k},{s:'Check with the change-of-base formula on a calculator.',m:'log('+N+') ÷ log('+b+') = '+num(r2(Math.log(N)/Math.log(b)))}],a:'x = '+k};},
complex:function(){var a=rndNZ(-6,6),b=rndNZ(-6,6),c=rndNZ(-6,6),d=rndNZ(-6,6),re=a*c-b*d,im=a*d+b*c;function cx(x,y){return poly([[x,''],[y,'i']]);}
return {p:'Multiply: ('+cx(a,b)+')('+cx(c,d)+')',steps:[{s:'Use FOIL: First, Outer, Inner, Last.',m:par(a)+'·'+par(c)+' + '+par(a)+'·'+par(d)+'i + '+par(b)+'i·'+par(c)+' + '+par(b)+'i·'+par(d)+'i'},{s:'Multiply each pair.',m:num(a*c)+' + '+par(a*d)+'i + '+par(b*c)+'i + '+par(b*d)+'i²'},{s:'Replace i² with −1 and combine the i-terms.',m:num(a*c)+' + '+par(a*d+b*c)+'i + '+par(b*d)+'·(−1)'},{s:'Combine the real parts.',m:'('+num(a*c)+' − '+par(b*d)+') + '+par(im)+'i = '+cx(re,im)}],a:cx(re,im)};},
trig:function(){var t=rnd(0,2),th=rnd(20,70),R=Math.PI/180,sn=Math.round(Math.sin(th*R)*10000)/10000,cs=Math.round(Math.cos(th*R)*10000)/10000;
if(t===0){var h=rnd(8,30),o=r2(h*Math.sin(th*R));return {p:'In a right triangle, one angle is '+th+'° and the hypotenuse is '+h+'. Find the side opposite the angle.',steps:[{s:'You have the hypotenuse and want the opposite side → SOH: sin θ = opposite ÷ hypotenuse.',m:'sin '+th+'° = opp ÷ '+h},{s:'Multiply both sides by the hypotenuse.',m:'opp = '+h+' · sin '+th+'°'},{s:'Use a calculator (in degree mode!).',m:'opp = '+h+' · '+num(sn)+' ≈ '+num(o)}],a:'≈ '+num(o)};}
if(t===1){var h2=rnd(8,30),ad=r2(h2*Math.cos(th*R));return {p:'In a right triangle, one angle is '+th+'° and the hypotenuse is '+h2+'. Find the side adjacent to the angle.',steps:[{s:'You have the hypotenuse and want the adjacent side → CAH: cos θ = adjacent ÷ hypotenuse.',m:'cos '+th+'° = adj ÷ '+h2},{s:'Multiply both sides by the hypotenuse.',m:'adj = '+h2+' · cos '+th+'°'},{s:'Use a calculator (in degree mode!).',m:'adj = '+h2+' · '+num(cs)+' ≈ '+num(ad)}],a:'≈ '+num(ad)};}
var op=rnd(3,20),aj=rnd(3,20),ratio=Math.round(op/aj*10000)/10000,ang=r1(Math.atan(op/aj)/R);
return {p:'A right triangle has an opposite side of '+op+' and an adjacent side of '+aj+'. Find the angle θ.',steps:[{s:'You have opposite and adjacent → TOA: tan θ = opposite ÷ adjacent.',m:'tan θ = '+op+' ÷ '+aj+' = '+num(ratio)},{s:'Undo the tangent with inverse tangent.',m:'θ = tan⁻¹('+num(ratio)+')'},{s:'Use a calculator (in degree mode!).',m:'θ ≈ '+num(ang)+'°'}],a:'θ ≈ '+num(ang)+'°'};},
arith:function(){var a1=rnd(-10,20),d=rndNZ(-7,9),n=rnd(8,40),an=a1+(n-1)*d,sq=[0,1,2,3].map(function(i){return num(a1+i*d);}).join(', ')+', …';
return {p:'Find the '+ord(n)+' term of the sequence  '+sq,steps:[{s:'Find the common difference d by subtracting a term from the next one.',m:'d = '+num(a1+d)+' − '+par(a1)+' = '+num(d)},{s:'Use the nth-term formula.',m:'a<sub>n</sub> = a<sub>1</sub> + (n − 1)d'},{s:'Plug in a₁ = '+num(a1)+', d = '+num(d)+', n = '+n+'.',m:'a<sub>'+n+'</sub> = '+num(a1)+' + ('+n+' − 1)·'+par(d)+' = '+num(a1)+' + '+par((n-1)*d)},{s:'Simplify.',m:'a<sub>'+n+'</sub> = '+num(an)}],a:num(an)};},
deriv:function(){var exps=shuffle([0,1,2,3,4,5]).slice(0,rnd(3,4)).sort(function(a,b){return b-a;}),str=exps.map(function(e,i){var c=rndNZ(-9,9);return (c<0?'-':(i?'+':''))+Math.abs(c)+(e===0?'':e===1?'x':'x^'+e);}).join(''),r=solveDeriv(str);return {p:'Find f′(x) if  f(x) = '+polyT(parsePoly(str)),steps:r.steps,a:r.ans};},
integral:function(){var exps=shuffle([0,1,2,3,4]).slice(0,3).sort(function(a,b){return b-a;}),terms=exps.map(function(e){return [rndNZ(-9,9)*(Math.random()<.6?e+1:1),e];}),lines=[];
terms.forEach(function(t){lines.push('∫ '+joinTerms([fracTerm(t[0],1,t[1])])+' dx = '+joinTerms([fracTerm(t[0],t[1]+1,t[1]+1)]));});
var ans=joinTerms(terms.map(function(t){return fracTerm(t[0],t[1]+1,t[1]+1);}))+' + C';
return {p:'Find  ∫ ('+polyT(terms)+') dx',steps:[{s:'Power rule for integrals: add 1 to the power, then divide by the new power.',m:'∫ x<sup>n</sup> dx = x<sup>n+1</sup> ÷ (n+1) + C'},{s:'Integrate each term separately.',m:lines.join('<br>')},{s:'Combine and add the constant of integration C.',m:ans},{s:'Check: the derivative of your answer should give back the original function.',m:''}],a:ans};},
mean:function(){var n=rnd(5,7),arr=[];for(var i=0;i<n;i++)arr.push(rnd(1,20));if(Math.random()<.6)arr[rnd(1,n-1)]=arr[0];var r=solveStats(arr.join(', '));return {p:'Find the mean, median, mode and range of:  '+arr.join(', '),steps:r.steps,a:r.ans};},
prob:function(){var r=rnd(2,9),b=rnd(2,9),g=rnd(1,7),T=r+b+g,c=pick([['red',r],['blue',b],['green',g]]),not=Math.random()<.4,fav=not?T-c[1]:c[1],st=[{s:'Count the total number of marbles (all possible outcomes).',m:r+' + '+b+' + '+g+' = '+T}];
st.push(not?{s:'Count the marbles that are NOT '+c[0]+'.',m:T+' − '+c[1]+' = '+fav}:{s:'Count the '+c[0]+' marbles (the outcomes you want).',m:String(fav)});
var f=frac(fav,T);st.push({s:'Probability = outcomes you want ÷ total outcomes. Simplify if you can.',m:'P = '+fav+'/'+T+(f!==fav+'/'+T?' = '+f:'')+' ≈ '+num(r1(fav/T*100))+'%'});
return {p:'A bag has '+r+' red, '+b+' blue and '+g+' green marbles. You pick one without looking. What is P('+(not?'not ':'')+c[0]+')?',steps:st,a:f};},
z:function(){var mu=pick([50,60,70,75,80,100]),sd=pick([4,5,8,10,12,15]),k=pick([-2,-1.5,-1,-.5,.5,1,1.5,2,2.5]),x=mu+sd*k,pct=r1(normCdf(k)*100);
return {p:'Test scores have a mean of '+mu+' and a standard deviation of '+sd+'. Find the z-score of a score of '+num(x)+'.',steps:[{s:'A z-score tells how many standard deviations a value is from the mean.',m:'z = (x − μ) ÷ σ'},{s:'Plug in the numbers.',m:'z = ('+num(x)+' − '+mu+') ÷ '+sd+' = '+num(x-mu)+' ÷ '+sd},{s:'Divide.',m:'z = '+num(k)},{s:'Interpret it: the score is '+Math.abs(k)+' standard deviation'+(Math.abs(k)===1?'':'s')+' '+(k>0?'above':'below')+' the mean. On a normal curve, about '+pct+'% of scores are lower.',m:''}],a:'z = '+num(k)};},
det:function(){var a=rnd(-9,9),b=rnd(-9,9),c=rnd(-9,9),d=rnd(-9,9),D=a*d-b*c;return {p:'Find the determinant of  '+matHTML([[a,b],[c,d]]),steps:[{s:'For a 2×2 matrix, the determinant is (main diagonal product) − (other diagonal product).',m:'det = ad − bc'},{s:'Multiply the main diagonal (top-left × bottom-right).',m:par(a)+' · '+par(d)+' = '+num(a*d)},{s:'Multiply the other diagonal (top-right × bottom-left).',m:par(b)+' · '+par(c)+' = '+num(b*c)},{s:'Subtract.',m:num(a*d)+' − '+par(b*c)+' = '+num(D)},{s:D===0?'The determinant is 0, so this matrix has no inverse.':'The determinant is not 0, so this matrix has an inverse.',m:''}],a:num(D)};},
dot:function(){var u=[rndNZ(-6,6),rndNZ(-6,6),rndNZ(-6,6)],v=[rndNZ(-6,6),rndNZ(-6,6),rndNZ(-6,6)],D=u[0]*v[0]+u[1]*v[1]+u[2]*v[2],su=u[0]*u[0]+u[1]*u[1]+u[2]*u[2],sv=v[0]*v[0]+v[1]*v[1]+v[2]*v[2],mu=Math.sqrt(su),mv=Math.sqrt(sv),ang=r1(Math.acos(clamp(D/(mu*mv),-1,1))*180/Math.PI);function vs(x){return '⟨'+x.map(num).join(', ')+'⟩';}
return {p:'Find u · v and the angle between u = '+vs(u)+' and v = '+vs(v)+'.',steps:[{s:'Multiply matching components, then add.',m:'u · v = '+par(u[0])+'·'+par(v[0])+' + '+par(u[1])+'·'+par(v[1])+' + '+par(u[2])+'·'+par(v[2])},{s:'Simplify.',m:'u · v = '+num(u[0]*v[0])+' + '+par(u[1]*v[1])+' + '+par(u[2]*v[2])+' = '+num(D)},{s:'Find the length (magnitude) of each vector.',m:'|u| = √'+su+' ≈ '+num(r2(mu))+',   |v| = √'+sv+' ≈ '+num(r2(mv))},{s:'Use cos θ = (u · v) ÷ (|u||v|).',m:'θ = cos⁻¹('+num(D)+' ÷ '+num(r2(mu*mv))+') ≈ '+num(ang)+'°'},{s:D===0?'A dot product of 0 means the vectors are perpendicular!':D>0?'Positive dot product → the angle is acute (less than 90°).':'Negative dot product → the angle is obtuse (more than 90°).',m:''}],a:'u · v = '+num(D)+',   θ ≈ '+num(ang)+'°'};}
};

/* ================= COURSES & TOPICS ================= */
function S_(s,m){return {s:s,m:m||''};}
var COURSES=[
{id:'prealg',name:'Pre-Algebra',lvl:'Grade 7',grades:['7'],icon:'🧮',c:'#0891b2',topics:[
{t:'Integer Operations',gen:'int',s:'Integers are positive and negative whole numbers. On a number line, adding a positive moves right and adding a negative moves left. Subtracting is the same as adding the opposite.',k:'× and ÷: same signs → positive, different signs → negative'},
{t:'Order of Operations',s:'When an expression has several operations, do them in this order so everyone gets the same answer: Parentheses, Exponents, Multiplication & Division (left to right), then Addition & Subtraction (left to right).',k:'P → E → M/D (left to right) → A/S (left to right)',ex:{p:'Simplify:  8 + 2 × (7 − 3)² ÷ 4',steps:[S_('Parentheses first.','7 − 3 = 4   →   8 + 2 × 4² ÷ 4'),S_('Exponents next.','4² = 16   →   8 + 2 × 16 ÷ 4'),S_('Multiply and divide from left to right.','2 × 16 = 32   →   8 + 32 ÷ 4   →   8 + 8'),S_('Add last.','8 + 8 = 16')],a:'16'}},
{t:'Percents & Discounts',gen:'percent',s:'“Percent” means “out of 100.” To find a percent of a number, turn the percent into a decimal (divide by 100) and multiply. Sales, tips and taxes all use this idea.',k:'p% of n = (p ÷ 100) × n'},
{t:'One- & Two-Step Equations',gen:'linear1',tool:'linear',s:'An equation is like a balance scale: whatever you do to one side, you must do to the other. Undo addition or subtraction first, then undo multiplication or division.',k:'Undo + and − first, then × and ÷'},
{t:'Exponent Rules',gen:'expo',s:'An exponent tells how many times to multiply a base by itself. When the bases match, there are shortcuts for multiplying, dividing and raising powers to powers.',k:'xᵃ·xᵇ = xᵃ⁺ᵇ     xᵃ ÷ xᵇ = xᵃ⁻ᵇ     (xᵃ)ᵇ = xᵃᵇ'}]},
{id:'alg1',name:'Algebra 1',lvl:'Grades 8–9',grades:['8','9'],icon:'⚖️',c:'#16a34a',topics:[
{t:'Variables on Both Sides',gen:'linear',tool:'linear',s:'When x appears on both sides, first gather all the x-terms on one side and all the plain numbers on the other. Then divide by the coefficient of x.',k:'Collect x-terms → collect constants → divide'},
{t:'Slope & Equation of a Line',gen:'slope',tool:'line',s:'Slope measures steepness: how much y changes for each step in x. With the slope and one point you can find the y-intercept and write the line’s equation.',k:'m = (y₂ − y₁) ÷ (x₂ − x₁)      y = mx + b'},
{t:'Systems of Equations',gen:'system',tool:'system',s:'A system is two equations that are true at the same time. The solution is the point where the two lines cross. Elimination adds or subtracts the equations to cancel one variable.',k:'Match a coefficient → subtract → solve → substitute back'},
{t:'Factoring Trinomials',gen:'factor',s:'Factoring turns x² + bx + c into two binomials multiplied together. You need two numbers that multiply to c and add to b.',k:'x² + bx + c = (x + m)(x + n)  where  m·n = c,  m + n = b'},
{t:'The Quadratic Formula',gen:'quad',tool:'quad',s:'The quadratic formula solves any equation of the form ax² + bx + c = 0, even ones that don’t factor. The discriminant b² − 4ac tells you how many real solutions to expect.',k:'x = (−b ± √(b² − 4ac)) ÷ 2a'}]},
{id:'geo',name:'Geometry',lvl:'Grades 9–10',grades:['9','10'],icon:'📐',c:'#d97706',topics:[
{t:'Pythagorean Theorem',gen:'pyth',tool:'tri',s:'In every right triangle, the square of the hypotenuse equals the sum of the squares of the two legs. Use it to find any missing side.',k:'a² + b² = c²'},
{t:'Triangle Angle Sum',gen:'angles',s:'The three interior angles of any triangle always add to 180°. If you know two angles, subtract their sum from 180° to find the third.',k:'A + B + C = 180°'},
{t:'Circles: Area & Circumference',gen:'circle',s:'The radius goes from the center to the edge; the diameter is twice the radius. π (about 3.14159) connects a circle’s size to its area and its distance around.',k:'A = πr²      C = 2πr = πd'},
{t:'Volume of a Cylinder',gen:'vol',s:'Volume measures how much space a 3-D shape holds. For a cylinder (like a soup can), multiply the area of the circular base by the height.',k:'V = πr²h'},
{t:'Similar Triangles',s:'Similar triangles have the same shape but different sizes. Their angles match and their corresponding sides are all multiplied by the same scale factor.',k:'Corresponding sides are proportional',ex:{p:'△ABC ~ △DEF.  AB = 6, BC = 9 and DE = 10.  Find EF.',steps:[S_('Match the corresponding sides.','AB ↔ DE      BC ↔ EF'),S_('Find the scale factor from the pair you know.','DE ÷ AB = 10 ÷ 6 = 5/3'),S_('Multiply the matching side by the scale factor.','EF = BC × 5/3 = 9 × 5/3 = 15')],a:'EF = 15'}}]},
{id:'alg2',name:'Algebra 2',lvl:'Grades 10–11',grades:['10','11'],icon:'📈',c:'#ea580c',topics:[
{t:'Exponential Equations & Logs',gen:'log',s:'A logarithm answers the question “what exponent do I need?” Rewriting bˣ = N as a log lets you solve for an unknown exponent.',k:'bˣ = N   ⟺   x = log_b(N)'},
{t:'Complex Numbers',gen:'complex',s:'The imaginary unit i is defined so that i² = −1. Complex numbers a + bi let us take square roots of negative numbers. Multiply them with FOIL, then replace i² with −1.',k:'i² = −1      (a + bi)(c + di) = (ac − bd) + (ad + bc)i'},
{t:'Synthetic Division',s:'Synthetic division is a fast way to divide a polynomial by (x − r) using only the coefficients. A remainder of 0 means (x − r) is a factor.',k:'Bring down → multiply by r → add → repeat',ex:{p:'Divide  (x³ − 6x² + 11x − 6)  by  (x − 1).',steps:[S_('Write the coefficients, and use r = 1 from (x − 1).','1  |  1   −6   11   −6'),S_('Bring down the first coefficient.','1'),S_('Multiply by 1 and add to the next column.','1·1 = 1,   −6 + 1 = −5'),S_('Repeat.','−5·1 = −5,   11 + (−5) = 6'),S_('Repeat once more. The last number is the remainder.','6·1 = 6,   −6 + 6 = 0   → remainder 0'),S_('The bottom row (1, −5, 6) is the quotient, one degree lower.','x² − 5x + 6'),S_('Bonus: the quotient factors too.','x³ − 6x² + 11x − 6 = (x − 1)(x − 2)(x − 3)')],a:'x² − 5x + 6, remainder 0'}},
{t:'Inverse Functions',s:'An inverse function “undoes” the original. To find it, swap x and y, then solve for y. A function and its inverse cancel each other out.',k:'Swap x and y, then solve for y',ex:{p:'Find the inverse of  f(x) = 3x − 5.',steps:[S_('Replace f(x) with y.','y = 3x − 5'),S_('Swap x and y.','x = 3y − 5'),S_('Solve for y: add 5, then divide by 3.','x + 5 = 3y   →   y = (x + 5) ÷ 3'),S_('Check: f(f⁻¹(x)) should give back x.','3·(x + 5)/3 − 5 = x + 5 − 5 = x ✓')],a:'f⁻¹(x) = (x + 5) / 3'}}]},
{id:'precalc',name:'Trig & Precalculus',lvl:'Grades 11–12',grades:['11','12'],icon:'🌀',c:'#e11d48',topics:[
{t:'Right-Triangle Trig (SOH-CAH-TOA)',gen:'trig',s:'Sine, cosine and tangent are ratios of the sides of a right triangle, measured from one acute angle. Pick the ratio that uses the two sides you have (or want).',k:'sin = opp/hyp    cos = adj/hyp    tan = opp/adj'},
{t:'The Unit Circle',s:'The unit circle has radius 1. Any angle lands on a point (cos θ, sin θ). Reference angles and quadrant signs let you find exact values without a calculator.',k:'Point on the circle = (cos θ, sin θ)',ex:{p:'Find the exact values of sin 150° and cos 150°.',steps:[S_('Find the reference angle (distance to the x-axis).','180° − 150° = 30°'),S_('150° is in Quadrant II, where x (cosine) is negative and y (sine) is positive.',''),S_('Use the 30° values.','sin 30° = 1/2,     cos 30° = √3/2'),S_('Apply the Quadrant II signs.','sin 150° = 1/2,     cos 150° = −√3/2')],a:'sin 150° = 1/2,  cos 150° = −√3/2'}},
{t:'Law of Sines',s:'For any triangle (not just right triangles), each side divided by the sine of its opposite angle gives the same number. Use it when you know two angles and a side.',k:'a / sin A = b / sin B = c / sin C',ex:{p:'In △ABC, A = 40°, B = 60° and a = 10.  Find b.',steps:[S_('Find the third angle.','C = 180° − 40° − 60° = 80°'),S_('Set up the Law of Sines using the side–angle pair you know (a and A).','b / sin 60° = 10 / sin 40°'),S_('Solve for b.','b = 10 · sin 60° / sin 40° = 10 · 0.8660 / 0.6428'),S_('Calculate.','b ≈ 13.47')],a:'b ≈ 13.47'}},
{t:'Arithmetic Sequences',gen:'arith',s:'An arithmetic sequence adds the same amount (the common difference d) each time. A formula lets you jump straight to any term without listing them all.',k:'aₙ = a₁ + (n − 1)d'}]},
{id:'calc',name:'Calculus',lvl:'Grade 12 & College',grades:['12','College'],icon:'∫',c:'#7c3aed',topics:[
{t:'Limits by Factoring',s:'A limit describes the value a function approaches. If plugging in gives 0/0, try factoring and canceling, then plug in again.',k:'0/0 → factor → cancel → substitute',ex:{p:'Find  lim (x→3)  (x² − 9) / (x − 3).',steps:[S_('Try plugging in x = 3.','(9 − 9) / (3 − 3) = 0/0  → indeterminate, so simplify first'),S_('Factor the top (difference of squares).','(x − 3)(x + 3) / (x − 3)'),S_('Cancel the common factor (OK because x only approaches 3).','x + 3'),S_('Now substitute x = 3.','3 + 3 = 6')],a:'6'}},
{t:'Derivatives: Power Rule',gen:'deriv',tool:'deriv',s:'A derivative gives the instantaneous rate of change — the slope of the tangent line. For polynomials, the power rule handles each term on its own.',k:'d/dx [xⁿ] = n·xⁿ⁻¹'},
{t:'The Chain Rule',s:'Use the chain rule for a function inside another function. Take the derivative of the outside (leaving the inside alone), then multiply by the derivative of the inside.',k:'d/dx f(g(x)) = f′(g(x)) · g′(x)',ex:{p:'Find  d/dx  (3x² + 1)⁵.',steps:[S_('Identify the outside and inside functions.','outside: u⁵     inside: u = 3x² + 1'),S_('Differentiate the outside, keeping the inside the same.','5(3x² + 1)⁴'),S_('Differentiate the inside.','d/dx (3x² + 1) = 6x'),S_('Multiply them together and simplify.','5(3x² + 1)⁴ · 6x = 30x(3x² + 1)⁴')],a:'30x(3x² + 1)⁴'}},
{t:'Integrals: Power Rule',gen:'integral',s:'Integration is the reverse of differentiation (antidifferentiation). It also measures accumulated area. Always add + C for an indefinite integral.',k:'∫ xⁿ dx = xⁿ⁺¹/(n+1) + C   (n ≠ −1)'},
{t:'Definite Integrals (FTC)',s:'The Fundamental Theorem of Calculus says a definite integral equals the antiderivative evaluated at the top limit minus the bottom limit.',k:'∫ₐᵇ f(x) dx = F(b) − F(a)',ex:{p:'Evaluate  ∫₀²  (3x² + 2x) dx.',steps:[S_('Find an antiderivative with the power rule.','F(x) = x³ + x²'),S_('Evaluate at the upper and lower limits.','F(2) = 8 + 4 = 12,     F(0) = 0'),S_('Subtract.','12 − 0 = 12')],a:'12'}}]},
{id:'stats',name:'Statistics',lvl:'Grade 12 & College',grades:['12','College'],icon:'📊',c:'#0284c7',topics:[
{t:'Mean, Median, Mode & SD',gen:'mean',tool:'stats',s:'The mean is the average, the median is the middle value and the mode is the most common value. Range and standard deviation measure how spread out the data are.',k:'mean = sum ÷ n      s = √(Σ(x − x̄)² ÷ (n − 1))'},
{t:'Basic Probability',gen:'prob',s:'Probability measures how likely something is, from 0 (impossible) to 1 (certain). For equally likely outcomes, divide the outcomes you want by all possible outcomes.',k:'P(event) = favorable ÷ total      P(not A) = 1 − P(A)'},
{t:'z-Scores & the Normal Curve',gen:'z',s:'A z-score shows how far a value is from the mean in standard-deviation units. On a bell-shaped normal curve, z-scores tell you what percent of values fall below.',k:'z = (x − μ) ÷ σ'}]},
{id:'linalg',name:'Linear Algebra',lvl:'College',grades:['College'],icon:'🔢',c:'#059669',topics:[
{t:'2×2 Determinants',gen:'det',s:'The determinant is a single number computed from a square matrix. It tells you whether the matrix has an inverse (only if det ≠ 0) and how it scales area.',k:'det [a b; c d] = ad − bc'},
{t:'Matrix Multiplication',s:'To multiply matrices, each entry of the result is a row of the first matrix “dotted” with a column of the second. Order matters: AB usually isn’t the same as BA.',k:'(AB)ᵢⱼ = row i of A · column j of B',ex:{p:'Multiply  A = [1 2; 3 4]  by  B = [5 6; 7 8].',steps:[S_('Each entry = (row of A) · (column of B).',''),S_('Row 1 of A with each column of B.','1·5 + 2·7 = 19,      1·6 + 2·8 = 22'),S_('Row 2 of A with each column of B.','3·5 + 4·7 = 43,      3·6 + 4·8 = 50'),S_('Assemble the result.','AB = [19 22; 43 50]')],a:'[19 22; 43 50]'}},
{t:'Vectors & the Dot Product',gen:'dot',s:'The dot product multiplies matching components of two vectors and adds them. It reveals the angle between the vectors — a dot product of 0 means they are perpendicular.',k:'u · v = u₁v₁ + u₂v₂ + u₃v₃ = |u||v| cos θ'}]}
];

/* ================= TOOLS (step-by-step solvers) ================= */
function numIn(v){var s=String(v==null?'':v).trim().replace(/[−–]/g,'-');if(s==='')return NaN;if(/^-?\d+\/\d+$/.test(s)){var p=s.split('/');return parseFloat(p[0])/parseFloat(p[1]);}return parseFloat(s);}
var TOOLS=[
{id:'linear',name:'Linear Equations',icon:'⚖️',d:'Solve  ax + b = cx + d  for x.',tpl:'<i>a</i>x + <i>b</i> = <i>c</i>x + <i>d</i>',f:[['a','a','3'],['b','b','5'],['c','c','1'],['d','d','13']],run:function(v){return solveLinear(v.a,v.b,v.c,v.d);}},
{id:'quad',name:'Quadratic Formula',icon:'🎯',d:'Solve  ax² + bx + c = 0  with exact answers (radicals and complex numbers too).',tpl:'<i>a</i>x² + <i>b</i>x + <i>c</i> = 0',f:[['a','a','1'],['b','b','-5'],['c','c','6']],run:function(v){return solveQuad(v.a,v.b,v.c);}},
{id:'system',name:'Systems of Equations',icon:'✖️',d:'Solve two equations in x and y by elimination.',tpl:'<i>a₁</i>x + <i>b₁</i>y = <i>c₁</i>     <i>a₂</i>x + <i>b₂</i>y = <i>c₂</i>',f:[['a1','a₁','2'],['b1','b₁','3'],['c1','c₁','12'],['a2','a₂','1'],['b2','b₂','-1'],['c2','c₂','1']],run:function(v){return solveSystem(v.a1,v.b1,v.c1,v.a2,v.b2,v.c2);}},
{id:'line',name:'Line Through 2 Points',icon:'📏',d:'Find slope, y-intercept, equation, distance and midpoint.',tpl:'(<i>x₁</i>, <i>y₁</i>) and (<i>x₂</i>, <i>y₂</i>)',f:[['x1','x₁','1'],['y1','y₁','2'],['x2','x₂','4'],['y2','y₂','8']],run:function(v){return solveLine(v.x1,v.y1,v.x2,v.y2);}},
{id:'tri',name:'Right Triangle',icon:'📐',d:'Leave exactly ONE side blank and I’ll find it with the Pythagorean theorem.',tpl:'<i>a</i>² + <i>b</i>² = <i>c</i>²',f:[['a','leg a','3'],['b','leg b','4'],['c','hyp c','']],opt:true,run:function(v){var blank=['a','b','c'].filter(function(k){return isNaN(v[k]);});if(blank.length!==1)return {err:'Leave exactly one side blank.'};if(['a','b','c'].some(function(k){return !isNaN(v[k])&&v[k]<=0;}))return {err:'Side lengths must be positive.'};return solveTri(isNaN(v.a)?null:v.a,isNaN(v.b)?null:v.b,isNaN(v.c)?null:v.c);}},
{id:'deriv',name:'Derivative (Power Rule)',icon:'∂',d:'Differentiate a polynomial term by term. Use ^ for powers, like 3x^4 - 2x^2 + 5x - 7.',f:[['f','f(x) =','3x^4 - 2x^2 + 5x - 7','text'],['at','evaluate at x (optional)','','num']],opt:true,run:function(v,raw){return solveDeriv(raw.f,isNaN(v.at)?null:v.at);}},
{id:'stats',name:'Statistics',icon:'📊',d:'Mean, median, mode, range and standard deviation of a list of numbers.',f:[['l','numbers (comma separated)','4, 8, 15, 16, 23, 42','text']],opt:true,run:function(v,raw){return solveStats(raw.l);}}
];

/* ================= LAB GAMES (hands-on challenges) ================= */
var PROG=store.get('labprog',{});
function progOf(g){if(!PROG[g])PROG[g]=[];return PROG[g];}
function starsOf(g){return (PROG[g]||[]).reduce(function(a,b){return a+(b||0);},0);}
function doneOf(g){return (PROG[g]||[]).filter(function(b){return b>0;}).length;}
function allStars(){var t=0;for(var k in PROG)t+=starsOf(k);return t;}
var RANKS=[[0,'🌱','Number Sprout'],[6,'🔍','Pattern Finder'],[15,'🛠️','Problem Solver'],[30,'🧭','Concept Navigator'],[50,'🧠','Theorist'],[75,'🏛️','Mathemagician']];
function rankOf(n){var r=RANKS[0],nx=null;for(var i=0;i<RANKS.length;i++){if(n>=RANKS[i][0])r=RANKS[i];else{nx=RANKS[i];break;}}return {r:r,nx:nx};}
function starRow(n){var s='';for(var i=0;i<3;i++)s+=i<n?'★':'☆';return s;}

/* shared challenge shell: list of challenges, goal, workspace, 3-star result + insight question */
function chShell(box,gid,title,list,mount){
box.innerHTML='<div class="cm-ghead"><h2 class="cm-gtitle">'+title+'</h2><div class="cm-gstats" data-r="stats"></div></div>'+
'<div class="cm-chl"><nav class="cm-chlist" data-r="list" aria-label="Challenges"></nav><div><div class="cm-goal"><small data-r="num"></small><p data-r="goal"></p></div><div data-r="work"></div><div data-r="res"></div></div></div>';
var prog=progOf(gid),cur=0,listEl=q(box,'list');
while(cur<list.length-1&&prog[cur]>0)cur++;
function unlocked(i){return i===0||(prog[i-1]||0)>0;}
function paint(){
listEl.innerHTML=list.map(function(c,i){var u=unlocked(i);return '<button data-i="'+i+'" class="'+(i===cur?'is-on':'')+'"'+(u?'':' disabled title="Finish the previous challenge to unlock"')+'><span>'+(i+1)+'. '+c.title+'</span><span class="st">'+(u?starRow(prog[i]||0):'🔒')+'</span></button>';}).join('');
q(box,'stats').innerHTML=chip('⭐ '+starsOf(gid)+' / '+(list.length*3))+chip('✅ '+doneOf(gid)+' / '+list.length);
}
listEl.onclick=function(e){var b=e.target.closest('button');if(!b||b.disabled)return;open(+b.getAttribute('data-i'));};
function award(i,n){var prev=prog[i]||0;if(n>prev){prog[i]=n;store.set('labprog',PROG);addXP((n-prev)*5);}paint();}
function open(i){
cur=i;paint();var c=list[i];
q(box,'num').textContent='Challenge '+(i+1)+' of '+list.length;
q(box,'goal').innerHTML=c.goal||'';q(box,'res').innerHTML='';
var work=q(box,'work');work.innerHTML='';
mount(work,c,function(bonus,blabel){finish(i,bonus,blabel);},function(h){q(box,'goal').innerHTML=h;});
}
function finish(i,bonus,blabel){
var c=list[i],res=q(box,'res'),stars=1+(bonus?1:0),answered=false;
sfxWin();award(i,stars);
var opts=shuffle(c.iq.o.map(function(t,k){return {t:t,ok:k===0};}));
res.innerHTML='<div class="cm-res"><h3>✅ Challenge complete!</h3><div class="cm-stars" data-r="stars"></div>'+
'<ul class="cm-earn"><li>★ Finished the challenge</li><li class="'+(bonus?'':'off')+'">★ '+blabel+'</li><li class="off" data-r="ins">★ Answer the insight question</li></ul>'+
'<div class="cm-learn"><b>Why it works: </b>'+c.learn+'</div>'+
'<div class="cm-insight"><p><b>💡 Insight check:</b> '+c.iq.q+'</p><div class="cm-iopts" data-r="opts">'+opts.map(function(o,k){return '<button data-k="'+k+'">'+o.t+'</button>';}).join('')+'</div><p class="cm-iwhy" data-r="why"></p></div>'+
'<div class="cm-row" style="margin-top:14px"><button class="cm-lbtn" data-r="next">'+(i+1<list.length?'Next challenge →':'Back to the Arcade 🎉')+'</button><button class="cm-lbtn ghost" data-r="again">↻ Play again (new setup)</button></div></div>';
function showStars(n){q(res,'stars').innerHTML=[0,1,2].map(function(k){return '<span class="'+(k<n?'on':'')+'">★</span>';}).join('');}
showStars(stars);
q(res,'opts').onclick=function(e){
var b=e.target.closest('button');if(!b||answered)return;answered=true;var o=opts[+b.getAttribute('data-k')];
res.querySelectorAll('.cm-iopts button').forEach(function(x,k){if(opts[k].ok)x.classList.add('ok');x.disabled=true;});
if(o.ok){stars++;showStars(stars);award(i,stars);sfxGood();q(res,'ins').classList.remove('off');q(res,'why').textContent='Exactly right! +1 star.';}
else{b.classList.add('no');sfxBad();q(res,'why').textContent='Not quite — the green answer is correct. Re-read “Why it works,” then play again to earn this star.';}
};
q(res,'next').onclick=function(){if(i+1<list.length)open(i+1);else go('arcade');};
q(res,'again').onclick=function(){open(i);};
setTimeout(function(){try{res.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}},80);
}
open(cur);
}

/* ---------- Equation Builder ---------- */
function Fr(n,d){if(d===undefined)d=1;if(d<0){n=-n;d=-d;}var g=gcd(n,d);return {n:n/g,d:d/g};}
function fAdd(a,b){return Fr(a.n*b.d+b.n*a.d,a.d*b.d);}
function fMul(a,b){return Fr(a.n*b.n,a.d*b.d);}
function fNeg(a){return Fr(-a.n,a.d);}
function fOne(a){return a.n===1&&a.d===1;}
function fTxt(a){return (a.n<0?'−':'')+Math.abs(a.n)+(a.d===1?'':'/'+a.d);}
function fTerm(f,x){var an=Math.abs(f.n),top=x?(an===1?'':an)+'x':String(an);return {neg:f.n<0,s:f.d===1?top:'<span class="cm-fr"><span>'+top+'</span><span>'+f.d+'</span></span>'};}
function eqSide(a,b){var p=[];if(a.n!==0)p.push(fTerm(a,true));if(b.n!==0||a.n===0)p.push(fTerm(b,false));return p.map(function(t,i){return i?(t.neg?' − ':' + ')+t.s:(t.neg?'−':'')+t.s;}).join('');}
function termTxt(f){return f.n===f.d?'x':f.n===-f.d?'−x':fTxt(f)+'x';}
function eqPar(A,B,C,D){function cnt(a,b,c){return (c.n!==0?1:0)+(b.n!==0?1:0)+(fOne(fAdd(a,fNeg(c)))?0:1);}return Math.min(cnt(A,B,C),cnt(C,D,A));}
function parseAmt(str){
var s=String(str).replace(/\s+/g,'').replace(/[−–]/g,'-').toLowerCase(),m=s.match(/^([+-]?)(\d+(?:\.\d+)?)?(?:\/(\d+))?(x)?$/);
if(!m||(!m[2]&&!m[4])||(m[3]&&!m[2]))return null;
var n=1,d=1;
if(m[2]){if(m[2].indexOf('.')>-1){d=Math.pow(10,m[2].split('.')[1].length);n=Math.round(parseFloat(m[2])*d);}else n=parseInt(m[2],10);if(m[3]){if(!+m[3])return null;d*=parseInt(m[3],10);}}
if(m[1]==='-')n=-n;return {f:Fr(n,d),x:!!m[4]};
}
function eqGen(k){
var x,a,b,c,p,q2;
switch(k){
case 0:x=rnd(-8,15);b=rndNZ(-12,12);return {A:Fr(1),B:Fr(b),C:Fr(0),D:Fr(x+b)};
case 1:a=pick([3,4,5,6,7,-2,-3,-4]);x=rndNZ(-9,9);return {A:Fr(a),B:Fr(0),C:Fr(0),D:Fr(a*x)};
case 2:q2=pick([2,3,4,5]);x=q2*rndNZ(-6,6);return {A:Fr(1,q2),B:Fr(0),C:Fr(0),D:Fr(x/q2)};
case 3:a=rnd(2,9);x=rndNZ(-9,9);b=rndNZ(-12,12);return {A:Fr(a),B:Fr(b),C:Fr(0),D:Fr(a*x+b)};
case 4:a=-rnd(2,6);x=rndNZ(-8,8);b=rndNZ(-12,12);return {A:Fr(a),B:Fr(b),C:Fr(0),D:Fr(a*x+b)};
case 5:q2=pick([2,3,4,5]);x=q2*rndNZ(-5,5);b=rndNZ(-9,9);return {A:Fr(1,q2),B:Fr(b),C:Fr(0),D:Fr(x/q2+b)};
case 6:a=rnd(4,9);c=rnd(1,a-2);x=rndNZ(-8,8);b=rndNZ(-10,10);return {A:Fr(a),B:Fr(b),C:Fr(c),D:Fr((a-c)*x+b)};
case 7:a=pick([2,3,4,5]);p=rndNZ(-6,6);c=a===2?1:rnd(1,a-1);x=rndNZ(-8,8);return {A:Fr(a),B:Fr(a*p),C:Fr(c),D:Fr((a-c)*x+a*p),show:a+'(x '+(p>0?'+ ':'− ')+Math.abs(p)+')'};
case 8:a=rnd(1,4);c=a+rnd(2,5);x=rndNZ(-7,7);b=rndNZ(-10,10);return {A:Fr(a),B:Fr(b),C:Fr(c),D:Fr((a-c)*x+b)};
default:q2=pick([3,4,5]);p=q2===3?2:q2===4?3:pick([2,3,4]);x=q2*rndNZ(-5,5);b=rndNZ(-9,9);return {A:Fr(p,q2),B:Fr(b),C:Fr(0),D:Fr(p*x/q2+b)};
}
}
function eqHint(s){
var Ln=s.A.n!==0,Rn=s.C.n!==0;
if(Ln&&Rn)return 'x is on both sides. '+(s.C.n>0?'Subtract <b>'+termTxt(s.C)+'</b>':'Add <b>'+termTxt(fNeg(s.C))+'</b>')+' on both sides to gather the x-terms on the left (or move the left x-term to the right instead — either works).';
var a=Ln?s.A:s.C,k=Ln?s.B:s.D,ak=Fr(Math.abs(k.n),k.d);
if(k.n!==0)return 'The x-term has <b>'+(k.n>0?'+ ':'− ')+fTxt(ak)+'</b> attached to it. '+(k.n>0?'Subtract ':'Add ')+fTxt(ak)+' on both sides to peel it off.';
if(a.d===1)return 'x is being multiplied by '+fTxt(a)+'. <b>Divide</b> both sides by '+fTxt(a)+'.';
return 'x is multiplied by the fraction '+fTxt(a)+'. <b>Multiply</b> both sides by its reciprocal, '+fTxt(Fr(a.d,a.n))+'.';
}
var EQ_CH=[
{k:0,title:'One step: add or subtract',learn:'An equation is a balance scale. Doing the same thing to both sides keeps it balanced, and using the opposite operation (subtract to undo add) peels numbers away from x.',iq:{q:'Why do you have to do the same thing to BOTH sides?',o:['To keep the two sides equal — like keeping a balance scale level','Because subtraction always has to happen twice','To make the numbers smaller']}},
{k:1,title:'One step: multiply',learn:'4x means 4 times x. Undo multiplication with division: dividing both sides by the coefficient leaves 1x, which is just x.',iq:{q:'In the equation 4x = −28, what does “4x” mean?',o:['4 times x','4 plus x','x to the 4th power']}},
{k:2,title:'One step: fraction',learn:'x divided by a number is the same as x times a fraction. Multiplying by that number (the reciprocal) turns the coefficient back into 1.',iq:{q:'To undo “divide by 5”, you…',o:['multiply by 5','subtract 5','divide by 5 again']}},
{k:3,title:'Two steps',learn:'Undo operations in the reverse order they happened to x. x was multiplied first and then something was added or subtracted — so undo the + or − first, then divide.',iq:{q:'In 3x − 5 = 16, why is it usually easier to add 5 BEFORE dividing by 3?',o:['Dividing first would turn the 5 into a fraction (5/3) too','Dividing first gives a different answer','You are never allowed to divide first']}},
{k:4,title:'Negative coefficient',learn:'A negative coefficient is just a number. Divide by it: a negative divided by a negative is positive, and a positive divided by a negative is negative.',iq:{q:'−2x = −8. Dividing both sides by −2 gives…',o:['x = 4','x = −4','x = 16']}},
{k:5,title:'Two steps with a fraction',learn:'Peel off the added number first, then multiply by the denominator. Clearing the fraction last means you only multiply one term.',iq:{q:'x/4 + 3 = 7. Which first move keeps things simplest?',o:['Subtract 3 from both sides','Multiply only the x/4 by 4','Divide both sides by 3']}},
{k:6,title:'x on both sides',learn:'You can add or subtract x-terms just like numbers. Gather the x-terms on one side, then finish it like a two-step equation.',iq:{q:'In 5x + 3 = 2x + 18, why subtract 2x from both sides?',o:['To get all the x-terms on one side','Because 2 is the smallest number','To get rid of the 18']}},
{k:7,title:'Parentheses',learn:'The distributive property says a(x + b) = ax + ab. The game expands it for you after your first move — and if every term is divisible, dividing first is a sneaky shortcut.',iq:{q:'3(x − 2) is the same as…',o:['3x − 6','3x − 2','x − 6']}},
{k:8,title:'Pick the smart side',learn:'You can collect x-terms on either side. Moving the SMALLER x-term over to the bigger one keeps the coefficient positive and avoids sign mistakes.',iq:{q:'In 2x − 7 = 5x + 8, what happens if you gather the x-terms on the RIGHT instead of the left?',o:['Same answer, and the x-coefficient stays positive','You get a different answer','It is against the rules']}},
{k:9,title:'Fraction coefficient',learn:'A fraction times its reciprocal is 1: (3/2)·(2/3) = 1. One move clears the whole coefficient.',iq:{q:'Fastest way to undo “multiply by 2/3”?',o:['Multiply both sides by 3/2','Divide both sides by 2, then by 3','Subtract 2/3 from both sides']}}
];
function mountEq(work,c,done,setGoal){
var e=eqGen(c.k),st={A:e.A,B:e.B,C:e.C,D:e.D},stack=[],hist=[],op='-',won=false,par=eqPar(e.A,e.B,e.C,e.D);
var SYM={'+':'+','-':'−','*':'×','/':'÷'};
setGoal('Get <b>x</b> all by itself. Pick an operation, type an amount (like 5, 1/2 or 3x) and apply it to <b>both sides</b>. Par is <b>'+par+' move'+(par>1?'s':'')+'</b> — match it for a bonus star.');
work.innerHTML='<div class="cm-eqboard"><div class="cm-pan" data-r="L"></div><div class="cm-eqsign">=</div><div class="cm-pan" data-r="R"></div></div><div class="cm-beam" aria-hidden="true"></div>'+
'<div class="cm-eqctl"><div class="cm-ops" data-r="ops">'+[['+','Add'],['-','Subtract'],['*','Multiply'],['/','Divide']].map(function(o){return '<button data-op="'+o[0]+'" title="'+o[1]+'" aria-label="'+o[1]+'">'+SYM[o[0]]+'</button>';}).join('')+'</div>'+
'<input class="cm-eqin" data-r="amt" placeholder="5, 1/2 or 3x" autocomplete="off" aria-label="Amount"><button class="cm-lbtn" data-r="apply">Do it to both sides</button></div>'+
'<div class="cm-row" style="justify-content:center;margin-top:12px"><button class="cm-lbtn sm ghost" data-r="undo">↶ Undo</button><button class="cm-lbtn sm ghost" data-r="reset">⟲ Restart</button><button class="cm-lbtn sm ghost" data-r="hint">💡 Hint</button><span class="cm-chip" data-r="moves"></span></div>'+
'<p class="cm-msg" data-r="msg" style="text-align:center"></p><div data-r="hb"></div><ol class="cm-hist" data-r="hist"></ol>';
var L=q(work,'L'),R=q(work,'R'),amt=q(work,'amt'),msg=q(work,'msg');
function paint(){
L.innerHTML=(!hist.length&&e.show)?e.show:eqSide(st.A,st.B);R.innerHTML=eqSide(st.C,st.D);
q(work,'moves').textContent='Moves: '+hist.length+' · Par: '+par;
q(work,'ops').querySelectorAll('button').forEach(function(b){b.classList.toggle('is-on',b.getAttribute('data-op')===op);});
q(work,'hist').innerHTML=hist.map(function(h,i){return '<li><span class="op">'+(i+1)+'. '+h.lab+'</span><span>'+h.eq+'</span></li>';}).join('');
}
function say(t,cls){msg.className='cm-msg'+(cls?' '+cls:'');msg.innerHTML=t||'';}
function bad(t){say(t,'no');sfxBad();amt.classList.remove('cm-shake');void amt.offsetWidth;amt.classList.add('cm-shake');}
function flash(lab){[L,R].forEach(function(p){p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash');var s=document.createElement('span');s.className='cm-opflash';s.textContent=lab;p.appendChild(s);setTimeout(function(){s.remove();},1000);});}
function apply(){
if(won)return;var a=parseAmt(amt.value);
if(!a)return bad('Type a number like 5, −3, 1/2 or an x-term like 2x.');
var s={A:st.A,B:st.B,C:st.C,D:st.D};
if(op==='+'||op==='-'){
var f=op==='-'?fNeg(a.f):a.f;if(f.n===0)return bad('Adding or subtracting 0 doesn’t change anything — try another move.');
if(a.x){s.A=fAdd(s.A,f);s.C=fAdd(s.C,f);}else{s.B=fAdd(s.B,f);s.D=fAdd(s.D,f);}
}else{
if(a.x)return bad('Multiplying or dividing by x would create x² or 1/x terms. Use a plain number for × and ÷.');
if(a.f.n===0)return bad(op==='*'?'Multiplying both sides by 0 turns everything into 0 = 0 and erases the equation!':'You can never divide by 0.');
var k=op==='*'?a.f:Fr(a.f.d,a.f.n);s.A=fMul(s.A,k);s.B=fMul(s.B,k);s.C=fMul(s.C,k);s.D=fMul(s.D,k);
}
if(s.A.n===0&&s.C.n===0)return bad('That would wipe out every x — try a different move.');
stack.push(st);st=s;
var at=a.x?termTxt(a.f):fTxt(a.f),lab=SYM[op]+' '+((op==='*'||op==='/')&&a.f.n<0?'('+at+')':at);
hist.push({lab:lab,eq:eqSide(st.A,st.B)+' = '+eqSide(st.C,st.D)});
flash(lab);tone(520,.06,'triangle');amt.value='';q(work,'hb').innerHTML='';
paint();check();
}
function check(){
var sol=(fOne(st.A)&&st.B.n===0&&st.C.n===0)?st.D:(fOne(st.C)&&st.D.n===0&&st.A.n===0)?st.B:null;
if(sol){
won=true;say('🎉 <b>x = '+fTxt(sol)+'</b> in '+hist.length+' move'+(hist.length>1?'s':'')+(hist.length<=par?' — right on par!':' (par was '+par+').'),'ok');
work.querySelectorAll('.cm-eqctl button,.cm-eqctl input,[data-r=undo],[data-r=hint],[data-r=reset]').forEach(function(b){b.disabled=true;});
done(hist.length<=par,'Solved in par ('+par+' move'+(par>1?'s':'')+') or fewer');
}else say(hist.length>=par+3?'Still going! Tap 💡 Hint if you’re stuck, or ⟲ Restart to find a shorter path.':'');
}
q(work,'ops').onclick=function(ev){var b=ev.target.closest('button');if(!b||won)return;op=b.getAttribute('data-op');paint();amt.focus();};
q(work,'apply').onclick=apply;
amt.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();apply();}});
q(work,'undo').onclick=function(){if(won||!stack.length)return;st=stack.pop();hist.pop();say('');paint();};
q(work,'reset').onclick=function(){if(won)return;st={A:e.A,B:e.B,C:e.C,D:e.D};stack=[];hist=[];say('');q(work,'hb').innerHTML='';paint();};
q(work,'hint').onclick=function(){if(won)return;q(work,'hb').innerHTML='<div class="cm-hintbox">💡 '+eqHint(st)+'</div>';};
paint();
}

/* ---------- Shape Lab (geometry) ---------- */
function vsub(p,r){return [p[0]-r[0],p[1]-r[1]];}
function vd2(p,r){var v=vsub(p,r);return v[0]*v[0]+v[1]*v[1];}
function vdot(u,v){return u[0]*v[0]+u[1]*v[1];}
function vcross(u,v){return u[0]*v[1]-u[1]*v[0];}
function polyArea(P){var s=0;for(var i=0;i<P.length;i++){var a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return Math.abs(s)/2;}
function segX(p1,p2,p3,p4){function o(a,b,c){var v=vcross(vsub(b,a),vsub(c,a));return v>0?1:v<0?-1:0;}return o(p1,p2,p3)*o(p1,p2,p4)<0&&o(p3,p4,p1)*o(p3,p4,p2)<0;}
function isSq(n){var r=Math.round(Math.sqrt(n));return r*r===n;}
function geoInfo(P){
var n=P.length,I={s2:[],ang:[],right:false,obtuse:false,iso:false,para:false,rect:false,square:false},i;
for(i=0;i<n;i++)I.s2.push(vd2(P[i],P[(i+1)%n]));
I.area=polyArea(P);I.deg=I.area===0||I.s2.some(function(v){return v===0;});
if(n===4&&!I.deg&&(segX(P[0],P[1],P[2],P[3])||segX(P[1],P[2],P[3],P[0])))I.deg=true;
if(!I.deg){
for(i=0;i<n;i++){var a=P[i],u=vsub(P[(i+n-1)%n],a),v=vsub(P[(i+1)%n],a),dp=vdot(u,v);I.ang.push({deg:Math.acos(clamp(dp/Math.sqrt(vdot(u,u)*vdot(v,v)),-1,1))*180/Math.PI,right:dp===0,obt:dp<0});}
I.right=I.ang.some(function(x){return x.right;});
if(n===3){I.obtuse=I.ang.some(function(x){return x.obt;});I.iso=I.s2[0]===I.s2[1]||I.s2[1]===I.s2[2]||I.s2[0]===I.s2[2];}
else{var v01=vsub(P[1],P[0]),v32=vsub(P[2],P[3]);I.para=v01[0]===v32[0]&&v01[1]===v32[1];I.rect=I.para&&vdot(v01,vsub(P[3],P[0]))===0;I.square=I.rect&&I.s2[0]===I.s2[3];}
}
I.per=I.s2.reduce(function(s,v){return s+Math.sqrt(v);},0);
return I;
}
var SH_CH=[
{title:'Area of 6',n:3,goal:'Drag the corners to build a triangle with an <b>area of exactly 6</b> square units.',req:[['Area = 6',function(I){return I.area===6;}]],
hint:'Area = ½ × base × height. A flat base of 4 with the top corner 3 units higher works — so do other combos, like base 6 and height 2.',
learn:'The area of any triangle is ½ × base × height. A triangle is exactly half of the rectangle that has the same base and height.',
iq:{q:'If you double a triangle’s height but keep its base the same, its area…',o:['doubles','stays the same','quadruples']}},
{title:'Right angle',n:3,goal:'Make a <b>right triangle</b> — one of its angles must be exactly 90°.',req:[['Has a 90° angle',function(I){return I.right;}]],
hint:'Make one side perfectly horizontal and another perfectly vertical, meeting at the same corner. (Tilted ones work too, if you’re feeling fancy!)',
learn:'Two sides are perpendicular when they meet at 90°. On a grid, slopes like 2 and −½ (negative reciprocals) are also perpendicular — that’s how tilted right angles happen.',
iq:{q:'In a right triangle, which side is always the longest?',o:['The side across from the right angle (the hypotenuse)','The horizontal side','Either side next to the right angle']}},
{title:'Isosceles',n:3,goal:'Make an <b>isosceles</b> triangle: at least two sides must be the same length.',req:[['Two sides are equal',function(I){return I.iso;}]],
hint:'Put the top corner directly above the middle of the base. Then the two slanted sides are mirror images.',
learn:'An isosceles triangle has two equal sides, and the angles opposite those sides are equal too. The line from the top to the middle of the base is a line of symmetry.',
iq:{q:'An isosceles triangle has a 40° angle between its two equal sides. What are the other two angles?',o:['70° and 70°','40° and 100°','40° and 40°']}},
{title:'Hypotenuse of 5',n:3,goal:'Make a right triangle whose <b>longest side is exactly 5</b>.',req:[['Has a 90° angle',function(I){return I.right;}],['Longest side = 5',function(I){return Math.max.apply(null,I.s2)===25;}]],
hint:'Legs of 3 and 4 make a hypotenuse of exactly 5, because 3² + 4² = 9 + 16 = 25 = 5².',
learn:'The Pythagorean theorem: a² + b² = c². Whole-number solutions like (3, 4, 5) and (5, 12, 13) are called Pythagorean triples.',
iq:{q:'Which pair could be the legs of a right triangle with hypotenuse 10?',o:['6 and 8','5 and 5','4 and 6']}},
{title:'45-45-90',n:3,goal:'Make a right triangle whose two legs are <b>the same length</b>.',req:[['Has a 90° angle',function(I){return I.right;}],['Two sides are equal',function(I){return I.iso;}]],
hint:'Make a right angle with two legs of equal length — for example 4 across and 4 up.',
learn:'A right isosceles triangle always has angles of 45°, 45° and 90°. If each leg is s, the hypotenuse is s√2 — check the side labels!',
iq:{q:'A right isosceles triangle has legs of length 1. Its hypotenuse is…',o:['√2 ≈ 1.41','2','1']}},
{title:'Obtuse, area 4',n:3,goal:'Make an <b>obtuse</b> triangle (one angle bigger than 90°) with an <b>area of exactly 4</b>.',req:[['Has an angle over 90°',function(I){return I.obtuse;}],['Area = 4',function(I){return I.area===4;}]],
hint:'Start with base 4 and height 2. Then slide the top corner sideways, past the end of the base — keep it at the same height.',
learn:'Sliding the top corner parallel to the base keeps the same height, so the area never changes — even as the triangle turns obtuse. This is called a shear.',
iq:{q:'Two triangles have the same base and the same height but different shapes. Their areas are…',o:['equal','different — the pointier one is smaller','different — the obtuse one is bigger']}},
{title:'Rectangle, area 12',n:4,goal:'Drag the four corners (A → B → C → D in order around the shape) to make a <b>rectangle with area 12</b>.',req:[['Is a rectangle (4 right angles)',function(I){return I.rect;}],['Area = 12',function(I){return I.area===12;}]],
hint:'Try a 3 × 4 or a 2 × 6 rectangle lined up with the grid. Keep the letters going around in order.',
learn:'Rectangle area = length × width. Many rectangles share the same area but have different perimeters — the closer to a square, the smaller the perimeter.',
iq:{q:'A 3 × 4 rectangle and a 2 × 6 rectangle both have area 12. Which has the bigger perimeter?',o:['2 × 6 (perimeter 16 vs. 14)','3 × 4','They are equal']}},
{title:'Slanted parallelogram',n:4,goal:'Make a <b>parallelogram that is not a rectangle</b>, with an <b>area of exactly 10</b>.',req:[['Opposite sides parallel & equal',function(I){return I.para;}],['Not a rectangle',function(I){return I.para&&!I.rect;}],['Area = 10',function(I){return I.area===10;}]],
hint:'Start with a 5 × 2 rectangle, then shift the whole top edge sideways by the same amount (move C and D together).',
learn:'A parallelogram’s area is base × height — the straight-up height, not the slanted side. Cut a triangle off one end, slide it to the other, and you get a rectangle.',
iq:{q:'A parallelogram has base 5, slanted sides of length 3, and height 2. Its area is…',o:['10','15','6']}},
{title:'Whole-number sides',n:3,goal:'Make a triangle with an <b>area of 12</b> where <b>every side is a whole number</b> (no square roots!).',req:[['Every side is a whole number',function(I){return I.s2.every(isSq);}],['Area = 12',function(I){return I.area===12;}]],
hint:'Try base 6 with the top corner 4 units above the middle. Each slanted side is the hypotenuse of a 3-4-5 triangle!',
learn:'The 5-5-6 triangle is two 3-4-5 right triangles glued together: area ½ × 6 × 4 = 12 and all whole-number sides. Triangles like this are called Heronian triangles.',
iq:{q:'If you double every side of the 5-5-6 triangle, its area becomes…',o:['48 (four times bigger)','24 (twice as big)','12 (the same)']}},
{title:'Tilted square',n:4,goal:'Boss level: make a <b>square with an area of exactly 10</b>. (Hint: 10 isn’t a perfect square…)',req:[['Is a square',function(I){return I.square;}],['Area = 10',function(I){return I.area===10;}]],
hint:'A side can be diagonal. Going 1 right and 3 up has length √(1² + 3²) = √10. For the next side, turn 90°: 3 left and 1 up.',
learn:'A tilted square with side (1, 3) has side length √10, so its area is (√10)² = 10. Area of a square = side², even when it’s tilted — that’s the Pythagorean theorem hiding in plain sight.',
iq:{q:'A tilted square has one side going from (0, 0) to (2, 1). Its area is…',o:['5','3','2']}}
];
function mountShape(work,c,done){
var START=c.n===3?[[1,1],[7,1],[3,5]]:[[1,1],[6,1],[7,5],[2,6]],P=START.map(function(p){return p.slice();}),W=12,H=9,drag=-1,hintUsed=false,won=false;
var reqs=[[c.n===3?'Is a real triangle (not flat)':'Is a 4-sided shape (no crossing)',function(I){return !I.deg;}]].concat(c.req);
work.innerHTML='<div class="cm-geo"><div data-r="cw"><canvas aria-label="Shape grid — drag the corner points"></canvas></div><div class="cm-read" data-r="read"></div></div>'+
'<div class="cm-row" style="margin-top:10px"><button class="cm-lbtn sm ghost" data-r="hint">💡 Hint</button><button class="cm-lbtn sm ghost" data-r="reset">⟲ Reset shape</button><span class="cm-tipl">Drag the purple dots — they snap to the grid.</span></div><div data-r="hb"></div>';
var cv=work.querySelector('canvas'),C=sizeCv(cv,560,(H+1)/(W+1)),u=C.w/(W+1),nm='ABCD';
function X(x){return u*(x+.5);}function Y(y){return C.h-u*(y+.5);}
function draw(I){
var g=C.ctx,x,y,cx=0,cy=0;g.fillStyle='#fff';g.fillRect(0,0,C.w,C.h);
g.lineWidth=1;g.strokeStyle='#ebe8fb';
for(x=0;x<=W;x++){g.beginPath();g.moveTo(X(x),Y(0));g.lineTo(X(x),Y(H));g.stroke();}
for(y=0;y<=H;y++){g.beginPath();g.moveTo(X(0),Y(y));g.lineTo(X(W),Y(y));g.stroke();}
g.fillStyle='#a5a1c9';g.font='10px "Space Grotesk",sans-serif';g.textAlign='center';g.textBaseline='top';
for(x=0;x<=W;x+=2)g.fillText(x,X(x),Y(0)+5);
var col=won?'#15803d':'#6d4aff';
g.beginPath();P.forEach(function(p,i){g[i?'lineTo':'moveTo'](X(p[0]),Y(p[1]));});g.closePath();
g.fillStyle=won?'rgba(21,128,61,.16)':'rgba(109,74,255,.14)';g.fill();g.lineWidth=3;g.lineJoin='round';g.strokeStyle=col;g.stroke();
P.forEach(function(p){cx+=p[0];cy+=p[1];});cx/=P.length;cy/=P.length;
if(!I.deg)I.ang.forEach(function(a,i){
var p=P[i],n=P.length,u1=vsub(P[(i+n-1)%n],p),v1=vsub(P[(i+1)%n],p),l1=Math.hypot(u1[0],u1[1]),l2=Math.hypot(v1[0],v1[1]);
if(a.right){var s=.38,q1=[p[0]+u1[0]/l1*s,p[1]+u1[1]/l1*s],q2=[p[0]+v1[0]/l2*s,p[1]+v1[1]/l2*s],q3=[q1[0]+v1[0]/l2*s,q1[1]+v1[1]/l2*s];g.beginPath();g.moveTo(X(q1[0]),Y(q1[1]));g.lineTo(X(q3[0]),Y(q3[1]));g.lineTo(X(q2[0]),Y(q2[1]));g.strokeStyle='#e11d48';g.lineWidth=2;g.stroke();}
var bx=u1[0]/l1+v1[0]/l2,by=u1[1]/l1+v1[1]/l2,bl=Math.hypot(bx,by);if(bl<1e-6){bx=cx-p[0];by=cy-p[1];bl=Math.hypot(bx,by)||1;}
g.fillStyle=a.right?'#e11d48':'#57537a';g.font='600 12px "Space Grotesk",sans-serif';g.textAlign='center';g.textBaseline='middle';
g.fillText((a.right?'90':num(Math.round(a.deg)))+'°',X(p[0]+bx/bl*.95),Y(p[1]+by/bl*.95));
});
P.forEach(function(p,i){
var r=P[(i+1)%P.length],mx=(p[0]+r[0])/2,my=(p[1]+r[1])/2,s2=vd2(p,r);if(!s2)return;
var t=rootStr(s2),ox=mx-cx,oy=my-cy,ol=Math.hypot(ox,oy)||1,lx=X(mx+ox/ol*.45),ly=Y(my+oy/ol*.45);
g.font='700 13px "Space Grotesk",sans-serif';var tw=g.measureText(t).width+10;g.fillStyle='rgba(255,255,255,.94)';rr(g,lx-tw/2,ly-10,tw,20,6);g.fill();g.strokeStyle='#dcd7fb';g.lineWidth=1;g.stroke();
g.fillStyle='#1e1b4b';g.textAlign='center';g.textBaseline='middle';g.fillText(t,lx,ly);
});
P.forEach(function(p,i){
g.beginPath();g.arc(X(p[0]),Y(p[1]),drag===i?13:10,0,7);g.fillStyle=col;g.fill();g.lineWidth=3;g.strokeStyle='#fff';g.stroke();
var ox=p[0]-cx,oy=p[1]-cy,ol=Math.hypot(ox,oy)||1;g.fillStyle='#1e1b4b';g.font='700 15px "Space Grotesk",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(nm[i],X(p[0]+ox/ol*.6),Y(p[1]+oy/ol*.6));
});
}
function readout(I){
var h='<h4>Sides</h4>';
P.forEach(function(p,i){var s2=I.s2[i];h+='<div><span>'+nm[i]+nm[(i+1)%P.length]+'</span><b>'+(s2?rootStr(s2)+(isSq(s2)?'':' ≈ '+num(r2(Math.sqrt(s2)))):'0')+'</b></div>';});
if(!I.deg){h+='<h4>Angles</h4>';I.ang.forEach(function(a,i){h+='<div><span>∠'+nm[i]+'</span><b>'+(a.right?'90° (right)':num(r1(a.deg))+'°')+'</b></div>';});}
h+='<h4>Measurements</h4><div><span>Area</span><b>'+num(I.area)+'</b></div><div><span>Perimeter</span><b>≈ '+num(r2(I.per))+'</b></div>';
var tags=[];
if(I.deg)tags.push(c.n===3?'flat — not a triangle':'not a simple shape');
else if(c.n===3){tags.push(I.right?'right':I.obtuse?'obtuse':'acute');tags.push(I.iso?'isosceles':'scalene');}
else tags.push(I.square?'square':I.rect?'rectangle':I.para?'parallelogram':'quadrilateral');
h+='<div class="cm-tags">'+tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>';
h+='<h4>Goal checklist</h4>'+reqs.map(function(r){var ok=r[1](I);return '<div class="cm-req'+(ok?' ok':'')+'"><span>'+(ok?'✅ ':'⬜ ')+r[0]+'</span></div>';}).join('');
q(work,'read').innerHTML=h;
}
function update(){var I=geoInfo(P);draw(I);readout(I);return I;}
function gp(ev){var r=cv.getBoundingClientRect();return [(ev.clientX-r.left)/u-.5,(C.h-(ev.clientY-r.top))/u-.5];}
cv.addEventListener('pointerdown',function(ev){var g=gp(ev),best=-1,bd=.9;P.forEach(function(p,i){var d=Math.hypot(p[0]-g[0],p[1]-g[1]);if(d<bd){bd=d;best=i;}});if(best<0)return;drag=best;try{cv.setPointerCapture(ev.pointerId);}catch(e){}cv.style.cursor='grabbing';ev.preventDefault();update();});
cv.addEventListener('pointermove',function(ev){if(drag<0)return;var g=gp(ev),nx=clamp(Math.round(g[0]),0,W),ny=clamp(Math.round(g[1]),0,H);if(nx!==P[drag][0]||ny!==P[drag][1]){P[drag]=[nx,ny];update();}});
function up(){if(drag<0)return;drag=-1;cv.style.cursor='grab';var I=update();if(!won&&reqs.every(function(r){return r[1](I);})){won=true;update();done(!hintUsed,'No hints used');}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
q(work,'hint').onclick=function(){hintUsed=true;q(work,'hb').innerHTML='<div class="cm-hintbox">💡 '+c.hint+'</div>';};
q(work,'reset').onclick=function(){if(won)return;P=START.map(function(p){return p.slice();});update();};
update();
}

/* ---------- graph helpers for the calculus labs ---------- */
function sizeCv(cv,maxW,ratio){var dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(260,Math.min(maxW,cv.parentNode.clientWidth||maxW)),h=Math.round(w*ratio);cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx:ctx,w:w,h:h};}
function niceStep(r){var p=Math.pow(10,Math.floor(Math.log(r)/Math.LN10)),m=r/p;return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;}
function mkView(C,v){var sx=C.w/(v[1]-v[0]),sy=C.h/(v[3]-v[2]);return {X:function(x){return (x-v[0])*sx;},Y:function(y){return C.h-(y-v[2])*sy;},ix:function(px){return v[0]+px/sx;},iy:function(py){return v[2]+(C.h-py)/sy;}};}
function drawGrid(g,C,V,v){
g.fillStyle='#fff';g.fillRect(0,0,C.w,C.h);var sx=niceStep((v[1]-v[0])/8),sy=niceStep((v[3]-v[2])/6),x,y,i;
g.lineWidth=1;g.strokeStyle='#eeecfb';
for(i=Math.ceil(v[0]/sx);i*sx<=v[1];i++){x=i*sx;g.beginPath();g.moveTo(V.X(x),0);g.lineTo(V.X(x),C.h);g.stroke();}
for(i=Math.ceil(v[2]/sy);i*sy<=v[3];i++){y=i*sy;g.beginPath();g.moveTo(0,V.Y(y));g.lineTo(C.w,V.Y(y));g.stroke();}
g.strokeStyle='#9d98c7';g.lineWidth=1.5;
if(v[2]<=0&&v[3]>=0){g.beginPath();g.moveTo(0,V.Y(0));g.lineTo(C.w,V.Y(0));g.stroke();}
if(v[0]<=0&&v[1]>=0){g.beginPath();g.moveTo(V.X(0),0);g.lineTo(V.X(0),C.h);g.stroke();}
g.fillStyle='#8c88b5';g.font='11px "Space Grotesk",sans-serif';
var ay=clamp(V.Y(0),0,C.h-16),ax=clamp(V.X(0),26,C.w);
g.textAlign='center';g.textBaseline='top';for(i=Math.ceil(v[0]/sx);i*sx<=v[1];i++){if(i!==0)g.fillText(num(r2(i*sx)),V.X(i*sx),ay+3);}
g.textAlign='right';g.textBaseline='middle';for(i=Math.ceil(v[2]/sy);i*sy<=v[3];i++){if(i!==0)g.fillText(num(r2(i*sy)),ax-4,V.Y(i*sy));}
}
function drawCurve(g,C,V,v,f,col){g.strokeStyle=col;g.lineWidth=3;g.beginPath();var on=false;for(var px=0;px<=C.w;px+=1.5){var y=f(V.ix(px));if(!isFinite(y)||y<v[2]-50||y>v[3]+50){on=false;continue;}if(!on){g.moveTo(px,V.Y(y));on=true;}else g.lineTo(px,V.Y(y));}g.stroke();}
function gDot(g,V,x,y,col,lab){g.beginPath();g.arc(V.X(x),V.Y(y),8,0,7);g.fillStyle=col;g.fill();g.lineWidth=3;g.strokeStyle='#fff';g.stroke();g.fillStyle='#1e1b4b';g.font='700 14px "Space Grotesk",sans-serif';g.textAlign='left';g.textBaseline='bottom';g.fillText(lab,V.X(x)+9,V.Y(y)-6);}

/* ---------- Tangent Hunter (derivatives) ---------- */
var FNS={
sq:{f:function(x){return x*x;},df:function(x){return 2*x;},lab:'f(x) = x²',v:[-3.5,3.5,-2,10]},
cub:{f:function(x){return x*x*x-3*x;},df:function(x){return 3*x*x-3;},lab:'f(x) = x³ − 3x',v:[-3,3,-5,5]},
sin:{f:Math.sin,df:Math.cos,lab:'f(x) = sin x',v:[-4,4,-2,2]},
exp:{f:Math.exp,df:Math.exp,lab:'f(x) = eˣ',v:[-2,2.5,-1,8]}
};
var TN_CH=[
{title:'Tangent at x = 1',mode:'slope',fn:'sq',px:1,tol:.1,goal:'Tilt the purple line so it’s <b>tangent</b> to f(x) = x² at P (x = 1): it should <b>touch</b> the curve at P without cutting through it. Drag on the graph or use the slider, then press <b>Check</b>.',
hint:'For f(x) = x², the derivative is f′(x) = 2x. Plug in x = 1.',learn:'A tangent line touches the curve at one point and matches its steepness there. That steepness is the derivative: f′(1) = 2·1 = 2.',
iq:{q:'The derivative of a function at a point tells you…',o:['the slope of the tangent line there','the area under the curve','where the curve crosses the x-axis']}},
{title:'Downhill tangent',mode:'slope',fn:'sq',px:-2,tol:.1,goal:'Make the line tangent to f(x) = x² at <b>x = −2</b>.',
hint:'f′(x) = 2x, so at x = −2 the slope is negative — the curve is going downhill there.',learn:'A negative derivative means the function is decreasing. f′(−2) = −4: at that instant the curve drops 4 units for every 1 unit you move right.',
iq:{q:'If f′(x) is negative, the function is…',o:['decreasing (going downhill)','increasing','always below the x-axis']}},
{title:'Flat spots',mode:'point',fn:'cub',m:0,x0:0,tol:.15,goal:'This line’s slope is locked at <b>0</b> (perfectly flat). Slide P along f(x) = x³ − 3x to a spot where the flat line is <b>tangent</b>.',
hint:'A flat tangent happens at the top of a hill or the bottom of a valley. Look for the peak and the dip.',learn:'Where f′(x) = 0 the tangent is flat. Here f′(x) = 3x² − 3 = 0 at x = −1 and x = 1. These critical points are where local maximums and minimums live — the key to every optimization problem.',
iq:{q:'At the top of a smooth hill (a local maximum), the derivative equals…',o:['0','1','the height of the hill']}},
{title:'Find the steepness',mode:'point',fn:'sq',m:3,x0:-1,tol:.12,goal:'The line’s slope is locked at <b>3</b>. Slide P to the point on f(x) = x² where the curve is <b>exactly this steep</b>.',
hint:'f′(x) = 2x. When does 2x = 3?',learn:'Working backwards: if the slope must be 3 and f′(x) = 2x, then x = 1.5. Derivatives tell you WHERE a curve has a given steepness, not just how steep it is.',
iq:{q:'For f(x) = x², where is the slope equal to −6?',o:['x = −3','x = 6','x = −6']}},
{title:'Secant → tangent',mode:'secant',fn:'sq',px:1,goal:'P is fixed at x = 1. Q sits a gap <b>h</b> away, and the orange line goes through both. Shrink h until the secant’s slope is within <b>0.05</b> of the true tangent slope (which is 2).',
hint:'Make h tiny — like 0.03 or −0.02 — but not 0. Watch the secant line turn into the tangent line.',learn:'The derivative is defined as the limit of secant slopes: f′(x) = lim (h → 0) of [f(x + h) − f(x)] / h. For x² at x = 1, the secant slope is exactly 2 + h, which closes in on 2.',
iq:{q:'As h gets closer and closer to 0, the secant line…',o:['gets closer to the tangent line','gets closer to the x-axis','disappears completely']}},
{title:'Sine at zero',mode:'slope',fn:'sin',px:0,tol:.08,goal:'Make the line tangent to f(x) = sin x at <b>x = 0</b>.',
hint:'Near x = 0, sin x looks almost exactly like the line y = x.',learn:'The derivative of sin x is cos x, and cos 0 = 1. That’s why sin x ≈ x for small angles measured in radians — physicists use this trick all the time.',
iq:{q:'What is the slope of y = sin x at x = π (about 3.14)?',o:['−1','1','0']}},
{title:'The magic of eˣ',mode:'slope',fn:'exp',px:1,tol:.1,goal:'Make the line tangent to f(x) = eˣ at <b>x = 1</b>. Then compare your slope to the height of P…',
hint:'The derivative of eˣ is eˣ itself! At x = 1 the slope equals the height of the curve: e ≈ 2.72.',learn:'eˣ is its own derivative: at every point, its slope equals its height. That’s why it shows up in growth, decay, interest and almost every differential equation.',
iq:{q:'If g(x) = eˣ, then g′(2) equals…',o:['e² ≈ 7.39','2e ≈ 5.44','2']}},
{title:'Steep hunt',mode:'point',fn:'cub',m:9,x0:0,tol:.35,goal:'The line’s slope is locked at <b>9</b>. Slide P along f(x) = x³ − 3x to where the curve is that steep. (There’s more than one answer!)',
hint:'f′(x) = 3x² − 3. Set it equal to 9: 3x² = 12, so x² = 4.',learn:'f′(x) = 9 gives x = 2 and x = −2. Setting a derivative equal to a value can have several solutions — here because the curve is symmetric.',
iq:{q:'How many points on y = x³ − 3x have a slope of exactly 9?',o:['2','1','0']}}
];
function mountTan(work,c,done){
var F=FNS[c.fn],v=F.v,px=c.mode==='point'?c.x0:c.px,m=c.mode==='point'?c.m:0,h=1.5,hintUsed=false,won=false,down=false;
var ctl=c.mode==='slope'?'<label>Slope of your line: <b class="cm-bigval" data-r="sv"></b><input type="range" min="-8" max="8" step="0.05" data-r="s" aria-label="Slope"></label>'
:c.mode==='point'?'<label>Move P: x = <b class="cm-bigval" data-r="sv"></b><input type="range" min="'+v[0]+'" max="'+v[1]+'" step="0.05" data-r="s" aria-label="x position of P"></label>'
:'<label>Gap h = <b class="cm-bigval" data-r="sv"></b><input type="range" min="-2" max="2" step="0.01" data-r="s" aria-label="Gap h"></label>';
work.innerHTML='<div class="cm-cvwrap"><canvas aria-label="Graph"></canvas></div><div class="cm-ctl">'+ctl+'</div>'+
'<div class="cm-row" style="margin-top:10px"><button class="cm-lbtn" data-r="check">Check ✓</button><button class="cm-lbtn sm ghost" data-r="hint">💡 Hint</button><span class="cm-chip" data-r="read"></span></div><p class="cm-msg" data-r="msg"></p><div data-r="hb"></div>';
var cv=work.querySelector('canvas'),C=sizeCv(cv,640,.62),V=mkView(C,v),sl=q(work,'s'),msg=q(work,'msg');
function curM(){return c.mode==='secant'?(F.f(px+h)-F.f(px))/h:m;}
function paint(){
var g=C.ctx;drawGrid(g,C,V,v);drawCurve(g,C,V,v,F.f,'#0d9488');
g.fillStyle='#0d9488';g.font='700 14px "Space Grotesk",sans-serif';g.textAlign='left';g.textBaseline='top';g.fillText(F.lab,10,8);
var y0=F.f(px),lc=won?'#15803d':c.mode==='secant'?'#ea580c':'#6d4aff';
if(!(c.mode==='secant'&&h===0)){var mm=curM();g.strokeStyle=lc;g.lineWidth=2.5;g.beginPath();g.moveTo(V.X(v[0]),V.Y(y0+mm*(v[0]-px)));g.lineTo(V.X(v[1]),V.Y(y0+mm*(v[1]-px)));g.stroke();
if(c.mode==='slope'&&!won){g.setLineDash([3,3]);g.beginPath();g.arc(V.X(px+1),V.Y(y0+mm),8,0,7);g.strokeStyle='#6d4aff';g.lineWidth=2;g.stroke();g.setLineDash([]);}}
if(c.mode==='secant')gDot(g,V,px+h,F.f(px+h),'#ea580c','Q');
gDot(g,V,px,y0,won?'#15803d':'#6d4aff','P');
var sv=c.mode==='slope'?m:c.mode==='point'?px:h;sl.value=sv;q(work,'sv').textContent=num(r2(sv));
q(work,'read').textContent=c.mode==='secant'?(h===0?'secant slope = 0/0 ?!':'secant slope = '+num(Math.round(curM()*1000)/1000)):'P = ('+num(r2(px))+', '+num(r2(y0))+') · line slope = '+num(r2(m));
}
function setFromPointer(ev){
if(won)return;var r=cv.getBoundingClientRect(),x=V.ix(ev.clientX-r.left),y=V.iy(ev.clientY-r.top);
if(c.mode==='point')px=Math.round(clamp(Math.round(x/.05)*.05,v[0],v[1])*100)/100;
else if(c.mode==='secant')h=clamp(Math.round((x-px)*100)/100,-2,2);
else{if(Math.abs(x-px)<.15)return;m=Math.round(clamp(Math.round(((y-F.f(px))/(x-px))/.05)*.05,-8,8)*100)/100;}
paint();
}
cv.addEventListener('pointerdown',function(ev){down=true;try{cv.setPointerCapture(ev.pointerId);}catch(e){}setFromPointer(ev);ev.preventDefault();});
cv.addEventListener('pointermove',function(ev){if(down)setFromPointer(ev);});
cv.addEventListener('pointerup',function(){down=false;});cv.addEventListener('pointercancel',function(){down=false;});
sl.addEventListener('input',function(){if(won)return;var val=parseFloat(sl.value);if(c.mode==='slope')m=val;else if(c.mode==='point')px=val;else h=Math.round(val*100)/100;paint();});
q(work,'check').onclick=function(){
if(won)return;var ok,t,d;
if(c.mode==='slope'){d=m-F.df(px);ok=Math.abs(d)<=c.tol;t='Your slope is too '+(d>0?'high':'low')+'. See how the line slices through the curve near P? A tangent just grazes it. Try '+(d>0?'lowering':'raising')+' the slope.';}
else if(c.mode==='point'){d=F.df(px)-m;ok=Math.abs(d)<=c.tol;t='At x = '+num(r2(px))+' the curve’s slope is '+num(r2(F.df(px)))+', but your line’s slope is '+num(m)+'. Keep hunting — look for where the line just touches the curve.';}
else if(h===0){ok=false;t='h can’t be 0 — then P and Q are the same point and the slope is 0/0, which is undefined!';}
else{ok=Math.abs(h)<=.05;t='Secant slope = '+num(r2(curM()))+'. Slide Q closer to P (make h smaller — but not 0).';}
if(ok){
won=true;msg.className='cm-msg ok';
msg.textContent=c.mode==='secant'?'🎯 With h = '+num(h)+' the secant slope is '+num(Math.round(curM()*1000)/1000)+' — practically the tangent slope of 2!':c.mode==='point'?'🎯 Found it! At x = '+num(r2(px))+' the curve’s slope is '+num(r2(F.df(px)))+'.':'🎯 Tangent! The exact slope at x = '+num(px)+' is '+num(Math.round(F.df(px)*1000)/1000)+'.';
sl.disabled=true;q(work,'check').disabled=true;q(work,'hint').disabled=true;paint();done(!hintUsed,'No hints used');
}else{msg.className='cm-msg no';msg.textContent=t;sfxBad();}
};
q(work,'hint').onclick=function(){hintUsed=true;q(work,'hb').innerHTML='<div class="cm-hintbox">💡 '+c.hint+'</div>';};
paint();
}

/* ---------- Area Hunter (integrals) ---------- */
function rsum(f,a,b,n,mt){var h=(b-a)/n,s=0;for(var i=0;i<n;i++){var x0=a+i*h,x1=x0+h;s+=mt==='L'?f(x0):mt==='R'?f(x1):mt==='M'?f((x0+x1)/2):(f(x0)+f(x1))/2;}return s*h;}
function sq(x){return x*x;}
var AR_CH=[
{title:'Exact under a line',f:function(x){return x;},lab:'f(x) = x',a:0,b:4,exact:8,methods:'LRMT',goal:'Find the <b>exact</b> area under f(x) = x from x = 0 to x = 4, using rectangles or trapezoids.',
ok:function(e){return Math.abs(e)<1e-9;},fail:function(e){return 'Close, but not exact — off by '+Math.abs(e).toFixed(4)+'. Left and right rectangles always overshoot or leave gaps on a slanted line. Can another method make them cancel?';},
bon:function(n,hu){return !hu;},blab:'No hints used',hint:'Try Midpoint or Trapezoid. For a straight line, the bit that sticks out above the line exactly matches the bit missing below.',
learn:'The region is a triangle: ½ · 4 · 4 = 8. For any straight line, midpoint rectangles and trapezoids are exact with ANY number of pieces — the overshoot and undershoot in each strip cancel perfectly.',
iq:{q:'Why are midpoint rectangles exact under a straight line?',o:['The triangle that sticks out above the line matches the one missing below','Because the line goes through the origin','Midpoint rectangles are exact for every curve']}},
{title:'Left sums run low',f:sq,lab:'f(x) = x²',a:0,b:3,exact:9,methods:'L',goal:'Using <b>Left</b> rectangles only, get within <b>0.5</b> of the true area under x² from 0 to 3.',
ok:function(e){return Math.abs(e)<0.5;},fail:function(e){return 'Your estimate is too small by '+Math.abs(e).toFixed(3)+'. More rectangles means smaller gaps.';},
bon:function(n){return n<=30;},blab:'Used 30 or fewer rectangles',hint:'On a rising curve every left rectangle sits under the curve. Slide n up — you need somewhere in the high 20s.',
learn:'On a rising curve each left rectangle uses the LOWEST height in its strip, so the total is too small. As n → ∞ the gaps vanish — and that limit is exactly what the integral ∫₀³ x² dx = 9 means.',
iq:{q:'For an INCREASING function, left-endpoint rectangles…',o:['underestimate the area','overestimate the area','are always exact']}},
{title:'Smarter, not harder',f:sq,lab:'f(x) = x²',a:0,b:3,exact:9,methods:'LRMT',goal:'Get within <b>0.1</b> of the true area under x² from 0 to 3 using <b>5 or fewer</b> rectangles.',
ok:function(e,n){return Math.abs(e)<0.1&&n<=5;},fail:function(e,n){return n>5?'That uses '+n+' rectangles — the limit is 5. Try a different method instead of more rectangles.':'Off by '+Math.abs(e).toFixed(3)+'. Which method balances overshoot and undershoot inside each strip?';},
bon:function(n,hu){return !hu;},blab:'No hints used',hint:'Left and Right need lots of rectangles. Try Midpoint.',
learn:'Midpoint error shrinks like 1/n², while left/right error only shrinks like 1/n. Five midpoint rectangles are off by just 0.09 — and doubling n cuts midpoint error by about 4×.',
iq:{q:'For a smooth curve and the same number of rectangles, which is usually most accurate?',o:['Midpoint','Left','Right']}},
{title:'Overestimate on purpose',f:function(x){return 9-x*x;},lab:'f(x) = 9 − x²',a:0,b:3,exact:18,methods:'LRMT',goal:'This curve is <b>decreasing</b>. Make an estimate that is <b>too BIG by between 1 and 2</b>.',
ok:function(e){return e>=1&&e<=2;},fail:function(e){return e<0?'That estimate is too SMALL (by '+(-e).toFixed(3)+'). Which method puts the top of each rectangle above the curve?':'Too big by '+e.toFixed(3)+' — you need between 1 and 2. Adjust n.';},
bon:function(n,hu){return !hu;},blab:'No hints used',hint:'On a falling curve, the LEFT end of each strip is the tall end. Then pick n so the overshoot lands between 1 and 2 (try 7 to 13).',
learn:'When a curve falls, left endpoints are the high side of each strip, so left sums overestimate and right sums underestimate. The exact area is ∫₀³ (9 − x²) dx = 27 − 9 = 18.',
iq:{q:'For a DECREASING function, right-endpoint rectangles…',o:['underestimate the area','overestimate the area','are always exact']}},
{title:'One arch of sine',f:Math.sin,lab:'f(x) = sin x',a:0,b:Math.PI,exact:2,methods:'LRMT',goal:'Estimate the area under one arch of sin x (from 0 to π) to within <b>0.01</b>.',
ok:function(e){return Math.abs(e)<0.01;},fail:function(e){return 'Off by '+Math.abs(e).toFixed(4)+'. Keep refining!';},
bon:function(n){return n<=10;},blab:'Used 10 or fewer rectangles',hint:'Midpoint with about 10 rectangles gets you there. (Fun fact: Left and Right give identical answers here — can you see why?)',
learn:'∫₀^π sin x dx = [−cos x] from 0 to π = 1 + 1 = 2. One arch of the sine wave has an area of exactly 2!',
iq:{q:'Which function has sin x as its derivative (i.e., is an antiderivative of sin x)?',o:['−cos x','cos x','sin x']}},
{title:'The Fundamental Theorem',f:function(x){return x*x*x;},lab:'f(x) = x³',a:0,b:2,exact:4,methods:'LRMT',goal:'Get within <b>0.001</b> of the area under x³ from 0 to 2. Rectangles max out at 50 — choose your method wisely!',
ok:function(e){return Math.abs(e)<0.001;},fail:function(e){return 'Off by '+Math.abs(e).toFixed(5)+'. You need to be within 0.001.';},
bon:function(n,hu){return !hu;},blab:'No hints used',hint:'Only Midpoint is accurate enough — with 45 or more rectangles.',
learn:'Or skip rectangles entirely: ∫₀² x³ dx = [x⁴/4] from 0 to 2 = 16/4 − 0 = 4. The Fundamental Theorem of Calculus turns an infinite sum of rectangles into one subtraction!',
iq:{q:'Using the antiderivative x⁴/4, what is ∫₀¹ x³ dx?',o:['1/4','1/3','1']}}
];
function mountArea(work,c,done){
var n=4,mt=c.methods[0],hintUsed=false,won=false,NM={L:'Left',R:'Right',M:'Midpoint',T:'Trapezoid'};
work.innerHTML='<div class="cm-cvwrap"><canvas aria-label="Area graph"></canvas></div>'+
'<div class="cm-ctl"><div class="cm-seg" data-r="seg">'+'LRMT'.split('').map(function(k){return '<button data-m="'+k+'"'+(c.methods.indexOf(k)<0?' disabled title="Not allowed in this challenge"':'')+'>'+NM[k]+'</button>';}).join('')+'</div>'+
'<label>Rectangles: n = <b class="cm-bigval" data-r="nv"></b><input type="range" min="1" max="50" step="1" data-r="n" aria-label="Number of rectangles"></label></div>'+
'<div class="cm-areaout" data-r="out"></div>'+
'<div class="cm-row" style="margin-top:12px"><button class="cm-lbtn" data-r="check">Check ✓</button><button class="cm-lbtn sm ghost" data-r="hint">💡 Hint</button></div><p class="cm-msg" data-r="msg"></p><div data-r="hb"></div>';
var cv=work.querySelector('canvas'),C=sizeCv(cv,640,.55),lo=0,hi=0,i,msg=q(work,'msg'),sl=q(work,'n');
for(i=0;i<=200;i++){var yy=c.f(c.a+(c.b-c.a)*i/200);lo=Math.min(lo,yy);hi=Math.max(hi,yy);}
var pad=(c.b-c.a)*.08,ypad=(hi-lo)*.12,v=[c.a-pad,c.b+pad,lo-ypad,hi+ypad],V=mkView(C,v);
function paint(){
var g=C.ctx,w=(c.b-c.a)/n;drawGrid(g,C,V,v);
for(var k=0;k<n;k++){
var x0=c.a+k*w,x1=x0+w;g.beginPath();
if(mt==='T'){g.moveTo(V.X(x0),V.Y(0));g.lineTo(V.X(x0),V.Y(c.f(x0)));g.lineTo(V.X(x1),V.Y(c.f(x1)));g.lineTo(V.X(x1),V.Y(0));g.closePath();}
else{var sx=mt==='L'?x0:mt==='R'?x1:(x0+x1)/2,hh=c.f(sx);g.rect(V.X(x0),V.Y(Math.max(hh,0)),V.X(x1)-V.X(x0),Math.abs(V.Y(hh)-V.Y(0)));}
g.fillStyle=won?'rgba(21,128,61,.2)':'rgba(13,148,136,.2)';g.fill();g.lineWidth=n>30?1:1.5;g.strokeStyle=won?'#15803d':'#0d9488';g.stroke();
if(mt!=='T'&&n<=25){g.beginPath();g.arc(V.X(sx),V.Y(hh),3.5,0,7);g.fillStyle='#ea580c';g.fill();}
}
drawCurve(g,C,V,v,c.f,'#6d4aff');
g.fillStyle='#6d4aff';g.font='700 14px "Space Grotesk",sans-serif';g.textAlign='left';g.textBaseline='top';g.fillText(c.lab,10,8);
var est=rsum(c.f,c.a,c.b,n,mt),err=est-c.exact;
q(work,'nv').textContent=n;sl.value=n;
q(work,'seg').querySelectorAll('button').forEach(function(b){b.classList.toggle('is-on',b.getAttribute('data-m')===mt);});
q(work,'out').innerHTML='<div><span>Estimate</span><b>'+est.toFixed(4)+'</b></div><div><span>Compared to the true area</span><b>'+(Math.abs(err)<1e-9?'exact!':(err>0?'too big by ':'too small by ')+Math.abs(err).toFixed(4))+'</b></div>'+(won?'<div><span>True area</span><b>'+num(c.exact)+'</b></div>':'');
return err;
}
q(work,'seg').onclick=function(e){var b=e.target.closest('button');if(!b||b.disabled||won)return;mt=b.getAttribute('data-m');msg.textContent='';paint();};
sl.addEventListener('input',function(){if(won)return;n=+sl.value;msg.textContent='';paint();});
q(work,'check').onclick=function(){
if(won)return;var err=rsum(c.f,c.a,c.b,n,mt)-c.exact;
if(c.ok(err,n,mt)){won=true;msg.className='cm-msg ok';msg.textContent='🎯 Got it with '+n+' '+NM[mt].toLowerCase()+' '+(mt==='T'?'trapezoid':'rectangle')+(n>1?'s':'')+'!';
sl.disabled=true;q(work,'check').disabled=true;q(work,'hint').disabled=true;q(work,'seg').querySelectorAll('button').forEach(function(b){b.disabled=true;});paint();done(c.bon(n,hintUsed),c.blab);}
else{msg.className='cm-msg no';msg.textContent=c.fail(err,n,mt);sfxBad();}
};
q(work,'hint').onclick=function(){hintUsed=true;q(work,'hb').innerHTML='<div class="cm-hintbox">💡 '+c.hint+'</div>';};
paint();
}

var LGAMES=[
{id:'equation',name:'Equation Builder',icon:'⚖️',c:'#6d4aff',topic:'Algebra',d:'Solve equations yourself, one move at a time. Do the same thing to both sides, keep the balance, and try to beat par.'},
{id:'shapes',name:'Shape Lab',icon:'📐',c:'#d97706',topic:'Geometry',d:'Drag the corners of triangles and quadrilaterals to hit targets for area, angles and side lengths — with live measurements.'},
{id:'tangent',name:'Tangent Hunter',icon:'📈',c:'#0d9488',topic:'Calculus · Derivatives',d:'Tilt and slide lines until they just touch the curve. Discover what a derivative really measures.'},
{id:'area',name:'Area Hunter',icon:'∫',c:'#e11d48',topic:'Calculus · Integrals',d:'Stack rectangles under curves to estimate area, outsmart the error, and see how integrals nail it exactly.'}
];
var LG_LISTS={equation:EQ_CH,shapes:SH_CH,tangent:TN_CH,area:AR_CH};
var LG_FN={
equation:function(b){chShell(b,'equation','⚖️ Equation Builder',EQ_CH,mountEq);},
shapes:function(b){chShell(b,'shapes','📐 Shape Lab',SH_CH,mountShape);},
tangent:function(b){chShell(b,'tangent','📈 Tangent Hunter',TN_CH,mountTan);},
area:function(b){chShell(b,'area','∫ Area Hunter',AR_CH,mountArea);}
};

/* ================= ADVENTURE MINI GAMES (one per trip) ================= */
var ADV_N=8;
var ADV={
jungle:{game:'Vine Swing',icon:'🌿',d:'Swing vine to vine all the way to the treehouse!',intro:'Help Mochi swing through the jungle! Tap the vine with the right answer and Mochi swings to it.',tip:'Tap the vine with the right answer.',winT:'You made it to the treehouse!',winP:'Mochi swung across all 8 vines.'},
beach:{game:'Ice Cream Tower',icon:'🍦',d:'Stack the right scoops into a giant ice cream tower.',intro:'Mochi wants the tallest ice cream cone on the beach! Tap the scoop with the right answer to stack it on the cone.',tip:'Tap the scoop with the right answer.',winT:'What a tower!',winP:'Eight scoops — Mochi’s favorite!'},
party:{game:'Present Surprise',icon:'🎁',d:'Open the present with the right answer to find a surprise.',intro:'It’s party time! Each present has a number on it. Open the one with the right answer to find a surprise inside.',tip:'Tap the present with the right answer.',winT:'Best party ever!',winP:'You opened all 8 presents.'},
snow:{game:'Ski Lift',icon:'🚡',d:'Pick the right lift ticket to ride up the mountain.',intro:'Ride the ski lift to the top of the mountain! Pick the lift ticket with the right answer and Mochi rides up one stop.',tip:'Tap the lift ticket with the right answer.',winT:'You reached the top!',winP:'Time to ski all the way down! ⛷️'},
soccer:{game:'Penalty Kicks',icon:'⚽',d:'Kick the ball at the right number to score a goal!',intro:'Mochi is taking penalty kicks! Tap the target with the right answer to kick the ball past the goalie.',tip:'Tap the target with the right answer.',winT:'You win the match!',winP:'Mochi scored 8 goals!'},
opera:{game:'Sing-Along',icon:'🎵',d:'Tap the right notes and Mochi sings a song.',intro:'Mochi is singing at the opera! Tap the music note with the right answer and listen to the song come together.',tip:'Tap the music note with the right answer.',winT:'Bravo! Encore!',winP:'Mochi sang the whole song. Listen!'},
space:{game:'Planet Hop',icon:'🪐',d:'Fly your rocket to the planet with the right answer.',intro:'Blast off! Tap the planet with the right answer and Mochi’s rocket flies there to plant a flag.',tip:'Tap the planet with the right answer.',winT:'Mission complete!',winP:'Mochi visited 8 planets.'},
palace:{game:'Crown Jewels',icon:'💎',d:'Find the right jewels to fill the royal crown.',intro:'The royal crown is missing its jewels! Tap the jewel with the right answer to put it in the crown.',tip:'Tap the jewel with the right answer.',winT:'The crown is complete!',winP:'All 8 jewels are back where they belong.'}
};
var FLAV=['#f9a8d4','#a7f3d0','#fde68a','#c4b5fd','#fdba74','#bae6fd','#fca5a5','#d9f99d'];
var PRIZES=['🧸','🪀','🍭','🚂','🎨','🦄','🍰','🪁','🎈','🚗','🍩','🎺'];
var GEMS=['#ef4444','#3b82f6','#22c55e','#a855f7','#ec4899','#14b8a6','#f97316','#eab308'];
var TUNE=[329.6,329.6,349.2,392,392,349.2,329.6,293.7];
function slots8(cls,inner){var s='';for(var i=0;i<ADV_N;i++)s+='<i>'+(inner||'')+'</i>';return '<div class="'+cls+'">'+s+'</div>';}
function onSlot(c,cls,i,html){var el=c.lay.querySelectorAll('.'+cls+' i')[i];if(el){el.classList.add('on');if(html!=null)el.innerHTML=html;}}
var ADV_TH={
jungle:{
setup:function(c){c.lay.innerHTML='<div class="cm-jbranch"></div>'+slots8('cm-jtrail')+'<div class="cm-jhouse">🏡</div>';c.home();},
home:[10,66],
choices:function(v){var xs=[34,58,82];return v.map(function(n,k){return {x:xs[k],y:0,html:'<i class="vn"></i><b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var x=+b.getAttribute('data-x');c.mk.classList.add('mv');c.setMk(x,52,' rotate(-14deg)');b.classList.add('swing');
c.T.after(function(){c.setMk(x+5,44,' rotate(14deg)');},460);c.T.after(function(){c.home();onSlot(c,'cm-jtrail',i-1);},950);c.T.after(function(){c.mk.classList.remove('mv');done();},1450);}
},
beach:{
setup:function(c){c.lay.innerHTML='<div class="cm-bcn"></div><div data-r="stack"></div>';c.home();},
sy:function(k){return 72-k*9.2;},
home:[80,62],
choices:function(v){var ps=[[16,22],[16,50],[16,78]];return v.map(function(n,k){return {x:ps[k][0],y:ps[k][1],style:'--pc:'+FLAV[(Math.random()*FLAV.length)|0],html:'<b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var col=b.style.getPropertyValue('--pc');b.style.visibility='hidden';
var y=this.sy(i-1);c.fly('<i class="cm-scoop" style="--pc:'+col+'"></i>',+b.getAttribute('data-x'),+b.getAttribute('data-y'),50,y,520,function(){q(c.lay,'stack').insertAdjacentHTML('beforeend','<i class="cm-bsc" style="--pc:'+col+';top:'+y+'%"></i>');tone(880,.08,'triangle');done();});},
win:function(c){q(c.lay,'stack').insertAdjacentHTML('beforeend','<em class="cm-bch" style="top:'+(this.sy(ADV_N)+3)+'%">🍒</em>');}
},
party:{
bg:function(){return BG.party.replace(/<rect x="292"[\s\S]*?r="3" fill="#fb923c"\/>(?![\s\S]*r="3" fill="#fb923c")/,'');},
setup:function(c){c.lay.innerHTML=slots8('cm-pshelf','?');c.home();},
home:[11,56],
choices:function(v){var xs=[36,60,84],cols=shuffle(['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#ec4899']);return v.map(function(n,k){return {x:xs[k],y:52,style:'--pc:'+cols[k],html:'<i class="lid"></i><i class="bx"></i><b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var pz=c.st.prizes[i-1],x=+b.getAttribute('data-x');b.classList.add('open');b.insertAdjacentHTML('beforeend','<span class="pz">'+pz+'</span>');tone(1046,.15,'triangle',.1);
c.T.after(function(){c.fly('<span class="cm-pzf">'+pz+'</span>',x,30,15+8.75*(i-.5),90,520,function(){onSlot(c,'cm-pshelf',i-1,pz);done();});},700);}
},
snow:{
setup:function(c){c.lay.innerHTML='<svg class="cm-scable" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="4" y1="92" x2="96" y2="10" stroke="#334155" stroke-width=".7"/></svg><div class="cm-stop">🏁</div><div class="cm-schair" data-r="chair"></div>';this.place(c,0);},
pos:function(s){var x=10+74*s/ADV_N;return [x,92-82*(x-4)/92];},
place:function(c,s){var p=this.pos(s),ch=q(c.lay,'chair');ch.style.left=p[0]+'%';ch.style.top=p[1]+'%';c.setMk(p[0],p[1]+15);},
choices:function(v){var ps=[[58,84],[78,84],[88,58]];return v.map(function(n,k){return {x:ps[k][0],y:ps[k][1],html:'<span>🎟️ LIFT</span><b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){c.mk.classList.add('mv');q(c.lay,'chair').classList.add('mv');this.place(c,i);c.T.after(function(){c.mk.classList.remove('mv');q(c.lay,'chair').classList.remove('mv');done();},700);}
},
soccer:{
bg:function(){return BG.soccer.replace(/<rect x="300" y="150"[\s\S]*$/,'');},
setup:function(c){c.lay.innerHTML='<div class="cm-sgoal"><div class="cm-gk" data-r="gk"><svg viewBox="0 0 60 70" aria-hidden="true"><circle cx="30" cy="16" r="12" fill="#f6c995"/><path d="M14 66 Q12 34 30 30 Q48 34 46 66 Z" fill="#f97316"/><circle cx="8" cy="34" r="7" fill="#22c55e"/><circle cx="52" cy="34" r="7" fill="#22c55e"/><circle cx="26" cy="15" r="2" fill="#2a1a10"/><circle cx="34" cy="15" r="2" fill="#2a1a10"/></svg></div></div><div class="cm-sball" data-r="ball">⚽</div>';c.home();},
home:[33,80],
choices:function(v){var ps=[[30,26],[70,26],[50,42]];return v.map(function(n,k){return {x:ps[k][0],y:ps[k][1],html:'<b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var x=+b.getAttribute('data-x'),y=+b.getAttribute('data-y'),ball=q(c.lay,'ball'),gk=q(c.lay,'gk');
gk.classList.add('dive');gk.style.left=(x<50?78:22)+'%';ball.classList.add('kick');ball.style.left=x+'%';ball.style.top=y+'%';c.say(x,y-10,'GOAL! ⚽');
c.T.after(function(){ball.classList.remove('kick');ball.style.left='';ball.style.top='';gk.classList.remove('dive');gk.style.left='';done();},1000);},
wrong:function(c,b){var x=+b.getAttribute('data-x'),gk=q(c.lay,'gk');gk.classList.add('dive');gk.style.left=((x-18)/64*100)+'%';c.say(x,+b.getAttribute('data-y')-10,'Saved!');c.T.after(function(){gk.classList.remove('dive');gk.style.left='';},800);}
},
opera:{
quiet:true,
setup:function(c){c.lay.innerHTML='<div class="cm-ostaff"><i></i><i></i><i></i><i></i><i></i></div>'+slots8('cm-osong','♪');c.home();},
home:[11,60],
choices:function(v){var xs=[38,60,82],ys=shuffle([30,38,46]);return v.map(function(n,k){return {x:xs[k],y:ys[k],html:'<i class="hd"></i><b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){tone(TUNE[i-1],.45,'sine');c.mk.classList.remove('sing');void c.mk.offsetWidth;c.mk.classList.add('sing');
c.fly('<span class="cm-onote">♪</span>',+b.getAttribute('data-x'),+b.getAttribute('data-y'),22+74*(i-.5)/ADV_N,88,520,function(){onSlot(c,'cm-osong',i-1);done();});},
win:function(){TUNE.concat([293.7,329.6,329.6,293.7,293.7]).forEach(function(f,k){tone(f,.3,'sine',.4+k*.33);});}
},
space:{
setup:function(c){c.lay.innerHTML='<div class="cm-rocket" data-r="rk">🚀</div>'+slots8('cm-smap');c.home();},
home:[24,80],
choices:function(v){var xs=[20,50,80],cols=shuffle(['#f472b6','#60a5fa','#34d399','#fbbf24','#a78bfa','#fb923c']);return v.map(function(n,k){return {x:xs[k],y:rnd(42,54),style:'--pc:'+cols[k],html:'<i class="pl'+(Math.random()<.4?' ring':'')+'"></i><b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var rk=q(c.lay,'rk'),col=b.style.getPropertyValue('--pc');rk.classList.add('fly');rk.style.left=b.getAttribute('data-x')+'%';rk.style.top=(+b.getAttribute('data-y')+8)+'%';
c.T.after(function(){b.insertAdjacentHTML('beforeend','<span class="flag">🚩</span>');tone(784,.12,'triangle');onSlot(c,'cm-smap',i-1);var s=c.lay.querySelectorAll('.cm-smap i')[i-1];if(s)s.style.background=col;},650);
c.T.after(function(){rk.style.left='';rk.style.top='';},1150);c.T.after(function(){rk.classList.remove('fly');done();},1650);}
},
palace:{
setup:function(c){var s='';for(var k=0;k<ADV_N;k++)s+='<circle class="sk" cx="'+(24+k*21.7).toFixed(1)+'" cy="73" r="7"/>';
c.lay.innerHTML='<svg class="cm-crown" viewBox="0 0 200 90" aria-hidden="true"><path d="M12 82 C10 60 12 40 16 20 Q34 38 52 46 Q74 26 100 6 Q126 26 148 46 Q166 38 184 20 C188 40 190 60 188 82 Q100 90 12 82 Z" fill="#fbbf24" stroke="#b45309" stroke-opacity=".5" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="18" r="6" fill="#fbbf24"/><circle cx="100" cy="5" r="7" fill="#fbbf24"/><circle cx="184" cy="18" r="6" fill="#fbbf24"/><path d="M14 64 Q100 72 186 64" stroke="#f59e0b" stroke-width="3" fill="none"/>'+s+'</svg>';c.home();},
home:[10,66],
gem:function(col){return '<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M9 2 H31 L39 12 L20 35 L1 12 Z" fill="'+col+'" stroke="#000" stroke-opacity=".2" stroke-linejoin="round"/><path d="M1 12 H39 M9 2 L14 12 L20 35 L26 12 L31 2" stroke="#fff" stroke-opacity=".55" fill="none"/></svg>';},
choices:function(v){var xs=[34,57,80],cols=shuffle(GEMS.slice()),me=this;return v.map(function(n,k){return {x:xs[k],y:70,style:'--pc:'+cols[k],html:me.gem(cols[k])+'<b>'+num(n)+'</b>'};});},
right:function(c,b,i,done){var col=b.style.getPropertyValue('--pc'),sx=24+(i-1)*21.7;b.style.visibility='hidden';
c.fly('<span class="cm-gemf">'+this.gem(col)+'</span>',+b.getAttribute('data-x'),70,22+56*sx/200,3+37.8*73/90,560,function(){var s=c.lay.querySelectorAll('.cm-crown .sk')[i-1];if(s){s.style.fill=col;s.classList.add('on');}tone(1175,.12,'triangle');done();});}
}
};
function gAdv(box,id){
var A=ADV[id],TH=ADV_TH[id];
box.innerHTML=gHead(A.icon+' '+A.game)+'<div class="cm-af cm-af-'+id+'" data-r="f"><svg class="cm-afbg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+(TH.bg?TH.bg():(BG[id]||''))+'</svg><div class="cm-aflay" data-r="lay"></div><div data-r="ch"></div><img class="cm-am" data-r="mk" alt=""><div class="cm-overlay hide" data-r="ov"></div></div><p class="cm-tip">'+A.tip+'</p>';
var f=q(box,'f'),ch=q(box,'ch'),ov=q(box,'ov'),probEl=q(box,'prob'),statEl=q(box,'stats'),T=timers(),st={done:0,ban:0},busy=false;
var c={f:f,lay:q(box,'lay'),mk:q(box,'mk'),T:T,st:st};
c.mk.src=monkeyURI(S.look);
c.setMk=function(x,y,extra){c.mk.style.left=x+'%';c.mk.style.top=y+'%';c.mk.style.transform='translate(-50%,-50%)'+(extra||'');};
c.home=function(){if(TH.home)c.setMk(TH.home[0],TH.home[1]);};
c.fly=function(html,x0,y0,x1,y1,ms,cb){var d=document.createElement('div');d.className='cm-afly';d.innerHTML=html;d.style.left=x0+'%';d.style.top=y0+'%';f.appendChild(d);void d.offsetWidth;d.style.transition='left '+ms+'ms ease-in-out,top '+ms+'ms cubic-bezier(.5,-0.4,.6,1)';d.style.left=x1+'%';d.style.top=y1+'%';T.after(function(){d.remove();if(cb)cb();},ms+40);};
c.say=function(x,y,t){var r=f.getBoundingClientRect();floatText(f,r.width*x/100-30,r.height*y/100,t);};
function hud(){statEl.innerHTML=chip(A.icon+' '+st.done+' / '+ADV_N)+chip('🍌 +'+st.ban);}
function next(){
busy=false;st.tries=0;st.hinted=false;st.p=factProblem(S.grade);st.t0=Date.now();
probEl.textContent=st.p.q+' = ?';
var vals=choicesFor(st.p.a,3);
ch.innerHTML=TH.choices(vals).map(function(o,k){return '<button class="cm-ac cm-ac-'+id+'" data-v="'+vals[k]+'" data-x="'+o.x+'" data-y="'+o.y+'" style="left:'+o.x+'%;top:'+o.y+'%;'+(o.style||'')+'" aria-label="'+num(vals[k])+'">'+o.html+'</button>';}).join('');
}
function hint(){if(st.hinted)return;st.hinted=true;var b=ch.querySelector('[data-v="'+st.p.a+'"]');if(b)b.classList.add('hint');}
ch.addEventListener('click',function(e){
var b=e.target.closest('.cm-ac');if(!b||!st.run||busy)return;var v=+b.getAttribute('data-v');
if(v===st.p.a){
busy=true;st.done++;st.score=st.done;st.ban++;st.streak=0;addBananas(1);if(!TH.quiet)sfxGood();
b.classList.remove('hint');b.classList.add('right');ch.querySelectorAll('.cm-ac').forEach(function(x){if(x!==b)x.classList.add('gone');});
probEl.textContent=st.p.q+' = '+num(st.p.a)+' ✓';hud();
TH.right(c,b,st.done,function(){if(!st.run)return;if(st.done>=ADV_N)win();else next();});
}else{
st.wrong++;st.streak++;st.tries++;st.miss=st.p;sfxBad();b.classList.remove('no');void b.offsetWidth;b.classList.add('no');
if(TH.wrong)TH.wrong(c,b);
if(st.tries>=2)hint();
if(st.streak>=3)offer();
}
});
function tick(){if(st.run&&!busy&&S.grade<=2&&Date.now()-st.t0>6000)hint();}
function pause(){st.run=false;T.clear();}
function resume(){st.streak=0;st.run=true;st.t0=Date.now();T.every(tick,1000);}
function offer(){pause();showOv2(ov,'<div class="cm-ovemoji">🤔</div><h3>Tricky ones?</h3><p>Coach Monkey can show you how to solve <b>'+st.miss.q+'</b>.</p>',[['🐒 Show me how!',function(){factCoach(ov,st.miss,resume);}],['Keep playing',resume,'alt']]);}
function start(){T.clear();st={run:true,done:0,ban:0,wrong:0,streak:0,score:0,tries:0,prizes:shuffle(PRIZES.slice())};c.st=st;c.mk.className='cm-am';TH.setup(c);hud();next();T.every(tick,1000);}
function win(){
st.run=false;T.clear();addBananas(3);st.ban+=3;hud();if(TH.win)TH.win(c);else sfxWin();confetti(f);ch.innerHTML='';
var hard=struggled(st);
showOv2(ov,yayMochi()+'<h3>'+A.winT+'</h3><p>'+A.winP+' You earned <b>'+st.ban+' bananas</b> 🍌'+(hard?'<br>Want a quick lesson on <b>'+st.miss.q+'</b>?':'')+'</p>',
(hard?[['🐒 Show me how!',function(){factCoach(ov,st.miss,start,'Play again ▶');}]]:[]).concat([nextBtn(),['Play again',start,'alt']]));
}
hud();
showOv(ov,'<div class="cm-ovemoji">'+A.icon+'</div><h3>'+A.game+'</h3><p>'+A.intro+'<br>Quick facts: <b>'+QUICK_DESC[S.grade]+'</b>.</p>','Start! ▶',start);
}
function vAdv(id){
var sc=SCENES.filter(function(s){return s.id===id;})[0];if(!sc||!ADV[id])return go('kids/monkey');
var back='<a href="#cm/kids/monkey" data-go="kids/monkey">← Back to '+esc(S.mname)+'’s Adventures</a>';
if(!sceneOpen(sc)){view.innerHTML='<div class="cm-crumbs">'+back+'</div><div class="cm-game" style="text-align:center"><div class="cm-ovemoji">🔒</div><h2 class="cm-gtitle">'+ADV[id].game+'</h2><p style="font-weight:700">This game comes with the <b>'+sc.icon+' '+sc.name+'</b> trip. Earn <b>'+(sc.need-S.bananas)+'</b> more bananas to unlock it!</p><p><a class="cm-bigbtn" href="#cm/kids" data-go="kids">Go play ▶</a></p></div>';return;}
view.innerHTML='<div class="cm-crumbs">'+back+'<label style="font-weight:800">Grade <select class="cm-gsel">'+[1,2,3,4,5,6].map(function(n){return '<option value="'+n+'"'+(n===+S.grade?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label></div><div class="cm-game" id="cm-g"></div>';
view.querySelector('.cm-gsel').onchange=function(){S.grade=+this.value;store.set('grade',S.grade);render();};
gAdv(view.querySelector('#cm-g'),id);
}

/* ================= ADVENTURE REWARD GAMES (just for fun, no math) ================= */
var FUN={
jungle:{name:'Treetop Leap',icon:'🐒',d:'Swing from vine to vine and leap all the way to the treehouse!',intro:'Mochi is swinging through the jungle! 🍌🍓🥭 <b>Your goal: grab ALL the fruit</b> on the way to the treehouse! Tap when Mochi swings <b>forward</b> to leap to the next vine — let go <b>later</b> to jump higher, <b>sooner</b> to stay lower.',tip:'Goal: grab all the fruit! Tap anywhere (or press the space bar) to let go of the vine.'},
beach:{name:'Ice Cream Stand',icon:'🍦',d:'Run Mochi’s beach ice cream stand and make every customer’s cone.',intro:'Mochi is running the ice cream stand at the beach! Look at each customer’s order, build the same cone — then tap the <b>customer</b> to give it to them!',tip:'Tap flavors to stack scoops (bottom first), add a cherry if they want one, then tap the customer to hand it over!'},
party:{name:'Party Time!',icon:'🎁',d:'Open Mochi’s birthday presents and blow out the candles.',intro:'It’s Mochi’s birthday party! Tap a present to ✂️ cut the ribbon, tap again to 🎁 rip off the wrapping paper, then tap once more to 📦 open the box. Then blow out the candles!',tip:'✂️ Cut the ribbon → 🎁 rip the paper → 📦 open the box!'},
snow:{name:'Ski Run',icon:'⛷️',d:'Ski down the mountain, jump the rocks and catch snowflakes.',intro:'Mochi is skiing down the mountain! 🪨⛄ <b>Tap to JUMP over the rocks and snowmen</b> to make it down safely — and catch snowflakes ❄️ in the air.<br><br>❤️❤️❤️ Be careful! If Mochi bumps into <b>3 things</b>, Mochi gets hurt and has to start over.',tip:'Tap anywhere (or press the space bar or ↑) to jump over rocks and snowmen. Bump into 3 things and you start over!'},
soccer:{name:'Stadium Shootout',icon:'⚽',d:'Take 8 shots at the big stadium and beat the goalie.',intro:'The crowd is cheering for Mochi! Tap anywhere inside the goal to shoot. The goalie is quick — aim away from them and try the corners!',tip:'Tap inside the goal to shoot.'},
opera:{name:'Opera Star',icon:'🎭',d:'Mochi stars at the opera — sing the song and earn roses.',intro:'Mochi is the star of the opera tonight! Tap when each golden note reaches the circle and Mochi will sing it.',tip:'Tap anywhere (or press the space bar) when a note reaches the circle.'},
space:{name:'Star Flight',icon:'🚀',d:'Fly through space collecting stars and land on a new planet.',intro:'Mochi is flying through space! Steer the rocket to collect stars and fly around the space rocks. Land on a brand-new planet at the end!',tip:'Drag up and down, tap above or below the rocket, or use the ↑ ↓ keys.'},
palace:{name:'Royal Fireworks',icon:'🎆',d:'Light up the sky over the palace with fireworks.',intro:'Long live Mochi! Tap the night sky to launch fireworks for the royal celebration. Tap fast for big combos!',tip:'Tap the sky to launch fireworks.'}
};
function vpos(el,x,y){el.style.left=(x/3)+'%';el.style.top=(y/2)+'%';}
var FUN_G={
/* ---------- Jungle: Treetop Leap ---------- */
jungle:function(c){
var N=10,GAP=92,L=108,A=.8,OM=3.2,cur=0,phi=0,mode='swing',cam=0,fl=null,got=0,t=0,fall=null,yay=monkeyFull(S.look,'','yay');
var snacks=['🍌','🥭','🍓','🍍','🍑','🍉','🍇'];
var h='<div class="cm-jworld" data-r="w">';for(var i=0;i<=N;i++)h+='<div class="cm-jv"><i></i></div>';
for(i=0;i<N;i++)h+='<span class="cm-jfruit">'+pick(snacks)+'</span>';
h+='<span class="cm-jtree">🛖</span></div><div class="cm-jleaves"></div><img class="cm-jmk" data-r="mk" alt="">';
c.lay.innerHTML=h;var w=q(c.lay,'w'),mk=q(c.lay,'mk'),vEls=w.querySelectorAll('.cm-jv'),fEls=w.querySelectorAll('.cm-jfruit'),tree=w.querySelector('.cm-jtree');
mk.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(yay);
function vx(i){return 60+GAP*i;}
function end(i,th){return [vx(i)+L*Math.sin(th),L*Math.cos(th)];}
var fy=[];fEls.forEach(function(e,i){fy[i]=i===0?52:rnd(16,64);vpos(e,vx(i)+GAP/2,fy[i]);});vpos(tree,vx(N)+58,24);
function info(){c.setProb('🍓 Fruit: '+got+' / '+N+'   ·   🌿 Vine '+cur+' / '+N);}
info();
function placeMk(x,y,rot){var s=c.W()/300;mk.style.left=((x-cam)*s)+'px';mk.style.top=(y*s)+'px';mk.style.transform='translate(-50%,-18.4%) rotate('+(rot||0)+'rad)';}
function tap(){
if(mode!=='swing')return;var th=A*Math.sin(phi),fwd=Math.cos(phi)>0;
if(fwd&&th>-0.25){mode='fly';var p0=end(cur,th),p1=end(cur+1,-0.42);fl={u:0,p0:p0,p1:p1,c0:cam,c1:vx(cur+1)-60,hh:28+76*Math.max(0,Math.min(1,(th+0.25)/(A+0.25)))};tone(520,.08,'triangle');tone(780,.12,'triangle',.06);}
else{mode='fall';var p=end(cur,th);fall={x:p[0],y:p[1],vx:fwd?40:-30,vy:-60,t:0};tone(220,.25,'sine');}
}
c.tap=tap;
c.on(c.f,'pointerdown',function(e){if(e.target.closest('.cm-overlay'))return;tap();});
c.on(document,'keydown',function(e){if(e.code==='Space'){e.preventDefault();tap();}});
c.loop(function(dt){
t+=dt;var s=c.W()/300;w.style.transform='translateX('+(-cam*s)+'px)';
vEls.forEach(function(v,i){var th=i===cur&&mode==='swing'?A*Math.sin(phi):(i===cur+1&&mode==='fly'?-0.42*Math.min(1,fl.u*1.3):0.06*Math.sin(t*1.3+i));v.style.left=(vx(i)*s)+'px';v.style.height=(L*s)+'px';v.style.transform='rotate('+(-th)+'rad)';});
fEls.forEach(function(e,i){e.classList.toggle('next',i===cur&&mode!=='done'&&!e.classList.contains('got'));});
if(mode==='swing'){phi+=OM*dt;var th=A*Math.sin(phi),p=end(cur,th);placeMk(p[0],p[1],-th);}
else if(mode==='fly'){fl.u=Math.min(1,fl.u+dt/0.72);var u=fl.u,x=fl.p0[0]+(fl.p1[0]-fl.p0[0])*u,y=fl.p0[1]+(fl.p1[1]-fl.p0[1])*u-fl.hh*Math.sin(Math.PI*u);cam=fl.c0+(fl.c1-fl.c0)*u;placeMk(x,y,0.5*Math.sin(Math.PI*2*u));
var fe=fEls[cur];if(fe&&!fe.classList.contains('got')&&Math.abs(x-(vx(cur)+GAP/2))<24&&Math.abs(y-fy[cur])<22){fe.classList.add('got');got++;tone(988,.08,'triangle');info();}
if(u>=1){cur++;phi=Math.asin(-0.42/A);mode='swing';info();if(cur>=N){mode='done';c.T.after(function(){w.querySelector('.cm-jtree').classList.add('yay');},200);c.T.after(function(){c.end(got>=N?'You grabbed ALL the fruit!':'You made it to the treehouse!',got>=N?'Mochi leaped across all '+N+' vines and grabbed every piece of fruit! 🍌🍓🥭 Amazing!':'Mochi grabbed <b>'+got+'</b> of '+N+' fruit. Can you grab them all next time? 🍓');},1300);}}}
else if(mode==='fall'){fall.t+=dt;if(fall.y<168){fall.vy+=520*dt;fall.x+=fall.vx*dt;fall.y=Math.min(168,fall.y+fall.vy*dt);}placeMk(fall.x,fall.y,Math.sin(fall.t*12)*0.2);
if(fall.t>1.3){mode='swing';phi=0;}}
});
},
/* ---------- Beach: Ice Cream Stand ---------- */
beach:function(c){
var FL=[['Strawberry','#f9a8d4'],['Mint','#a7f3d0'],['Chocolate','#b7793f'],['Vanilla','#fff7d6'],['Blueberry','#93c5fd'],['Mango','#fdba74']],
CUST=shuffle(['🐶','🐱','🐰','🐸','🐼','🦊','🐨','🐯','🐷','🐧','🦁','🐻']),N=8,n=0,tips=0,order=null,cone=[],cherry=false,busy=false,t0=0;
function coneHTML(a,ch){return '<div class="cm-icone">'+(ch?'<em>🍒</em>':'')+a.slice().reverse().map(function(i){return '<i style="--pc:'+FL[i][1]+'"></i>';}).join('')+'<b></b></div>';}
c.lay.innerHTML='<div class="cm-iawn"></div><img class="cm-imk" src="'+monkeyURI(S.look)+'" alt=""><div class="cm-icounter"></div><div class="cm-imake" data-r="mk"></div><div class="cm-icust" data-r="cu"><span data-r="face"></span></div><div class="cm-ibub" data-r="bub"></div>';
c.panel('<div class="cm-itubs">'+FL.map(function(f,i){return '<button class="cm-itub" data-f="'+i+'" style="--pc:'+f[1]+'"><i></i><small>'+f[0]+'</small></button>';}).join('')+'<button class="cm-itub" data-f="ch"><em>🍒</em><small>Cherry</small></button></div><div class="cm-row cm-ibtns"><button class="cm-bigbtn alt" data-r="trash">🗑️ Start over</button></div>');
var mkA=q(c.lay,'mk'),cu=q(c.lay,'cu'),bub=q(c.lay,'bub'),face=q(c.lay,'face');
function paint(){mkA.innerHTML=cone.length||cherry?coneHTML(cone,cherry):'<div class="cm-icone empty"><b></b></div>';if(typeof ready==='function')ready();}
function info(){c.setProb('🍦 Customer '+Math.min(n+1,N)+' / '+N+'   ·   🪙 '+tips+' tips');}
function showOrder(){bub.innerHTML='<small>One of these, please!</small>'+coneHTML(order.s,order.ch);}
function next(){
var size=n<2?1:n<5?2:3,s=[];for(var i=0;i<size;i++)s.push(rnd(0,FL.length-1));order={s:s,ch:n>=3&&Math.random()<.55};
cone=[];cherry=false;paint();face.textContent=CUST[n%CUST.length];cu.className='cm-icust in';bub.className='cm-ibub';showOrder();t0=Date.now();busy=false;info();
}
c.on(c.panelEl,'click',function(e){
var b=e.target.closest('button');if(!b||busy||!order)return;var f=b.getAttribute('data-f'),r=b.getAttribute('data-r');
if(f==='ch'){if(!cone.length){bub.innerHTML='<small>Scoops first, then the cherry!</small>';c.T.after(showOrder,1100);return;}cherry=!cherry;tone(1046,.06,'triangle');paint();}
else if(f!=null){if(cone.length>=3||cherry)return;cone.push(+f);tone(600+cone.length*120,.07,'triangle');paint();}
else if(r==='trash'){cone=[];cherry=false;paint();tone(300,.08,'sine');}
});
function ready(){cu.classList.toggle('want',cone.length>0);}
c.on(cu,'click',serve);c.on(bub,'click',serve);
function serve(){
if(busy||!order)return;if(!cone.length){bub.innerHTML='<small>Make my ice cream first! 🍦</small>';c.T.after(function(){if(order&&!busy)showOrder();},1100);return;}
var ok=cone.length===order.s.length&&cone.every(function(v,i){return v===order.s[i];})&&cherry===order.ch;
if(ok){busy=true;cu.classList.remove('want');mkA.classList.add('give');c.T.after(function(){mkA.classList.remove('give');cone=[];cherry=false;paint();},800);var tip=1+(Date.now()-t0<9000?1:0);tips+=tip;n++;sfxGood();bub.innerHTML='<b class="cm-iyum">Yum! ❤️</b><small>+'+tip+' 🪙 tip'+(tip>1?'s':'')+'</small>';cu.classList.add('happy');
c.say(80,30,'+'+tip+' 🪙');info();c.T.after(function(){cu.className='cm-icust out';},900);
c.T.after(function(){if(n>=N)c.end('Mochi’s ice cream stand was a hit!','You served <b>'+N+'</b> happy customers and earned <b>'+tips+'</b> tips 🪙');else next();},1500);}
else{sfxBad();bub.innerHTML='<small>Hmm… that’s not what I ordered!</small>';cu.classList.remove('nope');void cu.offsetWidth;cu.classList.add('nope');c.T.after(function(){if(order)showOrder();},1300);}
}
next();
},
/* ---------- Party: presents + candles ---------- */
party:function(c){
var ALL=[['🧸','a teddy bear'],['🪀','a yo-yo'],['🚂','a toy train'],['🎨','a paint set'],['🦄','a unicorn'],['🪁','a kite'],['🎸','a guitar'],['⚽','a soccer ball'],['🔭','a telescope'],['🛼','roller skates'],['🧩','a puzzle'],['🎺','a trumpet'],['🚁','a toy helicopter'],['📚','a stack of books']];
var G=shuffle(ALL.slice()).slice(0,6),cols=shuffle(['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#ec4899']),opened=0,ps=[[44,40],[62,40],[80,40],[44,72],[62,72],[80,72]],stage='gifts';
c.lay.innerHTML='<img class="cm-pmk" src="'+monkeyURI(S.look)+'" alt=""><div class="cm-pgot" data-r="got"></div>'+G.map(function(g,i){return '<button class="cm-gift cm-ac-party pat'+(i%5)+'" data-i="'+i+'" data-s="0" style="left:'+ps[i][0]+'%;top:'+ps[i][1]+'%;--pc:'+cols[i]+'" aria-label="Present"><i class="lid"></i><i class="bx"></i><span class="cm-gnext">✂️</span></button>';}).join('')+'<div class="cm-preveal" data-r="rv"></div>';
var got=q(c.lay,'got'),rv=q(c.lay,'rv');
c.setProb('🎁 Presents opened: 0 / 6');
c.on(c.lay,'click',function(e){
var b=e.target.closest('.cm-gift');if(b&&stage==='gifts'){var s=+b.getAttribute('data-s');if(s>=3)return;s++;b.setAttribute('data-s',s);
var nx=b.querySelector('.cm-gnext');
if(s===1){b.insertAdjacentHTML('beforeend','<span class="cm-snip">✂️</span><i class="cm-rib l"></i><i class="cm-rib r"></i>');b.classList.add('unr');tone(880,.05,'square');tone(988,.05,'square',.12);if(nx)nx.textContent='🎁';}
else if(s===2){var pc=b.style.getPropertyValue('--pc'),sc='';for(var k=0;k<6;k++)sc+='<i class="cm-scrap" style="--pc:'+pc+';--rx:'+rnd(-90,90)+'px;--ry:'+rnd(-90,-30)+'px;--rr:'+rnd(-200,200)+'deg"></i>';b.insertAdjacentHTML('beforeend',sc);b.classList.add('unw');for(var k2=0;k2<4;k2++)tone(rnd(300,700),.04,'sawtooth',k2*.05);if(nx)nx.textContent='📦';}
else{var g=G[+b.getAttribute('data-i')];if(nx)nx.remove();b.classList.add('open');tone(784,.1,'triangle');tone(1046,.16,'triangle',.08);opened++;c.setProb('🎁 Presents opened: '+opened+' / 6');
rv.innerHTML='<span>'+g[0]+'</span><b>You got '+g[1]+'!</b>';rv.className='cm-preveal show';
c.T.after(function(){rv.className='cm-preveal';got.insertAdjacentHTML('beforeend','<i>'+g[0]+'</i>');b.classList.add('gone');if(opened>=6)cake();},1500);}
return;}
var cd=e.target.closest('.cm-candle');if(cd&&stage==='cake'&&!cd.classList.contains('out')){cd.classList.add('out');tone(330,.1,'sine');var left=c.lay.querySelectorAll('.cm-candle:not(.out)').length;if(!left){stage='done';sing();}}
});
function cake(){stage='cake';c.setProb('🎂 Tap the candles to blow them out!');
var cs='';for(var i=0;i<5;i++)cs+='<button class="cm-candle" style="left:'+(22+i*14)+'%" aria-label="Candle"><i></i></button>';
c.lay.insertAdjacentHTML('beforeend','<div class="cm-cake">'+cs+'<div class="t2"></div><div class="t1"></div></div>');}
function sing(){c.setProb('🎉 Happy Birthday, '+esc(S.mname)+'!');confetti(c.f);
var HB=[[392,.3],[392,.15],[440,.45],[392,.45],[523,.45],[494,.9],[392,.3],[392,.15],[440,.45],[392,.45],[587,.45],[523,.9]],tt=.2;HB.forEach(function(n){tone(n[0],n[1]*.95,'triangle',tt);tt+=n[1]+.05;});
c.T.after(function(){c.end('Happy Birthday, '+esc(S.mname)+'!','You opened all 6 presents and blew out every candle! 🎂',true);},Math.round(tt*1000)+300);}
},
/* ---------- Snow: Ski Run ---------- */
snow:function(c){
var LEN=3300,cam=0,v=118,y=0,vy=0,air=false,crash=0,flakes=0,done=false,X=82,objs=[],wx=420,hits=0;
while(wx<LEN-250){objs.push({x:wx,k:Math.random()<.6?'rock':'snow'});var fx=wx+rnd(70,110);if(fx<LEN-200)objs.push({x:fx,k:'flake',h:rnd(26,62)});wx+=rnd(190,300);}
var trees=[];for(var tx=0;tx<LEN+300;tx+=rnd(50,90))trees.push(tx);
var mt='<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">'+BG.snow+'</svg>';
c.lay.innerHTML='<div class="cm-kmts" data-r="mts">'+mt+mt+'</div><div class="cm-ktrees" data-r="tr">'+trees.map(function(){return '<span>🌲</span>';}).join('')+'</div><svg class="cm-kground" viewBox="0 0 300 200" preserveAspectRatio="none"><path data-r="g" fill="#fff" stroke="#bfdbfe" stroke-width="2"/></svg>'+
objs.map(function(o){return '<span class="cm-kob '+o.k+'">'+(o.k==='rock'?'🪨':o.k==='snow'?'⛄':'❄️')+'</span>';}).join('')+'<span class="cm-kob lodge">🏠🚩</span><div class="cm-skier" data-r="sk"><img src="'+monkeyURI(S.look)+'" alt=""><i></i></div>';
var mts=q(c.lay,'mts'),tr=q(c.lay,'tr'),gp=q(c.lay,'g'),sk=q(c.lay,'sk'),oEls=c.lay.querySelectorAll('.cm-kob'),tEls=tr.querySelectorAll('span');
c.f.classList.add('cm-skirun');
function gy(sx){return 112+0.22*(sx-150)+10*Math.sin((sx+cam)/48);}
function patrol(){
var p=document.createElement('div');p.className='cm-patrol';p.innerHTML='<div class="cot"><img src="'+monkeyURI(S.look)+'" alt=""><i class="cross"></i></div><span class="pp">🧑‍⚕️</span><span class="flag">⛑️ SKI PATROL</span>';c.lay.appendChild(p);
function at(sx,ms){p.style.transition=ms?'left '+ms+'ms ease-in-out,top '+ms+'ms ease-in-out':'none';vpos(p,sx,gy(sx));}
at(345,0);c.setProb('🚑 Ski patrol is on the way!');[880,660,880,660].forEach(function(f,i){tone(f,.14,'square',i*.18);});
c.T.after(function(){at(X+14,1100);},350);
c.T.after(function(){sk.style.visibility='hidden';p.classList.add('loaded');tone(523,.12,'triangle');c.setProb('🤕 Mochi is going to the lodge to rest');},1600);
c.T.after(function(){at(-70,1700);},2300);
c.T.after(function(){c.fail('Mochi got hurt!','Mochi bumped into 3 things, so the ski patrol 🚑 carried Mochi to the lodge to rest. Remember to <b>tap to JUMP</b> over the rocks 🪨 and snowmen ⛄! Ready to start over from the top?');},4100);
}
function jump(){if(!air&&!done&&crash<=0){air=true;vy=-245;tone(660,.08,'triangle');}}
c.on(c.f,'pointerdown',function(e){if(e.target.closest('.cm-overlay'))return;jump();});
c.on(document,'keydown',function(e){if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}});
c.loop(function(dt){
if(!done){cam+=(crash>0?40:v)*dt;if(crash>0)crash-=dt;}
var s=c.W()/300,d='M0 200 ';for(var sx=0;sx<=300;sx+=10)d+='L'+sx+' '+gy(sx).toFixed(1)+' ';gp.setAttribute('d',d+'L300 200 Z');
mts.style.transform='translateX('+(-(cam*0.12*s)%(c.W()))+'px)';
tEls.forEach(function(e,i){var sx=trees[i]-cam*0.55;if(sx<-20||sx>320){e.style.display='none';return;}e.style.display='';vpos(e,sx,gy(sx)-58+((i*37)%14));});
var g=gy(X);if(air){vy+=590*dt;y+=vy*dt;if(y>=0){y=0;air=false;}}
var slope=Math.atan((gy(X+4)-gy(X-4))/8);
sk.style.left=(X/3)+'%';sk.style.top=((g+Math.min(0,y))/2)+'%';sk.style.transform='translate(-50%,-100%) rotate('+(crash>0?crash*720:slope*57.3)+'deg)';
objs.forEach(function(o,i){var e=oEls[i],sx=o.x-cam;if(sx<-20||sx>320){e.style.display='none';return;}e.style.display='';vpos(e,sx,gy(sx)-(o.k==='flake'?o.h:0));
if(o.done)return;
if(o.k==='flake'){if(Math.abs(sx-X)<14&&Math.abs((-y)-(o.h-14))<22){o.done=true;e.classList.add('got');flakes++;tone(1175,.08,'triangle');}}
else if(!done&&Math.abs(sx-X)<11&&-y<(o.k==='snow'?19:15)){o.done=true;e.classList.add('hit');crash=0.75;hits++;tone(180,.25,'sine');c.say(X,gy(X)-60,hits>=3?'Ouch! 🤕':'Bump! '+(3-hits)+' ❤️ left');
if(hits>=3){done=true;sk.classList.add('hurt');patrol();}}
});
var le=oEls[oEls.length-1],lx=LEN-cam;if(lx<330){le.style.display='';vpos(le,lx,gy(lx));}else le.style.display='none';
c.setProb('❤️'.repeat(Math.max(0,3-hits))+'🤍'.repeat(Math.min(3,hits))+'   ⛷️ '+Math.min(100,Math.round(cam/(LEN-80)*100))+'%   ·   ❄️ '+flakes);
if(!done&&cam>=LEN-80){done=true;sk.classList.add('safe');c.T.after(function(){c.end('You made it down safely!','Mochi skied all the way down the mountain'+(hits?'':' without a single bump')+' and caught <b>'+flakes+'</b> snowflake'+(flakes===1?'':'s')+'! ❄️ Hot cocoa time at the lodge ☕');},700);}
});
},
/* ---------- Soccer: Stadium Shootout ---------- */
soccer:function(c){
var N=8,shot=0,goals=0,busy=false;
c.lay.innerHTML='<div class="cm-sgoal" data-r="goal"><div class="cm-gk" data-r="gk"><svg viewBox="0 0 60 70" aria-hidden="true"><circle cx="30" cy="16" r="12" fill="#f6c995"/><path d="M14 66 Q12 34 30 30 Q48 34 46 66 Z" fill="#f97316"/><circle cx="8" cy="34" r="7" fill="#22c55e"/><circle cx="52" cy="34" r="7" fill="#22c55e"/><circle cx="26" cy="15" r="2" fill="#2a1a10"/><circle cx="34" cy="15" r="2" fill="#2a1a10"/></svg></div></div><div class="cm-sball" data-r="ball">⚽</div><img class="cm-smk" src="'+monkeyURI(S.look)+'" alt="">';
var goal=q(c.lay,'goal'),gk=q(c.lay,'gk'),ball=q(c.lay,'ball');
function info(){c.setProb('⚽ Goals: '+goals+'   ·   Shot '+Math.min(shot+1,N)+' of '+N);}
info();
c.on(goal,'pointerdown',function(e){
if(busy||shot>=N)return;busy=true;var r=goal.getBoundingClientRect(),gr=gk.getBoundingClientRect(),tx=(e.clientX-r.left)/r.width*100,ty=(e.clientY-r.top)/r.height*100;
tx=Math.max(6,Math.min(94,tx));ty=Math.max(8,Math.min(92,ty));
var gx=(gr.left+gr.width/2-r.left)/r.width*100,reach=20+rnd(0,12)-(ty<35?7:0)-((tx<18||tx>82)?6:0),dist=Math.abs(gx-tx),saved=dist<reach;
gk.classList.add('dive');gk.style.left=(saved?tx:gx+Math.sign(tx-gx)*reach*0.8)+'%';gk.style.transform='translateX(-50%) rotate('+(tx<gx?-35:35)+'deg)';
var fx=18+64*tx/100,fy=10+44*ty/100;ball.classList.add('kick');ball.style.left=fx+'%';ball.style.top=fy+'%';tone(330,.06,'square');shot++;
c.T.after(function(){
if(saved){ball.style.top=(fy+30)+'%';c.say(fx*3,fy*2,'Saved! 🧤');tone(220,.2,'sine');}
else{goals++;goal.classList.remove('net');void goal.offsetWidth;goal.classList.add('net');c.say(fx*3-20,fy*2,'GOOOAL!');confetti(c.f);[523,659,784,1047].forEach(function(f,i){tone(f,.15,'triangle',i*.08);});}
info();
},560);
c.T.after(function(){ball.classList.remove('kick');ball.style.left='';ball.style.top='';gk.classList.remove('dive');gk.style.left='';gk.style.transform='';busy=false;
if(shot>=N)c.end('Full time!','You scored <b>'+goals+'</b> of '+N+' shots! '+(goals>=6?'What a superstar! 🌟':goals>=3?'Great shooting! ⚽':'The crowd loved it! 📣'));},1600);
});
},
/* ---------- Opera: Opera Star ---------- */
opera:function(c){
var C4=261.6,D4=293.7,E4=329.6,F4=349.2,G4=392,A4=440,L1=[C4,C4,G4,G4,A4,A4,G4],L2=[F4,F4,E4,E4,D4,D4,C4],L3=[G4,G4,F4,F4,E4,E4,D4];
var song=[].concat(L1,L2,L3,L3,L1,L2),notes=[],tt=2.4,TRAV=2.3,hits=0,perf=0,t0=0,over=false;
song.forEach(function(f,i){notes.push({t:tt,f:f});tt+=(i%7===6)?1.05:0.52;});
c.lay.innerHTML='<div class="cm-olane"><div class="cm-oring"></div><div data-r="nl"></div></div><img class="cm-omk" data-r="mk" src="'+monkeyURI(S.look)+'" alt=""><div class="cm-ometer"><i data-r="m"></i></div><div class="cm-oaud">'+seq(16).map(function(i){return '<i style="--h:'+(70+((i*37)%30))+'%"></i>';}).join('')+'</div>';
var nl=q(c.lay,'nl'),mk=q(c.lay,'mk'),meter=q(c.lay,'m');
notes.forEach(function(n){var e=document.createElement('span');e.className='cm-onote2';e.textContent='♪';nl.appendChild(e);n.el=e;});
t0=performance.now()/1000;
function now(){return performance.now()/1000-t0;}
var cool=0;function tap(){if(over)return;var t=now(),best=null,bd=1;if(t<cool)return;notes.forEach(function(n){if(n.hit||n.miss)return;var d=Math.abs(t-n.t);if(d<bd){bd=d;best=n;}});
if(!best||bd>=0.24){cool=t+0.35;return;}
if(best&&bd<0.24){best.hit=true;hits++;if(bd<0.1)perf++;best.el.classList.add('hit');tone(best.f*2,.38,'sine');mk.classList.remove('sing');void mk.offsetWidth;mk.classList.add('sing');c.say(34,70,bd<0.1?'Perfect! ♪':'♪');meter.style.width=Math.round(hits/notes.length*100)+'%';}}
c.on(c.f,'pointerdown',function(e){if(e.target.closest('.cm-overlay'))return;tap();});
c.on(document,'keydown',function(e){if(e.code==='Space'){e.preventDefault();tap();}});
c.loop(function(){var t=now();notes.forEach(function(n){var u=(n.t-t)/TRAV;if(u>1.05||n.hit&&t-n.t>.4){n.el.style.display='none';return;}n.el.style.display='';n.el.style.left=(22+u*76)+'%';if(!n.hit&&!n.miss&&t-n.t>0.26){n.miss=true;n.el.classList.add('miss');}});
c.setProb('🎭 Notes sung: '+hits+' / '+notes.length);
if(!over&&t>tt+0.8){over=true;bravo();}});
function bravo(){c.setProb('🌹 Bravo! Bravo!');mk.classList.add('bow');var roses='';for(var i=0;i<26;i++)roses+='<span class="cm-rose" style="left:'+rnd(4,96)+'%;animation-delay:'+(Math.random()*1.4).toFixed(2)+'s">'+pick(['🌹','🌹','💐','🌸'])+'</span>';c.lay.insertAdjacentHTML('beforeend',roses);
for(var k=0;k<22;k++)tone(rnd(900,1600),.03,'square',k*.07);
c.T.after(function(){c.end('Bravo! Bravissimo!',esc(S.mname)+' sang <b>'+hits+'</b> of '+notes.length+' notes'+(perf?' ('+perf+' perfect!)':'')+' and the audience threw roses! 🌹');},2800);}
},
/* ---------- Space: Star Flight ---------- */
space:function(c){
var DUR=34,t=0,y=100,ty=100,stars=0,objs=[],spawn=0,bump=0,done=false,keys={};
var bg='<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">'+BG.space+'</svg>';
c.lay.innerHTML='<div class="cm-sfar" data-r="far">'+bg+bg+'</div><div data-r="ob"></div><div class="cm-srk" data-r="rk"><svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 30 L0 14 L22 22 Z M8 30 L0 46 L22 38 Z" fill="#ef4444"/><path d="M14 30 Q30 8 80 10 Q108 16 118 30 Q108 44 80 50 Q30 52 14 30 Z" fill="#f1f5f9"/><path d="M92 12 Q110 18 118 30 Q110 42 92 48 Q102 30 92 12 Z" fill="#ef4444"/><circle cx="60" cy="30" r="15" fill="#bae6fd" stroke="#64748b" stroke-width="3"/></svg><div class="cm-srkw"><img src="'+monkeyURI(S.look)+'" alt=""></div><i class="fl"></i></div><div class="cm-splanet" data-r="pl"><span class="flag">🚩</span></div>';
var far=q(c.lay,'far'),ob=q(c.lay,'ob'),rk=q(c.lay,'rk'),pl=q(c.lay,'pl');
function setTy(e){var r=c.f.getBoundingClientRect();ty=Math.max(22,Math.min(178,(e.clientY-r.top)/r.height*200));}
c.on(c.f,'pointerdown',function(e){if(e.target.closest('.cm-overlay'))return;setTy(e);});
c.on(c.f,'pointermove',function(e){if(e.buttons||e.pointerType==='mouse')setTy(e);});
c.on(document,'keydown',function(e){if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();keys[e.code]=1;}});
c.on(document,'keyup',function(e){keys[e.code]=0;});
c.loop(function(dt){
if(done)return;t+=dt;if(keys.ArrowUp)ty=Math.max(22,ty-170*dt);if(keys.ArrowDown)ty=Math.min(178,ty+170*dt);
y+=(ty-y)*Math.min(1,dt*6);if(bump>0)bump-=dt;
far.style.transform='translateX('+(-(t*14*c.W()/300)%c.W())+'px)';
rk.style.left='20%';rk.style.top=(y/2)+'%';rk.style.transform='translate(-50%,-50%) rotate('+(bump>0?Math.sin(bump*30)*25:(ty-y)*0.25)+'deg)';
spawn-=dt;if(t<DUR-3&&spawn<=0){spawn=0.55+Math.random()*.4;var rock=Math.random()<.38,e=document.createElement('span');e.className='cm-sob '+(rock?'rock':'star');e.innerHTML=rock?'<i></i>':'⭐';ob.appendChild(e);objs.push({x:320,y:rnd(24,176),v:rock?rnd(80,115):rnd(90,120),rock:rock,el:e});}
objs=objs.filter(function(o){o.x-=o.v*dt;if(o.x<-20||o.gone){o.el.remove();return false;}vpos(o.el,o.x,o.y);
if(Math.abs(o.x-60)<(o.rock?20:18)&&Math.abs(o.y-y)<(o.rock?18:20)){if(o.rock){if(bump<=0){bump=0.6;tone(150,.2,'sine');c.say(60,y-30,'Bonk!');}}else{o.gone=true;stars++;tone(1046+((stars%5)*80),.07,'triangle');}}
return true;});
c.setProb('🚀 ⭐ '+stars+' stars   ·   '+Math.max(0,Math.ceil(DUR-t))+'s to the planet');
if(t>=DUR){done=true;pl.classList.add('in');rk.style.transition='left 1.4s ease-in-out,top 1.4s ease-in-out,transform 1.4s';c.T.after(function(){rk.style.left='76%';rk.style.top='44%';rk.style.transform='translate(-50%,-50%) rotate(20deg) scale(.8)';},500);
c.T.after(function(){pl.classList.add('flagged');tone(784,.12,'triangle');tone(1046,.2,'triangle',.12);},2100);
c.T.after(function(){c.end('Touchdown on a new planet!',esc(S.mname)+' collected <b>'+stars+'</b> star'+(stars===1?'':'s')+' on the way! ⭐');},3000);}
});
},
/* ---------- Palace: Royal Fireworks ---------- */
palace:function(c){
var DUR=30,t0=performance.now()/1000,n=0,combo=0,best=0,last=0,over=false,COL=['#f43f5e','#facc15','#22d3ee','#a3e635','#c084fc','#fb923c','#f472b6','#ffffff'];
c.lay.innerHTML='<div class="cm-fnight">'+seq(30).map(function(i){return '<i style="left:'+((i*37)%100)+'%;top:'+((i*53)%60)+'%;animation-delay:'+(i%7)*.3+'s"></i>';}).join('')+'</div><div data-r="fx"></div><img class="cm-fmk" src="'+monkeyURI(S.look,'')+'" alt="">';
var fx=q(c.lay,'fx');
function burst(x,y,big){
var col=pick(COL),col2=pick(COL),k=big?28:20,r=big?34:24,e=document.createElement('div');e.className='cm-fwb';vpos(e,x,y);
var h='<b style="--c:'+col+'"></b>';for(var i=0;i<k;i++){var a=i/k*Math.PI*2,rr=r*(0.7+Math.random()*0.5);h+='<i style="--c:'+(i%3?col:col2)+';--dx:'+(Math.cos(a)*rr).toFixed(1)+'cqw;--dy:'+(Math.sin(a)*rr).toFixed(1)+'cqw"></i>';}
e.innerHTML=h;fx.appendChild(e);tone(rnd(140,220),.18,'sawtooth');tone(rnd(1200,1800),.05,'triangle',.05);setTimeout(function(){e.remove();},1300);}
function launch(x,y,big){var s=document.createElement('span');s.className='cm-fws';vpos(s,x,200);fx.appendChild(s);void s.offsetWidth;s.style.top=(y/2)+'%';tone(500,.12,'sine');setTimeout(function(){s.remove();burst(x,y,big);},420);}
c.on(c.f,'pointerdown',function(e){if(over||e.target.closest('.cm-overlay'))return;var r=c.f.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*300,y=Math.min(130,(e.clientY-r.top)/r.height*200);
var t=performance.now()/1000;combo=t-last<0.8?combo+1:1;last=t;best=Math.max(best,combo);n++;launch(x,y,combo>=4);if(combo>=3)c.say(x,y-20,'×'+combo+' combo!');});
c.loop(function(){var t=performance.now()/1000-t0;c.setProb('🎆 '+n+' fireworks   ·   ⏱ '+Math.max(0,Math.ceil(DUR-t))+'s');
if(!over&&t>=DUR){over=true;c.setProb('👑 Grand finale!');for(var i=0;i<14;i++)(function(i){c.T.after(function(){launch(rnd(30,270),rnd(25,110),true);},i*160);})(i);
c.T.after(function(){c.end('What a royal celebration!','You launched <b>'+n+'</b> fireworks over the palace'+(best>=3?' — best combo ×'+best+'!':'!')+' 🎆');},3400);}});
}
};
function gFun(box,id){
var F=FUN[id];
box.innerHTML=gHead(F.icon+' '+F.name)+'<div class="cm-af cm-fun cm-fn-'+id+'" data-r="f"><svg class="cm-afbg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+(ADV_TH[id]&&ADV_TH[id].bg?ADV_TH[id].bg():(BG[id]||''))+'</svg><div class="cm-aflay" data-r="lay"></div><div class="cm-overlay hide" data-r="ov"></div></div><div data-r="panel"></div><p class="cm-tip">'+F.tip+'</p>';
var c={f:q(box,'f'),lay:q(box,'lay'),ov:q(box,'ov'),probEl:q(box,'prob'),panelEl:q(box,'panel'),T:null,_loops:[],_h:[]};
c.W=function(){return c.f.clientWidth||300;};
c.setProb=function(t){c.probEl.textContent=t;};
c.panel=function(h){c.panelEl.innerHTML='<div class="cm-funpanel">'+h+'</div>';};
c.say=function(x,y,t){floatText(c.f,c.W()*x/300-30,c.f.clientHeight*y/200,t);};
c.loop=function(fn){var me={on:true},last=0;function step(ts){if(!me.on)return;var dt=last?Math.min(.05,(ts-last)/1000):0;last=ts;try{fn(dt);}catch(err){me.on=false;if(window.console)console.error(err);}requestAnimationFrame(step);}requestAnimationFrame(step);c._loops.push(me);};
c.on=function(el,ev,fn){el.addEventListener(ev,fn);c._h.push([el,ev,fn]);};
c.stop=function(){c._loops.forEach(function(m){m.on=false;});c._loops=[];if(c.T)c.T.clear();c._h.forEach(function(h){h[0].removeEventListener(h[1],h[2]);});c._h=[];};
c.end=function(title,msg){c.stop();sfxWin();confetti(c.f);showOv2(c.ov,yayMochi()+'<h3>'+title+'</h3><p>'+msg+'</p>',[['Play again',start],['👕 Dress up',function(){go('kids/monkey');},'alt'],['🎮 Math games',function(){go('kids');},'alt']]);};
c.fail=function(title,msg){c.stop();sfxBad();showOv2(c.ov,'<div class="cm-ovemoji">🤕</div><h3>'+title+'</h3><p>'+msg+'</p>',[['Try again ▶',start,'next'],['👕 Dress up',function(){go('kids/monkey');},'alt']]);};
onCleanup(function(){c.stop();});
function start(){c.stop();c.T=timers();c.lay.innerHTML='';c.panelEl.innerHTML='';c.f.classList.remove('cm-skirun');FUN_G[id](c);}
c.setProb(F.icon+' '+F.name);box.querySelector('[data-r="stats"]').innerHTML=chip('🎉 Just for fun');
showOv(c.ov,'<div class="cm-ovemoji">'+F.icon+'</div><h3>'+F.name+'</h3><p>'+F.intro+'</p>','Let’s go! ▶',start);
}
function vFun(id){
var sc=SCENES.filter(function(s){return s.id===id;})[0];if(!sc||!FUN[id])return go('kids/monkey');
var back='<a href="#cm/kids/monkey" data-go="kids/monkey">← Back to '+esc(S.mname)+'’s Adventures</a>';
if(!sceneOpen(sc)){view.innerHTML='<div class="cm-crumbs">'+back+'</div><div class="cm-game" style="text-align:center"><div class="cm-ovemoji">🔒</div><h2 class="cm-gtitle">'+FUN[id].name+'</h2><p style="font-weight:700">This game comes with the <b>'+sc.icon+' '+sc.name+'</b> trip. Earn <b>'+(sc.need-S.bananas)+'</b> more bananas to unlock it!</p><p><a class="cm-bigbtn" href="#cm/kids" data-go="kids">Go play ▶</a></p></div>';return;}
view.innerHTML='<div class="cm-crumbs">'+back+'<span class="cm-chip">'+sc.icon+' '+sc.name+'</span></div><div class="cm-game" id="cm-g"></div>';
gFun(view.querySelector('#cm-g'),id);
}

var MATHX=[{id:'vine',th:'jungle',c:'#bbf7d0'},{id:'scoops',th:'beach',c:'#fde68a'},{id:'gifts',th:'party',c:'#fbcfe8'},{id:'lift',th:'snow',c:'#bae6fd'},{id:'kicks',th:'soccer',c:'#86efac'},{id:'notes',th:'opera',c:'#fecaca'},{id:'planets',th:'space',c:'#c7d2fe'},{id:'jewels',th:'palace',c:'#e9d5ff'}];
function mxById(id){return MATHX.filter(function(m){return m.id===id;})[0];}
function mxCards(mini){return MATHX.map(function(m){var A=ADV[m.th];return '<a href="#cm/kids/'+m.id+'" data-go="kids/'+m.id+'" class="cm-kcard'+(mini?' mini':'')+'" style="--c:'+m.c+'"><div class="cm-kicon">'+A.icon+'</div><h3>'+A.game+'</h3>'+(mini?'':'<p>'+A.d+'</p>')+'<span class="cm-play">Play ▶</span></a>';}).join('');}
/* ================= VIEWS ================= */
function vHome(){
var topics=COURSES.reduce(function(s,c){return s+c.topics.length;},0),nThink=Object.keys(THINK).length;
view.innerHTML='<section class="cm-hero"><div><h1>Math is way more fun with a <span>monkey</span>.</h1><p>Free games and step-by-step help for every kid and every student — from 1st grade counting all the way to college calculus.</p></div><a class="cm-hero-m" href="#cm/kids/monkey" data-go="kids/monkey" title="Dress up '+esc(S.mname)+'">'+monkeyFull(S.look,'cm-bounce')+'<span class="cm-tapme">👕 Tap '+esc(S.mname)+' to dress up!</span></a></section>'+
'<div class="cm-doors"><a class="cm-door kids" href="#cm/kids" data-go="kids"><span class="cm-dtag">Grades 1 – 6</span><h2>Kids Jungle</h2><p>Fast-fact games, step-by-step puzzles for every grade, and a monkey to dress up and send on adventures!</p><span class="cm-dgo">Let’s play! →</span><span class="cm-dart jm" aria-hidden="true"><i class="jv"></i>'+monkeyFull(S.look,'','yay')+'</span></a>'+
'<a class="cm-door lab" href="#cm/lab" data-go="lab"><span class="cm-dtag">Grades 7 – College</span><h2>Big Brain Lab</h2><p>Step-by-step lessons by grade and topic, instant solvers, and brain games for big kids who like to have fun too.</p><span class="cm-dgo">Enter the lab →</span><span class="cm-dart">🧠</span></a></div>'+
'<div class="cm-feats"><div class="cm-feat"><b>'+(KGAMES.length+nThink)+'</b>jungle games</div><div class="cm-feat"><b>'+SCENES.length+'</b>monkey adventures</div><div class="cm-feat"><b>'+COURSES.length+'</b>courses, '+topics+' topics</div><div class="cm-feat"><b>'+TOOLS.length+'</b>step-by-step solvers</div></div>';
}
function myBanner(){
var nx=nextScene(),prev=SCENES.filter(function(s){return s.need<=S.bananas;}).pop(),pct=nx?Math.round((S.bananas-prev.need)/(nx.need-prev.need)*100):100;
return '<section class="cm-mybar"><div class="cm-mbscene" data-go="kids/monkey" role="link" tabindex="0" aria-label="Dress up your monkey">'+sceneSVG(S.scene,S.look)+'<span class="cm-mbtag">'+sceneById(S.scene).icon+' '+sceneById(S.scene).name+'</span><a class="cm-advplay" href="#cm/kids/fun-'+S.scene+'" data-go="kids/fun-'+S.scene+'">🎉 Play '+FUN[S.scene].icon+' '+FUN[S.scene].name+'</a></div>'+
'<div class="cm-mbinfo"><p class="cm-mbkick">🐒 Your monkey</p><h1 class="cm-h1">'+esc(S.mname)+'’s <span class="cm-hl">Adventures</span></h1>'+
'<p class="cm-lead">Every right answer earns a banana. Bananas send '+esc(S.mname)+' on new trips — with new clothes to wear there!</p>'+
'<div class="cm-mbban">🍌 <b>'+S.bananas+'</b> banana'+(S.bananas===1?'':'s')+' earned</div>'+
(nx?'<div class="cm-next"><div>Next trip: <b>'+nx.icon+' '+nx.name+'</b></div><div class="cm-kmeter"><i style="width:'+pct+'%"></i></div><small><b>'+(nx.need-S.bananas)+'</b> more banana'+(nx.need-S.bananas===1?'':'s')+' to go!</small></div>':'<div class="cm-next"><b>🏆 Every adventure unlocked!</b></div>')+
'<div class="cm-stamps">'+SCENES.map(function(sc){var o=sceneOpen(sc);return '<span class="'+(o?'on':'')+'" title="'+sc.name+(o?'':' — '+sc.need+' 🍌')+'">'+(o?sc.icon:'🔒')+'</span>';}).join('')+'</div>'+
'<div class="cm-row"><a class="cm-bigbtn" href="#cm/kids/monkey" data-go="kids/monkey">👕 Dress up &amp; explore</a>'+(S.newsc?'<span class="cm-newb">✨ NEW trip unlocked!</span>':'')+'</div></div></section>';
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function vKids(){if(PENDING_ADV)setTimeout(announceAdv,600);
var g=+S.grade;
view.innerHTML=myBanner()+
'<h2 class="cm-h2">1. Pick your grade</h2><div class="cm-grades">'+[1,2,3,4,5,6].map(function(n){return '<button data-grade="'+n+'" class="'+(n===g?'is-on':'')+'" aria-label="Grade '+n+'"><b>'+n+'</b><small>'+ord(n)+'</small></button>';}).join('')+'</div><p class="cm-gdesc">'+GRADE_DESC[g]+'</p>'+
'<h2 class="cm-h2">⚡ Quick Skills <small>Fast facts you can do in your head: '+QUICK_DESC[g]+'</small></h2><div class="cm-kgrid">'+KGAMES.map(function(k){return '<a href="#cm/kids/'+k.id+'" data-go="kids/'+k.id+'" class="cm-kcard" style="--c:'+k.c+'"><div class="cm-kicon">'+k.icon+'</div><h3>'+k.name+'</h3><p>'+k.d+'</p><span class="cm-play">Play ▶</span></a>';}).join('')+'</div>'+
'<h2 class="cm-h2">🧠 Think It Through <small>Grade '+g+' — bigger problems, step by step. Take your time!</small></h2><div class="cm-kgrid">'+THINK_BY_GRADE[g].map(function(id){var k=THINK[id];return '<a href="#cm/kids/'+id+'" data-go="kids/'+id+'" class="cm-kcard think" style="--c:'+k.c+'"><div class="cm-kicon">'+k.icon+'</div><h3>'+k.name+'</h3><p>'+k.d[g]+'</p><span class="cm-play">Start ▶</span></a>';}).join('')+'</div>'+
'<h2 class="cm-h2">🎪 More Math Games <small>Grade '+g+' facts in 8 more ways to play!</small></h2><div class="cm-kgrid">'+mxCards(false)+'</div>'+
'<h2 class="cm-h2">🎉 Adventure Fun <small>Just-for-fun games — every trip '+esc(S.mname)+' unlocks comes with one!</small></h2><div class="cm-kgrid">'+SCENES.map(function(sc){var F=FUN[sc.id],o=sceneOpen(sc);return o?'<a href="#cm/kids/fun-'+sc.id+'" data-go="kids/fun-'+sc.id+'" class="cm-kcard adv" style="--c:#c4f0ff"><div class="cm-kicon">'+F.icon+'</div><h3>'+F.name+'</h3><p>'+F.d+'</p><span class="cm-play">'+sc.icon+' '+sc.name+' ▶</span></a>':'<div class="cm-kcard adv locked" style="--c:#e5e7eb"><div class="cm-kicon">🔒</div><h3>'+F.name+'</h3><p>'+F.d+'</p><span class="cm-play">Unlocks with '+sc.icon+' '+sc.name+' at '+sc.need+' 🍌</span></div>';}).join('')+'</div>';
view.querySelectorAll('[data-grade]').forEach(function(b){b.onclick=function(){S.grade=+b.getAttribute('data-grade');store.set('grade',S.grade);tone(600,.08,'triangle');vKids();};});
}
var CUR_GAME='';
function gameOrder(){return KGAMES.map(function(k){return k.id;}).concat(THINK_BY_GRADE[S.grade]||[],MATHX.map(function(m){return m.id;}));}
function gameInfo(id){var k=KGAMES.filter(function(x){return x.id===id;})[0];if(k)return k;var m=mxById(id);if(m)return {icon:ADV[m.th].icon,name:ADV[m.th].game};return THINK[id]||KGAMES[0];}
function nextBtn(){if(PENDING_ADV)setTimeout(announceAdv,1400);var o=gameOrder(),n=o[(o.indexOf(CUR_GAME)+1)%o.length],g=gameInfo(n);return ['Next: '+g.icon+' '+g.name+' ▶',function(){go('kids/'+n);},'next'];}
function kCards(g,mini){return KGAMES.map(function(k){return '<a href="#cm/kids/'+k.id+'" data-go="kids/'+k.id+'" class="cm-kcard'+(mini?' mini':'')+'" style="--c:'+k.c+'"><div class="cm-kicon">'+k.icon+'</div><h3>'+k.name+'</h3>'+(mini?'':'<p>'+k.d+'</p>')+'<span class="cm-play">Play ▶</span></a>';}).join('')+
THINK_BY_GRADE[g].map(function(id){var k=THINK[id];return '<a href="#cm/kids/'+id+'" data-go="kids/'+id+'" class="cm-kcard think'+(mini?' mini':'')+'" style="--c:'+k.c+'"><div class="cm-kicon">'+k.icon+'</div><h3>'+k.name+'</h3>'+(mini?'':'<p>'+k.d[g]+'</p>')+'<span class="cm-play">Start ▶</span></a>';}).join('')+mxCards(mini);}
function vKidGame(id){
if(id==='monkey')return vMonkey();
if(id.indexOf('fun-')===0)return vFun(id.slice(4));
if(id.indexOf('adv-')===0)return go('kids/fun-'+id.slice(4));
CUR_GAME=id;
var think=THINK[id],mx=mxById(id);if(!KG_FN[id]&&!think&&!mx)return go('kids');
var grades=think?think.grades:[1,2,3,4,5,6],cur=grades.indexOf(+S.grade)>-1?+S.grade:grades[0];
view.innerHTML='<div class="cm-crumbs"><a href="#cm/kids" data-go="kids">← Back to the Kids Jungle</a><label style="font-weight:800">Grade <select class="cm-gsel">'+grades.map(function(n){return '<option value="'+n+'"'+(n===cur?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label></div><div class="cm-game" id="cm-g"></div>';
view.querySelector('.cm-gsel').onchange=function(){S.grade=+this.value;store.set('grade',S.grade);render();};
if(think)gThink(view.querySelector('#cm-g'),id);else if(mx)gAdv(view.querySelector('#cm-g'),mx.th);else KG_FN[id](view.querySelector('#cm-g'));
}
var closetSlot='top';
function vMonkey(){
if(S.newsc){S.newsc='';store.set('newsc','');}
if(!sceneOpen(sceneById(S.scene)))S.scene='jungle';
var sc=sceneById(S.scene);
view.innerHTML='<div class="cm-crumbs"><a href="#cm/kids" data-go="kids">← Back to the Kids Jungle</a><span class="cm-chip">🍌 '+S.bananas+' bananas</span></div>'+
'<section class="cm-mworld"><div class="cm-mwl"><div class="cm-mwscene" data-r="scene"></div><p class="cm-tapclothes">👆 Tap '+esc(S.mname)+'’s hat, shirt, pants or shoes to change them! 🎩👕👖👟</p><p class="cm-postcard" data-r="post"></p>'+
'<div class="cm-namerow"><label>Your monkey’s name: <input data-r="nm" maxlength="14" value="'+esc(S.mname)+'"></label></div>'+
'<h3 class="cm-h3">🗺️ Adventures</h3><div class="cm-advs" data-r="advs"></div></div>'+
'<div class="cm-mwr"><h3 class="cm-h3">👕 '+esc(S.mname)+'’s Closet</h3><div class="cm-slottabs" data-r="tabs"></div><div class="cm-items" data-r="items"></div>'+
'<div class="cm-row cm-closetbtns"><button class="cm-bigbtn" data-r="preset"></button><button class="cm-bigbtn alt" data-r="rand">🎲 Surprise me</button><button class="cm-bigbtn alt" data-r="none">Take it all off</button></div></div></section>'+
'<h2 class="cm-h2">🎮 Back to the games <small>Grade '+S.grade+' — earn more bananas for new trips! <a href="#cm/kids" data-go="kids">Change grade</a></small></h2><div class="cm-kgrid mini">'+kCards(+S.grade,true)+'</div>';
function save(){store.set('look',S.look);store.set('scene',S.scene);}
var postT=null;function postNote(h){var p=q(view,'post');p.innerHTML=h;clearTimeout(postT);postT=setTimeout(function(){if(p.isConnected)p.innerHTML='';},4000);}
function paintScene(){sc=sceneById(S.scene);var A0=FUN[S.scene];q(view,'scene').innerHTML=sceneSVG(S.scene,S.look,'big')+'<a class="cm-advplay" href="#cm/kids/fun-'+S.scene+'" data-go="kids/fun-'+S.scene+'">🎉 <span class="cm-hidesm">Play </span>'+A0.icon+' '+A0.name+'</a>';q(view,'post').innerHTML='';q(view,'preset').textContent='✨ Dress for '+sc.name;}
function paintAdv(){q(view,'advs').innerHTML=SCENES.map(function(s){var o=sceneOpen(s);return '<button class="cm-adv'+(s.id===S.scene?' is-on':'')+(o?'':' locked')+'" data-s="'+s.id+'"><span class="ic">'+(o?s.icon:'🔒')+'</span><b>'+s.name+'</b><small>'+(o?(s.id===S.scene?'You are here!':'Visit ▶'):'Unlocks at '+s.need+' 🍌')+'</small></button>';}).join('');}
function paintTabs(){q(view,'tabs').innerHTML=SLOTS.map(function(s){return '<button class="'+(s[0]===closetSlot?'is-on':'')+'" data-t="'+s[0]+'">'+s[1]+' '+s[2]+'</button>';}).join('');}
function paintItems(){
var ids=Object.keys(ITEMS).filter(function(id){return ITEMS[id].slot===closetSlot;}),opt=closetSlot==='top'||closetSlot==='bottom'?[]:[''];
q(view,'items').innerHTML=opt.concat(ids).map(function(id){
var it=ITEMS[id],o=itemOpen(id),on=(S.look[closetSlot]||'')===id,L={};if(id)L[closetSlot]=id;
return '<button class="cm-item'+(on?' is-on':'')+(o?'':' locked')+'" data-id="'+id+'">'+monkeyFull(L)+'<span>'+(id?it.name:'Nothing')+'</span><em>'+(o?(on?'Wearing':''):sceneById(it.scene).icon+' '+sceneById(it.scene).need+' 🍌')+'</em></button>';}).join('');
}
q(view,'advs').onclick=function(e){var b=e.target.closest('.cm-adv');if(!b)return;var s=sceneById(b.getAttribute('data-s'));if(!sceneOpen(s)){sfxBad();postNote('🔒 <b>'+s.name+'</b> unlocks at '+s.need+' bananas. You need <b>'+(s.need-S.bananas)+'</b> more — go play!');return;}S.scene=s.id;save();sfxGood();paintScene();paintAdv();};
q(view,'tabs').onclick=function(e){var b=e.target.closest('button');if(!b)return;closetSlot=b.getAttribute('data-t');paintTabs();paintItems();};
function slotAt(bx,by){
if(bx<-12||bx>212||by<-30||by>272)return null;
if((bx>134&&by>148&&by<236)||(bx<66&&by>172&&by<214))return 'hand';
if(by<52)return 'head';
if(by<100)return Math.abs(bx-100)<40?'eyes':'head';
if(by<128)return 'neck';
if(by<198)return 'top';
if(by<244)return 'bottom';
return 'feet';
}
var sceneBox=q(view,'scene');
sceneBox.addEventListener('click',function(e){
if(e.target.closest('.cm-advplay'))return;var svg=sceneBox.querySelector('svg');if(!svg||!svg.getScreenCTM)return;
var pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;var p=pt.matrixTransform(svg.getScreenCTM().inverse()),bx=(p.x-116)/.84,by=(p.y-36)/.84,sl=slotAt(bx,by);
if(!sl)return;closetSlot=sl;paintTabs();paintItems();tone(760,.06,'triangle');
var ic=SLOTS.filter(function(x){return x[0]===sl;})[0];var r=sceneBox.getBoundingClientRect();floatText(sceneBox,e.clientX-r.left-20,e.clientY-r.top-30,ic[1]);
var it=q(view,'items');it.classList.remove('cm-itemsflash');void it.offsetWidth;it.classList.add('cm-itemsflash');
var tb=q(view,'tabs').querySelector('.is-on');if(tb){tb.classList.remove('cm-tabpop');void tb.offsetWidth;tb.classList.add('cm-tabpop');}
if(window.innerWidth<820){var tr=q(view,'tabs').getBoundingClientRect();if(tr.top>window.innerHeight*0.7||tr.top<0)q(view,'tabs').scrollIntoView({behavior:'smooth',block:'start'});}
});
q(view,'items').onclick=function(e){var b=e.target.closest('.cm-item');if(!b)return;var id=b.getAttribute('data-id');if(!itemOpen(id)){sfxBad();var it=ITEMS[id];postNote('🔒 The <b>'+it.name+'</b> comes with the <b>'+sceneById(it.scene).name+'</b> trip ('+sceneById(it.scene).need+' 🍌).');return;}S.look[closetSlot]=id;save();tone(700,.06,'triangle');paintScene();paintItems();};
q(view,'preset').onclick=function(){var L=sceneById(S.scene).look,n={};SLOTS.forEach(function(s){n[s[0]]=L[s[0]]||'';});S.look=n;save();sfxWin();paintScene();paintItems();};
q(view,'rand').onclick=function(){SLOTS.forEach(function(s){var ids=Object.keys(ITEMS).filter(function(id){return ITEMS[id].slot===s[0]&&itemOpen(id);});if(s[0]!=='top'&&s[0]!=='bottom')ids.push('','');S.look[s[0]]=ids.length?pick(ids):'';});save();sfxGood();paintScene();paintItems();};
q(view,'none').onclick=function(){SLOTS.forEach(function(s){S.look[s[0]]='';});save();paintScene();paintItems();};
q(view,'nm').addEventListener('input',function(){var v=this.value.trim()||'Mochi';S.mname=v;store.set('mname',v);root.querySelectorAll('.cm-h3').forEach(function(h){if(/Closet/.test(h.textContent))h.textContent='👕 '+v+'’s Closet';});});
paintScene();paintAdv();paintTabs();paintItems();
}
var labF='all',labQ='';
function vLab(){
view.innerHTML='<section class="cm-lhero"><div><p class="cm-eyebrow">Grades 7 – College</p><h1 class="cm-lh1">Big Brain <span>Lab</span></h1><p class="cm-llead">Pick your grade or search a topic. Every lesson has the big idea, the key formula and step-by-step examples — most come with endless practice problems.</p></div><div class="cm-lside"><a class="cm-lbtn" href="#cm/tools" data-go="tools">🧪 Step-by-step solvers</a><a class="cm-lbtn alt" href="#cm/arcade" data-go="arcade">🕹️ Lab Arcade games</a></div></section>'+
'<div class="cm-filter"><div class="cm-chips">'+['all','7','8','9','10','11','12','College'].map(function(g){return '<button data-f="'+g+'" class="'+(labF===g?'is-on':'')+'">'+(g==='all'?'All grades':g==='College'?'College':'Grade '+g)+'</button>';}).join('')+'</div><input class="cm-search" type="search" placeholder="Search a topic… (slope, logs, derivative)" value="'+labQ.replace(/"/g,'&quot;')+'" aria-label="Search topics"></div><div id="cm-labres"></div>'+
'<div class="cm-banner"><a href="#cm/tools" data-go="tools"><span class="ic">🧪</span><div><h3>Stuck on homework?</h3><p>Type your own numbers into a solver and see every step.</p></div></a><a href="#cm/arcade" data-go="arcade"><span class="ic">🕹️</span><div><h3>Learn by doing</h3><p>Balance equations, drag shapes, hunt tangent lines and areas.</p></div></a></div>';
view.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){labF=b.getAttribute('data-f');view.querySelectorAll('[data-f]').forEach(function(x){x.classList.toggle('is-on',x===b);});labRes();};});
var sIn=view.querySelector('.cm-search');sIn.oninput=function(){labQ=sIn.value;labRes();};
labRes();
}
function labRes(){
var box=view.querySelector('#cm-labres'),qq=labQ.trim().toLowerCase();
if(qq){
var hits=[];COURSES.forEach(function(c){c.topics.forEach(function(t,i){if((t.t+' '+t.s+' '+c.name).toLowerCase().indexOf(qq)>-1)hits.push({c:c,t:t,i:i});});});
box.innerHTML=hits.length?'<ul class="cm-results">'+hits.map(function(h){return '<li><a href="#cm/lab/'+h.c.id+'/'+h.i+'" data-go="lab/'+h.c.id+'/'+h.i+'"><span>'+h.t.t+'</span><small>'+h.c.name+' · '+h.c.lvl+'</small></a></li>';}).join('')+'</ul>':'<div class="cm-lcard"><p class="cm-muted">No topics match “'+labQ.replace(/</g,'&lt;')+'”. Try a broader word like “equation”, “triangle” or “integral”.</p></div>';
return;
}
var list=COURSES.filter(function(c){return labF==='all'||c.grades.indexOf(labF)>-1;});
box.innerHTML='<div class="cm-cgrid">'+list.map(function(c){return '<div class="cm-course" style="--c:'+c.c+'"><div class="cm-course-h"><span class="ic">'+c.icon+'</span><div><h3>'+c.name+'</h3><span class="cm-lvl">'+c.lvl+'</span></div></div><ul class="cm-tlist">'+c.topics.map(function(t,i){return '<li><a href="#cm/lab/'+c.id+'/'+i+'" data-go="lab/'+c.id+'/'+i+'"><span>'+t.t+'</span>'+(t.gen?'<span class="cm-inf">∞ practice</span>':'')+'</a></li>';}).join('')+'</ul></div>';}).join('')+'</div>';
}
function stepper(el,prob,opt){
el.innerHTML='<div class="cm-q">'+prob.p+'</div><ol class="cm-steps"></ol><div class="cm-ans hide">Answer: <b>'+prob.a+'</b></div><div class="cm-row"><button class="cm-lbtn sm" data-a="next">Next step →</button><button class="cm-lbtn sm ghost" data-a="all">Show all steps</button>'+(opt.gen?'<button class="cm-lbtn sm ghost" data-a="new">🎲 New problem</button>':'')+'<button class="cm-lbtn sm hide" data-a="got">I got it right! +5 XP</button></div>';
var ol=el.querySelector('.cm-steps'),ansEl=el.querySelector('.cm-ans'),i=0,got=el.querySelector('[data-a="got"]'),nxt=el.querySelector('[data-a="next"]'),all=el.querySelector('[data-a="all"]');
function add(){var s=prob.steps[i++];var li=document.createElement('li');li.innerHTML='<div class="say">'+s.s+'</div>'+(s.m?'<div class="m">'+s.m+'</div>':'');ol.appendChild(li);if(i>=prob.steps.length)finish();}
function finish(){ansEl.classList.remove('hide');nxt.disabled=true;all.disabled=true;if(opt.gen)got.classList.remove('hide');}
nxt.onclick=function(){if(i<prob.steps.length)add();};
all.onclick=function(){while(i<prob.steps.length)add();};
got.onclick=function(){addXP(5);sfxGood();got.disabled=true;got.textContent='Nice work! ⚡';};
var nw=el.querySelector('[data-a="new"]');if(nw)nw.onclick=function(){stepper(el,GEN[opt.gen](),opt);};
}
function vCourse(cid){
var c=COURSES.filter(function(x){return x.id===cid;})[0];if(!c)return go('lab');
view.innerHTML='<div class="cm-crumbs"><a href="#cm/lab" data-go="lab">← Big Brain Lab</a></div><div class="cm-lcard cm-tophead" style="border-left:5px solid '+c.c+'"><span class="cm-badge">'+c.lvl+'</span><h1>'+c.icon+' '+c.name+'</h1><p class="cm-muted" style="margin-top:6px">'+c.topics.length+' topics. Pick one to see the big idea and step-by-step examples.</p></div><ul class="cm-results">'+c.topics.map(function(t,i){return '<li><a href="#cm/lab/'+c.id+'/'+i+'" data-go="lab/'+c.id+'/'+i+'"><span>'+(i+1)+'. '+t.t+'</span><small>'+(t.gen?'∞ practice':'worked example')+'</small></a></li>';}).join('')+'</ul>';
}
function vTopic(cid,ti){
var c=COURSES.filter(function(x){return x.id===cid;})[0];if(!c)return go('lab');var t=c.topics[ti];if(!t)return go('lab/'+cid);
var prev=ti>0?c.topics[ti-1]:null,next=c.topics[ti+1];
var tool=t.tool?TOOLS.filter(function(x){return x.id===t.tool;})[0]:null;
var GMAP={prealg:['equation'],alg1:['equation'],geo:['shapes'],calc:['tangent','area']},gl=(GMAP[c.id]||[]).map(function(id){return LGAMES.filter(function(g){return g.id===id;})[0];});
view.innerHTML='<div class="cm-crumbs"><a href="#cm/lab/'+c.id+'" data-go="lab/'+c.id+'">← '+c.name+'</a><span class="cm-badge" style="margin:0">'+c.lvl+'</span></div>'+
'<div class="cm-lcard cm-tophead"><h1>'+t.t+'</h1><p style="margin-top:10px;font-size:17px">'+t.s+'</p>'+(t.k?'<div class="cm-key"><b>Key idea</b>'+t.k+'</div>':'')+'</div>'+
'<div class="cm-lcard"><h2>'+(t.gen?'🎲 Practice problem':'📝 Worked example')+'</h2><p class="cm-muted" style="margin-bottom:12px">'+(t.gen?'Try it on paper first. Then reveal the solution one step at a time — or grab a brand-new problem.':'Reveal one step at a time and see if you can predict the next move.')+'</p><div id="cm-step"></div></div>'+
(tool?'<div class="cm-lcard"><h2>'+tool.icon+' Have your own problem?</h2><p class="cm-muted" style="margin-bottom:10px">Plug your homework numbers into the '+tool.name+' solver for a full step-by-step breakdown.</p><a class="cm-lbtn sm" href="#cm/tools/'+tool.id+'" data-go="tools/'+tool.id+'">Open the solver →</a></div>':'')+
(gl.length?'<div class="cm-lcard"><h2>🎮 Play with this idea</h2><p class="cm-muted" style="margin-bottom:10px">Earn stars with hands-on challenges in the Lab Arcade.</p><div class="cm-row">'+gl.map(function(g){return '<a class="cm-lbtn sm alt" href="#cm/arcade/'+g.id+'" data-go="arcade/'+g.id+'">'+g.icon+' '+g.name+'</a>';}).join('')+'</div></div>':'')+
'<div class="cm-pn">'+(prev?'<a class="cm-lbtn sm ghost" href="#cm/lab/'+c.id+'/'+(ti-1)+'" data-go="lab/'+c.id+'/'+(ti-1)+'">← '+prev.t+'</a>':'<span></span>')+(next?'<a class="cm-lbtn sm ghost" href="#cm/lab/'+c.id+'/'+(ti+1)+'" data-go="lab/'+c.id+'/'+(ti+1)+'">'+next.t+' →</a>':'')+'</div>';
stepper(view.querySelector('#cm-step'),t.gen?GEN[t.gen]():t.ex,{gen:t.gen});
}
function vTools(id){
var tool=TOOLS.filter(function(x){return x.id===id;})[0]||TOOLS[0];
view.innerHTML='<div class="cm-crumbs"><a href="#cm/lab" data-go="lab">← Big Brain Lab</a></div><div class="cm-tools"><nav class="cm-tabs">'+TOOLS.map(function(x){return '<a href="#cm/tools/'+x.id+'" data-go="tools/'+x.id+'" class="'+(x===tool?'is-on':'')+'"><span>'+x.icon+'</span>'+x.name+'</a>';}).join('')+'</nav>'+
'<div><div class="cm-lcard"><h2>'+tool.icon+' '+tool.name+'</h2><p class="cm-muted">'+tool.d+'</p>'+(tool.tpl?'<p class="cm-tpl">'+tool.tpl+'</p>':'')+'<form class="cm-form" novalidate>'+tool.f.map(function(f){var wide=f[3]==='text';return '<div class="cm-field'+(wide?' wide':'')+'"><label for="cm-f-'+f[0]+'">'+f[1]+'</label><input id="cm-f-'+f[0]+'" name="'+f[0]+'" value="'+f[2]+'" '+(wide?'':'inputmode="decimal"')+' autocomplete="off"></div>';}).join('')+'<button class="cm-lbtn" type="submit">Solve step-by-step</button></form><p class="cm-muted" style="font-size:13px">Tip: you can type negatives (−3) and fractions like 1/2.</p></div><div id="cm-tres"></div></div></div>';
var form=view.querySelector('form'),res=view.querySelector('#cm-tres');
function solve(){
var v={},raw={},miss=false;
tool.f.forEach(function(f){var val=form.elements[f[0]].value;raw[f[0]]=val;v[f[0]]=numIn(val);if(f[3]!=='text'&&f[3]!=='num'&&!tool.opt&&isNaN(v[f[0]]))miss=true;});
if(miss){res.innerHTML='<div class="cm-lcard"><p class="cm-err">Please fill in every box with a number.</p></div>';return;}
var r=tool.run(v,raw);
if(r.err){res.innerHTML='<div class="cm-lcard"><p class="cm-err">'+r.err+'</p></div>';return;}
res.innerHTML='<div class="cm-lcard"><div class="cm-ans" style="margin-top:0">Answer: <b>'+r.ans+'</b></div><h2 style="margin-top:12px">Step-by-step</h2><ol class="cm-steps">'+r.steps.map(function(s,i){return '<li style="animation-delay:'+(i*.06)+'s"><div class="say">'+s.s+'</div>'+(s.m?'<div class="m">'+s.m+'</div>':'')+'</li>';}).join('')+'</ol></div>';
addXP(1);
}
form.onsubmit=function(e){e.preventDefault();solve();};
solve();
}
function vArcade(){
var tot=allStars(),rk=rankOf(tot),max=0;LGAMES.forEach(function(g){max+=LG_LISTS[g.id].length*3;});
var pct=rk.nx?Math.round((tot-rk.r[0])/(rk.nx[0]-rk.r[0])*100):100;
view.innerHTML='<section class="cm-lhero"><div><p class="cm-eyebrow">Big kids like to have fun too</p><h1 class="cm-lh1">Lab <span>Arcade</span></h1><p class="cm-llead">Hands-on challenges where you actually do the math: balance equations, drag shapes, tilt tangent lines and stack rectangles under curves.</p></div>'+
'<div class="cm-lside"><div class="cm-starkey"><div><span>★</span> Finish the challenge</div><div><span>★</span> Do it efficiently (beat par or skip the hints)</div><div><span>★</span> Answer the 💡 insight question</div></div></div></section>'+
'<div class="cm-rank"><span class="ic">'+rk.r[1]+'</span><div style="flex:1"><b>'+rk.r[2]+'</b> <span class="cm-muted">· '+tot+' / '+max+' ★ · '+S.xp+' XP</span><div class="cm-meter"><i style="width:'+pct+'%"></i></div><small class="cm-muted">'+(rk.nx?(rk.nx[0]-tot)+' more ★ to become '+rk.nx[1]+' '+rk.nx[2]:'You reached the top rank! 🎉')+'</small></div></div>'+
'<div class="cm-agrid">'+LGAMES.map(function(g){var L=LG_LISTS[g.id],s=starsOf(g.id),d=doneOf(g.id);return '<a class="cm-acard" href="#cm/arcade/'+g.id+'" data-go="arcade/'+g.id+'" style="--c:'+g.c+'"><div class="cm-acard-top"><span class="ic">'+g.icon+'</span><span class="cm-badge">'+g.topic+'</span></div><h3>'+g.name+'</h3><p>'+g.d+'</p><div class="cm-meter"><i style="width:'+Math.round(s/(L.length*3)*100)+'%"></i></div><span class="best">'+d+' / '+L.length+' challenges · '+s+' ★</span></a>';}).join('')+'</div>';
}
function vLabGame(id){
if(!LG_FN[id])return go('arcade');
view.innerHTML='<div class="cm-crumbs"><a href="#cm/arcade" data-go="arcade">← Lab Arcade</a></div><div class="cm-game" id="cm-g"></div>';
LG_FN[id](view.querySelector('#cm-g'));
}

/* ================= ROUTER ================= */
var firstRender=true;
var memRoute=null;
function route(){var h='';try{h=location.hash||'';}catch(e){}if(h.indexOf('#cm/')===0&&!memRoute)return decodeURIComponent(h.slice(4));if(memRoute)return memRoute;return root.getAttribute('data-start')||'home';}
function go(r){if(route()===r){render();return;}var ok=false;if(!memRoute){try{history.pushState(null,'','#cm/'+r);ok=(location.hash==='#cm/'+r||decodeURIComponent(location.hash)==='#cm/'+r);}catch(e){}if(!ok){try{location.hash='cm/'+r;if(decodeURIComponent(location.hash)==='#cm/'+r)return;}catch(e){}}}if(!ok)memRoute=r;render();}
function render(){
runCleanups();
var p=route().split('/'),sec=p[0];
var theme=sec==='kids'?'cm-t-kids':(sec==='lab'||sec==='tools'||sec==='arcade')?'cm-t-lab':'cm-t-home';
root.classList.remove('cm-t-home','cm-t-kids','cm-t-lab');root.classList.add(theme);
root.querySelectorAll('[data-nav]').forEach(function(a){a.classList.toggle('is-on',a.getAttribute('data-nav')===sec);});
try{
if(sec==='kids')p[1]?vKidGame(p[1]):vKids();
else if(sec==='lab')p[2]!=null?vTopic(p[1],+p[2]):p[1]?vCourse(p[1]):vLab();
else if(sec==='tools')vTools(p[1]);
else if(sec==='arcade')p[1]?vLabGame(p[1]):vArcade();
else vHome();
}catch(err){view.innerHTML='<p style="padding:20px">Oops — something went wrong loading this page. <a href="#cm/home" data-go="home"><b>Go home</b></a></p>';if(window.console)console.error(err);}
if(!firstRender){var top=root.getBoundingClientRect().top;if(top<0)window.scrollTo({top:window.pageYOffset+top-10,behavior:'smooth'});}
firstRender=false;
}
root.addEventListener('click',function(e){var a=e.target.closest('[data-go]');if(!a||!root.contains(a))return;e.preventDefault();e.stopPropagation();tone(700,.04,'triangle');go(a.getAttribute('data-go'));});
root.querySelector('#cm-snd').addEventListener('click',function(){S.sound=!S.sound;store.set('sound',S.sound);updStats();if(S.sound)tone(660,.1,'triangle');});
window.addEventListener('popstate',render);
window.addEventListener('hashchange',function(){if((location.hash||'').indexOf('#cm/')===0)render();});

refreshLogo();updStats();render();
})();
