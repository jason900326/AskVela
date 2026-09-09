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

  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("目前無法建立分享圖片。");

  const background = ctx.createLinearGradient(0, 0, 1600, 900);
  background.addColorStop(0, "#261633");
  background.addColorStop(0.52, "#130d1b");
  background.addColorStop(1, "#08070c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1600, 900);

  const glow = ctx.createRadialGradient(1260, 150, 0, 1260, 150, 650);
  glow.addColorStop(0, "rgba(199,167,255,.28)");
  glow.addColorStop(1, "rgba(199,167,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1600, 900);

  ctx.strokeStyle = "rgba(231,211,255,.18)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 70, 58, 1460, 784, 48);
  ctx.stroke();

  ctx.fillStyle = "#cda9f4";
  ctx.font = "800 30px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("☾  VELA", 130, 135);

  ctx.fillStyle = "#b996e5";
  ctx.font = "800 27px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText(String(modeLabel || "VELA READING").toUpperCase(), 130, 220);

  ctx.fillStyle = "#f5eff7";
  ctx.font = "800 72px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  const headlineLines = wrapText(ctx, headline, 1340).slice(0, 3);
  let y = 335;
  for (const line of headlineLines) {
    ctx.fillText(line, 130, y);
    y += 88;
  }

  if (subline) {
    y += 12;
    ctx.fillStyle = "#cfc3d5";
    ctx.font = "500 32px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    for (const line of wrapText(ctx, subline, 1340).slice(0, 3)) {
      ctx.fillText(line, 130, y);
      y += 48;
    }
  }

  const cleanDetails = details.filter(Boolean).slice(0, 3);
  if (cleanDetails.length && y < 710) {
    y = Math.max(y + 28, 610);
    ctx.strokeStyle = "rgba(231,211,255,.14)";
    ctx.beginPath();
    ctx.moveTo(130, y - 26);
    ctx.lineTo(1470, y - 26);
    ctx.stroke();

    ctx.font = "650 29px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    for (const detail of cleanDetails) {
      if (y > 735) break;
      ctx.fillStyle = "#dfd4e5";
      ctx.fillText(`✦  ${detail}`, 130, y);
      y += 48;
    }
  }

  ctx.fillStyle = "#9d8da5";
  ctx.font = "500 23px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText("ask-vela.vercel.app", 130, 790);
  ctx.fillText("分享的是這次閱讀的摘要，不是確定的未來。", 130, 826);

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
