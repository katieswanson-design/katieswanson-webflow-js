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
| `src/text-cycle.js` | Cycles a list of words through an element, blurring out and back in between each. Requires GSAP 3 core. | `/new-home` hero |

## Adding a script to a Webflow page

Webflow's Data API **rejects raw `<script>` tags** in page/site custom code with
an HTTP 406. Scripts have to go through *registered scripts*, which require an
SRI integrity hash. jsDelivr warns against SRI on its generated `.min.js`, so we
serve the plain `.js` — immutable at a pinned tag, so the hash is stable forever.
Gzipped the size difference is negligible.

Never use `@main` in a URL: jsDelivr caches it for 12 hours and you will think a
change didn't deploy.

Currently registered on the site:

| Script | Version | Applied to |
|---|---|---|
| `work strip marquee` | 1.0.0 | `/new-home`, footer |
| `GSAP core` | 3.15.0 | `/new-home`, footer (must load first) |
| `text cycle` | 1.0.0 | `/new-home`, footer |

## Releasing a change

Edit the file in `src/`, then:

```bash
./release.sh "slow the idle drift"
```

That commits, bumps the patch tag, pushes, waits for jsDelivr, verifies the CDN
is serving exactly what you committed, and prints the new URL and SRI hash.

Then update the registered script in Webflow with both the new `hosted_location`
and the new `integrity_hash` — **both**, together. Updating the URL without the
hash breaks the script silently: the browser blocks it on an integrity mismatch
and the strip just doesn't run.

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

Set as attributes on the `[data-work-strip]` element — no code change, just a
republish. **All nine are already present on `/new-home` at the values below**,
so they show up in the Designer's Settings panel ready to edit; you shouldn't
need to add a row by hand. The JS carries the same numbers as fallbacks, so
removing a row changes nothing.

| Attribute | Default | Effect | Try |
|---|---|---|---|
| `data-auto-speed` | `-0.5` | Idle drift in px/frame. Negative drifts left, positive right. | `-0.3` calmer, `-1` livelier |
| `data-magnify-radius` | `300` | Distance from the cursor, in px, where cards start growing. | `200` tighter, `450` broader |
| `data-magnify-boost` | `0.25` | Fractional width increase at the cursor centre. `0.25` = +25%. | `0.15` subtle, `0.4` dramatic |
| `data-height-boost` | `0.22` | Fractional height increase at the centre. | Keep just under the width value |
| `data-info-radius` | `100` | Distance within which the name/meta fade in. | Raise if labels feel reluctant |
| `data-wheel-scope` | `strip` | `strip` hijacks the wheel only over the strip; `section` hijacks the whole parent section. | `section` matches the reference |
| `data-intro-impulse` | `-500` | One-off velocity kick on load. | `0` disables the intro |
| `data-intro-delay` | `0.4` | Seconds before the kick fires. | Match your preloader if you add one |
| `data-intro-fade` | `0.7` | Seconds the strip takes to fade in over the kick. | Higher hides more of the launch |

#### Gotchas when editing them

These are **strings in Webflow but numbers in JS**, and the parse falls back to
the default on anything it can't read:

- Write bare numbers. `0.5s`, `500ms` and `25%` all silently revert to the
  default rather than erroring.
- Blanking a value is not the same as deleting the row — an empty string also
  falls back to the default. That makes it a confusing way to "turn something
  off": for the intro, `data-intro-impulse="0"` is the real off switch.
- `data-wheel-scope` is the one string value. Anything other than the exact word
  `section` is treated as `strip`.
- Values are read once at init. Changing an attribute needs a republish, not
  just a save.

The intro kick is a single velocity impulse, not a timeline — the same blend
that returns the strip to idle drift decays it, so it whips out and glides to a
stop over roughly 1.5s. It's skipped if the visitor already grabbed the strip.

**Why the fade matters.** The reference site fires its impulse 1.5s in but keeps
its preloader up until 2.3s, so the fastest 0.8s happens behind an opaque
overlay — by the reveal, velocity has decayed from -500 to about -42. You only
ever see the tail settling, which is what makes it feel arrived-at rather than
jerky. With no preloader we get the same read by hiding the strip and fading it
in while the peak burns off. Raising `data-intro-fade` hides more of the launch;
lowering it shows more.

The strip is hidden by JavaScript, never CSS, so a failed script load leaves it
visible rather than blank. A setTimeout also force-reveals it if the intro never
runs.

`window.workStripImpulse(v)` is exposed for firing it yourself. To drive it from
a preloader, set `data-intro-impulse="0"` to suppress the automatic kick and
call `window.workStripImpulse(-500)` when the preloader finishes.

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

## text-cycle

Swaps a word for the next one on a timer, blurring out and back in. Used in the
`/new-home` hero for the role line under the name.

### Markup contract

```
<div data-text-cycle>design system practitioner</div>
```

Whatever text is in the element renders before the first swap and is what shows
if the script never runs — so put a real word there, not a placeholder.

### Words

The built-in list lives in `ROLES` at the top of `src/text-cycle.js`. To override
per element without a code release, put a comma-separated list in the attribute
itself:

```
<div data-text-cycle="product designer, design engineer, ai nerd">
```

An attribute with fewer than two words is ignored and the element is left alone.

### Tunables

| Attribute | Default | Effect |
|---|---|---|
| `data-cycle-interval` | `2` | Seconds each word is held |
| `data-cycle-out` | `0.2` | Seconds to blur out |
| `data-cycle-in` | `0.4` | Seconds to blur back in |
| `data-cycle-blur` | `8` | Pixels of blur at the midpoint |

The same parsing rules as work-strip apply: bare numbers only, and an
unparseable or empty value silently falls back to the default.

### Notes

- **Cycling is suppressed entirely under `prefers-reduced-motion: reduce`.**
  Text that rewrites itself every two seconds is squarely what that setting is
  asking us not to do; the element keeps whatever word it starts on.
- It **pauses while the tab is hidden**. `setInterval` keeps firing in a
  background tab without painting, so you'd otherwise come back to a word
  mid-blur several steps along.
- It initialises **every** `[data-text-cycle]` on the page, each with its own
  words and timings, not just the first one.

## Credit

The magnify-marquee technique is adapted from
[gallery-studio.webflow.io](https://gallery-studio.webflow.io) by Lucas Gusso.
