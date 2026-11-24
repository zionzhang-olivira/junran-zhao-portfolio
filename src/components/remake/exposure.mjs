import {sourceTimes as stops, sourceFrame} from "./fox-time.mjs";
const pad = n => String(n).padStart(2, "0");

export function initExposure(root, gsap) {
  if (!gsap || root.dataset.enhanced || !CSS.supports("mask-image", "url(example.webp)")) return;
  const one = s => root.querySelector(s);
  const keys = Array.from(root.querySelectorAll("[data-pose]"));
  const layers = ["before","after","selected"].map(k => one('[data-ink="'+k+'"]'));
  const tools = one(".ex-tools"), plates = one(".ex-plates"), still = one(".ex-registered");
  const scrub = one("input[type=range]"), compare = one("[data-compare]"), note = one("[data-ex-status]");
  const video = one("video"), play = one("[data-play-film]"), close = one("[data-return]");
  const minmax = gsap.utils.clamp(1, stops.length);
  const source = gsap.timeline({paused:true});
  source.fromTo(one(".ex-timing i"), {scaleX:0}, {scaleX:1, duration:2.24, ease:"none"});
  stops.forEach((t,i) => source.addLabel("f" + pad(i+1), t));
  source.seek("f17");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map();
  let current = 17, traces = true, request = 0, registration;

  function ink(n) {
    if (!cache.has(n)) {
      const url = new URL(root.dataset.frameRoot + "f" + pad(n) + ".webp", document.baseURI).href;
      const image = new Image();
      image.src = url;
      cache.set(n, image.decode().then(()=>url).catch(e=>{cache.delete(n);throw e}));
    }
    return cache.get(n);
  }
  function updateControls() {
    const time = stops[current-1].toFixed(2);
    const url = new URL(location.href);
    url.searchParams.set("frame",current);
    history.replaceState(history.state,"",url);
    one("[data-original-link]").href = "/work/fox-motion-studies/?from=animation&frame=" + current + "#original-film";
    one("[data-model-link]").href = "/work/fox-motion-studies/?from=animation&frame=" + current + "#model-sheet";
    [one("[data-frame-number]"),one("[data-output]")].forEach(el => el.textContent=pad(current));
    one("[data-source-time]").textContent = time+" s";
    scrub.value=String(current);
    scrub.setAttribute("aria-valuetext","Drawing "+current+", "+time+" seconds");
    one('[data-step="-1"]').disabled=current===1;
    one('[data-step="1"]').disabled=current===31;
    compare.setAttribute("aria-pressed", String(traces));
    keys.forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.pose)===current)));
    note.textContent = "Drawing "+current+" of 31 at "+time+" seconds. "+(traces ? "Earlier ink is pink. Later ink is teal." : "Single drawing.");
  }
  async function setDrawing(n, animate = true) {
    const selected = minmax(Math.round(Number(n)));
    if (!Number.isFinite(selected)) return;
    const turn = ++request;
    // Seek the GSAP time ruler by the actual source label, not by evenly spaced array indices.
    source.seek("f"+pad(selected));
    current = selected;
    updateControls();
    const include = traces;
    const ids = include ? [minmax(selected-9), minmax(selected+9), selected] : [selected];
    try {
      const urls = await Promise.all(ids.map(ink));
      if (turn !== request) return;
      registration?.kill();
      if (include) layers.forEach((layer,i)=>layer.style.setProperty("--drawing",'url("'+urls[i]+'")'));
      else layers[2].style.setProperty("--drawing",'url("'+urls[0]+'")');
      plates.hidden = false;
      still.style.visibility = "hidden";
      const [early,late] = layers;
      gsap.set(layers,{clearProps:"transform,opacity"});
      early.hidden = !include; late.hidden = !include;
      // Move the tracings onto the same peg registration, preserving the final camera field.
      if (include && animate && !reduced.matches) {
        registration = gsap.timeline();
        registration.fromTo(early,{x:-7,opacity:0},{x:0,opacity:1,duration:.19,ease:"power2.out"},0)
                    .fromTo(late,{x:7,opacity:0},{x:0,opacity:1,duration:.19,ease:"power2.out"},.09);
      }
      root.dataset.drawn=String(selected);
    } catch {
      if (turn === request) {
        note.textContent="That drawing could not load. Play the original film or choose another drawing.";
        plates.hidden=true;still.style.visibility="visible";
      }
    }
  }
  function returnToDrawings() {
    video.pause();video.hidden=true;close.hidden=true;play.hidden=false;
    tools.hidden=false;root.dataset.mode="drawings";
  }
  play.addEventListener("click",e=>{
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button>0) return;
    e.preventDefault();
    video.hidden=false;close.hidden=false;play.hidden=true;tools.hidden=true;root.dataset.mode="film";
    video.currentTime=stops[current-1];
    video.play().then(()=>close.focus({preventScroll:true})).catch(()=>{
      note.textContent="Use the video controls to play the original film.";
      video.focus({preventScroll:true});
    });
  });
  close.addEventListener("click",()=>{returnToDrawings();play.focus({preventScroll:true})});
  keys.forEach(b=>b.addEventListener("click",()=>setDrawing(b.dataset.pose)));
  root.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>setDrawing(current+Number(b.dataset.step))));
  scrub.addEventListener("input",()=>setDrawing(scrub.value));
  compare.addEventListener("click",()=>{traces=!traces;setDrawing(current)});
  function fromHash() {
    const m = location.hash.match(/^#frame-(\d{1,2})$/);
    if (!m) return;
    returnToDrawings();setDrawing(m[1], false);root.scrollIntoView({block:"center",behavior:"instant"});
  }
  const freeze = () => {if(document.hidden) video.pause()};
  const stopMotion = () => {if(reduced.matches && registration) registration.progress(1)};
  reduced.addEventListener("change",stopMotion);
  document.addEventListener("visibilitychange",freeze);
  window.addEventListener("hashchange",fromHash);
  window.addEventListener("pagehide",e=>{
    video.pause();
    if(e.persisted) return;
    source.kill();registration?.kill();reduced.removeEventListener("change",stopMotion);
    document.removeEventListener("visibilitychange",freeze);window.removeEventListener("hashchange",fromHash);
  });
  tools.hidden=false;
  root.dataset.enhanced="true";root.dataset.mode="drawings";setDrawing(sourceFrame(new URLSearchParams(location.search).get("frame")),false);fromHash();
}


