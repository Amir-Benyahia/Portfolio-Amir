// Abonnix: a fictional streaming service with two cancellation flows.
// "dark" = current flow with deliberate dark patterns, "fair" = flow following the French "résiliation en trois clics" rules.
// Every click inside the window is counted; clicks on [data-a] are logged with their label and any pattern they trigger.
(function(){
const $=id=>document.getElementById(id);
const screen=$("screen"),urlEl=$("url");
const TEST=/[?&](mode=)?test\b/.test(location.search);
const POSTERS=[["Les Calanques","S2",["#ff8a5b","#7a2e8e"]],["Code Azur","Nouveau",["#2ec5d3","#173a7a"]],["Le Dernier Ferry","",["#f6c35b","#a3402e"]],["Mistral","Série",["#9be0b4","#1e5a5a"]],["Nuit sur la Prom'","",["#ff5fa2","#2b1b4d"]],["Vallon obscur","Film",["#8b8fff","#141a3a"]]];
let ver="dark",st=null;

function fresh(v){return{ver:v,state:"home",menu:false,t0:0,running:false,clicks:0,log:[],seen:new Set(),caught:new Set(),outcome:null,timer:null,cd:299,cdTimer:null,toast:""}}
function now(){return st.t0?(performance.now()-st.t0)/1000:0}
function fmt(s){return s.toFixed(1).replace(".",",")+" s"}
function tick(){$("mTime").textContent=fmt(now());$("mClicks").textContent=st.clicks}

const H=(s)=>s; // template marker
function header(){return H(`<header class="ax-h"><b class="ax-logo">abonnix</b><nav><span>Accueil</span><span>Séries</span><span>Films</span></nav>
 ${st.ver==="fair"?`<button class="ax-link" data-a="fairDirect" data-l="Lien « Mon abonnement »">Mon abonnement</button>`:""}
 <button class="ax-avatar" data-a="menu" data-l="Menu du compte (Léa)" aria-expanded="${st.menu}"><i>L</i>Léa ▾</button>
 ${st.menu?menu():""}</header>`)}
function menu(){const items=st.ver==="fair"
 ?[["profiles","Profils"],["account","Mon compte"],["fairCancel","Résilier mon abonnement"],["help","Aide"],["logout","Se déconnecter"]]
 :[["profiles","Profils"],["account","Mon compte"],["help","Aide"],["logout","Se déconnecter"]];
 return `<div class="ax-menu" role="menu">${items.map(([a,l])=>`<button role="menuitem" data-a="${a}" data-l="Menu : ${l}">${l}</button>`).join("")}</div>`}
function posters(){return `<div class="ax-row">${POSTERS.map(([t,b,[a,c]])=>`<div class="ax-poster" style="background:linear-gradient(150deg,${a},${c})" data-a="poster" data-l="Affiche : ${t}"><span>${b}</span><b>${t}</b></div>`).join("")}</div>`}
function footer(){return `<footer class="ax-f"><span>© Abonnix (service fictif)</span><span>Confidentialité</span><span>CGU</span>${st.ver==="fair"?`<button class="ax-link" data-a="fairCancel" data-l="Pied de page : Résilier votre contrat">Résilier votre contrat</button>`:`<span>Cookies</span>`}</footer>`}

const SCREENS={
 home(){return{url:"accueil",html:`${header()}<main class="ax-main"><section class="ax-hero"><p>Reprendre la lecture</p><h3>Les Calanques · saison 2, épisode 4</h3><button class="ax-btn" data-a="play" data-l="Bouton Reprendre">▶ Reprendre</button></section><h4>Ma liste</h4>${posters()}</main>${footer()}`}},
 account(){if(st.ver==="fair")return{url:"compte",html:`${header()}<main class="ax-main narrow"><h2>Mon compte</h2>
  <div class="ax-card"><div><small>Votre offre</small><b>Premium 4K · 17,99 €/mois</b><span>Prochain prélèvement le 3 décembre</span></div><button class="ax-btn sec" data-a="plans" data-l="Changer d'offre">Changer d'offre</button><button class="ax-btn sec" data-a="fairCancel" data-l="Résilier mon abonnement (compte)">Résilier mon abonnement</button></div>
  <div class="ax-card"><div><small>Paiement</small><b>Carte •••• 4417</b></div><button class="ax-btn sec" data-a="payment" data-l="Moyens de paiement">Modifier</button></div></main>${footer()}`};
 st.seen.add("hidden");st.seen.add("prominence");return{url:"compte",html:`${header()}<main class="ax-main narrow">
  <h2>Mon compte</h2>
  <div class="ax-promo"><div><b>Passez à l'annuel et économisez 30 %</b><span>Premium 4K pour 150,99 € par an au lieu de 215,88 €.</span></div><button class="ax-btn big" data-a="annual" data-l="Bannière « Je passe à l'annuel »" data-trap="prominence">Je passe à l'annuel</button></div>
  <div class="ax-card"><div><small>Votre offre</small><b>Premium 4K · 17,99 €/mois</b><span>Prochain prélèvement le 3 décembre</span></div><button class="ax-btn sec" data-a="plans" data-l="Changer d'offre" data-trap="deadend">Changer d'offre</button></div>
  <div class="ax-card"><div><small>Paiement</small><b>Carte •••• 4417</b></div><button class="ax-btn sec" data-a="payment" data-l="Moyens de paiement" data-trap="deadend">Modifier</button></div>
  <div class="ax-card"><div><small>Profils</small><b>3 profils · 47 titres dans Ma liste</b></div></div>
  <p class="ax-tiny"><button class="ax-faint" data-a="other" data-l="Petit lien « Autres options »">Autres options</button></p>
 </main>${footer()}`}},
 plans(){return{url:"offres",html:`${header()}<main class="ax-main narrow"><h2>Choisir une offre</h2><div class="ax-plans">
  <div class="ax-plan"><b>Essentiel</b><span>7,99 €/mois</span><small>HD, 1 écran</small><button class="ax-btn sec" data-a="planPick" data-l="Offre Essentiel">Choisir</button></div>
  <div class="ax-plan hot"><em>Le plus choisi</em><b>Premium 4K</b><span>17,99 €/mois</span><small>4K, 4 écrans</small><button class="ax-btn" data-a="planPick" data-l="Offre Premium (actuelle)">Offre actuelle</button></div>
  <div class="ax-plan"><b>Annuel 4K</b><span>150,99 €/an</span><small>soit 12,58 €/mois</small><button class="ax-btn sec" data-a="planPick" data-l="Offre annuelle">Choisir</button></div>
 </div><p><button class="ax-link" data-a="account" data-l="Retour au compte">← Retour à mon compte</button></p></main>`}},
 help(){return{url:"aide",html:`${header()}<main class="ax-main narrow"><h2>Centre d'aide</h2>
  <div class="ax-search"><input id="axq" placeholder="Rechercher dans l'aide" aria-label="Rechercher dans l'aide"><button class="ax-btn sec" data-a="search" data-l="Recherche dans l'aide">Rechercher</button></div><p class="ax-note" id="axqr"></p>
  <ul class="ax-arts">
   <li><button data-a="artPause" data-l="Article : mettre en pause">Mettre mon abonnement en pause</button></li>
   <li><button data-a="artPay" data-l="Article : moyen de paiement">Changer de moyen de paiement</button></li>
   <li><button data-a="artProfiles" data-l="Article : profils">Gérer mes profils</button></li>
   <li><button data-a="artOffer" data-l="Article : mon compte et mon offre">Mon compte et mon offre</button></li>
  </ul></main>`}},
 article(){return{url:"aide/mon-offre",html:`${header()}<main class="ax-main narrow"><p><button class="ax-link" data-a="help" data-l="Retour à l'aide">← Centre d'aide</button></p><h2>Mon compte et mon offre</h2>
  <p>Vous pouvez changer d'offre à tout moment depuis <b>Mon compte</b>. Pour les autres démarches concernant votre abonnement, rendez-vous dans <b>Mon compte › Autres options</b>.</p>
  <p><button class="ax-btn sec" data-a="account" data-l="Lien vers Mon compte depuis l'article">Aller à Mon compte</button></p></main>`}},
 other(){st.seen.add("complex");st.seen.add("hierarchy");return{url:"compte/options",html:`${header()}<main class="ax-main narrow"><h2>Autres options</h2>
  <div class="ax-card hot"><div><small>Recommandé</small><b>Mettre mon compte en pause</b><span>Gardez vos profils et votre liste, reprenez quand vous voulez.</span></div><button class="ax-btn big" data-a="pause" data-l="« Mettre en pause » (recommandé)" data-trap="complex hierarchy">Mettre en pause</button></div>
  <div class="ax-card"><div><small>Données</small><b>Télécharger mes données</b></div><button class="ax-btn sec" data-a="data" data-l="Télécharger mes données" data-trap="deadend">Demander</button></div>
  <p class="ax-tiny"><button class="ax-faint" data-a="close" data-l="Petit lien « Fermer mon abonnement »">Fermer mon abonnement</button></p>
 </main>`}},
 pauseConfirm(){return{url:"compte/pause",html:`${header()}<main class="ax-main narrow"><h2>Mettre en pause 3 mois ?</h2><p>Votre abonnement reprendra automatiquement le 17 février. Vous ne serez pas prélevé·e d'ici là.</p>
  <p class="ax-actions"><button class="ax-btn big" data-a="pauseOk" data-l="Confirmer la pause" data-trap="continuity">Confirmer</button><button class="ax-link" data-a="other" data-l="Retour aux options">Retour</button></p></main>`}},
 shame(){st.seen.add("shame");st.seen.add("nagging");return{url:"compte/fermeture",html:`${header()}<main class="ax-main narrow center"><div class="ax-modal">
  <div class="ax-faces">${POSTERS.slice(0,3).map(([t,,[a,c]])=>`<i style="background:linear-gradient(150deg,${a},${c})"></i>`).join("")}</div>
  <h2>Léa, vous partez vraiment ?</h2><p>Vos 3 profils et les 47 titres de votre liste seront perdus. Les Calanques, saison 3, arrive le 12 décembre.</p>
  <button class="ax-btn big" data-a="keep" data-l="« Garder mes séries »" data-trap="shame">Garder mes séries</button>
  <button class="ax-faint" data-a="toOffer" data-l="« Non, je préfère perdre mes listes »">Non, je préfère perdre mes listes</button></div></main>`}},
 offer(){st.seen.add("countdown");st.seen.add("nagging");const m=String(Math.floor(st.cd/60)).padStart(2,"0"),s=String(st.cd%60).padStart(2,"0");return{url:"compte/offre-speciale",html:`${header()}<main class="ax-main narrow center"><div class="ax-modal">
  <p class="ax-flag">Offre réservée pour vous</p><h2>3 mois à 4,99 €/mois</h2><p>Cette offre expire dans <b class="ax-cd" id="axcd">${m}:${s}</b></p>
  <button class="ax-btn big" data-a="takeOffer" data-l="« J'en profite »" data-trap="countdown hiddencost">J'en profite</button>
  <button class="ax-faint" data-a="toSurvey" data-l="« Continuer sans l'offre »">Continuer sans l'offre</button></div></main>`}},
 survey(){st.seen.add("steps");st.seen.add("defaults");return{url:"compte/fermeture/raison",html:`${header()}<main class="ax-main narrow"><h2>Avant de partir, dites-nous pourquoi</h2>
  <fieldset class="ax-radios">${["C'est trop cher","Je ne regarde plus assez","Il manque des contenus","Problèmes techniques","Autre raison"].map((r,i)=>`<label><input type="radio" name="why" value="${i}" data-a="why" data-l="Raison : ${r}"> ${r}</label>`).join("")}</fieldset>
  <label class="ax-check"><input type="checkbox" id="axpause" checked data-a="untick" data-l="Décocher « mettre en pause plutôt que fermer »"> Je préfère mettre mon compte en pause 3 mois plutôt que le fermer définitivement</label>
  <p class="ax-actions"><button class="ax-btn" id="axgo" data-a="surveyGo" data-l="Continuer (questionnaire)" disabled>Continuer</button></p></main>`}},
 confirm(){st.seen.add("trick");st.seen.add("hierarchy");return{url:"compte/fermeture/confirmer",html:`${header()}<main class="ax-main narrow center"><div class="ax-modal">
  <h2>Confirmez-vous ne pas vouloir annuler la fermeture de votre abonnement ?</h2>
  <button class="ax-btn big" data-a="confirmNo" data-l="« Non » (gros bouton)" data-trap="trick hierarchy">Non</button>
  <button class="ax-btn sec" data-a="confirmYes" data-l="« Oui » (petit bouton)">Oui</button></div></main>`}},
 fairPage(){return{url:"compte/resilier",html:`${header()}<main class="ax-main narrow"><h2>Résilier votre contrat</h2>
  <div class="ax-recap"><div><small>Abonné·e</small><b>Léa M. · lea.m@example.com</b></div><div><small>Contrat</small><b>Premium 4K · 17,99 €/mois</b></div><div><small>Fin du contrat</small><b>3 décembre, aucun frais</b></div><div><small>Après cette date</small><b>Vos profils et votre liste sont conservés 10 mois si vous revenez.</b></div></div>
  <label class="ax-sel">Raison (facultatif) <select data-a="reason" data-l="Raison facultative"><option>Ne pas répondre</option><option>Trop cher</option><option>Je ne regarde plus assez</option><option>Autre</option></select></label>
  <p class="ax-actions"><button class="ax-btn" data-a="fairOk" data-l="Confirmer la résiliation">Confirmer la résiliation</button><button class="ax-btn sec" data-a="home" data-l="Ne pas résilier">Ne pas résilier</button></p></main>`}},
 doneOk(){return{url:"compte/resiliation-confirmee",html:`${header()}<main class="ax-main narrow center"><div class="ax-modal ok"><h2>Résiliation enregistrée</h2><p>Votre abonnement prend fin le 3 décembre. ${st.ver==="fair"?"Un accusé de réception a été envoyé à lea.m@example.com.":"Merci d'avoir utilisé Abonnix."}</p></div></main>`}},
 donePause(){return{url:"compte/pause-confirmee",html:`${header()}<main class="ax-main narrow center"><div class="ax-modal ok"><h2>C'est fait !</h2><p>À bientôt sur Abonnix. Votre compte est en pause jusqu'au 17 février.</p></div></main>`}}
};

const TOASTS={profiles:"Choisissez un profil pour continuer.",logout:"Vous êtes toujours abonné·e, même déconnecté·e.",payment:"Moyen de paiement : rien à changer ici.",data:"Demande enregistrée : vos données arriveront sous 30 jours.",planPick:"Offre inchangée.",play:"Lecture en pause pendant la mission.",poster:"Lecture en pause pendant la mission.",artPause:"La pause conserve votre abonnement et le reprend automatiquement.",artPay:"Rendez-vous dans Mon compte › Paiement.",artProfiles:"Jusqu'à 4 profils par compte."};

function go(s){st.state=s;st.menu=false;render()}
function toast(t){st.toast=t;const el=document.createElement("div");el.className="ax-toast";el.textContent=t;screen.appendChild(el);setTimeout(()=>el.remove(),2600)}
function render(){const r=SCREENS[st.state]();urlEl.textContent="abonnix.example/"+r.url;screen.innerHTML=r.html;
 const q=$("axq");if(q)q.addEventListener("keydown",e=>{if(e.key==="Enter")search()});
 if(st.state==="offer"&&!st.cdTimer)st.cdTimer=setInterval(()=>{st.cd=st.cd>0?st.cd-1:299;const el=$("axcd");if(el)el.textContent=String(Math.floor(st.cd/60)).padStart(2,"0")+":"+String(st.cd%60).padStart(2,"0")},1000);
 if(st.state!=="offer"&&st.cdTimer){clearInterval(st.cdTimer);st.cdTimer=null;st.cd=299}}
function search(){const q=($("axq").value||"").toLowerCase(),r=$("axqr");if(!r)return;
 r.textContent=/r[ée]sili|annul|arr[êe]t|stop|fermer|d[ée]sabonn/.test(q)?"Aucun résultat pour cette recherche. Essayez « pause » ou « offre ».":q?"Consultez les articles ci-dessous.":"";
 if(/r[ée]sili|annul|d[ée]sabonn/.test(q))catchP("hidden","Recherche « "+q+" » sans résultat")}
function catchP(ids,label){ids.split(" ").forEach(p=>{st.caught.add(p);st.seen.add(p)});const last=st.log[st.log.length-1];if(last&&!last.trap)last.trap=ids}

const ACT={
 menu(){st.menu=!st.menu;render()},
 account(){go("account")},help(){if(st.ver==="dark"){st.caught.add("steps");st.seen.add("steps")}go("help")},
 annual(){go("plans")},plans(){go("plans")},
 artOffer(){go("article")},search(){search()},
 other(){go("other")},pause(){go("pauseConfirm")},
 pauseOk(){end("paused")},close(){go("shame")},
 keep(){go("home");toast("Bonne nouvelle, vous gardez Abonnix Premium !")},
 toOffer(){go("offer")},
 takeOffer(){go("account");toast("Offre activée : 3 mois à 4,99 €, puis 17,99 €/mois.")},
 toSurvey(){go("survey")},
 why(){const b=$("axgo");if(b)b.disabled=false},untick(){},
 surveyGo(){const c=$("axpause");if(c&&c.checked){catchP("defaults");end("paused")}else go("confirm")},
 confirmNo(){go("account");toast("Fermeture annulée. Ravis de vous garder !")},
 confirmYes(){end("cancelled")},
 fairDirect(){go("fairPage")},fairCancel(){go("fairPage")},fairOk(){end("cancelled")},
 home(){go("home")},reason(){}
};

screen.addEventListener("click",e=>{if(st.outcome)return;
 if(e.target.tagName==="LABEL"&&e.target.querySelector("input"))return; // the input's own click follows
 if(!st.running){st.running=true;st.t0=performance.now();st.timer=setInterval(tick,100)}
 st.clicks++;const b=e.target.closest("[data-a]");
 if(b&&!b.disabled){const a=b.dataset.a;st.log.push({t:now(),screen:st.state,label:b.dataset.l||a,trap:b.dataset.trap||""});
  if(b.dataset.trap)b.dataset.trap.split(" ").forEach(p=>{st.caught.add(p);st.seen.add(p)});
  if(st.ver==="fair")st.caught.clear();
  if(ACT[a])ACT[a]();else if(TOASTS[a])toast(TOASTS[a]);
  if(TOASTS[a]&&ACT[a])toast(TOASTS[a])}
 else if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))st.log.push({t:now(),screen:st.state,label:"Clic dans un champ",trap:""});
 else st.log.push({t:now(),screen:st.state,label:"Clic hors d'un élément interactif",trap:"",miss:true});
 tick()});
