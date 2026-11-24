const total = 31;
const duration = 2.24;
const timeAt = (frame: number) => (frame === 1 ? 0 : frame * 0.07);
const frameAt = (time: number) =>
  Math.min(total, Math.max(1, Math.floor((time + 0.00001) / 0.07)));
const pad = (frame: number) => String(frame).padStart(2, "0");

export function mountPoseDesk(root: HTMLElement) {
  const pick = <T extends Element>(name: string) =>
    root.querySelector<T>(name)!;
  const image = pick<HTMLImageElement>("[data-ink]");
  const film = pick<HTMLVideoElement>("[data-film]");
  const play = pick<HTMLAnchorElement>("[data-play]");
  const close = pick<HTMLButtonElement>("[data-return]");
  const detail = pick<HTMLAnchorElement>("[data-detail]");
  const controls = pick<HTMLElement>("[data-tools]");
  const range = pick<HTMLInputElement>("input");
  const count = pick<HTMLElement>("[data-count]");
  const clock = pick<HTMLElement>("[data-clock]");
  const status = pick<HTMLElement>("[data-status]");
  const bar = pick<HTMLElement>(".pose-ticks i");
  const steps = [...root.querySelectorAll<HTMLButtonElement>("[data-step]")];
  const search = new URLSearchParams(location.search).get("frame");
  let selected =
    search && /^\d+$/.test(search) && +search >= 1 && +search <= total
      ? +search
      : 17;
  let showingFilm = false;
  let seekTarget: number | null = null;
  let session = 0;

  function setSelection(value: number, writeUrl = true) {
    selected = Math.min(total, Math.max(1, Math.round(value)));
    const stamp = timeAt(selected);
    const time = stamp.toFixed(2) + " s";
    const path = "/studies/fox/inks/f" + pad(selected) + ".webp";
    if (image.getAttribute("src") !== path) image.src = path;
    image.alt =
      "Drawing " + selected + " from Junran Zhao’s fox pulling a rope.";
    count.textContent = String(selected);
    clock.textContent = time;
    range.value = String(selected);
    range.setAttribute(
      "aria-valuetext",
      "Drawing " + selected + " of 31 at " + time,
    );
    steps[0].disabled = selected === 1;
    steps[1].disabled = selected === total;
    detail.href =
      "/work/fox-motion-studies/?frame=" +
      selected +
      "&from=home&study=1#original-film";
    bar.style.transform = "scaleX(" + stamp / duration + ")";
    if (writeUrl) {
      const url = new URL(location.href);
      if (url.searchParams.get("frame") !== String(selected)) {
        url.searchParams.set("frame", String(selected));
        history.replaceState(history.state, "", url);
      }
    }
  }
  function syncFilm(writeUrl = true) {
    if (showingFilm && seekTarget === null && !film.seeking) {
      const frame = frameAt(film.currentTime);
      if (frame !== selected) setSelection(frame, writeUrl);
    }
  }
  function showDrawings(focus: boolean) {
    syncFilm();
    showingFilm = false;
    session++;
    seekTarget = null;
    film.pause();
    film.hidden = true;
    close.hidden = true;
    play.hidden = false;
    image.hidden = false;
    controls.hidden = false;
    if (focus) play.focus({ preventScroll: true });
  }
  function seekFilm() {
    if (showingFilm && seekTarget !== null && film.readyState >= 1) {
      film.currentTime = seekTarget;
      seekTarget = null;
    }
  }

  setSelection(selected, false);
  controls.hidden = false;
  range.addEventListener("input", () => setSelection(Number(range.value)));
  steps.forEach((button) =>
    button.addEventListener("click", () =>
      setSelection(selected + Number(button.dataset.step)),
    ),
  );
  film.addEventListener("loadedmetadata", seekFilm);
  film.addEventListener("pause", () => syncFilm());
  film.addEventListener("seeked", () => syncFilm());
  film.addEventListener("timeupdate", () => {
    if (showingFilm && seekTarget === null && !film.seeking) {
      const visible = frameAt(film.currentTime);
      count.textContent = String(visible);
      detail.href =
        "/work/fox-motion-studies/?frame=" +
        visible +
        "&from=home&study=1#original-film";
    }
  });
  detail.addEventListener("click", (event) => {
    if (showingFilm && seekTarget === null && !film.seeking)
      setSelection(frameAt(film.currentTime));
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const {x,y,width,height} = (showingFilm ? film : image).getBoundingClientRect();
    if (y + height <= 0 || y >= innerHeight) return;
    try {
      sessionStorage.setItem("junran-pose-entry", JSON.stringify({frame:selected,created:Date.now(),x,y,width,height}));
    } catch { /* Ordinary navigation carries the drawing even when storage is unavailable. */ }
  });
  film.addEventListener("ended", () => {
    if (showingFilm) {
      setSelection(total);
      showDrawings(true);
    }
  });
  image.addEventListener("error", () => {
    status.textContent =
      "This drawing could not load. The original film is available below.";
  });
  image.addEventListener("load", () => {
    if (!showingFilm) status.textContent = "";
  });
  play.addEventListener("click", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    showingFilm = true;
    const attempt = ++session;
    status.textContent = "";
    seekTarget = timeAt(selected);
    film.hidden = false;
    close.hidden = false;
    image.hidden = true;
    controls.hidden = true;
    play.hidden = true;
    if (!film.getAttribute("src")) film.src = play.href;
    seekFilm();
    close.focus({ preventScroll: true });
    void film.play().catch(() => {
      if (showingFilm && session === attempt)
        status.textContent =
          "Use the film controls to play, or return to the drawings.";
    });
  });
  close.addEventListener("click", () => {
    showDrawings(true);
    setSelection(selected);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) film.pause();
  });
  window.addEventListener("pagehide", () => {
    if (showingFilm) {
      showDrawings(false);
      setSelection(selected);
    }

  });

}
