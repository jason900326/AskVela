# AskVela Mobile Prototype

This folder is an isolated Expo / React Native vertical slice. It does **not** replace the existing Next.js web app yet.

## Goal

Validate the first ~60 seconds of the character-driven Tarot experience before connecting production AI, auth, history, subscriptions, or the existing RAG pipeline.

Current slice:

1. Off-duty Vela idle scene
2. User asks for Tarot
3. Short preparation sequence with Vela-style loading copy
4. Twelve face-down cards
5. Pick three cards
6. 5% per-reading chance of a different-backed Vela business card easter egg
7. Lock the three selected cards
8. Reveal them one by one
9. Device vibration on selection / reveal
10. Vela reaction copy changes as cards are revealed

The Tarot results in this prototype are intentionally local fake data. That is deliberate: this slice is testing interaction, pacing, and character presence rather than the reading engine, which already exists in the web project.

## Run locally

From the repository root:

```bash
cd mobile
npm install
npx expo install --fix
npm start
```

Then open the project in Expo Go on the phone.

## Art handoff

The current Vela figure is a placeholder made entirely with React Native views. Do not polish it.

The first two final-ish art assets we need are:

- `vela-idle.png` — off-duty / messy / relaxed Vela
- `vela-tarot-ready.png` — groomed, seated, ready-to-read Vela

Prefer transparent PNG/WebP with matching framing and canvas size so the app can swap states without the character jumping around.

After those two assets exist, the next art states should be added only if the prototype proves fun:

- surprised
- watching-card-selection
- curious
- concerned
- thinking
- talking
- reaching-for-business-card

## Not in this slice

- Supabase auth
- Google login
- production Tarot API / RAG
- saved history
- Astrology
- Dream interpretation
- payments / entitlements
- full character video animation
- sound design

Those are intentionally postponed until the interaction itself feels right.
