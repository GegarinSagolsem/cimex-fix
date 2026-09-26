# Submission video — plan and script

**Target:** 2:55 (limit 3:00), 1920×1080, 30 fps, with ≥ 90 s of live demo (0:40–2:12 = 92 s).
**Story:** a short detective film. The bug is the crime, `git bisect` finds the suspect, the Critic
cross-examines, the verdict is PROVEN. Supersedes the draft in Plan.md §12 (hooks and "PR per fix" dropped;
the one-shot model comparison added).

## Source footage

`rawvideo/bugproof_video_run_bug05_raw.mp4` (gitignored): 8:11, 1918×1142, **no audio**. Split screen: left =
Mission Control in the old dark "BugProof" UI (the cases board never updates during the run → **crop it out**);
right = the Bob IDE (x 960–1918), readable when cropped. Raw time ≈ case time (open_case at raw ~0:12).

| Raw | What's on screen (Bob panel) | Case time (events) |
|---|---|---|
| 0:00–0:12 | Prompt: "A customer opened this issue: intake/bug-05-issue.md. Prove and fix the bug it describes…", mode **BugProof Lead**, coins 0.029 | — |
| 0:15–2:30 | Open case → "Now spawning all three subagents in parallel" (Triage 10 s · Locator 50 s · Historian 1m 44s); "Approve once" clicks | TRIAGE_COMPLETE 2:10 |
| 2:30–3:25 | Reproducer subtask: writes `tests/bugproof/bug-05-search-case.test.ts`, `run_tests {expect: red}` → 3 failed | REPRO_READY 3:11 |
| 3:25–4:10 | "RED test is confirmed. Now running bisect" → culprit `649b24a perf(catalog): memoize search index` | BISECT_DONE 4:01 |
| 4:10–5:45 | Fixer subtask: 3-line fix, repro GREEN, full suite 117/117 | FIX_GREEN 5:25 |
| 5:45–7:35 | Critic subtask: checklist → **Verdict: APPROVE** | APPROVED 7:21 |
| 7:35–8:11 | Publish proof (approval) → "All tasks completed!": before/after table + evidence chain, coins 3.06 | proven 7:44 |

## Structure

| # | Time | Section | Picture |
|---|---|---|---|
| A | 0:00–0:14 | Cold open | The launch teaser's hook ("Fixed the search bug ✅ · Trust me." → **Prove it.**) and reveal |
| B | 0:14–0:28 | The problem | Two cited stat cards + "Reviewers get a patch, not proof." |
| C | 0:28–0:40 | The cast | Mode cards with their edit scopes (Lead · 3 investigators · Reproducer · Fixer · Critic) |
| D | 0:40–2:12 | **Live run, case #5** | Bob panel (cropped, pan/zoom to the active message) + right-hand "case file" driven by the real event times: run clock, milestones lighting up, evidence snippets. Banner: "LIVE RUN · recorded 26 Sep 2026 · ⏩ = sped up". |
| E | 2:12–2:30 | Proof of Fix | Current site: PROVEN stamp, 5 checks, fix diff, verify-it-yourself commands |
| F | 2:30–2:46 | The payoff | Model comparison (7 models) → the bug #1 miss → "8 bugs, 8 proofs" |
| G | 2:46–2:55 | Outro | Teaser outro: Cimex Fix · No fix without proof · cimex-fix.vercel.app · Built on IBM Bob · IBM watsonx.ai |

### D in detail (92 s)

| Chapter card | Time | Raw | Speed | Zoom target | Milestone chip (real) |
|---|---|---|---|---|---|
| I · The report | 0:40–0:50 | intake card, then 0:00–0:12 | 1× | the prompt | — |
| II · The witnesses | 0:50–1:00 | 0:12–2:30 | ⏩ 14× | subagent list | — |
| III · The reenactment | 1:00–1:14 | 2:30–3:25 | ⏩ 4× | test file → "3 failed" | RED · 3m 12s |
| IV · The suspect | 1:14–1:28 | 3:25–4:10 | ⏩ 3× | bisect result | CULPRIT 649b24a · 4m 01s |
| V · The fix | 1:28–1:42 | 4:10–5:45 | ⏩ 7× | "117 passed" | GREEN 117/117 · 5m 25s |
| VI · The cross-examination | 1:42–1:56 | 5:45–7:35 | ⏩ 8× | Verdict APPROVE | APPROVED · 7m 21s |
| VII · The verdict | 1:56–2:12 | 7:35–8:11 + hold | ⏩ 2.5× | evidence chain | **PROVEN · 7m 44s · 0 human prompts · 3.06 Bobcoins** |

