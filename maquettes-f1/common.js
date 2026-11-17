// Shared project sheet for the 3 mockups. Opens the real live demos from ../live/.
const LANG="fr";
function projectSheet(){let el=document.getElementById("sheet");if(el)return el;el=document.createElement("div");el.id="sheet";el.className="sheet";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
 el.addEventListener("click",e=>{if(e.target===el)closeProject()});addEventListener("keydown",e=>{if(e.key==="Escape"&&!el.hidden)closeProject()});return el}
function openProject(id){const x=P[id],el=projectSheet();const prof="design";
 const demo=x.live?`<iframe src="../${x.live}" title="Démo : ${x.t[LANG]}" loading="lazy"></iframe>`:`<div class="soon"><div><b class="disp" style="font-size:40px">Bientôt</b><p>Le projet F1 est en préparation.</p></div></div>`;
 el.innerHTML=`<section class="demo"><header><span>● En direct</span>${x.live?`<a href="../${x.live}" target="_blank" rel="noopener">Ouvrir dans un onglet ↗</a>`:""}</header>${demo}</section>
 <aside class="side" aria-labelledby="shT"><button class="close" type="button">Fermer</button><div class="yr">${x.y} · ${(window.objLabel&&objLabel(id))||x.obj[LANG]}</div><div class="bar" style="background:${x.col}"></div><h2 id="shT" class="disp">${x.t[LANG]}</h2><p><b>${x.rh[LANG]}</b></p><p>${x.design[LANG]}</p><p style="color:var(--muted)">${x.dev[LANG]}</p><div class="tags">${x.tags.map(t=>`<span>${t}</span>`).join("")}</div></aside>`;
 el.hidden=false;el.querySelector(".close").onclick=closeProject;el.querySelector(".close").focus();window.onProjectOpen&&onProjectOpen(id)}
function closeProject(){const el=document.getElementById("sheet");if(!el)return;el.hidden=true;el.innerHTML="";window.onProjectClose&&onProjectClose()}
