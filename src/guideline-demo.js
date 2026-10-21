/**
 * guideline-demo.js - interactive examples for the guidelines on /guidelines.
 *
 * Every example is one .guideline-demo_component with a data-pb attribute.
 * The switch flips the whole example between its "before" and "after" state.
 * All styling lives in the Designer as combo classes; this file only adds and
 * removes classes and ARIA state.
 *
 * ---------------------------------------------------------------------------
 * Mode toggle (every example)
 *   [data-pb]                                 .guideline-demo_component
 *   [data-pb-label="before" | "after"]        toggle labels, get .is-active
 *   button[data-pb-switch][role="switch"]     gets aria-checked
 *     span (track) > span (thumb)             both get .is-on
 *   [data-pb-target]                          gets .is-after in the after state
 *
 * Replay (examples 1, 13, 14, 36)
 *   button[data-pb-replay]                    reruns the entrance
 *   [data-pb-play]                            gets .is-played; while it is off
 *                                             the element sits in its start state
 *   [data-pb-delay="900"]                     optional, ms before .is-played
 *   The entrance also reruns whenever the mode changes.
 *
 * Open and close (examples 7, 24, 37, 39, 42, 44, 46)
 *   button[data-pb-open]                      toggles; gets aria-expanded, .is-open.
 *                                             With several triggers, only the one
 *                                             that opened the panel is expanded
 *   button[data-pb-close]                     closes (for example inside a modal)
 *   [data-pb-panel]                           gets .is-open
 *   [data-pb-anchor]                          optional; the panel is placed next to
 *                                             the trigger that opened it (below, or
 *                                             above when there is no room) and gets
 *                                             --pb-origin, the trigger's position,
 *                                             for transform-origin (example 7)
 *   [data-pb-closing="250"]                   optional, ms; while closing the panel
 *                                             also gets .is-closing, so the exit can
 *                                             take a different path than the entrance
 *   Escape and a click outside the example close it and return focus.
 *
 * Keyframes vs transitions (example 39), on the component:
 *   data-pb-keyframes="translateX(0)|translateX(10rem)|500"
 *   In the before state every open or close restarts a keyframe animation from
 *   its first frame, which is what CSS @keyframes do when retriggered. In the
 *   after state the CSS transition on .is-open takes over and reverses from
 *   wherever it is.
 *
 * Swap (examples 29, 47)
 *   button[data-pb-swap]                      gets aria-pressed
 *   [data-pb-swap-target]                     gets .is-swapped
 *
 * Tabs (example 40)
 *   [role="tablist"] > button[data-pb-tab]    get .is-active, aria-selected
 *   [data-pb-indicator]                       moved under the active tab with
 *                                             inline transform and width
 *
 * Tooltip warm-up (example 38)
 *   button[data-pb-tip]                       trigger, has aria-describedby
 *     [data-pb-tooltip]                       gets .is-visible, and .is-instant
 *                                             when it opens without a delay
 *   Before: every tooltip waits --_motion---delay--tooltip (500ms). After:
 *   once one tooltip has opened, moving to a neighbor within 300ms opens it
 *   after --_motion---delay--tooltip-warm (0ms) instead.
 *
 * Slow motion (examples 24, 47)
 *   button[data-pb-slow]                      gets aria-pressed; plays every
 *                                             animation in the example at 1/4 speed
 *
 * Confirm (example 34), data-pb="confirm"
 *   button[data-pb-confirm-trigger]           "Delete project", gets .is-open and
 *                                             aria-expanded while the dialog is open
 *   [data-pb-confirm-panel]                   role="alertdialog", gets .is-open
 *     button[data-pb-confirm-cancel]          closes the dialog
 *     button[data-pb-confirm-accept]          deletes
 *   [data-pb-confirm-result]                  "Project deleted.", tabindex="-1"
 *   Before: the trigger deletes immediately. After: it opens the dialog.
 *
 * Page hints (WCAG links in the example headers), outside the mode toggle
 *   a[data-pb-hint]                           trigger, keeps its own aria-label
 *     [data-pb-hint-tooltip]                  aria-hidden; gets .is-visible, and
 *                                             .is-instant when it opens warm
 *   One group for the whole page, following the guideline the page teaches:
 *   the first hint waits --_motion---delay--tooltip, a neighbor opened within
 *   300ms of the last one opens at --_motion---delay--tooltip-warm. Hints stay
 *   open while the pointer moves onto them (a short grace covers the gap) and
 *   Escape dismisses them (WCAG 1.4.13).
 * ---------------------------------------------------------------------------
 *
 * Motion values come from motion.css tokens set in the Designer. Reduced
 * motion is handled in reset.css; the WAAPI keyframes here check it too.
 *
 * Loaded on /guidelines as a registered script (footer).
 */
