// Default slides shown before AI generation
export const DEFAULT_SLIDES = [
  {
    id: 1,
    title: "表紙",
    layout: "cover",
    layoutLabel: "表紙",
    heading: "プレゼン資料",
    sub: "AIで自動生成されたスライド",
    body: "",
    note: "UILSON",
    bg: "#1E2D50",
    light: true,
    dataSrc: []
  },
  {
    id: 2,
    title: "目次",
    layout: "content",
    layoutLabel: "コンテンツ",
    heading: "目次",
    sub: "",
    body: "左のチャットでプレゼンの内容を入力してください。\nAIが自動でスライド構成を生成します。",
    note: "",
    bg: "#FFFFFF",
    light: false,
    dataSrc: []
  }
];

// Consultant-style preset templates
export const PRESET_TEMPLATES = [
  {
    id: "default",
    name: "UILSON Standard",
    desc: "シンプルで読みやすいデフォルトテーマ",
    coverBg: "#1E2D50",
    closingBg: "#2B4070",
    contentBg: "#FFFFFF",
    accent: "#3C5996",
    textDark: "#333333",
    textLight: "#FFFFFF",
    subDark: "#666666",
    subLight: "rgba(255,255,255,0.7)",
    headingFont: "Yu Gothic",
    bodyFont: "Yu Gothic",
    accentBarWidth: "80px",
    accentBarHeight: "4px",
    headingSizeCover: "48px",
    headingSizeContent: "36px",
    coverAlign: "center",
    contentAlign: "left",
    preview: { coverGrad: null, stripe: null }
  },
  {
    id: "mckinsey",
    name: "McKinsey Blue",
    desc: "濃紺ベース。明快でロジカルな印象。",
    coverBg: "#003A70",
    closingBg: "#002855",
    contentBg: "#FFFFFF",
    accent: "#0072CE",
    textDark: "#1A1A1A",
    textLight: "#FFFFFF",
    subDark: "#5A5A5A",
    subLight: "rgba(200,220,240,0.85)",
    headingFont: "Georgia, serif",
    bodyFont: "Arial, Helvetica, sans-serif",
    accentBarWidth: "60px",
    accentBarHeight: "3px",
    headingSizeCover: "44px",
    headingSizeContent: "32px",
    coverAlign: "left",
    contentAlign: "left",
    preview: { coverGrad: "linear-gradient(135deg, #003A70 0%, #005EB8 100%)", stripe: "#0072CE" }
  },
  {
    id: "bcg",
    name: "BCG Green",
    desc: "グリーンアクセント。データドリブンな印象。",
    coverBg: "#1B3A2D",
    closingBg: "#14291F",
    contentBg: "#FAFBFA",
    accent: "#00A651",
    textDark: "#2C2C2C",
    textLight: "#FFFFFF",
    subDark: "#6B6B6B",
    subLight: "rgba(180,230,200,0.8)",
    headingFont: "Helvetica Neue, Arial, sans-serif",
    bodyFont: "Helvetica Neue, Arial, sans-serif",
    accentBarWidth: "48px",
    accentBarHeight: "4px",
    headingSizeCover: "46px",
    headingSizeContent: "34px",
    coverAlign: "left",
    contentAlign: "left",
    preview: { coverGrad: "linear-gradient(160deg, #1B3A2D 0%, #2D5F47 100%)", stripe: "#00A651" }
  },
  {
    id: "bain",
    name: "Bain Red",
    desc: "赤アクセント。インパクト重視の構成。",
    coverBg: "#CC0000",
    closingBg: "#A30000",
    contentBg: "#FFFFFF",
    accent: "#CC0000",
    textDark: "#1A1A1A",
    textLight: "#FFFFFF",
    subDark: "#555555",
    subLight: "rgba(255,200,200,0.8)",
    headingFont: "Georgia, Times New Roman, serif",
    bodyFont: "Arial, Helvetica, sans-serif",
    accentBarWidth: "100%",
    accentBarHeight: "3px",
    headingSizeCover: "42px",
    headingSizeContent: "30px",
    coverAlign: "center",
    contentAlign: "left",
    preview: { coverGrad: null, stripe: "#CC0000" }
  },
  {
    id: "minimal",
    name: "Minimal Mono",
    desc: "白黒ベース。情報に集中させるミニマルデザイン。",
    coverBg: "#000000",
    closingBg: "#1A1A1A",
    contentBg: "#FFFFFF",
    accent: "#000000",
    textDark: "#1A1A1A",
    textLight: "#FFFFFF",
    subDark: "#888888",
    subLight: "rgba(255,255,255,0.6)",
    headingFont: "Helvetica Neue, Arial, sans-serif",
    bodyFont: "Helvetica Neue, Arial, sans-serif",
    accentBarWidth: "32px",
    accentBarHeight: "2px",
    headingSizeCover: "52px",
    headingSizeContent: "36px",
    coverAlign: "left",
    contentAlign: "left",
    preview: { coverGrad: null, stripe: "#000000" }
  },
  {
    id: "deloitte",
    name: "Deloitte Style",
    desc: "ダークティール。信頼感と先進性を両立。",
    coverBg: "#0C1F2C",
    closingBg: "#071520",
    contentBg: "#FFFFFF",
    accent: "#86BC25",
    textDark: "#2D2D2D",
    textLight: "#FFFFFF",
    subDark: "#6B6B6B",
    subLight: "rgba(200,230,160,0.7)",
    headingFont: "Open Sans, Arial, sans-serif",
    bodyFont: "Open Sans, Arial, sans-serif",
    accentBarWidth: "72px",
    accentBarHeight: "4px",
    headingSizeCover: "44px",
    headingSizeContent: "32px",
    coverAlign: "left",
    contentAlign: "left",
    preview: { coverGrad: "linear-gradient(135deg, #0C1F2C 0%, #1A3A4F 100%)", stripe: "#86BC25" }
  }
];

