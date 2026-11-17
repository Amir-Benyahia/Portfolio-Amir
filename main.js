(() => {
const $ = (s) => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- copy ---------- */
const T = {
  fr: {
    skip: "Aller directement aux projets", homeAria: "Amir Benyahia, retour en haut", navLabel: "Principale",
    navProjects: "Projets", navCv: "CV", navContact: "Contact",
    claim: "Je conçois des interfaces qu'on comprend du premier coup.",
    facts: "Étudiant en M2 IHM à l'Université Côte d'Azur. Je cherche un <strong>stage UX de 6 mois à partir du 1<sup>er</sup> mars 2027</strong>, à Nice ou Sophia Antipolis.",
    ctaProjects: "Voir les projets", ctaCv: "CV en PDF", skipIntro: "Passer l'intro",
    gridKicker: "Grille de départ", h2p: "Huit projets, de l'entretien au produit en ligne.",
    parcKicker: "Parc fermé", h2c: "On en parle ?",
    fAvail: "Disponible", fAvailV: "Du 1er mars au 31 août 2027", fZone: "Zone", fZoneV: "Côte d'Azur, véhiculé", fSchool: "Formation", fSchoolV: "M2 IHM, Université Côte d'Azur",
    mail: "Écrire à amirbenyahia550@gmail.com",
    live: "Démo en direct", newTab: "Ouvrir dans un onglet", close: "Fermer",
    demo: "Voir la démo", figma: "Maquette Figma", repo: "Code source", video: "Vidéo", techKicker: "Côté technique", tech1: "Microservices sécurisés", tech2: "Algorithmes de flots", tech3: "Reconnaissance faciale", techLead: "Des projets sans angle UX, mais qui montrent que je sais ce qui se passe sous l'interface.", demoAria: (t) => `Voir la démo : ${t}`,
    shotAlt: (t) => `Capture de la démo : ${t}`,
  },
  en: {
    skip: "Skip to projects", homeAria: "Amir Benyahia, back to top", navLabel: "Main",
    navProjects: "Projects", navCv: "Résumé", navContact: "Contact",
    claim: "I design interfaces people get the first time.",
    facts: "M2 student in Human-Computer Interaction at Université Côte d'Azur. I'm looking for a <strong>6-month UX internship starting 1 March 2027</strong>, in Nice or Sophia Antipolis.",
    ctaProjects: "See the projects", ctaCv: "Résumé (PDF)", skipIntro: "Skip intro",
    gridKicker: "Starting grid", h2p: "Eight projects, from interviews to shipped product.",
    parcKicker: "Parc fermé", h2c: "Let's talk",
    fAvail: "Available", fAvailV: "1 March to 31 August 2027", fZone: "Area", fZoneV: "Côte d'Azur, has a car", fSchool: "Studies", fSchoolV: "M2 HCI, Université Côte d'Azur",
    mail: "Email amirbenyahia550@gmail.com",
    live: "Live demo", newTab: "Open in a new tab", close: "Close",
    demo: "See the demo", figma: "Figma file", repo: "Source code", video: "Video", techKicker: "Under the hood", tech1: "Secured microservices", tech2: "Network flow algorithms", tech3: "Face recognition", techLead: "Projects with no UX angle, but they show I know what happens beneath the interface.", demoAria: (t) => `See the demo: ${t}`,
    shotAlt: (t) => `Screenshot of the demo: ${t}`,
  },
};
let L = "fr";
try { if (localStorage.getItem("ab-lang") === "en") L = "en"; } catch (e) {}
const t = (k) => T[L][k];

function applyLang() {
  document.documentElement.lang = L;
  document.querySelectorAll("[data-i]").forEach((el) => { const v = T[L][el.dataset.i]; if (typeof v === "string") el.textContent = v; });
  document.querySelectorAll("[data-i-html]").forEach((el) => { el.innerHTML = T[L][el.dataset.iHtml]; });
  document.querySelectorAll("[data-i-aria]").forEach((el) => el.setAttribute("aria-label", T[L][el.dataset.iAria]));
  const b = $("#lang"); b.textContent = L === "fr" ? "English" : "Français"; b.lang = L === "fr" ? "en" : "fr";
  renderRail();
}
$("#lang").addEventListener("click", () => { L = L === "fr" ? "en" : "fr"; try { localStorage.setItem("ab-lang", L); } catch (e) {} applyLang(); });

/* ---------- projects ---------- */
const ORDER = ["ceihm", "comclick", "dz", "flux", "room", "spotify", "maze", "sampler"];
function renderRail() {
  $("#rail").innerHTML = ORDER.map((id) => {
    const x = P[id];
    const links = [];
    if (x.figma) links.push(`<a class="btn line" href="${x.figma}" target="_blank" rel="noopener">${t("figma")}</a>`);
    else if (x.repo) links.push(`<a class="btn line" href="${x.repo}" target="_blank" rel="noopener">${t("repo")}</a>`);
    const pos = ORDER.indexOf(id) + 1;
    return `<li class="stand">
      <figure class="shot" data-open="${id}" aria-hidden="true"><img src="img/${id}.webp" srcset="img/${id}-s.webp 800w, img/${id}.webp 1600w" sizes="(min-width:900px) 50vw, 100vw" alt="" loading="lazy" decoding="async" width="1600" height="1000"></figure>
      <div class="info">
        <p class="pos" aria-hidden="true"><small>P</small>${pos}</p>
        <p class="yr">${x.y}${x.award ? ` <strong class="award">${x.award[L]}</strong>` : ""}${x.wip ? ` <strong class="wip">${x.wip[L]}</strong>` : ""}</p>
        <h3>${x.t[L]}</h3>
        <p class="rh">${x.rh[L]}</p>
        <p class="ds">${x.design[L]}</p>
        <ul class="tags">${x.tags.map((g) => `<li>${g}</li>`).join("")}</ul>
        <div class="ctas"><button type="button" class="btn blue" data-open="${id}" aria-label="${t("demoAria")(x.t[L])}">${t("demo")}</button>${links.join("")}</div>
      </div></li>`;
  }).join("");
  layout();
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openProject(b.dataset.open, b.tagName === "BUTTON" ? b : b.closest(".stand").querySelector("button")); });

let back = null;
function openProject(id, from) {
  const x = P[id];
  back = from;
  $("#shY").textContent = [x.y, x.award?.[L], x.wip?.[L]].filter(Boolean).join(" · ");
  $("#shT").textContent = x.t[L];
  $("#shRh").textContent = x.rh[L];
  $("#shDesign").textContent = x.design[L];
  $("#shDev").textContent = x.dev[L];
  $("#shDetail").innerHTML = x.detail ? x.detail[L].map((d) => `<li>${d}</li>`).join("") : "";
  $("#shNote").textContent = x.liveNote ? x.liveNote[L] : "";
  const links = [];
  if (x.figma) links.push(`<a href="${x.figma}" target="_blank" rel="noopener">${t("figma")}</a>`);
  if (x.repo) links.push(`<a href="${x.repo}" target="_blank" rel="noopener">${t("repo")}</a>`);
  if (x.video) links.push(`<a href="${x.video}" target="_blank" rel="noopener">${t("video")}</a>`);
  $("#shLinks").innerHTML = links.join("");
  const src = x.langParam ? `${x.live}?lang=${L}` : x.live;
  $("#shFrame").innerHTML = `<iframe src="${src}" title="${t("live")} : ${x.t[L]}"></iframe>`;
  $("#shTab").href = src;
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  $("#shClose").focus();
}
function closeProject() {
  $("#sheet").hidden = true; $("#shFrame").innerHTML = ""; document.body.style.overflow = "";
  back && back.focus();
}
$("#shClose").addEventListener("click", closeProject);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeProject(); });
$("#sheet").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const f = [...$("#sheet").querySelectorAll("a[href],button,iframe")].filter((el) => el.offsetParent !== null);
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
});