screen.addEventListener("change",e=>{const s=e.target.closest("select[data-a]");if(s)st.log.push({t:now(),screen:st.state,label:"Raison choisie : "+s.value,trap:""})});

function end(outcome){if(st.outcome)return;st.outcome=outcome;st.time=now();clearInterval(st.timer);clearInterval(st.cdTimer);st.cdTimer=null;tick();
 if(st.ver==="dark"&&st.clicks>3)st.seen.add("roach");
 if(outcome==="paused")st.seen.add("continuity");
 render();$("giveUp").disabled=true;
 const run={ver:st.ver,outcome,time:+st.time.toFixed(1),clicks:st.clicks,caught:[...st.caught],seen:[...st.seen],log:st.log};
 RUNS[st.ver]=run;try{sessionStorage.setItem("abonnix-runs",JSON.stringify(RUNS))}catch(e){}
 if(TEST)askSEQ(run);else showReplay(run)}

let RUNS={};try{RUNS=JSON.parse(sessionStorage.getItem("abonnix-runs")||"{}")}catch(e){}
window.RUNS=()=>RUNS;

function askSEQ(run){const r=$("replay");r.hidden=false;r.innerHTML=`<div class="seq"><h2>Dans l'ensemble, cette tâche était…</h2><div class="seqrow">${[1,2,3,4,5,6,7].map(n=>`<button type="button" data-n="${n}">${n}</button>`).join("")}</div><div class="seqlab"><span>très difficile</span><span>très facile</span></div></div>`;
 r.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{run.seq=+b.dataset.n;Sessions.add(run);showReplay(run)});r.scrollIntoView({behavior:"smooth",block:"start"})}

