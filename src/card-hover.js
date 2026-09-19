/**
 * card-hover.js — directional hover fill for the content card on /bookmarks.
 *
 * Adapted from Osmo Supply's "Directional Button Hover" (Katie is a member).
 * Kept: the circle grows from the point where the cursor entered and shrinks
 * back toward the point where it left, on mouseenter and mouseleave, with the
 * transition in CSS. Changed, and why:
 *   - Position is measured against .content-card-base, not the whole link. The
 *     link also holds the title row, so Osmo's link-relative percentages would
 *     put the origin in the wrong place. The point is clamped to the base, so
 *     entering over the title grows the fill from the base's bottom edge.
 *   - The circle is sized to reach the farthest corner from that point. Osmo's
 *     115–215% of width suits a wide, short button; on a square card it leaves
 *     the far corner uncovered when you enter at a corner.
 *   - Keyboard focus has no cursor, so focus re-centres the circle.
 *   - Its own data-card-hover hook, so it can't collide with Osmo's
 *     data-btn-hover if those buttons are ever used on the site.
 *
 * Markup contract (Designer, in the "content card" component):
 *
 *   <a class="content-card" data-card-hover>
 *     …
 *     <div class="content-card-base">
 *       <div class="content-card-fill-wrap" aria-hidden="true">
 *         <div class="content-card-fill"></div>
 *       </div>
 *       <div class="content-card-thumb">…</div>
 *     </div>
 *   </a>
 *
 * The rest and hover states (scale 0 → 1, 0.7s curve, colour token) live in
 * the Designer and bookmarks.css; this file only moves the origin and sets the
 * size. Reduced motion is handled in CSS (no transition), so nothing here.
 */
(function () {
  function place(card, clientX, clientY) {
    const base = card.querySelector(".content-card-base");
    const fill = card.querySelector(".content-card-fill");
    if (!base || !fill) return;
    const r = base.getBoundingClientRect();
    if (!r.width || !r.height) return;

    // Point inside the base, clamped to its edges.
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);

    // Diameter that reaches the farthest corner, as % of the base width
    // (the fill's width is a percentage of the wrap, which matches the base).
    const reach = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
    const diameter = ((reach * 2) / r.width) * 100 + 2;

    fill.style.left = ((x / r.width) * 100).toFixed(1) + "%";
    fill.style.top = ((y / r.height) * 100).toFixed(1) + "%";
    fill.style.width = diameter.toFixed(1) + "%";
  }

  function onPointer(event) {
    place(event.currentTarget, event.clientX, event.clientY);
  }

  function onFocus(event) {
    const card = event.currentTarget;
    const r = card.querySelector(".content-card-base")?.getBoundingClientRect();
    if (r) place(card, r.left + r.width / 2, r.top + r.height / 2);
  }

  function init() {
    document.querySelectorAll("[data-card-hover]").forEach(function (card) {
      card.addEventListener("mouseenter", onPointer);
      card.addEventListener("mouseleave", onPointer);
      card.addEventListener("focus", onFocus);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
