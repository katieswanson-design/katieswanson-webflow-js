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
| `src/hover-peek.js` | Cursor-following image preview for the article list. No dependencies. | Site-wide |
| `src/hover-peek.css` | State transitions, input-mode and reduced-motion variants for that preview. | Site-wide |
| `src/disclosure-a11y.js` | Removes the `aria-haspopup="menu"` Webflow's JS adds to Dropdown toggles used as accordions. Opt-in via `[data-disclosure]`; no-ops where that attribute is absent. No dependencies. | Site-wide |
| `src/nav-menu.js` | Full-screen menu: curve-swipe transition, focus handling, Escape, and `inert` on the page behind. GSAP core optional — degrades to an instant open. | Site-wide (the `nav` component) |
| `src/nav-menu.css` | `overscroll-behavior` on the open panel, and the injected curve overlay. | Site-wide |
| `src/prefer-back.js` | Two link-behaviour corrections: a back link that calls `history.back()` when the visitor really did come from there, and a skip link that actually moves focus. No dependencies. | Site-wide |
| `src/statement-scroll.js` | Splits the statement into per-word elements so the CSS can reveal them one at a time. No dependencies. | `/new-home` |
| `src/statement-scroll.css` | Pill-skeleton scroll reveal for that statement. CSS scroll-driven animation, no JS. | `/new-home` |
| `src/view-transition.css` | Shared-element morph from a home case study card to that case study's hero. No JS. | Site-wide |
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

## view-transition

Clicking a featured case study card morphs that card's frame into the hero
frame on the case study page. Cross-document View Transitions, no JavaScript.

### How the pairing works

A `view-transition-name` has to be unique **within a document**, not across the
site. So the home page carries all three names at once — one per card, all
different — and each case study page carries exactly one. The browser pairs old
to new by matching name across the navigation.

The outgoing side is matched by href, the incoming side by an attribute:

```css
.project[href*="case-study-01"] .card-frame { view-transition-name: cs-01; }
[data-vt="cs-01"]                            { view-transition-name: cs-01; }
```

`data-vt` is set on each case study page's `.card-frame.full` in the Designer's
settings panel. **Adding a fourth case study means adding one matching pair to
this file and setting `data-vt` on that page's frame.** Nothing else.

### Why the frame, not the image

The three home cards are not the same kind of thing — one holds a Bunny video,
two hold images. Naming `.card-frame` rather than the media inside it means the
browser morphs the *box* and cross-fades whatever is in it, so video cards and
image cards behave identically. Naming the media directly would have made the
video card the odd one out.

The geometry already lines up: the source frame is `width: 80%` at
`aspect-ratio: 16/9`, the destination is `width: 100%` and inherits the same
ratio. Same shape, different size — which is exactly the case that morphs
cleanly. The two ends use different radius tokens, so the corner radius
animates too.

### Reduced motion needs its own rule

The global guard in `reset.css` **cannot reach this**. That guard sets
`animation-duration` on `*`, and the `::view-transition-*` pseudo-elements live
in a separate tree hanging off the root that `*` does not match. Hence the
dedicated block at the bottom of the file. Removing it does not fall back to
the global guard — it falls back to nothing.

### Support

Chrome/Edge 126+, Safari 18.2+. **Firefox does not support cross-document view
transitions** and navigates normally; nothing breaks, the morph is simply
absent. `navigation: auto` also applies to every other same-origin navigation
on the site, which gives the rest of the pages a plain cross-fade.

## prefer-back

The back button on a case study page returns to the home page at
`#featured-case-studies`. It is a **real link with a real href** — it works
with JavaScript disabled, with the keyboard, with middle-click, and for someone
who arrived cold from a shared URL with no history to go back through.

`src/prefer-back.js` upgrades it: if the visitor actually came from the page
that href points at, it calls `history.back()` instead.

### Why bother, when the href already works

`history.back()` restores the **exact scroll offset** the visitor left from.
Navigating forward to `/new-home#featured-case-studies` only lands on the
section heading, which can leave the card they clicked off-screen — so the view
transition morphs toward a position they cannot see. Going back puts the card
exactly where it was and the morph reverses cleanly.

