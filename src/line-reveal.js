/**
 * line-reveal.js — a heading's letters rise into place from behind a mask on
 * each word, one after another, once, when the page loads. The motion is
 * Studio Namma's hero reveal (studionamma.com/approach, read from their inline
 * script 2026-09-18): SplitText words + chars, each word an overflow mask,
 * chars from yPercent 150, stagger 0.027s, 1.5s, power4.out.
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

  // Namma's values. Their chars end at yPercent 9 to offset a fixed 175px
  // word box tuned to their font; ours end at 0, where the text belongs.
  var FROM_Y = 150;
  var DURATION = 1.5;
  var STAGGER = 0.027;
  var EASE = "power4.out";

  // The mask is each word's box, and display type sits in a line-height tighter
  // than its glyphs (130px on 140px Champ), so a plain mask would crop
  // ascenders and descenders. Pad each mask by this much above and below and
  // pull the padding back with an equal negative margin: the glyphs get room,
  // the layout does not move. Word masks are inline-block, whose vertical
  // margins never collapse — v1.0.101/102 used block LINE masks, where the
  // negative margins of neighbouring lines collapsed into one, so every gap
  // grew by 0.2em while split and snapped back when the split was undone.
  var MASK_BLEED = "0.2em";

  // The masks clip vertically only. Glyphs can overhang their box sideways —
  // Champ's "j" hooks 0.081em left of its box — and on Katie's iPhone the hook
  // of the "j" in "junkie" was cut at the word's left edge even with 0.15em of
  // padding there (v1.0.104). overflow-x: visible + overflow-y: clip (valid
  // per axis, unlike hidden) means no side can ever crop a glyph. Namma's line
  // masks do the same.

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

  // Where each visible character sits, in reading order, before the split.
  // The split must look exactly like the heading, or reverting it at the end
  // makes the text jump. Two things break that:
  //  - Kerning. Split chars are separate boxes, so they lose it: on Champ at
  //    140px "systems builder" shifted by up to 7.4px. (Osmo's fix is
  //    font-kerning: none; Namma never reverts.)
  //  - Line breaks. When the heading wraps (phones: 4 lines), the engine can
  //    break the split's inline-block words differently from the plain text,
  //    so words land on different lines. Suspected on iPhone (WebKit): Katie
  //    saw a jump on mobile that Chrome at 390 did not reproduce.
  // So: move each word's mask to where that word's first glyph really is, then
  // nudge each char to its kerned position within it (masks never clip
  // sideways, so a nudge can't crop a glyph).
  function glyphRects(el) {
    var rects = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var range = document.createRange();
    var node;
    while ((node = walker.nextNode())) {
      for (var i = 0; i < node.data.length; i++) {
        if (!node.data[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect();
        rects.push({ left: r.left, top: r.top });
      }
    }
    return rects;
  }

  // Text box of a split char, measured the same way as glyphRects.
  function textRect(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  }

  function matchLayout(split, glyphs) {
    if (split.chars.length !== glyphs.length) return;
    var gsap = window.gsap;
    var k = 0;
    split.words.forEach(function (word) {
      var chars = split.chars.filter(function (c) {
        return word.contains(c);
      });
      if (!chars.length) return;

      var mask = word.parentElement;
      var first = textRect(chars[0]);
      var dx = glyphs[k].left - first.left;
      var dy = glyphs[k].top - first.top;
      if (mask && (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1)) {
        gsap.set(mask, { x: dx, y: dy });
      }

      chars.forEach(function (c, j) {
        var cdx = glyphs[k + j].left - textRect(c).left;
        if (Math.abs(cdx) > 0.1) gsap.set(c, { x: cdx });
      });
      k += chars.length;
    });
  }

  function reveal(el) {
    var label = labelFor(el);
    var glyphs = glyphRects(el);
    var split = window.SplitText.create(el, {
      type: "words,chars",
      mask: "words",
    });
    // Replaces SplitText's own label; revert() still removes it afterwards.
    el.setAttribute("aria-label", label);

    split.masks.forEach(function (m) {
      m.style.paddingTop = MASK_BLEED;
      m.style.paddingBottom = MASK_BLEED;
      m.style.marginTop = "-" + MASK_BLEED;
      m.style.marginBottom = "-" + MASK_BLEED;
      m.style.overflowX = "visible";
      m.style.overflowY = "clip";
    });

    matchLayout(split, glyphs);

    el.style.visibility = "";

    window.gsap.from(split.chars, {
      yPercent: FROM_Y,
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
