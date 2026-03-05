export const UC = [
  {
    id: 1,
    cat: "曖昧な指示に答える",
    q: "最近やばい案件ある？",
    sources: [
      { name: "Salesforce", icon: "💼" },
      { name: "Teams", icon: "💬" },
      { name: "freee会計", icon: "💰" }
    ],
    judge: {
      level: "高リスク",
      label: "要対応",
      color: "#C83732",
      body: "ABC Corp案件の納期遅延、XYZ Inc提案資料未完成、DEF Projectの予算超過の3件が検出されました。早急な対応が必要です。"
    },
    actions: ["Salesforce案件を開く", "関係者にTeams通知"]
  },
  {
    id: 2,
    cat: "曖昧な指示に答える",
    q: "来月の展示会、間に合う？",
    sources: [
      { name: "Google Calendar", icon: "📅" },
      { name: "Asana", icon: "📋" },
      { name: "Slack", icon: "💬" }
    ],
    judge: {
      level: "中リスク",
      label: "注意",
      color: "#D4880F",
      body: "展示会は4月15日開始。現在のタスク完了予定日は4月12日。納期短縮が必要な工程が2つ見つかりました。"
    },
    actions: ["展示会プロジェクトを確認", "チームに期限短縮を通知"]
  },
  {
    id: 3,
    cat: "曖昧な指示に答える",
    q: "田中さんの今月の実績教えて",
    sources: [
      { name: "HubSpot", icon: "🎯" },
      { name: "Excel", icon: "📊" },
      { name: "Slack", icon: "💬" }
    ],
    judge: {
      level: "低リスク",
      label: "確認済み",
      color: "#2E7D32",
      body: "田中さんの今月売上は120万円。目標150万円に対して80%の達成率です。来週の提案1件で目標達成の可能性があります。"
    },
    actions: ["田中さんのパイプラインを表示", "営業支援資料を共有"]
  },
  {
    id: 4,
    cat: "AIが先に気づく",
    q: "来週ちょっとまずいかも",
    sources: [
      { name: "Google Calendar", icon: "📅" },
      { name: "Outlook", icon: "📧" },
      { name: "Notion", icon: "📝" }
    ],
    judge: {
      level: "高リスク",
      label: "警告",
      color: "#C83732",
      body: "3月10日に重要な3つの締切が集中しています。来週は別プロジェクトの納期と重複しており、リソース不足の可能性が高まっています。"
    },
    actions: ["スケジュール調整を提案", "リソース再配置の相談"]
  },
  {
    id: 5,
    cat: "AIが先に気づく",
    q: "稟議が止まってるやつない？",
    sources: [
      { name: "稟議システム", icon: "✅" },
      { name: "組織図", icon: "👥" },
      { name: "メール", icon: "📧" }
    ],
    judge: {
      level: "中リスク",
      label: "対応待ち",
      color: "#D4880F",
      body: "8件の稟議が処理待ちです。このうち4件は営業部長の承認待ち。承認待ち期間が平均3.5日で、承認遅延の傾向が見られます。"
    },
    actions: ["承認者に催促メール送信", "稟議ステータス一覧を表示"]
  },
  {
    id: 6,
    cat: "AIが先に気づく",
    q: "経費精算で変なの見つけた",
    sources: [
      { name: "経費管理システム", icon: "💳" },
      { name: "freee会計", icon: "💰" },
      { name: "規定ツール", icon: "📖" }
    ],
    judge: {
      level: "中リスク",
      label: "確認必要",
      color: "#D4880F",
      body: "高額な裁量経費3件が規定を超過。プロジェクト関連経費の分類エラーが2件検出されました。確認・修正が必要です。"
    },
    actions: ["変則経費の詳細を確認", "申請者に修正を依頼"]
  },
  {
    id: 7,
    cat: "部門を超えて繋げる",
    q: "○○のプロジェクト、他部門と被ってない？",
    sources: [
      { name: "プロジェクト管理", icon: "🗂️" },
      { name: "Teams", icon: "💬" },
      { name: "顧客DB", icon: "🏢" }
    ],
    judge: {
      level: "高リスク",
      label: "調整必要",
      color: "#C83732",
      body: "営業部の提案と開発部の既存プロジェクトで同じ顧客へのアプローチが見つかりました。営業開発が重複しており、コスト最適化の機会があります。"
    },
    actions: ["営業・開発・管理を連携", "統合提案書を作成"]
  },
  {
    id: 8,
    cat: "部門を超えて繋げる",
    q: "中途採用の人、もう独り立ちできる？",
    sources: [
      { name: "人事システム", icon: "👤" },
      { name: "スキル管理", icon: "🎓" },
      { name: "プロジェクト実績", icon: "📈" }
    ],
    judge: {
      level: "低リスク",
      label: "確認済み",
      color: "#2E7D32",
      body: "採用3ヶ月目の佐藤さんは基本スキルをクリア。配属部門でのプロジェクト3件を完遂し、上司評価も良好です。独立配置が可能な状態です。"
    },
    actions: ["配置変更を提案", "キャリアプラン相談を設定"]
  }
];