The href stays the source of truth. If the referrer doesn't match it, the
script does nothing and the link navigates normally.

```
<a href="/new-home#featured-case-studies" data-prefer-back> … </a>
```

### Maintenance note

That href is a literal path. **When `new-home` becomes the site's `/`, these
four hrefs have to change to `/#featured-case-studies`** — on
`case-study-01/02/03` and on `case-study-template`. Webflow's Designer can link
to "page → section", which survives a slug change automatically, but that link
type is not exposed through the Data API, so it has to be set by hand in the
Designer if you want it to be self-maintaining.

### It also fixes the skip link

The same file handles `[data-skip-link]`, because it is the same class of
problem — a link whose correct behaviour the browser does not give us for free.

A skip link is supposed to move both the **scroll and the focus** to its target,
so the next Tab continues past the nav. Browsers only do the focus half when the
navigation actually **scrolls**. On `/new-home` the target is the hero, already
at the top of the page, so nothing scrolls, the focus step is skipped, and the
next Tab resumes from the link — landing the visitor back in the nav they just
asked to skip ([WCAG 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks)).

```
<a href="#main-content" data-skip-link> skip to main content </a>
<section id="main-content" tabindex="-1"> … </section>
```

All three parts are required. Without `tabindex="-1"` the section cannot take
focus at all; both it and the ID are set in the Designer.

This does **not** `preventDefault`. The browser keeps the hash change and the
scroll — which matters, because that scroll respects `scroll-padding-top` in
`reset.css`. The script only queues the `focus({ preventScroll: true })` so it
lands after the browser has finished.

**Test it by activating the link and then pressing Tab**, and checking where
focus goes. Testing the activation alone proves nothing: the hash updates either
way, so a broken skip link looks like a working one.

## hover-peek

The article list on `/new-home` (`#articles`). Hovering a row floats a 16:9
image that trails the cursor. Adapted from the BYQ Supply "Hover Peek List"
gem, restyled onto existing site classes.

### Markup contract

```
.article-list[data-hover-peek]              ← position: relative
├ .article-list_peek[aria-hidden="true"]    ← 16:9, pointer-events: none
│ └ img.article-list_peek-image ×N          ← stacked, order = data-peek index
└ ul.article-list_items[role="list"]
  └ li.article-list_row[data-peek="N"]
    └ a.article-list_link                   ← grid: num | title | type | arrow
      ├ div.project-number[aria-hidden]
      ├ div.project-title
      ├ div.project-type
      └ svg.arrow-svg[aria-hidden]
```

The row link must be a **Link Block**, not a Text Link. A Text Link cannot
contain elements — Webflow rejects the write with *"Elements cannot be added to
Link elements"* — so the arrow icon has nowhere to live. Building an `<a>` from
HTML produces a Text Link, so these were created explicitly as `LinkBlock`.

`data-peek` is the index into the image stack. **Adding a row means adding a
matching image** in the same order — they are paired by position, not by name.

`role="list"` is deliberate: `list-style: none` makes Safari drop list
semantics, so the row count stops being announced without it.

The arrow uses `fill="currentColor"`, so it takes the row's text colour and
follows the light/dark modes. The site's other arrow, `.ic-arrow`, already does
this — a hardcoded `fill` would go invisible in one mode or the other.

### Three shared classes

`.project-number`, `.project-title` and `.project-type` are reused from the
featured projects section, so the two lists stay typographically identical.
Because they are shared, **every rule in `hover-peek.css` that touches them is
scoped under `.article-list_link`** — an unscoped `.project-title` rule would
reach into the projects grid.

The row is laid out as a grid (`auto minmax(0, 1fr) auto auto`) rather than by
styling the four children, for the same reason: the grid belongs to this
component, the type styles belong to both.

### Input modes

| | behaviour |
|---|---|
| mouse / fine pointer | box trails the cursor, tilts with horizontal velocity |
| keyboard focus | box pins beside the focused row, no chase |
| touch / coarse pointer | peek container is `display: none` |

