/**
 * text-cycle.js — cycles a list of words through an element, blurring out and
 * back in between each one.
 *
 * Requires: GSAP 3 core (gsap.min.js). No plugins.
 *
 * Markup contract:
 *   <div data-text-cycle>design system practitioner</div>
 *
 * The element's existing text is what shows before the first swap, so put a
 * real word there rather than leaving it empty — it's what renders if the
 * script never runs.
 *
 * Words: by default the built-in ROLES list below. To set them per-element
 * without touching this file, put a comma-separated list in the attribute:
 *   <div data-text-cycle="product designer, design engineer, ai nerd">
 *
 * Tunables — set as attributes on the same element:
 *   data-cycle-interval  seconds each word is held      (2)
 *   data-cycle-out       seconds to blur out            (0.2)
 *   data-cycle-in        seconds to blur back in        (0.4)
 *   data-cycle-blur      px of blur at the midpoint     (8)
 *
 * Cycling is suppressed entirely under prefers-reduced-motion — repeatedly
 * animating text is exactly what that setting is asking us not to do — and
 * pauses while the tab is hidden.
 */
(function () {
  "use strict";

  var ROLES = [
    "design systems steward",
    "design engineer",
    "design engineer“,
    "design enablement lead”,
    "token architect“,
    "workflow and tooling builder“,
    "applied AI practitioner“,
    "playbook author“ , 
    "certified Webflow partner“,
  ];

  function initTextCycle() {
    var elements = document.querySelectorAll("[data-text-cycle]");
    if (!elements.length) return;

    if (typeof gsap === "undefined") {
      console.warn("[text-cycle] GSAP not found — skipping init.");
      return;
    }

    // Leave the markup's own text in place and stop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    Array.prototype.forEach.call(elements, function (el) {
      function num(attr, fallback) {
        var raw = el.getAttribute(attr);
        if (raw === null || raw === "") return fallback;
        var parsed = parseFloat(raw);
        return isNaN(parsed) ? fallback : parsed;
      }

      var INTERVAL = num("data-cycle-interval", 2);
      var OUT = num("data-cycle-out", 0.2);
      var IN = num("data-cycle-in", 0.4);
      var BLUR = num("data-cycle-blur", 8);

      // A comma-separated attribute value overrides the built-in list.
      var attrWords = (el.getAttribute("data-text-cycle") || "")
        .split(",")
        .map(function (w) {
          return w.trim();
        })
        .filter(Boolean);

      var words = attrWords.length ? attrWords : ROLES.slice();
      if (words.length < 2) return;

      var index = 0;
      el.textContent = words[0];

      var timer = null;

      function step() {
        var next = (index + 1) % words.length;

        gsap.to(el, {
          duration: OUT,
          filter: "blur(" + BLUR + "px)",
          opacity: 0,
          ease: "power2.in",
          onComplete: function () {
            el.textContent = words[next];
            index = next;
            gsap.to(el, {
              duration: IN,
              filter: "blur(0px)",
              opacity: 1,
              ease: "power2.out",
            });
          },
        });
      }

      function start() {
        if (timer) return;
        timer = window.setInterval(step, INTERVAL * 1000);
      }

      function stop() {
        if (!timer) return;
        window.clearInterval(timer);
        timer = null;
      }

      // A background tab keeps firing the interval but never paints, so you
      // return to a word that jumped several steps mid-animation.
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stop();
        } else {
          // Never leave it stuck mid-blur if we paused between the two tweens.
          gsap.set(el, { filter: "blur(0px)", opacity: 1 });
          start();
        }
      });

      start();
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initTextCycle);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTextCycle);
  } else {
    initTextCycle();
  }
})();