First demo caption (small, once): "Recorded live on 26 Sep 2026, before the rename: BugProof = Cimex Fix."
Approvals caption (II, once): "Bob asks before each tool runs: one click to approve."

## Voiceover script (≈ 345 words, ~120 wpm)

**A · Cold open**
- (0:00, under the typing) "Every AI assistant ends the same way."
- (after the slam) "We don't take its word for it."
- (reveal) "This is Cimex Fix, built on IBM Bob. No fix without proof."

**B · The problem**
- "In Stack Overflow's 2025 survey, two thirds of developers said their top frustration with AI is solutions that are almost right, but not quite."
- "Almost right still ships the bug. And the reviewer gets a patch, not proof."

**C · The cast**
- "So we turned IBM Bob into a detective agency. A Lead runs the case. Three investigators work in parallel."
- "The Reproducer may only write tests. The Fixer may only touch source code. And the Critic can't edit anything at all."

**D · Live run**
- I: "Case five. A customer writes in: search is broken. Type 'mug', get nothing. We hand the report to Bob's Lead. That's the last thing we type."
- II: "Triage reads the report. Locator maps the code. Historian digs through the commits. All at once."
- III: "Before anyone fixes anything, the Reproducer recreates the crime: a test that fails exactly the way the customer saw it. Three assertions. Three failures. Red."
- IV: "Then git bisect walks that test back through history. Six steps. One suspect: a commit that memoized the search index, and quietly dropped the lowercase."
- V: "The Fixer may edit source, never tests. Three lines later, the repro test passes. So does the full suite: one hundred seventeen of one hundred seventeen."
- VI: "The Critic tries to break it: edge cases, callers, side effects. Verdict: approve."
- VII: "Seven minutes and forty-four seconds after the report: case closed. For about three Bobcoins."

**E · Proof of Fix**
- "Every case ends in a Proof of Fix: the failing test, the culprit, the diff, the review, and proof the fix changed no existing test."
- "Plus the commands to check it yourself. Don't trust us either."

**F · The payoff**
- "We gave the same eight bugs to seven AI models, one answer each."
- "Two frontier models wrote the same wrong fix for the same bug, and their own tests passed. Only the checks caught it."
- "Cimex Fix: eight bugs, eight proofs."

**G · Outro**
- "Cimex Fix. No fix without proof."

Every claim is checked against docs/benchmark.md / docs/sources.md: 66% "almost right" (SO 2025); 3 of 3
repro tests RED; 6 bisect steps; 3-line fix; 117/117; Critic APPROVE; 7m 44s; 0 human prompts; 3.06 Bobcoins;
Gemini 3.1 Pro and Claude Opus 4.6 both missed bug #1 with an empty-coupon-throws fix whose own tests passed.

## Captions

- Burned in: sentence-level, max 2 lines × 42 chars, IBM Plex Sans 38 px, white on a 70 % black pill, bottom
  centre, timed from the voice clips. Also exported as `cimex-fix-video.srt` for YouTube.
- On-screen labels are separate from captions: chapter cards, ⏩ speed badges, run clock, milestone chips,
  source lines under stats ("Stack Overflow Developer Survey 2025").

## Sound

- **Music:** one score in D minor at 120 BPM, continuous with the teaser. Cold open = the teaser's punchy cue;
  B–C = sparse pad + soft pulse; D = an "investigation" groove (filtered drums, pulsing bass, ticking hats) that
  adds a layer per chapter, a subtle riser under each ⏩ segment, a drop for the fix, a build into the verdict,
  a big hit on PROVEN; E–F = lighter and warm; G = final hit and ring-out.
- **SFX (same key, blended):** keyboard ticks on the prompt, a soft click on each "Approve once", whoosh on
  chapter cards, the RED blip, six bisect ticks, check plucks, the PROVEN stamp.
- **Mix:** voice on top; music ducked ~12 dB under the voice (sidechain, 200 ms attack / 400 ms release);
  integrated −14 LUFS, true peak −1.5 dB.

## Build

Same pipeline as the teaser: ffmpeg cuts, crops and speeds the raw segments into a base layer; an HTML
composition (every frame a function of time) renders overlays, cards and captions; ffmpeg composites, adds
voice + music, and bakes a poster as frame 0. Proof and Impact scenes use the current live site.
