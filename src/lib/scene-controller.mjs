export const sceneModes = Object.freeze(["morning", "night", "neon"]);

// load/decode must not touch the visible image. present is a synchronous commit:
// prepare everything offscreen first, then swap in one non-reentrant operation.
/**
 * @param {{initial?:string, load:Function, decode:Function, present:Function,
 * onChange?:(state:{current:string, requested:string|null, token:number, phase:string, error:unknown})=>void}} adapters
 */
export function createSceneController({
  initial = "morning",
  load,
  decode,
  present,
  onChange = () => {},
}) {
  if (!sceneModes.includes(initial))
    throw new RangeError("Unknown initial scene");
  for (const fn of [load, decode, present, onChange]) {
    if (typeof fn !== "function")
      throw new TypeError("Expected callable scene adapter");
  }

  let current = initial;
  let active = null;
  let sequence = 0;
  let phase = "ready";
  let error = null;
  let destroyed = false;

  function snapshot() {
    return {
      current,
      requested: active?.mode ?? null,
      token: sequence,
      phase,
      error,
    };
  }

  function retire(request, status) {
    if (!request) return;
    request.resolve({ status, mode: request.mode, token: request.token });
    request.controller.abort();
  }

  async function execute(request) {
    const isCurrent = () =>
      !destroyed && active === request && sequence === request.token;
    if (!isCurrent()) return;
    const context = {
      mode: request.mode,
      token: request.token,
      signal: request.controller.signal,
    };
    try {
      const loaded = await load(request.mode, context);
      if (!isCurrent()) return;
      const decoded = await decode(loaded, context);
      if (!isCurrent()) return;
      present(decoded, context);
    } catch (cause) {
      if (!isCurrent()) return;
      active = null;
      phase = "error";
      error = cause;
      request.resolve({
        status: "failed",
        mode: request.mode,
        token: request.token,
        error: cause,
      });
      onChange(snapshot());
      return;
    }
    if (!isCurrent()) return;
    active = null;
    current = request.mode;
    phase = "ready";
    request.resolve({
      status: "presented",
      mode: current,
      token: request.token,
    });
    onChange(snapshot());
  }

  function cancel() {
    if (destroyed || (!active && phase === "ready")) return;
    const previous = active;
    active = null;
    sequence++;
    phase = "ready";
    error = null;
    retire(previous, "cancelled");
    if (!destroyed) onChange(snapshot());
  }

  function select(mode) {
    if (!sceneModes.includes(mode)) throw new RangeError("Unknown scene");
    if (destroyed)
      return Promise.resolve({ status: "destroyed", mode, token: sequence });
    if (active?.mode === mode) return active.promise;
    if (mode === current) {
      cancel();
      return Promise.resolve({ status: "unchanged", mode, token: sequence });
    }
    const previous = active;
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    const request = {
      mode,
      promise,
      resolve,
      token: ++sequence,
      controller: new AbortController(),
    };
    active = request;
    phase = "loading";
    error = null;
    retire(previous, "superseded");
    if (active === request && !destroyed) {
      queueMicrotask(() => {
        void execute(request);
      });
      onChange(snapshot());
    }
    return promise;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    sequence++;
    const previous = active;
    active = null;
    error = null;
    phase = "destroyed";
    retire(previous, "destroyed");
  }

  return { select, cancel, destroy, snapshot };
}
