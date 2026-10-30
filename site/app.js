
const C=window.CFG,FX=C.fx,cap=s=>s[0].toUpperCase()+s.slice(1);
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function load(f,d=C.dir){for(const b of["data/"+d+"/","../data/"+d+"/"]){try{const r=await fetch(b+f);if(r.ok)return r.json()}catch{}}throw new Error("Could not load "+f+". Serve the repo root with a local web server (e.g. npx serve .) and open /site/.")}
const blank=()=>({w:0,l:0,pf:0,pa:0});
const add=(s,g)=>{g.us>g.them?s.w++:s.l++;s.pf+=g.us;s.pa+=g.them};
const pct=s=>s.w+s.l?s.w/(s.w+s.l):0;
const wl=s=>s.w+s.l?`${s.w}-${s.l}`:"–";
const bar=s=>`<span class="bar"><i style="width:${Math.round(pct(s)*100)}%"></i></span>${s.w+s.l?Math.round(pct(s)*100)+"%":"–"}`;
const diff=s=>{const d=s.pf-s.pa;return(d>0?"+":"")+d};

function expand(matches){
  const out=[];
  for(const m of matches){
    const L=m.lineup.ladies,G=m.lineup[C.men];
    m.games.forEach((fx,i)=>{
      const[d,a,b]=((!m.home&&C.fxAway)||FX)[i];
      const pair=d==="ladies"?[L[a],L[b]]:d===C.men?[G[a],G[b]]:[L[a],G[b]];
      fx.forEach(([us,them])=>out.push({m,i,d,pair,us,them}));
    });
  }
  return out;
}

