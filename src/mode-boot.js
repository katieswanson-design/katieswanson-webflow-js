/**
 * mode-boot.js — decide light or dark before the first paint.
 *
 * THIS FILE IS NOT LOADED FROM THE CDN. Its contents are registered in Webflow
 * as an INLINE site-level script named "mode boot", placed in the HEADER. This
 * file is the source of truth; edit it here.
 *
 * It is not what gets registered, though. register_inline_script caps source at
 * 2000 characters and the comment block above puts this file at ~2800, so what
 * Webflow holds is a stripped copy. That copy used to be produced by hand,
 * which meant it could drift from this file with nothing to catch it.
 *
 * It is now a build artifact:
 *   ./build-mode-boot.sh        derives src/mode-boot.inline.js from this file
 *   ./release.sh                rebuilds it, and prints the bytes to register
 *                               whenever this file changed
 *   ./check-pins.sh             fails if the artifact is stale against this
 *                               file, OR if the LIVE page serves other bytes
 *
 * So the manual step remains — Webflow has no API to publish inline source
 * without registering it — but it can no longer be forgotten silently.
 *
 * Why inline, and why the header:
 *   Every other script on this site is a hosted file in the footer, which is
 *   the right default. It is wrong here. A footer script runs after the page
 *   has painted, so a visitor who chose dark would see the site render light
 *   and then snap dark — the flash-of-wrong-theme. Even a hosted script in the
 *   header is a network round trip before paint. Inline in the header is the
 *   only placement with no gap, and Webflow's freeform head block rejects
 *   <script> (HTTP 406), so register_inline_script is the way in.
 *
 * Precedence, highest first:
 *   1. a stored choice in localStorage — the visitor pressed the button
 *   2. prefers-color-scheme — the OS setting, when they never have
 *   3. light — the site's base mode, if neither is readable
 *
 * It adds `.u-dark` to <html> and nothing else. All 16 semantic colour
 * variables come from that one class, which Webflow generates from the Color
 * collection's DARK mode. See mode-switch.js for the full account.
 *
 * The theme-color meta is created here rather than in the Designer because
 * Webflow emits no theme-color tag at all (checked on the published sandbox)
 * and its value has to differ per mode. The hex values are the only colours
 * hardcoded anywhere in this feature; mode-switch.js re-derives the same value
 * from the computed token once the stylesheet has loaded, so if surface/primary
 * ever changes these self-correct a moment later.
 *
 * Everything is wrapped in try/catch on purpose. localStorage throws outright
 * in some privacy modes, and this script runs before anything else on the page
 * — an exception here would take the whole head down.
 */
(function () {
  try {
    var stored = localStorage.getItem('ks-mode');
    var dark =
      stored === 'dark' || stored === 'light'
        ? stored === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (dark) document.documentElement.classList.add('u-dark');

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', dark ? '#0d1826' : '#fff');
  } catch (e) {
    /* No storage, no matchMedia, no head yet — fall through to base (light). */
  }
})();
