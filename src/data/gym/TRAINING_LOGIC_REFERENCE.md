# Gym Module — Training Logic Reference

This explains the decisions baked into the three data files so a future you (or a contributor) can change them safely. The files are the source of truth; this doc is the *why*.

- `exercise_catalog.json` — 45 exercises, each with primary/secondary muscles, movement type, equipment, default rep range, a one-line execution cue, and a default rest period.
- `base_program.json` — the balanced 3-day Upper/Lower/Upper split. The starting point before any specialization.
- `specialization_rules.json` — the per-muscle add/reduce/cap rules applied on top of the base.

## The evidence base

Two pillars, both mainstream and well-supported:

1. **Frequency:** each muscle is trained at least 2x/week (legs 1x by deliberate upper-body-priority design). This follows the Schoenfeld/Ogborn/Krieger meta-analytic finding that 2x beats 1x for hypertrophy when volume is equated.

2. **Volume landmarks (MEV / MAV / MRV):** the Renaissance Periodization framework (Israetel, Hoffmann). MEV is the least volume that grows a muscle, MAV is the productive sweet spot, MRV is the ceiling beyond which recovery fails. The per-muscle numbers in `specialization_rules.json → _meta.volume_landmarks_reference` are the consensus values. Two facts drive the design: side delts and biceps tolerate high volume at low systemic cost; quads and hamstrings have lower ceilings because heavy leg work is systemically taxing.

Counting convention (also RP): a set counts toward a muscle only when that muscle is the **prime mover** or the exercise is direct isolation for it. Bench press counts to chest, not to triceps/front delts. This avoids double-counting and is why the baseline volume table looks the way it does.

## Why the base program is built this way

- **Upper twice, lower once.** The user's stated priority is upper body. Legs still get a full session (squat + RDL covers quads, hams, glutes), but the two upper days are where frequency doubles.
- **Compounds first, isolation last.** Fatigue management — you press and pull heavy while fresh, then isolate.
- **Incline before flat** on push day: upper chest is the common lagging region, so it gets the freshest effort.
- **Starting volumes sit near MEV, not MAV.** The program intentionally opens at the *low* end (chest 9, back ~12 from stacked pulling, biceps/triceps 3 each). This is correct mesocycle design: start near MEV, add sets over the block, deload, repeat. Starting at the ceiling leaves nowhere to progress and invites early burnout.
- **Double progression.** Add load only when all working sets hit the top of the rep range at the target RIR. Reps first, then weight. This is the single rule that turns logging into growth.
- **Deload every 7 weeks.** Configurable. Same lifts, ~60% load, ~half the sets, one week.

## Why the specialization rules are built this way

Picking a muscle does three things: **add** direct sets for it, **reduce** a little elsewhere to protect recovery, and respect a **cap** so it can't become junk volume.

- **Add amounts** push the target from its baseline into the middle of its MAV range — not to MRV. Example: biceps 3 → 10 (MAV is 14-20, so 10 is a strong, recoverable dose with room to add sets across the block).
- **Reductions** come off muscles that are either already well-served or that compete for the same recovery/joints. Biceps specialization trims a back-row set (back is already high-volume and rows tax the biceps and elbows). Chest specialization trims a row; back specialization trims a press. Side-delt, rear-delt, calf, ab, and forearm specializations need **no** reduction because they add little systemic fatigue — reflected in empty `reduce` arrays.
- **Caps** are set below each muscle's MRV so that even after a full block of adding sets, the user stays recoverable. The generator must hard-refuse to exceed the cap.

The simulation across all 11 muscles confirms every specialization lands in the productive zone and none breaches its cap (biceps 10/22, triceps 9/18, chest 15/20, back 17/24, side delts 13/26, rear delts 9/22, quads 10/20, hams 9/18, calves 9/18, abs 9/20, forearms 5/16).

## The generator contract (for whoever builds Phase 1)

A pure function: `(base_program, specialization_muscle | null, rules) → program_day_exercises[]`.

1. Deep-copy the base days.
2. If a muscle is specified: apply its `reduce` list (lower matching slots to `sets_to`, never below 1, skip if the slot is absent), then append its `add` list as new slots with `is_specialization = true`.
3. Before returning, recompute weekly direct sets for the target muscle and assert it is `<= weekly_cap_sets`. If a future rule edit would exceed it, fail loudly rather than write bad volume.
4. Must be **idempotent**: base → specialize → reset → re-specialize produces identical output with no duplicate slots. Always regenerate from the base, never mutate the already-generated program in place.

## Things deliberately left out

No periodized rep-range waves, no RPE autoregulation engine, no per-set rest-pause/drop-set schemes, no nutrition. These are real and useful but they are v2+. The honest minimum that produces growth is: the right exercises, 2x frequency, volume starting near MEV and progressed via double progression, a recovery-protecting specialization layer, and accurate logging. That is what these three files encode.

## Tuning later

Everything adjustable lives in the JSON. To make biceps specialization more aggressive, raise the add sets and the cap together (never the cap alone). To add an exercise, append to the catalog with correct `primary_muscle` and it becomes available as a swap and a possible specialization add. The component code should never hardcode any of this.
