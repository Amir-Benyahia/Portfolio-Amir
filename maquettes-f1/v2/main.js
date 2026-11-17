import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildCar, materials } from "./car.js";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "./vendor/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";

const coarse = matchMedia("(pointer: coarse)").matches;
function composerFor(r, scene, cam, ao) {
  const c = new EffectComposer(r);
  c.addPass(new RenderPass(scene, cam));
  let gt = null;
  if (ao) { gt = new GTAOPass(scene, cam, 2, 2); gt.updateGtaoMaterial({ radius: ao.radius, distanceExponent: 1, thickness: ao.thickness || 1, scale: 1.2, samples: 16 }); gt.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); gt.blendIntensity = ao.intensity || 1; c.addPass(gt); }
  c.addPass(new OutputPass());
  return c;
}

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);

/* ---------------- copy (FR / EN) ---------------- */
const T = {
  fr: {
    skip: "Aller directement aux projets", navLabel: "Principale", navProjects: "Projets", navCv: "CV", navContact: "Contact",
    soundOff: "Son coupé", soundOn: "Son activé",
    friDay: "Vendredi, essais libres", h1: "Je conçois des interfaces qu'on comprend du premier coup.",
    lede: "Étudiant en M2 IHM à l'Université Côte d'Azur. Je cherche un <strong>stage UX de 6 mois à partir du 1<sup>er</sup> mars 2027</strong>, à Nice ou Sophia Antipolis.",
    ctaProjects: "Voir mes projets", ctaCv: "Télécharger mon CV (PDF)", dragHint: "La maquette se tourne à la souris ou au doigt.",
    weekendLabel: "Le week-end", w1: "Vendredi", w1s: "Qui je suis", w2: "Samedi", w2s: "Mes projets", w3: "Dimanche", w3s: "Le tour", w4: "Parc fermé", w4s: "CV et contact",
    satDay: "Samedi, qualifications", h2q: "Six projets, de l'entretien au produit en ligne.",
    sunDay: "Dimanche, la course", h2r: "Les mêmes projets, en un tour de circuit.",
    raceLede: "Un circuit imaginaire au bord de la baie. Chaque portique ouvre un projet. Compter une minute, et rien d'obligatoire : tout est déjà dans la liste au-dessus.",
    start: "Prendre le départ", keys: "Accélérer : ↑ ou espace. Freiner : ↓.",
    parcDay: "Parc fermé", h2p: "Parlons de votre équipe.",
    fAvail: "Disponible", fAvailV: "Du 1er mars au 31 août 2027", fZone: "Zone", fZoneV: "Côte d'Azur, véhiculé", fSchool: "Formation", fSchoolV: "M2 IHM, Université Côte d'Azur",
    mail: "Écrire à amirbenyahia550@gmail.com", mk: "Maquette de direction, version 2. Le site en ligne n'a pas changé.",
    lapTitle: "Tour de circuit", quit: "Quitter le tour", open: "Ouvrir le projet", pedal: "Accélérer",
    finishDay: "Drapeau à damier", again: "Refaire un tour", toParc: "Voir le CV et le contact",
    live: "Démo en direct", newTab: "Ouvrir dans un onglet", close: "Fermer",
    sector: (n) => `Secteur ${n}`, gantryK: (i, n) => `Portique ${i} sur ${n}`, openAria: (t) => `Ouvrir le projet : ${t}`,
    lightsOn: (n) => `${n} feu${n > 1 ? "x" : ""} allumé${n > 1 ? "s" : ""}`, lightsOut: "Extinction des feux, c'est parti.",
    react: (r) => r == null ? "Vous n'avez pas encore réagi aux feux." : `Temps de réaction : ${r.toFixed(2).replace(".", ",")} s.`,
    lapDone: (t) => `Tour bouclé en ${t}.`, near: (t) => `Portique : ${t}. Entrée pour ouvrir le projet.`,
    figma: "Maquette Figma", repo: "Code source", soonT: "Bientôt", soonP: "Le projet F1 est en préparation.",
  },
  en: {
    skip: "Skip to projects", navLabel: "Main", navProjects: "Projects", navCv: "Résumé", navContact: "Contact",
    soundOff: "Sound off", soundOn: "Sound on",
    friDay: "Friday, free practice", h1: "I design interfaces people get the first time.",
    lede: "M2 student in Human-Computer Interaction at Université Côte d'Azur. I'm looking for a <strong>6-month UX internship starting 1 March 2027</strong>, in Nice or Sophia Antipolis.",
    ctaProjects: "See my projects", ctaCv: "Download my résumé (PDF)", dragHint: "Drag the model to turn it.",
    weekendLabel: "The weekend", w1: "Friday", w1s: "Who I am", w2: "Saturday", w2s: "My projects", w3: "Sunday", w3s: "The lap", w4: "Parc fermé", w4s: "Résumé and contact",
    satDay: "Saturday, qualifying", h2q: "Six projects, from interviews to shipped product.",
    sunDay: "Sunday, the race", h2r: "The same projects, in one lap.",
    raceLede: "An imaginary circuit along the bay. Each gantry opens a project. It takes about a minute, and nothing is required: everything is already in the list above.",
    start: "Start the lap", keys: "Accelerate: ↑ or space. Brake: ↓.",
    parcDay: "Parc fermé", h2p: "Let's talk about your team.",
    fAvail: "Available", fAvailV: "1 March to 31 August 2027", fZone: "Area", fZoneV: "Côte d'Azur, has a car", fSchool: "Studies", fSchoolV: "M2 HCI, Université Côte d'Azur",
    mail: "Email amirbenyahia550@gmail.com", mk: "Direction mockup, version 2. The live site has not changed.",
    lapTitle: "Circuit lap", quit: "Leave the lap", open: "Open the project", pedal: "Accelerate",
    finishDay: "Chequered flag", again: "Drive another lap", toParc: "See résumé and contact",
    live: "Live demo", newTab: "Open in a new tab", close: "Close",
    sector: (n) => `Sector ${n}`, gantryK: (i, n) => `Gantry ${i} of ${n}`, openAria: (t) => `Open the project: ${t}`,
    lightsOn: (n) => `${n} light${n > 1 ? "s" : ""} on`, lightsOut: "Lights out, go.",
    react: (r) => r == null ? "You haven't reacted to the lights yet." : `Reaction time: ${r.toFixed(2)} s.`,
    lapDone: (t) => `Lap completed in ${t}.`, near: (t) => `Gantry: ${t}. Press Enter to open the project.`,
    figma: "Figma file", repo: "Source code", soonT: "Soon", soonP: "The F1 project is in progress.",
  },
};
let L = "fr";
try { L = localStorage.getItem("ab-lang") === "en" ? "en" : "fr"; } catch { L = "fr"; }
const t = (k) => T[L][k];

