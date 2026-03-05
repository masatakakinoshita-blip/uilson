export const TASKS = [
  {
    id: 1,
    title: "ABC Corp提案資料の最終確認",
    status: "running",
    time: "残り2時間",
    detail: "営業チームからの依頼で明日朝の提案に向けて資料をレビュー中"
  },
  {
    id: 2,
    title: "3月の売上レポート作成",
    status: "done",
    time: "完了",
    detail: "全部門の実績データを集計し、経営層向けレポートを完成"
  },
  {
    id: 3,
    title: "新入社員研修資料の準備",
    status: "wait",
    time: "4月開始",
    detail: "人事部から資料提出待ち、実施予定は4月中旬"
  },
  {
    id: 4,
    title: "顧客満足度アンケート分析",
    status: "sched",
    time: "来週開始予定",
    detail: "2月実施のアンケート結果をデータ分析し、改善提案を作成"
  },
  {
    id: 5,
    title: "システム権限レビュー",
    status: "done",
    time: "完了",
    detail: "全従業員の業務システムアクセス権限を監査・整理完了"
  }
];

export const WORKFLOWS = [
  {
    id: 1,
    title: "日次営業レポート生成",
    schedule: "毎日 9:00",
    lastRun: "今日 09:15",
    nextRun: "明日 09:00"
  },
  {
    id: 2,
    title: "経費申請リマインダー",
    schedule: "毎週金曜 18:00",
    lastRun: "先週金 18:05",
    nextRun: "今週金 18:00"
  },
  {
    id: 3,
    title: "月次予算消化状況レポート",
    schedule: "毎月末 17:00",
    lastRun: "2月末 17:20",
    nextRun: "3月31日 17:00"
  }
];

export const MY_SKILLS = [
  {
    id: 1,
    name: "売上機会の自動検出",
    scope: "self",
    accuracy: "87%",
    lastUsed: "昨日",
    usageCount: 42
  },
  {
    id: 2,
    name: "予算超過アラート",
    scope: "self",
    accuracy: "95%",
    lastUsed: "3日前",
    usageCount: 28
  },
  {
    id: 3,
    name: "顧客リスク分析",
    scope: "team",
    accuracy: "82%",
    lastUsed: "今週",
    usageCount: 156
  },
  {
    id: 4,
    name: "プロジェクト進捗予測",
    scope: "team",
    accuracy: "79%",
    lastUsed: "先週",
    usageCount: 89
  }
];

export const SHARED_SKILLS = [
  {
    id: 1,
    name: "法務リスク判定",
    scope: "team",
    accuracy: "91%",
    lastUsed: "今日",
    usageCount: 234
  },
  {
    id: 2,
    name: "採用候補者スコアリング",
    scope: "team",
    accuracy: "88%",
    lastUsed: "2日前",
    usageCount: 67
  },
  {
    id: 3,
    name: "市場トレンド分析",
    scope: "team",
    accuracy: "76%",
    lastUsed: "先週",
    usageCount: 43
  }
];

export const PERM_DATA = [
  {
    system: "Salesforce",
    data: "顧客基本情報",
    read: true,
    write: false,
    auto: true,
    scope: "営業部"
  },
  {
    system: "Salesforce",
    data: "商談情報",
    read: true,
    write: true,
    auto: false,
    scope: "営業部門"
  },
  {
    system: "HubSpot",
    data: "リード情報",
    read: true,
    write: true,
    auto: true,
    scope: "マーケティング"
  },
  {
    system: "Google Workspace",
    data: "メール本文",
    read: true,
    write: false,
    auto: false,
    scope: "全体"
  },
  {
    system: "freee会計",
    data: "経費申請",
    read: true,
    write: true,
    auto: true,
    scope: "経理"
  },
  {
    system: "freee会計",
    data: "予算データ",
    read: true,
    write: false,
    auto: false,
    scope: "管理層"
  },
  {
    system: "GitHub",
    data: "コミット履歴",
    read: true,
    write: false,
    auto: true,
    scope: "開発部"
  },
  {
    system: "Slack",
    data: "チャネルメッセージ",
    read: true,
    write: false,
    auto: false,
    scope: "部門別"
  },
  {
    system: "Asana",
    data: "タスク進捗",
    read: true,
    write: true,
    auto: true,
    scope: "プロジェクト単位"
  },
  {
    system: "Notion",
    data: "ナレッジベース",
    read: true,
    write: true,
    auto: false,
    scope: "全体"
  },
  {
    system: "Google Analytics",
    data: "アクセス分析",
    read: true,
    write: false,
    auto: true,
    scope: "マーケティング"
  }
];
