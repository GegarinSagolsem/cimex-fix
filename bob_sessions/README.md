# IBM Bob task-session screenshots

One summary screenshot per IBM Bob task used to build and run Cimex Fix. Bobcoins are from Bob's own task log
(`~/.bob/db/bob.db`) and match [`docs/benchmark.md`](../docs/benchmark.md#bobcoins-ibm-bob-task-log).

**About the names:** the project was called **BugProof** until 26 Sep 2026 and every screenshot predates the rename, so
they show modes like "BugProof Lead" and links to `bugproof-web.vercel.app`, the old domain of the same Mission Control
(it still serves the same site as https://cimex-fix.vercel.app). The mode IDs and the MCP server are still named
`bugproof` inside the Bob pack.

| # | Screenshot | What Bob did | Case (Proof of Fix) | Bob task | Bobcoins |
|---|---|---|---|---|---|
| 01 | [`task01`](bugproof_task01_init_agents_md_summary.png) | Setup: `/init` → `AGENTS.md` | — | `794925d4` | 1.13 |
| 02 | [`task02`](bugproof_task02_custom_modes_rules_summary.png) | Setup: custom modes + rules | — | `3c8fbd68` | 0.40 |
| 03 | [`task03`](bugproof_task03_skills_summary.png) | Setup: skills | — | `bd8ce5cf` | 0.40 |
| 04 | [`task04`](bugproof_task04_mcp_server_summary.png) | Setup: MCP server | — | `f49dc8b4` | 2.90 |
| 05 | [`task05`](bugproof_task05_first_run_bug04_summary.png) | Run bug #4 (pagination) | [`case_20260925_34fd`](https://cimex-fix.vercel.app/cases/case_20260925_34fd/proof) | `e7b06407` | 2.84 |
| 06 | [`task06`](bugproof_task06_run_bug06_summary.png) | Run bug #6 (negative quantity) | [`case_20260925_318b`](https://cimex-fix.vercel.app/cases/case_20260925_318b/proof) | `8c239418` | 2.78 |
| 07 | [`task07`](bugproof_task07_run_bug01_hero_summary.png) | Run bug #1 (₹NaN total) | [`case_20260925_bf62`](https://cimex-fix.vercel.app/cases/case_20260925_bf62/proof) | `63a1a929` | 4.91 |
| 08 | [`task08`](bugproof_task08_run_bug03_summary.png) | Run bug #3 (delivery date, PDF intake) | [`case_20260926_2c6c`](https://cimex-fix.vercel.app/cases/case_20260926_2c6c/proof) | `3f521cac` | 2.39 |
| 09 | [`task09`](bugproof_task09_run_bug08_summary.png) | Run bug #8 (coupon twice, screenshot intake) | [`case_20260926_db4f`](https://cimex-fix.vercel.app/cases/case_20260926_db4f/proof) | `80751800` | 5.36 |
| 10 | [`task10`](bugproof_task10_rebisect_bug03_bug08_summary.png) | Re-bisect bugs #3 and #8 | #3, #8 | `9537be04` | 0.17 |
| 11 | [`task11`](bugproof_task11_rebisect_bug04_summary.png) | Re-bisect bug #4 | #4 | `6e20b35a` | 0.09 |
| 12 | [`task12`](bugproof_task12_run_bug05_summary.png) | Run bug #5 (search case) — the recorded run | [`case_20260926_7e5e`](https://cimex-fix.vercel.app/cases/case_20260926_7e5e/proof) | `630c6c30` | 3.06 |
| 13 | [`task13`](bugproof_task13_rebisect_bug01_summary.png) | Re-bisect bug #1 | #1 | `ad18a84d` | 0.09 |
| 14 | [`task14`](bugproof_task14_run_bug07_summary.png) | Run bug #7 (double order) | [`case_20260926_9afc`](https://cimex-fix.vercel.app/cases/case_20260926_9afc/proof) | `fbb5639e` | 2.54 |
| 15 | [`task15`](bugproof_task15_rebisect_bug07_summary.png) | Symptom-only test + re-bisect bug #7 | #7 | `1247fe95` | 0.55 |
| 16 | [`task16`](bugproof_task16_run_bug02_summary.png) | Run bug #2 (GST rounding) | [`case_20260926_b86b`](https://cimex-fix.vercel.app/cases/case_20260926_b86b/proof) | `5f521016` | 3.03 |
| | | | | **Total** | **32.64** |
