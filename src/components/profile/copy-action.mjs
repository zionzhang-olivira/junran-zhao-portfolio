export function mountCopyAction(container) {
  const address = container.querySelector("[data-email-address]");
  const button = container.querySelector("[data-copy-email]");
  const feedback = container.querySelector("[data-copy-feedback]");
  const manual = "Select the email address to copy it.";
  if (!address || !button || !feedback) return;

  let active = true;
  let token = 0;
  let waiting = false;
  button.hidden = false;
  feedback.textContent = "";

  button.addEventListener("click", async () => {
    if (!active || waiting) return;
    const attempt = ++token;
    const value = address.textContent.trim();
    waiting = true;
    feedback.textContent = "";
    let message = manual;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        message = "Email address copied.";
      }
    } catch {
      // The address remains a selectable native link when copying is denied.
    } finally {
      if (attempt === token) {
        waiting = false;
        if (active && container.isConnected && address.textContent.trim() === value)
          feedback.textContent = message;
      }
    }
  });
  window.addEventListener("pagehide", () => {
    active = false;
    waiting = false;
    token += 1;
  });
  window.addEventListener("pageshow", (event) => {
    active = true;
    if (event.persisted) feedback.textContent = "";
  });
}
