// Audit grid for real cancellation flows + test-session log + "your run" summary.
// Everything is stored in this browser (localStorage) and can be exported as CSV / JSON.
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const csvCell=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};

// Worked example = the fictional Abonnix "current" flow, shortest path through it. Marked as example, not a real service.
const EXAMPLE={id:"ex",example:true,service:"Abonnix (exemple fictif)",category:"Streaming",date:"2026-11-17",device:"Web",evidence:"",
 steps:[
  {screen:"Accueil",action:"Ouvrir le menu du compte",patterns:["hidden"],note:"Aucune entrée « Résilier » dans le menu."},
  {screen:"Menu",action:"Mon compte",patterns:[],note:""},
  {screen:"Mon compte",action:"Cliquer le petit lien « Autres options » en bas de page",patterns:["prominence","hidden"],note:"Bannière annuelle très visible, lien gris en bas."},
  {screen:"Autres options",action:"Cliquer « Fermer mon abonnement »",patterns:["complex","hierarchy"],note:"« Mettre en pause » recommandé et mis en avant."},
  {screen:"Vous partez vraiment ?",action:"« Non, je préfère perdre mes listes »",patterns:["shame","nagging"],note:""},
  {screen:"Offre réservée",action:"« Continuer sans l'offre »",patterns:["countdown","nagging"],note:"Compte à rebours qui repart à 5:00."},
  {screen:"Questionnaire",action:"Choisir une raison, décocher la pause, Continuer",patterns:["steps","defaults"],note:"Raison obligatoire, pause cochée par défaut."},
  {screen:"Confirmation",action:"Cliquer « Oui »",patterns:["trick","hierarchy"],note:"Double négation, « Non » en gros."}
 ],legal:{visible:false,label:false,free:true,recap:false,receipt:false,nodp:false}};

