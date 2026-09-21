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
 * Accessibility: the heading is the real text, not a copy. The heading carries
 * an aria-label with its full text and SplitText hides the split pieces from
 * assistive tech. The split stays in place after the reveal (see the note at
 * the end of reveal()) and is reverted to the original DOM on a width change. Plays once, well under WCAG 2.2.2's five seconds,
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

  // Namma's timing. Their chars start at yPercent 150 and end at 9 (to offset
  // a fixed 175px word box tuned to their font); ours end at 0, where the text
  // belongs, and start at 200 so they clear the deeper bottom bleed below.
  var FROM_Y = 200;
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
  var MASK_BLEED = "0.45em";

  // Extra room below. A descender (the tail of "j", "y") is the last part of a
  // rising glyph to clear the mask, and power4.out spends its long settle in
  // the last few pixels — so with shallow room the tail sits clipped and then
  // "grows out" at the end (Katie, iPhone, v1.0.105). Measured in Playwright:
  // 0.2em of room kept the j's tail clipped until 56% of its rise. 0.6em below
  // plus FROM_Y 200 (so chars still start fully hidden) clears it while the
  // letter is still visibly moving.
  var MASK_BLEED_BOTTOM = "0.6em";

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
  //    so words land on different lines. CONFIRMED, both engines, 2026-09-21:
  //    WebKit at 390 breaks /skills a word early ("left," / "right, ops" where
  //    the text has "left, right," / "ops"), and Chrome at 390 breaks
  //    /bookmarks and /guidelines a word late. It is not an iPhone quirk; each
  //    engine just trips on different headings.
  // So: move each word to where its first glyph really is, then
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

  // The plain heading's line step, read off the glyph tops already measured.
  // Every glyph on a line shares one text-box top, so the distinct tops are
  // the lines and the smallest gap between them is the step. One line leaves
  // it Infinity, which is what we want: nothing can then be a line apart.
  function lineStep(glyphs) {
    var tops = [];
    glyphs.forEach(function (g) {
      var t = Math.round(g.top * 10) / 10;
      if (tops.indexOf(t) === -1) tops.push(t);
    });
    tops.sort(function (a, b) {
      return a - b;
    });
    var step = Infinity;
    for (var i = 1; i < tops.length; i++) {
      var d = tops[i] - tops[i - 1];
      if (d > 1 && d < step) step = d;
    }
    return step;
  }

  function matchLayout(split, glyphs) {
    if (split.chars.length !== glyphs.length) return;
    var gsap = window.gsap;
    var step = lineStep(glyphs);
    var k = 0;
    split.words.forEach(function (word) {
      var chars = split.chars.filter(function (c) {
        return word.contains(c);
      });
      if (!chars.length) return;

      // Normally move the WORD inside its mask, never the mask itself: the
      // mask's edges are the clip, and moving them eats the room left for
      // ascenders and descenders. WebKit lays the split ~8px lower than the
      // heading at 390; shifting the mask up to match left the "j" in
      // "junkie" 3px of room, so its tail was clipped through power4.out's
      // long settle and "grew out" at the end (v1.0.105, measured in
      // Playwright WebKit).
      //
      // That holds for a sub-line nudge, which is what the mask bleed exists
      // to absorb. It inverts when the split wrapped this word onto a
      // different LINE (see the note above): dy is then a whole line, and
      // driving the word that far inside a mask that stayed behind drags it
      // clean out of the clip. On /skills at 390 in WebKit that left 30% of
      // "right," on screen — a horizontal band of glyph, which is what Katie
      // photographed. So carry a line-sized dy on the MASK instead. The word
      // rides along inside it, so mask and glyphs move together and the bleed
      // above and below is preserved exactly; only the clip's position in the
      // heading changes, which is the whole point.
      var first = textRect(chars[0]);
      var dx = glyphs[k].left - first.left;
      var dy = glyphs[k].top - first.top;
      var mask = word.parentNode;
      var isMask = Array.prototype.indexOf.call(split.masks, mask) !== -1;
      var carrier = Math.abs(dy) >= step / 2 && isMask ? mask : word;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        gsap.set(carrier, { x: dx, y: dy });
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
      m.style.paddingBottom = MASK_BLEED_BOTTOM;
      m.style.marginTop = "-" + MASK_BLEED;
      m.style.marginBottom = "-" + MASK_BLEED_BOTTOM;
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
    });

    // Keep the split once the reveal lands; do NOT revert on complete.
    // Reverting swaps the split boxes for plain text, and WebKit repositions
    // glyphs when it does: pixel-diffing the heading either side of the revert
    // in Playwright WebKit at 390 changed 3% of its pixels (letters visibly
    // shift — Katie's "shimmy" on iPhone) against 0.24% of edge noise in
    // Chrome. Namma never reverts either. The one thing that invalidates the
    // kerning/layout nudges is a width change, so revert then, once — mid-
    // resize the reflow is expected anyway. aria-label stays on the heading.
    var width = window.innerWidth;
    function onResize() {
      if (window.innerWidth === width) return; // iOS fires resize on URL-bar scroll
      window.removeEventListener("resize", onResize);
      window.gsap.killTweensOf(split.chars);
      split.revert();
    }
    window.addEventListener("resize", onResize);
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
