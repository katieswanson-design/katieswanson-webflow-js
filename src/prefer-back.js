/**
 * prefer-back.js — link-behaviour corrections.
 *
 * Two small fixes for links whose correct behaviour the browser does not give
 * us for free. Both keep a real href, so both degrade to something sensible
 * with no JS at all.
 *
 *   1. [data-prefer-back]  a "back" link that really goes back when it can
 *   2. [data-skip-link]    a skip link that actually moves focus
 *
 * ---------------------------------------------------------------- 1 -------
 * A link marked [data-prefer-back] keeps a real href, so it works with no JS,
 * with keyboard, with middle-click, and for anyone arriving cold from a shared
 * URL or a search result. When the visitor genuinely came from the page that
 * href points at, this calls history.back() instead of navigating forward to a
 * fresh copy of it.
 *
 * Why that matters here: history.back() restores the exact scroll offset the
 * visitor left from. Navigating to /new-home#featured-case-studies only lands
 * on the section heading — which can leave the card they clicked off-screen,
 * so the view transition morphs toward somewhere they cannot see. Going back
 * puts the card exactly where it was and the morph reverses cleanly.
 *
 * Markup contract:
 *   <a href="/new-home#featured-case-studies" data-prefer-back> … </a>
 *
 * The href is the source of truth. This never invents a destination — if the
 * referrer does not match it, the link is left alone.
 *
 * ---------------------------------------------------------------- 2 -------
 * A skip link is supposed to move both the scroll AND the focus to its target,
 * so the next Tab continues past the nav. Browsers only do the focus half when
 * the navigation actually scrolls. On /new-home the target (#main-content, the
 * hero) already sits at the top of the page, so nothing scrolls, Chrome skips
 * the focus step, and the next Tab resumes from the link — landing the visitor
 * back in the nav they just asked to skip.
 *
 * Measured before this existed: activate the skip link, press Tab, focus lands
 * on "katie swanson" in the nav. That is the whole bug, and it is invisible
 * unless you test the Tab AFTER the activation rather than the activation
 * itself — the hash updates either way, which makes it look like it worked.
 *
 * Markup contract:
 *   <a href="#main-content" data-skip-link> skip to main content </a>
 *   <section id="main-content" tabindex="-1"> … </section>
 *
 * The target needs tabindex="-1" to be focusable at all; that is set in the
 * Designer. If it is missing this adds it rather than failing silently, but
 * the Designer is where it belongs.
 *
 * This does NOT preventDefault. The browser still owns the hash change and the
 * scroll — which matters, because that scroll respects the scroll-padding-top
 * in reset.css that keeps the target clear of the fixed nav. All this adds is
 * the focus call, queued so it lands after the browser has finished.
 */

(function () {
  "use strict";

  function isPlainLeftClick(e, link) {
    if (e.defaultPrevented) return false;
    if (e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    return true;
  }

  /* ------------------------------------------------------ prefer back --- */

  function cameFrom(href) {
    if (!document.referrer) return false;
    var ref, target;
    try {
      ref = new URL(document.referrer);
      target = new URL(href, window.location.href);
    } catch (_) {
      return false;
    }
    // Same site, and the referring page is the one the href points at.
    if (ref.origin !== window.location.origin) return false;
    return ref.pathname.replace(/\/$/, "") === target.pathname.replace(/\/$/, "");
  }

  function initPreferBack() {
    var links = document.querySelectorAll("a[data-prefer-back]");
    if (!links.length) return;

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function (e) {
        if (!isPlainLeftClick(e, link)) return;
        if (!cameFrom(link.getAttribute("href"))) return;

        e.preventDefault();
        window.history.back();
      });
    });
  }

  /* -------------------------------------------------------- skip links --- */

  function initSkipLinks() {
    var links = document.querySelectorAll('a[data-skip-link][href^="#"]');
    if (!links.length) return;

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function (e) {
        if (!isPlainLeftClick(e, link)) return;

        var id = link.getAttribute("href").slice(1);
        if (!id) return;

        var target = document.getElementById(id);
        if (!target) return;

        // Queued, not immediate: let the browser finish its own navigation and
        // scroll first, so this is the last word on where focus ends up.
        window.setTimeout(function () {
          if (!target.hasAttribute("tabindex")) {
            target.setAttribute("tabindex", "-1");
          }
          // preventScroll — the browser has already scrolled, and respected
          // scroll-padding-top doing it. Re-scrolling here would undo that.
          target.focus({ preventScroll: true });
        }, 0);
      });
    });
  }

  function init() {
    initPreferBack();
    initSkipLinks();
  }

  if (window.Webflow) {
    window.Webflow.push(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