const Grid={
 audits:store.get("abonnix-audits",null)||[EXAMPLE],cur:null,
 save(){store.set("abonnix-audits",this.audits)},
 actions(a){return a.steps.length},
 render(){const L=document.getElementById("gList");if(!this.cur)this.cur=this.audits[0]&&this.audits[0].id;
  L.innerHTML=this.audits.map(a=>`<button type="button" class="gitem" data-id="${a.id}" aria-current="${a.id===this.cur}"><b>${esc(a.service||"Sans nom")}</b><span>${this.actions(a)} actions · ${a.steps.reduce((n,s)=>n+s.patterns.length,0)} patterns</span></button>`).join("");
  L.querySelectorAll(".gitem").forEach(b=>b.onclick=()=>{this.cur=b.dataset.id;this.render()});
  this.editor();this.matrix()},
 editor(){const a=this.audits.find(x=>x.id===this.cur),E=document.getElementById("gEdit");if(!a){E.innerHTML='<p class="sub">Aucun audit. Créez-en un.</p>';return}
  const opts=Object.entries(PATTERNS);
  E.innerHTML=`${a.example?'<p class="note">Exemple rempli avec le parcours fictif d\'Abonnix. Créez un audit par service réel que vous testez.</p>':""}
  <div class="gmeta">
   <label>Service<input data-f="service" value="${esc(a.service)}"></label>
   <label>Catégorie<input data-f="category" value="${esc(a.category)}" placeholder="Salle de sport, presse…"></label>
   <label>Date<input type="date" data-f="date" value="${esc(a.date)}"></label>
   <label>Support<select data-f="device">${["Web","Android","iOS"].map(d=>`<option ${a.device===d?"selected":""}>${d}</option>`).join("")}</select></label>
   <label class="wide">Preuve (nom du fichier vidéo ou capture)<input data-f="evidence" value="${esc(a.evidence)}" placeholder="2026-11-20_salle-sport_web.mp4"></label>
  </div>
  <h3>Parcours <span class="count">${this.actions(a)} actions pour résilier</span></h3>
  <ol class="gsteps">${a.steps.map((s,i)=>`<li><div class="gs-top"><input data-s="${i}" data-k="screen" value="${esc(s.screen)}" placeholder="Écran" aria-label="Écran ${i+1}"><input data-s="${i}" data-k="action" value="${esc(s.action)}" placeholder="Action faite" aria-label="Action ${i+1}"><button type="button" class="x" data-del="${i}" aria-label="Supprimer l'étape ${i+1}">×</button></div>
    <div class="gs-pats">${opts.map(([k,p])=>`<button type="button" class="pchip" data-s="${i}" data-p="${k}" aria-pressed="${s.patterns.includes(k)}" title="${esc(p.path)} : ${esc(p.fr)}">${p.name}</button>`).join("")}</div>
    <input class="gs-note" data-s="${i}" data-k="note" value="${esc(s.note)}" placeholder="Note (citation exacte du libellé, détail…)" aria-label="Note ${i+1}"></li>`).join("")}</ol>
  <button type="button" class="ghost" id="gAdd">+ Ajouter une étape</button>
  <h3>Cadre légal</h3><div class="glegal">${LEGAL.map(l=>`<label><input type="checkbox" data-l="${l.id}" ${a.legal[l.id]?"checked":""}> ${l.fr}</label>`).join("")}</div>
  <p class="row"><button type="button" class="ghost danger" id="gDel">Supprimer cet audit</button></p>`;
  E.querySelectorAll("[data-f]").forEach(i=>i.oninput=i.onchange=()=>{a[i.dataset.f]=i.value;a.example=false;this.save();this.refresh()});
  E.querySelectorAll("input[data-s]").forEach(i=>i.oninput=()=>{a.steps[+i.dataset.s][i.dataset.k]=i.value;this.save()});
  E.querySelectorAll(".pchip").forEach(b=>b.onclick=()=>{const s=a.steps[+b.dataset.s],p=b.dataset.p,k=s.patterns.indexOf(p);k<0?s.patterns.push(p):s.patterns.splice(k,1);b.setAttribute("aria-pressed",String(k<0));this.save();this.refresh()});
  E.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{a.steps.splice(+b.dataset.del,1);this.save();this.render()});
  E.querySelectorAll("[data-l]").forEach(c=>c.onchange=()=>{a.legal[c.dataset.l]=c.checked;this.save();this.matrix()});
  document.getElementById("gAdd").onclick=()=>{a.steps.push({screen:"",action:"",patterns:[],note:""});this.save();this.render();const ins=E.querySelectorAll(".gsteps li:last-child input");ins[0]&&ins[0].focus()};
  document.getElementById("gDel").onclick=e=>{const b=e.currentTarget;if(b.dataset.sure){this.audits=this.audits.filter(x=>x!==a);this.cur=null;this.save();this.render()}else{b.dataset.sure="1";b.textContent="Confirmer la suppression"}}},
 refresh(){const L=document.getElementById("gList");const a=this.audits.find(x=>x.id===this.cur);const it=L.querySelector(`[data-id="${this.cur}"]`);if(it&&a)it.innerHTML=`<b>${esc(a.service||"Sans nom")}</b><span>${this.actions(a)} actions · ${a.steps.reduce((n,s)=>n+s.patterns.length,0)} patterns</span>`;this.matrix()},
 matrix(){const M=document.getElementById("matrix"),S=Object.keys(STRATEGIES);
  M.innerHTML=`<table><thead><tr><th scope="col">Service</th><th scope="col">Actions</th>${S.map(s=>`<th scope="col" title="${s}">${STRATEGIES[s]}</th>`).join("")}${LEGAL.map((l,i)=>`<th scope="col" title="${esc(l.fr)}">L${i+1}</th>`).join("")}</tr></thead><tbody>
  ${this.audits.map(a=>{const ps=a.steps.flatMap(s=>s.patterns);return`<tr><th scope="row">${esc(a.service||"Sans nom")}<small>${esc(a.device)} · ${esc(a.date)}</small></th><td class="${this.actions(a)>3?"warn":"okc"}">${this.actions(a)}</td>${S.map(s=>{const n=ps.filter(p=>PATTERNS[p]&&PATTERNS[p].s===s).length;return`<td class="${n?"warn":""}">${n||"·"}</td>`}).join("")}${LEGAL.map(l=>`<td class="${a.legal[l.id]?"okc":"warn"}">${a.legal[l.id]?"✓":"✗"}</td>`).join("")}</tr>`}).join("")}</tbody></table>
  <p class="note">${LEGAL.map((l,i)=>`L${i+1} : ${esc(l.fr)}`).join(" · ")}. Actions au-delà de 3 en orange.</p>`},
 csv(){const rows=[["service","categorie","date","support","preuve","etape","ecran","action","patterns","strategies","note"]];
  this.audits.forEach(a=>a.steps.forEach((s,i)=>rows.push([a.service,a.category,a.date,a.device,a.evidence,i+1,s.screen,s.action,s.patterns.map(p=>PATTERNS[p]&&PATTERNS[p].name).join(" | "),[...new Set(s.patterns.map(p=>PATTERNS[p]&&PATTERNS[p].s))].join(" | "),s.note])));
  return "﻿"+rows.map(r=>r.map(csvCell).join(";")).join("\n")}
};
document.getElementById("gNew").onclick=()=>{const a={id:"a"+Date.now(),service:"Nouveau service",category:"",date:new Date().toISOString().slice(0,10),device:"Web",evidence:"",steps:[{screen:"",action:"",patterns:[],note:""}],legal:{}};Grid.audits.push(a);Grid.cur=a.id;Grid.save();Grid.render()};
document.getElementById("gCsv").onclick=()=>download("audits-resiliation.csv",Grid.csv(),"text/csv;charset=utf-8");
document.getElementById("gJson").onclick=()=>download("audits-resiliation.json",JSON.stringify(Grid.audits,null,2),"application/json");
document.getElementById("gImport").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(Array.isArray(d)){Grid.audits=d;Grid.cur=null;Grid.save();Grid.render()}}catch(err){alertNote("Fichier JSON illisible.")}})};
function alertNote(t){const n=document.createElement("p");n.className="note";n.textContent=t;document.getElementById("gEdit").prepend(n)}

