import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";
const root = resolve("dist");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
    f.isDirectory() ? files(join(dir, f.name)) : [join(dir, f.name)],
  );
}
const rows = JSON.parse(readFileSync("src/data/projects.json", "utf8")).filter(
  (x) => ["reviewed", "approved"].includes(x.publication),
);
const categories = [
  "animation",
  "visual-development",
  "storyboards",
  "illustration",
];
const pages = [
  "/",
  "/resume/",
  "/about/",
  "/contact/",
  "/404.html",
  ...categories.map((k) => "/work/" + k + "/"),
  ...rows.map((r) => "/work/" + r.slug + "/"),
];
const pathOf = (p) =>
  p.endsWith("/") ? join(root, p, "index.html") : join(root, p);
const paths = files(root);
assert.deepEqual(
  paths.filter((p) => p.endsWith(".html")).sort(),
  pages.map(pathOf).sort(),
  "Page registry differs from build",
);
for (const r of rows) {
  const html = readFileSync(pathOf("/work/" + r.category + "/"), "utf8");
  assert.ok(
    Array.from(html.matchAll(/\bhref="([^"]+)"/g), ([,href]) => new URL(href, "http://local"))
      .some(url => url.origin === "http://local" && url.pathname === "/work/" + r.slug + "/"),
    "Missing category link to " + r.slug,
  );
}
const ids = new Map();
function anchors(filename) {
  if (!ids.has(filename))
    ids.set(
      filename,
      new Set(
        Array.from(
          readFileSync(filename, "utf8").matchAll(/\bid="([^"]+)"/g),
          (m) => m[1],
        ),
      ),
    );
  return ids.get(filename);
}
let refs = 0;
for (const route of pages) {
  const file = pathOf(route),
    html = readFileSync(file, "utf8");
  assert.match(html, /<html lang="en"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, route + " H1");
  assert.doesNotMatch(
    html,
    /[\u3400-\u9fff]|PRIVATE_INPUT|asset-manifest|localhost:|\.invalid\b/,
  );
  for (const m of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
    const url = new URL(m[1], "http://local" + route);
    if (url.origin !== "http://local") continue;
    const target = pathOf(decodeURIComponent(url.pathname));
    assert.ok(existsSync(target), route + " broken " + m[1]);
    if (url.hash && target.endsWith(".html"))
      assert.ok(
        anchors(target).has(decodeURIComponent(url.hash.slice(1))),
        route + " broken fragment " + m[1],
      );
    refs++;
  }
}
for (const f of paths) {
  let p = relative(root, f).split(sep).join("/");
  assert.ok(
    !/(?:PRIVATE_INPUT|\.zip$|\.map$|^A\d+\.|\.json$|\.env|original-portfolio|primary-profile)/i.test(
      p,
    ),
    "Unexpected private/build material " + p,
  );
}
console.log(
  pages.length +
    " routes, " +
    rows.length +
    " projects, " +
    refs +
    " local references checked. English document language, headings, anchors, category membership and private file markers passed.",
);

