/**
 * disclosure-a11y.js — correct the role Webflow assigns to accordion dropdowns.
 *
 * Webflow's Dropdown element is built for navigation menus. The case study
 * accordions (Overview / Opportunity / Key outcomes / Contributions) use it as
 * a disclosure instead — a button that expands a panel of prose. Almost all of
 * what Webflow's JS adds is right for that: role="button", tabindex="0",
 * aria-controls, and an aria-expanded that genuinely tracks state.
 *
 * One attribute is wrong. Webflow also adds:
 *
 *   aria-haspopup="menu"
 *
 * which promises a menu — a list of menuitems, navigable with arrow keys, that
 * closes on selection. There is no menu. A screen reader announces
 * "Overview, button, menu pop-up, collapsed" and sets an expectation the panel
 * never meets. Removing it leaves a plain expandable button, which is what this
 * actually is.
 *
 * Measured on the published sandbox before writing this:
 *   - aria-haspopup="menu" is present on every .w-dropdown-toggle at load
 *   - it is set by Webflow's JS, NOT in the published markup, so the Designer
 *     cannot remove it and there is nothing to fix at source
 *   - it is set BEFORE Webflow.push callbacks run, so one sweep here is enough
 *   - once removed it does not come back, through open and close
 *   - aria-expanded keeps working after removal — this takes nothing else away
 *
 * Markup contract:
 *   <div class="w-dropdown" data-disclosure>   <- the Dropdown wrapper
 *     <div class="w-dropdown-toggle"> … </div>
 *     <nav class="w-dropdown-list"> … </nav>
 *   </div>
 *
 * Opt-in on purpose. Every Webflow Dropdown on the site today is one of these
 * accordions, but a real navigation menu built the same way would WANT
 * aria-haspopup, and stripping it by class would quietly break it. Marking the
 * wrapper says "this one is a disclosure" and leaves anything unmarked alone.
 *
 * This does not add aria-expanded, aria-controls or role — Webflow already sets
 * all three correctly. It removes one attribute and nothing else. With no JS at
 * all the accordions still work; they simply keep the misleading menu promise.
 *
 * Note the accessible name is NOT handled here. These toggles need an explicit
 * aria-label set in the Designer, because name-from-content does not reach the
 * heading through the .row wrapper and the button ends up with no name at all.
 * That label belongs in the markup, not in a script.
 */

(function () {
  "use strict";

  function init() {
    var wrappers = document.querySelectorAll("[data-disclosure]");
    if (!wrappers.length) return;

    Array.prototype.forEach.call(wrappers, function (wrapper) {
      var toggles = wrapper.classList.contains("w-dropdown-toggle")
        ? [wrapper]
        : wrapper.querySelectorAll(".w-dropdown-toggle");

      Array.prototype.forEach.call(toggles, function (toggle) {
        toggle.removeAttribute("aria-haspopup");
      });
    });
  }

  // Webflow.push runs after Webflow's own modules have initialised, which is
  // when the attribute exists to remove. Measured, not assumed.
  if (window.Webflow) {
    window.Webflow.push(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
