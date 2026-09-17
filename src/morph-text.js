/**
 * morph-text.js — words melt into one another with a gooey blur-and-threshold
 * morph. Adapted from BYQ Supply's "morphing-text-01" gem; no dependencies.
 *
 * Markup contract (Designer):
 *
 *   <h1 class="hero-morph-text">
 *     <span class="sr-only">everyone needs some space</span>
 *     <span class="morphing-text-01__stage" aria-hidden="true"
 *           data-morph-text data-words="everyone, needs, some, space">
 *       <span class="morphing-text-01__layer" data-morph-layer>space</span>
 *       <span class="morphing-text-01__layer" data-morph-layer></span>
 *     </span>
 *   </h1>
 *
 * Accessibility differs from the gem on purpose. The gem announces every word
 * through a polite live region, which a screen reader would repeat every two
 * seconds for as long as the page is open. Here the visible stage is
 * aria-hidden and the heading's name comes from the sr-only span, which does
 * not change. Keep that span's text in step with data-words by hand.
 *
 * The first layer's text is what shows if this script never runs, and what
 * reduced-motion visitors see instead of the morph: the LAST word of the list.
 *
 * Styling lives in the Designer (.morphing-text-01__stage sizes the box, the
 * two absolutely positioned layers stack inside it, the heading sets the type).
 * The script only writes the per-frame blur/opacity and the SVG threshold
 * filter, which the Designer cannot express. It sets the filter and
 * will-change only while a morph is running, so a resting word renders as
 * normal anti-aliased text rather than through the alpha threshold.
 *
 * Tunables — attributes on the stage:
 *   data-words           comma-separated list, two or more        (required)
 *   data-morph-duration  seconds spent melting one word into the next (1.1)
 *   data-morph-hold      seconds a word rests crisp before the next   (0.9)
 *   data-morph-loop      "false" plays through once and stays on the last
 *                        word, which keeps it under WCAG 2.2.2's 5s limit
 *                        for motion with no pause control              (loop)
 *
 * Pauses while scrolled out of view and while the tab is hidden.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // px of blur at the thinnest point of a shape. Clamped so a nearly absent
  // layer never blows the filter region out to infinity.
  var MAX_BLUR = 46;

  // A frame gap longer than this is a pause (background tab, offscreen), not
  // time that should count towards the morph.
  var MAX_FRAME_GAP = 0.1;

  var uid = 0;

  function reducedMotion() {
    return window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  }

  function num(el, attr, fallback) {
    var parsed = parseFloat(el.getAttribute(attr));
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  }

  // The alpha threshold that snaps the merged blur back into letterforms.
  // Injected per stage so each has its own id and the Designer never needs an
  // embed. The filter region is enlarged from the default 120% so the blurred
  // halo is not clipped mid-morph.
  function createFilter(stage) {
    var id = "morph-text-threshold-" + ++uid;

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";

    var filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "200%");

    var matrix = document.createElementNS(SVG_NS, "feColorMatrix");
    matrix.setAttribute("in", "SourceGraphic");
    matrix.setAttribute("type", "matrix");
    matrix.setAttribute(
      "values",
      "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 42 -14"
    );

    filter.appendChild(matrix);
    svg.appendChild(filter);
    stage.appendChild(svg);

    return "url(#" + id + ") blur(0.4px)";
  }

  function initStage(stage) {
    var layers = stage.querySelectorAll("[data-morph-layer]");
    if (layers.length < 2) return;
    var layerA = layers[0];
    var layerB = layers[1];

    var words = (stage.getAttribute("data-words") || "")
      .split(",")
      .map(function (w) {
        return w.trim();
      })
      .filter(Boolean);
    if (words.length < 2) return;

    if (reducedMotion()) {
      layerA.textContent = words[words.length - 1];
      layerB.textContent = "";
      return;
    }

    var MORPH = num(stage, "data-morph-duration", 1.1) || 1.1;
    var HOLD = num(stage, "data-morph-hold", 0.9);
    var CYCLE = HOLD + MORPH;
    var LOOP = stage.getAttribute("data-morph-loop") !== "false";

    var filterValue = createFilter(stage);

    var elapsed = 0;
    var lastNow = null;
    var raf = null;
    var index = -1;
    var done = false;
    // "rest" | "morph" — null until the first render so it always applies.
    var phase = null;

    function showPair(step) {
      if (step === index) return;
      index = step;
      layerA.textContent = words[step % words.length];
      layerB.textContent = words[(step + 1) % words.length];
    }

    // Presence 0 → 1. Blur balloons as presence nears 0 so the letters
    // dissolve; opacity eases so the incoming word arrives early enough to
    // merge with the outgoing one.
    function apply(layer, presence) {
      var blur = Math.min(MAX_BLUR, 6 / Math.max(presence, 0.0001) - 6);
      layer.style.filter = "blur(" + blur + "px)";
      layer.style.opacity = String(Math.pow(presence, 0.42));
    }

    function rest() {
      if (phase === "rest") return;
      phase = "rest";
      stage.style.filter = "";
      layerA.style.filter = "";
      layerA.style.opacity = "";
      layerA.style.willChange = "";
      layerB.style.filter = "";
      layerB.style.opacity = "0";
      layerB.style.willChange = "";
    }

    function render() {
      var step = Math.floor(elapsed / CYCLE);

      if (!LOOP && step >= words.length - 1) {
        showPair(words.length - 1);
        rest();
        done = true;
        stop();
        return;
      }

      showPair(step);

      // Hold first, then melt — so each word, including the first, is read
      // crisp before it goes.
      var local = elapsed - step * CYCLE;
      var mix = local <= HOLD ? 0 : Math.min((local - HOLD) / MORPH, 1);

      if (mix === 0) {
        rest();
        return;
      }

      if (phase !== "morph") {
        phase = "morph";
        stage.style.filter = filterValue;
        layerA.style.willChange = "filter, opacity";
        layerB.style.willChange = "filter, opacity";
      }
      apply(layerA, 1 - mix);
      apply(layerB, mix);
    }

    function frame(now) {
      if (lastNow !== null) {
        elapsed += Math.min((now - lastNow) / 1000, MAX_FRAME_GAP);
      }
      lastNow = now;
      raf = null;
      render();
      if (!done) raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (raf !== null || done) return;
      lastNow = null;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (raf === null) return;
      window.cancelAnimationFrame(raf);
      raf = null;
    }

    // Paint the first word immediately, before any frame runs.
    render();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      }).observe(stage);
    } else {
      start();
    }
  }

  function initMorphText() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-morph-text]"),
      initStage
    );
  }

  // Run as soon as the markup exists rather than waiting on Webflow.push, so
  // the fallback word is swapped for the first word before the page paints.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMorphText);
  } else {
    initMorphText();
  }
})();
