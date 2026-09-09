import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "data/processed/**"]),
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
]);