// Test sessions (only with ?mode=test): one row per run, with participant id and SEQ.
const Sessions={list:store.get("abonnix-sessions",[]),
 add(run){this.list.push({pid:(document.getElementById("pid").value||"P?").trim(),when:new Date().toISOString(),ver:run.ver,outcome:run.outcome,time:run.time,clicks:run.clicks,seq:run.seq,caught:run.caught.filter(p=>PATTERNS[p]).map(p=>PATTERNS[p].name).join(" | ")});store.set("abonnix-sessions",this.list);this.render()},
 render(){const el=document.getElementById("sessions");if(!el)return;el.innerHTML=this.list.length?`<table><thead><tr><th>Id</th><th>Version</th><th>Résultat</th><th>Temps (s)</th><th>Clics</th><th>SEQ</th><th>Pièges</th></tr></thead><tbody>${this.list.map(s=>`<tr><td>${esc(s.pid)}</td><td>${s.ver==="dark"?"actuelle":"conforme"}</td><td>${s.outcome}</td><td>${s.time}</td><td>${s.clicks}</td><td>${s.seq??""}</td><td>${esc(s.caught)}</td></tr>`).join("")}</tbody></table>`:'<p class="sub">Aucune séance enregistrée.</p>'},
 csv(){return "﻿"+[["participant","date","version","resultat","temps_s","clics","seq","pieges"],...this.list.map(s=>[s.pid,s.when,s.ver,s.outcome,String(s.time).replace(".",","),s.clicks,s.seq??"",s.caught])].map(r=>r.map(csvCell).join(";")).join("\n")}};
if(Flow.TEST){document.getElementById("testTools").hidden=false;Sessions.render();
 document.getElementById("sessCsv").onclick=()=>download("seances-abonnix.csv",Sessions.csv(),"text/csv;charset=utf-8");
 document.getElementById("sessClear").onclick=e=>{const b=e.currentTarget;if(b.dataset.sure){Sessions.list=[];store.set("abonnix-sessions",[]);Sessions.render();b.textContent="Vider";delete b.dataset.sure}else{b.dataset.sure="1";b.textContent="Confirmer : tout effacer"}}}

function renderMine(){const R=Flow.runs(),el=document.getElementById("mine");const rows=["dark","fair"].filter(v=>R[v]);if(!rows.length)return;
 const L={cancelled:"résilié",paused:"mis en pause par erreur",abandoned:"abandon"};
 el.innerHTML=`<table><thead><tr><th>Version</th><th>Résultat</th><th>Temps</th><th>Clics</th><th>Pièges</th></tr></thead><tbody>${rows.map(v=>{const r=R[v];return`<tr><td>${v==="dark"?"actuelle":"conforme"}</td><td>${L[r.outcome]}</td><td>${String(r.time).replace(".",",")} s</td><td>${r.clicks}</td><td>${r.caught.filter(p=>PATTERNS[p]).length}</td></tr>`}).join("")}</tbody></table><p class="note">Vos chiffres ne sont envoyés nulle part et ne comptent pas dans les résultats de l'étude.</p>`}