/* ---------- the straight: vertical scroll drives a horizontal rail ---------- */
const sec = $("#projets"), rail = $("#rail"), blur = $("#mblurStd");
const wide = matchMedia("(min-width: 900px) and (min-height: 620px)");
let maxX = 0, lastX = 0, vel = 0, raf = 0;
function layout() {
  const horiz = wide.matches;
  sec.classList.toggle("horizontal", horiz);
  sec.style.setProperty("--n", ORDER.length);
  rail.style.transform = ""; rail.style.filter = "";
  if (horiz) { const c = rail.children; maxX = c.length > 1 ? (c[1].offsetLeft - c[0].offsetLeft) * (c.length - 1) : 0; }
  onScroll();
}
function progress() {
  const r = sec.getBoundingClientRect();
  const span = sec.offsetHeight - innerHeight;
  return Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
}
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const p = progress();
    const segs = document.querySelectorAll(".sectors span");
    segs.forEach((sg, i) => { const f = Math.min(1, Math.max(0, p * 3 - i)); sg.firstChild.style.transform = `scaleX(${f})`; sg.classList.toggle("done", f >= 1); });
    document.querySelector(".sectors").classList.toggle("best", p >= 0.995);
    $("#cur").textContent = Math.min(ORDER.length, 1 + Math.floor(p * ORDER.length * 0.999));
    if (!sec.classList.contains("horizontal")) return;
    const x = -p * maxX;
    rail.style.transform = `translate3d(${x}px,0,0)`;
    if (!reduce) {
      vel = vel * 0.6 + Math.abs(x - lastX) * 0.4;
      const s = Math.min(14, vel * 0.12);
      blur.setAttribute("stdDeviation", `${s.toFixed(2)} 0`);
      rail.classList.toggle("moving", s > 0.3);
      clearTimeout(onScroll.t);
      onScroll.t = setTimeout(() => { vel = 0; blur.setAttribute("stdDeviation", "0 0"); rail.classList.remove("moving"); }, 90);
    }
    lastX = x;
  });
}
addEventListener("scroll", onScroll, { passive: true });
const topBar = $(".top");
addEventListener("scroll", () => topBar.classList.toggle("scrolled", scrollY > 40), { passive: true });
addEventListener("resize", layout);
wide.addEventListener && wide.addEventListener("change", layout);
// keyboard users: bring a focused stand into view inside the pinned straight
rail.addEventListener("focusin", (e) => {
  if (!sec.classList.contains("horizontal")) return;
  const li = e.target.closest(".stand"); if (!li) return;
  const i = [...rail.children].indexOf(li);
  const span = sec.offsetHeight - innerHeight;
  const top = sec.offsetTop + span * (i / (ORDER.length - 1));
  scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
});

