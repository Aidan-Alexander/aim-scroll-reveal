# AIM scroll-reveal story section

The full-screen section on the new AIM Squarespace site that tells a two-paragraph story as you scroll: each sentence types itself in, letter by letter, one scroll at a time; the first paragraph recedes (fades and shrinks) once the second begins; and the "Start something that matters" wordmark lands last.

**This repo is the source of truth.** Every version of the section lives here; the Code Block on the site is just a paste of one of these files. To change the section: edit the file here (the GitHub web editor is fine: open the file, pencil icon, commit), then open the file, press **Raw**, select all, copy, and paste it into the page's Code Block, replacing everything there. Do not edit only inside Squarespace: the next paste would wipe it.

## Versions

| File | What it does |
| --- | --- |
| `squarespace/v2-sentence-steps.html` | **Current.** One sentence per step, typed letter by letter into empty space, ending on the wordmark. `mode` at the top of the script's CONFIG picks the behaviour:<br>**A `'gesture'`** (in use): every scroll gesture (flick, wheel notch, arrow key, space) or click/tap on the section types the next sentence, whatever its size; the page waits on the section until the story is told, then the next gesture glides it on to the next section at a steady pace. Scrolling up is never held. On phones and tablets each swipe counts as one gesture.<br>**B `'scroll'`**: nothing is held; each sentence types when you scroll past its place in the section (half a screen-height apart). A hard flick types two or three in quick succession, a small nudge types none. |
| `squarespace/v1-word-scrub.html` | The original, as first deployed: words fade in one by one, scrubbed to the scroll position over four screen-heights. Kept for reference. |

Version B leaves touch scrolling native; version A handles swipes itself (see Phones and tablets below).

**Dropped options, kept in the history.** Two options were tried and removed on 2026-09-29: typing whole words on an even beat instead of letters (`typing: 'words'`), and showing the coming text in grey before it's typed (`--vs-muted: #C6C2BC`). The file as it was with both, otherwise identical to the version that replaced it, is at the tag `v2-with-variants`: [open it on GitHub](https://github.com/Aidan-Alexander/aim-scroll-reveal/blob/v2-with-variants/squarespace/v2-sentence-steps.html) (Raw, then copy, as usual). Every other earlier state is in the commit history, including the grey-out-and-reset when scrolling back up after the end, removed on 2026-09-30 (last present in commit `4bd4713`).

The typing is a fixed animation, so it looks the same however fast or slow someone scrolls: letters appear one at a time, with small uneven pauses between words, like someone typing quickly (no sentence takes longer than `maxStepTime`, 2s). Un-typed text is invisible but already laid out, so nothing reflows as it types. The second paragraph waits at 85% size until its first sentence; then it grows to full size as the first paragraph fades and shrinks.

## Editing the text

The text is the two `<p class="vs-reveal__p">` paragraphs near the top of the file. Change the wording freely; nothing else needs to change.

- Sentences are found automatically: one ends at a word ending in `.` `!` or `?` (closing quotes or brackets after it are fine) when the next word starts with a capital letter, digit or opening quote. `e.g.`, `i.e.`, `etc.`, `vs.`, `Dr.`, `Mr.`, `Mrs.`, `Ms.`, `Prof.`, `St.`, `No.`, `cf.`, `approx.` and single-letter initials do not end a sentence (the list is `abbreviations` in CONFIG).
- `<strong>…</strong>` is the burgundy emphasis. It can start, end or sit inside a sentence.
- Any number of sentences per paragraph. More than two paragraphs also works: each new paragraph dims the one before it.
- To control the split by hand (a sentence you want typed in two beats, or a line with no full stop), wrap each piece of that paragraph in `<span class="vs-s">…</span>`. Once a paragraph uses `vs-s`, it is split only on those spans, so wrap every part. Paragraph 1 does this, because to the automatic rule ".." followed by a lower-case word isn't a sentence end.
- To keep two sentences together as one step, wrap them in `<span class="vs-join">…</span>`. The full stop inside gets a longer beat (`stopPause`).
- Sentences of 3 words or fewer (`noPauseWords`) type in one run, with no pause between words, so "Or choose impact." lands as one beat.
- The wordmark ("Start something that matters") is the `<div class="vs-reveal__mark">` after the paragraphs: an inline SVG whose letters are `<path>`s. It is the final step, after the last sentence: its words pop in one at a time (`markWordTime`, `markPopFrom`), with the gaps between them set by `markGaps` (start>something, something>that, that>matters: the middle one is longer, so it reads as two pairs), and paragraph 2 stays exactly as it is. To swap the artwork, replace the `<svg>` and the `aria-label`, and wrap each word's `<path>`s in a `<g data-vs-word="…">` as the current one does (without the groups the script guesses words from the gaps between letters, which goes wrong on italic faces whose letters overlap). Colour, width and the space above it are `--vs-mark-color`, `--vs-mark-width` and `--vs-mark-gap`. Delete the div to have no wordmark.