function applyLang() {
  document.documentElement.lang = L;
  document.querySelectorAll("[data-i]").forEach((el) => { const v = T[L][el.dataset.i]; if (typeof v === "string") el.textContent = v; });
  document.querySelectorAll("[data-i-html]").forEach((el) => { el.innerHTML = T[L][el.dataset.iHtml]; });
  document.querySelectorAll("[data-i-aria]").forEach((el) => el.setAttribute("aria-label", T[L][el.dataset.iAria]));
  const lb = $("#lang"); lb.textContent = L === "fr" ? "English" : "Français"; lb.lang = L === "fr" ? "en" : "fr";
  syncSound();
  renderProjects();
  if (gantryTex.length) drawGantries();
}
$("#lang").addEventListener("click", () => { L = L === "fr" ? "en" : "fr"; try { localStorage.setItem("ab-lang", L); } catch {} applyLang(); });

/* ---------------- projects ---------------- */
const ORDER = ["ceihm", "flux", "room", "spotify", "sampler", "maze"];
function renderProjects() {
  const ol = $("#projects");
  ol.innerHTML = ORDER.map((id) => {
    const x = P[id];
    return `<li class="row"><div><h3>${x.t[L]}</h3><span class="yr">${x.y}</span></div>
      <div><p>${x.rh[L]}</p><p class="m">${x.design[L]}</p><div class="tags">${x.tags.map((g) => `<span>${g}</span>`).join("")}</div></div>
      <button type="button" class="btn ghost" data-open="${id}" aria-label="${t("openAria")(x.t[L])}">${t("open")}</button></li>`;
  }).join("");
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openProject(b.dataset.open, b); });

