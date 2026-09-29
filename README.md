# AIM scroll-reveal story section

The full-screen section on the new AIM Squarespace site that tells a two-paragraph story as you scroll: each sentence types itself in, letter by letter, one scroll at a time; the first paragraph recedes (fades and shrinks) once the second begins; and the "Start something that matters" wordmark lands last.

**This repo is the source of truth.** Every version of the section lives here; the Code Block on the site is just a paste of one of these files. To change the section: edit the file here (the GitHub web editor is fine: open the file, pencil icon, commit), then open the file, press **Raw**, select all, copy, and paste it into the page's Code Block, replacing everything there. Do not edit only inside Squarespace: the next paste would wipe it.

## Versions

| File | What it does |
| --- | --- |
| `squarespace/v2-sentence-steps.html` | **Current.** One sentence per step, typed letter by letter into empty space, ending on the wordmark. `mode` at the top of the script's CONFIG picks the behaviour:<br>**A `'gesture'`** (in use): every scroll gesture (flick, wheel notch, arrow key, space) types the next sentence, whatever its size; the page waits on the section until the story is told, then the next gesture lets it move on. Scrolling up is never held.<br>**B `'scroll'`**: nothing is held; each sentence types when you scroll past its place in the section (half a screen-height apart). A hard flick types two or three in quick succession, a small nudge types none. |
| `squarespace/v1-word-scrub.html` | The original, as first deployed: words fade in one by one, scrubbed to the scroll position over four screen-heights. Kept for reference. |

On phones both behave like B: touch scrolling is never intercepted.

**Dropped options, kept in the history.** Two options were tried and removed on 2026-09-29: typing whole words on an even beat instead of letters (`typing: 'words'`), and showing the coming text in grey before it's typed (`--vs-muted: #C6C2BC`). The file as it was with both, otherwise identical to the version that replaced it, is at the tag `v2-with-variants`: [open it on GitHub](https://github.com/Aidan-Alexander/aim-scroll-reveal/blob/v2-with-variants/squarespace/v2-sentence-steps.html) (Raw, then copy, as usual). Every other earlier state is in the commit history.

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
- **Arriving.** Scrolling down into the section types the first sentence straight away (a blank screen with a blinking caret confused a tester), and that is all it does however big the swipe: the momentum of the push that brought you in can never type more. The next gesture, after a pause or change of direction, types the next sentence.
- **Scrolling back up mid-story.** The page always moves: on an up-gesture the scroll position hops to the section's natural top (visually identical, it is pinned there) and the flick carries on natively, so nothing holds you, not even the blinking caret. Your place is kept: scroll back down and you land where you left off, caret blinking, ready for the next sentence.
- **Scrolling back up after the end.** Same free movement, but the finished text is left behind in grey (`--vs-spent`, over `spentTime`), then vanishes back to front (`vanishTime`) as the section leaves, and the section resets, so scrolling down again replays it from blank. Coming back up into it from below does the same. Turning back down before you've left starts the story again.

## Tuning

Colours and type are CSS variables at the top of the `<style>` (`--vs-color`, `--vs-bold-color`, `--vs-start-scale` for a paragraph whose turn hasn't come, `--vs-spent` for the grey the finished text leaves behind, `--vs-size`, `--vs-gap`, `--vs-maxwidth`). If the copy is too tall for the window at that size, the script shrinks the type until it fits, so long text never gets cut off. Timing and scroll geometry are in `CFG` at the top of the `<script>`; each line is commented. The ones that matter most:

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

## Notes

- The section needs GSAP + ScrollTrigger, loaded from jsDelivr by the script. If the CDN is unreachable the text simply shows in its final colours.
- `prefers-reduced-motion` shows the finished text with no pinning or animation.
- Squarespace's editor does not run Code Block scripts; check the section on the live/preview page.
- Version A intercepts downward wheel and keyboard events only while the section is pinned and only until the story is told. Scrolling up is never held, and scrollbar dragging, touch and everything outside the section stay native.
