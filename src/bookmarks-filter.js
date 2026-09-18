/**
 * bookmarks-filter.js — category filter for the /bookmarks resource grid.
 *
 * Adapted from Osmo Supply's "Basic Filter Setup (Multi Match)" (Katie is a
 * member). Kept: multi-match tokens, the active / transition-out / not-active
 * item states, the short delay that lets items animate out. Changed, per
 * Katie's interface guidelines:
 *   - Buttons start with aria-pressed matching their state (Osmo shipped the
 *     active "All" button as aria-pressed="false").
 *   - No aria-live on the list (it would read every card on each change); a
 *     separate status line announces "Showing 12 bookmarks in Accessibility".
 *   - The active filter lives in the URL (?category=slug), so it survives
 *     share, refresh and back/forward ("URL as state", "Deep-link everything").
 *   - Reduced motion: no out-transition delay; the CSS drops the transitions.
 *   - Shorter timing, exit faster than enter (guidelines' motion scale).
 *
 * Works with Webflow CMS without any attribute binding in the Designer: a
 * button's target and an item's tokens can come from bound TEXT, because the
 * API cannot bind attribute values to CMS fields.
 *
 * Markup contract (Designer):
 *
 *   <div data-filter-group>
 *     <div role="group" aria-label="Filter bookmarks by category">
 *       <button data-filter-target="all">All</button>
 *       <!-- Categories Collection List; each item: -->
 *       <button data-filter-target="">Accessibility</button>   target = slug of text
 *     </div>
 *     <p data-filter-status aria-live="polite" class="sr-only"></p>   announcement
 *     <div data-filter-list>                                   Bookmarks Collection List
 *       <div role="listitem">                                  Collection Item
 *         [content card component]
 *         <div data-filter-tokens hidden>design-systems accessibility</div>
 *       </div>
 *     </div>
 *   </div>
 *
 * Tokens are lowercase, space-separated slugs. A button whose
 * data-filter-target is empty uses the slug of its own text, so the Categories
 * list only needs its name bound. Items are found as the nearest listitem (or
 * [data-filter-item]) around each [data-filter-tokens].
 */
(function () {
  "use strict";

  var OUT_MS = 250; // must match the transition-out duration in bookmarks.css
  var PARAM = "category";

  function reducedMotion() {
    return window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  }

  function slug(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function initGroup(group) {
    var buttons = Array.prototype.slice.call(
      group.querySelectorAll("[data-filter-target]")
    );
    var status = group.querySelector("[data-filter-status]");
    var noun = group.getAttribute("data-filter-noun") || "bookmarks";

    buttons.forEach(function (btn) {
      if (!btn.getAttribute("data-filter-target")) {
        btn.setAttribute("data-filter-target", slug(btn.textContent));
      }
      btn.setAttribute("type", "button");
    });

    var items = [];
    var tokens = new Map();
    Array.prototype.forEach.call(
      group.querySelectorAll("[data-filter-tokens]"),
      function (t) {
        var item =
          t.closest("[data-filter-item]") ||
          t.closest('[role="listitem"]') ||
          t.parentElement;
        if (!item || tokens.has(item)) return;
        item.setAttribute("data-filter-item", "");
        var set = new Set(
          (t.textContent || "")
            .toLowerCase()
            .split(/\s+/)
            .map(slug)
            .filter(Boolean)
        );
        tokens.set(item, set);
        items.push(item);
      }
    );
    if (!items.length) return;

    function labelFor(target) {
      if (target === "all") return "";
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute("data-filter-target") === target) {
          return buttons[i].textContent.trim();
        }
      }
      return "";
    }

    function apply(target, announce) {
      var known = buttons.some(function (b) {
        return b.getAttribute("data-filter-target") === target;
      });
      if (!target || !known) target = "all";
      var delay = reducedMotion() ? 0 : OUT_MS;
      var shown = 0;

      items.forEach(function (el) {
        var on = target === "all" || tokens.get(el).has(target);
        if (on) shown++;
        if (el._ft) clearTimeout(el._ft);
        var cur = el.getAttribute("data-filter-status");
        if (!on && cur !== "not-active" && delay) {
          el.setAttribute("data-filter-status", "transition-out");
          el._ft = setTimeout(function () {
            el.setAttribute("data-filter-status", "not-active");
            el._ft = null;
          }, delay);
        } else if (on && cur !== "active" && delay && cur) {
          // Let the outgoing cards leave first, then bring these in.
          el._ft = setTimeout(function () {
            el.setAttribute("data-filter-status", "active");
            el._ft = null;
          }, delay);
        } else {
          el.setAttribute("data-filter-status", on ? "active" : "not-active");
        }
      });

      buttons.forEach(function (b) {
        var on = b.getAttribute("data-filter-target") === target;
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

      if (status && announce) {
        var name = labelFor(target);
        status.textContent =
          "Showing " + shown + " " + noun + (name ? " in " + name : "");
      }
      return target;
    }

    function fromUrl() {
      try {
        return slug(new URL(window.location.href).searchParams.get(PARAM));
      } catch (e) {
        return "";
      }
    }

    function toUrl(target) {
      try {
        var url = new URL(window.location.href);
        if (target === "all") url.searchParams.delete(PARAM);
        else url.searchParams.set(PARAM, target);
        window.history.pushState({ filter: target }, "", url);
      } catch (e) {}
    }

    // Initial paint: no transition, no announcement.
    var initial = apply(fromUrl(), false);
    items.forEach(function (el) {
      var on = initial === "all" || tokens.get(el).has(initial);
      el.setAttribute("data-filter-status", on ? "active" : "not-active");
    });

    group.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter-target]");
      if (!btn || !group.contains(btn)) return;
      var target = btn.getAttribute("data-filter-target");
      if (btn.getAttribute("aria-pressed") === "true") return;
      toUrl(apply(target, true));
    });

    window.addEventListener("popstate", function () {
      apply(fromUrl(), true);
    });
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-filter-group]"),
      initGroup
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
