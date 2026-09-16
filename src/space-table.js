/**
 * space-table.js — the unicode space table on /space.
 *
 * Two jobs, both driven by a single attribute on each row:
 *
 *   <div class="space-row" role="row"
 *        data-space="200A" data-space-name="hair space">
 *     <div role="cell">hair<span class="space-mark" data-space-mark></span>space</div>
 *     …
 *     <button class="space-copy" data-space-copy type="button">copy</button>
 *   </div>
 *
 *   1. Fills every [data-space-mark] with the real character, so the green bar's
 *      width IS the space's advance width rather than a number copied out of
 *      Figma that drifts the moment the type scale changes.
 *   2. Copies that same character, flipping the button's visible label to
 *      "copied" and back after a short dwell.
 *
 * Why a code point and not the character itself: a literal U+200B — or U+00A0,
 * or U+3000 — typed into a Webflow Designer text field or custom attribute is
 * invisible to whoever edits the page next, and Webflow is free to normalise it
 * away. `200B` is legible, diffable, and survives a copy-paste. It also means
 * the mark and the clipboard read from one source, so they cannot disagree.
 *
 * Pairs with src/space-table.css, which stops the character collapsing and
 * draws the sub-pixel floor.
 *
 * Trade-off, deliberate: with JS off the marks are empty, so the table still
 * reads as a list of names, entities and escapes but demonstrates no widths.
 * The alternative — the real characters authored into the Designer — puts
 * fifteen invisible glyphs into a CMS-adjacent editing surface, which is how
 * they get silently deleted.
 */
(function () {
  "use strict";

  var REVERT_MS = 1500;
  // Lowercase, matching the site's brand treatment. The Figma spec drew this
  // table in sentence case and it shipped that way, which made /space the one
  // surface on the site not in the all-lowercase treatment; Katie chose to
  // bring it into line 2026-09-16. The code cells beside these buttons stay
  // exactly as authored — entity names and \uXXXX escapes are case-sensitive.
  var IDLE_LABEL = "copy";
  var DONE_LABEL = "copied";

  function initSpaceTable() {
    var rows = document.querySelectorAll("[data-space]");
    if (!rows.length) return;

    var status = document.querySelector("[data-space-status]");

    /* ----------------------------------------------------------- reading --- */

    function charFor(row) {
      var hex = (row.getAttribute("data-space") || "").trim();
      if (!/^[0-9a-f]{1,6}$/i.test(hex)) return "";

      var cp = parseInt(hex, 16);
      // fromCodePoint throws on lone surrogates and anything past the Unicode
      // ceiling. A throw here would take the rest of the table down with it, so
      // a bad attribute degrades to "this row does nothing" instead.
      if (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return "";
      return String.fromCodePoint(cp);
    }

    function nameFor(row) {
      return (row.getAttribute("data-space-name") || "").trim() || "this space";
    }

    /* -------------------------------------------------------- announcing ---
     * The visible label changes, the accessible name does not.
     *
     * src/copy-email.js works the same way and says why: renaming a control the
     * user is currently focused on is unreliable across screen readers and
     * disorienting when it does land. So `aria-label` is set once and left
     * alone, and success goes out through a live region instead.
     *
     * The name leads with "copy" so it still contains the visible label, which
     * is what voice control matches on (WCAG 2.5.3 Label in Name).
     */

    function announce(message) {
      if (status) status.textContent = message;
    }

    /* ------------------------------------------------------------ copying --- */

    function setLabel(button, text) {
      button.textContent = text;
    }

    function revertLater(button) {
      if (button._spaceTimer) clearTimeout(button._spaceTimer);
      button._spaceTimer = setTimeout(function () {
        button._spaceTimer = null;
        setLabel(button, IDLE_LABEL);
        // Empty the live region as well as restoring the label. A live region
        // announces on CHANGE, so leaving the previous sentence sitting in it
        // means copying the same space twice writes an identical string the
        // second time — no change, and several screen readers stay silent.
        // Clearing does not interrupt the announcement already queued.
        announce("");
      }, REVERT_MS);
    }

    function copy(button, row) {
      var ch = charFor(row);
      var name = nameFor(row);

      if (!ch) {
        console.warn("[space-table] No usable code point on", row);
        return;
      }

      if (!navigator.clipboard) {
        // Insecure context, or an old browser. Say so rather than leaving the
        // button looking like it worked.
        console.warn("[space-table] Clipboard API unavailable (needs HTTPS).");
        announce("copying is unavailable in this browser");
        return;
      }

      navigator.clipboard
        .writeText(ch)
        .then(function () {
          setLabel(button, DONE_LABEL);
          // Naming the space matters most on zero-width, where the thing that
          // landed on the clipboard is invisible in whatever they paste into.
          announce(name + " copied to clipboard");
          revertLater(button);
        })
        .catch(function (err) {
          console.warn("[space-table] Copy failed:", err);
          announce("copy failed");
        });
    }

    /* ------------------------------------------------------------- wiring --- */

    Array.prototype.forEach.call(rows, function (row) {
      var ch = charFor(row);

      var mark = row.querySelector("[data-space-mark]");
      if (mark && ch) {
        mark.textContent = ch;
        // The mark is the demonstration, not content anyone needs read aloud —
        // and "hair space" is already announced by the row's own text.
        mark.setAttribute("aria-hidden", "true");
      }

      var button = row.querySelector("[data-space-copy]");
      if (!button) return;

      button.setAttribute("aria-label", IDLE_LABEL + " " + nameFor(row));
      setLabel(button, IDLE_LABEL);

      // A real <button> already fires click on Enter and Space, so there is no
      // keydown handler here on purpose.
      button.addEventListener("click", function () {
        copy(button, row);
      });
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initSpaceTable);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSpaceTable);
  } else {
    initSpaceTable();
  }
})();
