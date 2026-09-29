#!/usr/bin/env node
// Tests for squarespace/v2-sentence-steps.html. Run from anywhere:
//   node test/wheel-detector.test.js            (tests the section file)
//   node test/wheel-detector.test.js some.html  (tests another copy of it)
// Needs Node, nothing else. Exits non-zero if anything fails.
//
// 1. The section's script parses, and its CONFIG is consistent (every
//    CFG.something the script reads is defined).
// 2. The wheel-gesture detector, isNewGesture, lifted straight out of the
//    file, is run against simulated Mac trackpad and mouse input (see
//    wheel-sim.js), 200 randomised runs per case. The limits say what
//    matters: a big swipe that arrives, even on a very busy page, must not
//    type extra lines; second swipes, pauses and quick flicks must be
//    recognised; a very busy page may cost the odd flick, never extra lines.
//    The limits sit just above today's results, so a regression fails loudly.
// Touch can't be simulated here: test phones by hand.

const fs = require('fs');
const path = require('path');
const sim = require('./wheel-sim');

const FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'squarespace', 'v2-sentence-steps.html');
console.log('testing ' + path.relative(process.cwd(), FILE) + '\n');
let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
}

// ---------- 1. the file ----------
const src = fs.readFileSync(FILE, 'utf8');
const open = src.indexOf('<script>'), close = src.lastIndexOf('</script>');
const js = src.slice(open + 8, close);
let parses = true;
try { new Function(js); } catch (e) { parses = false; check(false, 'section script parses', e.message); }
if (parses) check(true, 'section script parses');

const cfgStart = js.indexOf('var CFG = {'), cfgEnd = js.indexOf('};', cfgStart);
const cfgText = js.slice(cfgStart, cfgEnd);
const defined = new Set([...cfgText.matchAll(/^\s*(\w+):/gm)].map(m => m[1]));
const read = new Set([...js.matchAll(/CFG\.(\w+)/g)].map(m => m[1]));
const missing = [...read].filter(k => !defined.has(k)), unused = [...defined].filter(k => !read.has(k));
check(missing.length === 0, 'every CFG setting the script reads is defined', missing.length ? 'missing: ' + missing.join(', ') : '');
if (unused.length) console.log('note  CFG settings nothing reads: ' + unused.join(', '));

function cfgNumber(name) {
  const m = cfgText.match(new RegExp('^\\s*' + name + ':\\s*([\\d.]+)', 'm'));
  if (!m) { check(false, `CFG.${name} found in the file`); return NaN; }
  return parseFloat(m[1]);
}
const CFG = { gestureGap: cfgNumber('gestureGap') };
const ARRIVE_LOCK = cfgNumber('arriveLock');

// ---------- 2. the detector ----------
const a = js.indexOf('    function isNewGesture('), b = js.indexOf('\n    }\n', a) + 7;
if (a < 0 || b < 7) { check(false, 'isNewGesture found in the file'); finish(); }
// The state isNewGesture keeps between events. If it gains a new variable,
// add it here (the test says so with a ReferenceError below).
const STATE = 'var hist = [], risingRun = 0, gPeak = 0, gLow = 0, lastV = 0, lastSign = 0,' +
              ' lastDt = Infinity, lastDt2 = Infinity, lastDt3 = Infinity;';
const factory = new Function('CFG', 'detectFrom', STATE + '\n' + js.slice(a, b) +
  '\nreturn function (t, mag, sign, deltaMode) { return isNewGesture(t, mag, sign, deltaMode); };');
const makeDetector = detectFrom => factory(CFG, detectFrom);
try { makeDetector(0)(0, 10, 1, 0); makeDetector(0)(16, 10, 1, 0); }
catch (e) { check(false, 'isNewGesture runs in the test harness', e.message + ' (a new state variable? add it to STATE in this test)'); finish(); }

console.log('\nwheel detector, 200 randomised runs per case (over = extra lines typed, under = a swipe ignored)');
const cases = [
  // name,               scenario,            options,                        lock,        max over, max under
  ['arrive: big swipe',          'bigSwipe',          { wobble: 1 },                 ARRIVE_LOCK, 2, 0],
  ['arrive: busy page',          'bigSwipe',          { wobble: 1, busy: 0.04 },     ARRIVE_LOCK, 2, 0],
  ['arrive: very busy page',     'bigSwipe',          { wobble: 2, busy: 0.08 },     ARRIVE_LOCK, 2, 0],
  ['mid: big swipe, busy page',  'bigSwipe',          { wobble: 1, busy: 0.04 },     null,        4, 0],
  ['mid: 2nd swipe on a coast',  'secondDuringCoast', {},                            null,        4, 4],
  ['mid: 2nd on a coast, busy',  'secondDuringCoast', { busy: 0.04 },                null,        6, 30],
  ['mid: stop, wait, swipe',     'stopWaitSwipe',     {},                            null,        4, 4],
  ['mid: rest, then swipe',      'pauseAfterRest',    {},                            null,        4, 4],
  ['mid: 3 quick flicks',        'quickFlicks',       {},                            null,        4, 4],
  ['mid: 3 flicks, busy page',   'quickFlicks',       { busy: 0.04 },                null,        8, 70],
];
for (const [label, name, opts, lock, maxOver, maxUnder] of cases) {
  sim.reseed(11);
  const r = sim.run(lock === null ? () => makeDetector(0) : makeDetector, name, opts, lock);
  check(r.over <= maxOver && r.under <= maxUnder, label.padEnd(28),
        `over ${String(r.over).padStart(3)} (max ${maxOver})   under ${String(r.under).padStart(3)} (max ${maxUnder})`);
}

console.log('\nmouse wheel and direction');
const count = (ev, lockEnd, signs) => { const f = makeDetector(lockEnd); return ev.filter((e, i) => f(e.t, e.d, signs ? signs[i] : 1, 0)).length; };
const slow = sim.notches([0, 250, 320, 210, 380]);
check(count(slow, 0) === 5, 'slow mouse notches: each one is a step'.padEnd(46), `got ${count(slow, 0)}, want 5`);
const spin = sim.notches([0, 40, 40, 40, 40, 40, 40, 40]);
const spinArrive = count(spin, spin[1].t + ARRIVE_LOCK);
check(spinArrive === 1, 'a fast spin that arrives is swallowed'.padEnd(46), `got ${spinArrive}, want 1`);
sim.reseed(3);
const down = sim.bundle(sim.rawSwipe(0, { peak: 4 }).raw), last = down[down.length - 1].t;
const up = sim.bundle(sim.rawSwipe(last + 40, { peak: 4 }).raw);
const turns = count(down.concat(up), 0, down.map(() => 1).concat(up.map(() => -1)));
check(turns === 2, 'a change of direction is always a new gesture'.padEnd(46), `got ${turns}, want 2`);
const upArrive = count(down.concat(up), 1e9, down.map(() => 1).concat(up.map(() => -1)));   // locked throughout
check(upArrive === 2, '...even inside the arrival lock'.padEnd(46), `got ${upArrive}, want 2`);

finish();

function finish() {
  console.log(failures ? `\n${failures} check${failures > 1 ? 's' : ''} failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
}
