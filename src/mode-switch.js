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
 *   <button type="button" data-mode-toggle>
 *     <span data-mode-label>dark mode</span>
 *   </button>
 *
 * The span is required wherever the button also holds the mobile icons, and
 * optional everywhere else — see `label()` below. src/mode-toggle.css owns the
 * text-to-icon swap at 767 and below.
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
 * The boot script deliberately does NOT add the transition class — the first
 * paint should arrive in the right mode, not animate into it. Only a
 * deliberate switch animates. See theme-transition.css.
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

  // Eases the colour change. The transition itself lives in
  // theme-transition.css, which explains why it cannot be declared on :root —
  // custom properties do not carry a transition to the elements that read
  // them, so the rule has to sit on the elements that actually paint. This
  // class switches it on for the length of the change and off again, so the
  // site is not carrying a colour transition on every element permanently.
  var ANIM_CLASS = 'u-theme-anim';
  var ANIM_MS = 400;
  var animTimer = null;
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  /**
   * Reduced motion gets no transition at all — the mode still changes, it just
   * arrives instantly, which is the right variant for a colour wash rather
   * than a slower one. The stylesheet guards this too; belt and braces.
   */
  function beginTransition() {
    if (reduceMotion && reduceMotion.matches) return;
    root.classList.add(ANIM_CLASS);
    window.clearTimeout(animTimer);
    // A little past the declared duration, so the class is never pulled while
    // the transition is still running. Repeated clicks restart the timer
    // rather than stacking, so the class always comes off exactly once.
    animTimer = window.setTimeout(function () {
      root.classList.remove(ANIM_CLASS);
    }, ANIM_MS + 60);
  }

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

  /**
   * Write the label into [data-mode-label] when the button has one.
   *
   * At 767 and below the button also contains two inline <svg> icons that
   * cross-fade (see src/mode-toggle.css). Setting textContent on the BUTTON
   * would delete them — textContent replaces every child, not just the text —
   * so the label gets its own span and this only ever touches that.
   *
   * Falling back to the button keeps older markup working: a plain
   * <button data-mode-toggle>dark mode</button> still labels itself, which
   * matters because the markup contract is per-instance and nothing here can
   * guarantee every instance has been updated.
   */
  function label(button) {
    var target = button.querySelector('[data-mode-label]') || button;
    target.textContent = isDark() ? LABEL_TO_LIGHT : LABEL_TO_DARK;
  }

  var buttons = [].slice.call(
    document.querySelectorAll('[data-mode-toggle]')
  );

  function apply(dark) {
    beginTransition();
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
