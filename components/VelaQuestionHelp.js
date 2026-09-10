"use client";

const GUIDED_CHOICES = [
  { label: "今天的提醒", question: "今天的我最需要注意什麼？" },
  { label: "感情", question: "最近的感情有什麼提醒？" },
  { label: "工作／學業", question: "工作／學業現在最值得留意什麼？" },
  { label: "我可能忽略的事", question: "我現在最容易忽略什麼？" },
  { label: "接下來幾天", question: "接下來幾天，我該把注意力放在哪裡？" },
  { label: "現在最需要聽見的話", question: "現在的我最需要聽見什麼？" },
];

export default function VelaQuestionHelp({ onChooseQuestion, onBack, onAstrology, onDream }) {
  return (
    <div className="velaQuestionHelp">
      <div className="velaDialogueBubble phase12HomeBubble velaQuestionHelpBubble">
        <h1>先選一個最接近的方向。</h1>
      </div>

      <div className="velaQuestionHelpGrid" aria-label="選擇想看的方向">
        {GUIDED_CHOICES.map((item) => (
          <button
            type="button"
            key={item.question}
            onClick={() => onChooseQuestion?.(item.question)}
          >
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>

      <section className="velaQuestionHelpOther" aria-label="其他占卜方式">
        <span>或直接前往</span>
        <div>
          <button type="button" onClick={onAstrology}>
            <b>◎</b><strong>星座運勢</strong>
          </button>
          <button type="button" onClick={onDream}>
            <b>☾</b><strong>解夢</strong>
          </button>
        </div>
      </section>

      <button className="deepTextBack velaQuestionHelpBack" type="button" onClick={onBack}>我想自己說</button>
    </div>
  );
}