function render(matches,P){
  const games=expand(matches),name=id=>P[id]?.name??id;
  const total=blank(),rec={W:0,L:0,D:0};
  games.forEach(g=>add(total,g));
  const byMatch=new Map(matches.map(m=>[m,blank()]));
  games.forEach(g=>add(byMatch.get(g.m),g));
  byMatch.forEach(s=>rec[s.w>s.l?"W":s.w<s.l?"L":"D"]++);

  $("#summary").innerHTML=
    `<div><span class="num"><span class="w">${rec.W}</span>-<span class="l">${rec.L}</span>${rec.D?`-${rec.D}`:""}</span><small>Matches won-lost${rec.D?"-drawn":""}</small></div>`+
    `<div><span class="num"><span class="w">${total.w}</span>-<span class="l">${total.l}</span></span><small>Games won-lost</small></div>`+
    `<div><span class="num">${diff(total)}</span><small>Points difference</small></div>`;

  $("#coreLabel").hidden=!Object.values(P).some(p=>p.core);
  // players
  const pl=new Map();
  const slot=id=>{if(!pl.has(id))pl.set(id,{all:blank(),[C.men]:blank(),ladies:blank(),mixed:blank(),ms:new Set()});return pl.get(id)};
  games.forEach(g=>g.pair.forEach(id=>{const p=slot(id);add(p.all,g);add(p[g.d],g);p.ms.add(g.m.id)}));
  const rows=[...pl].sort((a,b)=>pct(b[1].all)-pct(a[1].all)||b[1].all.w-a[1].all.w);
  const draw=()=>{const all=$("#showAll").checked,hasCore=Object.values(P).some(p=>p.core),min=C.minMatches||3,vis=([id,p])=>all||!hasCore||P[id]?.core||p.ms.size>=min;$("#ptable").innerHTML=`<div class="scroll"><table><thead><tr><th>Player</th><th>Matches</th><th>Games</th><th>Win %</th><th>Points +/-</th><th>${cap(C.men)}</th><th>Ladies</th><th>Mixed</th></tr></thead><tbody>`+
    rows.filter(vis).map(([id,p])=>`<tr><td>${esc(name(id))}</td><td>${p.ms.size}</td><td>${wl(p.all)}</td><td>${bar(p.all)}</td><td>${diff(p.all)}</td><td>${wl(p[C.men])}</td><td>${wl(p.ladies)}</td><td>${wl(p.mixed)}</td></tr>`).join("")+
    `</tbody></table></div><p class="note">Games won-lost across all fixtures. The last three columns show games won-lost in that discipline.${hasCore&&!all?` Showing core players and anyone with ${min}+ matches; tick Show all for everyone. Hidden players' stats are unchanged.`:""}</p>`};
  $("#showAll").onchange=draw;draw();

  // pairs
  const pr=new Map();
  games.forEach(g=>{const k=g.d+"|"+[...g.pair].sort().join("|");
    if(!pr.has(k))pr.set(k,{d:g.d,ids:[...g.pair].sort(),s:blank(),ms:new Set()});
    const p=pr.get(k);add(p.s,g);p.ms.add(g.m.id)});
  const prRows=[...pr.values()].sort((a,b)=>pct(b.s)-pct(a.s)||b.s.w+b.s.l-(a.s.w+a.s.l));
  $("#pairs").innerHTML=`<div class="scroll"><table><thead><tr><th>Pair</th><th>Type</th><th>Matches</th><th>Games</th><th>Win %</th><th>Points +/-</th></tr></thead><tbody>`+
    prRows.map(p=>`<tr><td>${p.ids.map(i=>esc(name(i))).join(" &amp; ")}</td><td class="dim">${p.d}</td><td>${p.ms.size}</td><td>${wl(p.s)}</td><td>${bar(p.s)}</td><td>${diff(p.s)}</td></tr>`).join("")+
    `</tbody></table></div>`;

  // matches
  $("#matches").innerHTML=[...matches].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>{
    const s=byMatch.get(m),r=s.w>s.l?"W":s.w<s.l?"L":"D";
    const date=new Date(m.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
    const strips=FX.map((_,i)=>`<span class="fx">`+games.filter(g=>g.m===m&&g.i===i).map(g=>
      `<span class="t${g.us>g.them?"":" x"}" title="${esc(g.d+": "+g.pair.map(name).join(" & ")+" "+g.us+"-"+g.them)}"></span>`).join("")+`</span>`).join("");
    return `<article class="match"><div class="mh"><h2>${m.home?"vs":"at"} ${esc(m.opponent)}</h2><span class="res ${r} num">${s.w}-${s.l}</span></div><div class="strip">${strips}</div><div class="note">${date} · ${m.home?"Home":"Away"} · each block is one game (green won, red lost), grouped by fixture in card order</div></article>`}).join("");
}

function fixtures(matches,f){
  const el=$("#fixtures");
  if(!f){el.innerHTML='<p class="note">Fixtures unavailable.</p>';return}
  const res=new Map(matches.map(m=>[m.opponent+"|"+m.home,m]));
  const today=new Date().toISOString().slice(0,10);
  const rs=x=>{const m=res.get(x.opponent+"|"+x.home);return m?m.reported:x.result||null};
  const next=f.fixtures.find(x=>x.date>=today&&!rs(x));
  el.innerHTML=`<div class="scroll"><table><thead><tr><th>Date</th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>`+
    f.fixtures.map(x=>{const q=rs(x);
      const d=new Date(x.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
      const venue=x.home?"Home":x.map?`<a href="${esc(x.map)}" target="_blank" rel="noopener">Away</a>`:"Away";
      const st=x.status?esc(x.status):"";
      const r=q?`<span class="${q.us>q.them?"rw":q.us<q.them?"rl":""}">${q.us}-${q.them}</span>`:x===next?"Next"+(st?" · "+st:""):st;
      return `<tr class="${x===next?"hl":""}"><td>${d}</td><td>${esc(x.opponent)}</td><td>${venue}</td><td>${r}</td></tr>`}).join("")+
    `</tbody></table></div><p class="note">${esc(f.division)}, ${esc(f.season)}. Fixtures as published by the league.${f.note?" "+esc(f.note):""}</p>`;
}
function projection(rows,n,me){
  const played=rows.filter(r=>r.p>0);
  const fb=played.reduce((s,r)=>s+r.avg,0)/played.length;
  const proj=rows.map(r=>({team:r.team,p:r.p,now:r.w,final:r.w+(n-r.p)*(r.p?r.avg:fb)})).sort((a,b)=>b.final-a.final);
  const mine=proj.find(x=>x.team===me),others=proj.filter(x=>x!==mine);
  const line=others[1].final,need=Math.floor(line)+1,left=n-mine.p;
  return{proj,mine,line,need,left,per:left?(need-mine.now)/left:0,avg:rows.find(r=>r.team===me).avg};
}
function league(l,n){
  const el=$("#league"),rows=l?.divisions?.[C.division||"Division 1"];
  if(!rows){el.innerHTML='<p class="note">League table unavailable right now.</p>';return}
  const ME=C.team,pj=C.promo&&rows.some(r=>r.team===ME)&&rows.some(r=>r.p>0)?projection(rows,n,ME):null;
  let html=`<div class="scroll"><table><thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>Avg</th></tr></thead><tbody>`+
    rows.map(r=>`<tr class="${r.team===ME?"hl":""}"><td>${esc(r.team)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.avg}</td></tr>`).join("")+
    `</tbody></table></div><p class="note">${C.division||"Division 1"} as published by the league: W and L are games, Avg is games won per match. Refreshed ${new Date(l.updated).toLocaleString("en-GB")}.</p>`;
  if(pj){
    const max=Math.max(...pj.proj.map(x=>x.final),pj.need),pc=v=>(v/max*100).toFixed(1)+"%";
    const verdict=pj.left===0?"The season is complete.":pj.per>18?"Second place is out of reach if everyone keeps their current averages.":
      pj.per<=pj.avg?`On current averages you already clear the line (you average ${pj.avg} games per match; ${pj.per.toFixed(1)} would do it).`:
      `You'd need about <b>${pj.per.toFixed(1)}</b> games per match over your remaining ${pj.left} matches (you're averaging ${pj.avg}).`;
    html+=`<div class="promo"><h2>Promotion picture</h2><p>Top two go up. To finish second you'd need <b>${pj.need}</b> games in total (${pj.mine.now} so far). ${verdict}</p>`+
      pj.proj.map((x,i)=>`<div class="pj ${x.team===ME?"hl":""}"><span class="nm">${i<2?"▲ ":""}${esc(x.team)}</span><span class="pt"><i class="b" style="width:${pc(x.final)}"></i><i class="a" style="width:${pc(x.now)}"></i><u style="left:${pc(pj.line)}"></u></span><span class="v">${Math.round(x.final)}</span></div>`).join("")+
      `<p class="note">Just for fun. Each bar projects games won over ${n} matches if every team keeps its current average (solid = won so far). The dashed line marks what Shell B must pass to take a top-two spot. Teams with no matches played are given the division's average. Early in the season, one big result swings a team's projection a lot.</p></div>`;
  }
  el.innerHTML=html;
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button").forEach(x=>x.setAttribute("aria-selected",x===b));
  ["players","pairs","matches","fixtures","league"].forEach(id=>$("#"+id).hidden=id!==b.dataset.t);
});
function bare(f){
  const msg='<p class="note">No score sheets have been added for this team, so there are no player stats.</p>';
  ["players","pairs","matches"].forEach(id=>$("#"+id).innerHTML=msg);
  const rs=(f?.fixtures||[]).filter(x=>x.result),t=blank(),r={W:0,L:0,D:0};
  rs.forEach(x=>{add(t,x.result);r[x.result.us>x.result.them?"W":x.result.us<x.result.them?"L":"D"]++});
  $("#summary").innerHTML=`<div><span class="num"><span class="w">${r.W}</span>-<span class="l">${r.L}</span>${r.D?`-${r.D}`:""}</span><small>Matches won-lost${r.D?"-drawn":""}</small></div><div><span class="num"><span class="w">${t.w}</span>-<span class="l">${t.l}</span></span><small>Games won-lost</small></div>`;
}
const opt=(f,d)=>load(f,d).catch(()=>null),bareMode=C.scores===false;
Promise.all([bareMode?null:load("matches.json"),bareMode?null:load("players.json"),opt("fixtures.json"),opt("league.json",C.leagueDir)])
  .then(([m,p,f,l])=>{bareMode?bare(f):render(m.matches,p);fixtures(m?.matches||[],f);league(l,f?.fixtures.length||14)})
  .catch(e=>$("#err").textContent=e.message);