Hiding the container on touch also means its lazy images are **never fetched**
there, so a phone pays nothing for a feature it cannot use.

Keyboard focus showing the preview is deliberate. The image is decorative and
the container is `aria-hidden`, so it adds nothing to the accessible name — it
just stops tabbing through the list from being a visually degraded version of
mousing through it.

### Reduced motion

The variant **keeps the preview** — it is the component — and drops only the
motion that exists for its own sake: the cursor chase, the tilt, and the scale
settle. The box pins beside the row instead. `reset.css` collapses the
transition durations on top of that.

### The peek is clamped to the list

It is centred on the cursor, so near either edge it would hang half its width
outside `.article-list`. Overflowing to the right widens the document and
raises a **horizontal scrollbar** — from a decorative hover. So the x position
is clamped to the list's bounds; the box stops tracking the cursor in the last
~11rem at each edge, which is a much cheaper cost.

The parent `.container-medium` was `width: 96svw`, which is viewport-relative
and therefore ignored `.section`'s padding — the container sat wider than the
space it was in and the excess spilled right. It is `width: 100%` now, matching
`.container`.

### Tunables

Attributes on `[data-hover-peek]`:

| Attribute | Default | Effect |
|---|---|---|
| `data-peek-tilt` | `6` | Max rotation in degrees, driven by pointer velocity. `0` disables tilt. |
| `data-peek-ease` | `0.16` | Fraction of the gap to the cursor closed per frame. Lower trails further behind. |

## copy-email

A button that copies an address and flips into a copied state.

```
.copy-email-wrapper
├ button.copy-email-button[data-copy-email]
│ └ .copy-email-text__wrap > span.copy-email-text__el ×3
└ .sr-only[role="status"][aria-live="polite"][data-copy-email-status]
```

### Why the live region exists

The button carries an `aria-label`, and an `aria-label` **overrides the
element's visible text**. Without help a screen reader therefore never hears
the address, and never hears that the copy worked. Two things fix that:

1. The label is composed from the address — "Copy hello@… to clipboard" —
   so the accessible name says *which* address this copies.
2. Success is announced through the `role="status"` live region, **not** by
   swapping the `aria-label`. Renaming a control the user is currently focused
   on is unreliable across screen readers and disorienting when it does land.

The status node must sit **outside** the button. Inside, its text would be
swallowed by the button's accessible name instead of being announced, and the
`aria-label` would override it anyway.

Failure is announced too — a blocked clipboard write or a non-HTTPS context
now says so and reads the address out, instead of failing silently.

### One thing deliberately removed

`mouseleave` used to call `button.blur()`. That threw away focus the visitor
had not given up: a keyboard user could lose their place because the pointer
happened to drift across the button. The state still resets on `mouseleave`
and on `blur`; it just no longer moves focus.

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
| `data-hour12` | *(12-hour)* | Set to `false` for a 24-hour clock |
| `data-seconds` | *(off)* | Set to `true` to show seconds |
| `data-zone-name` | *(shown)* | Set to `false` to drop the `cdt`/`cst` |
| `data-meridiem` | *(shown)* | Set to `false` to drop the `am`/`pm` |

```
3:07 pm cdt    (defaults — the /new-home hero)
21:41:30       (hour12 false, seconds true, zone-name false — the blend nav)
```

### Notes

- **The zone abbreviation is derived, never hardcoded.** Austin reads `cdt`
  through daylight time and `cst` the rest of the year on its own. Writing a
  literal `cst` into the markup would be wrong for eight months of the year.
  Drop it with `data-zone-name="false"` when a city label sits beside the clock
  and makes it redundant.
- **24-hour is zero-padded** (`09:05`, not `9:05`) — an unpadded 24-hour time
  reads as a typo. 12-hour keeps its natural unpadded hour.
- It uses **`hourCycle: h23`, not `hour12: false`**, because the latter renders
  midnight as `24:00` in some locales.
- It **updates on the unit boundary** — every second when seconds are shown,
  otherwise on the minute — rather than on a fixed interval, so the display is
  never a tick stale.
