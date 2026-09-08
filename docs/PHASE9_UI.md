# Phase 9 — Final Vela UI / UX

Phase 9 turns the working three-mode product into one coherent Vela experience without coupling product logic to unfinished artwork.

## Interaction model

The home remains conversation-first:

1. Vela is the visual anchor.
2. The user may click the crystal ball or choose **我有件事想問你** to describe what is on their mind.
3. Users who cannot form a question may use the guided path.
4. Vela recommends Tarot, Astrology, or Dream from the user's message instead of requiring a mode choice first.

The crystal ball is an interaction affordance, not a separate fourth flow. Clicking it opens the same free-form conversation entry.

## Visual structure

Desktop home:

- left: Vela stage
- right: Vela dialogue
- below: free-form / guided entry and quick prompts

Mobile home:

- Vela stage
- dialogue
- entry controls

The visual hierarchy should still make sense when artwork is unavailable or slow to load.

## Final Vela artwork contract

Canonical home artwork path:

`public/vela/vela-home.webp`

The `VelaStage` component automatically attempts this path. If the image is unavailable, the built-in fallback remains visible. When the image loads successfully, the fallback is hidden automatically.

### Required artwork characteristics

- transparent background
- Vela character only
- no crystal ball
- no table
- no room/background
- no text/logo
- no hard rectangular frame
- centered composition
- upper body / seated fortune-teller framing works best
- leave breathing room around hat/hair edges

Recommended source canvas: **1200 × 1200 px or larger**, exported as WebP with transparency.

The browser renders it with `object-fit: contain`, so exact source dimensions are less important than a clean transparent silhouette and consistent character scale.

### Why the crystal ball must remain separate

The crystal ball is rendered by the interface because it is interactive and animated. Keeping it separate lets us:

- click/tap it as a real control
- animate glow/mist independently
- disable motion for `prefers-reduced-motion`
- keep the same interaction when Vela artwork changes
- add Tarot / Astrology / Dream variants later without redrawing UI controls into every image

## Future mode artwork

Phase 10 may add:

- `public/vela/vela-tarot.webp`
- `public/vela/vela-astrology.webp`
- `public/vela/vela-dream.webp`

Do not wire these into the product until the visual variants are approved. The home character remains the canonical visual identity.

## Accessibility contract

- Crystal ball has an explicit accessible label.
- Keyboard focus is visible across buttons, links, inputs, textareas, and disclosure summaries.
- Motion is reduced globally when the user requests reduced motion.
- UI does not depend on animation to communicate state.
- Final character art is decorative; product meaning remains available in text.

## Phase 9 completion boundary

Code-side UI foundation is complete when:

- the reusable Vela stage is in place
- the crystal ball is an actual accessible CTA
- desktop/mobile composition is responsive
- focus, disabled, loading, and error states share the Vela visual system
- reduced-motion behavior is respected
- final artwork can be installed without changing flow logic

Phase 9 is **not fully complete** until the approved final Vela illustration replaces the fallback and the deployed page receives a mobile/desktop visual acceptance pass.