let sheetReturn = null;
function openProject(id, from) {
  const x = P[id];
  sheetReturn = from || document.activeElement;
  $("#shY").textContent = x.y;
  $("#shT").textContent = x.t[L];
  $("#shRh").textContent = x.rh[L];
  $("#shDesign").textContent = x.design[L];
  $("#shDev").textContent = x.dev[L];
  $("#shDetail").innerHTML = x.detail ? x.detail[L].map((d) => `<li>${d}</li>`).join("") : "";
  $("#shNote").textContent = x.liveNote ? x.liveNote[L] : "";
  const links = [];
  if (x.figma) links.push(`<a href="${x.figma}" target="_blank" rel="noopener">${t("figma")}</a>`);
  if (x.repo) links.push(`<a href="${x.repo}" target="_blank" rel="noopener">${t("repo")}</a>`);
  $("#shLinks").innerHTML = links.join("");
  const fr = $("#shFrame");
  if (x.live) {
    fr.innerHTML = `<iframe src="../../${x.live}" title="${t("live")} : ${x.t[L]}" loading="lazy"></iframe>`;
    $("#shTab").href = `../../${x.live}`; $("#shTab").hidden = false;
  } else {
    fr.innerHTML = `<div class="soon"><p class="stretch" style="font-size:48px">${t("soonT")}</p><p>${t("soonP")}</p></div>`;
    $("#shTab").hidden = true;
  }
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
  $("#shClose").focus();
}
function closeProject() {
  $("#sheet").hidden = true;
  $("#shFrame").innerHTML = "";
  if ($("#lap").hidden) document.body.style.overflow = "";
  sheetReturn && sheetReturn.focus && sheetReturn.focus();
}
$("#shClose").addEventListener("click", closeProject);
trapFocus($("#sheet"));
trapFocus($("#lap"));
function trapFocus(root) {
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = [...root.querySelectorAll("a[href],button,iframe,[tabindex]")].filter((el) => !el.closest("[hidden]") && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ---------------- headline launch (single orchestrated moment) ---------------- */
function launchHeadline() {
  const h = $("#h1");
  if (reduce) { h.style.setProperty("--w", "78%"); return; }
  const t0 = performance.now(), D = 1100;
  h.style.setProperty("--w", "62%");
  const step = (now) => {
    const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 4);
    // overshoot slightly like a car pulling away, then settle
    const w = 62 + (84 - 62) * e - (k > 0.6 ? (k - 0.6) / 0.4 * 6 : 0);
    h.style.setProperty("--w", w.toFixed(1) + "%");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- shared renderer setup ---------------- */
function makeRenderer(host, alpha) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(r.domElement);
  return r;
}
function contactShadow(w, d, strength = 0.5) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, `rgba(20,21,23,${strength})`); gr.addColorStop(0.55, `rgba(20,21,23,${strength * 0.35})`); gr.addColorStop(1, "rgba(20,21,23,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.005;
  return m;
}

/* ---------------- STUDIO (hero) ---------------- */
const STUDIO_BG = 0xfafcf2; // calibrated so the tone-mapped render matches --beton
function studio() {
  const host = $("#studio");
  const r = makeRenderer(host, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(STUDIO_BG);
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const comp = composerFor(r, scene, cam, { radius: 0.6, intensity: 1.0 });
  const key = new THREE.DirectionalLight(0xfff4e8, 2.6);
  key.position.set(-6, 8, 3);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(6, 4, -8); scene.add(rim); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xcfd1cc, 0.5));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  scene.add(contactShadow(3.4, 7.2, 0.55));
  const car = buildCar();
  const turn = new THREE.Group(); turn.add(car); scene.add(turn);
  turn.add(contactShadow(3.4, 7.2, 0.0));
  let ang = -0.75, vel = 0, drag = null, visible = true, last = performance.now();
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    r.setSize(w, h, false); comp.setSize(w, h); cam.aspect = w / h;
    const narrow = w / h < 1.1;
    cam.fov = narrow ? 30 : 26;
    cam.position.set(narrow ? 6.6 : 7.6, narrow ? 2.6 : 2.0, narrow ? 8.6 : 9.2);
    cam.lookAt(narrow ? 0 : -0.5, narrow ? 0.4 : 0.55, 0);
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host); resize();
  host.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, a: ang }; host.setPointerCapture(e.pointerId); });
  host.addEventListener("pointermove", (e) => { if (!drag) return; const na = drag.a + (e.clientX - drag.x) * 0.008; vel = (na - ang) * 60; ang = na; });
  const end = () => { drag = null; };
  host.addEventListener("pointerup", end); host.addEventListener("pointercancel", end);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible && $("#lap").hidden) {
      if (!drag) { vel *= 0.94; ang += vel * dt * 0.2 + (reduce ? 0 : dt * 0.12); }
      turn.rotation.y = ang;
      comp.render();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------------- SOUND ---------------- */
let soundOn = false, actx = null, eng = null;
function syncSound() {
  const b = $("#sound"); b.setAttribute("aria-pressed", String(soundOn));
  b.querySelector("span:last-child").textContent = soundOn ? t("soundOn") : t("soundOff");
}
$("#sound").addEventListener("click", () => {
  soundOn = !soundOn;
  if (soundOn && !actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = actx.createOscillator(), o2 = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
    o1.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.Q.value = 4; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(actx.destination); o1.start(); o2.start();
    eng = { o1, o2, f, g };
  }
  if (actx) soundOn ? actx.resume() : actx.suspend();
  syncSound();
});
function engineSound(v, throttle, on) {
  if (!eng) return;
  const gears = [0, 22, 36, 48, 59, 69, 78, 86, 999];
  let gi = 0; while (v > gears[gi + 1]) gi++;
  const frac = (v - gears[gi]) / ((gears[gi + 1] === 999 ? 96 : gears[gi + 1]) - gears[gi]);
  const f = 70 + Math.max(0, Math.min(1, frac)) * 190 + gi * 6;
  const now = actx.currentTime;
  eng.o1.frequency.setTargetAtTime(f, now, 0.04);
  eng.o2.frequency.setTargetAtTime(f * 0.5, now, 0.04);
  eng.f.frequency.setTargetAtTime(500 + frac * 1400 + throttle * 900, now, 0.05);
  eng.g.gain.setTargetAtTime(on ? 0.025 + throttle * 0.035 : 0, now, 0.08);
}
function beep(freq, dur = 0.18) {
  if (!soundOn || !actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.value = freq; o.type = "sine"; g.gain.value = 0.08;
  g.gain.setTargetAtTime(0, actx.currentTime + dur * 0.6, 0.03);
  o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
}

/* ---------------- LAP ---------------- */
let lap = null;
const gantryTex = [];
function drawGantries() {
  gantryTex.forEach(({ ctx, tex, id, i, n }) => {
    const c = ctx.canvas, x = P[id];
    ctx.fillStyle = "#1c1d1f"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0b7a3b"; ctx.fillRect(0, 0, 22, c.height);
    ctx.fillStyle = "#c9cbc6"; ctx.font = "600 34px Archivo"; ctx.fontStretch = "normal";
    ctx.fillText(T[L].gantryK(i, n), 64, 70);
    ctx.fillStyle = "#f6f6f2"; ctx.fontStretch = "semi-condensed"; ctx.font = "800 84px Archivo";
    let size = 84; while (ctx.measureText(x.t[L]).width > c.width - 110 && size > 40) { size -= 4; ctx.font = `800 ${size}px Archivo`; }
    ctx.fillText(x.t[L], 64, 168);
    tex.needsUpdate = true;
  });
}

function buildLap() {
  const host = $("#lapStage");
  const r = makeRenderer(host, false);
  const scene = new THREE.Scene();
  const SKY = new THREE.Color(0xd4d2cb);
  scene.fog = new THREE.Fog(SKY, 160, 700);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0xaebdc4) }, hor: { value: SKY } },
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float k = smoothstep(0.0, 0.45, vp.y); gl_FragColor = vec4(mix(hor, top, k), 1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }",
  }));
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const cam = new THREE.PerspectiveCamera(54, 1, 0.3, 1400);
  const sun = new THREE.DirectionalLight(0xfff1e2, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0xc9ccc6, 0.55));

  // circuit
  const raw = [[0, 0], [170, 4], [250, -24], [292, -96], [262, -176], [178, -200], [126, -160], [70, -188], [-8, -252], [-114, -238], [-168, -164], [-136, -92], [-196, -30], [-170, 36], [-86, 34]];
  const curve = new THREE.CatmullRomCurve3(raw.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
  const N = 2400, LEN = curve.getLength();
  const pts = curve.getSpacedPoints(N);
  const tans = [], nrm = [], curv = [];
  for (let i = 0; i <= N; i++) { const tg = curve.getTangentAt(i / N); tans.push(tg); nrm.push(new THREE.Vector3(-tg.z, 0, tg.x)); }
  for (let i = 0; i <= N; i++) {
    const a = tans[(i - 6 + N) % N], b = tans[(i + 6) % N];
    const ang = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
    curv.push(ang / (12 * LEN / N));
  }
  const HW = 6.5;
  function ribbon(off0, off1, y, filter) {
    const pos = [], idx = [];
    let k = 0;
    for (let i = 0; i <= N; i++) {
      const p = pts[i], n = nrm[i];
      pos.push(p.x + n.x * off0, y, p.z + n.z * off0, p.x + n.x * off1, y, p.z + n.z * off1);
      if (i < N && (!filter || filter(i))) idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      k += 2;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });
  const add = (g, m, recv = true) => { const o = new THREE.Mesh(g, m); o.receiveShadow = recv; scene.add(o); return o; };
  const ground = add(new THREE.PlaneGeometry(2400, 2400), mat(0xd9dbd5, 0.95)); ground.rotation.x = -Math.PI / 2;
  add(ribbon(-HW, HW, 0.02), mat(0xa7a9a5, 0.92));
  add(ribbon(-HW + 0.35, -HW + 0.6, 0.03), mat(0xf6f6f2));
  add(ribbon(HW - 0.6, HW - 0.35, 0.03), mat(0xf6f6f2));
  // run-off strip and barriers in clay
  add(ribbon(HW, HW + 3.5, 0.015), mat(0xdcded9));
  add(ribbon(-HW - 3.5, -HW, 0.015), mat(0xdcded9));
  // kerbs: striped on tight corners, alternating tyre-black / clay
  const sharp = (i) => Math.abs(curv[i]) > 0.012;
  const stripe = (i) => Math.floor(i * LEN / N / 3.5) % 2 === 0;
  for (const side of [-1, 1]) {
    const o0 = side * HW, o1 = side * (HW + 1.5);
    const [a, b] = side < 0 ? [o1, o0] : [o0, o1];
    add(ribbon(a, b, 0.035, (i) => sharp(i) && stripe(i)), mat(0x1f2023, 0.7));
    add(ribbon(a, b, 0.035, (i) => sharp(i) && !stripe(i)), mat(0xf6f6f2, 0.7));
  }
  // barriers (low walls) with gaps nowhere: continuous clay wall on both sides
  function wall(off, h) {
    const pos = [], idx = []; let k = 0;
    for (let i = 0; i <= N; i += 2) {
      const p = pts[i], n = nrm[i];
      pos.push(p.x + n.x * off, 0, p.z + n.z * off, p.x + n.x * off, h, p.z + n.z * off);
      if (i + 2 <= N) idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      k += 2;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(g, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8, side: THREE.DoubleSide }));
    m.castShadow = true;
  }
  wall(HW + 3.6, 1.1); wall(-HW - 3.6, 1.1);
  // start / finish chequer
  {
    const c = document.createElement("canvas"); c.width = 256; c.height = 32; const g = c.getContext("2d");
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#1c1d1f" : "#f6f6f2"; g.fillRect(x * 16, y * 16, 16, 16); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 1.6), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.8 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(tans[0].x, tans[0].z) + Math.PI / 2;
    m.position.set(pts[0].x, 0.04, pts[0].z); m.receiveShadow = true; scene.add(m);
  }

  // sea: the bay south of the track, slightly glossy
  const sea = add(new THREE.PlaneGeometry(2400, 1200), new THREE.MeshStandardMaterial({ color: 0xbfccd0, roughness: 0.28, metalness: 0.05 }), false);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.2, 74 + 600);
  const quay = add(new THREE.BoxGeometry(2400, 1.2, 4), mat(0xf2f2ee)); quay.position.set(0, 0.2, 72); quay.castShadow = true;

  // moored boats along the quay
  {
    const hs = new THREE.Shape(); hs.moveTo(0, 6); hs.bezierCurveTo(1.6, 3.5, 1.7, -1, 1.5, -5); hs.lineTo(-1.5, -5); hs.bezierCurveTo(-1.7, -1, -1.6, 3.5, 0, 6);
    const hull = new THREE.ExtrudeGeometry(hs, { depth: 1.4, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 3 }); hull.rotateX(-Math.PI / 2);
    const cabin = new RoundedBoxGeometry(2.2, 1.1, 4, 2, 0.3);
    for (let b = 0; b < 26; b++) {
      const g = new THREE.Group(); const k = 0.8 + ((b * 37) % 10) / 14;
      const h = new THREE.Mesh(hull, materials.clay); h.castShadow = true; g.add(h);
      const c = new THREE.Mesh(cabin, materials.clay); c.position.set(0, 1.9, -0.8); c.castShadow = true; g.add(c);
      g.scale.setScalar(k); g.position.set(-230 + b * 14 + ((b * 13) % 5), 0.2, 80 + ((b * 7) % 3) * 2); g.rotation.y = Math.PI + (((b * 11) % 7) - 3) * 0.03;
      scene.add(g);
    }
  }
  // city blocks + umbrella pines, seeded so every visit looks the same
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const far = (x, z, min) => { for (let i = 0; i < N; i += 8) { const p = pts[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < min * min) return false; } return z < 62; };
  const blocks = [], pines = [];
  for (let i = 0; i < N; i += 7) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.35) continue;
      const pine = rnd() < 0.45;
      const off = side * (HW + (pine ? 8 : 20) + rnd() * 28);
      const x = pts[i].x + nrm[i].x * off, z = pts[i].z + nrm[i].z * off;
      if (!far(x, z, HW + (pine ? 6 : 14))) continue;
      if (pine) pines.push([x, z, 0.7 + rnd() * 0.6]);
      else { const tall = rnd() < 0.15; blocks.push([x, z, 10 + rnd() * 8, tall ? 18 + rnd() * 10 : 5 + rnd() * 9, 9 + rnd() * 7, Math.atan2(tans[i].x, tans[i].z)]); }
    }
  }
  // hills behind the city
  for (let k = 0; k < 9; k++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe1e3de, 1));
    h.scale.set(160 + rnd() * 120, 50 + rnd() * 60, 120); h.position.set(-700 + k * 180, 0, -560 - rnd() * 120); scene.add(h);
  }
  const bGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);
  const bMesh = new THREE.InstancedMesh(bGeo, mat(0xf3f3ef, 0.8), blocks.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), v3 = new THREE.Vector3();
  blocks.forEach(([x, z, w, h, d, ry], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); m4.compose(v3.set(x, h / 2, z), q, s3.set(w, h, d)); bMesh.setMatrixAt(i, m4); });
  bMesh.castShadow = bMesh.receiveShadow = true; scene.add(bMesh);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 1, 8), mat(0xd6d8d2), pines.length);
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 12), mat(0xe9ebe4, 0.9), pines.length);
  pines.forEach(([x, z, k], i) => {
    m4.compose(v3.set(x, 4.5 * k, z), q.identity(), s3.set(1, 9 * k, 1)); trunk.setMatrixAt(i, m4);
    m4.compose(v3.set(x, 9.2 * k, z), q, s3.set(5.5 * k, 1.8 * k, 5.5 * k)); crown.setMatrixAt(i, m4);
  });
  trunk.castShadow = crown.castShadow = true; scene.add(trunk, crown);

  // gantries: one per project
  const gIds = ORDER, gS = gIds.map((_, i) => LEN * (0.07 + i * 0.145));
  gantryTex.length = 0;
  gIds.forEach((id, i) => {
    const k = Math.round((gS[i] / LEN) * N), p = pts[k], tg = tans[k];
    const grp = new THREE.Group(); grp.position.copy(p); grp.rotation.y = Math.atan2(tg.x, tg.z);
    const post = new RoundedBoxGeometry(0.6, 7.6, 0.6, 2, 0.1);
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(post, materials.clay); m.position.set(sx * (HW + 1.6), 3.8, 0); m.castShadow = true; grp.add(m); }
    const beam = new THREE.Mesh(new RoundedBoxGeometry(HW * 2 + 4, 0.7, 0.7, 2, 0.12), materials.clay); beam.position.y = 7.4; beam.castShadow = true; grp.add(beam);
    const c = document.createElement("canvas"); c.width = 1024; c.height = 220;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    panel.position.set(0, 5.7, -0.36); panel.rotation.y = Math.PI; grp.add(panel);
    const back = new THREE.Mesh(new RoundedBoxGeometry(13.3, 3.05, 0.3, 2, 0.08), materials.dark); back.position.set(0, 5.7, -0.18); grp.add(back);
    scene.add(grp);
    gantryTex.push({ ctx: c.getContext("2d"), tex, id, i: i + 1, n: gIds.length });
  });
  document.fonts.load("800 84px Archivo").then(drawGantries);
  drawGantries();

  const car = buildCar(); scene.add(car);
  const shadowBlob = contactShadow(3.6, 7.4, 0.5); car.add(shadowBlob);

  const comp = coarse ? null : composerFor(r, scene, cam, { radius: 2.5, intensity: 0.9, thickness: 2 });
  lap = { r, scene, cam, sun, car, curve, pts, tans, nrm, curv, N, LEN, gS, gIds, host, comp, sky };
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; r.setSize(w, h, false); comp && comp.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();
}

