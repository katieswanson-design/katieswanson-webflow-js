/**
 * local-time.js — writes a clock for a FIXED timezone into an element, so the
 * page shows the site owner's local time rather than the visitor's.
 *
 * No dependencies.
 *
 * Markup contract:
 *   <div data-local-time data-timezone="America/Chicago">3:07 pm cdt</div>
 *
 * Put a plausible time in the markup. It is what renders if this script never
 * runs, and it stops the line collapsing to zero height on first paint.
 *
 * Output is lowercased to match the site's all-lowercase brand treatment.
 *
 * Tunables — set as attributes on the same element:
 *   data-timezone    IANA zone name                    (America/Chicago)
 *   data-hour12      "false" for a 24-hour clock       (12-hour by default)
 *   data-seconds     "true" to show seconds            (off by default)
 *   data-zone-name   "false" to drop the cdt/cst       (shown by default)
 *   data-meridiem    "false" to drop the am/pm         (shown by default)
 *
 * A 24-hour clock is zero-padded — 09:05, not 9:05 — because an unpadded
 * 24-hour time reads as a typo. 12-hour keeps its natural unpadded hour.
 * `hourCycle: h23` rather than `hour12: false`: the latter renders midnight as
 * 24:00 in some locales.
 *
 * The zone abbreviation is derived from the date, not hardcoded, so Austin
 * reads "cdt" through daylight time and "cst" the rest of the year without
 * anyone remembering to change it. Drop it with data-zone-name="false" when a
 * city label sits next to the clock and makes it redundant.
 *
 * WCAG 2.2.2 NOTE: with seconds on, this is auto-updating content that never
 * stops. The criterion's "essential" exception is what covers it — a clock that
 * does not update is not a clock — but it is a judgement call, not an exemption
 * granted by anything here. Without seconds the display changes once a minute,
 * which is far below the threshold anyone would notice as motion.
 */
(function () {
  "use strict";

  function optionsFor(el) {
    var opts = {
      timeZone: el.getAttribute("data-timezone") || "America/Chicago",
      minute: "2-digit",
      timeZoneName: "short",
    };

    if (el.getAttribute("data-hour12") === "false") {
      opts.hourCycle = "h23";
      opts.hour = "2-digit";
    } else {
      opts.hour12 = true;
      opts.hour = "numeric";
    }

    if (el.getAttribute("data-seconds") === "true") {
      opts.second = "2-digit";
    }

    return opts;
  }

  function showSeconds(el) {
    return el.getAttribute("data-seconds") === "true";
  }

  function render(el) {
    var parts;

    try {
      parts = new Intl.DateTimeFormat("en-US", optionsFor(el)).formatToParts(
        new Date()
      );
    } catch (err) {
      // An unknown zone throws a RangeError. Leave the markup's text alone
      // rather than replacing a sensible fallback with something broken.
      console.warn("[local-time] Unusable timezone:", err);
      return false;
    }

    function value(type) {
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === type) return parts[i].value;
      }
      return "";
    }

    var out = value("hour") + ":" + value("minute");

    if (showSeconds(el)) {
      out += ":" + value("second");
    }

    // A 24-hour clock has no am/pm to print, whatever data-meridiem says.
    if (
      el.getAttribute("data-hour12") !== "false" &&
      el.getAttribute("data-meridiem") !== "false"
    ) {
      out += " " + value("dayPeriod");
    }

    if (el.getAttribute("data-zone-name") !== "false") {
      out += " " + value("timeZoneName");
    }

    el.textContent = out.toLowerCase();
    return true;
  }

  function schedule(el) {
    if (!render(el)) return;

    // Land just after the unit rolls over instead of drifting on a fixed
    // interval, so the displayed value is never a tick stale.
    var now = new Date();
    var msToNext = showSeconds(el)
      ? 1000 - now.getMilliseconds()
      : (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    window.setTimeout(function () {
      schedule(el);
    }, msToNext + 50);
  }

  function initLocalTime() {
    var elements = document.querySelectorAll("[data-local-time]");
    if (!elements.length) return;

    Array.prototype.forEach.call(elements, function (el) {
      schedule(el);

      // Background tabs throttle timers, so the clock can be minutes behind by
      // the time someone switches back. Repaint immediately on return.
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) render(el);
      });
    });
  }

  if (window.Webflow) {
    window.Webflow.push(initLocalTime);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLocalTime);
  } else {
    initLocalTime();
  }
})();
