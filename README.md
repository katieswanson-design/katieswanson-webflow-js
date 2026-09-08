# katieswanson-webflow-js

Custom JavaScript for [katieswanson.design](https://katieswanson.design), served
to Webflow over the jsDelivr CDN.

Files live in `src/`. jsDelivr serves them straight from a git tag — there is no
build step. Asking for `.min.js` instead of `.js` makes jsDelivr minify on the
fly, so the source stays readable here and ships small.

## Scripts

| File | What it does | Where it's used |
|---|---|---|
| `src/work-strip.js` | Infinite drag/scroll marquee with cursor-proximity card magnification, image parallax, and proximity labels. Requires GSAP 3 core. | `/new-home` |

## Adding a script to a Webflow page

Paste into **Page settings → Before `</body>`** (or Site settings for
sitewide). Pin the tag — never use `@main`, which jsDelivr caches for 12 hours
and will make you think a change didn't deploy.

```html
<script src="https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/katieswanson-design/katieswanson-webflow-js@v1.0.0/src/work-strip.min.js"></script>
```

## Releasing a change

Edit the file in `src/`, then:

```bash
./release.sh
```

That commits, bumps the patch tag, pushes, and prints the new CDN URLs to paste
into Webflow. Pass a message to set the commit text:

```bash
./release.sh "slow the idle drift"
```

A tagged URL is cached permanently by jsDelivr, which is exactly what you want
in production — the trade is that every change needs a new tag and a URL swap in
Webflow.

## work-strip

### Markup contract

The script queries these exact names, so they have to match in the Designer:

```
div[data-work-strip].work-strip          ← the custom attribute is required
└ div.work-strip_track                    ← the flex row that gets translated
  └ a.work-strip_item                     ← link block, one per project
    ├ div.work-strip_info                 ← hidden until the cursor is near
    │ ├ div.work-strip_info-name
    │ └ div.work-strip_info-meta
    └ div.work-strip_card
      └ div.work-strip_image-wrapper
        └ img.work-strip_image
```

### Tunables

Set as attributes on the `[data-work-strip]` element — no code change needed.

| Attribute | Default | Effect |
|---|---|---|
| `data-auto-speed` | `-0.5` | Idle drift in px/frame. Negative drifts left. |
| `data-magnify-radius` | `300` | Distance from the cursor, in px, where cards start growing. |
| `data-magnify-boost` | `0.25` | Fractional width increase at the cursor centre. `0.25` = +25%. |
| `data-height-boost` | `0.22` | Fractional height increase at the centre. |
| `data-info-radius` | `100` | Distance within which the name/meta fade in. |
| `data-wheel-scope` | `strip` | `strip` hijacks the wheel only over the strip; `section` hijacks the whole parent section. |

### Things that will bite you

- **`.work-strip_info` must be `pointer-events: none`** or the drag stutters
  whenever the cursor crosses a label.
- **The strip needs `overflow: clip visible`.** Plain `hidden` clips the
  magnified cards; `visible` gives you a horizontal scrollbar.
- **Cards are cloned with `cloneNode(true)`.** Any Webflow interaction bound to
  the original items won't exist on the clones — keep hover states in CSS or in
  this script.
- The script animates card **width and height**, not `scale`. That's deliberate:
  it makes neighbouring cards get pushed along instead of overlapping.
- Clones are marked `aria-hidden` and `tabindex="-1"` so keyboard and screen
  reader users only meet each project once.
- The whole thing no-ops under `prefers-reduced-motion: reduce`.

## Credit

The magnify-marquee technique is adapted from
[gallery-studio.webflow.io](https://gallery-studio.webflow.io) by Lucas Gusso.