- **WCAG 2.2.2, with seconds on:** this is auto-updating content that never
  stops. What covers it is the criterion's *essential* exception — a clock that
  does not update is not a clock — but that is a judgement call, not something
  the code earns. Without seconds it changes once a minute, well below anything
  anyone would read as motion.
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

### It also positions `.hero-statement-wrapper`

The stylesheet sets `margin-left` and `max-width` on `.hero-statement-wrapper`
so the statement is pinned to the panel row behind it. Its left edge lines up
with the panel that is open at rest — `padding + 2 slivers + 2 gaps` — and its
right edge lands on the **right edge of the next panel along**, so the text
spans the open panel plus the sliver after it. The sliver width is flex-derived,
so neither value can be a fixed percentage, and both change at every
panel-count step.

```
margin-left = P + 2g + 2 * (100% - 2P - (n-1)g) / (n - 1 + grow)
max-width   =     (grow + 1) * (100% - 2P - (n-1)g) / (n - 1 + grow) + g
```

`margin-left` rather than `left`: the wrapper is in normal flow, not absolutely
positioned. `100%` rather than `100vw` on purpose: percentages resolve against
`.hero`, which excludes the scrollbar. `100vw` includes it, so the statement
would drift by the scrollbar width whenever one is present.

The wrapper is also the query container, so `max-width` is what the statement's
`clamp(…cqi…)` font-size scales against. **Widening the span enlarges the type
by the same ratio** — the statement re-renders larger with identical line
breaks rather than fitting more words per line. Measured on the published
sandbox: 40px → 41.2px at a 1440 viewport, 47.8px → 56.2px at 1920. Pinning the
type while the box grows means taking the font-size off `cqi`.

### And it centres the statement optically, not geometrically

`margin-block: auto` (set in the Designer) centres the wrapper exactly between
the hero's padding edge and the panel row. That reads as too low, because the
hero reserves a nav's worth of `padding-top` while the nav's text stops one
block-padding (`2rem`) short of it — so the top gap inherits 2rem of empty nav
padding that the bottom gap has no equivalent for. Measured ink-to-ink at
1440×900 against the sticky nav: **97.5px above, 64.6px below**.

The correction is `padding-bottom` on the wrapper — **now set in the Designer,
not here** (`2.3rem`, cleared to `0` at `medium`). It makes the box that much
taller, so each auto margin gives up half of it and the text rises by half the
error — which is the whole error, since it was split across two margins. At the
`2rem` this was first measured at: **81.5 / 80.6**, holding to within 0.8–0.9px
at 1440×1200, 1920×900, 1280×720 and 1000×800. That residual is the type's
half-leading. The `2.3rem` now in the Designer is Katie's retune after the nav
changed, and has not been re-measured.

Padding, not a transform: a transform moves the ink without telling the layout,
leaving the box and the space it reserves permanently out of step. Block padding
only, so the inline-size query container is untouched. **Coupled to the nav's
vertical padding** — change that in the Designer and this changes with it.

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

## site-nav — retired

`src/site-nav.js` and `src/site-nav.css` were **deleted in v1.0.57**, along with
the `.site-nav`, `.site-nav_contact` and `.site-nav_meta` classes. The sticky
hide-on-scroll bar is gone; see **blend-nav** below for what replaced it.

Two things outlived it and are worth knowing about:

- **`scroll-padding-top` moved into `reset.css`** as a literal — `6.75rem`, and
  `8rem` below 768px. It stops the fixed bar landing on top of anchor targets
  and elements the browser scrolls to on focus
  ([WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)).
  One rule, rather than `scroll-margin` on every target.
- **`--site-nav-height` is now unset everywhere.** The `ResizeObserver` that
  published it went with the script, so every remaining `var(--site-nav-height,
  …)` in this repo resolves to its fallback. The hero no longer uses it at all —
  it is `min-height: 100vh` with a literal `padding-top` set in the Designer.

The lesson the old nav was written to demonstrate still stands and is applied in
`statement-scroll` below: **keep the motion in CSS.** Animating from JavaScript
puts it beyond the reach of the global `prefers-reduced-motion` guard in
`reset.css`, the same way GSAP is.

