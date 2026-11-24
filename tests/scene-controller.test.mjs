import assert from "node:assert/strict";
import test from "node:test";
import { createSceneController } from "../src/lib/scene-controller.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness() {
  const calls = [],
    commits = [],
    events = [];
  const controller = createSceneController({
    load(mode, { signal, token }) {
      const call = {
        mode,
        signal,
        token,
        loading: deferred(),
        decoding: deferred(),
      };
      calls.push(call);
      return call.loading.promise;
    },
    decode: (call) => call.decoding.promise,
    present: (value, context) =>
      commits.push([value, context.mode, context.token]),
    onChange: (state) => events.push(state),
  });
  return { controller, calls, commits, events };
}
async function finish(call) {
  call.loading.resolve(call);
  call.decoding.resolve(call.mode);
  await turn();
}

test("initial image stays mounted through loading and decoding; duplicate requests coalesce", async () => {
  const { controller, calls, commits, events } = harness();
  assert.equal((await controller.select("morning")).status, "unchanged");
  const next = controller.select("night");
  assert.equal(controller.select("night"), next);
  await turn();
  calls[0].loading.resolve(calls[0]);
  await turn();
  assert.equal(controller.snapshot().current, "morning");
  assert.deepEqual(commits, []);
  calls[0].decoding.resolve("decoded night");
  assert.equal((await next).status, "presented");
  assert.deepEqual(commits, [["decoded night", "night", 1]]);
  assert.deepEqual(
    events.map((state) => state.phase),
    ["loading", "ready"],
  );
});

for (const late of ["decode-success", "decode-failure", "load-failure"]) {
  test("last intent wins even with late " + late, async () => {
    const { controller, calls, events, commits } = harness();
    const first = controller.select("night");
    await turn();
    if (late !== "load-failure") calls[0].loading.resolve(calls[0]);
    await turn();
    const last = controller.select("neon");
    assert.equal((await first).status, "superseded");
    assert.equal(calls[0].signal.aborted, true);
    await turn();
    await finish(calls[1]);
    assert.equal((await last).status, "presented");
    const before = events.length;
    if (late === "decode-success") calls[0].decoding.resolve("stale");
    else if (late === "decode-failure")
      calls[0].decoding.reject(Error("stale decode"));
    else calls[0].loading.reject(Error("stale load"));
    await turn();
    assert.deepEqual(commits, [["neon", "neon", 2]]);
    assert.equal(events.length, before);
    assert.equal(controller.snapshot().error, null);
  });
}

test("decode failure preserves old art and permits a new attempt", async () => {
  const { controller, calls, commits } = harness();
  const first = controller.select("night");
  await turn();
  calls[0].loading.resolve(calls[0]);
  await turn();
  calls[0].decoding.reject(Error("unsupported format"));
  assert.equal((await first).status, "failed");
  assert.equal(controller.snapshot().current, "morning");
  assert.deepEqual(commits, []);
  const retry = controller.select("night");
  await turn();
  await finish(calls[1]);
  assert.equal((await retry).status, "presented");
});

test("returning to displayed art cancels in-flight intent; explicit cancel is idempotent", async () => {
  const { controller, calls, commits } = harness();
  const pending = controller.select("night");
  await turn();
  assert.equal((await controller.select("morning")).status, "unchanged");
  assert.equal((await pending).status, "cancelled");
  assert.ok(calls[0].signal.aborted);
  await finish(calls[0]);
  const retry = controller.select("neon");
  controller.cancel();
  assert.equal((await retry).status, "cancelled");
  const before = controller.snapshot();
  controller.cancel();
  assert.deepEqual(controller.snapshot(), before);
  assert.deepEqual(commits, []);
});

test("destroy settles waiters, aborts work and emits no late updates", async () => {
  const { controller, calls, commits, events } = harness();
  const pending = controller.select("night");
  await turn();
  const count = events.length;
  controller.destroy();
  controller.destroy();
  assert.equal((await pending).status, "destroyed");
  assert.ok(calls[0].signal.aborted);
  calls[0].loading.reject(Error("late network failure"));
  await turn();
  assert.equal((await controller.select("neon")).status, "destroyed");
  controller.cancel();
  assert.equal(events.length, count);
  assert.deepEqual(commits, []);
  assert.throws(() => controller.select("yellow"), RangeError);
});