/* ---------- fit the name to the width (font size is capped by height) ---------- */
let restW = 88;
function fitName() {
  const name = $("#name"), l2 = name.querySelector(".l2");
  const avail = name.clientWidth - parseFloat(getComputedStyle(l2).paddingLeft);
  let w = 88;
  for (let k = 0; k < 3; k++) {
    name.style.setProperty("--w", w);
    const range = document.createRange(); range.selectNodeContents(l2);
    const tw = range.getBoundingClientRect().width;
    w = Math.max(60, Math.min(150, w * (avail * 0.97) / tw));
  }
  restW = Math.round(w);
  name.style.setProperty("--w", restW);
}
addEventListener("resize", fitName);

/* ---------- intro: lights out, then the name goes past ---------- */
function intro() {
  const html = document.documentElement;
  if (!html.classList.contains("intro")) return;
  const lights = [...document.querySelectorAll(".lights i")];
  const spans = [...document.querySelectorAll(".name span")];
  const bar = $(".track span"), grid = $(".hero-grid");
  let timers = [], frame = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    timers.forEach(clearTimeout); cancelAnimationFrame(frame);
    lights.forEach((l) => l.classList.remove("on"));
    spans.forEach((s) => { s.style.transform = ""; s.style.filter = ""; s.style.removeProperty("--w"); });
    bar.style.clipPath = ""; grid.style.opacity = ""; grid.style.transform = "";
    html.classList.remove("intro");
    try { sessionStorage.setItem("ab-intro", "1"); } catch (e) {}
  };
  $("#skipIntro").addEventListener("click", () => { finish(); $("#name").focus && $("#skipIntro").blur(); });
  lights.forEach((l, i) => timers.push(setTimeout(() => l.classList.add("on"), 450 + i * 380)));
  const outAt = 450 + 5 * 380 + 350 + Math.random() * 500;
  timers.push(setTimeout(() => {
    lights.forEach((l) => l.classList.remove("on"));
    const t0 = performance.now(), D = 1050;
    const easeOut = (k) => 1 - Math.pow(1 - k, 4);
    const step = (now) => {
      spans.forEach((s, i) => {
        const k = Math.min(1, Math.max(0, (now - t0 - i * 110) / D)), e = easeOut(k);
        const x = (1 - e) * -130; // vw
        const w = 150 - (150 - restW) * e;
        const skew = (1 - e) * -16;
        const b = (1 - e) * 26;
        s.style.transform = `translateX(${x}vw) skewX(${skew}deg)`;
        s.style.setProperty("--w", w.toFixed(1));
        if (i === 0) $("#nblurStd").setAttribute("stdDeviation", `${b.toFixed(1)} 0`);
        s.style.filter = b > 0.4 ? "url(#nblur)" : "";
      });
      const kb = Math.min(1, (now - t0) / 700);
      bar.style.clipPath = `inset(0 ${(100 - easeOut(kb) * 100).toFixed(2)}% 0 0)`;
      if (now - t0 > D * 0.75) { grid.style.opacity = "1"; grid.style.transform = "none"; }
      if (now - t0 < D + 200) frame = requestAnimationFrame(step); else finish();
    };
    frame = requestAnimationFrame(step);
  }, outAt));
}

/* ---------- boot ---------- */
applyLang();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitName(); layout(); intro(); }); else intro();
})();
