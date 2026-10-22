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
 *   [data-pb-autoclose="2000"] on the panel  optional; closes itself after that
 *                                             many ms. A panel with role="status"
 *                                             is a toast, so its trigger gets no
 *                                             aria-expanded
 *   [data-pb-focus-manage] on the component  focus management example: in the
 *                                             before state focus stays put and is
 *                                             not returned; in the after state it
 *                                             moves in, Tab is trapped in the panel
 *                                             and the panel's siblings are inert
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
 * Announce ("Announce async updates"), data-pb="announce", no switch
 *   button[data-pb-announce="Link copied"]    copies the example's link
 *     [data-pb-speak]                         optional; also speaks the message
 *                                             aloud with the Web Speech API
 *     [data-pb-swap-target]                   icons, get .is-after (always crossfade)
 *                                             and .is-swapped while copied
 *   [data-pb-live]                            role="status" tooltip, rendered but
 *                                             empty until a copy; gets the message
 *                                             and .is-visible, so the same text is
 *                                             seen and announced. Clears after
 *                                             ANNOUNCE_HOLD, or on Escape.
 *
 * Loading ("Keep the label while loading")
 *   button[data-pb-load="80"]                 fakes a reply after that many ms;
 *                                             gets .is-loading and aria-busy
 *     [data-pb-load-part]                     label and spinner slot, also get
 *                                             .is-loading
 *   Before: the indicator shows at once and replaces the label. After: it waits
 *   LOAD_SHOW_DELAY, then stays at least LOAD_MIN_VISIBLE, beside the label.
 *
 * Submenu ("Forgiving submenus")
 *   button[data-pb-menu-item]                 gets .is-active; with aria-controls
 *                                             it owns a submenu and gets
 *                                             aria-expanded
 *   [data-pb-submenu]                         gets .is-open
 *   polygon[data-pb-cone]                     optional; draws the safe triangle
 *   Before: hovering an item switches at once. After: while the pointer heads
 *   for the open submenu, other items wait AIM_GRACE before taking over.
 *   ArrowRight opens and enters a submenu, ArrowLeft and Escape come back.
 *
 * Reorder ("Gestures have alternatives")
 *   [data-pb-reorder]                         the list; gets .is-dragging
 *     [data-pb-row="Name"]                    a row; gets .is-dragging
 *       [data-pb-handle]                      drag handle, works in both states
 *       button[data-pb-move="up" | "down"]    the alternative, after state only
 *   [data-pb-reorder-status]                  role="status"; announces moves
 *
 * Reduced motion ("Respect people's reduced motion setting"), on the component:
 *   data-pb-follows="reduced-motion"
 *   The switch starts in the after state when the OS asks for reduced motion,
 *   and the component gets data-motion="default" | "reduce" for the CSS in
 *   guideline-demo.css to key off. A mode change leaves open panels as they
 *   are, so the next open or close picks up the new motion without a jump.
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
 *   [data-pb-hint][data-pb-hint-overflow]     optional; only shows its hint
 *                                             while the trigger's first child
 *                                             is clipped (a clamped title)
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
  var ANNOUNCE_HOLD = 2000; // ms the "Link copied" status stays up
  var LOAD_SHOW_DELAY = 200; // ms before a loading indicator appears at all
  var LOAD_MIN_VISIBLE = 400; // ms an indicator stays once it has appeared
  var AIM_GRACE = 300; // ms a submenu waits for the pointer to arrive

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
    // Focus management example: in the before state nothing moves focus.
    var manage = root.hasAttribute('data-pb-focus-manage');
    // A toast is a status message, not something its button expands.
    var isStatus = panels[0].getAttribute('role') === 'status';
    var autoclose = parseInt(panels[0].getAttribute('data-pb-autoclose'), 10) || 0;
    var autoTimer = null;
    var managed = function () { return !manage || isAfter(); };

    // Everything beside the panel goes inert while a managed dialog is open,
    // so a click or a screen reader cannot reach the page behind it.
    function setInert(on) {
      if (!manage) return;
      panels.forEach(function (panel) {
        qa(panel.parentElement, ':scope > *').forEach(function (el) {
          if (el === panel) return;
          if (on) el.setAttribute('inert', '');
          else el.removeAttribute('inert');
        });
      });
    }

    // A panel that fades in is still visibility: hidden on the frame it opens,
    // and a hidden element refuses focus. Try again for a few frames.
    function focusWhenReady(el) {
      var tries = 0;
      (function attempt() {
        el.focus();
        if (document.activeElement !== el && open && tries++ < 20) requestAnimationFrame(attempt);
      })();
    }

    function focusables(el) {
      return qa(el, 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
        .filter(function (f) { return f.getClientRects().length; });
    }

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
        if (!isStatus) t.setAttribute('aria-expanded', String(on));
        t.classList.toggle('is-open', on);
      });
      clearTimeout(autoTimer);
      if (open && autoclose) autoTimer = setTimeout(function () { set(false, false); }, autoclose);
      setInert(open && manage && isAfter());
      if (open) {
        var focusIn = q(root, '[data-pb-panel] [data-pb-close], [data-pb-panel] [data-pb-focus]');
        if (focusIn && managed()) focusWhenReady(focusIn);
      } else if (returnFocus && lastTrigger && managed()) {
        lastTrigger.focus();
      }
      onChange();
    }

    triggers.forEach(function (t) {
      if (!isStatus) t.setAttribute('aria-expanded', 'false');
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
    // Managed dialogs keep Tab and Shift+Tab inside the panel.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !open || !manage || !isAfter()) return;
      var f = focusables(panels[0]);
      if (!f.length) return;
      // Move focus ourselves on every Tab. Safari leaves buttons out of the
      // Tab order by default, so relying on the browser lets focus escape.
      e.preventDefault();
      var i = f.indexOf(document.activeElement);
      var next = i === -1 ? (e.shiftKey ? f.length - 1 : 0)
        : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
      f[next].focus();
    });
    document.addEventListener('click', function (e) {
      if (open && !root.contains(e.target)) set(false, false);
    });
    window.addEventListener('resize', function () {
      if (open) panels.forEach(place);
    });

    return function reset() {
      closeTimers.forEach(clearTimeout);
      clearTimeout(autoTimer);
      setInert(false);
      panels.forEach(function (el) {
        if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
        el.classList.remove('is-open', 'is-closing');
      });
      triggers.forEach(function (t) {
        if (!isStatus) t.setAttribute('aria-expanded', 'false');
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

  /* ---- Announce ("Announce async updates") --------------------------- */

  function initAnnounce(root) {
    var btn = q(root, '[data-pb-announce]');
    var live = q(root, '[data-pb-live]');
    if (!btn || !live) return;
    var icons = qa(root, '[data-pb-swap-target]');
    var timers = [];

    // No switch here: the icons always use the crossfade from "Animate icon
    // state changes smoothly".
    icons.forEach(function (el) { el.classList.add('is-after'); });

    function clear() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    // So people without a screen reader hear what one would say. Opt-in per
    // button; a screen reader user will hear the message twice.
    function speak(text) {
      if (!btn.hasAttribute('data-pb-speak') || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || 'en';
      window.speechSynthesis.speak(utterance);
    }

    function hide() {
      clear();
      icons.forEach(function (el) { el.classList.remove('is-swapped'); });
      live.classList.remove('is-visible');
      // Empty the region once the tooltip has faded, so the next copy is a
      // fresh change that screen readers announce again.
      timers.push(setTimeout(function () { live.textContent = ''; }, tokenMs('--_motion---duration--xs', 150)));
    }

    btn.addEventListener('click', function () {
      clear();
      var link = location.href.split('#')[0] + (root.id ? '#' + root.id : '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).catch(function () {});
      }
      icons.forEach(function (el) { el.classList.add('is-swapped'); });
      live.textContent = '';
      // A change to an existing live region is what gets announced, so the
      // message goes in a beat after the region is emptied.
      var message = btn.getAttribute('data-pb-announce');
      timers.push(setTimeout(function () {
        live.textContent = message;
        live.classList.add('is-visible');
      }, 50));
      speak(message);
      timers.push(setTimeout(hide, ANNOUNCE_HOLD));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && live.classList.contains('is-visible')) hide();
    });
  }

  /* ---- Loading ("Keep the label while loading") ---------------------- */

  function initLoading(root, isAfter) {
    var buttons = qa(root, '[data-pb-load]');
    if (!buttons.length) return null;
    var timers = [];

    // The button and the parts inside it all carry the state, because the
    // Designer can only style an element by its own classes.
    function parts(btn) { return [btn].concat(qa(btn, '[data-pb-load-part]')); }
    function show(btn, on) {
      parts(btn).forEach(function (el) { el.classList.toggle('is-loading', on); });
      btn.setAttribute('aria-busy', String(on));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-busy') === 'true' || btn.hasAttribute('data-pb-pending')) return;
        var response = parseInt(btn.getAttribute('data-pb-load'), 10) || 1000;
        if (!isAfter()) {
          // Before: the spinner replaces the label at once, however fast the reply.
          show(btn, true);
          timers.push(setTimeout(function () { show(btn, false); }, response));
          return;
        }
        // After: wait before showing anything, then keep it up long enough to read.
        btn.setAttribute('data-pb-pending', '');
        var shownAt = 0;
        var showTimer = setTimeout(function () {
          shownAt = Date.now();
          show(btn, true);
        }, LOAD_SHOW_DELAY);
        timers.push(showTimer);
        timers.push(setTimeout(function () {
          clearTimeout(showTimer);
          var wait = shownAt ? Math.max(0, LOAD_MIN_VISIBLE - (Date.now() - shownAt)) : 0;
          timers.push(setTimeout(function () {
            show(btn, false);
            btn.removeAttribute('data-pb-pending');
          }, wait));
        }, response));
      });
    });

    return function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      buttons.forEach(function (btn) { show(btn, false); btn.removeAttribute('data-pb-pending'); });
    };
  }

  /* ---- Submenu ("Forgiving submenus") -------------------------------- */

  function initSubmenu(root, isAfter) {
    var items = qa(root, '[data-pb-menu-item]');
    if (!items.length) return null;
    var cone = q(root, '[data-pb-cone]');
    var active = null;
    var pending = null;
    var last = null; // pointer position before the current one

    function subOf(item) {
      var id = item.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    }

    function activate(item) {
      clearTimeout(pending);
      if (active === item) return;
      items.forEach(function (i) {
        var on = i === item;
        i.classList.toggle('is-active', on);
        var sub = subOf(i);
        if (sub) {
          sub.classList.toggle('is-open', on);
          i.setAttribute('aria-expanded', String(on));
        }
      });
      active = item;
      drawCone(null);
    }

    // The safe triangle: from where the pointer was to the two near corners
    // of the open submenu.
    function inCone(p, a, b, c) {
      function side(p1, p2, p3) { return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y); }
      var d1 = side(p, a, b), d2 = side(p, b, c), d3 = side(p, c, a);
      var neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(neg && pos);
    }

    function coneFor(sub) {
      var r = sub.getBoundingClientRect();
      return [last, { x: r.left, y: r.top }, { x: r.left, y: r.bottom }];
    }

    function drawCone(points) {
      if (!cone) return;
      if (!points || !isAfter()) { cone.setAttribute('points', ''); return; }
      var box = cone.ownerSVGElement.getBoundingClientRect();
      cone.setAttribute('points', points.map(function (pt) {
        return (pt.x - box.left) + ',' + (pt.y - box.top);
      }).join(' '));
    }

    root.addEventListener('pointermove', function (e) {
      var now = { x: e.clientX, y: e.clientY };
      var sub = active && subOf(active);
      if (sub && last && isAfter()) drawCone(coneFor(sub));
      last = now;
    });

    items.forEach(function (item) {
      item.addEventListener('pointerenter', function (e) {
        var sub = active && subOf(active);
        var here = { x: e.clientX, y: e.clientY };
        // After: heading for the open submenu, so give the pointer time to
        // arrive before switching items.
        if (isAfter() && sub && sub.classList.contains('is-open') && last && inCone.apply(null, [here].concat(coneFor(sub)))) {
          clearTimeout(pending);
          pending = setTimeout(function () { activate(item); }, AIM_GRACE);
          return;
        }
        activate(item);
      });
      item.addEventListener('click', function () { activate(item); });
      item.addEventListener('keydown', function (e) {
        var sub = subOf(item);
        if (e.key === 'ArrowRight' && sub) {
          e.preventDefault();
          activate(item);
          var first = q(sub, 'button');
          if (first) first.focus();
        }
      });
    });

    // Entering the submenu cancels any pending switch.
    qa(root, '[data-pb-submenu]').forEach(function (sub) {
      sub.addEventListener('pointerenter', function () { clearTimeout(pending); });
      sub.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'Escape') return;
        e.preventDefault();
        var owner = items.filter(function (i) { return subOf(i) === sub; })[0];
        if (owner) owner.focus();
      });
    });

    return function reset() {
      clearTimeout(pending);
      active = null;
      activate(items[0]);
    };
  }

  /* ---- Reorder ("Gestures have alternatives") ------------------------ */

  function initReorder(root, isAfter) {
    var list = q(root, '[data-pb-reorder]');
    if (!list) return null;
    var live = q(root, '[data-pb-reorder-status]');
    var dragging = null;

    function rows() { return qa(list, '[data-pb-row]'); }
    function name(row) { return row.getAttribute('data-pb-row'); }

    function announce(row) {
      if (!live) return;
      var i = rows().indexOf(row);
      live.textContent = name(row) + ', position ' + (i + 1) + ' of ' + rows().length;
    }

    function move(row, d) {
      var all = rows();
      var i = all.indexOf(row);
      var j = i + d;
      if (j < 0 || j >= all.length) return;
      if (d < 0) list.insertBefore(row, all[j]);
      else list.insertBefore(row, all[j].nextSibling);
      announce(row);
    }

    // Move buttons: the alternative to dragging. Focus stays on the button
    // that was pressed so it can be pressed again.
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pb-move]');
      if (!b || !isAfter()) return;
      var row = b.closest('[data-pb-row]');
      move(row, b.getAttribute('data-pb-move') === 'up' ? -1 : 1);
      b.focus();
    });

    // Drag by the handle in both states. Selection is off and the other rows
    // are inert while dragging, so nothing highlights or hovers underneath.
    list.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest('[data-pb-handle]');
      if (!handle) return;
      e.preventDefault();
      dragging = handle.closest('[data-pb-row]');
      dragging.classList.add('is-dragging');
      list.classList.add('is-dragging');
      rows().forEach(function (r) { if (r !== dragging) r.setAttribute('inert', ''); });
      handle.setPointerCapture(e.pointerId);
    });
    list.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var over = rows().filter(function (r) {
        var rect = r.getBoundingClientRect();
        return r !== dragging && e.clientY > rect.top && e.clientY < rect.bottom;
      })[0];
      if (!over) return;
      var rect = over.getBoundingClientRect();
      var below = e.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, below ? over.nextSibling : over);
    });
    function drop() {
      if (!dragging) return;
      dragging.classList.remove('is-dragging');
      list.classList.remove('is-dragging');
      rows().forEach(function (r) { r.removeAttribute('inert'); });
      announce(dragging);
      dragging = null;
    }
    list.addEventListener('pointerup', drop);
    list.addEventListener('pointercancel', drop);

    var original = rows();
    return function reset() {
      drop();
      original.forEach(function (r) { list.appendChild(r); });
      if (live) live.textContent = '';
    };
  }

  /* ---- Example ------------------------------------------------------- */

  function init(root) {
    var after = false;
    var sw = q(root, '[data-pb-switch]');
    var isAfter = function () { return after; };
    var followsMotion = root.getAttribute('data-pb-follows') === 'reduced-motion';
    var onChange = initSlow(root);
    var resets = [];
    var replay = initReplay(root, onChange);

    [
      initOpen(root, isAfter, onChange),
      initSwap(root, onChange),
      initTips(root, isAfter),
      root.getAttribute('data-pb') === 'confirm' ? initConfirm(root, isAfter) : null,
      initLoading(root, isAfter),
      initSubmenu(root, isAfter),
      initReorder(root, isAfter)
    ].forEach(function (r) { if (r) resets.push(r); });
    initTabs(root);
    if (root.getAttribute('data-pb') === 'announce') initAnnounce(root);

    function setMode(a, user) {
      after = a;
      root.setAttribute('data-pb-mode', a ? 'after' : 'before');
      if (followsMotion) root.setAttribute('data-motion', a ? 'reduce' : 'default');
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
      if (!followsMotion) resets.forEach(function (r) { r(); });
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

    setMode(followsMotion && reducedMotion(), false);
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

    // An overflow hint only earns its place when the text is actually cut off.
    function clipped(t) {
      var el = q(t, ':scope > :not([data-pb-hint-tooltip])');
      return !!el && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    }

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
      if (t.hasAttribute('data-pb-hint-overflow') && !clipped(t)) return;
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
