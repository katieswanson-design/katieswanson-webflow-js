/**
 * work-strip.js — infinite drag/scroll marquee with cursor-proximity magnification.
 *
 * Adapted from the technique on gallery-studio.webflow.io, rewritten for
 * katieswanson.design: namespaced classes, tunables readable from data
 * attributes, gap measured from CSS instead of hardcoded, and reduced-motion
 * support.
 *
 * Requires: GSAP 3 core (gsap.min.js). No plugins.
 *
 * Markup contract:
 *   [data-work-strip]                 outer wrapper
 *     .work-strip_track               flex row that gets translated
 *       .work-strip_item              one per project (a link block)
 *         .work-strip_info            name + meta, hidden until cursor is near
 *         .work-strip_card            the box that grows/shrinks
 *           .work-strip_image-wrapper overflow clip
 *             .work-strip_image       img, scaled up so it has room to pan
 *
 * Tunables — set as attributes on [data-work-strip] to override:
 *   data-auto-speed      idle drift px/frame, negative drifts left   (-0.5)
 *   data-magnify-radius  px from cursor where cards start growing    (300)
 *   data-magnify-boost   fractional width increase at cursor centre  (0.25)
 *   data-height-boost    fractional height increase at centre        (0.22)
 *   data-info-radius     px within which the name/meta fade in       (100)
 *   data-wheel-scope     "strip" | "section" — what the wheel hijacks ("strip")
 *   data-intro-impulse   one-off velocity kick on load, 0 disables   (-500)
 *   data-intro-delay     seconds to wait before the kick            (0.4)
 *
 * Also exposes window.workStripImpulse(v) — call it to kick the strip at any
 * time, e.g. from a preloader's completion callback. Set data-intro-delay to
 * match when your preloader finishes, or data-intro-impulse="0" to suppress the
 * automatic kick and fire it yourself.
 */
