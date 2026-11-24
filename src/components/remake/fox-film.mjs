import {sourceFrame, sourceTimes} from "./fox-time.mjs";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

export function initFoxFilm(root) {
  const get = selector => root.querySelector(selector);
  const film = get("#fox-original"), partner = get("[data-comparison] video");
  const button = get("[data-study]"), controls = get("[data-study-tools]");
  const slider = get("#fox-playhead"), link = get("[data-context-back]");
  const params = new URLSearchParams(location.search);
  const frame = sourceFrame(params.get("frame"), null);
  const time = frame ? sourceTimes[frame - 1] : 0;
  const origin = params.get("from");
  const subject = film.closest("figure");
  const motion = window.matchMedia("(min-width: 760px) and (prefers-reduced-motion: no-preference)");
  let transition;
  function beforeLayout() {
    transition?.kill();
    gsap.set(subject, {clearProps:"transform,transformOrigin,width,height"});
    return motion.matches ? Flip.getState(subject) : null;
  }
  function afterLayout(state) {
    if (state) transition = Flip.from(state, {duration:.26,ease:"power2.out",scale:true});
  }
  window.addEventListener("pagehide", () => transition?.progress(1).kill());
  const home = origin === "home" || (!origin && frame && (!document.referrer || new URL(document.referrer).pathname === "/"));
  if (home) {
    link.href = "/?frame=" + (frame || 17) + "#drawing";
    link.textContent = "← Back to your drawing";
  } else if (frame) {
    link.href = "/work/animation/?frame=" + frame + "#drawing";
    link.textContent = "← Back to exposure sheet";
  }
  const status = get("[data-film-context]");
  // The visible source exposure travels to the held plate across a normal link.
  // A direct visit, slow navigation or reduced-motion visit starts on the final plate.
  function arriveFromCover() {
    let entry;
    try {
      entry = JSON.parse(sessionStorage.getItem("junran-pose-entry"));
      sessionStorage.removeItem("junran-pose-entry");
    } catch { return; }
    if (!home || entry?.frame !== frame || Date.now()-entry.created > 1600 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ghost = new Image();
    ghost.alt = "";
    ghost.setAttribute("aria-hidden","true");
    ghost.src = "/studies/fox/inks/f" + String(frame).padStart(2,"0") + ".webp";
    ghost.decode().then(() => requestAnimationFrame(() => {
      if (!comparing || document.hidden || Date.now()-entry.created>1600) return;
      const box = film.getBoundingClientRect();
      if (!box.width || box.bottom<0 || box.top>innerHeight) return;
      Object.assign(ghost.style,{position:"fixed",zIndex:"9",pointerEvents:"none",margin:"0",left:box.x+"px",top:box.y+"px",width:box.width+"px",height:box.height+"px",maxWidth:"none",backgroundColor:"#ffcca2",transformOrigin:"0 0"});
      document.body.append(ghost);
      const animation=gsap.timeline({onComplete:cleanup})
        .fromTo(ghost,{x:entry.x-box.x,y:entry.y-box.y,scaleX:entry.width/box.width,scaleY:entry.height/box.height},{x:0,y:0,scaleX:1,scaleY:1,duration:.27,ease:"power3.out"})
        .to(ghost,{opacity:0,duration:.1},"-=.06");
      function cleanup() {
        ghost.remove();
        window.removeEventListener("pagehide",interrupt);
        window.removeEventListener("pointerdown",interrupt,true);
        window.removeEventListener("keydown",interrupt,true);
      }
      function interrupt(){animation.kill();cleanup();}
      window.addEventListener("pagehide",interrupt,{once:true});
      window.addEventListener("pointerdown",interrupt,{once:true,capture:true});
      window.addEventListener("keydown",interrupt,{once:true,capture:true});
    })).catch(()=>{});
  }
  const entry = frame ? "Drawing " + String(frame).padStart(2, "0") + " · " + time.toFixed(2) + " s" : "Original film · Junran Zhao";
  status.textContent = entry;
  let held = 0, moved = 0, comparing = false;

  function whenReady(video, callback) {
    if (video.readyState >= 1) callback();
    else video.addEventListener("loadedmetadata", callback, {once:true});
  }
  function move(video, seconds) {
    whenReady(video, () => {video.currentTime = Math.min(seconds, Math.max(0, video.duration - .001));});
  }
  function position(value, fallback) {
    if (!value) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(2.239, Math.max(0,number)) : fallback;
  }
  function remember(active, at) {
    const url = new URL(location.href);
    url.searchParams.delete("play");
    if (active) {
      url.searchParams.set("study","1");url.searchParams.set("held",held.toFixed(3));
    } else {
      url.searchParams.delete("study");url.searchParams.delete("held");
    }
    url.searchParams.set("moment",at.toFixed(3));
    history.replaceState(history.state, "", url);
  }
  function times() {
    get("[data-held-time]").textContent = held.toFixed(2) + " s";
    get("[data-moving-time]").textContent = moved.toFixed(2) + " s";
    slider.setAttribute("aria-valuetext", moved.toFixed(2) + " seconds");
    status.textContent = Math.abs(moved-held).toFixed(2) + " s between poses";
  }
  function compare(a,b,announce) {
    const previous = announce && beforeLayout();
    film.pause();comparing = true;held = a;moved = b;
    const nextIndex = sourceTimes.findLastIndex(seconds => seconds <= moved);
    partner.poster = "/studies/fox/inks/f" + String(nextIndex + 1).padStart(2, "0") + ".webp";
    button.hidden = true;film.controls = false;controls.hidden = false;
    get("[data-held-label]").hidden = false;get("[data-comparison]").hidden = false;
    root.classList.add("fx-comparing");
    afterLayout(previous);
    if (!partner.hasAttribute("src")) {partner.src = film.currentSrc || film.src;partner.load();}
    move(film, held);move(partner,moved);slider.value = moved;times();
    if (announce) {remember(true,moved);slider.focus({preventScroll:true});}
  }
  function play() {
    void film.play().catch(() => { status.textContent = "Press Play to watch the original film."; });
  }
  button.hidden = false;
  button.addEventListener("click", () => {
    compare(film.currentTime, Math.min(2.23, film.currentTime + .21),true);
  });
  slider.addEventListener("input", () => {moved = Number(slider.value);move(partner,moved);times();});
  slider.addEventListener("change", () => remember(true,moved));
  get("[data-hold]").addEventListener("click", () => {held = moved;move(film,held);times();remember(true,moved);});
  get("[data-rejoin]").addEventListener("click", () => {
    const previous = beforeLayout();
    comparing = false;root.classList.remove("fx-comparing");
    controls.hidden = true;get("[data-held-label]").hidden = true;get("[data-comparison]").hidden = true;
    afterLayout(previous);
    film.controls = true;button.hidden = false;move(film,moved);remember(false,moved);
    status.textContent = "Original film · " + moved.toFixed(2) + " s";film.focus({preventScroll:true});play();
  });
  whenReady(film, () => {
    const at = position(params.get("moment"),time);
    if (params.get("study") === "1") {
      compare(position(params.get("held"),time),position(params.get("moment"),Math.min(2.23,time+.21)),false);
      arriveFromCover();
      return;
    }
    move(film,at);
    if (params.get("play") === "1") play();
  });
  film.addEventListener("pause", () => {
    if (!comparing && film.currentTime > 0 && !document.hidden) remember(false,film.currentTime);
  });
}