(function () {
  'use strict';

  var SLOW_RATE = 0.25;
  var ANCHOR_GAP = 8; // px between an anchored panel and its trigger
  var TIP_WARM = 300; // ms after a tooltip closes that its neighbors stay warm

  // Tooltip delays come from motion.css so the demo matches the token.
  function tokenMs(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    var n = parseFloat(v);
    if (isNaN(n)) return fallback;
    return /ms\s*$/.test(v) ? n : n * 1000;
  }

  function qa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function q(root, sel) {
    return root.querySelector(sel);
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- Slow motion --------------------------------------------------- */

  function initSlow(root) {
    var btn = q(root, '[data-pb-slow]');
    if (!btn) return function () {};
    var slow = false;

    function apply() {
      if (!root.getAnimations) return;
      root.getAnimations({ subtree: true }).forEach(function (a) {
        a.playbackRate = slow ? SLOW_RATE : 1;
      });
    }

    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      slow = !slow;
      btn.setAttribute('aria-pressed', String(slow));
      btn.classList.toggle('is-active', slow);
      apply();
    });

    // Transitions are created on the next style recalc, so check now and
    // again on the following frame.
    return function afterChange() {
      if (!slow) return;
      apply();
      requestAnimationFrame(apply);
    };
  }

  /* ---- Replay -------------------------------------------------------- */

  function initReplay(root, onChange) {
    var items = qa(root, '[data-pb-play]');
    if (!items.length) return null;
    var timers = [];

    function play() {
      timers.forEach(clearTimeout);
      timers = [];
      // Snap back to the start state without animating the reset, so the
      // entrance always plays from the beginning.
      items.forEach(function (el) {
        el.style.transition = 'none';
        el.classList.remove('is-played');
      });
      void root.offsetWidth;
      items.forEach(function (el) { el.style.transition = ''; });
      requestAnimationFrame(function () {
        items.forEach(function (el) {
          var delay = parseInt(el.getAttribute('data-pb-delay'), 10) || 0;
          var go = function () { el.classList.add('is-played'); onChange(); };
          if (delay) timers.push(setTimeout(go, delay));
          else go();
        });
      });
    }

    var btn = q(root, '[data-pb-replay]');
    if (btn) btn.addEventListener('click', play);

    items.forEach(function (el) { el.classList.add('is-played'); });
    return play;
  }

  /* ---- Open and close ------------------------------------------------ */

  function parseKeyframes(root) {
    var spec = root.getAttribute('data-pb-keyframes');
    if (!spec) return null;
    var p = spec.split('|');
    return { from: p[0], to: p[1], ms: parseInt(p[2], 10) || 400 };
  }

  function initOpen(root, isAfter, onChange) {
    var triggers = qa(root, '[data-pb-open]');
    var panels = qa(root, '[data-pb-panel]');
    if (!triggers.length || !panels.length) return null;
    var open = false;
    var lastTrigger = triggers[0];
    var closeTimers = [];
    var kf = parseKeyframes(root);

    function runKeyframes(opening) {
      if (!kf || isAfter() || reducedMotion()) return;
      panels.forEach(function (el) {
        el.getAnimations().forEach(function (a) { a.cancel(); });
        el.animate(
          [{ transform: opening ? kf.from : kf.to }, { transform: opening ? kf.to : kf.from }],
          { duration: kf.ms, easing: 'ease-out', fill: 'forwards' }
        );
      });
    }

    // Anchored panels sit next to whichever trigger opened them, and expose
    // that trigger's position as --pb-origin for transform-origin.
    function place(el) {
      if (!el.hasAttribute('data-pb-anchor') || !lastTrigger) return;
      var parent = el.offsetParent || root;
      var pr = parent.getBoundingClientRect();
      var tr = lastTrigger.getBoundingClientRect();
      var w = el.offsetWidth, h = el.offsetHeight, gap = ANCHOR_GAP;
      var cx = tr.left + tr.width / 2 - pr.left;
      var third = pr.width / 3;
      var left = cx < third ? tr.left - pr.left
        : cx > third * 2 ? tr.right - pr.left - w
        : cx - w / 2;
      left = Math.max(gap, Math.min(left, pr.width - w - gap));
      var below = tr.bottom - pr.top + gap + h <= pr.height;
      var top = below ? tr.bottom - pr.top + gap : tr.top - pr.top - gap - h;
      var ox = Math.max(0, Math.min(cx - left, w));
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.setProperty('--pb-origin', ox + 'px ' + (below ? '0px' : h + 'px'));
    }

    function snapClosed() {
      panels.forEach(function (el) {
        el.style.transition = 'none';
        el.classList.remove('is-open', 'is-closing');
      });
      void root.offsetWidth;
      panels.forEach(function (el) { el.style.transition = ''; });
      open = false;
    }

    function set(next, returnFocus) {
      if (next === open) return;
      open = next;
      closeTimers.forEach(clearTimeout);
      closeTimers = [];
      if (open) panels.forEach(place);
      runKeyframes(open);
      panels.forEach(function (el) {
        el.classList.toggle('is-open', open);
        el.classList.remove('is-closing');
        var ms = parseInt(el.getAttribute('data-pb-closing'), 10);
        if (!open && ms) {
          el.classList.add('is-closing');
          closeTimers.push(setTimeout(function () { el.classList.remove('is-closing'); }, ms));
        }
      });
      triggers.forEach(function (t) {
        var on = open && (triggers.length === 1 || t === lastTrigger);
        t.setAttribute('aria-expanded', String(on));
        t.classList.toggle('is-open', on);
      });
      if (open) {
        var focusIn = q(root, '[data-pb-panel] [data-pb-close], [data-pb-panel] [data-pb-focus]');
        if (focusIn) focusIn.focus();
      } else if (returnFocus && lastTrigger) {
        lastTrigger.focus();
      }
      onChange();
    }

    triggers.forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
      t.addEventListener('click', function () {
        // A different trigger while open: reopen from that trigger.
        if (open && t !== lastTrigger) snapClosed();
        lastTrigger = t;
        set(!open, false);
      });
    });
    qa(root, '[data-pb-close]').forEach(function (b) {
      b.addEventListener('click', function () { set(false, true); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) set(false, true);
    });
    document.addEventListener('click', function (e) {
      if (open && !root.contains(e.target)) set(false, false);
    });
    window.addEventListener('resize', function () {
      if (open) panels.forEach(place);
    });

    return function reset() {
      closeTimers.forEach(clearTimeout);
      panels.forEach(function (el) {
        if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
        el.classList.remove('is-open', 'is-closing');
      });
      triggers.forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
        t.classList.remove('is-open');
      });
      open = false;
    };
  }

  /* ---- Swap ---------------------------------------------------------- */

  function initSwap(root, onChange) {
    var btn = q(root, '[data-pb-swap]');
    if (!btn) return null;
    var targets = qa(root, '[data-pb-swap-target]');
    var on = false;

    function set(next) {
      on = next;
      btn.setAttribute('aria-pressed', String(on));
      targets.forEach(function (el) { el.classList.toggle('is-swapped', on); });
      onChange();
    }

    btn.addEventListener('click', function () { set(!on); });
    btn.setAttribute('aria-pressed', 'false');
    return function reset() { set(false); };
  }

  /* ---- Tabs ---------------------------------------------------------- */

  function initTabs(root) {
    var tabs = qa(root, '[data-pb-tab]');
    if (!tabs.length) return;
    var indicator = q(root, '[data-pb-indicator]');

    function place(tab) {
      if (!indicator) return;
      indicator.style.width = tab.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    }

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      place(tab);
      if (focus) tab.focus();
    }

    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });

    // First placement without animating the indicator in from zero.
    var first = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0] || tabs[0];
    if (indicator) indicator.style.transition = 'none';
    select(first, false);
    if (indicator) {
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
    window.addEventListener('resize', function () {
      var active = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0];
      if (active && indicator) {
        indicator.style.transition = 'none';
        place(active);
        void indicator.offsetWidth;
        indicator.style.transition = '';
      }
    });
  }

  /* ---- Tooltip warm-up ----------------------------------------------- */

  function initTips(root, isAfter) {
    var tips = qa(root, '[data-pb-tip]');
    if (!tips.length) return null;
    var delay = tokenMs('--_motion---delay--tooltip', 500);
    var warmDelay = tokenMs('--_motion---delay--tooltip-warm', 0);
    var showTimer = null;
    var lastHide = 0;
    var current = null;

    function tipOf(t) { return q(t, '[data-pb-tooltip]'); }

    function hide(t) {
      var tip = tipOf(t);
      if (tip && tip.classList.contains('is-visible')) {
        tip.classList.remove('is-visible');
        lastHide = Date.now();
      }
      if (current === t) current = null;
    }

    function show(t) {
      clearTimeout(showTimer);
      var warm = isAfter() && (current !== null || Date.now() - lastHide < TIP_WARM);
      if (current && current !== t) hide(current);
      var tip = tipOf(t);
      if (!tip) return;
      current = t;
      tip.classList.toggle('is-instant', warm);
      showTimer = setTimeout(function () {
        if (current === t) tip.classList.add('is-visible');
      }, warm ? warmDelay : delay);
    }

    tips.forEach(function (t) {
      t.addEventListener('pointerenter', function () { show(t); });
      t.addEventListener('pointerleave', function () { clearTimeout(showTimer); hide(t); });
      t.addEventListener('focus', function () { show(t); });
      t.addEventListener('blur', function () { clearTimeout(showTimer); hide(t); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) hide(current);
    });

    return function reset() {
      clearTimeout(showTimer);
      tips.forEach(function (t) {
        var tip = tipOf(t);
        if (tip) tip.classList.remove('is-visible', 'is-instant');
      });
      current = null;
      lastHide = 0;
    };
  }

  /* ---- Confirm (example 34) ------------------------------------------ */

  function initConfirm(root, isAfter) {
    var C = '[data-pb-confirm-';
    function part(key) { return q(root, C + key + ']'); }
    function show(el, on) { if (el) el.style.display = on ? '' : 'none'; }

    var trigger = part('trigger');
    var dialog = part('panel');
    var result = part('result');

    function setOpen(open, returnFocus) {
      if (dialog) dialog.classList.toggle('is-open', open);
      if (trigger) {
        trigger.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      }
      if (open) {
        var cancel = part('cancel');
        if (cancel) cancel.focus();
      } else if (returnFocus && trigger) {
        trigger.focus();
      }
    }

    function isOpen() { return !!dialog && dialog.classList.contains('is-open'); }

    function remove() {
      setOpen(false, false);
      show(trigger, false);
      show(result, true);
      if (result) result.focus();
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-pb-confirm-trigger')) {
        if (!isAfter()) remove();
        else setOpen(!isOpen(), false);
      } else if (t.hasAttribute('data-pb-confirm-cancel')) {
        setOpen(false, true);
      } else if (t.hasAttribute('data-pb-confirm-accept')) {
        remove();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (dialog.contains(e.target) || (trigger && trigger.contains(e.target))) return;
      setOpen(false, false);
    });

    return function reset() {
      setOpen(false, false);
      show(trigger, true);
      show(result, false);
    };
  }

  /* ---- Example ------------------------------------------------------- */

  function init(root) {
    var after = false;
    var sw = q(root, '[data-pb-switch]');
    var isAfter = function () { return after; };
    var onChange = initSlow(root);
    var resets = [];
    var replay = initReplay(root, onChange);

    [
      initOpen(root, isAfter, onChange),
      initSwap(root, onChange),
      initTips(root, isAfter),
      root.getAttribute('data-pb') === 'confirm' ? initConfirm(root, isAfter) : null
    ].forEach(function (r) { if (r) resets.push(r); });
    initTabs(root);

    function setMode(a, user) {
      after = a;
      root.setAttribute('data-pb-mode', a ? 'after' : 'before');
      if (sw) {
        sw.setAttribute('aria-checked', String(a));
        qa(sw, 'span').forEach(function (el) { el.classList.toggle('is-on', a); });
      }
      qa(root, '[data-pb-label]').forEach(function (label) {
        var isAfterLabel = label.getAttribute('data-pb-label') === 'after';
        label.classList.toggle('is-active', isAfterLabel === a);
      });
      qa(root, '[data-pb-target]').forEach(function (el) {
        el.classList.toggle('is-after', a);
      });
      resets.forEach(function (r) { r(); });
      if (user && replay) replay();
      onChange();
    }

    if (sw) sw.addEventListener('click', function () { setMode(!after, true); });

    // The labels are a convenience for pointer users; the switch is the
    // keyboard and screen reader control.
    qa(root, '[data-pb-label]').forEach(function (label) {
      label.style.cursor = 'pointer';
      label.addEventListener('click', function () {
        setMode(label.getAttribute('data-pb-label') === 'after', true);
      });
    });

    setMode(false, false);
  }

  /* ---- Page hints (WCAG links) ---------------------------------------- */

  var HINT_GRACE = 120; // ms to cross the gap between a hint's trigger and tooltip

  function initHints() {
    var hints = qa(document, '[data-pb-hint]');
    if (!hints.length) return;
    var delay = tokenMs('--_motion---delay--tooltip', 500);
    var warmDelay = tokenMs('--_motion---delay--tooltip-warm', 0);
    var showTimer = null;
    var hideTimer = null;
    var lastHide = 0;
    var current = null;

    function tipOf(t) { return q(t, '[data-pb-hint-tooltip]'); }

    function hide(t) {
      var tip = tipOf(t);
      if (tip && tip.classList.contains('is-visible')) {
        tip.classList.remove('is-visible');
        lastHide = Date.now();
      }
      if (current === t) current = null;
    }

    function show(t) {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      if (current === t) return;
      var warm = current !== null || Date.now() - lastHide < TIP_WARM;
      if (current) hide(current);
      var tip = tipOf(t);
      if (!tip) return;
      current = t;
      tip.classList.toggle('is-instant', warm);
      showTimer = setTimeout(function () {
        if (current === t) tip.classList.add('is-visible');
      }, warm ? warmDelay : delay);
    }

    function leave(t, grace) {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      if (grace) hideTimer = setTimeout(function () { hide(t); }, HINT_GRACE);
      else hide(t);
    }

    hints.forEach(function (t) {
      t.addEventListener('pointerenter', function () { show(t); });
      t.addEventListener('pointerleave', function () { leave(t, true); });
      t.addEventListener('focus', function () { show(t); });
      t.addEventListener('blur', function () { leave(t, false); });
      t.addEventListener('click', function () { leave(t, false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) leave(current, false);
    });
  }

  function boot() {
    qa(document, '[data-pb]').forEach(init);
    initHints();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
