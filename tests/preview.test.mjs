import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("loopback preview survives missing output during a rebuild", {timeout: 15000}, async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "junran-preview-test-"));
  const output = join(folder, "dist");
  const scripts = join(folder, "scripts");
  await Promise.all([mkdir(output), mkdir(scripts)]);
  const entry = join(scripts, "preview.mjs");
  await Promise.all([
    copyFile(new URL("../scripts/preview.mjs", import.meta.url), entry),
    writeFile(join(output, "index.html"), "<h1>Artist</h1>"),
    writeFile(join(output, "404.html"), "<h1>Page not found</h1>"),
  ]);
  const child = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: "0" }, windowsHide: true, stdio: ["ignore","pipe","pipe"]
  });
  t.after(async () => {
    const stopped = once(child, "exit");
    if (child.exitCode === null) { child.kill(); await stopped; }
    await rm(folder, {recursive:true, force:true});
  });
  const [message] = await once(child.stdout, "data");
  const origin = message.toString().match(/http:\/\/127\.0\.0\.1:\d+\//)[0];
  assert.equal((await fetch(origin)).status, 200);
  const errorPage = join(output, "404.html");
  const held = join(folder, "held-404.html");
  await rename(errorPage, held);
  assert.equal((await fetch(origin + "unmatched")).status, 503);
  await rename(held, errorPage);
  assert.equal((await fetch(origin + "unmatched")).status, 404);
  assert.equal((await fetch(origin)).status, 200);
});
