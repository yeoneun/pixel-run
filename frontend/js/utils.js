export function drawPlaceholder(ctx, x, y, w, h, label) {
  ctx.save();
  ctx.fillStyle = "rgba(76, 175, 80, 0.4)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(76, 175, 80, 0.8)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  if (label) {
    const fontSize = Math.max(8, Math.min(12, (w / label.length) * 1.5));
    ctx.fillStyle = "#000000";
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

// text가 maxWidth 안에 들어가도록 baseSize에서 줄인 폰트 크기를 반환한다.
// makeFont(size) → CSS font 문자열(예: s => `bold ${s}px '...'`).
// 호출 후 ctx.font은 변경되므로 호출자가 다시 설정해야 한다.
export function fitFontSize(ctx, text, maxWidth, baseSize, makeFont) {
  ctx.font = makeFont(baseSize);
  const w = ctx.measureText(text).width;
  if (w <= maxWidth || w === 0) return baseSize;
  return Math.max(6, Math.floor(baseSize * (maxWidth / w)));
}

export function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function checkCollision(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
