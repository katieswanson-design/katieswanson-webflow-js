/**
 * menu-handoff.js — paints the open menu on a page you arrived at FROM the menu.
 *
 * Why this exists, and why it is a separate blocking header script:
 *
 * Picking a menu link leaves the menu open until the new document replaces it
 * (nav-menu.js says why: closing on click exposed the page being left for the
 * whole network wait). The diagonal reveal therefore never plays on the way
 * out. Instead the INCOMING page finishes it: it arrives already covered by the
 * menu, and the edge retreats to reveal the new page — the same diagonal, on
 * the other side of the navigation.
 *
 * For that to work the panel must be painted in the new document's FIRST frame.
 * `.nav-menu` is `opacity: 0; visibility: hidden` in the Designer, and
 * nav-menu.js runs in the footer, so by the time it could show the panel the
 * new page has already been on screen — the flash this whole design avoids.
 * A header script runs before the body paints (registered scripts at
 * `location: "header"` are emitted without defer), so the class lands first.
 *
 * It does as little as possible: read a one-shot sessionStorage key written by
 * nav-menu.js on the outgoing click, drop it, and set a class that nav-menu.css
 * turns into the open state. nav-menu.js then takes over, attaches the clip at
 * full reveal, and plays its normal close.
 *
 * Failure modes are deliberately biased toward "no handoff":
 *   - reduced motion, no sessionStorage, or a stale key (a later reload, a
 *     restored tab) → nothing happens and the page loads normally.
 *   - the class is removed after HOLD_MS no matter what, so a broken or
 *     never-loaded nav-menu.js cannot leave the menu stuck over the page.
 */
(function () {
  var KEY = "navmenu:handoff";
  var CLASS = "nav-handoff";
  var MAX_AGE = 10000; // a click older than this is not this navigation
  var HOLD_MS = 1500;  // safety net: never keep the panel up longer than this

  try {
    var raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    sessionStorage.removeItem(KEY);

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!(Date.now() - parseInt(raw.replace("plain:", ""), 10) < MAX_AGE)) return;

    document.documentElement.classList.add(CLASS);
    // "plain" is a link OUTSIDE the menu (the bottom bar): the same diagonal,
    // but the panel arrives empty — showing menu rows nobody opened would be a
    // different thing entirely. The class hides the content; nav-menu.js reads
    // the same word off the flag and skips revealing the rows.
    if (raw.indexOf("plain:") === 0) document.documentElement.classList.add(CLASS + "-plain");
    window.__navMenuHandoff = raw.indexOf("plain:") === 0 ? "plain" : "menu";

    setTimeout(function () {
      document.documentElement.classList.remove(CLASS);
      document.documentElement.classList.remove(CLASS + "-plain");
    }, HOLD_MS);
  } catch (e) {}
})();
