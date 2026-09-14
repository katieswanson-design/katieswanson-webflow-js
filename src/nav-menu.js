/**
 * nav-menu.js — the full-screen menu, and the curve swipe that reveals it.
 *
 * The panel itself is Webflow markup inside the `nav` component: a
 * [data-nav-menu] dialog holding the links, the contact block and the media
 * image. This file owns three things the Designer cannot: the motion, the
 * focus handling, and the state of the toggle button.
 *
 * ------------------------------------------------------------------ motion --
 * A single shape sweeps across the viewport, right to left, and the panel is
 * swapped underneath it at the moment it covers the screen. The shape is a
 * full-width rectangle whose LEADING edge is a quadratic curve, and the depth
 * of that curve follows sin(progress · pi) — so the edge bulges hardest mid
 * travel and is flat at both ends. That is what makes it read as an organic
 * swipe rather than a rectangle sliding past.
 *
 * Only GSAP core is used. No MorphSVG, no ScrollTrigger, no paid plugin — the
 * path `d` is recomputed each frame from two numbers. If GSAP is missing the
 * menu still opens and closes, just without the sweep.
 *
 * --------------------------------------------------------------- behaviour --
 * The toggle lives in nav-top, OUTSIDE the panel, because the bar stays visible
 * over the open menu and its label becomes "close". That single fact drives the
 * whole accessibility design:
 *
 *   - The panel is role="dialog" but deliberately NOT aria-modal="true".
 *     aria-modal hides everything outside the dialog from assistive tech, which
 *     would make the close button — sitting outside it — unreachable.
 *   - Isolation is done with `inert` on the page's other top-level sections
 *     instead. Same effect, except the nav bars stay reachable, which is the
 *     point. Nothing traps Tab: with the rest of the page inert there is
 *     nowhere wrong to go, so the browser's own focus order is correct.
 *   - Escape closes and returns focus to the toggle, per the guidelines.
 *
 * ----------------------------------------------------------------- markup ---
 *   <button data-nav-toggle aria-expanded="false" aria-controls="nav-menu">
 *   <div id="nav-menu" data-nav-menu role="dialog" aria-label="menu">
 *     a.nav-menu_link …
 *     <img data-nav-menu-media>          optional, fades in on link hover
 *
 * Both must be siblings inside the `nav` component root, which must itself be a
 * direct child of <body> — the inert pass walks body's children and skips the
 * one containing the panel.
 *
 * ------------------------------------------------------------------ motion --
 * prefers-reduced-motion gets an instant open with no sweep and no fades. The
 * unanimated state is the finished state, so nothing is lost. Reduced motion is
 * re-read on every open rather than cached, so changing the OS setting takes
 * effect without a reload.
 *
 * Animations are interruptible: hitting the toggle mid-sweep kills the running
 * timeline and starts the opposite one from wherever it got to.
 */

