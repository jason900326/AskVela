import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "data/processed/**", "mobile/**"]),
  {
    // These interaction components intentionally hydrate/reset local UI state from
    // browser-only session/auth state. Keep the exception narrow instead of
    // disabling the React 19 rule for the whole project.
    files: [
      "components/AstrologyReadingFlow.js",
      "components/DreamReadingFlow.js",
      "components/PendingAuthResume.js",
      "components/TarotReadingFlow.js",
      "components/TarotReadingFlowV4.js",
      "components/VelaAccount.js",
      "components/VelaWaitingStage.js",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // FreeQuickTarot uses Date.now only inside explicit user-event async handlers
    // to keep the chosen-card/reveal beats at a minimum duration while network
    // work runs in parallel. It is not used to derive render output.
    files: ["components/FreeQuickTarot.js"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
]);
