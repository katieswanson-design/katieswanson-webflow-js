/**
 * site-nav.js — hides the sticky site nav on scroll down, reveals it on scroll
 * up, and publishes its measured height as --site-nav-height.
 *
 * No dependencies.
 *
 * Markup contract:
 *   <div data-site-nav class="site-nav"> … </div>
 *
 * Pairs with src/site-nav.css, which owns all of the movement. This file only
 * toggles two attributes: data-nav-hidden (scroll direction) and
 * data-nav-scrolled (is the bar overlapping content yet). That split is deliberate: because the transition is
 * CSS, the global prefers-reduced-motion guard in reset.css can suppress it.
 * If the movement were animated here, that guard could not reach it.
 *
 * Tunables — attributes on the same element:
 *   data-nav-hide-after   px of scroll before hiding is allowed   (120)
 *   data-nav-threshold    px of movement before reacting          (6)
 */
(function () {
  "use strict";

  function initSiteNav() {
    var nav = document.querySelector("[data-site-nav]");
    if (!nav) return;

    function num(attr, fallback) {
      var raw = nav.getAttribute(attr);
      if (raw === null || raw === "") return fallback;
      var parsed = parseFloat(raw);
      return isNaN(parsed) ? fallback : parsed;
    }

    // Hiding inside the first screen is disorienting — there is nothing to
    // gain back yet, and the nav flickers as you nudge the page.
    var HIDE_AFTER = num("data-nav-hide-after", 120);

    // Trackpads and momentum scrolling emit a lot of 1-2px events. Without a
    // floor the nav flips state on noise.
    var THRESHOLD = num("data-nav-threshold", 6);

    /**
     * The hero sizes itself with calc(100vh - var(--site-nav-height)), so the
     * first screen fits exactly. Measuring beats hardcoding: the nav's height
     * is content-driven and changes with the breakpoint and the bio copy.
     */
    function publishHeight() {
      document.documentElement.style.setProperty(
        "--site-nav-height",
        nav.offsetHeight + "px"
      );
    }

    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      ticking = false;

      var y = window.scrollY;

      /*
       * The material state has no direction, so it is evaluated before the
       * movement threshold — otherwise a 3px nudge off the top would leave the
       * bar transparent while it already overlaps content.
       */
      if (y > 0) {
        nav.setAttribute("data-nav-scrolled", "");
      } else {
        nav.removeAttribute("data-nav-scrolled");
      }

      var delta = y - lastY;

      // Leave lastY alone below the threshold so small movements accumulate
      // rather than being discarded one frame at a time.
      if (Math.abs(delta) < THRESHOLD) return;

      if (y <= HIDE_AFTER || delta < 0) {
        nav.removeAttribute("data-nav-hidden");
      } else {
        nav.setAttribute("data-nav-hidden", "");
      }

      lastY = y;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    publishHeight();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (window.ResizeObserver) {
      new window.ResizeObserver(publishHeight).observe(nav);
    } else {
      window.addEventListener("resize", publishHeight);
    }
  }

  if (window.Webflow) {
    window.Webflow.push(initSiteNav);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteNav);
  } else {
    initSiteNav();
  }
})();