## disclosure-a11y

Webflow's Dropdown element is built for navigation menus. The case study
accordions use it as a **disclosure** — a button that expands a panel of prose.

Most of what Webflow's JS adds is correct for that: `role="button"`,
`tabindex="0"`, `aria-controls`, and an `aria-expanded` that genuinely tracks
state. One attribute is not:

```
aria-haspopup="menu"
```

That promises a menu of menuitems, navigable with arrow keys, closing on
selection. There is no menu. A screen reader announces *"Overview, button, menu
pop-up, collapsed"* and sets an expectation the panel never meets.

**It is added by Webflow's JS, not written into the published markup.** So there
is nothing to fix in the Designer, and auditing the published HTML will not show
it — the static markup is a bare `<div class="w-dropdown-toggle">` with no role
at all. Read the live DOM, and give Webflow's JS time to run first.

### Markup contract

```html
<div class="w-dropdown" data-disclosure>
  <div class="w-dropdown-toggle" aria-label="Overview"> … </div>
  <nav class="w-dropdown-list"> … </nav>
</div>
```

`data-disclosure` goes on the **wrapper**. It is opt-in on purpose: every
Webflow Dropdown on the site today is one of these accordions, but a real
navigation menu built the same way would *want* `aria-haspopup`, and stripping
it by class would quietly break it later. Unmarked dropdowns are left alone.

The four wrappers live inside the `case study description` component, so the
attribute is set once and reaches all three case study pages.
`/case-studies/case-study-template` holds its own copy of the accordions
**outside** that component, so it was marked separately and its `aria-label`s
set by hand. Nothing about it cascades — any future change to the accordions has
to be made twice until the template either adopts the component or is deleted.

### The accessible name is separate, and is NOT handled here

These toggles need an explicit `aria-label` in the Designer, set to the section
name only — `aria-label="Overview"`, not `"Expand Overview section"`.

Two reasons, both measured:

- **Without any label the button has no accessible name at all.** Name-from-
  content does not reach the `<h2>` through the intervening `.row` wrapper.
  Removing the label to "let the heading name it" produces a bare
  `button` in the accessibility tree — a 4.1.2 failure, worse than a stale
  label.
- **The name must not carry state.** `aria-expanded` already does, correctly, so
  a name containing "Expand" contradicts itself the moment the panel opens:
  *"Expand Overview section, button, expanded"*. The bare section name also
  matches the visible text, which satisfies 2.5.3 Label in Name.

That label is markup and belongs in the Designer. This script does not add it.

### Registered as

`disclosure_a11y` v1.0.60, site-level, **footer** — the same shape as
`prefer_back`: an accessibility correction that loads everywhere and does
nothing on pages with no `[data-disclosure]`.

### Why `Webflow.push`

`aria-haspopup` is already set by the time `Webflow.push` callbacks run —
measured, not assumed — so one sweep is enough. Once removed it does not come
back through open and close, so there is no observer and no re-sweep.
`aria-expanded` keeps working afterwards; this takes nothing else away.

### Still open

`aria-haspopup` is the only thing corrected. The toggle is a `<div role="button">`
wrapping an `<h2>`, where the accessible pattern is `<h2><button>`. The heading
is still exposed separately in the accessibility tree, so heading navigation
works — but restructuring it would mean fighting Webflow's Dropdown, and has not
been attempted.

## nav-menu

The panel is Webflow markup inside the `nav` component — a `[data-nav-menu]`
dialog holding the links, the contact block and the media image. The script owns
the motion, the focus handling and the toggle's state. Nothing else.

### The sweep

One shape crosses the viewport right to left, and the panel is swapped
underneath it at the moment it covers the screen. The shape is a full-width
rectangle whose **leading edge is a quadratic curve**, and the depth of that
curve follows `sin(progress · pi)` — flat at both ends, deepest mid-travel.
That is what makes it read as a swipe rather than a rectangle sliding past.

```
p = 0.0   spans 1440..2880   flat      off right
p = 0.25  spans  720..2160   bulge 224 sweeping in
p = 0.5   spans    0..1440   bulge 317 exactly covers — panel swaps here
p = 0.75  spans -720.. 720   bulge 224 sweeping out
p = 1.0   spans -1440..   0  flat      gone
```

