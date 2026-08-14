// Lightweight client-side password gate. Not real security — content is
// still in the page source — this just keeps the hub off search engines
// and out of casual reach. Password hash lives here as SHA-256, not plaintext.
(function () {
  var PASSWORD_HASH = "b425939f82a2738ab01873e9ecb4eb282d06897f9f145f36ff8ce60acaf868b0";
  var SESSION_KEY = "moxie-hub-unlocked";

  if (sessionStorage.getItem(SESSION_KEY) === "1") return;

  document.documentElement.style.visibility = "hidden";

  function sha256(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
    });
  }

  function showGate() {
    var overlay = document.createElement("div");
    overlay.id = "moxie-gate";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#0f1115;" +
      "display:flex;align-items:center;justify-content:center;" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";
    overlay.innerHTML =
      '<form id="moxie-gate-form" style="background:#1a1d24;padding:32px 28px;' +
      'border-radius:12px;width:280px;box-shadow:0 8px 24px rgba(0,0,0,.4);">' +
      '<div style="color:#fff;font-size:16px;font-weight:600;margin-bottom:14px;">' +
      "Startup Moxie Facilitator Hub</div>" +
      '<input id="moxie-gate-input" type="password" placeholder="Password" autofocus ' +
      'style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;' +
      'border:1px solid #333;background:#0f1115;color:#fff;font-size:14px;outline:none;"/>' +
      '<div id="moxie-gate-error" style="color:#e5605a;font-size:13px;margin-top:8px;height:16px;"></div>' +
      '<button type="submit" style="margin-top:10px;width:100%;padding:10px;border:0;' +
      'border-radius:8px;background:#4f6df5;color:#fff;font-size:14px;font-weight:600;' +
      'cursor:pointer;">Enter</button>' +
      "</form>";
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = "visible";

    var form = document.getElementById("moxie-gate-form");
    var input = document.getElementById("moxie-gate-input");
    var error = document.getElementById("moxie-gate-error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      sha256(input.value).then(function (hash) {
        if (hash === PASSWORD_HASH) {
          sessionStorage.setItem(SESSION_KEY, "1");
          overlay.remove();
        } else {
          error.textContent = "Wrong password.";
          input.value = "";
          input.focus();
        }
      });
    });
  }

  if (document.body) {
    showGate();
  } else {
    document.addEventListener("DOMContentLoaded", showGate);
  }
})();
