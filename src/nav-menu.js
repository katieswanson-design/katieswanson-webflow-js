/**
 * nav-menu.js — the full-screen menu, and the diagonal edge that reveals it.
 *
 * The panel itself is Webflow markup inside the `nav` component: a
 * [data-nav-menu] dialog holding the links, the contact block and the media
 * image. This file owns three things the Designer cannot: the motion, the
 * focus handling, and the state of the toggle button.
 *
 * ------------------------------------------------------------------ motion --
 * The panel is REVEALED behind a curved diagonal edge that travels across the
 * viewport. Nothing sweeps over the top of anything — there is no coloured
 * shape and no wipe. The edge is the boundary of an SVG clipPath applied to the
 * panel itself, and the panel is what you see arriving.
 *
 * The edge runs from a point on the top viewport edge to a point on the bottom
 * edge, the bottom point trailing the top one by DIAGONAL, which is what makes
 * it a diagonal rather than a vertical wipe. Its control point is pushed out in
 * the direction of travel by BOW, so the edge is always bowed — never a straight
 * line — and bows further mid-travel.
 *
 * Closing REVERSES the same tween rather than continuing through, so the edge
 * retreats back along the diagonal it arrived on.
 *
 * An SVG <clipPath> is used rather than `clip-path: path()`. Firefox only
 * shipped path() recently, and a clip that fails to parse leaves the menu
 * invisible — the worst available failure. `clip-path: url()` has worked
 * everywhere for years.
 *
 * Only GSAP core is used: the path `d` is recomputed each frame from three
 * numbers. Without GSAP the menu opens and closes unclipped.
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
 *     Focus always returns to the toggle itself rather than to whatever was
 *     focused on open: Safari does not focus a <button> when it is clicked,
 *     so reading document.activeElement at open time yields <body> there.
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

  var SWEEP = 1.15;      // seconds, whole reveal
  var EASE = "power4.inOut";
  var DIAGONAL = 0.75;   // how much lower the right of the bottom edge lands
                         // than the left, as a fraction of viewport height.
                         // The reference uses 175% vs 100%, i.e. 0.75.
  var BOW = 0.18;        // peak curvature of that bottom edge, fraction of height
  var LINK_STAGGER = 0.08;

  // Where the page content is pushed while the menu is open. Straight from the
  // reference; tune freely, the menu covers it either way.
  var PAGE_PUSHED = { rotation: 10, x: 300, y: 450, scale: 1.5 };

  function init() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.querySelector("[data-nav-menu]");
    if (!toggle || !panel) return;

    var navRoot = panel.parentElement;
    var media = panel.querySelector("[data-nav-menu-media]");
    var links = panel.querySelectorAll(".nav-menu_link");
    var inner = panel.querySelector(".nav-menu_inner");
    var pageMain = document.querySelector("[data-page-main]");
    var isOpen = false;
    var timeline = null;

    // The panel takes focus itself on open so the dialog name is announced
    // before its contents. Set here rather than in the Designer so the contract
    // cannot be broken by an editing accident.
    panel.setAttribute("tabindex", "-1");

    // Where the panel contents sit before they settle. Matches the reference:
    // the content arrives from up and to the left, larger and rotated.
    var REST = { rotation: -15, x: -100, y: -100, scale: 1.5, opacity: 0.25 };
    var SETTLED = { rotation: 0, x: 0, y: 0, scale: 1, opacity: 1 };

    function reducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /* ------------------------------------------------------------- clip --- */

    var clipSvg = null;
    var clipPath = null;
    var CLIP_ID = "nav-menu-clip";

    function clip() {
      if (clipSvg) return clipSvg;
      var NS = "http://www.w3.org/2000/svg";
      clipSvg = document.createElementNS(NS, "svg");
      clipSvg.setAttribute("class", "nav-menu_clip");
      clipSvg.setAttribute("aria-hidden", "true");
      clipSvg.setAttribute("width", "0");
      clipSvg.setAttribute("height", "0");
      var defs = document.createElementNS(NS, "defs");
      var cp = document.createElementNS(NS, "clipPath");
      cp.setAttribute("id", CLIP_ID);
      cp.setAttribute("clipPathUnits", "userSpaceOnUse");
      clipPath = document.createElementNS(NS, "path");
      cp.appendChild(clipPath);
      defs.appendChild(cp);
      clipSvg.appendChild(defs);
      navRoot.appendChild(clipSvg);
      return clipSvg;
    }

    // The panel drops DOWN from the top. Its bottom edge is a diagonal — the
    // right side travels further than the left — and that edge is bowed rather
    // than straight, which is the only thing this departs from the reference on.
    //
    //   progress 0 -> zero height at the top, nothing revealed
    //   progress 1 -> left edge at h, right edge at h * (1 + DIAGONAL), covered
    //
    // The bow follows sin(progress * pi) so it is exactly flat at progress 0 —
    // a constant bow would hang a visible sliver below the top edge at rest.
    function drawClip(progress) {
      var w = window.innerWidth;
      var h = window.innerHeight;

      var yLeft = progress * h;
      var yRight = progress * h * (1 + DIAGONAL);
      var bow = h * BOW * Math.sin(progress * Math.PI);

      // Control point at the chord midpoint, pushed down in the direction of
      // travel so the edge bulges the way it is moving.
      var ctrlX = w / 2;
      var ctrlY = (yLeft + yRight) / 2 + bow;

      clipPath.setAttribute(
        "d",
        "M 0 0" +
          " L " + w + " 0" +
          " L " + w + " " + yRight +
          " Q " + ctrlX + " " + ctrlY + " 0 " + yLeft +
          " Z"
      );
    }

    function applyClip(on) {
      panel.style.clipPath = on ? "url(#" + CLIP_ID + ")" : "";
      panel.style.webkitClipPath = on ? "url(#" + CLIP_ID + ")" : "";
    }

    // A transform — even an identity one — makes an element a containing block
    // for position:fixed and changes how position:sticky resolves inside it.
    // GSAP leaves `transform: translate(0px,0px) rotate(0deg) scale(1)` behind
    // when it animates back to zero, and `will-change: transform` does the same
    // thing on its own. Both must be REMOVED, not zeroed, or .statement_stage
    // and anything fixed inside the page quietly stop behaving once the menu
    // has been opened even once.
    function releasePage() {
      if (!pageMain) return;
      if (window.gsap) window.gsap.set(pageMain, { clearProps: "transform" });
      pageMain.style.willChange = "";
      pageMain.style.transform = "";
    }

    function lockScroll(on) {
      document.documentElement.style.overflow = on ? "hidden" : "";
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
    // moveFocus is false for the initial call only: applying the closed state
    // at load must not pull focus to the menu button.
    function applyState(open, moveFocus) {
      panel.style.opacity = open ? "1" : "0";
      panel.style.visibility = open ? "visible" : "hidden";
      panel.style.pointerEvents = open ? "auto" : "none";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "close" : "menu";
      setInert(open);
      lockScroll(open);

      if (moveFocus === false) {
        if (!open) resetLinks();
        return;
      }

      if (open) {
        panel.focus({ preventScroll: true });
      } else {
        // Always the toggle — never document.activeElement as captured on open.
        // Safari does not focus a <button> on click, so that capture is <body>
        // there and focus would be dropped on the floor for ~15% of visitors.
        toggle.focus({ preventScroll: true });
        resetLinks();
      }
    }

    // Current reveal progress, kept so an interrupted animation reverses from
    // where it actually got to rather than snapping to an end state.
    var progress = 0;

    function setOpen(open) {
      if (open === isOpen) return;

      // Flip intent IMMEDIATELY, not when the animation finishes. Otherwise a
      // click during a close is swallowed by the guard above and the menu
      // cannot be re-opened mid-flight.
      isOpen = open;

      if (timeline) {
        timeline.kill();
        timeline = null;
      }

      if (reducedMotion() || !window.gsap) {
        applyClip(false);
        panel.style.overflow = "";
        releasePage();
        progress = open ? 1 : 0;
        if (window.gsap) {
          window.gsap.set(inner, open ? SETTLED : REST);
          window.gsap.set(links, { yPercent: open ? 0 : 120, opacity: open ? 1 : 0.25 });
        }
        applyState(open);
        return;
      }

      clip();

      // The clip must be attached for BOTH directions. It is dropped when the
      // menu finishes opening (nothing left to clip), so closing has to put it
      // back before tweening or the edge animates against nothing and the panel
      // just disappears.
      drawClip(progress);
      applyClip(true);

      // Opening: the panel is present and painted for the whole reveal, so
      // state flips up front. Closing: state flips only once the edge has
      // retreated, so focus does not move while the panel is still on screen.
      if (open) applyState(true);

      var target = open ? 1 : 0;
      var proxy = { p: progress };
      var duration = Math.max(0.2, SWEEP * Math.abs(target - progress));

      // A scaled-up inner can push scrollbars onto the panel mid-animation.
      // Clamp for the duration and hand overflow back afterwards.
      panel.style.overflow = "hidden";

      timeline = window.gsap.timeline({
        onComplete: function () {
          timeline = null;
          applyClip(false);
          panel.style.overflow = "";
          if (!open) {
            releasePage();
            applyState(false);
          }
        }
      });

      timeline.to(proxy, {
        p: target,
        duration: duration,
        ease: EASE,
        onUpdate: function () {
          progress = proxy.p;
          drawClip(progress);
        }
      }, 0);

      if (inner) {
        timeline.to(inner, gsapVars(open ? SETTLED : REST, duration), 0);
      }

      if (pageMain) {
        pageMain.style.willChange = "transform";
        timeline.to(pageMain, {
          rotation: open ? PAGE_PUSHED.rotation : 0,
          x: open ? PAGE_PUSHED.x : 0,
          y: open ? PAGE_PUSHED.y : 0,
          scale: open ? PAGE_PUSHED.scale : 1,
          duration: duration,
          ease: EASE
        }, 0);
      }

      if (links.length) {
        timeline.to(links, {
          yPercent: open ? 0 : 120,
          opacity: open ? 1 : 0.25,
          duration: open ? 0.9 : 0.35,
          stagger: open ? LINK_STAGGER : 0,
          ease: open ? "power3.out" : "power2.in"
        }, open ? duration * 0.35 : 0);
      }
    }

    function gsapVars(state, duration) {
      return {
        rotation: state.rotation, x: state.x, y: state.y,
        scale: state.scale, opacity: state.opacity,
        duration: duration, ease: EASE
      };
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
        if (!isOpen) return;
        isOpen = false;
        if (timeline) { timeline.kill(); timeline = null; }
        applyClip(false);
        releasePage();
        progress = 0;
        applyState(false);
      });
    });

    if (window.gsap && !reducedMotion()) {
      window.gsap.set(inner, REST);
      window.gsap.set(links, { yPercent: 120, opacity: 0.25 });
    }

    applyState(false, false);
  }

  if (window.Webflow) {
    window.Webflow.push(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