Measured at 1440x900. Either side of the swap the uncovered sliver shows the old
state before and the new state after, which is what a wipe should do.

**GSAP core only.** No MorphSVG, no ScrollTrigger, no paid plugin — the path `d`
is two numbers recomputed each frame. Without GSAP the menu still opens and
closes, just with no sweep, so pages that do not load GSAP degrade rather than
break.

### Why the dialog is NOT aria-modal

The toggle lives in `nav-top`, **outside** the panel, because the bar stays
visible over the open menu and its label becomes "close". `aria-modal="true"`
hides everything outside the dialog from assistive tech — which would make that
close button unreachable. So the panel is `role="dialog"` with an accessible
name and no `aria-modal`.

Isolation comes from **`inert` on the page's other top-level sections** instead.
Same effect, except the nav bars stay reachable, which is the entire point.
Nothing traps Tab: with the rest of the page inert there is nowhere wrong to go,
so the browser's own focus order is already correct.

The inert pass walks `document.body.children` and skips whichever one *contains*
the panel, so a Webflow component-instance wrapper between body and the nav root
is fine. What it does require is that the nav and the page content are **siblings
at body level** — if the nav ever ends up nested inside a page section, that
section cannot be inerted without inerting the nav with it.

### Focus and dismissal

Focus moves to the panel itself on open, not to the first link, so the dialog
name is announced before its contents. `tabindex="-1"` is set from the script
rather than the Designer so the contract cannot be broken by an editing
accident. Escape closes and returns focus to the toggle.

### Reduced motion

Instant open, no sweep, no fades — the unanimated state is the finished state.
`prefers-reduced-motion` is re-read on **every** open rather than cached, so
changing the OS setting takes effect without a reload.

Animations are interruptible: hitting the toggle mid-sweep kills the running
timeline and starts the opposite one.

### Markup contract

```html
<button data-nav-toggle aria-expanded="false" aria-controls="nav-menu">menu</button>
<div id="nav-menu" data-nav-menu role="dialog" aria-label="menu">
  <a class="nav-menu_link">…</a>
  <img data-nav-menu-media>        <!-- optional; fades in on link hover -->
</div>
```

The toggle's label is swapped between "menu" and "close" by the script, so do
not bind it to anything else.

### Still to do

- The media image currently has no asset and one shared image for every link.
  Per-link images would be a `data-` attribute on each link and a swap in
  `focusLink()`.
- GSAP core is registered per page, not site-wide. Pages carrying the nav
  without it get the no-sweep fallback.

## statement-scroll

A statement pinned mid-screen that reveals itself on scroll: a skeleton of
rounded pills builds the shape of the sentence first, then each pill hands off to
its word. `statement-scroll.css` + `statement-scroll.js`.

Modelled on the `.copy-container` effect on paralleatech.com, rebuilt rather than
ported — that site drives it from GSAP ScrollTrigger.

### No JavaScript drives the motion

The reveal is a **CSS scroll-driven animation** on a named view timeline. The
script runs once to split the paragraph into words and then does nothing — no
scroll listener, no rAF loop.

Two reasons it is not GSAP. ScrollTrigger is not loaded on this site (only GSAP
core), so it would mean another library on the critical path. And anything
animated from JS sits outside the global `prefers-reduced-motion` guard in
`reset.css`. Motion belongs in CSS for exactly that reason.

### Markup contract

```
section.section.section-statement      ← names the view timeline
└ div.statement_stage                   position: sticky  (Designer)
  └ div.statement_measure               inline-size container (Designer)
    └ p.statement_text[data-statement]  the sentence, as plain text
```

Write the sentence as ordinary text in the Designer. The script rewrites it to
one `span.statement_word` per word, each carrying `--i`, and publishes `--n` on
the paragraph. The CSS divides the scroll travel using both.

### The fallback is the finished state