A blinking caret sits after the last typed letter (steady while typing, blinking while it waits for the next scroll, gone once the wordmark takes over). `caret: false` removes it; `--vs-caret-color` recolours it (default: the text colour).

## Impatient and returning visitors

- **Hurrying.** A scroll gesture that lands while a sentence is still typing, or within `hurryWindow` (0.7s) of the previous gesture, finishes the current sentence at once and plays the next one faster: 2.5×, then 6×, then instantly (`hurryPace`). While hurrying, one long push also keeps stepping, every `hurryDelta` (250px) of scrolling. Pausing for a moment resets it to normal. Two or three quick flicks get to the end; the next one lets the page go.
- **Jumping.** If the scroll position jumps several sentences at once (scrollbar drag, End key, landing mid-section from the back button), the catch-up plays at `catchUpPace` (4×).
- **Arriving.** Scrolling down into the section types the first sentence straight away (a blank screen with a blinking caret confused a tester), and that is all it does however big the swipe: the momentum of the push that brought you in can never type more. That swipe can't simply be cancelled, because Chrome only lets a page cancel a trackpad swipe (momentum included) if it cancelled the swipe's very first event, which happened above the section; the same goes for a touch fling. So instead its momentum is held: every movement is put straight back on the first sentence, invisibly inside the pinned section, until the swipe dies out. (Found with the debug log below: before this, the "absorbed" events were still scrolling the page.) The next swipe types the next sentence, even one that lands while the first is still coasting (for the first 0.6s after arriving, `arriveLock`, only a change of direction counts, because a big arriving swipe may still be being pushed). New swipes are told from coasting by speed, not raw deltas, so the zigzag of bundled events and the late bundles of a busy page don't fake one; the rules were tested against simulated Mac trackpad streams (see the comment on `isNewGesture`). A click or tap always works, including during those 0.6s.
- **Leaving.** Once the story is told, the next swipe down doesn't fling the page, however big it is: it glides at a steady pace (`exitTime`, 0.9s) until the section has gone and the next one is at the top of the screen, and the rest of that swipe is absorbed. After that, scrolling is normal. Turning back up mid-glide cancels it. Keyboard scrolling is left native (it doesn't fling); on a phone the leaving swipe gets the same glide.
- **Scrolling back up never undoes anything**, mid-story or after the end. The page always moves: on an up-gesture the scroll position hops to the section's natural top (visually identical, it is pinned there) and the flick carries on natively, so nothing holds you, not even the blinking caret. What's been typed stays. Scroll back down and it picks up where you left off: the next swipe types the next sentence. To see the story again, reload the page.
- **Once it's been seen.** When the story is finished and you leave the section, in either direction, it retires: the pinning is taken out, so from then on it's just the finished story on the page and scrolling passes straight through it, up or down, with no stops. Taking the pin out shortens the page by the pinned stretch; if you're below it, the scroll position moves up by the same amount, so nothing visibly jumps. The same happens if you land below it (the back button). (Scroll-driven progress is forward-only: a scrollbar drag down types what it passes, a drag up changes nothing.)

## Phones and tablets

Version A works the same way with swipes. While the section is pinned the page doesn't pan for touches that start on it (`touch-action` via the `is-touchlocked` class, with `preventDefault` as a fallback), so a swipe can't fling through several sentences: each swipe is one step, taken once the finger has moved `touchStep` (24px), however long or fast it is. Hurrying works as with a trackpad.

- Arriving with a fling from above stops dead on the first sentence (the page is frozen with `overflow: hidden` for that moment, and let go once the finger is up). As a backstop, where a phone ignores the freeze, any movement while the fling coasts is put straight back on the sentence, which inside the pin is invisible.
- A swipe back up on the section carries the page up by `touchUpDistance` (0.75 screen-heights) over `touchUpTime` (0.6s), and your place is kept. Coming back up from below does the same.
- Leaving is the same steady glide as with a trackpad.

