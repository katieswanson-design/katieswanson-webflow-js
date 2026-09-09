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
 *   data-timezone   IANA zone name                  (America/Chicago)
 *   data-meridiem   "false" to drop the am/pm       (shown by default)
 *
 * The zone abbreviation is derived from the date, not hardcoded, so Austin
 * reads "cdt" through daylight time and "cst" the rest of the year without
 * anyone remembering to change it.
 */
(function () {
  "use strict";

  function partsFor(tz) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).formatToParts(new Date());
  }

  function render(el) {
    var tz = el.getAttribute("data-timezone") || "America/Chicago";
    var parts;

    try {
      parts = partsFor(tz);
    } catch (err) {
      // An unknown zone throws a RangeError. Leave the markup's text alone
      // rather than replacing a sensible fallback with something broken.
      console.warn("[local-time] Unusable timezone:", tz, err);
      return false;
    }

    function value(type) {
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === type) return parts[i].value;
      }
      return "";
    }

    var out = value("hour") + ":" + value("minute");
    if (el.getAttribute("data-meridiem") !== "false") {
      out += " " + value("dayPeriod");
    }
    out += " " + value("timeZoneName");

    el.textContent = out.toLowerCase();
    return true;
  }

  function schedule(el) {
    if (!render(el)) return;

    // Land just after the minute rolls over instead of drifting on a fixed
    // 60s interval, so the displayed minute is never a second stale.
    var now = new Date();
    var msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    window.setTimeout(function () {
      schedule(el);
    }, msToNextMinute + 50);
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
