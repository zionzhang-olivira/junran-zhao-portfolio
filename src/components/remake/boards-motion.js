// Pixel coordinates are measured on the 1514 × 463 sword panorama.
export function mountCamera({ gsap, range, finder, lens, play, output, onPose = (_position) => {} }) {
  const clamp = gsap?.utils.clamp(0, 1) ?? (value => Math.max(0, Math.min(1, value)));
  const read = { position: Number(range.value) / 100 };
  const abort = new AbortController();
  const events = { signal: abort.signal };
  let sequence;
  const update = () => {
    const p = clamp(read.position);
    const x = 22 + p * 1007;
    const y = 134 - p * 50;
    const width = 473 + p * 4;
    const scale = 473 / width;
    finder.style.transform = "translate(" + (p * 1007 / 473 * 100) + "%," + (-p * 50 / 265 * 100) + "%) scaleX(" + (width / 473) + ")";
    lens.style.transform = "translate(" + (-x / 1514 * 100 * scale) + "%," + (-y / 463 * 100 * scale) + "%) scale(" + scale + ")";
    const percent = Math.round(p * 100);
    range.value = String(percent);
    output.value = percent + "%";
    onPose(percent);
    range.setAttribute("aria-valuetext", percent + " percent through the pan");
  };
  const pause = () => {
    sequence?.pause();
    play.textContent = "Play pan";
  };
  const media = gsap?.matchMedia();
  media?.add({ compact: "(max-width: 720px)", wide: "(min-width: 721px)", reduce: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
    const current = Number(range.value) / 100;
    sequence = gsap.timeline({ paused: true, defaults: { ease: "none" }, onUpdate: update, onComplete: pause });
    const duration = conditions.compact ? 3.25 : 4.25;
    sequence.addLabel("start", 0)
      .fromTo(read, { position: 0 }, { position: 1, duration, immediateRender: false }, "start")
      .addLabel("turn", duration / 2).addLabel("stop", duration);
    sequence.progress(current);
    play.hidden = conditions.reduce;
    return () => { pause(); sequence.kill(); sequence = undefined; };
  });
  range.addEventListener("input", () => {
    pause();
    const value = Number(range.value) / 100;
    if (sequence) sequence.progress(value);
    read.position = value;
    update();
  }, events);
  play.addEventListener("click", () => {
    if (!sequence) return;
    if (sequence.isActive()) return pause();
    if (sequence.progress() >= .999) sequence.progress(0);
    play.textContent = "Pause pan";
    sequence.play();
  }, events);
  document.addEventListener("junran:film-open", pause, events);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, events);
  window.addEventListener("keydown", event => { if (event.key === "Escape") pause(); }, events);
  window.addEventListener("pagehide", event => { if (event.persisted) pause(); else dispose(); }, events);
  function dispose() { pause(); media?.revert(); abort.abort(); }
  update();
  return dispose;
}

// Bring a single real lower drawing out of its original sheet. No drawing is
// interpolated between two panels. All geometry is read before the first write.
export function mountTrace({ gsap, button, source, destination, root }) {
  if (!gsap) return;
  const media = gsap.matchMedia();
  let active;
  let ghost;
  let startScroll;
  function stop() {
    active?.kill();
    active = undefined;
    ghost?.remove();
    ghost = undefined;
    button.textContent = "Trace this panel";
  }
  media.add({ compact: "(max-width: 720px)", wide: "(min-width: 721px)", reduce: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
    const abort = new AbortController();
    const events = { signal: abort.signal };
    button.hidden = conditions.reduce;
    function trace() {
      if (active) return stop();
      const selected = destination();
      const from = source().getBoundingClientRect();
      const to = selected.getBoundingClientRect();
      // On a phone the two rectangles can straddle the fold. Stay in the
      // visible map and enlarge its own selected drawing without moving scroll.
      const local = conditions.compact || to.top < 0 || to.bottom > innerHeight;
      const boardBox = source().parentElement.getBoundingClientRect();
      startScroll = { x: scrollX, y: scrollY };
      const maxWidth = Math.min(boardBox.width * .82, from.width * 2.4);
      const end = local ? {
        left: boardBox.left + (boardBox.width - maxWidth) / 2,
        top: boardBox.top + Math.max(4, (boardBox.height - maxWidth * from.height / from.width) / 2),
        width: maxWidth, height: maxWidth * from.height / from.width
      } : to;
      ghost = new Image();
      ghost.className = "boards-trace-image";
      ghost.src = selected.currentSrc || selected.src;
      ghost.alt = "";
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px" });
      document.body.append(ghost);
      button.textContent = "Stop trace";
      active = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: stop });
      active.addLabel("locate", 0)
        .fromTo(ghost, { opacity: .3 }, { opacity: 1, duration: .13 }, "locate")
        .addLabel("enlarge")
        .to(ghost, { x: end.left - from.left, y: end.top - from.top, scaleX: end.width / from.width, scaleY: end.height / from.height, duration: local ? .45 : .68 }, "enlarge")
        .addLabel("read", "+=" + (local ? .8 : .15))
        .to(ghost, { opacity: 0, duration: .2 }, "read");
    }
    button.addEventListener("click", trace, events);
    root.addEventListener("click", event => { if (!button.contains(event.target)) stop(); }, events);
    root.addEventListener("change", stop, events);
    window.addEventListener("keydown", event => { if (event.key === "Escape") stop(); }, events);
    window.addEventListener("scroll", () => {
      if (ghost && (scrollX !== startScroll.x || scrollY !== startScroll.y)) stop();
    }, { ...events, passive: true });
    window.addEventListener("resize", stop, events);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }, events);
    return () => { abort.abort(); stop(); };
  });
  const teardown = event => { stop(); if (!event.persisted) { media.revert(); window.removeEventListener("pagehide", teardown); } };
  window.addEventListener("pagehide", teardown);
  return () => { media.revert(); window.removeEventListener("pagehide", teardown); };
}

