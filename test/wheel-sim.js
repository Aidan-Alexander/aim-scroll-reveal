// Synthetic Mac trackpad and mouse-wheel input, for testing the section's
// wheel-gesture detector (isNewGesture) without a real trackpad.
// Used by wheel-detector.test.js; nothing here goes to Squarespace.
//
// The model:
//  - A swipe is a finger phase (speeding up, pushed unevenly) followed by
//    momentum (an exponential slow-down), as macOS sends them.
//  - The trackpad reports at a jittery 80-120Hz. The browser bundles those
//    reports into one wheel event per 60Hz frame, summing the deltas and
//    keeping the latest timestamp. That is why raw deltas zigzag even while
//    the page coasts smoothly.
//  - A busy page sometimes stalls for 60-250ms, then delivers everything that
//    arrived meanwhile as one big event.
// Deterministic: the randomness comes from a seeded generator.

let seed = 1;
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function reseed(s) { seed = s; }

// One swipe starting at t0 (ms). Options: from/peak (px per ms), ramp/hold
// (ms of finger phase), tau (ms, how fast the momentum dies), wobble (how
// unevenly the finger pushes, 1 = +-35%), cut (ms: a new finger lands and
// stops the momentum). Returns the trackpad's raw reports and the end time.
function rawSwipe(t0, o = {}) {
  const raw = []; let t = 0;
  const ramp = o.ramp || 120 + rnd() * 150, hold = o.hold !== undefined ? o.hold : rnd() * 150;
  const peak = o.peak || 3 + rnd() * 6, tau = o.tau || 300 + rnd() * 300, from = o.from || 0.3;
  const wobble = o.wobble === undefined ? 1 : o.wobble;
  while (true) {
    let v;
    if (t < ramp) v = from + (peak - from) * t / ramp;
    else if (t < ramp + hold) v = peak;
    else v = peak * Math.exp(-(t - ramp - hold) / tau);
    if (t < ramp + hold) v *= 1 + (rnd() - 0.5) * 0.7 * wobble;
    if (v < 0.02 || (o.cut && t > o.cut)) break;
    const dt = 1000 / (80 + rnd() * 40);
    raw.push({ t: t0 + t, d: Math.max(1, Math.round(v * dt)) });
    t += dt;
  }
  return { raw, end: t0 + t };
}

// What the page actually receives: raw reports bundled per 60Hz frame.
// Option busy: chance per frame of a 60-250ms stall.
function bundle(raw, o = {}) {
  const out = []; let i = 0, f = raw.length ? raw[0].t : 0;
  while (i < raw.length) {
    f += 1000 / 60;
    if (o.busy && rnd() < o.busy) f += 60 + rnd() * 190;
    while (i < raw.length && raw[i].t > f + 400) f = raw[i].t - 1;       // skip idle time between swipes
    let sum = 0, last = null;
    while (i < raw.length && raw[i].t <= f) { sum += raw[i].d; last = raw[i].t; i++; }
    if (last !== null) out.push({ t: last, d: sum });
  }
  return out;
}

// Scenarios: each returns { ev: the wheel events, want: how many gestures there really are }.
const scenarios = {
  // one big swipe, finger phase then a long coast
  bigSwipe: o => ({ ev: bundle(rawSwipe(0, { wobble: o.wobble }).raw, o), want: 1 }),
  // a second swipe lands while the first is still coasting (no pause between)
  secondDuringCoast: o => {
    const a = rawSwipe(0, { cut: 500 + rnd() * 700 });
    const b = rawSwipe(a.end + 15 + rnd() * 60, { from: 0.2, peak: 2 + rnd() * 4 });
    return { ev: bundle(a.raw.concat(b.raw), o), want: 2 };
  },
  // fingers stop the coast, wait a moment, then swipe
  stopWaitSwipe: o => {
    const a = rawSwipe(0, { cut: 400 + rnd() * 400 });
    const b = rawSwipe(a.end + 180 + rnd() * 200, { from: 0.2, peak: 1 + rnd() * 5 });
    return { ev: bundle(a.raw.concat(b.raw), o), want: 2 };
  },
  // the coast dies out completely, a rest, then a new swipe
  pauseAfterRest: o => {
    const a = rawSwipe(0, {});
    const b = rawSwipe(a.end + 250 + rnd() * 400, { from: 0.1, peak: 1 + rnd() * 5 });
    return { ev: bundle(a.raw.concat(b.raw), o), want: 2 };
  },
  // three quick flicks, each landing on the coast of the one before
  quickFlicks: o => {
    let t = 0, raw = [];
    for (let k = 0; k < 3; k++) {
      const s = rawSwipe(t, { peak: 2 + rnd() * 3, cut: k < 2 ? 250 + rnd() * 300 : 0 });
      raw = raw.concat(s.raw); t = s.end + 15 + rnd() * 50;
    }
    return { ev: bundle(raw, o), want: 3 };
  },
};

// Mouse wheel notches: gaps in ms between notches, each notch the same delta.
function notches(gaps, t0 = 1000, d = 100) { let t = t0; return gaps.map(g => ({ t: (t += g), d })); }

// Run a scenario n times. makeDetector(detectFrom) must return a function
// (t, mag, sign, deltaMode) => isNewGesture. lockMs: the arrival lock, applied
// as if the section is reached 8 frames in (null: no arrival, mid-story).
// Returns how many runs were wrong, and how: over = extra lines would be
// typed, under = a real swipe would be ignored.
function run(makeDetector, name, opts, lockMs, n = 200) {
  let bad = 0, over = 0, under = 0;
  for (let k = 0; k < n; k++) {
    const { ev, want } = scenarios[name](opts);
    const arriveT = ev[Math.min(8, ev.length - 1)].t;
    const isNew = makeDetector(lockMs === null ? 0 : arriveT + lockMs);
    const got = ev.filter(e => isNew(e.t, e.d, 1, 0)).length;
    if (got !== want) bad++;
    if (got > want) over++;
    if (got < want) under++;
  }
  return { bad, over, under, n };
}

module.exports = { reseed, rawSwipe, bundle, scenarios, notches, run };
