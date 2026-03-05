const V = {
  bg: "#F0F2F7",
  sb: "#FFFFFF",
  main: "#F5F6FA",
  card: "#FFFFFF",
  border: "#DDE1EB",
  border2: "#C8CDD8",
  t1: "#333333",
  t2: "#555555",
  t3: "#888888",
  t4: "#AAAAAA",
  white: "#FFFFFF",
  accent: "#3C5996",
  teal: "#2B4070",
  navy: "#1E2D50",
  blue: "#3C5996",
  red: "#C83732",
  green: "#2E7D32",
  orange: "#D4880F",
  lime: "#ABCD00",
};

export default function ReviewView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>📊 振り返る</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>AIの判断精度とビジネスインパクトを可視化</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* KPI Dashboard */}
        <div className="g4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[
            { l: "判断精度", v: "94.2%", delta: "+2.1%", c: V.accent },
            { l: "処理時間削減", v: "67%", delta: "-12h/週", c: V.green },
            { l: "コスト削減効果", v: "¥2.4M/月", delta: "着実に増加中", c: V.orange },
            { l: "リスク検知", v: "23件", delta: "重大3件", c: V.red },
          ].map((k) => (
            <div key={k.l} style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: V.t3, marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: k.c, margin: "6px 0" }}>{k.v}</div>
                <div style={{ fontSize: 12, color: V.t3, fontWeight: 600 }}>{k.delta}</div>
              </div>
            </div>
          ))}
        </div>

        {/* スキル効果ランキング */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600 }}>スキル効果ランキング</div>
          <div style={{ padding: 16 }}>
            {[
              { name: "見積書自動作成", percent: 92 },
              { name: "日報レビュー", percent: 88 },
              { name: "経費チェック", percent: 85 },
              { name: "契約リスク検知", percent: 78 },
            ].map((skill, idx) => (
              <div key={idx} style={{ marginBottom: idx < 3 ? 16 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: V.t2, fontWeight: 500 }}>{skill.name}</span>
                  <span style={{ color: V.accent, fontWeight: 700 }}>{skill.percent}%</span>
                </div>
                <div style={{ backgroundColor: V.border, height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      backgroundColor: skill.percent >= 90 ? V.accent : skill.percent >= 80 ? V.green : V.orange,
                      height: "100%",
                      width: `${skill.percent}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* リスク検知サマリー */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600 }}>リスク検知サマリー</div>
          <div style={{ padding: 16, fontSize: 13, lineHeight: 1.8 }}>
            {[
              { type: "high", text: "B社の失注リスクを検知 → ¥3,200万維持", color: V.red },
              { type: "med", text: "鈴木さんの不正値引きを検出 → 規定違反を防止", color: V.orange },
              { type: "low", text: "展示会準備の遅延を事前検知 → スケジュール修正", color: V.green },
            ].map((item, idx) => (
              <div key={idx} style={{ padding: "10px 0", borderBottom: idx < 2 ? `1px solid ${V.border}` : "none", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span
                  style={{
                    backgroundColor: item.color,
                    color: V.white,
                    padding: "2px 8px",
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {item.type === "high" ? "重大" : item.type === "med" ? "注意" : "報告"}
                </span>
                <span style={{ color: V.t2 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AIからの改善提案 */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.lime}`, borderLeft: `4px solid ${V.lime}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: V.accent, marginBottom: 12 }}>💡 AIからの改善提案</div>
            {[
              "① 「見積書作成」の学習があと3件で完了。完了すると月8時間の追加削減が見込めます。",
              "② 営業週報の提出率が先月68%に低下。Teams連携で自動リマインドを推奨。",
              "③ 経費承認ルールの改善により、月2時間のさらなる削減が可能です。",
            ].map((suggestion, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 0",
                  paddingLeft: 12,
                  borderLeft: `3px solid ${V.accent}`,
                  marginBottom: idx < 2 ? 12 : 0,
                  fontSize: 13,
                  color: V.t2,
                  lineHeight: 1.6,
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
