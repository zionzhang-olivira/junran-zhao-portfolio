import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  checkedResume,
  contactForBuild,
  contactRecord,
  resumeFile,
} from "./profile.mjs";
import { mountCopyAction } from "./copy-action.mjs";

test("local preview uses one recipient and public builds require explicit permission", () => {
  assert.equal(
    decodeURIComponent(contactForBuild(contactRecord).href.slice(7)),
    contactRecord.value,
  );
  assert.throws(() => contactForBuild({ ...contactRecord, publicApproved: false }, "public"));
  for (const value of ["", null]) {
    assert.equal(contactForBuild({ ...contactRecord, value }), null);
    assert.throws(() => contactForBuild({ ...contactRecord, value }, "public"));
  }
  assert.equal(
    contactForBuild({ ...contactRecord, previewApproved: false }),
    null,
  );
});

test("replacement preserves spelling and encodes a single bare recipient", () => {
  const value = "Artist+50%tag@studio.invalid";
  const record = {
    ...contactRecord,
    value: " " + value + " ",
    publicApproved: true,
  };
  const contact = contactForBuild(record);
  assert.equal(contact.value, value);
  assert.equal(decodeURIComponent(contact.href.slice(7)), value);
  assert.ok(contact.href.includes("%25"));
  assert.throws(() => contactForBuild(record, "public"));
  for (const input of [
    "mailto:a@studio.invalid",
    "a@studio.invalid,b@else.invalid",
    "a@studio.invalid?cc=b",
    "a@studio.invalid\r\n",
  ]) {
    assert.throws(() => contactForBuild({ ...record, value: input }));
  }
});

test("withdrawn or changed résumé cannot resolve as an approved download", () => {
  const bytes = Buffer.from("%PDF-unit-test fixture");
  const fixture = {
    ...resumeFile,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  assert.equal(checkedResume(bytes, fixture).kib, 1);
  assert.equal(
    checkedResume(bytes, { ...fixture, previewApproved: false }),
    null,
  );
  assert.throws(() => checkedResume(bytes, { ...fixture, publicApproved: false }, "public"));
  assert.throws(() => checkedResume(Buffer.from("changed"), fixture));
  assert.throws(() => checkedResume(bytes, resumeFile));
});

test("copy reports actual outcome, merges repeated activations and ignores old pages", async (t) => {
  const listeners = {};
  const button = {
    hidden: true,
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const address = { textContent: "  artist@studio.invalid  " };
  const feedback = { textContent: "" };
  const elements = {
    "[data-email-address]": address,
    "[data-copy-email]": button,
    "[data-copy-feedback]": feedback,
  };
  const clipboard = {};
  const windowBefore = Object.getOwnPropertyDescriptor(globalThis, "window");
  const navigatorBefore = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: (type, fn) => {
        listeners[type] = fn;
      },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard },
  });
  t.after(() => {
    if (windowBefore) Object.defineProperty(globalThis, "window", windowBefore);
    else delete globalThis.window;
    if (navigatorBefore)
      Object.defineProperty(globalThis, "navigator", navigatorBefore);
    else delete globalThis.navigator;
  });
  mountCopyAction({
    querySelector: (selector) => elements[selector],
    isConnected: true,
  });
  assert.equal(button.hidden, false);
  await listeners.click();
  assert.equal(feedback.textContent, "Select the email address to copy it.");
  clipboard.writeText = async () => {
    throw new Error("denied");
  };
  await listeners.click();
  assert.equal(feedback.textContent, "Select the email address to copy it.");
  let resolve;
  let writes = 0;
  clipboard.writeText = (value) => {
    assert.equal(value, "artist@studio.invalid");
    writes++;
    return new Promise((done) => {
      resolve = done;
    });
  };
  const pending = listeners.click();
  await listeners.click();
  assert.equal(writes, 1);
  assert.equal(feedback.textContent, "");
  resolve();
  await pending;
  assert.equal(feedback.textContent, "Email address copied.");
  const stale = listeners.click();
  listeners.pagehide();
  resolve();
  await stale;
  assert.equal(feedback.textContent, "");
  listeners.pageshow({ persisted: true });
  assert.equal(feedback.textContent, "");
});

