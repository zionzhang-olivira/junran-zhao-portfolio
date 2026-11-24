import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Build-only record. A changed address or PDF needs its own approval.
export const contactRecord = {
  value: "zhaojunran2023j@outlook.com",
  previewApproved: true,
  publicApproved: true,
};

export const profile = {
  name: "Junran Zhao",
  role: "2D Animator & Character Designer",
  bio: [
    "Hi, I’m Junran Zhao, a 2D animator and character designer studying Animation and Visual Effects at the Academy of Art University in San Francisco.",
    "I enjoy bringing characters to life through expressive movement, distinctive design, and visual storytelling. Working across digital animation and illustration, I explore different artistic styles while continuing to develop my creative and technical skills. I look forward to collaborating with other artists and creative professionals in animation.",
  ],
  statement: [
    "As a 2D animator and character designer, I am particularly drawn to black-and-white line art. I believe that simple lines can express complex emotions, personalities, and stories without relying on color or elaborate visual effects.",
    "My artistic approach focuses on expressive character designs, fluid movements, and strong visual storytelling. I enjoy exploring the relationship between line, shape, movement, and emotion, using minimal visual elements to create distinctive and memorable characters.",
    "Through my work, I hope to bring imagination to life and establish an emotional connection with my audience. I believe simplicity is not a limitation, but a powerful form of artistic expression.",
  ],
};

export function contactForBuild(record, mode = "preview") {
  if (!["preview", "public"].includes(mode))
    throw new Error("Unrecognized contact build mode.");
  const original = record.value ?? "";
  if (/[\x00-\x1f\x7f]/.test(original))
    throw new Error("Invalid characters in email address.");
  const value = original.trim();
  if (!value || !record.previewApproved) {
    if (mode === "public")
      throw new Error("Public contact has no approved address.");
    return null;
  }
  const localAtom = "[A-Za-z0-9!#$%&'*+/=^_`{|}~-]+";
  const domainLabel = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
  const address = new RegExp(
    "^" +
      localAtom +
      "(?:\\." +
      localAtom +
      ")*@" +
      domainLabel +
      "(?:\\." +
      domainLabel +
      ")+$",
  );
  if (
    !address.test(value) ||
    value.length > 254 ||
    value.split("@")[0].length > 64
  ) {
    throw new Error("Expected a single email address.");
  }
  if (
    mode === "public" &&
    (!record.publicApproved || /\.invalid$/i.test(value))
  ) {
    throw new Error("This contact record is not approved for a public build.");
  }
  const [local, domain] = value.split("@");
  return { value, href: "mailto:" + encodeURIComponent(local) + "@" + domain };
}

export const resumeFile = {
  href: "/media/junran-zhao-resume.pdf",
  sha256: "d586423e4764c600d18e107d45cf8f4591fe5ebc7d0c74dda487828bf903ffe4",
  previewApproved: true,
  publicApproved: true,
};

export function checkedResume(bytes, record, mode = "preview") {
  if (mode === "public" && !record.publicApproved)
    throw new Error("Public résumé approval is pending.");
  if (!record.previewApproved) return null;
  if (
    bytes.subarray(0, 5).toString() !== "%PDF-" ||
    createHash("sha256").update(bytes).digest("hex") !== record.sha256
  ) {
    throw new Error("The résumé does not match the reviewed PDF.");
  }
  return { href: record.href, kib: Math.ceil(bytes.length / 1024) };
}

export function getResume(mode = "preview") {
  if (!resumeFile.previewApproved) {
    if (mode === "public")
      throw new Error("Public résumé approval is pending.");
    return null;
  }
  return checkedResume(
    readFileSync("public" + resumeFile.href),
    resumeFile,
    mode,
  );
}
