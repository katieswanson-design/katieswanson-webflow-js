/**
 * mode-switch.js — wire the nav's mode button to the Color collection's DARK mode.
 *
 * The colour work was already done in Webflow. The Color variable collection
 * has two modes, and all 16 semantic variables carry a DARK value:
 * every surface/*, text/* and border/* resolves to a different primitive.
 * (surface/accent and border/accent are deliberately identical in both.)
 *
 * What ships that mode is a single class, `.u-dark`, which has the Color DARK
 * mode applied to it in the Designer. Webflow turns that into a plain CSS rule
 * that redeclares the whole collection:
 *
 *   .u-dark {
 *     color-scheme: dark;
 *     --surface--primary: var(--_primitives---brand--navy--900);
 *     --text--primary:    var(--_primitives---neutral--50);
 *     … all 16 …
 *   }
 *
 * So switching mode is only ever "put that class on <html>, or take it off".
 * There is no per-property JS and nothing here knows any colour value.
 *
 * Measured on the published sandbox before writing this:
 *   - :root declares the 16 semantic colours once, at BASE, at byte ~920
 *   - .u-dark redeclares all 16 at DARK, at byte ~124525
 *   - both selectors are specificity (0,1,0), so the later one wins — which is
 *     why .u-dark works even on <html>, the same element :root matches
 *   - Webflow emits the ENTIRE collection for an applied mode, not just the
 *     variables the class uses. .u-dark sets no colours of its own and still
 *     gets all 16
 *   - 7 zombie --template--* tokens ride along inside the same rule. They are
 *     residue from the original template, they resolve correctly, and they are
 *     not ours to clean up here
 *
 * Why the class carries `color-scheme: dark` as a real property:
 *   Webflow only publishes a CSS rule for a class that has at least one
 *   declared property. Usage is irrelevant — .top-right is applied to 14
 *   published elements and gets no rule at all, because it is empty. A class
 *   whose only content was an applied variable mode would be betting on
 *   Webflow counting that mode as "non-empty". color-scheme is needed anyway
 *   (guidelines: style <html> so scrollbars, form controls and device UI get
 *   native contrast), so declaring it costs nothing and removes the bet.
 *
 * Markup contract:
 *   <button type="button" data-mode-toggle>dark mode</button>
 *
 * The button label names the mode you would switch TO, not the one you are in:
 * "dark mode" while light, "light mode" while dark. It is therefore an action,
 * not a state, and it deliberately carries no aria-pressed — a control
 * announced as "light mode, pressed" contradicts itself. The label is the
 * accessible name and the only status cue needed.
 *
 * First paint is NOT handled here. A footer script runs too late and the page
 * would flash light before going dark. The class is applied by a small inline
 * header script registered separately in Webflow ("mode boot"), which is the
 * only code that runs before paint. This file assumes the class is already
 * correct when it loads and reads its initial state from the DOM.
 *
 * With no JS at all: the page renders in whatever mode the boot script chose,
 * and the button does nothing. Nothing is broken, it just cannot be changed.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ks-mode';
  var DARK_CLASS = 'u-dark';
  var root = document.documentElement;

  // Labels name the destination, not the current state.
  var LABEL_TO_DARK = 'dark mode';
  var LABEL_TO_LIGHT = 'light mode';

  // Only used if the computed token cannot be read. Kept in sync with
  // surface/primary: BASE #fff, DARK #0d1826 (brand/navy/900).
  var FALLBACK_THEME_COLOR = { light: '#fff', dark: '#0d1826' };

  var media = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function isDark() {
    return root.classList.contains(DARK_CLASS);
  }

  /** localStorage throws in some privacy modes. A dead store is not an error. */
  function stored() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function store(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* Safari private mode, blocked site data — the toggle still works. */
    }
  }

  /**
   * Keep the browser chrome on the page background.
   * The computed value of a custom property has its var() already substituted,
   * so this reads the real colour and never drifts from the tokens.
   */
  function syncThemeColor() {
    var value = '';
    try {
      value = getComputedStyle(root)
        .getPropertyValue('--surface--primary')
        .trim();
    } catch (e) {
      value = '';
    }
    if (!/^(#|rgb|hsl|color\()/i.test(value)) {
      value = isDark() ? FALLBACK_THEME_COLOR.dark : FALLBACK_THEME_COLOR.light;
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', value);
  }

  function label(button) {
    button.textContent = isDark() ? LABEL_TO_LIGHT : LABEL_TO_DARK;
  }

  var buttons = [].slice.call(
    document.querySelectorAll('[data-mode-toggle]')
  );

  function apply(dark) {
    root.classList.toggle(DARK_CLASS, dark);
    syncThemeColor();
    buttons.forEach(label);
  }

  buttons.forEach(function (button) {
    label(button);
    button.addEventListener('click', function () {
      var next = !isDark();
      apply(next);
      store(next ? 'dark' : 'light');
    });
  });

  // Follow the OS only while the visitor has not made a choice of their own.
  // Once they press the button their preference outranks the system setting.
  if (media) {
    var onSystemChange = function (event) {
      if (stored()) return;
      apply(event.matches);
    };
    if (media.addEventListener) {
      media.addEventListener('change', onSystemChange);
    } else if (media.addListener) {
      media.addListener(onSystemChange); // Safari < 14
    }
  }

  // The boot script set the class; this only brings the meta tag into line,
  // since it cannot read computed styles before the stylesheet has loaded.
  syncThemeColor();
})();
