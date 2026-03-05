import { TASKS, WORKFLOWS } from "../data/demoData";

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

export default function RunView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>⚡ 動かす</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>AIが自動で実行中のタスクとワークフロー</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* KPI Cards */}
        <div className="g3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[
            { label: "今日の実行", value: "12件", color: V.accent },
            { label: "成功率", value: "98.5%", color: V.green },
            { label: "平均処理時間", value: "2.3分", color: V.orange },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: V.t3 }}>{kpi.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: kpi.color, margin: "4px 0" }}>{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tasks List */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600 }}>実行中のタスク</div>
          {TASKS.map((t, i) => {
            const lc = { done: V.green, running: V.accent, wait: V.orange, sched: V.t4 }[t.status];
            const lb = { done: "完了", running: "実行中", wait: "承認待ち", sched: "予定" }[t.status];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < TASKS.length - 1 ? `1px solid ${V.border}` : "none" }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: lc,
                    flexShrink: 0,
                    boxShadow: t.status === "running" ? `0 0 6px rgba(60,89,150,0.3)` : "none",
                    animation: t.status === "running" ? "pulse 1.5s infinite" : "none",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: V.t3, marginTop: 2 }}>{t.from}</div>
                </div>
                <span style={{ fontSize: 13, color: lc, fontWeight: 600 }}>{lb}</span>
                <span style={{ fontSize: 13, color: V.t3, width: 80, textAlign: "right" }}>{t.time}</span>
              </div>
            );
          })}
        </div>

        {/* Workflows */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600 }}>定期ワークフロー</div>
          <div style={{ padding: 16 }}>
            <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {WORKFLOWS.map((w, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: i % 2 === 1 || i === WORKFLOWS.length - 1 ? "none" : `1px solid ${V.border}`, borderRight: i % 2 === 0 && i !== WORKFLOWS.length - 1 ? `1px solid ${V.border}` : "none", paddingRight: i % 2 === 0 ? 16 : 0, paddingLeft: i % 2 === 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14, color: V.t1 }}>{w.n}</strong>
                      <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>
                        <div>最終実行: {w.lastRun}</div>
                        <div>次回実行: {w.nextRun}</div>
                      </div>
                    </div>
                    <div style={{ width: 40, height: 22, borderRadius: 11, background: V.green, position: "relative", cursor: "pointer", flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
