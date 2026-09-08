export default function VelaStage({ onCrystalClick }) {
  return (
    <div className="velaStage" aria-label="Vela 占卜舞台">
      <div className="velaStageGlow velaStageGlowLeft" aria-hidden="true" />
      <div className="velaStageGlow velaStageGlowRight" aria-hidden="true" />
      <div className="velaStageStars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="velaCharacterSlot" aria-hidden="true">
        <div className="velaCharacterHalo" />
        <div className="velaCharacterFallback">
          <div className="velaFallbackHat" />
          <div className="velaFallbackHead" />
          <div className="velaFallbackHair velaFallbackHairLeft" />
          <div className="velaFallbackHair velaFallbackHairRight" />
          <div className="velaFallbackBody" />
        </div>
      </div>

      <div className="velaTable" aria-hidden="true">
        <span className="velaTableEdge" />
      </div>

      <button
        className="velaCrystalButton"
        type="button"
        onClick={onCrystalClick}
        aria-label="點水晶球，開始告訴 Vela 你最近在意的事"
      >
        <span className="velaCrystalAura" aria-hidden="true" />
        <span className="velaCrystalBall" aria-hidden="true">
          <span className="velaCrystalMist" />
          <span className="velaCrystalStar">✦</span>
        </span>
        <span className="velaCrystalBase" aria-hidden="true" />
        <span className="velaCrystalHint">點水晶球開始</span>
      </button>
    </div>
  );
}