export const MODEL_COLORS = {
  claude: "#D97757",
  chatgpt: "#10A37F",
  gemini: "#4285F4"
};

export const MODEL_NAMES = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini"
};

export const XLSX_CHAT = [
  {
    role: "user",
    text: "経費レポートのExcelファイルを作成してもらえますか？部門別の支出をまとめたいんです"
  },
  {
    role: "ai",
    text: "もちろんです。部門別の経費をまとめたExcelファイルを作成します。月別推移、部門別比較、予算との差分分析を含めるのはどうでしょう？"
  },
  {
    role: "user",
    text: "いいですね。あと営業部と開発部、経理部のそれぞれのシートがあると使いやすいな"
  },
  {
    role: "ai",
    text: "了解です。部門別に3つのシートを作成し、それぞれの詳細データと合計シートを付けます。また自動計算機能も組み込みますね。"
  },
  {
    role: "user",
    text: "完璧です。よろしくお願いします"
  },
  {
    role: "ai",
    text: "経費レポートのExcelファイルが完成しました。部門別シート、合計集計シート、グラフ付きで準備できています。ダウンロードしてご利用ください。"
  }
];

export const DOCX_CHAT = [
  {
    role: "user",
    text: "新規プロジェクトの提案書をWord形式で作成してほしいです。クライアントに提出するものなので、見栄えも大事です"
  },
  {
    role: "ai",
    text: "承知しました。クライアント向けの提案書を作成します。プロジェクト概要、実行計画、予算、期待効果などを含めた構成でいいですか？"
  },
  {
    role: "user",
    text: "そうですね。あと会社のロゴやヘッダーフッターも入れてもらえますか？"
  },
  {
    role: "ai",
    text: "もちろんです。会社ロゴを挿入し、プロフェッショナルなヘッダーフッターを設定します。フォント、色、レイアウトもプレミアムな仕上がりにしますね。"
  },
  {
    role: "user",
    text: "それで完璧です。作成お願いします"
  },
  {
    role: "ai",
    text: "提案書のWord文書が完成しました。カラフルなデザイン、会社ブランディングを反映させています。ダウンロードしてご確認ください。"
  }
];
