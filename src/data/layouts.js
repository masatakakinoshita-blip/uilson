/**
 * Layout Catalog — 45+ slide layout variants
 * Each layout has a `base` type and `style` params for parameterized rendering.
 * Users can switch layout after generation without losing slide data.
 *
 * Base types:  text, list, grid, columns, chart, timeline, framework, cover
 * Each base type is handled by one renderer that adapts via style params.
 *
 * requiredFields: which slide data fields the layout can display
 *   body = body text, items = bullets array, stats = stats array,
 *   columns = comparison columns, chartData = chart data, steps = timeline steps
 */

export const LAYOUT_CATALOG = [
  // ─── Cover / Closing ───
  { id: "cover", name: "表紙", cat: "表紙・締め", icon: "🎬", base: "cover", style: {}, req: ["heading","sub"] },
  { id: "closing", name: "まとめ", cat: "表紙・締め", icon: "🏁", base: "cover", style: { closing: true }, req: ["heading","sub"] },
  { id: "section-break", name: "セクション区切り", cat: "表紙・締め", icon: "📌", base: "cover", style: { section: true }, req: ["heading","sub"] },

  // ─── Text Layouts ───
  { id: "content", name: "標準テキスト", cat: "テキスト", icon: "📝", base: "text", style: {}, req: ["heading","body"] },
  { id: "text-2col", name: "2カラムテキスト", cat: "テキスト", icon: "📰", base: "text", style: { columns: 2 }, req: ["heading","body"] },
  { id: "text-quote", name: "引用・メッセージ", cat: "テキスト", icon: "💬", base: "text", style: { quote: true }, req: ["heading","body"] },
  { id: "text-callout", name: "コールアウト", cat: "テキスト", icon: "📢", base: "text", style: { callout: true }, req: ["heading","body"] },
  { id: "text-sidebar", name: "サイドバー付き", cat: "テキスト", icon: "📐", base: "text", style: { sidebar: true }, req: ["heading","sub","body"] },
  { id: "text-numbered", name: "番号付き段落", cat: "テキスト", icon: "🔢", base: "text", style: { numbered: true }, req: ["heading","body"] },
  { id: "text-highlight", name: "キーメッセージ", cat: "テキスト", icon: "⭐", base: "text", style: { highlight: true }, req: ["heading","body"] },
  { id: "text-agenda", name: "アジェンダ", cat: "テキスト", icon: "📋", base: "text", style: { agenda: true }, req: ["heading","body"] },

  // ─── Bullet / List Layouts ───
  { id: "bullets", name: "アイコン付きリスト", cat: "箇条書き", icon: "📌", base: "list", style: { icon: true, card: true, borderLeft: true }, req: ["heading","items"] },
  { id: "list-numbered", name: "番号付きリスト", cat: "箇条書き", icon: "🔢", base: "list", style: { numbered: true }, req: ["heading","items"] },
  { id: "list-card-grid", name: "カードグリッド", cat: "箇条書き", icon: "🃏", base: "list", style: { grid: true, card: true }, req: ["heading","items"] },
  { id: "list-2col", name: "2列リスト", cat: "箇条書き", icon: "📊", base: "list", style: { columns: 2 }, req: ["heading","items"] },
  { id: "list-checklist", name: "チェックリスト", cat: "箇条書き", icon: "✅", base: "list", style: { checklist: true }, req: ["heading","items"] },
  { id: "list-minimal", name: "ミニマルリスト", cat: "箇条書き", icon: "▪️", base: "list", style: { minimal: true }, req: ["heading","items"] },
  { id: "list-icon-grid", name: "アイコングリッド", cat: "箇条書き", icon: "🎯", base: "list", style: { grid: true, icon: true, bigIcon: true }, req: ["heading","items"] },
  { id: "list-timeline-vert", name: "縦タイムライン", cat: "箇条書き", icon: "📍", base: "list", style: { vertical: true, timeline: true }, req: ["heading","items"] },

  // ─── Stats / KPI Layouts ───
  { id: "stats", name: "KPIカード", cat: "数値・KPI", icon: "📊", base: "grid", style: { bigNumber: true }, req: ["heading","stats"] },
  { id: "stats-progress", name: "プログレスバー", cat: "数値・KPI", icon: "📶", base: "grid", style: { progress: true }, req: ["heading","stats"] },
  { id: "stats-single", name: "ハイライト数値", cat: "数値・KPI", icon: "🎯", base: "grid", style: { single: true }, req: ["heading","stats"] },
  { id: "stats-dashboard", name: "ダッシュボード", cat: "数値・KPI", icon: "📈", base: "grid", style: { dashboard: true }, req: ["heading","stats"] },
  { id: "stats-trend", name: "トレンド付き", cat: "数値・KPI", icon: "📉", base: "grid", style: { trend: true }, req: ["heading","stats"] },
  { id: "stats-meter", name: "メーター", cat: "数値・KPI", icon: "⏱️", base: "grid", style: { meter: true }, req: ["heading","stats"] },

  // ─── Comparison / Column Layouts ───
  { id: "comparison", name: "カラム比較", cat: "比較", icon: "⚖️", base: "columns", style: {}, req: ["heading","columns"] },
  { id: "col-vs", name: "A vs B", cat: "比較", icon: "🆚", base: "columns", style: { vs: true }, req: ["heading","columns"] },
  { id: "col-pros-cons", name: "メリデメ", cat: "比較", icon: "👍", base: "columns", style: { prosCons: true }, req: ["heading","columns"] },
  { id: "col-before-after", name: "Before → After", cat: "比較", icon: "🔄", base: "columns", style: { beforeAfter: true }, req: ["heading","columns"] },
  { id: "col-feature", name: "機能比較表", cat: "比較", icon: "📋", base: "columns", style: { featureTable: true }, req: ["heading","columns"] },

  // ─── Chart Layouts ───
  { id: "chart-bar", name: "棒グラフ", cat: "グラフ", icon: "📊", base: "chart", style: { type: "bar" }, req: ["heading","chartData"] },
  { id: "chart-horizontal", name: "横棒グラフ", cat: "グラフ", icon: "📊", base: "chart", style: { type: "horizontal" }, req: ["heading","chartData"] },
  { id: "chart-pie", name: "円グラフ", cat: "グラフ", icon: "🥧", base: "chart", style: { type: "pie" }, req: ["heading","chartData"] },
  { id: "chart-donut", name: "ドーナツ", cat: "グラフ", icon: "🍩", base: "chart", style: { type: "donut" }, req: ["heading","chartData"] },
  { id: "chart-line", name: "折れ線グラフ", cat: "グラフ", icon: "📈", base: "chart", style: { type: "line" }, req: ["heading","chartData"] },
  { id: "chart-area", name: "エリアチャート", cat: "グラフ", icon: "📉", base: "chart", style: { type: "area" }, req: ["heading","chartData"] },

  // ─── Timeline / Process Layouts ───
  { id: "timeline", name: "横タイムライン", cat: "プロセス", icon: "🔄", base: "timeline", style: {}, req: ["heading","steps"] },
  { id: "tl-vertical", name: "縦タイムライン", cat: "プロセス", icon: "📍", base: "timeline", style: { vertical: true }, req: ["heading","steps"] },
  { id: "tl-roadmap", name: "ロードマップ", cat: "プロセス", icon: "🗺️", base: "timeline", style: { roadmap: true }, req: ["heading","steps"] },
  { id: "tl-arrows", name: "プロセスフロー", cat: "プロセス", icon: "➡️", base: "timeline", style: { arrows: true }, req: ["heading","steps"] },
  { id: "tl-milestone", name: "マイルストーン", cat: "プロセス", icon: "🏴", base: "timeline", style: { milestone: true }, req: ["heading","steps"] },

  // ─── Framework Layouts ───
  { id: "fw-swot", name: "SWOT分析", cat: "フレームワーク", icon: "🧭", base: "framework", style: { type: "swot" }, req: ["heading","columns"] },
  { id: "fw-matrix", name: "2x2マトリクス", cat: "フレームワーク", icon: "⊞", base: "framework", style: { type: "matrix" }, req: ["heading","columns"] },
  { id: "fw-pyramid", name: "ピラミッド", cat: "フレームワーク", icon: "🔺", base: "framework", style: { type: "pyramid" }, req: ["heading","items"] },
  { id: "fw-funnel", name: "ファネル", cat: "フレームワーク", icon: "🔽", base: "framework", style: { type: "funnel" }, req: ["heading","items"] },
  { id: "fw-cycle", name: "サイクル", cat: "フレームワーク", icon: "🔁", base: "framework", style: { type: "cycle" }, req: ["heading","items"] },
];

