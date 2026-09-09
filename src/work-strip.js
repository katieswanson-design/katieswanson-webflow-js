/**
 * work-strip.js — infinite drag/scroll marquee with cursor-proximity magnification.
 *
 * Adapted from the technique on gallery-studio.webflow.io, rewritten for
 * katieswanson.design.
 *
 * Requires: GSAP 3 core (gsap.min.js). No plugins.
 *
 * Markup contract:
 *   [data-work-strip]                 outer wrapper
 *     .work-strip_track               the flex container that gets translated
 *       .work-strip_item              one per project (a link block)
 *         .work-strip_info            name + meta, hidden until cursor is near
 *         .work-strip_card            the box that grows/shrinks
 *           .work-strip_image-wrapper overflow clip
 *             .work-strip_image       img, scaled up so it has room to pan
 *
 * DIRECTION
 * ---------
 * Horizontal or vertical is decided by the CSS `flex-direction` on
 * .work-strip_track — the script reads the computed value and follows it. There
 * is no breakpoint or direction setting in here to keep in sync.
 *
 * That means a Webflow component variant, a media query, or a one-off override
 * can all flip the axis and the behaviour follows automatically. When the
 * computed direction changes on resize, the marquee tears itself down and
 * rebuilds along the new axis.
 *
 * The reference implementation instead hardcoded `matchMedia("(min-width: 992px)")`
 * in JS alongside a `max-width: 991px` media query in CSS — two numbers that had
 * to agree, with a broken strip in the gap if they ever drifted.
 *
 * In vertical mode only card HEIGHT is magnified. Cards are full-width inside a
 * fixed-width column, so there is nowhere for width to grow.
 *
 * Tunables — set as attributes on [data-work-strip] to override:
 *   data-auto-speed      idle drift px/frame, negative = left/up      (-0.5)
 *   data-magnify-radius  px from cursor where cards start growing     (300)
 *   data-magnify-boost   fractional growth along the main axis        (0.25)
 *   data-height-boost    fractional height growth (horizontal only)   (0.22)
 *   data-info-radius     px within which the name/meta fade in        (100)
 *   data-wheel-scope     "strip" | "section" — what the wheel hijacks ("strip")
 *   data-intro-impulse   one-off velocity kick on load, 0 disables    (-500)
 *   data-intro-delay     seconds to wait before the kick              (0.4)
 *   data-intro-fade      seconds the strip fades in over the kick     (0.7)
 *
 * Also exposes window.workStripImpulse(v) — call it to kick the strip at any
 * time, e.g. from a preloader's completion callback.
 */
