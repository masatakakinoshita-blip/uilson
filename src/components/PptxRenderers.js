/**
 * PptxRenderers.js — PPTX generation for 45+ layout variants.
 * Uses PptxGenJS to render each layout variant to actual PowerPoint slides.
 * Mirrors the preview renderers in LayoutRenderers.jsx.
 */
import { getLayout, normalizeLayoutId } from "../data/layouts";

const CHART_COLORS = ["3C5996","C83732","2E7D32","D4880F","8E24AA","00838F","AD1457"];

/**
 * Render layout-specific content to a PptxGenJS slide.
 * @param {object} pptSlide - PptxGenJS slide object
 * @param {object} s - Slide data
 * @param {string} layoutId - Layout variant ID
 * @param {number} contentY - Y position to start content
 * @param {object} opts - { hFont, bFont, accent, textColor, subColor }
 */
export function renderPptxLayout(pptSlide, s, layoutId, contentY, opts) {
  const layout = getLayout(normalizeLayoutId(layoutId));
  if (!layout) return;
  const { base, style } = layout;
  const { hFont, bFont, accent, textColor, subColor } = opts;

  switch (base) {
    case "text": return renderText(pptSlide, s, style, contentY, opts);
    case "list": return renderList(pptSlide, s, style, contentY, opts);
    case "grid": return renderGrid(pptSlide, s, style, contentY, opts);
    case "columns": return renderColumns(pptSlide, s, style, contentY, opts);
    case "chart": return renderChart(pptSlide, s, style, contentY, opts);
    case "timeline": return renderTimeline(pptSlide, s, style, contentY, opts);
    case "framework": return renderFramework(pptSlide, s, style, contentY, opts);
    default: break;
  }
}