/** Get all unique categories in display order */
export const LAYOUT_CATEGORIES = [
  "表紙・締め", "テキスト", "箇条書き", "数値・KPI", "比較", "グラフ", "プロセス", "フレームワーク"
];

/** Find a layout by id, falling back to content */
export const getLayout = (id) =>
  LAYOUT_CATALOG.find(l => l.id === id) || LAYOUT_CATALOG.find(l => l.id === "content");

/** Get layouts compatible with a slide's data fields */
export const getCompatibleLayouts = (slide) => {
  const has = {
    body: !!slide.body,
    items: Array.isArray(slide.items) && slide.items.length > 0,
    stats: Array.isArray(slide.stats) && slide.stats.length > 0,
    columns: Array.isArray(slide.columns) && slide.columns.length > 0,
    chartData: Array.isArray(slide.chartData) && slide.chartData.length > 0,
    steps: Array.isArray(slide.steps) && slide.steps.length > 0,
    heading: !!slide.heading || !!slide.title,
    sub: !!slide.sub,
  };
  return LAYOUT_CATALOG.filter(layout => {
    // Cover/closing are special - only show if slide is cover/closing
    if (layout.id === "cover" || layout.id === "closing" || layout.id === "section-break") {
      return slide.layout === "cover" || slide.layout === "closing";
    }
    // Don't show cover/closing layouts for normal slides
    if (slide.layout === "cover" || slide.layout === "closing") {
      return layout.id === "cover" || layout.id === "closing" || layout.id === "section-break";
    }
    // Check if slide has required data for this layout
    return layout.req.every(field => has[field]);
  });
};

/** Map old layout IDs to new catalog IDs (backward compat) */
export const normalizeLayoutId = (id) => {
  const map = {
    "bullets": "bullets",
    "stats": "stats",
    "comparison": "comparison",
    "chart": "chart-bar",
    "timeline": "timeline",
    "content": "content",
    "cover": "cover",
    "closing": "closing",
  };
  return map[id] || id;
};
