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
| `src/local-time.js` | Renders a clock for a fixed timezone, so the page shows Katie's local time rather than the visitor's. No dependencies. | `/new-home` hero |
| `src/copy-email.js` | Copies an email to the clipboard and flips the button into a copied state. No dependencies. | Site-wide |
| `src/copy-email.css` | Hover, focus and copied states for that button. | Site-wide |
| `src/expanding-panels.css` | Expand-on-hover/focus behaviour for the hero panel row. No JS. | `/new-home` hero |
| `src/site-nav.js` | Publishes the nav's measured height and toggles hide-on-scroll. No dependencies. | Site-wide |
| `src/site-nav.css` | Sticky behaviour and the hide transition for that nav. | Site-wide |
| `src/bunny-hls.js` | Bunny HLS background video player (Osmo resource). Requires `hls.js` first. | `/new-home` |
| `src/case-study.css` | One `max-width: 1200px` grid correction Webflow's breakpoints can't express. | Case study pages |
| `src/bunny-bg.css` | Status styling for the Bunny HLS background video player. Structural styles stay in the Designer. | Site-wide |
| `src/reset.css` | Global reset, base styles and Client-First-style utilities. | Site-wide |

## Adding CSS to Webflow

Unlike scripts, **`<link>` tags are accepted in freeform custom code** — so a
stylesheet just goes into Site settings → Custom code → Head (or a page's head):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/katieswanson-design/katieswanson-webflow-js@v1.0.7/src/reset.css">
```

No registering, no integrity hash. The tag can be written through the Webflow
API, so a CSS release and its Webflow update can happen in one pass. Add `.min`
before `.css` to have jsDelivr minify on the fly.

Order matters: these load after Webflow's own stylesheet, so equal-specificity
rules win over Designer styles — and that override won't show on the Designer
canvas, only on the published site.

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
| `copy email` | 1.0.0 | Site-wide, footer |

## bunny-bg

State styling for the [Osmo Supply "Bunny HLS Background
Video"](https://www.osmo.supply/resource/bunny-hls-background-video) resource.
`src/bunny-bg.css` is the resource's *Webflow Custom CSS* block, migrated
verbatim from Slater `51417.css` on 2026-09-11.

Only the attribute-driven state rules live here. Everything structural is
authored as classes in the Designer and is deliberately **not** duplicated in
this repo — two sources of truth for the same box is how they drift.

### Markup contract

```
div.bunny-bg[data-bunny-background-init][data-player-src="…playlist.m3u8"]
├ video.bunny-bg__video
├ img.bunny-bg__placeholder                    ← poster, covers until playback
├ div.bunny-bg__playpause                      ← [data-player-control="playpause"]
│ └ div.bunny-bg__btn                            .bunny-bg__pause-svg + __play-svg
└ div.bunny-bg__loading
```

`data-player-status` is written by the player script and cycles
`idle → ready → loading → playing → paused`. `data-player-activated` flips to
`true` on first play and back to `false` on `ended`. Neither is ever set by
hand.

### Load order

`hls.js` **must load before** `src/bunny-hls.js`. Safari and iOS play HLS
natively, so on those the player works either way — which makes a missing or
mis-ordered `hls.js` look like a browser-specific bug rather than what it is.
Both are registered scripts in the footer; registered scripts run in the order
they are applied.

`src/bunny-hls.js` is Osmo's source form. The Slater build it replaces
(`51416.js`) was the same code minified, with no local modifications.

### Pause control — not required here

The player inside `.card-frame` on `/new-home` carries
`data-player-autoplay="true"` and has no `.bunny-bg__playpause` element, though
the `.bunny-bg__playpause` and `.bunny-bg__btn` classes are fully styled in the
Designer.

**This is deliberate and it is fine.** The video is decorative, and `.project`
carries a Webflow IX2 hover interaction that reveals it. Because the video is
not presented until the visitor hovers, it does not "start automatically" in
the sense [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
means, and moving the pointer away is itself the stop mechanism. No pause
control is owed.

Worth knowing about the mechanism, because it is not what it looks like: the
script has **no hover branch**. With `autoplay` set it plays through an
`IntersectionObserver` at 10% visibility and pauses when the player scrolls
out. The hover is IX2 revealing an element that is already playing underneath —
two independent systems that happen to compose into one effect. If the IX2
interaction is ever removed, the video becomes visible *and* autoplaying, and
2.2.2 applies again.

If a control is ever needed:

If a control is needed:

- **Make it a real `<button>`.** Osmo ships a `div`, which is unreachable by
  keyboard and unannounced by a screen reader. Its accessible name should flip
  between "pause background video" and "play background video" as
  `data-player-status` changes.
- **The loading spinner ignores reduced motion.** It animates through SVG SMIL
  (`<animateTransform repeatCount="indefinite">`), and the global guard in
  `reset.css` only reaches CSS animations and transitions — `animation-duration`
  has no effect on SMIL. Under `prefers-reduced-motion: reduce` the spinner
  should be swapped for a static indicator, and autoplay should not start on its
  own.

## Releasing a change

Edit the file in `src/`, then:

```bash
./release.sh "slow the idle drift"
```

That runs pre-flight checks, then commits, bumps the patch tag, pushes, waits
for jsDelivr, verifies the CDN is serving exactly what you committed, and prints
the new URL and SRI hash.

**Pre-flight aborts the release before anything is committed if:**

- any `src/*.js` or `src/*.css` contains a smart quote (`‘ ’ “ ”`). These are a
  `SyntaxError` in JS and silently wrong in CSS, and they arrive via
  Notion/Docs/Slack pastes rather than being typed.
- any `src/*.js` fails `node --check`.

A file that does not parse takes its whole feature down at runtime, and because
the script loads fine and only *throws*, the symptom is a dead component rather
than an obvious error.

### Editing: local vs GitHub web

Edit locally and run `./release.sh`. The release pipeline only exists locally, so
a web edit still forces a `git pull` before anything can ship. If you do edit on
github.com, pull before releasing — `release.sh` commits what is on disk, and an
un-pulled remote commit can be stranded.

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

### Direction: horizontal and vertical

**The axis is decided by CSS, not JS.** The script reads
`getComputedStyle(track).flexDirection` and follows it — `column` means
vertical, anything else horizontal. There is no breakpoint or direction setting
in the script to keep in sync.

The reference site hardcoded `matchMedia("(min-width: 992px)")` in JS next to a
`max-width: 991px` media query in CSS: two numbers that had to agree, with a
broken strip in the gap if they ever drifted. Reading the computed value removes
that class of bug, and means a Webflow variant, a media query, or a one-off
override can all flip the axis with no code change.

On resize the marquee tears down and rebuilds — clones removed, listeners
unbound, inline sizes cleared — so switching axis at a breakpoint is clean. The
intro impulse only ever plays on first load, never on a rebuild.

**In vertical mode only card height is magnified.** Cards are full-width inside a
fixed-width column, so width has nowhere to grow. `data-height-boost` is ignored
and `data-magnify-boost` drives height.

#### The Webflow component

`Work Strip` (group: Components) has two variants:

| Variant | Track | Strip | Card |
|---|---|---|---|
| **Horizontal** (base) | `row`, `align-items: flex-end` | `100%` wide, `55vh` tall, `-2.5rem` bottom bleed | `27vw × 50vh` |
| **Vertical** | `column`, `align-items: stretch` | fills its wrapper, no bleed | `100% × 46vh` |

Vertical fills whatever container it is placed in; the positioned wrapper
(`.hero-v2_strip-col` on `/new-home-v2`) sets the column geometry. That keeps
the variant portable rather than hardcoding one hero's proportions.

#### Label placement is coupled to the drift direction

The label should sit on the **leading edge** — the side of the card that enters
the viewport first — so it is readable while the image is still sliding in
rather than only once the card has fully arrived.

Which edge that is depends on the sign of `data-auto-speed`:

| `data-auto-speed` | Track moves | Cards enter from | Leading edge | Label goes |
|---|---|---|---|---|
| negative (default) | up | bottom | **top** of the card | above (DOM order, no `order`) |
| positive | down | top | **bottom** of the card | below (`order: 2`) |

The reference site puts its label below the card (`order: 2`) while drifting
negative, so its labels arrive last. We put ours above. **If you ever flip
`data-auto-speed` positive, flip the label back to `order: 2`** or it will lag
behind the image again.

The same logic applies horizontally, but the horizontal strip is much wider than
it is tall, so a card is on screen long enough that it matters far less.

Vertical flips back to a horizontal row at `medium` (≤991px), matching the
reference — the script rebuilds along the new axis automatically. The label also
moves below the card in vertical (`order: 2`) and back above at ≤991px.

Vertical sits in normal flow as a `28%`-wide column rather than being pinned.
The reference positioned theirs absolutely (`position: absolute; left: 15%`)
against a specific hero; add that on the instance if you want the same
composition, rather than baking it into the variant.

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

### Reduced motion

Under `prefers-reduced-motion: reduce` the strip builds a **variant** rather
than switching off:

| | Normal | Reduced |
|---|---|---|
| Auto-scroll | yes | **no** |
| Intro impulse + fade | yes | **no** |
| Proximity magnification | yes | **no** |
| Image parallax (and its 1.3 zoom) | yes | **no** |
| Drag, wheel, proximity labels | yes | **yes** |

It used to bail out of `init` entirely. That was worse, not safer: the track is
`overflow`-clipped, so every card past the fold became unreachable — the setting
cost you the content, not just the motion. Now nothing moves on its own and the
visitor pages through at their own speed, which is what
["provide a reduced-motion variant"](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
and "avoid autoplay" actually ask for.

`window.workStripImpulse()` is a no-op under the setting, so an external caller
can't restart the motion behind the visitor's back. The media query is watched
live — flipping the OS setting with the page open rebuilds the strip.

### Keyboard

The items are `a.work-strip_item`, so they are in the tab order already. Clones
are `aria-hidden="true"` and `tabindex="-1"`, so a project is announced once,
not once per copy.

The track moves by `transform`, not `scroll`, so the browser cannot bring a
focused card into view by itself — without help, tabbing past the fold focuses a
card clipped out of sight, which fails both
[2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
and [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).
So on `focusin` the script centres the focused item on the active axis and
**holds the auto-scroll still for as long as focus is inside the strip**.

It keys off `:focus-visible`, not `:focus` — a click focuses the link too, and
pointer users should never have the strip yanked at them.

**Still outstanding:** for visitors who are not on reduced motion and not using
a keyboard, the strip autoplays indefinitely with no pause control, which is
[2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
(Level A). Reduced motion does not discharge it. A hover- or delay-revealed
play/pause button is the intended fix.

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

## local-time

Writes a clock into an element for a **fixed** timezone, so visitors see Katie's
local time in Austin rather than their own. Used under the contact pill in the
`/new-home` hero.

### Markup contract

```
<div data-local-time data-timezone="America/Chicago">3:07 pm cdt</div>
```

Put a plausible time in the element rather than leaving it empty. It is what
renders if the script never runs, and it stops the line collapsing to zero
height on first paint.

Output is lowercased to match the site's all-lowercase brand treatment.

### Tunables

| Attribute | Default | Effect |
|---|---|---|
| `data-timezone` | `America/Chicago` | Any IANA zone name |
| `data-meridiem` | *(shown)* | Set to `false` to drop the `am`/`pm` |

### Notes

- **The zone abbreviation is derived, never hardcoded.** Austin reads `cdt`
  through daylight time and `cst` the rest of the year on its own. Writing a
  literal `cst` into the markup would be wrong for eight months of the year.
- It **updates on the minute boundary**, not on a fixed 60-second interval, so
  the displayed minute is never a second stale.
- It **repaints when the tab regains focus**. Background tabs throttle timers,
  so the clock can be minutes behind by the time someone switches back.
- An unusable `data-timezone` throws a `RangeError`; the script warns and leaves
  the markup's own text in place rather than replacing a sensible fallback with
  something broken.

## expanding-panels

A row of image panels that expand on hover or keyboard focus while the others
compress. Modelled on the BYQ Supply "Expanding Image Panels" gem, rebuilt rather
than ported.

**There is no JavaScript, deliberately.** The gem ships a script because it built
the panels as an ARIA `tablist`, and tabs require roving tabindex plus arrow-key
handling. A plain row of `<button>` elements needs none of that: Tab moves between
them natively, `:hover` and `:focus` do the reveal, and the global
`prefers-reduced-motion` guard in `reset.css` applies for free — which it could
not if the animation were GSAP-driven.

**They are `<button>`, not links or divs.** The badge names a skill, so that content
has to be reachable without a mouse. A div is not focusable and a phone has no
hover, which would have left seven of eight skills unreadable.

**Behaviour is split by input mode**, because the two want different triggers:

| | Pointer (`hover: hover`) | Touch (`hover: none`) |
|---|---|---|
| Opens a panel | `:hover`, `:focus-visible` | `:focus` |
| Mouse click | **nothing** — cannot pin one open | n/a |
| Rest state | `:not(:hover):not(:has(:focus-visible))` | `:not(:has(:focus))` |

A mouse click focuses a button, so keying off plain `:focus` on desktop left the
clicked panel open while the pointer moved on — two at once. `:focus-visible`
does not match a click, which is exactly the distinction needed. The row-level
`:not(:hover)` guard means hover always beats a lingering keyboard focus.

Uses `:has()` (Chrome 105+, Safari 15.4+, Firefox 121+).

### Markup contract

```
div.hero-skills
└ button.hero-skill_panel         ← one per skill
  ├ img.hero-skill_image
  └ div.hero-skill_caption
    └ div.hero-skill_title        ← rendered as a badge
```

Structural styles (flex basis, sizing, colour, type) live in the Webflow
Designer. This stylesheet holds only what the Designer cannot author: descendant
combinators and `:focus-visible`.

### How the rest state works

Which panel sits open at rest is set by an `nth-child` in the stylesheet — currently
the **third**:

```css
.hero-skills:not(:hover):not(:focus-within) .hero-skill_panel:nth-child(3) { flex-grow: 6; }
```

Change the index there to move it. Three rules use it (panel, image, caption), so
change all three together.

`:not(:hover):not(:focus-within)` *is* "nothing is being pointed at or tabbed
into". Expressing it that way avoids both the specificity fight you get from
overriding an `.is-active` class and the JavaScript that would otherwise have to
maintain that state.

### Tuning

`flex-grow` on the open panel sets how hard it dominates. With **n** panels the
open one takes `grow / (n - 1 + grow)` of the row:

| Panels | grow | Open | Each closed |
|---|---|---|---|
| 5 | 5.2 | 56% | 11% |
| 8 | 4 | 36% | 9.1% |
| **8** | **5** | **41.7%** | **8.3%** |
| 8 | 6 | 46.2% | 7.7% |
| 8 | 9 | 56.3% | 5.4% |

Below roughly 1280px the closed slivers get too narrow to read at eight panels —
that is the point to drop to five or six per breakpoint.

### It also positions `.hero-statement`

The stylesheet sets `left` on `.hero-statement` so its left edge lines up with
the panel that is open at rest. That edge is `padding + 2 slivers + 2 gaps`, and
the sliver width is flex-derived — so it cannot be a fixed percentage, and it
changes at every panel-count step.

```
left = P + 2g + 2 * (100% - 2P - (n-1)g) / (n - 1 + grow)
```

`100%` rather than `100vw` on purpose: percentages on `left` resolve against
`.hero`, which excludes the scrollbar. `100vw` includes it, so the statement
would drift by the scrollbar width whenever one is present.

**This is the one rule here that is not about the panels themselves**, and it is
coupled to them: change the gap, `flex-grow`, the panel counts or the
default-open index, and it has to change too. That coupling is why it lives here
rather than in the Designer next to the rest of `.hero-statement`.

### Things to watch

- **This transitions `flex-grow`, which is a layout property.** That is the
  technique, but it is also what the house guidelines warn about under "never
  transition all". At eight panels it is fine; at thirty it would not be.
- The focus outline is **inset** (`outline-offset: -2px`). The panel is
  `overflow: hidden`, so a positive offset gets clipped and leaves no visible
  ring at all.

## site-nav

A sticky site nav that hides when you scroll down and comes back when you scroll
up. Extracted from what was `.hero_top`.

### Markup contract

```
<div data-site-nav class="site-nav">      ← must be a child of <body>
  ├ div.site-nav_bio                       logo lockup, role cycle
  └ div.site-nav_contact                   contact pill + time/location
```

**It has to be a child of `<body>`, not of `.hero`.** `.hero` sets
`overflow: hidden`, which makes it the sticky containing block — the nav would
stick only while the hero is on screen and then scroll away with it.

### Tunables

| Attribute | Default | Effect |
|---|---|---|
| `data-nav-hide-after` | `120` | px of scroll before hiding is allowed |
| `data-nav-threshold` | `6` | px of movement before it reacts |

### How it is split

The script only toggles `[data-nav-hidden]` and publishes `--site-nav-height`.
Every bit of movement is a CSS transition in `site-nav.css`.

That split is the point: because the motion is CSS, the global
`prefers-reduced-motion` guard in `reset.css` reaches it. Animating from
JavaScript — as the common recipe does — puts it beyond that guard's reach, the
same way GSAP is.

### Notes

- **`transform: translateY(-100%)`, not a negative `top`.** The usual recipe
  offsets by the bar's height as a hardcoded number; this nav's height is
  content-driven. A transform is always exactly its own height, and it
  composites instead of triggering layout on every scroll frame.
- **`--site-nav-height` is measured, not assumed.** The hero sizes itself with
  `calc(100vh - var(--site-nav-height))` so the first screen fits exactly. A
  `ResizeObserver` keeps it current across breakpoints and copy changes; `7rem`
  is the pre-JS fallback, close enough to avoid a layout shift.
- **`:not(:focus-within)` on the hidden state** brings the nav back when you Tab
  into it. Without it the tab order runs through off-screen controls —
  [WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).
- **`scroll-padding-top` on `html`** stops the bar landing on top of anchor
  targets and elements the browser scrolls to on focus. One rule, rather than
  `scroll-margin` on every target.
- **Under reduced motion the nav never hides at all.** Collapsing the transition
  would still let it jump in and out; suppressing the hiding is the honest read
  of the setting.
- Scroll handling is rAF-throttled and `passive`, with a threshold so trackpad
  noise cannot flip the state.

## Migration from Slater

Scripts and styles are moving out of Slater into this repo as the site is
rebuilt. Slater is legacy — new work goes here.

| Slater file | Status |
|---|---|
| `51358.js` (copy-email) | Migrated → `src/copy-email.js` |
| `51359.css` (copy-email states) | Migrated → `src/copy-email.css` |
| `51512.css` (reset + utilities) | Migrated → `src/reset.css` |
| `51417.css` (Bunny video background) | **Still on Slater** — deferred |

The Bunny stylesheet is still loaded from Slater in site-wide head code. Leave
that `<link>` in place until that component is migrated or dropped.

## Credit

The magnify-marquee technique is adapted from
[gallery-studio.webflow.io](https://gallery-studio.webflow.io) by Lucas Gusso.
