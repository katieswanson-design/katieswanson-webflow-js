/**
 * copy-email.js — copies an email address to the clipboard and flips the button
 * into a "copied" state.
 *
 * Migrated from the minified Slater bundle 51358.js (2026-09-08) and expanded
 * back to readable source. Behaviour is unchanged apart from two fixes noted
 * inline: a guard when no address can be found, and a catch on the clipboard
 * promise. No dependencies.
 *
 * Pairs with src/copy-email.css, which reacts to data-copy-button="copied".
 *
 * Markup contract:
 *   <button class="copy-email-button" data-copy-email="hello@example.com">
 * or, when the attribute is empty, the address is read from the text of:
 *   <span data-copy-email-element>hello@example.com</span>
 */
(function () {
  "use strict";

  function initCopyEmailClipboard() {
    var buttons = document.querySelectorAll(".copy-email-button");
    if (!buttons.length) return;

    function readAddress(button) {
      var attr = button.getAttribute("data-copy-email");
      if (attr) return attr.trim();
      var el = button.querySelector("[data-copy-email-element]");
      // The original indexed straight into .textContent here, which threw a
      // TypeError if the span was ever removed — taking the whole script with
      // it. Now a missing address just means the click does nothing.
      return el ? el.textContent.trim() : "";
    }

    function reset(button) {
      button.removeAttribute("data-copy-button");
      button.setAttribute("aria-label", "Copy email to clipboard");
    }

    function copy(button) {
      var address = readAddress(button);
      if (!address) {
        console.warn("[copy-email] No address found on", button);
        return;
      }

      if (!navigator.clipboard) {
        console.warn("[copy-email] Clipboard API unavailable (needs HTTPS).");
        return;
      }

      navigator.clipboard
        .writeText(address)
        .then(function () {
          button.setAttribute("data-copy-button", "copied");
          button.setAttribute("aria-label", "Email copied to clipboard!");
        })
        // The original had no catch, so a rejected write (denied permission,
        // insecure context) failed silently and left the button looking idle.
        .catch(function (err) {
          console.warn("[copy-email] Copy failed:", err);
        });
    }

    function onActivate(event) {
      var isClick = event.type === "click";
      var isEnterOrSpace =
        event.type === "keydown" && (event.key === "Enter" || event.key === " ");
      if (!isClick && !isEnterOrSpace) return;
      event.preventDefault();
      copy(event.currentTarget);
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", onActivate);
      button.addEventListener("keydown", onActivate);

      button.addEventListener("mouseleave", function () {
        reset(button);
        button.blur();
      });

      button.addEventListener("blur", function () {
        reset(button);
      });
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initCopyEmailClipboard);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCopyEmailClipboard);
  } else {
    initCopyEmailClipboard();
  }
})();