(function () {
  "use strict";

  var SWEEP = 0.9;   // seconds, whole sweep
  var BULGE = 0.22;  // peak curve depth, as a fraction of viewport width

  function init() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.querySelector("[data-nav-menu]");
    if (!toggle || !panel) return;

    var navRoot = panel.parentElement;
    var media = panel.querySelector("[data-nav-menu-media]");
    var links = panel.querySelectorAll(".nav-menu_link");
    var isOpen = false;
    var lastFocused = null;
    var timeline = null;

    // The panel takes focus itself on open so the dialog name is announced
    // before its contents. Set here rather than in the Designer so the contract
    // cannot be broken by an editing accident.
    panel.setAttribute("tabindex", "-1");

    function reducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /* ------------------------------------------------------------ curve --- */

    var svg = null;
    var path = null;

    function curve() {
      if (svg) return svg;
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "nav-menu_curve");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("preserveAspectRatio", "none");
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.appendChild(path);
      navRoot.appendChild(svg);
      return svg;
    }

    // Rectangle spanning x .. x+w, with the left edge pulled into a curve.
    // x = w  -> just off the right;  x = 0 -> exactly covering;  x = -w -> gone.
    function draw(progress) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var x = w - progress * (w * 2);
      var bulge = BULGE * w * Math.sin(progress * Math.PI);

      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      path.setAttribute(
        "d",
        "M " + x + " 0" +
          " L " + (x + w) + " 0" +
          " L " + (x + w) + " " + h +
          " L " + x + " " + h +
          " Q " + (x - bulge) + " " + h / 2 + " " + x + " 0 Z"
      );
    }

    /* ------------------------------------------------------------ inert --- */

    function setInert(on) {
      if (!("inert" in HTMLElement.prototype)) return;
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === navRoot || el.contains(panel)) return;
        el.inert = on;
      });
    }

    /* ------------------------------------------------------------ state --- */

    // Everything that is true of "open" regardless of how we animated there.
    function applyState(open) {
      isOpen = open;
      panel.style.opacity = open ? "1" : "0";
      panel.style.visibility = open ? "visible" : "hidden";
      panel.style.pointerEvents = open ? "auto" : "none";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "close" : "menu";
      setInert(open);

      if (open) {
        panel.focus({ preventScroll: true });
      } else if (lastFocused) {
        lastFocused.focus({ preventScroll: true });
        lastFocused = null;
      }
      if (!open) resetLinks();
    }

    function setOpen(open) {
      if (open === isOpen) return;
      if (open) lastFocused = document.activeElement;

      if (timeline) {
        timeline.kill();
        timeline = null;
      }

      if (reducedMotion() || !window.gsap) {
        if (svg) svg.style.visibility = "hidden";
        applyState(open);
        return;
      }

      curve();
      var proxy = { p: 0 };
      draw(0);
      svg.style.visibility = "visible";
      svg.style.willChange = "transform";

      timeline = window.gsap.timeline({
        onComplete: function () {
          svg.style.visibility = "hidden";
          svg.style.willChange = "";
          timeline = null;
        }
      });

      timeline
        .to(proxy, {
          p: 0.5,
          duration: SWEEP / 2,
          ease: "power2.in",
          onUpdate: function () { draw(proxy.p); }
        })
        .add(function () { applyState(open); })
        .to(proxy, {
          p: 1,
          duration: SWEEP / 2,
          ease: "power2.out",
          onUpdate: function () { draw(proxy.p); }
        });
    }

    /* ------------------------------------------------------- link hover --- */

    function resetLinks() {
      Array.prototype.forEach.call(links, function (l) { l.style.opacity = ""; });
      if (media) media.style.opacity = "0";
    }

    function focusLink(active) {
      var instant = reducedMotion() || !window.gsap;
      Array.prototype.forEach.call(links, function (l) {
        var dim = active && l !== active;
        if (instant) {
          l.style.opacity = dim ? "0.35" : "1";
        } else {
          window.gsap.to(l, { opacity: dim ? 0.35 : 1, duration: 0.25 });
        }
      });
      if (!media) return;
      var show = active ? 1 : 0;
      if (instant) media.style.opacity = String(show);
      else window.gsap.to(media, { opacity: show, duration: 0.3 });
    }

    Array.prototype.forEach.call(links, function (link) {
      // Pointer and keyboard both drive it, so the image is not a hover-only
      // affordance — guidelines, 1.4.13.
      link.addEventListener("mouseenter", function () { focusLink(link); });
      link.addEventListener("focus", function () { focusLink(link); });
      link.addEventListener("mouseleave", function () { focusLink(null); });
      link.addEventListener("blur", function () { focusLink(null); });
    });

    /* ------------------------------------------------------------ wiring -- */

    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !isOpen) return;
      e.preventDefault();
      setOpen(false);
    });

    // A link inside the panel navigates away; close first so the toggle label
    // and inert state are never left stale if the browser restores the page
    // from bfcache.
    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function () {
        if (isOpen) applyState(false);
      });
    });

    applyState(false);
  }

  if (window.Webflow) {
    window.Webflow.push(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
