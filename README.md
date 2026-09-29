# AIM scroll-reveal story section

The full-screen section on the new AIM Squarespace site that tells a two-paragraph story as you scroll: the words start muted, each sentence is "typed" into its full colour in turn, and the first paragraph recedes (fades and shrinks) once the second begins.

**This repo is the source of truth.** Every version of the section lives here; the Code Block on the site is just a paste of one of these files. To change the section: edit the file here (the GitHub web editor is fine: open the file, pencil icon, commit), then open the file, press **Raw**, select all, copy, and paste it into the page's Code Block, replacing everything there. Do not edit only inside Squarespace: the next paste would wipe it.

## Versions

| File | What it does |
| --- | --- |
| `squarespace/v2-sentence-steps.html` | **Current.** One sentence per step. Two versions to try, switched by `mode` at the top of the script's CONFIG:<br>**A `'gesture'`**: every scroll gesture (flick, wheel notch, arrow key, space) types the next sentence, whatever its size; the page waits on the section until the last sentence is typed, then the next gesture lets it move on. Scrolling up untypes a sentence per gesture.<br>**B `'scroll'`**: nothing is held; each sentence types when you scroll past its place in the section (half a screen-height apart). A hard flick types two or three in quick succession, a small nudge types none. |
| `squarespace/v1-word-scrub.html` | The original, as first deployed: words fade in one by one, scrubbed to the scroll position over four screen-heights. Kept for reference. |

On phones both versions behave like B: touch scrolling is never intercepted.

