/**
 * line-reveal.js — a heading's lines rise into place from behind a mask, one
 * after another, once, when the page loads.
 *
 * Requires: GSAP 3 core + the SplitText plugin (both site-level, before this).
 *
 * Markup contract (Designer):
 *
 *   <h1 class="section-heading is-hero" data-line-reveal>…</h1>
 *
 * One attribute is the whole API. The heading is ordinary text in the Designer,
 * so it wraps, balances and reads exactly as authored; lines are whatever the
 * browser lays out at the current width, measured after the web font loads.
 *
 * Accessibility: the heading is the real text, not a copy. SplitText labels the
 * element with its full text and hides the split pieces from assistive tech
 * while they exist, and the split is reverted as soon as the reveal finishes,
 * leaving the original DOM. Plays once, well under WCAG 2.2.2's five seconds,
 * so it needs no pause control. Reduced motion, a missing GSAP or SplitText:
 * the heading simply shows.
 *
 * The heading is hidden from the moment this script runs until the font has
 * loaded and the lines are split, so the unstyled or wrongly wrapped text never
 * flashes. It is hidden by this script, not by the Designer, so if the script
 * fails to load the heading is still there.
 */
(function () {
  "use strict";

  var DURATION = 0.9;
  var STAGGER = 0.12;
  var EASE = "power4.out";

  // The mask is each line's box, and display type sits in a line-height tighter
  // than its glyphs (130px on 140px Champ), so a plain mask would crop
  // ascenders and descenders — and then visibly un-crop them when the split is
  // reverted. Pad each mask by this much above and below and pull the padding
  // back with an equal negative margin: the glyphs get room, the layout does
  // not move.
  var MASK_BLEED = "0.2em";

  // Never leave a heading hidden if fonts.ready is slow to settle.
  var FONT_TIMEOUT = 3000;

  function reducedMotion() {
    return window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  }

  // The heading's text as one phrase. SplitText labels the split element from
  // its textContent, and a <br> contributes nothing to textContent, so
  // "systems builder<br>efficiency junkie" was announced as
  // "systems builderefficiency junkie". Treat each <br> as a space instead.
  function labelFor(el) {
    var copy = el.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll("br"), function (br) {
      br.parentNode.replaceChild(document.createTextNode(" "), br);
    });
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  function reveal(el) {
    var label = labelFor(el);
    var split = window.SplitText.create(el, {
      type: "lines",
      mask: "lines",
    });
    // Replaces SplitText's own label; revert() still removes it afterwards.
    el.setAttribute("aria-label", label);

    split.masks.forEach(function (m) {
      m.style.paddingTop = MASK_BLEED;
      m.style.paddingBottom = MASK_BLEED;
      m.style.marginTop = "-" + MASK_BLEED;
      m.style.marginBottom = "-" + MASK_BLEED;
    });

    el.style.visibility = "";

    window.gsap.from(split.lines, {
      // Start below the padded mask's bottom edge, not just the line's.
      yPercent: 130,
      duration: DURATION,
      stagger: STAGGER,
      ease: EASE,
      onComplete: function () {
        split.revert();
      },
    });
  }

  function initLineReveal() {
    var els = document.querySelectorAll("[data-line-reveal]");
    if (!els.length) return;
    if (reducedMotion()) return;
    if (!window.gsap || !window.SplitText) return;

    window.gsap.registerPlugin(window.SplitText);

    Array.prototype.forEach.call(els, function (el) {
      el.style.visibility = "hidden";
    });

    var done = false;
    function go() {
      if (done) return;
      done = true;
      Array.prototype.forEach.call(els, reveal);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(go);
      window.setTimeout(go, FONT_TIMEOUT);
    } else {
      go();
    }
  }

  // Runs as soon as the markup exists, so the hide happens before first paint.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLineReveal);
  } else {
    initLineReveal();
  }
})();