On narrow screens (`markTwoLines`, 767px and under) the wordmark breaks into two lines, "Start something" over "That matters", so it's about 1.8× larger at the same width. The words that drop are the ones inside `<g data-vs-line="2">`; `markLineGap` sets the space between the lines.

## Tuning

Colours and type are CSS variables at the top of the `<style>` (`--vs-color`, `--vs-bold-color`, `--vs-start-scale` for a paragraph whose turn hasn't come, `--vs-size`, `--vs-gap`, `--vs-maxwidth`). If the copy is too tall for the window at that size, the script shrinks the type until it fits, so long text never gets cut off. Timing and scroll geometry are in `CFG` at the top of the `<script>`; each line is commented. The ones that matter most:

- `mode`: `'gesture'` (A) or `'scroll'` (B).
- `stepDistance`: screen-heights of scrolling per sentence in version B (0.5).
- `hold` / `holdGesture`: how long the finished text stays before the page moves on.
- `charStagger`, `charPause`, `maxStepTime`: the typing speed. The letters of a word land `charStagger` apart; every word boundary adds a pause around `charPause` long (random 0.6×–1.6×; `commaPause` times longer after a comma, `stopPause` after a full stop mid-step); `maxStepTime` caps a whole sentence, squeezing long ones proportionally.
- `charJitter`: how uneven the letters are. 0 is metronomic with no word pauses; the default is 0.5; 1 is very uneven.
- `dimOpacity`, `dimScale`: how far the earlier paragraph recedes.

Fonts are copied at runtime from the page's real headings and a real `<strong>`, as before (see the comments in the CSS), so nothing font-related should need touching unless Squarespace renames the font.

## Local preview

`preview/index.html` is a mock page with filler above and below the section. It loads the pasteable file unchanged from `squarespace/`, so what you see is exactly what you would paste. The panel in the corner switches between A, B and v1 and shows which step the section is on.

Serve the repo folder with any static server and open `/preview/`. In Claude Code the `aim-scroll-reveal` entry in `.claude/launch.json` does this on port 8933: `http://localhost:8933/preview/`.

The preview stands in Georgia for Morland and mimics the site's `p { font-family !important }` rule; the real fonts only show on the site.

## Tests

`node test/wheel-detector.test.js` (needs Node, nothing to install) checks the section file before you paste it:

- the script parses, and every `CFG` setting it reads is defined;
- the wheel-gesture detector (`isNewGesture`, lifted straight out of the file) handles simulated Mac trackpad and mouse input (`test/wheel-sim.js`), 200 randomised runs per case. A big swipe arriving, even on a very busy page, must not type extra lines; a second swipe on a coasting one, stop-and-swipe, rest-and-swipe and quick flicks must be recognised; a change of direction always counts; a fast mouse spin that arrives is swallowed.

Run it after changing anything about the wheel handling. It prints PASS or FAIL per case and exits non-zero on a failure; `node test/wheel-detector.test.js some-copy.html` tests another copy of the file. The limits sit just above today's results, so a regression shows up (planting either of the two earlier bugs back in fails it). Touch can't be simulated: test phones by hand.

**Debug log.** Add `?vsdebug` to the address of any page with the section (the live site on a phone included), or open the preview with `?debug=1`, and the section records every wheel event, touch, swipe and step: speed, timing, whether the detector counted it as new, what was done with it, whether the browser actually let it be cancelled, and the state flags (S snapping, H holding, F frozen, X leaving, T finger down, L touch-locked, A typing). A small "copy scroll log" button appears bottom left; tap it and paste the text into a message. Without the flag nothing is recorded and no button appears, so it's safe to leave in the live file. (`debug: true` in CFG does the same on every page load.)

## Notes

- The section needs GSAP + ScrollTrigger, loaded from jsDelivr by the script. If the CDN is unreachable the text simply shows in its final colours.
- `prefers-reduced-motion` shows the finished text with no pinning or animation.
- Squarespace's editor does not run Code Block scripts; check the section on the live/preview page.
- Version A intercepts downward wheel and keyboard events only while the section is pinned: until the story is told, plus the one swipe that leaves, which it turns into a steady glide. Scrolling up is never held, and scrollbar dragging and everything outside the section stay native. Touches are taken over only when they start on the pinned section.