Either way the typing itself is a fixed animation, so it looks the same however fast or slow someone scrolls. By default letters appear one at a time in bursts and pauses, like someone typing quickly (no sentence takes longer than `maxStepTime`, 2s); `typing: 'words'` switches to whole words on an even beat. Un-typed text is invisible until typed (`--vs-muted: transparent`), so each sentence types into empty space; give that variable a colour, e.g. `#C6C2BC`, to show the coming text as grey ghost text instead (the preview's "grey until typed" toggle). The second paragraph waits at 85% size until its first sentence; then it grows to full size as the first paragraph fades and shrinks.

## Editing the text

The text is the two `<p class="vs-reveal__p">` paragraphs near the top of the file. Change the wording freely; nothing else needs to change.

- Sentences are found automatically: one ends at a word ending in `.` `!` or `?` (closing quotes or brackets after it are fine) when the next word starts with a capital letter, digit or opening quote. `e.g.`, `i.e.`, `etc.`, `vs.`, `Dr.`, `Mr.`, `Mrs.`, `Ms.`, `Prof.`, `St.`, `No.`, `cf.`, `approx.` and single-letter initials do not end a sentence (the list is `abbreviations` in CONFIG).
- `<strong>…</strong>` is the burgundy emphasis. It can start, end or sit inside a sentence.
- Any number of sentences per paragraph. More than two paragraphs also works: each new paragraph dims the one before it.
- To control the split by hand (a sentence you want typed in two beats, or a line with no full stop), wrap each piece of that paragraph in `<span class="vs-s">…</span>`. Once a paragraph uses `vs-s`, it is split only on those spans, so wrap every part.
- To keep two sentences together as one step, wrap them in `<span class="vs-join">…</span>` (as "Choose the promotion. Choose the nagging feeling…" is). The full stop inside still gets its little pause.
- Sentences of 3 words or fewer (`noPauseWords`) type in one run, with no pause between words, so "Or choose impact." lands as one beat.
- The wordmark ("Start something that matters") is the `<div class="vs-reveal__mark">` after the paragraphs: an inline SVG whose letters are `<path>`s. It is the final step, after the last sentence: its words fade in one at a time on an even beat (`markWordTime`, `markWordGap`), and paragraph 2 stays exactly as it is. To swap the artwork, replace the `<svg>` and the `aria-label`, and wrap each word's `<path>`s in a `<g data-vs-word="…">` as the current one does (without the groups the script guesses words from the gaps between letters, which goes wrong on italic faces whose letters overlap). Colour, width and the space above it are `--vs-mark-color`, `--vs-mark-width` and `--vs-mark-gap`. Delete the div to have no wordmark.

A blinking caret sits after the last typed letter (steady while typing, blinking while it waits for the next scroll, gone once the wordmark takes over, and at the start of the empty section before anything is typed). `caret: false` removes it; `--vs-caret-color` recolours it (default: the text colour).

## Impatient and returning visitors

- **Hurrying.** A scroll gesture that lands while a sentence is still typing, or within `hurryWindow` (0.7s) of the previous gesture, finishes the current sentence at once and plays the next one faster: 2.5×, then 6×, then instantly (`hurryPace`). Pausing for a moment resets it to normal. Two or three quick flicks get to the end; the next one lets the page go.
- **Jumping.** If the scroll position jumps several sentences at once (scrollbar drag, End key, landing mid-section from the back button), the catch-up plays at `catchUpPace` (4×).
- **Scrolling back up, in any state.** The page always moves: on an up-gesture the scroll position hops to the section's natural top (visually identical, it is pinned there) and the flick carries on natively, so nothing holds you, not even the blinking caret. Whatever had been typed is left behind in grey (`--vs-spent`, over `spentTime`), then vanishes back to front (`vanishTime`) as the section leaves, and the section resets, so scrolling down again replays it from blank. Turning back down before you've left starts the story again.
- **Arriving.** Scrolling down to the section lands on the empty section with the caret blinking; the next gesture types the first sentence.

## Tuning

Colours and type are CSS variables at the top of the `<style>` (`--vs-color`, `--vs-bold-color`, `--vs-muted` for un-typed words, `--vs-start-scale` for a paragraph whose turn hasn't come, `--vs-size`, `--vs-gap`, `--vs-maxwidth`). If the copy is too tall for the window at that size, the script shrinks the type until it fits, so long text never gets cut off. Timing and scroll geometry are in `CFG` at the top of the `<script>`; each line is commented. The ones that matter most:

- `mode`: `'gesture'` (A) or `'scroll'` (B).
- `stepDistance`: screen-heights of scrolling per sentence in version B (0.5).
- `hold` / `holdGesture`: how long the finished text stays before the page moves on.
- `charStagger`, `charPause`, `maxStepTime`: the typing speed. The letters of a word land `charStagger` apart; every word boundary adds a pause around `charPause` long (random 0.6×–1.6×, longer after punctuation); `maxStepTime` caps a whole sentence, squeezing long ones proportionally.
- `charJitter` / `wordJitter`: how uneven the letters (or words) are. 0 is metronomic with no word pauses; letter mode defaults to 0.5; 1 is very uneven. Word mode defaults to 0.
- `wordTime`, `wordStagger`: the same for word mode.
- `dimOpacity`, `dimScale`: how far the earlier paragraph recedes.

Fonts are copied at runtime from the page's real headings and a real `<strong>`, as before (see the comments in the CSS), so nothing font-related should need touching unless Squarespace renames the font.

## Local preview

`preview/index.html` is a mock page with filler above and below the section. It loads the pasteable file unchanged from `squarespace/`, so what you see is exactly what you would paste. The panel in the corner switches between A, B and v1, between words and letters, and shows which step the section is on.

Serve the repo folder with any static server and open `/preview/`. In Claude Code the `aim-scroll-reveal` entry in `.claude/launch.json` does this on port 8933: `http://localhost:8933/preview/?v=2&mode=gesture`.

The preview stands in Georgia for Morland and mimics the site's `p { font-family !important }` rule; the real fonts only show on the site.

## Notes

- The section needs GSAP + ScrollTrigger, loaded from jsDelivr by the script. If the CDN is unreachable the text simply shows in its final colours.
- `prefers-reduced-motion` shows the finished text with no pinning or animation.
- Squarespace's editor does not run Code Block scripts; check the section on the live/preview page.
- Version A intercepts wheel and keyboard events only while the section is pinned and only until the story is told, so scrollbar dragging, touch and everything outside the section stay native.