Everything animated lives inside `@supports (animation-timeline: view())` and
`@media (prefers-reduced-motion: no-preference)`, and the registered custom
properties initialise to *revealed* — `--reveal: 1`, `--pill-in: 0`. So a browser
without scroll-driven animations, a visitor on reduced motion, and a page where
the script never ran all land on the same place: the sentence, plain, in full.
There is no state in which the statement is unreadable.

### Why `contain`

The section is taller than the viewport with a sticky stage inside it. The
`contain` range runs from the moment the section covers the viewport to the
moment it stops — exactly the period the sentence is held still. The reveal
therefore starts when the text stops moving and ends when it starts again.

No `timeline-scope` is needed: a named view timeline is visible to the naming
element's descendants, and every word is one.

### Two passes, deliberately decoupled

| pass | stagger | what it does |
|---|---|---|
| pills | short (`--pill-span`) | whole skeleton standing inside the first third |
| words | long (`--reveal-open` → 100%) | each word takes over from its own pill |

Running a single pass with a wide overlap instead gives a travelling wave and
never shows the sentence as a complete skeleton — which is the thing worth
taking from the reference.

Tunables on `.statement_text`: `--pill-span`, `--pill-len`, `--reveal-open`,
`--reveal-len`. **`--reveal-open` must be ≥ `--pill-span` + `--pill-len`**, or
words start arriving before the skeleton has finished building.

### Two footguns that live in the Designer

Both of these break the effect silently, and neither is visible from the Webflow
UI where the value is actually edited.

**The section must stay taller than the viewport.** `contain` only exists while
the section covers the scrollport. The `min-height` of `250svh / 220svh / 200svh`
on `.section.section-statement` is not styling — take it below ~`100svh` and the
range collapses to nothing and the reveal stops running. The statement still
reads (it falls back to its finished state), so this fails quietly.

**The pin is `position: sticky`, so it dies inside a clipped ancestor.** Nesting
this pattern inside anything with `overflow: hidden` or `overflow: clip` leaves
the stage scrolling normally with no pin. On this site that rules out `.hero`
(`overflow: hidden`) and `.section-footer` (`overflow: clip`, set in
`reset.css`). ScrollTrigger pins with transforms and does not care; sticky does.

### Browser support

Verified against MDN compat data, 2026-09-13:

| | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| `animation-timeline` | 115+ | 26+ | preview only |
| `animation-range` | 115+ | 26+ | preview only |
| `view-timeline-name` | 115+ | 26+ | preview only |
| `@property` | 85+ | 16.4+ | 128+ |

Stable Firefox has not shipped scroll-driven animations, and Safari only got them
in 26. Those visitors get the plain sentence — correct, just not animated. If the
effect needs to reach them, that is a GSAP rebuild plus a static swap, not a
tweak.

Two further limits worth knowing. The reveal tracks scroll **1:1** — there is no
equivalent of ScrollTrigger's `scrub` smoothing, which is much of why the
reference feels softer. And because the pill's opacity is a `calc()` over
animated custom properties, it **cannot be composited**: every frame is a style
recalc across all the words. Fine at 21; it would not be at 200.

### Word spacing is a compensation

The pill padding sits on top of the real space between words, so a naive setup
gives a glyph gap ~3.5× normal and reads as justified text full of rivers.
Negative `word-spacing` pulls it back. The two gaps are not independent —
`pill gap = glyph gap - 2 × padding` — so an exactly natural glyph gap closes the
pill gap to zero and the skeleton becomes one continuous bar. Measured values and
the shipped numbers are in the stylesheet.

The words stay separated by **real space characters**, not margins, so
`textContent` matches what was authored and the sentence still reads correctly to
a screen reader and copies as a sentence. Don't optimise them away.

## blend-nav

Two fixed bars — `.nav-top` and `.nav-bottom` — that invert themselves against
whatever is behind them using `mix-blend-mode: difference`. Built on
`/admin/playground`. Modelled on studionamma.com.

**It has no stylesheet in this repo.** Every part of it is authored in the
Webflow Designer, including `mix-blend-mode` (Webflow exposes blending in the
style panel) and the `:focus-visible` ring (Webflow's "Focused (keyboard)"
state). An earlier version of this section shipped a `blend-nav.css` for the
focus ring on the mistaken belief that Webflow could not express
`:focus-visible`. It can. The file is gone.

