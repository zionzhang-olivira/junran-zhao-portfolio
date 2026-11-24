import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
const inventory = JSON.parse(readFileSync(new URL("./media-allowlist.json", import.meta.url))).local_preview_files;
const files = readdirSync("public/media");
for (const file of files) {
  const hash = createHash("sha256").update(readFileSync("public/media/" + file)).digest("hex");
  if (hash !== inventory[file]?.sha256) throw new Error("Unreviewed media: " + file);
}
for (const file of Object.keys(inventory)) if (!files.includes(file)) throw new Error("Missing source: " + file);
