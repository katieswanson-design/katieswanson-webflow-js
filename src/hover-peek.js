/**
 * hover-peek.js — cursor-following image preview for a list of links.
 *
 * Writes --px / --py / --tilt on the peek container and toggles two state
 * classes. All the actual motion is CSS (src/hover-peek.css), so the global
 * reduced-motion guard in reset.css can reach it.
 *
 * Markup contract:
 *   .article-list[data-hover-peek]
 *   ├ .article-list_peek
 *   │ └ img.article-list_peek-image ×N      ← order matches data-peek index
 *   └ ul > li.article-list_row[data-peek="N"]
 *
 * Keyboard users get the preview too: focusing a row pins the box beside that
 * row. The image is decorative (the container is aria-hidden), so this adds
 * nothing to the accessible name — it just stops keyboard navigation from
 * being a visually degraded experience.
 *
 * Tunables, as attributes on [data-hover-peek]:
 *   data-peek-tilt   max rotation in degrees, from pointer velocity (default 6)
 *   data-peek-ease   0-1, how much of the gap to the cursor is closed per
 *                    frame; lower trails further behind (default 0.16)
 */

(function () {
  var roots = document.querySelectorAll("[data-hover-peek]");
  if (!roots.length) return;

  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function num(el, name, fallback) {
    var raw = parseFloat(el.getAttribute(name));
    return isNaN(raw) ? fallback : raw;
  }

  Array.prototype.forEach.call(roots, function (root) {
    var peek = root.querySelector(".article-list_peek");
    var rows = root.querySelectorAll("[data-peek]");
    if (!peek || !rows.length) return;

    var imgs = peek.querySelectorAll("img");
    var MAX_TILT = num(root, "data-peek-tilt", 6);
    var EASE = num(root, "data-peek-ease", 0.16);

    var targetX = 0, targetY = 0;   // where the pointer is
    var x = 0, y = 0;               // where the box currently is
    var lastX = 0;
    var active = -1;
    var raf = null;
    var running = false;

    function setIndex(i) {
      if (i === active) return;
      active = i;
      for (var n = 0; n < imgs.length; n++) {
        if (n === i) imgs[n].classList.add("is-active");
        else imgs[n].classList.remove("is-active");
      }
    }

    function place(px, py, tilt) {
      peek.style.setProperty("--px", px + "px");
      peek.style.setProperty("--py", py + "px");
      peek.style.setProperty("--tilt", tilt + "deg");
    }

    function frame() {
      raf = null;
      // Trail the cursor rather than pinning to it — the lag is what makes the
      // box feel like an object being dragged instead of a tooltip.
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;

      var dx = x - lastX;
      lastX = x;
      var tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, dx * 0.6));

      place(x, y, tilt);

      // Keep going only while there is still distance to close.
      if (running && (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5)) {
        raf = window.requestAnimationFrame(frame);
      }
    }

    function tick() {
      if (raf === null) raf = window.requestAnimationFrame(frame);
    }

    function show() {
      running = true;
      root.classList.add("is-peeking");
    }

    function hide() {
      running = false;
      root.classList.remove("is-peeking");
      setIndex(-1);
    }

    // ---- pointer -------------------------------------------------------
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !fine.matches || reduce.matches) return;
      var rect = root.getBoundingClientRect();
      targetX = clampX(e.clientX - rect.left, rect.width);
      targetY = e.clientY - rect.top;
      tick();
    });

    // The box is centred on the cursor, so without this it hangs half its width
    // past the list near either edge. Overflowing right widens the document and
    // raises a horizontal scrollbar — from a decorative hover, which is not a
    // trade worth making. Clamping costs a little cursor fidelity at the edges.
    function clampX(px, width) {
      var half = peek.offsetWidth / 2;
      if (width <= peek.offsetWidth) return width / 2;
      return Math.max(half, Math.min(width - half, px));
    }

    root.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      hide();
    });

    Array.prototype.forEach.call(rows, function (row) {
      var index = parseInt(row.getAttribute("data-peek"), 10) || 0;

      row.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse" || !fine.matches) return;
        setIndex(index);
        if (reduce.matches) pinTo(row);
        show();
      });

      // ---- keyboard ----------------------------------------------------
      row.addEventListener("focusin", function () {
        setIndex(index);
        pinTo(row);
        show();
      });

      row.addEventListener("focusout", function (e) {
        if (root.contains(e.relatedTarget)) return;
        hide();
      });
    });

    // Park the box beside a row, for keyboard focus and for reduced motion,
    // where chasing the cursor is exactly the thing being opted out of.
    function pinTo(row) {
      var rootRect = root.getBoundingClientRect();
      var rowRect = row.getBoundingClientRect();
      targetX = clampX(rootRect.width - peek.offsetWidth / 2, rootRect.width);
      targetY = rowRect.top - rootRect.top + rowRect.height / 2;
      x = targetX;
      y = targetY;
      lastX = x;
      place(x, y, 0);
    }
  });
})();