### Markup contract

```
nav.nav-top[aria-label="primary"]
├ a.nav-label.nav-action            logo
├ div.nav-label[data-text-cycle]    role, cycled by text-cycle.js
├ button.nav-label.nav-action       mode swap
└ button.nav-label.nav-action       menu

div.nav-bottom
├ div.nav-label                     proudly neurodivergent
└ div.nav-meta
  ├ div.nav-label                   location
  └ div.nav-label[data-local-time]  clock
```

### `.nav-label`, and why not `.eyebrow`

An eyebrow is a kicker above a heading. None of these are that, so they do not
take that class. `.nav-label` follows the route `.site-nav_bio` takes on
`/new-home`: it sets the **Typography** collection to its **MONO** mode and binds
the generic typography variables (`font-size`, `line-height`, `font-weight`,
`letter-spacing`), so the type resolves through the token system instead of
hardcoded values.

**The MONO mode now carries the family too** (fixed 2026-09-14). It used to swap
`font-size` while leaving `font-family` at the collection default, so every mono
class had to hand-bind the `Gt Pressura Mono` primitive itself. MONO now maps
`font-family` to that primitive, and `.nav-label` binds the generic
`--_typography---font-family` like every other property.

One trap worth writing down: **the class must still declare `font-family`**,
pointed at the generic variable. Deleting the declaration and relying on the mode
alone does not work — the mode sets the custom property, but with nothing
consuming it the element falls back to inheriting body's sans.

Four classes still force the family themselves and could now drop it:
`.site-nav_bio`, `.text-mono`, `.copy-email-text__wrap.small` (all bound to the
primitive) and `.name` (which hardcodes the literal string `"Gt Pressura Mono
Web"` rather than any token). They render correctly as-is — this is tidying, not
a fix.

The role in `nav-top` carries `data-text-cycle` with an empty value, which is
what makes `text-cycle.js` use its built-in role list — exactly as `/new-home`
does. A non-empty value is parsed as a comma-separated list of roles, so do not
put `true` there.

`nav-bottom` is a `<div>`, not a `<nav>`. It contains no navigation — a tagline,
a city and a clock — and a second unnamed navigation landmark would be noise in
the landmark list. The class name is layout, not semantics.

The two buttons are **real `<button>` elements**, which Webflow cannot produce
from a Block (`set_tag` accepts only div/header/footer/nav/main/section/article/
aside/address/figure). They are DOM elements with `dom_tag: button`, which still
take proper Webflow classes. Both are inert placeholders pending the full-page
navigation.

### The colour you set is not the colour you see

`difference` paints `|backdrop - source|`, so the value on the bar is a
pre-image. With white as the source:

| backdrop | renders as |
|---|---|
| cream `#fffdfa` | `#000205` near-black |
| navy `#0d1826` | `#f2e7d9` warm off-white |

A source of `#f2e5d4` instead lands exactly on brand navy over cream, at the
cost of a warm tan over navy. **Over mid-tone imagery the result converges on
the backdrop's own luminance and contrast can fail** — that is inherent to the
technique and cannot be guaranteed the way a token can.

### What silently breaks it

The bar blends against its backdrop within the nearest isolated group. An
ancestor with `isolation: isolate`, `opacity` < 1, a `filter`, a `transform`,
`will-change` or `backdrop-filter` creates that group, and the bar then blends
against *it* rather than the page — which reads as the effect having stopped
working. Both bars are direct children of `<body>` to keep that path clear.

Neither bar carries a background. One would blend too, and the whole bar would
invert as a solid block.

It **replaced** the acrylic treatment the old `.site-nav` carried rather than
joining it — both solve legibility over an unknown backdrop, and running both
would mean a blurred panel being inverted. That nav is now retired entirely.

### Scaffolding

`.nav-demo-band` and `.nav-demo-band.is-navy` are two full-height bands on the
playground page, there only so the blend has something to invert against.
Delete them when the page gets real content.

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
