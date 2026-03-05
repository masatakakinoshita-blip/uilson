import { useState } from "react";
import { MY_SKILLS, SHARED_SKILLS, PERM_DATA } from "../data/demoData";

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

export default function LearnView() {
  const [tab, setTab] = useState("teach");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>👁️ 学ばせる</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>AIにスキルを教えて、チーム全体で共有します</div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 0, padding: "0 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        {[
          { id: "teach", label: "新しく覚えさせる" },
          { id: "myskills", label: "自分のスキル" },
          { id: "perm", label: "🔒 データ権限" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "14px 16px",
              borderBottom: tab === t.id ? `3px solid ${V.accent}` : "none",
              background: tab === t.id ? V.white : "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? V.accent : V.t3,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "teach" && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: V.t1 }}>
                👁️ 学ばせる
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: V.t3 }}>
                あなたの業務ノウハウをAIに教えて、自動化する
              </p>
              <button
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  backgroundColor: V.accent,
                  color: V.white,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                ＋ 新しいスキルを覚えさせる
              </button>
            </div>

            {/* 5-Step Flow */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Step 1 - Completed */}
              <FlowStep
                number="①"
                title="きっかけ"
                subtitle="「見積書の作り方を覚えて」"
                status="completed"
                badge={{ text: "2月10日に同意済み", color: V.green }}
              >
                <div style={{ backgroundColor: V.main, padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: V.t2 }}>
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ color: V.t1 }}>あなた:</strong> 見積書の作り方を覚えて
                  </div>
                  <div>
                    <strong style={{ color: V.accent }}>AI:</strong> 承知しました。5～6件の見積書作成を観察して学習します。
                  </div>
                </div>
              </FlowStep>

              {/* Step 2 - Active */}
              <FlowStep
                number="②"
                title="観察中"
                subtitle="あと3件ほど見積を作ると次に進めます"
                status="active"
                badge={{ text: "記録中", color: V.orange }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ backgroundColor: V.main, padding: 12, borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🔗</span>
                    <span style={{ color: V.t2 }}>freee 見積書作成画面</span>
                  </div>
                  <div style={{ backgroundColor: V.card, border: `1px solid ${V.border}`, padding: 16, borderRadius: 6, fontSize: 12, lineHeight: 1.8, color: V.t2 }}>
                    <div style={{ marginBottom: 8 }}>▸ テンプレート選択 → <span style={{ backgroundColor: V.lime, color: V.navy, padding: "2px 6px", borderRadius: 3 }}>「IT導入」</span></div>
                    <div>▸ 単価欄に <span style={{ backgroundColor: V.orange, color: V.white, padding: "2px 6px", borderRadius: 3 }}>850,000</span> <span style={{ animation: "blink 1s infinite" }}>|</span></div>
                  </div>
                  <div style={{ fontSize: 12, color: V.t3 }}>
                    <div style={{ marginBottom: 6, fontWeight: 500 }}>記録済みの観察:</div>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 4 ? `1px solid ${V.border}` : "none" }}>
                        {i <= 3 ? (
                          <span style={{ color: V.green, fontWeight: "bold" }}>✓</span>
                        ) : (
                          <span style={{ color: V.orange, fontWeight: "bold", animation: "pulse 1s infinite" }}>●</span>
                        )}
                        <span>観察 {i}</span>
                        <span style={{ color: V.t4, fontSize: 11, marginLeft: "auto" }}>
                          {i <= 3 ? "2月15日" : "記録中"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FlowStep>

              {/* Step 3 - Waiting */}
              <FlowStep
                number="③"
                title="パターン発見"
                subtitle="学習データから規則性を抽出"
                status="waiting"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { name: "テンプレ選択ルール", percent: 95, color: V.green },
                    { name: "金額自動計算", percent: 87, color: V.accent },
                    { name: "承認ルート判定", percent: 72, color: V.orange },
                  ].map((pattern, idx) => (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: V.t2, fontWeight: 500 }}>{pattern.name}</span>
                        <span style={{ color: pattern.color, fontWeight: "bold" }}>{pattern.percent}%</span>
                      </div>
                      <div style={{ backgroundColor: V.border, height: 6, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ backgroundColor: pattern.color, height: "100%", width: `${pattern.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </FlowStep>

              {/* Step 4 - Waiting */}
              <FlowStep
                number="④"
                title="対話して確認"
                subtitle="学習ルールについて確認"
                status="waiting"
              >
                <div style={{ backgroundColor: V.main, padding: 16, borderRadius: 8, marginBottom: 12, fontSize: 13, color: V.t2 }}>
                  <strong style={{ color: V.accent }}>AI:</strong> 見積金額が500万円以下の場合、自動で承認を進める設定でいいでしょうか？
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["はい、500万まで自動", "いいえ、毎回確認", "金額で分けたい"].map((option, idx) => (
                    <button
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: V.card,
                        border: `1px solid ${V.border}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        color: V.t2,
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = V.main;
                        e.target.style.borderColor = V.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = V.card;
                        e.target.style.borderColor = V.border;
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FlowStep>

              {/* Step 5 - Waiting */}
              <FlowStep
                number="⑤"
                title="スキル完成"
                subtitle="自動化のセットアップ完了"
                status="waiting"
              >
                <div style={{ backgroundColor: V.main, padding: 16, borderRadius: 8, fontSize: 12, color: V.t2, lineHeight: 1.8 }}>
                  <div style={{ marginBottom: 12, fontWeight: 500, color: V.t1 }}>
                    「見積書自動作成」スキルが完成しました
                  </div>
                  <div style={{ backgroundColor: V.card, padding: 12, borderRadius: 6, marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>✓ テンプレート自動選択</div>
                    <div style={{ marginBottom: 8 }}>✓ 金額自動入力</div>
                    <div>✓ 自動承認（500万以下）</div>
                  </div>
                  <div style={{ color: V.t3, fontSize: 11 }}>
                    スキルID: 8f2a7c4b | 精度: 94%
                  </div>
                </div>
              </FlowStep>
            </div>
          </div>
        )}

        {tab === "myskills" && (
          <div>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>
              自分のスキル
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 32 }}>
              {MY_SKILLS.map((skill, idx) => (
                <SkillCard key={idx} skill={skill} />
              ))}
            </div>

            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>
              チーム共有スキル
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {SHARED_SKILLS.map((skill, idx) => (
                <SkillCard key={idx} skill={skill} shared={true} />
              ))}
            </div>
          </div>
        )}

        {tab === "perm" && (
          <div>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>
              🔒 データ権限設定
            </h2>
            <div style={{ backgroundColor: V.card, border: `1px solid ${V.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: V.main, borderBottom: `1px solid ${V.border}` }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700, color: V.t1 }}>システム</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700, color: V.t1 }}>データ種別</th>
                    <th style={{ padding: 12, textAlign: "center", fontWeight: 700, color: V.t1 }}>読取</th>
                    <th style={{ padding: 12, textAlign: "center", fontWeight: 700, color: V.t1 }}>書込</th>
                    <th style={{ padding: 12, textAlign: "center", fontWeight: 700, color: V.t1 }}>自動実行</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700, color: V.t1 }}>適用範囲</th>
                  </tr>
                </thead>
                <tbody>
                  {PERM_DATA.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < PERM_DATA.length - 1 ? `1px solid ${V.border}` : "none" }}>
                      <td style={{ padding: 12, color: V.t2 }}>{row.system}</td>
                      <td style={{ padding: 12, color: V.t2 }}>{row.dataType}</td>
                      <td style={{ padding: 12, textAlign: "center", color: row.read ? V.green : V.t4 }}>
                        {row.read ? "✓" : "—"}
                      </td>
                      <td style={{ padding: 12, textAlign: "center", color: row.write ? V.green : V.t4 }}>
                        {row.write ? "✓" : "—"}
                      </td>
                      <td style={{ padding: 12, textAlign: "center", color: row.autoRun ? V.green : V.t4 }}>
                        {row.autoRun ? "✓" : "—"}
                      </td>
                      <td style={{ padding: 12, color: V.t3, fontSize: 11 }}>{row.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Flow Step Component
function FlowStep({ number, title, subtitle, status, badge, children }) {
  const V = {
    bg: "#F0F2F7",
    sb: "#FFFFFF",
    main: "#F5F6FA",
    card: "#FFFFFF",
    border: "#DDE1EB",
    t1: "#333333",
    t2: "#555555",
    t3: "#888888",
    t4: "#AAAAAA",
    white: "#FFFFFF",
    accent: "#3C5996",
    green: "#2E7D32",
    orange: "#D4880F",
  };

  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isWaiting = status === "waiting";

  const borderColor = isCompleted ? V.green : isActive ? V.accent : V.border;
  const titleColor = isCompleted ? V.green : isActive ? V.accent : V.t3;

  return (
    <div
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: isWaiting ? V.main : V.card,
        borderRadius: 8,
        padding: 16,
        opacity: isWaiting ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: titleColor,
                minWidth: 24,
              }}
            >
              {number}
            </span>
            <div>
              <h3 style={{ margin: "0 0 2px 0", fontSize: 14, fontWeight: "bold", color: titleColor }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: V.t3 }}>
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        {badge && (
          <div
            style={{
              backgroundColor: badge.color,
              color: V.white,
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: "bold",
              animation: badge.text.includes("記録中") ? "pulse 1s infinite" : "none",
            }}
          >
            {badge.text}
          </div>
        )}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

// Skill Card Component
function SkillCard({ skill, shared = false }) {
  const V = {
    bg: "#F0F2F7",
    sb: "#FFFFFF",
    main: "#F5F6FA",
    card: "#FFFFFF",
    border: "#DDE1EB",
    t1: "#333333",
    t2: "#555555",
    t3: "#888888",
    t4: "#AAAAAA",
    white: "#FFFFFF",
    accent: "#3C5996",
    teal: "#2B4070",
    navy: "#1E2D50",
    green: "#2E7D32",
  };

  return (
    <div
      style={{
        backgroundColor: V.card,
        border: `1px solid ${V.border}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: "bold", color: V.t1 }}>
          {skill.name}
        </h3>
        <span
          style={{
            backgroundColor: shared ? V.teal : V.accent,
            color: V.white,
            padding: "2px 8px",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: "bold",
          }}
        >
          {shared ? "共有" : "個人"}
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          <span style={{ color: V.t3 }}>精度</span>
          <span style={{ color: V.green, fontWeight: "bold" }}>{skill.accuracy}%</span>
        </div>
        <div
          style={{
            backgroundColor: V.border,
            height: 4,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: V.green,
              height: "100%",
              width: `${skill.accuracy}%`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: V.t3,
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${V.border}`,
          paddingTop: 10,
        }}
      >
        <span>最終利用: {skill.lastUsed}</span>
        <span>利用数: {skill.usageCount}件</span>
      </div>
    </div>
  );
}
