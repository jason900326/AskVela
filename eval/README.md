# AskVela evaluation

AskVela keeps a fixed cross-mode case set in `eval/vela-voice-cases.json`.

The same cases are used for both voice checks and Reading Quality so prompt changes are compared against the same Tarot, Astrology, and Dream inputs instead of relying on ad-hoc examples.

## Reading Quality v1

Run all fixed cases:

```bash
npm run eval:reading-quality
```

Run only one mode or a case id fragment:

```bash
npm run eval:reading-quality -- tarot
npm run eval:reading-quality -- dream-falling
```

Useful environment switches:

- `OPENAI_EVAL_MODEL`: model used only as the fixed rubric judge. Defaults to `OPENAI_CHAT_MODEL`.
- `VELA_EVAL_MAX_CASES=1`: quick smoke pass on the first matching case.
- `VELA_EVAL_SKIP_JUDGE=1`: run generation plus deterministic leak / overclaim gates without the second-model scoring call.
- `VELA_EVAL_FAIL_BELOW=4`: optional threshold that makes the command exit non-zero when a judged case falls below the selected overall score.

The evaluator always checks the same six criteria from `eval/reading-quality-rubric.json`:

1. whether the answer really connects to the user's input;
2. whether its Tarot / sky / dream evidence is reasonable;
3. whether it sounds like Vela;
4. whether any follow-up question is genuinely useful (and does not force one when none is needed);
5. whether it avoids deterministic or high-stakes overclaiming;
6. whether Vela's main answer leaks internal authors, source IDs, schema, prompt, or retrieval language.

Results are written to `eval/results/` as JSON plus a review-friendly Markdown worksheet. The evaluator is intentionally a manual / pre-merge command rather than an automatic paid CI job, so every prompt tweak can be checked without silently spending API calls on every Vercel build.

## Existing voice evaluation

The narrower voice-only worksheet is still available:

```bash
npm run eval:voice
```

Use Reading Quality for release decisions; use the voice evaluator when the problem is specifically phrasing, rhythm, or conversational texture.
