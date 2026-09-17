/**
 * scale-reveal.js — header images grow in when they scroll into view, exactly
 * the way the nav menu's thumbnails grow in when the menu opens.
 *
 * Markup contract (Designer):
 *
 *   <div class="scale-wrapper">                       row: image, then heading
 *     <div class="image-scale" data-scale-reveal>     the pill that grows
 *       <img class="scale-image" alt="">              absolute, object-fit cover
 *     </div>
 *     <h2 class="section-heading">…</h2>
 *   </div>
 *
 * One attribute is the whole API: put `data-scale-reveal` on the image box of
 * any new header and it animates. Its parent row is what gets watched.
 *
 * Both end states live in the Designer, not here:
 *
 *   .image-scale               width 0, opacity 0, margin-right 0 — hidden
 *   .image-scale.is-revealed   width auto, opacity 1, margin-right 16 (8 ≤991)
 *
 * `aspect-ratio: 16 / 10` plus a per-breakpoint height (96 / 72 / 48) is what
 * makes `width: auto` resolve to the right pill size. The script never holds a
 * size of its own: it briefly applies the revealed class, measures what the
 * Designer says that looks like at the current breakpoint, removes it again in
 * the same frame (nothing paints in between), and tweens to those numbers.
 * Change the sizes or gaps in the Designer and this follows without an edit.
 *
 * When the tween ends the inline values are cleared and the class takes over,
 * so a revealed image keeps the right ratio if the viewport later crosses a
 * breakpoint. A tween that ended on frozen pixel values would not.
 *
 * Motion is the nav's, kept identical on purpose (see nav-menu.js):
 *   width 0 → full, margin-right 0 → gap, opacity 0 → 1, 0.55s, power3.out.
 * The gap grows WITH the image, so the heading starts flush and is pushed
 * aside — which is why `.scale-wrapper` has no flex gap of its own.
 *
 * Plays once per header. Reduced motion, a missing GSAP, or a browser without
 * IntersectionObserver all get the revealed state immediately.
 *
 * Trade-off, same as the nav thumbnails: the hidden state is authored in CSS
 * so there is no flash of a full-size image collapsing before the script runs.
 * If this script fails to load entirely, the images stay hidden. The headings
 * are unaffected, and the images are decorative (empty alt).
 */
(function () {
  "use strict";

  // Mirrors nav-menu.js THUMB_IN_DURATION and THUMB_EASE. Kept as literals
  // rather than shared because the two files load independently; if the nav's
  // timing changes, change these to match.
  var DURATION = 0.55;
  var EASE = "power3.out";

  var REVEALED = "is-revealed";

  // Start once the row is a little way into the viewport rather than the
  // instant its top edge crosses the bottom, so the growth is actually seen.
  var ROOT_MARGIN = "0px 0px -15% 0px";

  function reducedMotion() {
    return window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  }

  function finish(el) {
    el.classList.add(REVEALED);
  }

  function reveal(el) {
    if (el.classList.contains(REVEALED)) return;

    if (reducedMotion() || !window.gsap) {
      finish(el);
      return;
    }

    // Read the Designer's revealed state for the current breakpoint. Adding
    // and removing the class within one synchronous block forces layout for
    // the measurement but never lets the browser paint the revealed state.
    el.classList.add(REVEALED);
    var width = el.getBoundingClientRect().width;
    var gap = parseFloat(window.getComputedStyle(el).marginRight) || 0;
    el.classList.remove(REVEALED);

    window.gsap.fromTo(
      el,
      { width: 0, marginRight: 0, opacity: 0 },
      {
        width: width,
        marginRight: gap,
        opacity: 1,
        duration: DURATION,
        ease: EASE,
        onComplete: function () {
          finish(el);
          window.gsap.set(el, { clearProps: "width,marginRight,opacity" });
        }
      }
    );
  }

  function initScaleReveal() {
    var images = document.querySelectorAll("[data-scale-reveal]");
    if (!images.length) return;

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(images, finish);
      return;
    }

    // Watch the row, not the image: at rest the image is 0px wide, and a
    // zero-area target is an unreliable thing to ask IntersectionObserver
    // about. A row can hold more than one image, so map row → images.
    var byRow = new Map();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        (byRow.get(entry.target) || []).forEach(reveal);
        byRow.delete(entry.target);
      });
    }, { rootMargin: ROOT_MARGIN, threshold: 0 });

    Array.prototype.forEach.call(images, function (el) {
      var row = el.parentElement || el;
      if (!byRow.has(row)) {
        byRow.set(row, []);
        observer.observe(row);
      }
      byRow.get(row).push(el);
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initScaleReveal);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScaleReveal);
  } else {
    initScaleReveal();
  }
})();
