/**
 * copy-email.js — copies an email address to the clipboard and flips the button
 * into a "copied" state.
 *
 * Migrated from the minified Slater bundle 51358.js (2026-09-08) and expanded
 * back to readable source. No dependencies.
 *
 * Pairs with src/copy-email.css, which reacts to data-copy-button="copied".
 *
 * Markup contract:
 *   <div class="copy-email-wrapper">
 *     <button class="copy-email-button" data-copy-email="hello@example.com">…</button>
 *     <div class="sr-only" role="status" aria-live="polite" data-copy-email-status></div>
 *   </div>
 *
 * When data-copy-email is empty the address is read from the text of:
 *   <span data-copy-email-element>hello@example.com</span>
 *
 * The status node is optional but strongly preferred — see "Announcing" below.
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

    /* ------------------------------------------------------- ANNOUNCING ---
     * The button carries an aria-label, which overrides its visible text — so
     * without help a screen reader never hears the address, and never hears
     * that the copy succeeded. Two fixes:
     *
     *   1. The label is composed from the address, so the name says which
     *      address this copies rather than just "copy email".
     *   2. Success is announced through a live region, not by swapping the
     *      label. Renaming a control the user is currently on is unreliable
     *      across screen readers and disorienting when it does land.
     */

    function labelFor(address) {
      return address
        ? "Copy " + address + " to clipboard"
        : "Copy email to clipboard";
    }

    function statusNode(button) {
      var wrap = button.parentNode;
      while (wrap && wrap.querySelector) {
        var node = wrap.querySelector("[data-copy-email-status]");
        if (node) return node;
        if (wrap.classList && wrap.classList.contains("copy-email-wrapper")) break;
        wrap = wrap.parentNode;
      }
      return null;
    }

    function announce(button, message) {
      var node = statusNode(button);
      if (node) node.textContent = message;
    }

    function reset(button) {
      button.removeAttribute("data-copy-button");
      button.setAttribute("aria-label", labelFor(readAddress(button)));
      announce(button, "");
    }

    function copy(button) {
      var address = readAddress(button);
      if (!address) {
        console.warn("[copy-email] No address found on", button);
        return;
      }

      if (!navigator.clipboard) {
        console.warn("[copy-email] Clipboard API unavailable (needs HTTPS).");
        announce(button, "Copying is unavailable. The address is " + address);
        return;
      }

      navigator.clipboard
        .writeText(address)
        .then(function () {
          button.setAttribute("data-copy-button", "copied");
          announce(button, "Email address copied to clipboard");
        })
        // The original had no catch, so a rejected write (denied permission,
        // insecure context) failed silently and left the button looking idle.
        .catch(function (err) {
          console.warn("[copy-email] Copy failed:", err);
          announce(button, "Copy failed. The address is " + address);
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
      button.setAttribute("aria-label", labelFor(readAddress(button)));

      button.addEventListener("click", onActivate);
      button.addEventListener("keydown", onActivate);

      // Was also calling button.blur() here, which threw away focus the
      // visitor had not given up — a keyboard user could lose their place
      // because the pointer happened to drift off the button.
      button.addEventListener("mouseleave", function () {
        reset(button);
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
