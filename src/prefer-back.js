/**
 * prefer-back.js — make a "back" link actually go back when it truthfully can.
 *
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
 */

(function () {
  var links = document.querySelectorAll("a[data-prefer-back]");
  if (!links.length) return;

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

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function (e) {
      // Leave "open in new tab", middle-click, and anything already handled.
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.target && link.target !== "_self") return;

      if (!cameFrom(link.getAttribute("href"))) return;

      e.preventDefault();
      window.history.back();
    });
  });
})();