const OUT={cancelled:["Résilié","ok"],paused:["Piégé : compte en pause, pas résilié","bad"],abandoned:["Abandon","bad"]};
function showReplay(run){const r=$("replay");r.hidden=false;const [ol,oc]=OUT[run.outcome];
 const pats=[...new Set([...run.seen])].filter(p=>PATTERNS[p]).sort((a,b)=>(run.caught.includes(b)-run.caught.includes(a)));
 const other=run.ver==="dark"?"fair":"dark",o=RUNS[other];
 r.innerHTML=`<div class="rp-head"><div><p class="kicker">${run.ver==="dark"?"Version actuelle":"Version conforme"}</p><h2 class="${oc}">${ol}</h2></div>
  <div class="kpis"><div><b>${fmt(run.time)}</b><span>temps</span></div><div><b>${run.clicks}</b><span>clics (cible : 3 max)</span></div><div><b>${run.caught.filter(p=>PATTERNS[p]).length}</b><span>pièges où vous êtes tombé·e</span></div></div></div>
  ${o?compare(RUNS.dark,RUNS.fair):""}
  ${pats.length?`<h3>Les pièges de ce parcours</h3><ul class="pats">${pats.map(p=>{const x=PATTERNS[p],c=run.caught.includes(p);return`<li class="${c?"caught":""}"><span class="tag">${c?"Vous êtes tombé·e dedans":"Rencontré"}</span><b>${x.name}</b><em>${x.path}</em><p>${x.fr}</p></li>`}).join("")}</ul>`:`<h3>Aucun piège sur ce parcours</h3><p class="sub">Accès direct depuis l'en-tête, le menu et le pied de page, récapitulatif avant confirmation, accusé de réception : ce que demande la résiliation en trois clics.</p>`}
  <details><summary>Votre parcours, clic par clic (${run.log.length})</summary><ol class="tl">${run.log.map(e=>`<li class="${e.trap?"trap":""}${e.miss?" miss":""}"><time>${fmt(e.t)}</time><span>${e.label}</span>${e.trap?`<em>${e.trap.split(" ").filter(p=>PATTERNS[p]).map(p=>PATTERNS[p].name).join(", ")}</em>`:""}</li>`).join("")}</ol></details>
  <p class="rp-actions">${run.ver==="dark"?`<button class="go" id="toFair" type="button">Essayer la version conforme</button>`:`<button class="go" id="toDark" type="button">Refaire la version actuelle</button>`}<button class="ghost" id="again" type="button">Recommencer cette version</button></p>
  <p class="note">Abonnix est fictif. Les pièges reprennent des patterns documentés par la recherche (Gray et al., CHI 2024) ; ils ne visent aucun service réel.</p>`;
 $("again").onclick=()=>start(run.ver);const tf=$("toFair"),td=$("toDark");if(tf)tf.onclick=()=>start("fair");if(td)td.onclick=()=>start("dark");
 r.scrollIntoView({behavior:"smooth",block:"start"})}
function compare(d,f){if(!d||!f)return"";const mx=Math.max(d.time,f.time,1),mc=Math.max(d.clicks,f.clicks,1);
 const bar=(v,m,cls,l)=>`<div class="cmp-row"><span>${l}</span><i class="${cls}" style="width:${Math.max(4,v/m*100)}%"></i><b>${typeof v==="number"&&l.includes("temps")?fmt(v):v}</b></div>`;
 return `<div class="cmp"><h3>Vos deux passages</h3>${bar(d.time,mx,"d","Actuelle, temps")}${bar(f.time,mx,"f","Conforme, temps")}${bar(d.clicks,mc,"d","Actuelle, clics")}${bar(f.clicks,mc,"f","Conforme, clics")}</div>`}

function start(v){if(st){clearInterval(st.timer);clearInterval(st.cdTimer)}ver=v;st=fresh(v);$("replay").hidden=true;$("giveUp").disabled=false;
 $("verTag").textContent=v==="dark"?"version actuelle":"version conforme";$("browser").dataset.ver=v;
 $("mKicker").textContent=v==="dark"?"Mission":"Mission, version conforme";
 $("mTitle").textContent=v==="dark"?"Vous êtes abonné·e à Abonnix. Résiliez votre abonnement.":"Même mission, avec un parcours conforme.";
 tick();render();if(v==="fair")$("browser").scrollIntoView({behavior:"smooth",block:"start"})}
$("giveUp").onclick=()=>{if(st&&!st.outcome){if(!st.running){st.t0=performance.now()}end("abandoned")}};
window.Flow={start,runs:()=>RUNS,TEST};
start("dark");
})();
