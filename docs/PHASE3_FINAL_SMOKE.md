# Phase 3 final live smoke check

Phase 3 is considered complete only after the real fixed-draw interpretation pipeline passes once against the active Supabase and OpenAI environment.

## Run

From a local checkout that has the production-like `.env.local` values:

```bash
git pull
npm install
npm run smoke:reading
```

Optional custom question and spread:

```bash
npm run smoke:reading -- "這段關係中，我現在最需要留意什麼？" situation-obstacle-advice
```

Supported V1 spread IDs are:

- `single-guidance`
- `past-present-future`
- `situation-obstacle-advice`

## What the command verifies

The command uses the real application functions, not a mocked test path:

1. creates a server-side fixed draw with a fresh idempotency key
2. sends the same reading ID and request ID into `interpretTarotReading`
3. verifies that the interpretation did not redraw or change card positions/orientations
4. retrieves evidence from both committed V1 source books for every drawn card
5. runs Layer A, Layer B, and Layer C through the configured OpenAI model
6. fails if the fixed reading silently degrades to one source book
7. fails if blocked archaic direct-person labels such as `Wicked Man`, `Bad Woman`, `vicious Man`, `Dangerous Man`, or `shady character` leak into the structured reading output

## Pass condition

A successful run prints:

```text
PASS: fixed draw was preserved, both V1 books were represented for every card, and no blocked archaic person labels leaked.
```

After this passes, update `ROADMAP.md` to mark the final Phase 3 smoke item complete and move the current phase to Phase 4.