(function () {
  "use strict";

  var BLEND_FACTOR = 0.05; // how fast velocity eases back to idle
  var LERP_SPEED = 0.08; // magnify easing
  var PARALLAX_SCALE = 1.3; // image zoom, gives room to pan
  var PARALLAX_RANGE = 15; // percent travel across the viewport
  var MAGNIFY_MIN_WIDTH = 768; // below this, no magnification (touch)

  function initWorkStrip() {
    var strip = document.querySelector("[data-work-strip]");
    if (!strip) return;

    if (typeof gsap === "undefined") {
      console.warn("[work-strip] GSAP not found — skipping init.");
      return;
    }

    var track = strip.querySelector(".work-strip_track");
    if (!track) return;

    var originalItems = Array.prototype.slice.call(track.children);
    if (!originalItems.length) return;
    if (!originalItems[0].querySelector(".work-strip_card")) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(strip, { cursor: "default" });
      return;
    }

    function num(attr, fallback) {
      var raw = strip.getAttribute(attr);
      if (raw === null || raw === "") return fallback;
      var parsed = parseFloat(raw);
      return isNaN(parsed) ? fallback : parsed;
    }

    var AUTO_SPEED = num("data-auto-speed", -0.5);
    var MAGNIFY_RADIUS = num("data-magnify-radius", 300);
    var MAGNIFY_BOOST = num("data-magnify-boost", 0.25);
    var HEIGHT_BOOST = num("data-height-boost", 0.22);
    var INFO_RADIUS = num("data-info-radius", 100);
    var INTRO_IMPULSE = num("data-intro-impulse", -500);
    var INTRO_DELAY = num("data-intro-delay", 0.4);
    var INTRO_FADE = num("data-intro-fade", 0.7);

    // CSS is the source of truth for the axis.
    function readDirection() {
      var flex = window.getComputedStyle(track).flexDirection || "row";
      return flex.indexOf("column") === 0 ? "vertical" : "horizontal";
    }

    var teardown = null;
    var currentDirection = null;

    /**
     * Builds the marquee along one axis and returns a function that removes
     * every trace of it — ticker, listeners, and cloned nodes. Everything
     * axis-dependent branches on `isVertical`; the physics are identical.
     */
    function setup(direction, playIntro) {
      var isVertical = direction === "vertical";
      var cs = window.getComputedStyle(track);

      // The gap that separates items is column-gap on a row, row-gap on a
      // column. Measured, never hardcoded, so changing it in the Designer
      // cannot desync the loop seam.
      var gapRaw = isVertical ? cs.rowGap : cs.columnGap;
      var gap = parseFloat(gapRaw);
      if (isNaN(gap)) gap = 0;

      var firstCard = originalItems[0].querySelector(".work-strip_card");
      var baseCardWidth = firstCard.offsetWidth;
      var baseCardHeight = firstCard.offsetHeight;

      function itemSize(item) {
        return isVertical ? item.offsetHeight : item.offsetWidth;
      }

      var setSize = 0;
      originalItems.forEach(function (item) {
        setSize += itemSize(item) + gap;
      });
      if (!setSize) return function () {};

      var viewSize = isVertical ? window.innerHeight : window.innerWidth;
      var clonesNeeded = Math.max(2, Math.ceil((viewSize * 3) / setSize));

      // Kept so teardown can remove exactly what it added.
      var clonedNodes = [];
      for (var c = 0; c < clonesNeeded; c++) {
        originalItems.forEach(function (item) {
          var clone = item.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("tabindex", "-1");
          track.appendChild(clone);
          clonedNodes.push(clone);
        });
      }

      var allItems = gsap.utils.toArray(".work-strip_item", track);
      var allCards = allItems.map(function (i) {
        return i.querySelector(".work-strip_card");
      });
      var allInfos = allItems.map(function (i) {
        return i.querySelector(".work-strip_info");
      });
      var allImages = allItems.map(function (i) {
        return i.querySelector(".work-strip_image");
      });

      // The label always slides away from the card, so the hidden offset
      // flips with the axis.
      var infoHideY = isVertical ? -5 : 5;
      gsap.set(allInfos, { autoAlpha: 0, y: infoHideY });
      gsap.set(allImages, { scale: PARALLAX_SCALE });

      var pos = 0;
      var velocity = AUTO_SPEED;
      var isDragging = false;
      var hasDragged = false;
      var lastPointer = 0;
      var dragDelta = 0;
      var mousePos = -9999;
      var isHovering = false;
      var wheelVelocity = 0;
      var lerpBackRef = null;

      var cardWidths = allCards.map(function () {
        return baseCardWidth;
      });
      var cardHeights = allCards.map(function () {
        return baseCardHeight;
      });

      function pointerOnAxis(e) {
        return isVertical ? e.clientY : e.clientX;
      }

      function onPointerDown(e) {
        if (e.button !== 0) return;
        isDragging = true;
        hasDragged = false;
        lastPointer = pointerOnAxis(e);
        dragDelta = 0;
        gsap.set(strip, { cursor: "grabbing" });
      }

      function onPointerMove(e) {
        mousePos = pointerOnAxis(e);
        isHovering = true;
        if (!isDragging) return;
        var delta = pointerOnAxis(e) - lastPointer;
        dragDelta += delta;
        lastPointer = pointerOnAxis(e);
        if (Math.abs(delta) > 2) hasDragged = true;
      }

      function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        gsap.set(strip, { cursor: "grab" });
      }

      function onPointerCancel() {
        isDragging = false;
        gsap.set(strip, { cursor: "grab" });
      }

      function onPointerLeave() {
        if (isDragging) return;
        isHovering = false;
        mousePos = -9999;
        resetMagnification();
      }

      function onPointerEnter() {
        isHovering = true;
        if (lerpBackRef) {
          gsap.ticker.remove(lerpBackRef);
          lerpBackRef = null;
        }
      }

      function onDragStart(e) {
        e.preventDefault();
      }

      // A drag that ends over a card must not navigate to that project.
      function onClick(e) {
        if (!hasDragged) return;
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }

      function onWheel(e) {
        e.preventDefault();
        wheelVelocity += e.deltaY * 0.009;
      }

      strip.addEventListener("pointerdown", onPointerDown);
      strip.addEventListener("pointermove", onPointerMove);
      strip.addEventListener("pointerup", onPointerUp);
      strip.addEventListener("pointercancel", onPointerCancel);
      strip.addEventListener("pointerleave", onPointerLeave);
      strip.addEventListener("pointerenter", onPointerEnter);
      strip.addEventListener("dragstart", onDragStart);
      strip.addEventListener("click", onClick, true);

      var wheelTarget =
        strip.getAttribute("data-wheel-scope") === "section"
          ? strip.closest("section") || strip
          : strip;
      wheelTarget.addEventListener("wheel", onWheel, { passive: false });

      function centreOf(rect) {
        return isVertical
          ? rect.top + rect.height / 2
          : rect.left + rect.width / 2;
      }

      function offscreen(rect, margin) {
        var limit = isVertical ? window.innerHeight : window.innerWidth;
        return isVertical
          ? rect.bottom < -margin || rect.top > limit + margin
          : rect.right < -margin || rect.left > limit + margin;
      }

      function updateParallax() {
        var limit = isVertical ? window.innerHeight : window.innerWidth;
        allImages.forEach(function (img, i) {
          if (!img) return;
          var rect = allItems[i].getBoundingClientRect();
          if (offscreen(rect, 300)) return;
          var progress = centreOf(rect) / limit;
          var pct = gsap.utils.mapRange(
            0,
            1,
            PARALLAX_RANGE,
            -PARALLAX_RANGE,
            progress
          );
          gsap.set(img, isVertical ? { yPercent: pct } : { xPercent: pct });
        });
      }

      function updateMagnification() {
        allCards.forEach(function (card, i) {
          if (!card) return;
          var rect = allItems[i].getBoundingClientRect();
          if (offscreen(rect, 200)) return;

          var distance = Math.abs(mousePos - centreOf(rect));
          // Quadratic falloff: full boost at the cursor, zero at the radius.
          var t =
            distance < MAGNIFY_RADIUS
              ? 1 - (distance * distance) / (MAGNIFY_RADIUS * MAGNIFY_RADIUS)
              : 0;

          if (isVertical) {
            // Width is 100% of a fixed-width column — only height can grow.
            var targetH = baseCardHeight * (1 + MAGNIFY_BOOST * t);
            cardHeights[i] += (targetH - cardHeights[i]) * LERP_SPEED;
            gsap.set(card, { height: cardHeights[i] });
          } else {
            var targetW = baseCardWidth * (1 + MAGNIFY_BOOST * t);
            var targetH2 = baseCardHeight * (1 + HEIGHT_BOOST * t);
            cardWidths[i] += (targetW - cardWidths[i]) * LERP_SPEED;
            cardHeights[i] += (targetH2 - cardHeights[i]) * LERP_SPEED;
            gsap.set(card, { width: cardWidths[i], height: cardHeights[i] });
          }

          if (!allInfos[i]) return;
          if (distance < INFO_RADIUS) {
            gsap.to(allInfos[i], {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
          } else {
            gsap.to(allInfos[i], {
              autoAlpha: 0,
              y: infoHideY,
              duration: 0.2,
              ease: "power2.in",
              overwrite: "auto",
            });
          }
        });
      }

      function resetMagnification() {
        isHovering = false;
        if (lerpBackRef) gsap.ticker.remove(lerpBackRef);

        function lerpBack() {
          var allDone = true;
          allCards.forEach(function (card, i) {
            if (!card) return;
            cardHeights[i] += (baseCardHeight - cardHeights[i]) * 0.1;
            var hDone = Math.abs(cardHeights[i] - baseCardHeight) < 0.5;
            if (hDone) cardHeights[i] = baseCardHeight;

            if (isVertical) {
              if (!hDone) allDone = false;
              gsap.set(card, { height: cardHeights[i] });
              return;
            }

            cardWidths[i] += (baseCardWidth - cardWidths[i]) * 0.1;
            var wDone = Math.abs(cardWidths[i] - baseCardWidth) < 0.5;
            if (wDone) cardWidths[i] = baseCardWidth;
            if (!wDone || !hDone) allDone = false;
            gsap.set(card, { width: cardWidths[i], height: cardHeights[i] });
          });
          if (allDone) {
            gsap.ticker.remove(lerpBack);
            lerpBackRef = null;
          }
        }

        lerpBackRef = lerpBack;
        gsap.ticker.add(lerpBack);
        gsap.to(allInfos, { autoAlpha: 0, y: infoHideY, duration: 0.2, overwrite: "auto" });
      }

      function tick() {
        if (isDragging) {
          velocity = dragDelta;
          dragDelta = 0;
        } else {
          velocity += (AUTO_SPEED - velocity) * BLEND_FACTOR;
          velocity += wheelVelocity;
          wheelVelocity *= 0.88;
          if (Math.abs(wheelVelocity) < 0.01) wheelVelocity = 0;
        }

        pos += velocity;
        if (pos < -setSize) pos += setSize;
        if (pos > 0) pos -= setSize;
        gsap.set(track, isVertical ? { y: pos } : { x: pos });

        if (isHovering && !isDragging && window.innerWidth > MAGNIFY_MIN_WIDTH) {
          updateMagnification();
        }
        updateParallax();
      }

      gsap.ticker.add(tick);

      window.workStripImpulse = function (v) {
        velocity = typeof v === "number" ? v : INTRO_IMPULSE;
      };

      var introCall = null;
      var introTimeout = null;

      if (playIntro && INTRO_IMPULSE !== 0) {
        // The reference fires its impulse 0.8s BEFORE its preloader lifts, so
        // the violent opening frames play behind an opaque overlay and only the
        // decelerating tail is ever seen. With no preloader we hide the strip
        // ourselves and fade it back in while the peak burns off. Hidden via
        // JS, never CSS — a failed script load must still leave it visible.
        gsap.set(strip, { autoAlpha: 0 });

        introCall = gsap.delayedCall(INTRO_DELAY, function () {
          if (isDragging || hasDragged) {
            gsap.set(strip, { autoAlpha: 1 });
            return;
          }
          window.workStripImpulse(INTRO_IMPULSE);
          gsap.to(strip, { autoAlpha: 1, duration: INTRO_FADE, ease: "power2.out" });
        });

        // Safety net: never leave the strip invisible if the delayed call is
        // throttled away (a backgrounded tab starving rAF, say).
        introTimeout = window.setTimeout(function () {
          gsap.set(strip, { autoAlpha: 1 });
        }, (INTRO_DELAY + INTRO_FADE) * 1000 + 2000);
      }

      return function destroy() {
        gsap.ticker.remove(tick);
        if (lerpBackRef) gsap.ticker.remove(lerpBackRef);
        if (introCall) introCall.kill();
        if (introTimeout) window.clearTimeout(introTimeout);

        strip.removeEventListener("pointerdown", onPointerDown);
        strip.removeEventListener("pointermove", onPointerMove);
        strip.removeEventListener("pointerup", onPointerUp);
        strip.removeEventListener("pointercancel", onPointerCancel);
        strip.removeEventListener("pointerleave", onPointerLeave);
        strip.removeEventListener("pointerenter", onPointerEnter);
        strip.removeEventListener("dragstart", onDragStart);
        strip.removeEventListener("click", onClick, true);
        wheelTarget.removeEventListener("wheel", onWheel);

        clonedNodes.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });

        // Hand the originals back exactly as they were found, so the next
        // build measures clean values rather than inheriting inline sizes.
        gsap.set(track, { clearProps: "transform" });
        originalItems.forEach(function (item) {
          var card = item.querySelector(".work-strip_card");
          var info = item.querySelector(".work-strip_info");
          var img = item.querySelector(".work-strip_image");
          if (card) gsap.set(card, { clearProps: "width,height" });
          if (info) gsap.set(info, { clearProps: "opacity,visibility,transform" });
          if (img) gsap.set(img, { clearProps: "transform" });
        });
      };
    }

    currentDirection = readDirection();
    teardown = setup(currentDirection, true);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) resizeTimer.kill();
      resizeTimer = gsap.delayedCall(0.25, function () {
        // Rebuild on every settled resize, not just an axis change: card sizes
        // are vw/vh based, so the clone count and loop seam need re-measuring
        // either way. The intro never replays — it belongs to first load only.
        if (teardown) teardown();
        gsap.set(strip, { autoAlpha: 1 });
        currentDirection = readDirection();
        teardown = setup(currentDirection, false);
      });
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initWorkStrip);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkStrip);
  } else {
    initWorkStrip();
  }
})();