/* ── Text Layouts ── */
function renderText(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const body = s.body || "";

  if (style.highlight) {
    pptSlide.addShape("roundRect", { x: 2, y: cY + 0.5, w: 9.33, h: 3, fill: { color: accent + "08" }, line: { color: accent, width: 1.5 }, rectRadius: 0.15 });
    pptSlide.addText(body, { x: 2.3, y: cY + 0.8, w: 8.73, h: 2.4, fontSize: 24, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
    return;
  }
  if (style.quote) {
    pptSlide.addShape("rect", { x: 0.5, y: cY + 0.3, w: 0.06, h: 3, fill: { color: accent } });
    pptSlide.addText(body, { x: 0.8, y: cY + 0.3, w: 11.5, h: 2.5, fontSize: 20, fontFace: bFont, color: textColor, italic: true, lineSpacingMultiple: 1.5, valign: "top" });
    if (s.sub) pptSlide.addText(`— ${s.sub}`, { x: 0.8, y: cY + 2.8, w: 11.5, h: 0.5, fontSize: 12, fontFace: bFont, color: subColor });
    return;
  }
  if (style.callout) {
    pptSlide.addShape("roundRect", { x: 0.5, y: cY + 0.2, w: 12.33, h: 3.5, fill: { color: accent + "10" }, line: { color: accent, width: 1 }, rectRadius: 0.1 });
    pptSlide.addText("💡", { x: 0.8, y: cY + 0.4, w: 0.5, h: 0.4, fontSize: 18 });
    pptSlide.addText(body, { x: 0.8, y: cY + 0.9, w: 11.73, h: 2.5, fontSize: 15, fontFace: bFont, color: textColor, lineSpacingMultiple: 1.6, valign: "top" });
    return;
  }
  if (style.sidebar) {
    const parts = body.split("\n").filter(Boolean);
    const mainText = parts.slice(0, -1).join("\n") || body;
    const sideText = parts.length > 1 ? parts[parts.length - 1] : s.sub || "";
    pptSlide.addText(mainText, { x: 0.5, y: cY, w: 8, h: 4.5, fontSize: 14, fontFace: bFont, color: textColor, lineSpacingMultiple: 1.6, valign: "top" });
    pptSlide.addShape("rect", { x: 8.8, y: cY, w: 0.04, h: 4.5, fill: { color: accent } });
    pptSlide.addShape("roundRect", { x: 9, y: cY, w: 3.83, h: 4.5, fill: { color: accent + "08" }, rectRadius: 0.08 });
    pptSlide.addText(sideText, { x: 9.2, y: cY + 0.2, w: 3.43, h: 4, fontSize: 11, fontFace: bFont, color: subColor, lineSpacingMultiple: 1.5, valign: "top" });
    return;
  }
  if (style.columns === 2) {
    const mid = Math.ceil(body.length / 2);
    const bk = body.indexOf("\n", mid - 20);
    const col1 = bk > 0 ? body.slice(0, bk) : body.slice(0, mid);
    const col2 = bk > 0 ? body.slice(bk + 1) : body.slice(mid);
    pptSlide.addText(col1, { x: 0.5, y: cY, w: 5.8, h: 4.5, fontSize: 13, fontFace: bFont, color: textColor, lineSpacingMultiple: 1.6, valign: "top" });
    pptSlide.addShape("rect", { x: 6.5, y: cY, w: 0.02, h: 4.5, fill: { color: accent + "30" } });
    pptSlide.addText(col2, { x: 6.8, y: cY, w: 6, h: 4.5, fontSize: 13, fontFace: bFont, color: textColor, lineSpacingMultiple: 1.6, valign: "top" });
    return;
  }
  if (style.numbered) {
    const paras = body.split("\n").filter(Boolean);
    const rH = Math.min(1.0, 4.5 / paras.length);
    paras.forEach((p, i) => {
      pptSlide.addShape("ellipse", { x: 0.5, y: cY + i * rH + 0.05, w: 0.35, h: 0.35, fill: { color: accent } });
      pptSlide.addText(String(i + 1), { x: 0.5, y: cY + i * rH + 0.05, w: 0.35, h: 0.35, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
      pptSlide.addText(p, { x: 1.0, y: cY + i * rH, w: 11.83, h: rH, fontSize: 13, fontFace: bFont, color: textColor, valign: "middle" });
    });
    return;
  }
  if (style.agenda) {
    const items = body.split("\n").filter(Boolean);
    const rH = Math.min(0.7, 4.5 / items.length);
    items.forEach((item, i) => {
      if (i % 2 === 0) pptSlide.addShape("roundRect", { x: 0.5, y: cY + i * rH, w: 12.33, h: rH, fill: { color: accent + "06" }, rectRadius: 0.05 });
      pptSlide.addText(String(i + 1).padStart(2, "0"), { x: 0.6, y: cY + i * rH, w: 0.5, h: rH, fontSize: 18, fontFace: hFont, color: accent, bold: true, align: "right", valign: "middle" });
      pptSlide.addShape("rect", { x: 1.3, y: cY + i * rH + rH * 0.15, w: 0.03, h: rH * 0.7, fill: { color: accent + "30" } });
      pptSlide.addText(item, { x: 1.5, y: cY + i * rH, w: 11, h: rH, fontSize: 14, fontFace: bFont, color: textColor, valign: "middle" });
    });
    return;
  }
  // Default text
  pptSlide.addText(body, { x: 0.5, y: cY, w: 12.33, h: 4.5, fontSize: 15, fontFace: bFont, color: textColor, lineSpacingMultiple: 1.6, valign: "top" });
}

/* ── List/Bullet Layouts ── */
function renderList(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const items = s.items || [];
  const maxH = 5.0;
  const rH = Math.min(1.1, maxH / items.length);

  if (style.grid) {
    const cols = items.length <= 4 ? 2 : 3;
    const colW = 11.33 / cols;
    const rowH = Math.min(2.0, 4.5 / Math.ceil(items.length / cols));
    items.forEach((item, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = 1 + col * (colW + 0.15), y = cY + row * (rowH + 0.1);
      pptSlide.addShape("roundRect", { x, y, w: colW - 0.15, h: rowH, fill: { color: accent + "06" }, line: { color: accent + "15", width: 0.5 }, rectRadius: 0.08 });
      if (style.icon) pptSlide.addText(item.icon || "▶", { x: x + 0.1, y: y + (style.bigIcon ? 0.2 : 0.1), w: colW - 0.35, h: 0.5, fontSize: style.bigIcon ? 24 : 16, align: style.bigIcon ? "center" : "left" });
      const textY = y + (style.icon ? (style.bigIcon ? 0.8 : 0.6) : 0.15);
      pptSlide.addText(item.label, { x: x + 0.15, y: textY, w: colW - 0.45, h: 0.35, fontSize: 12, fontFace: hFont, color: textColor, bold: true, align: style.bigIcon ? "center" : "left" });
      if (item.desc) pptSlide.addText(item.desc, { x: x + 0.15, y: textY + 0.35, w: colW - 0.45, h: rowH - (textY - y) - 0.45, fontSize: 10, fontFace: bFont, color: subColor, align: style.bigIcon ? "center" : "left" });
    });
    return;
  }
  if (style.columns === 2) {
    const mid = Math.ceil(items.length / 2);
    const col1 = items.slice(0, mid), col2 = items.slice(mid);
    [col1, col2].forEach((colItems, ci) => {
      const baseX = ci === 0 ? 0.5 : 6.9;
      colItems.forEach((item, idx) => {
        const iy = cY + idx * rH;
        pptSlide.addText(`${style.icon ? (item.icon || "▶") : "•"} ${item.label}`, { x: baseX, y: iy, w: 6, h: 0.35, fontSize: 13, fontFace: hFont, color: textColor, bold: true });
        if (item.desc) pptSlide.addText(item.desc, { x: baseX + 0.3, y: iy + 0.35, w: 5.7, h: rH - 0.45, fontSize: 11, fontFace: bFont, color: subColor });
      });
    });
    if (items.length > 1) pptSlide.addShape("rect", { x: 6.55, y: cY, w: 0.02, h: maxH, fill: { color: accent + "15" } });
    return;
  }
  if (style.checklist) {
    items.forEach((item, idx) => {
      const iy = cY + idx * rH;
      if (idx % 2 === 0) pptSlide.addShape("roundRect", { x: 0.5, y: iy, w: 12.33, h: rH, fill: { color: accent + "04" }, rectRadius: 0.04 });
      pptSlide.addText("☑️", { x: 0.6, y: iy, w: 0.4, h: rH, fontSize: 14, valign: "middle" });
      pptSlide.addText(item.label, { x: 1.1, y: iy, w: 11.5, h: 0.4, fontSize: 13, fontFace: hFont, color: textColor, bold: true, valign: "middle" });
      if (item.desc) pptSlide.addText(item.desc, { x: 1.1, y: iy + 0.4, w: 11.5, h: rH - 0.5, fontSize: 10, fontFace: bFont, color: subColor });
    });
    return;
  }
  if (style.numbered) {
    items.forEach((item, idx) => {
      const iy = cY + idx * rH;
      pptSlide.addShape("ellipse", { x: 0.5, y: iy + 0.05, w: 0.4, h: 0.4, fill: { color: accent } });
      pptSlide.addText(String(idx + 1), { x: 0.5, y: iy + 0.05, w: 0.4, h: 0.4, fontSize: 12, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
      pptSlide.addText(item.label, { x: 1.1, y: iy, w: 11.5, h: 0.4, fontSize: 14, fontFace: hFont, color: textColor, bold: true });
      if (item.desc) pptSlide.addText(item.desc, { x: 1.1, y: iy + 0.4, w: 11.5, h: rH - 0.5, fontSize: 11, fontFace: bFont, color: subColor });
    });
    return;
  }
  if (style.minimal) {
    items.forEach((item, idx) => {
      const iy = cY + idx * 0.55;
      pptSlide.addShape("rect", { x: 0.5, y: iy + 0.5, w: 12.33, h: 0.01, fill: { color: accent + "10" } });
      pptSlide.addText(`● ${item.label}`, { x: 0.5, y: iy, w: 4, h: 0.5, fontSize: 13, fontFace: hFont, color: textColor, bold: true, valign: "middle" });
      if (item.desc) pptSlide.addText(`— ${item.desc}`, { x: 4.5, y: iy, w: 8, h: 0.5, fontSize: 11, fontFace: bFont, color: subColor, valign: "middle" });
    });
    return;
  }
  if (style.vertical && style.timeline) {
    pptSlide.addShape("rect", { x: 0.75, y: cY, w: 0.03, h: maxH, fill: { color: accent + "25" } });
    items.forEach((item, idx) => {
      const iy = cY + idx * rH;
      pptSlide.addShape("ellipse", { x: 0.55, y: iy + 0.05, w: 0.4, h: 0.4, fill: { color: accent } });
      pptSlide.addText(String(idx + 1), { x: 0.55, y: iy + 0.05, w: 0.4, h: 0.4, fontSize: 10, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
      pptSlide.addText(item.label, { x: 1.2, y: iy, w: 11.5, h: 0.35, fontSize: 13, fontFace: hFont, color: textColor, bold: true });
      if (item.desc) pptSlide.addText(item.desc, { x: 1.2, y: iy + 0.35, w: 11.5, h: rH - 0.45, fontSize: 10, fontFace: bFont, color: subColor });
    });
    return;
  }
  // Default: icon + card + borderLeft
  items.forEach((item, idx) => {
    const iy = cY + idx * rH;
    if (style.card) pptSlide.addShape("roundRect", { x: 0.5, y: iy, w: 12.33, h: rH - 0.1, fill: { color: accent + "06" }, rectRadius: 0.06 });
    if (style.borderLeft) pptSlide.addShape("rect", { x: 0.5, y: iy, w: 0.06, h: rH - 0.1, fill: { color: accent }, rectRadius: 0.02 });
    if (style.icon) pptSlide.addText(item.icon || "▶", { x: 0.7, y: iy, w: 0.5, h: rH - 0.1, fontSize: 20, valign: "middle", align: "center" });
    const tx = style.icon ? 1.3 : 0.8;
    pptSlide.addText(item.label, { x: tx, y: iy, w: 12.33 - tx, h: 0.4, fontSize: 15, fontFace: hFont, color: textColor, bold: true, valign: "top" });
    if (item.desc) pptSlide.addText(item.desc, { x: tx, y: iy + 0.4, w: 12.33 - tx, h: rH - 0.5, fontSize: 12, fontFace: bFont, color: subColor, valign: "top" });
  });
}

/* ── Grid/Stats Layouts ── */
function renderGrid(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const stats = s.stats || [];
  const nc = Math.min(stats.length, 4);
  const cw = 11.33 / nc;

  if (style.single && stats.length > 0) {
    const st = stats[0];
    pptSlide.addText(st.value, { x: 2, y: cY + 0.5, w: 9.33, h: 2, fontSize: 64, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
    pptSlide.addText(st.label, { x: 2, y: cY + 2.5, w: 9.33, h: 0.6, fontSize: 18, fontFace: bFont, color: textColor, bold: true, align: "center" });
    if (st.sub) pptSlide.addText(st.sub, { x: 2, y: cY + 3.1, w: 9.33, h: 0.5, fontSize: 13, fontFace: bFont, color: subColor, align: "center" });
    return;
  }
  if (style.progress) {
    stats.forEach((st, idx) => {
      const iy = cY + idx * 1.3;
      const numVal = parseInt(String(st.value).replace(/[^0-9.]/g, "")) || 0;
      const pct = Math.min(numVal, 100);
      pptSlide.addText(st.label, { x: 0.5, y: iy, w: 8, h: 0.35, fontSize: 13, fontFace: hFont, color: textColor, bold: true });
      pptSlide.addText(st.value, { x: 10, y: iy, w: 2.83, h: 0.35, fontSize: 13, fontFace: hFont, color: accent, bold: true, align: "right" });
      pptSlide.addShape("roundRect", { x: 0.5, y: iy + 0.4, w: 12.33, h: 0.2, fill: { color: accent + "12" }, rectRadius: 0.1 });
      pptSlide.addShape("roundRect", { x: 0.5, y: iy + 0.4, w: 12.33 * pct / 100, h: 0.2, fill: { color: accent }, rectRadius: 0.1 });
      if (st.sub) pptSlide.addText(st.sub, { x: 0.5, y: iy + 0.65, w: 12.33, h: 0.3, fontSize: 10, fontFace: bFont, color: subColor });
    });
    return;
  }
  if (style.dashboard) {
    stats.forEach((st, idx) => {
      const sx = 1 + idx * cw;
      pptSlide.addShape("roundRect", { x: sx, y: cY, w: cw - 0.4, h: 3, fill: { color: "FFFFFF" }, line: { color: "E8E8E8", width: 1 }, rectRadius: 0.08, shadow: { type: "outer", blur: 3, offset: 1, color: "00000010" } });
      pptSlide.addText(st.label, { x: sx, y: cY + 0.3, w: cw - 0.4, h: 0.4, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
      pptSlide.addText(st.value, { x: sx, y: cY + 0.8, w: cw - 0.4, h: 1.2, fontSize: 32, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
      if (st.sub) pptSlide.addText(st.sub, { x: sx, y: cY + 2.1, w: cw - 0.4, h: 0.4, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
    });
    return;
  }
  if (style.trend) {
    stats.forEach((st, idx) => {
      const sx = 1 + idx * cw;
      pptSlide.addShape("roundRect", { x: sx, y: cY, w: cw - 0.4, h: 3.5, fill: { color: accent + "06" }, line: { color: accent + "12", width: 0.5 }, rectRadius: 0.08 });
      pptSlide.addText(st.value, { x: sx, y: cY + 0.3, w: cw - 0.4, h: 1, fontSize: 28, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
      pptSlide.addText("↑", { x: sx, y: cY + 1.3, w: cw - 0.4, h: 0.5, fontSize: 14, color: "2E7D32", bold: true, align: "center" });
      pptSlide.addText(st.label, { x: sx, y: cY + 1.8, w: cw - 0.4, h: 0.5, fontSize: 12, fontFace: bFont, color: textColor, bold: true, align: "center" });
      if (st.sub) pptSlide.addText(st.sub, { x: sx, y: cY + 2.3, w: cw - 0.4, h: 0.5, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
    });
    return;
  }
  if (style.meter) {
    // Fallback to big number cards for PPTX (SVG meter not possible)
    stats.forEach((st, idx) => {
      const sx = 1 + idx * cw;
      pptSlide.addShape("roundRect", { x: sx, y: cY, w: cw - 0.4, h: 3.5, fill: { color: accent + "08" }, line: { color: accent + "15", width: 0.5 }, rectRadius: 0.1 });
      pptSlide.addText(st.value, { x: sx, y: cY + 0.5, w: cw - 0.4, h: 1.2, fontSize: 30, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
      pptSlide.addText(st.label, { x: sx, y: cY + 1.8, w: cw - 0.4, h: 0.5, fontSize: 12, fontFace: bFont, color: textColor, bold: true, align: "center" });
    });
    return;
  }
  // Default: big number cards
  stats.forEach((st, idx) => {
    const sx = 1 + idx * cw;
    pptSlide.addShape("roundRect", { x: sx, y: cY, w: cw - 0.4, h: 3.5, fill: { color: "F8F9FA" }, line: { color: "E0E0E0", width: 1 }, rectRadius: 0.1 });
    pptSlide.addText(st.value, { x: sx, y: cY + 0.3, w: cw - 0.4, h: 1.2, fontSize: 36, fontFace: hFont, color: accent, bold: true, align: "center", valign: "middle" });
    pptSlide.addText(st.label, { x: sx, y: cY + 1.6, w: cw - 0.4, h: 0.6, fontSize: 14, fontFace: bFont, color: textColor, bold: true, align: "center", valign: "top" });
    if (st.sub) pptSlide.addText(st.sub, { x: sx, y: cY + 2.2, w: cw - 0.4, h: 0.8, fontSize: 11, fontFace: bFont, color: subColor, align: "center", valign: "top" });
  });
}

/* ── Column/Comparison Layouts ── */
function renderColumns(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const cols = s.columns || [];
  const nc = cols.length;
  const cw = 11.33 / nc;

  if (style.vs && nc >= 2) {
    pptSlide.addShape("roundRect", { x: 0.5, y: cY, w: 5.5, h: 4.5, fill: { color: accent + "08" }, rectRadius: 0.08 });
    pptSlide.addText(cols[0].title, { x: 0.7, y: cY + 0.2, w: 5.1, h: 0.6, fontSize: 16, fontFace: hFont, color: accent, bold: true, align: "center" });
    (cols[0].items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: 0.9, y: cY + 1.0 + j * 0.45, w: 4.9, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    pptSlide.addShape("roundRect", { x: 6.3, y: cY + 1, w: 0.73, h: 0.5, fill: { color: accent }, rectRadius: 0.04 });
    pptSlide.addText("VS", { x: 6.3, y: cY + 1, w: 0.73, h: 0.5, fontSize: 12, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    pptSlide.addShape("roundRect", { x: 7.33, y: cY, w: 5.5, h: 4.5, fill: { color: "C8373208" }, rectRadius: 0.08 });
    pptSlide.addText(cols[1].title, { x: 7.53, y: cY + 0.2, w: 5.1, h: 0.6, fontSize: 16, fontFace: hFont, color: "C83732", bold: true, align: "center" });
    (cols[1].items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: 7.73, y: cY + 1.0 + j * 0.45, w: 4.9, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    return;
  }
  if (style.prosCons && nc >= 2) {
    // Pros
    pptSlide.addShape("roundRect", { x: 0.5, y: cY, w: 5.9, h: 0.6, fill: { color: "2E7D32" }, rectRadius: 0.05 });
    pptSlide.addText(`👍 ${cols[0].title}`, { x: 0.5, y: cY, w: 5.9, h: 0.6, fontSize: 14, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    (cols[0].items || []).forEach((item, j) => pptSlide.addText(`✓ ${item}`, { x: 0.7, y: cY + 0.8 + j * 0.45, w: 5.5, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    // Cons
    pptSlide.addShape("roundRect", { x: 6.93, y: cY, w: 5.9, h: 0.6, fill: { color: "C83732" }, rectRadius: 0.05 });
    pptSlide.addText(`👎 ${cols[1].title}`, { x: 6.93, y: cY, w: 5.9, h: 0.6, fontSize: 14, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    (cols[1].items || []).forEach((item, j) => pptSlide.addText(`✗ ${item}`, { x: 7.13, y: cY + 0.8 + j * 0.45, w: 5.5, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    return;
  }
  if (style.beforeAfter && nc >= 2) {
    pptSlide.addShape("roundRect", { x: 0.5, y: cY, w: 5.5, h: 4.5, fill: { color: "FFF3E0" }, rectRadius: 0.08 });
    pptSlide.addText("Before", { x: 0.7, y: cY + 0.2, w: 5.1, h: 0.5, fontSize: 14, fontFace: hFont, color: "D4880F", bold: true });
    (cols[0].items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: 0.9, y: cY + 0.9 + j * 0.45, w: 4.9, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    pptSlide.addText("→", { x: 6.1, y: cY + 1.5, w: 0.6, h: 0.5, fontSize: 20, align: "center", valign: "middle" });
    pptSlide.addShape("roundRect", { x: 7.33, y: cY, w: 5.5, h: 4.5, fill: { color: "E8F5E9" }, rectRadius: 0.08 });
    pptSlide.addText("After", { x: 7.53, y: cY + 0.2, w: 5.1, h: 0.5, fontSize: 14, fontFace: hFont, color: "2E7D32", bold: true });
    (cols[1].items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: 7.73, y: cY + 0.9 + j * 0.45, w: 4.9, h: 0.4, fontSize: 12, fontFace: bFont, color: textColor }));
    return;
  }
  if (style.featureTable) {
    // Table header
    const tableW = 12.33;
    const colWidth = (tableW - 3) / nc;
    pptSlide.addShape("rect", { x: 0.5, y: cY, w: 3, h: 0.5, fill: { color: accent } });
    pptSlide.addText("機能", { x: 0.5, y: cY, w: 3, h: 0.5, fontSize: 12, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    cols.forEach((col, i) => {
      const cx = 3.5 + i * colWidth;
      pptSlide.addShape("rect", { x: cx, y: cY, w: colWidth, h: 0.5, fill: { color: accent } });
      pptSlide.addText(col.title, { x: cx, y: cY, w: colWidth, h: 0.5, fontSize: 11, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    });
    (cols[0]?.items || []).forEach((_, rowIdx) => {
      const ry = cY + 0.55 + rowIdx * 0.4;
      pptSlide.addText(cols[0]?.items?.[rowIdx] || "", { x: 0.5, y: ry, w: 3, h: 0.35, fontSize: 11, fontFace: bFont, color: textColor });
      cols.forEach((col, ci) => {
        const cx = 3.5 + ci * colWidth;
        pptSlide.addText(ci === 0 ? "✓" : (col.items?.[rowIdx] ? "✓" : "—"), { x: cx, y: ry, w: colWidth, h: 0.35, fontSize: 11, fontFace: bFont, color: textColor, align: "center" });
      });
    });
    return;
  }
  // Default: column comparison
  cols.forEach((col, idx) => {
    const cx = 1 + idx * cw;
    pptSlide.addShape("roundRect", { x: cx, y: cY, w: cw - 0.3, h: 0.6, fill: { color: accent }, rectRadius: 0.05 });
    pptSlide.addText(col.title, { x: cx, y: cY, w: cw - 0.3, h: 0.6, fontSize: 15, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    (col.items || []).forEach((item, j) => {
      pptSlide.addText(`• ${item}`, { x: cx + 0.15, y: cY + 0.8 + j * 0.55, w: cw - 0.6, h: 0.5, fontSize: 13, fontFace: bFont, color: textColor, valign: "top" });
    });
  });
}

/* ── Chart Layouts ── */
function renderChart(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const data = s.chartData || [];
  const chartType = style.type || s.chartType || "bar";

  if (chartType === "pie" || chartType === "donut") {
    pptSlide.addText("📊 " + data.map(d => `${d.label}: ${d.value}`).join(" | "), {
      x: 0.5, y: cY + 0.5, w: 12.33, h: 1, fontSize: 14, fontFace: bFont, color: textColor, align: "center"
    });
    data.forEach((d, idx) => {
      const ly = cY + 2 + idx * 0.5;
      pptSlide.addShape("roundRect", { x: 4, y: ly, w: 0.3, h: 0.3, fill: { color: CHART_COLORS[idx % 7] }, rectRadius: 0.03 });
      pptSlide.addText(`${d.label} (${d.value})`, { x: 4.5, y: ly, w: 5, h: 0.3, fontSize: 12, fontFace: bFont, color: textColor });
    });
    return;
  }
  if (chartType === "horizontal") {
    const maxVal = Math.max(...data.map(d => d.value || 0), 1);
    data.forEach((d, idx) => {
      const iy = cY + 0.3 + idx * 0.8;
      pptSlide.addText(d.label, { x: 0.5, y: iy, w: 2, h: 0.5, fontSize: 11, fontFace: bFont, color: subColor, align: "right", valign: "middle" });
      const barW = (d.value / maxVal) * 9;
      pptSlide.addShape("roundRect", { x: 2.7, y: iy + 0.1, w: 9.5, h: 0.3, fill: { color: accent + "10" }, rectRadius: 0.08 });
      pptSlide.addShape("roundRect", { x: 2.7, y: iy + 0.1, w: barW, h: 0.3, fill: { color: CHART_COLORS[idx % 7] }, rectRadius: 0.08 });
      pptSlide.addText(String(d.value), { x: 2.8 + barW, y: iy, w: 0.8, h: 0.5, fontSize: 11, fontFace: bFont, color: textColor, bold: true, valign: "middle" });
    });
    return;
  }
  if (chartType === "line" || chartType === "area") {
    // Fallback to text representation for line/area
    pptSlide.addText(data.map(d => `${d.label}: ${d.value}`).join(" → "), {
      x: 0.5, y: cY + 1, w: 12.33, h: 1, fontSize: 14, fontFace: bFont, color: textColor, align: "center"
    });
    data.forEach((d, idx) => {
      const ly = cY + 2.5 + idx * 0.45;
      pptSlide.addShape("ellipse", { x: 4.5, y: ly + 0.05, w: 0.2, h: 0.2, fill: { color: accent } });
      pptSlide.addText(`${d.label}: ${d.value}`, { x: 4.9, y: ly, w: 4, h: 0.35, fontSize: 12, fontFace: bFont, color: textColor });
    });
    return;
  }
  // Default: bar chart
  const maxVal = Math.max(...data.map(d => d.value || 0), 1);
  const bw = Math.min(1.5, 10 / data.length);
  data.forEach((d, idx) => {
    const bx = 1.5 + idx * (bw + 0.3);
    const barH = Math.max((d.value / maxVal) * 3.5, 0.2);
    const by = cY + 4 - barH;
    pptSlide.addShape("roundRect", { x: bx, y: by, w: bw, h: barH, fill: { color: CHART_COLORS[idx % 7] }, rectRadius: 0.05 });
    pptSlide.addText(String(d.value), { x: bx, y: by - 0.4, w: bw, h: 0.35, fontSize: 12, fontFace: bFont, color: textColor, bold: true, align: "center" });
    pptSlide.addText(d.label, { x: bx, y: cY + 4.1, w: bw, h: 0.5, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
  });
}

/* ── Timeline/Process Layouts ── */
function renderTimeline(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const steps = s.steps || [];
  const ns = steps.length;
  const sw = 11.33 / ns;

  if (style.vertical) {
    pptSlide.addShape("rect", { x: 0.9, y: cY, w: 0.03, h: 4.5, fill: { color: accent + "20" } });
    steps.forEach((step, idx) => {
      const iy = cY + idx * (4.5 / ns);
      pptSlide.addShape("ellipse", { x: 0.7, y: iy + 0.05, w: 0.4, h: 0.4, fill: { color: accent } });
      pptSlide.addText(String(idx + 1), { x: 0.7, y: iy + 0.05, w: 0.4, h: 0.4, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
      pptSlide.addText(step.label, { x: 1.3, y: iy, w: 11.5, h: 0.4, fontSize: 14, fontFace: hFont, color: textColor, bold: true });
      if (step.desc) pptSlide.addText(step.desc, { x: 1.3, y: iy + 0.4, w: 11.5, h: 0.5, fontSize: 11, fontFace: bFont, color: subColor });
    });
    return;
  }
  if (style.arrows) {
    steps.forEach((step, idx) => {
      const sx = 0.5 + idx * (12.33 / ns);
      const aw = 12.33 / ns - 0.2;
      pptSlide.addShape("roundRect", { x: sx, y: cY + 0.5, w: aw, h: 2.5, fill: { color: CHART_COLORS[idx % 7] }, rectRadius: 0.08 });
      pptSlide.addText(step.label, { x: sx + 0.1, y: cY + 0.8, w: aw - 0.2, h: 0.5, fontSize: 13, fontFace: hFont, color: "FFFFFF", bold: true, align: "center" });
      if (step.desc) pptSlide.addText(step.desc, { x: sx + 0.1, y: cY + 1.4, w: aw - 0.2, h: 1, fontSize: 10, fontFace: bFont, color: "FFFFFFCC", align: "center" });
      if (idx < ns - 1) pptSlide.addText("▶", { x: sx + aw - 0.1, y: cY + 1.2, w: 0.4, h: 0.5, fontSize: 16, color: accent, align: "center", valign: "middle" });
    });
    return;
  }
  if (style.roadmap) {
    pptSlide.addShape("rect", { x: 1.5, y: cY + 1.0, w: 10.33, h: 0.04, fill: { color: accent + "15" } });
    steps.forEach((step, idx) => {
      const sx = 1 + idx * sw + sw / 2 - 0.2;
      pptSlide.addShape("ellipse", { x: sx, y: cY + 0.5, w: 0.4, h: 0.4, fill: { color: accent } });
      pptSlide.addText(String(idx + 1), { x: sx, y: cY + 0.5, w: 0.4, h: 0.4, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
      pptSlide.addShape("roundRect", { x: sx - sw / 2 + 0.3, y: cY + 1.3, w: sw - 0.1, h: 2.5, fill: { color: accent + "06" }, line: { color: accent + "12", width: 0.5 }, rectRadius: 0.06 });
      pptSlide.addText(step.label, { x: sx - sw / 2 + 0.4, y: cY + 1.5, w: sw - 0.3, h: 0.5, fontSize: 12, fontFace: hFont, color: textColor, bold: true, align: "center" });
      if (step.desc) pptSlide.addText(step.desc, { x: sx - sw / 2 + 0.4, y: cY + 2.0, w: sw - 0.3, h: 1.5, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
    });
    return;
  }
  if (style.milestone) {
    pptSlide.addShape("rect", { x: 1, y: cY + 1.5, w: 11.33, h: 0.04, fill: { color: accent + "20" } });
    steps.forEach((step, idx) => {
      const sx = 1 + idx * sw + sw / 2 - 0.15;
      if (step.desc) pptSlide.addText(step.desc, { x: sx - sw / 2 + 0.15, y: cY + 0.5, w: sw, h: 0.5, fontSize: 10, fontFace: bFont, color: subColor, align: "center" });
      pptSlide.addShape("ellipse", { x: sx, y: cY + 1.3, w: 0.3, h: 0.3, fill: { color: accent } });
      pptSlide.addText(step.label, { x: sx - sw / 2 + 0.15, y: cY + 1.8, w: sw, h: 0.5, fontSize: 12, fontFace: hFont, color: textColor, bold: true, align: "center" });
    });
    return;
  }
  // Default: horizontal timeline
  pptSlide.addShape("rect", { x: 1.5, y: cY + 1.0, w: 10.33, h: 0.04, fill: { color: accent } });
  steps.forEach((step, idx) => {
    const sx = 1 + idx * sw + sw / 2 - 0.3;
    pptSlide.addShape("ellipse", { x: sx, y: cY + 0.5, w: 0.6, h: 0.6, fill: { color: accent } });
    pptSlide.addText(String(idx + 1), { x: sx, y: cY + 0.5, w: 0.6, h: 0.6, fontSize: 14, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
    pptSlide.addText(step.label, { x: sx - sw / 2 + 0.3, y: cY + 1.3, w: sw, h: 0.5, fontSize: 14, fontFace: hFont, color: textColor, bold: true, align: "center", valign: "top" });
    if (step.desc) pptSlide.addText(step.desc, { x: sx - sw / 2 + 0.3, y: cY + 1.8, w: sw, h: 1.2, fontSize: 11, fontFace: bFont, color: subColor, align: "center", valign: "top" });
  });
}

/* ── Framework Layouts ── */
function renderFramework(pptSlide, s, style, cY, { hFont, bFont, accent, textColor, subColor }) {
  const fwType = style.type;

  if (fwType === "swot") {
    const cols = s.columns || [];
    const labels = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
    const bgCols = ["E8F5E9", "FFEBEE", "E3F2FD", "FFF3E0"];
    const fgCols = ["2E7D32", "C83732", "1565C0", "D4880F"];
    [0, 1, 2, 3].forEach(i => {
      const x = i % 2 === 0 ? 0.5 : 6.9;
      const y = cY + (i < 2 ? 0 : 2.4);
      pptSlide.addShape("roundRect", { x, y, w: 5.9, h: 2.2, fill: { color: bgCols[i] }, rectRadius: 0.08 });
      pptSlide.addText(cols[i]?.title || labels[i], { x: x + 0.2, y: y + 0.1, w: 5.5, h: 0.4, fontSize: 12, fontFace: hFont, color: fgCols[i], bold: true });
      (cols[i]?.items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: x + 0.3, y: y + 0.6 + j * 0.35, w: 5.3, h: 0.3, fontSize: 10, fontFace: bFont, color: textColor }));
    });
    return;
  }
  if (fwType === "matrix") {
    const cols = s.columns || [];
    cols.slice(0, 4).forEach((col, i) => {
      const x = i % 2 === 0 ? 0.5 : 6.9;
      const y = cY + (i < 2 ? 0 : 2.4);
      pptSlide.addShape("roundRect", { x, y, w: 5.9, h: 2.2, fill: { color: CHART_COLORS[i % 7] + "10" }, line: { color: CHART_COLORS[i % 7] + "25", width: 0.5 }, rectRadius: 0.08 });
      pptSlide.addText(col.title, { x: x + 0.2, y: y + 0.1, w: 5.5, h: 0.4, fontSize: 12, fontFace: hFont, color: CHART_COLORS[i % 7], bold: true });
      (col.items || []).forEach((item, j) => pptSlide.addText(`• ${item}`, { x: x + 0.3, y: y + 0.6 + j * 0.35, w: 5.3, h: 0.3, fontSize: 10, fontFace: bFont, color: textColor }));
    });
    return;
  }
  if (fwType === "pyramid") {
    const items = s.items || [];
    items.forEach((item, i) => {
      const widthPct = 30 + (i * 70 / Math.max(items.length - 1, 1));
      const w = widthPct / 100 * 12;
      const x = (13.33 - w) / 2;
      const y = cY + i * (4.5 / items.length);
      const h = 4.5 / items.length - 0.1;
      pptSlide.addShape("roundRect", { x, y, w, h, fill: { color: CHART_COLORS[i % 7] }, rectRadius: 0.05 });
      pptSlide.addText(item.label, { x, y, w, h: h * 0.6, fontSize: 12, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "bottom" });
      if (item.desc) pptSlide.addText(item.desc, { x, y: y + h * 0.5, w, h: h * 0.5, fontSize: 9, fontFace: bFont, color: "FFFFFFCC", align: "center", valign: "top" });
    });
    return;
  }
  if (fwType === "funnel") {
    const items = s.items || [];
    items.forEach((item, i) => {
      const widthPct = 95 - (i * 55 / Math.max(items.length - 1, 1));
      const w = widthPct / 100 * 12;
      const x = (13.33 - w) / 2;
      const y = cY + i * (4.5 / items.length);
      const h = 4.5 / items.length - 0.08;
      pptSlide.addShape("roundRect", { x, y, w, h, fill: { color: CHART_COLORS[i % 7] }, rectRadius: 0.05 });
      pptSlide.addText(item.label, { x: x + 0.2, y, w: w * 0.6, h, fontSize: 12, fontFace: hFont, color: "FFFFFF", bold: true, valign: "middle" });
      if (item.desc) pptSlide.addText(item.desc, { x: x + w * 0.6, y, w: w * 0.35, h, fontSize: 10, fontFace: bFont, color: "FFFFFFCC", align: "right", valign: "middle" });
    });
    return;
  }
  if (fwType === "cycle") {
    const items = s.items || [];
    const count = items.length;
    // Fallback: circular text representation
    const r = 2.2;
    const cx = 6.66, cy2 = cY + 2.5;
    items.forEach((item, i) => {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2;
      const x = cx + r * Math.cos(angle) - 0.8;
      const y = cy2 + r * Math.sin(angle) - 0.3;
      pptSlide.addShape("ellipse", { x, y, w: 1.6, h: 0.8, fill: { color: CHART_COLORS[i % 7] } });
      pptSlide.addText(item.label, { x, y, w: 1.6, h: 0.5, fontSize: 10, fontFace: hFont, color: "FFFFFF", bold: true, align: "center", valign: "bottom" });
      if (item.desc) pptSlide.addText(item.desc, { x, y: y + 0.4, w: 1.6, h: 0.4, fontSize: 7, fontFace: bFont, color: "FFFFFFCC", align: "center", valign: "top" });
    });
    return;
  }
}
