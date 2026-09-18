/**
 * morph-text.js — words melt into one another with a gooey blur-and-threshold
 * morph. Adapted from BYQ Supply's "morphing-text-01" gem; no dependencies.
 *
 * Markup contract (Designer):
 *
 *   <h1 class="hero-morph-text">                  component `morph text`
 *     <span class="sr-only">everyone needs some space</span>   prop: heading text
 *     <span class="morphing-text-01__stage" aria-hidden="true"
 *           data-morph-text data-words="everyone, needs, some, space">  prop: words
 *       <span class="morphing-text-01__layer" data-morph-layer></span>
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
 * The layers are empty in the markup; this script writes the words. Reduced-
 * motion visitors get the LAST word of the list, static.
 *
 * Fit to width. The type is sized so the LONGEST word in data-words fills the
 * stage's width, and every word shares that one size — so any word list fits
 * any hero at any width, and the stage height never jumps between words. Same
 * technique as Osmo's "Fit Text to Width" (text width scales linearly with
 * font-size; measure, scale by available / measured, re-check), refit when the
 * stage width changes and once fonts have loaded.
 *
 * The script never writes font-size. It sets one custom property,
 * `--morph-fit`, on the stage's parent (the heading), and the Designer decides
 * what to do with it:
 *
 *   .hero-morph-text        font-size: clamp(3rem, var(--morph-fit, 14vw), 12rem)
 *                           width: 100%
 *   .morphing-text-01__stage  width: 100%; height: 1.2em
 *
 * So the clamp's floor and ceiling always win (a short list stops growing at
 * 12rem rather than filling a wide screen), and without this script the type
 * falls back to 14vw. The stage height is in em so it follows the fitted size.
 *
 * Styling lives in the Designer (.morphing-text-01__stage sizes the box, the
 * two absolutely positioned layers stack inside it, the heading sets the type).
 * Beyond --morph-fit the script only writes the per-frame blur/opacity and the
 * SVG threshold filter, which the Designer cannot express. It sets the filter and
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

  // Converged when the longest word is within 0.2% of the stage width.
  var FIT_TOLERANCE = 0.002;

  // Sizes the heading so the widest of `words` fills the stage. Returns a
  // function that re-runs the fit; the caller wires it to resize and fonts.
  function createFit(stage, words) {
    var host = stage.parentElement;
    if (!host) return function () {};

    // Measures at the stage's own font-size, one line, outside the layout.
    var probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;" +
      "display:inline-block;pointer-events:none";

    function widestWord() {
      stage.appendChild(probe);
      var widest = 0;
      words.forEach(function (w) {
        probe.textContent = w;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      });
      stage.removeChild(probe);
      return widest;
    }

    return function fit() {
      var available = stage.clientWidth;
      if (available <= 0) return;

      // Two passes: the first is exact in theory, the second absorbs rounding
      // and hinting. If the clamp is holding the size at its floor or ceiling,
      // the measured width stops changing and the loop exits.
      for (var i = 0; i < 2; i++) {
        var size = parseFloat(window.getComputedStyle(stage).fontSize);
        var width = widestWord();
        if (!size || width <= 0) return;
        var ratio = available / width;
        if (Math.abs(ratio - 1) < FIT_TOLERANCE) return;
        host.style.setProperty("--morph-fit", size * ratio + "px");
      }
    };
  }

  function watchFit(stage, fit) {
    var frame = null;
    var lastWidth = -1;

    function schedule() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(function () {
        frame = null;
        // The stage's height follows the fitted size (1.2em), so an observer
        // callback can be caused by our own write. Only width matters.
        var width = stage.clientWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        fit();
      });
    }

    fit();
    lastWidth = stage.clientWidth;

    if ("ResizeObserver" in window) {
      new ResizeObserver(schedule).observe(stage);
    } else {
      window.addEventListener("resize", schedule);
    }

    // A late font swap changes every word's width at the same width.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        fit();
        lastWidth = stage.clientWidth;
      });
    }
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

    watchFit(stage, createFit(stage, words));

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
