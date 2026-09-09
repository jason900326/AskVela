function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const chars = [...String(text || "")];
  const lines = [];
  let current = "";
  for (const char of chars) {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitWrappedText(
  ctx,
  text,
  maxWidth,
  { weight = 800, startSize = 66, minSize = 48, maxLines = 4 } = {},
) {
  let size = startSize;
  let lines = [];

  while (size >= minSize) {
    ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 2;
  }

  return { size, lines: lines.slice(0, maxLines) };
}

function ellipsizeLine(ctx, text, maxWidth) {
  const ellipsis = "…";
  let value = String(text || "");
  if (ctx.measureText(value).width <= maxWidth) return value;

  while (value && ctx.measureText(`${value}${ellipsis}`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}${ellipsis}`;
}

function limitedWrappedLines(ctx, text, maxWidth, maxLines) {
  const lines = wrapText(ctx, text, maxWidth);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = ellipsizeLine(
    ctx,
    `${visible[maxLines - 1]}${lines[maxLines] || ""}`,
    maxWidth,
  );
  return visible;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("無法建立分享圖片。"));
    }, "image/png", 0.95);
  });
}

export async function shareVelaResultCard({
  modeLabel,
  headline,
  subline = "",
  details = [],
}) {
  if (typeof document === "undefined") throw new Error("目前無法建立分享圖片。");

  // 4:5 portrait is the default social share format for Instagram / Threads.
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("目前無法建立分享圖片。");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#261633");
  background.addColorStop(0.52, "#130d1b");
  background.addColorStop(1, "#08070c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(850, 180, 0, 850, 180, 720);
  glow.addColorStop(0, "rgba(199,167,255,.28)");
  glow.addColorStop(1, "rgba(199,167,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const cardX = 54;
  const cardY = 54;
  const cardWidth = 972;
  const cardHeight = 1242;
  const textX = 112;
  const textWidth = 856;
  const footerTop = 1190;

  ctx.strokeStyle = "rgba(231,211,255,.18)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 42);
  ctx.stroke();

  ctx.fillStyle = "#cda9f4";
  ctx.font = "800 28px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText("☾  VELA", textX, 144);

  ctx.fillStyle = "#b996e5";
  ctx.font = "800 25px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText(String(modeLabel || "VELA READING").toUpperCase(), textX, 226);

  const fittedHeadline = fitWrappedText(ctx, headline, textWidth, {
    weight: 800,
    startSize: 66,
    minSize: 48,
    maxLines: 4,
  });
  ctx.fillStyle = "#f5eff7";
  ctx.font = `800 ${fittedHeadline.size}px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif`;
  const headlineLineHeight = Math.round(fittedHeadline.size * 1.28);
  let y = 335;
  for (const line of fittedHeadline.lines) {
    ctx.fillText(line, textX, y);
    y += headlineLineHeight;
  }

  if (subline) {
    y += 28;
    ctx.fillStyle = "#cfc3d5";
    ctx.font = "500 30px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    const sublineLines = limitedWrappedLines(ctx, subline, textWidth, 7);
    for (const line of sublineLines) {
      if (y > footerTop - 210) break;
      ctx.fillText(line, textX, y);
      y += 46;
    }
  }

  const cleanDetails = details.filter(Boolean).slice(0, 3);
  if (cleanDetails.length && y < footerTop - 120) {
    y += 34;
    ctx.strokeStyle = "rgba(231,211,255,.14)";
    ctx.beginPath();
    ctx.moveTo(textX, y - 17);
    ctx.lineTo(textX + textWidth, y - 17);
    ctx.stroke();

    ctx.font = "650 27px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    for (const detail of cleanDetails) {
      const detailLines = limitedWrappedLines(ctx, `✦  ${detail}`, textWidth, 2);
      for (const line of detailLines) {
        if (y > footerTop - 72) break;
        ctx.fillStyle = "#dfd4e5";
        ctx.fillText(line, textX, y);
        y += 42;
      }
      y += 8;
      if (y > footerTop - 72) break;
    }
  }

  ctx.fillStyle = "#9d8da5";
  ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText("ask-vela.vercel.app", textX, 1232);
  ctx.fillText("分享的是這次閱讀的摘要，不是確定的未來。", textX, 1270);

  const blob = await canvasBlob(canvas);
  const file = new File([blob], `vela-${Date.now()}.png`, { type: "image/png" });
  const sharePayload = { title: "Vela Reading", files: [file] };

  if (navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
    await navigator.share(sharePayload);
    return "已開啟分享選單";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "已下載分享圖片";
}