const st = { s: 0, v: 0, thr: 0, brk: 0, running: false, out: false, tOut: 0, react: null, time: 0, near: -1, raf: 0, last: 0, done: false, paused: false };
function sample(arr, s) { const f = ((s % lap.LEN) + lap.LEN) % lap.LEN / lap.LEN * lap.N; const i = Math.floor(f); return arr[Math.min(i, lap.N)]; }
function fmt(sec) { const m = Math.floor(sec / 60), s = sec - m * 60; return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`.replace(".", L === "fr" ? "," : "."); }

function placeCar(dt) {
  const { car, cam, sun } = lap;
  const p = lap.curve.getPointAt(((st.s % lap.LEN) + lap.LEN) % lap.LEN / lap.LEN);
  const tg = lap.curve.getTangentAt(((st.s % lap.LEN) + lap.LEN) % lap.LEN / lap.LEN);
  car.position.copy(p);
  car.lookAt(p.clone().add(tg));
  const k = sample(lap.curv, st.s);
  car.rotateZ(-k * st.v * 0.05);
  for (const w of car.userData.wheels) w.rotation.x += st.v * dt / 0.36;
  // chase camera
  const narrowCam = lap.cam.aspect < 1;
  const back = (narrowCam ? 11 : 7.4) + st.v * 0.025, up = (narrowCam ? 3.2 : 2.1) + st.v * 0.004;
  const want = p.clone().addScaledVector(tg, -back); want.y = up;
  // lean the camera into corners slightly
  want.addScaledVector(new THREE.Vector3(-tg.z, 0, tg.x), k * 40);
  if (dt === 0) cam.position.copy(want); else cam.position.lerp(want, 1 - Math.exp(-dt * 6));
  const look = p.clone().addScaledVector(tg, 7); look.y = 1.0;
  if (!reduce && st.v > 60) { look.x += (Math.random() - 0.5) * 0.04 * (st.v - 60) / 30; look.y += (Math.random() - 0.5) * 0.03 * (st.v - 60) / 30; }
  cam.lookAt(look);
  const fov = 52 + Math.min(1, st.v / 90) * (reduce ? 4 : 16);
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  sun.position.copy(p).add(new THREE.Vector3(-70, 50, 45)); sun.target.position.copy(p);
}

function tick(now) {
  const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
  if (!st.paused && st.out && !st.done) {
    st.time += dt;
    const k = Math.abs(sample(lap.curv, st.s + st.v * 0.6));
    const cap = Math.min(90, Math.sqrt(38 / Math.max(k, 1e-4)));
    if (st.thr) st.v += (24 - st.v * 0.18) * dt;
    else st.v -= (4 + st.v * 0.02) * dt;
    if (st.brk) st.v -= 38 * dt;
    if (st.v > cap) st.v -= Math.min(st.v - cap, 34 * dt);
    st.v = Math.max(0, st.v);
    st.s += st.v * dt;
    // HUD
    $("#hudSpeed").textContent = Math.round(st.v * 3.6);
    document.querySelector(".speed").style.setProperty("--sw", (62 + Math.min(1, st.v / 88) * 63).toFixed(1) + "%");
    $("#hudTime").textContent = fmt(st.time);
    $("#hudSector").textContent = t("sector")(Math.min(3, 1 + Math.floor(st.s / lap.LEN * 3)));
    let near = -1;
    lap.gS.forEach((g, i) => { if (st.s > g - 140 && st.s < g + 70) near = i; });
    if (near !== st.near) {
      st.near = near;
      const card = $("#card");
      if (near >= 0) {
        const x = P[lap.gIds[near]];
        $("#cardK").textContent = t("gantryK")(near + 1, lap.gIds.length);
        $("#cardT").textContent = x.t[L];
        $("#cardOpen").setAttribute("aria-label", t("openAria")(x.t[L]));
        card.hidden = false;
        $("#lapLive").textContent = t("near")(x.t[L]);
        beep(880, 0.08);
      } else card.hidden = true;
    }
    if (st.s >= lap.LEN) finishLap();
  }
  engineSound(st.v, st.thr ? 1 : 0, !$("#lap").hidden && soundOn);
  placeCar(dt);
  lap.sky.position.copy(lap.cam.position);
  // drop ambient occlusion if this machine can't hold ~40 fps with it
  if (lap.comp) { lap.fr = (lap.fr || []); lap.fr.push(dt); if (lap.fr.length === 90) { const avg = lap.fr.reduce((a, b) => a + b) / 90; if (avg > 1 / 40) lap.comp = null; } }
  lap.comp ? lap.comp.render() : lap.r.render(lap.scene, lap.cam);
  st.raf = requestAnimationFrame(tick);
}

function finishLap() {
  st.done = true; st.thr = 0;
  $("#card").hidden = true;
  $("#finishT").textContent = fmt(st.time);
  $("#finishR").textContent = `${t("lapDone")(fmt(st.time))} ${t("react")(st.react)}`;
  $("#finish").hidden = false;
  $("#again").focus();
}

let lightTimers = [];
function lightsSequence() {
  const big = [...document.querySelectorAll("#lightsBig span")], small = [...document.querySelectorAll(".gantry-lights span")];
  const el = $("#lightsBig"); el.classList.remove("gone");
  [...big, ...small].forEach((s) => s.classList.remove("on"));
  lightTimers.forEach(clearTimeout); lightTimers = [];
  for (let n = 1; n <= 5; n++) lightTimers.push(setTimeout(() => {
    big[n - 1].classList.add("on"); small[n - 1].classList.add("on");
    $("#lapLive").textContent = t("lightsOn")(n); beep(520, 0.12);
  }, 700 + n * 900));
  const outAt = 700 + 5 * 900 + 600 + Math.random() * 1400;
  lightTimers.push(setTimeout(() => {
    [...big, ...small].forEach((s) => s.classList.remove("on"));
    el.classList.add("gone");
    st.out = true; st.tOut = performance.now();
    $("#lapLive").textContent = t("lightsOut"); beep(1040, 0.25);
    if (st.thr && st.react == null) st.react = 0;
  }, outAt));
}

function startLap() {
  $("#lap").hidden = false;
  if (!lap) buildLap();
  Object.assign(st, { s: 0, v: 0, thr: 0, brk: 0, out: false, react: null, time: 0, near: -1, done: false, paused: false });
  $("#lap").hidden = false; $("#finish").hidden = true; $("#card").hidden = true;
  $("#hudSpeed").textContent = "0"; $("#hudTime").textContent = fmt(0); $("#hudSector").textContent = t("sector")(1);
  document.body.style.overflow = "hidden";
  st.last = performance.now();
  placeCar(0);
  cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(tick);
  $("#quit").focus();
  lightsSequence();
}
function quitLap() {
  lightTimers.forEach(clearTimeout);
  cancelAnimationFrame(st.raf);
  engineSound(0, 0, false);
  $("#lap").hidden = true; document.body.style.overflow = "";
  document.querySelectorAll(".gantry-lights span").forEach((s) => s.classList.remove("on"));
  $("#start").focus();
}
$("#start").addEventListener("click", startLap);
$("#quit").addEventListener("click", quitLap);
$("#again").addEventListener("click", startLap);
$("#toParc").addEventListener("click", () => { quitLap(); });
$("#cardOpen").addEventListener("click", () => { if (st.near >= 0) { st.paused = true; st.thr = 0; openProject(lap.gIds[st.near], $("#cardOpen")); } });
$("#shClose").addEventListener("click", () => { st.paused = false; st.last = performance.now(); });

function throttle(on) {
  st.thr = on ? 1 : 0;
  if (on && st.out && st.react == null) st.react = (performance.now() - st.tOut) / 1000;
}
addEventListener("keydown", (e) => {
  if (!$("#sheet").hidden) { if (e.key === "Escape") { closeProject(); st.paused = false; st.last = performance.now(); } return; }
  if ($("#lap").hidden) return;
  if (e.key === "Escape") { quitLap(); return; }
  if (e.target.closest && e.target.closest("button,a") && (e.key === " " || e.key === "Enter")) {
    // let focused buttons work normally, except the space bar drives the car when focus is on Quit
    if (e.key === "Enter" || e.target.id !== "quit") return;
  }
  if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "z") { e.preventDefault(); throttle(true); }
  if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); st.brk = 1; }
  if (e.key === "Enter" && st.near >= 0 && !st.done) { e.preventDefault(); $("#cardOpen").click(); }
});
addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "z") throttle(false);
  if (e.key === "ArrowDown" || e.key === "s") st.brk = 0;
});
const pedal = $("#pedal");
pedal.addEventListener("pointerdown", (e) => { e.preventDefault(); pedal.setPointerCapture(e.pointerId); pedal.classList.add("down"); throttle(true); });
const up = () => { pedal.classList.remove("down"); throttle(false); };
pedal.addEventListener("pointerup", up); pedal.addEventListener("pointercancel", up);
pedal.addEventListener("contextmenu", (e) => e.preventDefault());

/* ---------------- weekend strip follows scroll ---------------- */
const links = [...document.querySelectorAll(".weekend a")];
["vendredi", "samedi", "dimanche", "parc"].forEach((id) => {
  new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + id));
  }), { threshold: 0.35 }).observe(document.getElementById(id));
});

/* ---------------- boot ---------------- */
applyLang();
document.fonts.ready.then(launchHeadline);
try { studio(); } catch (e) { console.warn("WebGL unavailable", e); $("#studio").remove(); }
window.__st = st;
