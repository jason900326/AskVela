const SHARE_WIDTH = 1080;
const SHARE_HEIGHT = 1350;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("無法載入塔羅牌圖片。"));
    image.src = src;
  });
}

function wrapCharacters(ctx, text, maxWidth, maxLines = 4) {
  const chars = Array.from(String(text || "").trim());
  const lines = [];
  let line = "";

  for (const char of chars) {
    const candidate = `${line}${char}`;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }

  if (lines.length < maxLines && line) lines.push(line);
  if (chars.length && lines.length === maxLines) {
    const joined = lines.join("");
    if (joined.length < chars.length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/…$/, "")}…`;
  }
  return lines;
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function drawContainedImage(ctx, image, x, y, width, height, reversed) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) drawHeight = width / imageRatio;
  else drawWidth = height * imageRatio;

  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  if (reversed) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } else {
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }
  ctx.restore();
}

export async function buildTarotSharePng({ question, cardName, orientation, overview, imageSrc, reversed = false }) {
  if (typeof document === "undefined") throw new Error("目前無法產生分享圖片。");

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("目前無法產生分享圖片。");

  const gradient = ctx.createLinearGradient(0, 0, 0, SHARE_HEIGHT);
  gradient.addColorStop(0, "#1b0f31");
  gradient.addColorStop(0.55, "#10091f");
  gradient.addColorStop(1, "#090511");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  const halo = ctx.createRadialGradient(540, 490, 40, 540, 490, 470);
  halo.addColorStop(0, "rgba(177, 118, 228, .28)");
  halo.addColorStop(1, "rgba(177, 118, 228, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, SHARE_WIDTH, 980);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e7c66f";
  ctx.font = "700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("VELA · ONE CARD", 540, 82);

  ctx.fillStyle = "rgba(248, 242, 255, .72)";
  ctx.font = "500 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const questionLines = wrapCharacters(ctx, question, 860, 2);
  drawLines(ctx, questionLines, 540, 145, 48);

  const image = await loadImage(imageSrc);
  const cardX = 350;
  const cardY = 275;
  const cardWidth = 380;
  const cardHeight = 650;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .55)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = "rgba(25, 14, 42, .92)";
  ctx.fillRect(cardX - 8, cardY - 8, cardWidth + 16, cardHeight + 16);
  ctx.restore();
  drawContainedImage(ctx, image, cardX, cardY, cardWidth, cardHeight, reversed);

  ctx.fillStyle = "#faf4ff";
  ctx.font = "750 58px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(cardName || "你的塔羅牌", 540, 1010);

  ctx.fillStyle = "#e7c66f";
  ctx.font = "650 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(orientation || "", 540, 1058);

  ctx.fillStyle = "rgba(248, 242, 255, .86)";
  ctx.font = "500 31px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const overviewLines = wrapCharacters(ctx, overview, 850, 4);
  drawLines(ctx, overviewLines, 540, 1135, 46);

  ctx.fillStyle = "rgba(248, 242, 255, .42)";
  ctx.font = "500 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("AskVela · 你的這一張牌", 540, 1300);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("目前無法產生分享圖片。"));
    }, "image/png", 1);
  });
}

export async function shareTarotPng(blob) {
  const filename = `askvela-tarot-${new Date().toISOString().slice(0, 10)}.png`;

  try {
    if (typeof File !== "undefined" && navigator?.share) {
      const file = new File([blob], filename, { type: "image/png" });
      let canShareFiles = false;
      try { canShareFiles = navigator.canShare?.({ files: [file] }) === true; } catch { /* fallback below */ }
      if (canShareFiles) {
        await navigator.share({ title: "AskVela 塔羅", files: [file] });
        return "shared";
      }
    }
  } catch (error) {
    if (error?.name === "AbortError") return "cancelled";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