(function () {
  "use strict";

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

    var firstCard = originalItems[0].querySelector(".work-strip_card");
    if (!firstCard) return;

    // Respect the OS "reduce motion" setting: render the strip static and stop.
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) {
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

    var BLEND_FACTOR = 0.05; // how fast velocity eases back to idle
    var LERP_SPEED = 0.08; // magnify easing
    var PARALLAX_SCALE = 1.3; // image zoom, gives room to pan
    var PARALLAX_RANGE = 15; // xPercent travel: +15 → -15 across the viewport
    var MAGNIFY_MIN_WIDTH = 768; // below this, no magnification (touch)

    // Measure the real gap from CSS rather than hardcoding it, so changing the
    // gap in the Designer can't desync the loop seam.
    function readGap() {
      var raw = window.getComputedStyle(track).columnGap;
      var parsed = parseFloat(raw);
      return isNaN(parsed) ? 0 : parsed;
    }

    var gap = readGap();
    var baseCardWidth = firstCard.offsetWidth;
    var baseCardHeight = firstCard.offsetHeight;

    function measureSetWidth() {
      var total = 0;
      originalItems.forEach(function (item) {
        total += item.offsetWidth + gap;
      });
      return total;
    }

    var setWidth = measureSetWidth();
    if (!setWidth) return;

    // Clone enough copies to cover three viewports so the seam never shows.
    var clonesNeeded = Math.max(2, Math.ceil((window.innerWidth * 3) / setWidth));
    for (var c = 0; c < clonesNeeded; c++) {
      originalItems.forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("tabindex", "-1");
        track.appendChild(clone);
      });
    }

    var allItems = gsap.utils.toArray(".work-strip_item", track);
    var allCards = allItems.map(function (item) {
      return item.querySelector(".work-strip_card");
    });
    var allInfos = allItems.map(function (item) {
      return item.querySelector(".work-strip_info");
    });
    var allImages = allItems.map(function (item) {
      return item.querySelector(".work-strip_image");
    });

    gsap.set(allInfos, { autoAlpha: 0, y: 5 });
    gsap.set(allImages, { scale: PARALLAX_SCALE });

    var x = 0;
    var velocity = AUTO_SPEED;
    var isDragging = false;
    var hasDragged = false;
    var lastPointerX = 0;
    var dragDelta = 0;
    var mouseX = -9999;
    var isHovering = false;
    var wheelVelocity = 0;

    var cardCurrentWidths = allCards.map(function () {
      return baseCardWidth;
    });
    var cardCurrentHeights = allCards.map(function () {
      return baseCardHeight;
    });

    strip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      hasDragged = false;
      lastPointerX = e.clientX;
      dragDelta = 0;
      gsap.set(strip, { cursor: "grabbing" });
    });

    strip.addEventListener("pointermove", function (e) {
      mouseX = e.clientX;
      isHovering = true;
      if (!isDragging) return;
      var delta = e.clientX - lastPointerX;
      dragDelta += delta;
      lastPointerX = e.clientX;
      if (Math.abs(delta) > 2) hasDragged = true;
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      gsap.set(strip, { cursor: "grab" });
    }

    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);

    strip.addEventListener("pointerenter", function () {
      isHovering = true;
      if (lerpBackRef) {
        gsap.ticker.remove(lerpBackRef);
        lerpBackRef = null;
      }
    });

    strip.addEventListener("pointerleave", function () {
      if (isDragging) return;
      isHovering = false;
      mouseX = -9999;
      resetMagnification();
    });

    // Stop the browser's native image-drag from fighting the pointer drag.
    strip.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });

    // A drag that ends over a card must not navigate to that project.
    strip.addEventListener(
      "click",
      function (e) {
        if (!hasDragged) return;
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      },
      true
    );

    // Vertical wheel over the strip drives it sideways. Scoped to the strip by
    // default so the rest of the page scrolls normally; set
    // data-wheel-scope="section" to hijack the whole parent section instead.
    var wheelTarget =
      strip.getAttribute("data-wheel-scope") === "section"
        ? strip.closest("section") || strip
        : strip;

    wheelTarget.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        wheelVelocity += e.deltaY * 0.009;
      },
      { passive: false }
    );

    function updateParallax() {
      var viewW = window.innerWidth;
      allImages.forEach(function (img, i) {
        if (!img) return;
        var rect = allItems[i].getBoundingClientRect();
        if (rect.right < -300 || rect.left > viewW + 300) return;
        var cardCenter = rect.left + rect.width / 2;
        var progress = cardCenter / viewW; // 0 → 1 across the viewport
        gsap.set(img, {
          xPercent: gsap.utils.mapRange(0, 1, PARALLAX_RANGE, -PARALLAX_RANGE, progress),
        });
      });
    }

    function updateMagnification() {
      var viewW = window.innerWidth;
      allCards.forEach(function (card, i) {
        if (!card) return;
        var rect = allItems[i].getBoundingClientRect();
        if (rect.right < -200 || rect.left > viewW + 200) return;

        var cardCenter = rect.left + rect.width / 2;
        var distance = Math.abs(mouseX - cardCenter);
        var targetWidth = baseCardWidth;
        var targetHeight = baseCardHeight;

        if (distance < MAGNIFY_RADIUS) {
          // Quadratic falloff: full boost at the cursor, zero at the radius.
          var t = 1 - (distance * distance) / (MAGNIFY_RADIUS * MAGNIFY_RADIUS);
          targetWidth = baseCardWidth * (1 + MAGNIFY_BOOST * t);
          targetHeight = baseCardHeight * (1 + HEIGHT_BOOST * t);
        }

        cardCurrentWidths[i] += (targetWidth - cardCurrentWidths[i]) * LERP_SPEED;
        cardCurrentHeights[i] += (targetHeight - cardCurrentHeights[i]) * LERP_SPEED;
        gsap.set(card, { width: cardCurrentWidths[i], height: cardCurrentHeights[i] });

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
            y: 5,
            duration: 0.2,
            ease: "power2.in",
            overwrite: "auto",
          });
        }
      });
    }

    var lerpBackRef = null;

    function resetMagnification() {
      isHovering = false;
      if (lerpBackRef) gsap.ticker.remove(lerpBackRef);

      function lerpBack() {
        var allDone = true;
        allCards.forEach(function (card, i) {
          if (!card) return;
          cardCurrentWidths[i] += (baseCardWidth - cardCurrentWidths[i]) * 0.1;
          cardCurrentHeights[i] += (baseCardHeight - cardCurrentHeights[i]) * 0.1;
          var wDone = Math.abs(cardCurrentWidths[i] - baseCardWidth) < 0.5;
          var hDone = Math.abs(cardCurrentHeights[i] - baseCardHeight) < 0.5;
          if (wDone) cardCurrentWidths[i] = baseCardWidth;
          if (hDone) cardCurrentHeights[i] = baseCardHeight;
          if (!wDone || !hDone) allDone = false;
          gsap.set(card, { width: cardCurrentWidths[i], height: cardCurrentHeights[i] });
        });
        if (allDone) {
          gsap.ticker.remove(lerpBack);
          lerpBackRef = null;
        }
      }

      lerpBackRef = lerpBack;
      gsap.ticker.add(lerpBack);
      gsap.to(allInfos, { autoAlpha: 0, y: 5, duration: 0.2, overwrite: "auto" });
    }

    gsap.ticker.add(function () {
      if (isDragging) {
        velocity = dragDelta;
        dragDelta = 0;
      } else {
        velocity += (AUTO_SPEED - velocity) * BLEND_FACTOR;
        velocity += wheelVelocity;
        wheelVelocity *= 0.88;
        if (Math.abs(wheelVelocity) < 0.01) wheelVelocity = 0;
      }

      x += velocity;
      if (x < -setWidth) x += setWidth;
      if (x > 0) x -= setWidth;
      gsap.set(track, { x: x });

      if (isHovering && !isDragging && window.innerWidth > MAGNIFY_MIN_WIDTH) {
        updateMagnification();
      }
      updateParallax();
    });

    // One-off velocity kick. The ticker's blend then decays it back to
    // AUTO_SPEED on its own, so the strip whips out and glides to a stop —
    // no separate timeline needed. Exposed so a preloader can fire it instead.
    window.workStripImpulse = function (v) {
      velocity = typeof v === "number" ? v : INTRO_IMPULSE;
    };

    if (INTRO_IMPULSE !== 0) {
      // The reference site fires its impulse 0.8s BEFORE its preloader lifts, so
      // the violent opening frames happen behind an opaque overlay and the
      // visitor only ever sees the tail decelerating. With no preloader here we
      // reproduce that by hiding the strip ourselves and fading it back in while
      // the peak burns off. Hidden via JS, never CSS — if the script fails to
      // load the strip must still be visible.
      gsap.set(strip, { autoAlpha: 0 });

      gsap.delayedCall(INTRO_DELAY, function () {
        // Don't fight the user: skip the intro if they already grabbed it.
        if (isDragging || hasDragged) {
          gsap.set(strip, { autoAlpha: 1 });
          return;
        }
        window.workStripImpulse(INTRO_IMPULSE);
        gsap.to(strip, { autoAlpha: 1, duration: INTRO_FADE, ease: "power2.out" });
      });

      // Safety net: if the delayed call never runs (a stalled tab throttling
      // rAF, say), don't leave the strip invisible forever.
      window.setTimeout(function () {
        gsap.set(strip, { autoAlpha: 1 });
      }, (INTRO_DELAY + INTRO_FADE) * 1000 + 2000);
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) resizeTimer.kill();
      resizeTimer = gsap.delayedCall(0.25, function () {
        var card = originalItems[0].querySelector(".work-strip_card");
        if (!card) return;
        // Clear inline sizing so the CSS breakpoint value can be re-measured.
        gsap.set(allCards, { clearProps: "width,height" });
        baseCardWidth = card.offsetWidth;
        baseCardHeight = card.offsetHeight;
        cardCurrentWidths = allCards.map(function () {
          return baseCardWidth;
        });
        cardCurrentHeights = allCards.map(function () {
          return baseCardHeight;
        });
        gap = readGap();
        setWidth = measureSetWidth();
      });
    });
  }

  // Webflow's queue if it exists, plain DOM ready otherwise.
  if (window.Webflow) {
    window.Webflow.push(initWorkStrip);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkStrip);
  } else {
    initWorkStrip();
  }
})();
