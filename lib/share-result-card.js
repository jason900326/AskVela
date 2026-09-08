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
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("目前無法建立分享圖片。");

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#261633");
  background.addColorStop(0.52, "#130d1b");
  background.addColorStop(1, "#08070c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(820, 180, 0, 820, 180, 520);
  glow.addColorStop(0, "rgba(199,167,255,.28)");
  glow.addColorStop(1, "rgba(199,167,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.strokeStyle = "rgba(231,211,255,.18)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 70, 72, 940, 1206, 52);
  ctx.stroke();

  ctx.fillStyle = "#cda9f4";
  ctx.font = "800 28px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("☾  VELA", 120, 150);

  ctx.fillStyle = "#b996e5";
  ctx.font = "800 25px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText(String(modeLabel || "VELA READING").toUpperCase(), 120, 245);

  ctx.fillStyle = "#f5eff7";
  ctx.font = "800 62px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  const headlineLines = wrapText(ctx, headline, 820).slice(0, 4);
  let y = 335;
  for (const line of headlineLines) {
    ctx.fillText(line, 120, y);
    y += 82;
  }

  if (subline) {
    y += 18;
    ctx.fillStyle = "#cfc3d5";
    ctx.font = "500 31px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    for (const line of wrapText(ctx, subline, 820).slice(0, 3)) {
      ctx.fillText(line, 120, y);
      y += 48;
    }
  }

  const cleanDetails = details.filter(Boolean).slice(0, 5);
  if (cleanDetails.length) {
    y = Math.max(y + 46, 785);
    ctx.strokeStyle = "rgba(231,211,255,.14)";
    ctx.beginPath();
    ctx.moveTo(120, y - 35);
    ctx.lineTo(960, y - 35);
    ctx.stroke();

    ctx.font = "650 31px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    cleanDetails.forEach((detail) => {
      ctx.fillStyle = "#dfd4e5";
      ctx.fillText(`✦  ${detail}`, 120, y);
      y += 58;
    });
  }

  ctx.fillStyle = "#9d8da5";
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
  ctx.fillText("ask-vela.vercel.app", 120, 1205);
  ctx.fillText("分享的是這次閱讀的摘要，不是確定的未來。", 120, 1250);

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
