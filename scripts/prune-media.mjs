import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
const build = resolve("dist");
const media = join(build, "media");
const referenced = new Set();
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (file !== media) inspect(file);
    } else if (entry.name.endsWith(".html")) {
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(
        /\/media\/([a-z\d-]+\.(?:webp|mp4|pdf))/g,
      ))
        referenced.add(match[1]);
    }
  }
}
inspect(build);
if (!referenced.size) throw new Error("No rendered media references found.");
for (const entry of readdirSync(media, { withFileTypes: true })) {
  if (!entry.isFile())
    throw new Error("Unexpected subdirectory in build media.");
  if (!referenced.has(entry.name)) unlinkSync(join(media, entry.name));
}
console.log(
  "Retained " +
    referenced.size +
    " referenced media files in the generated preview.",
);
