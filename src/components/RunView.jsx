const V = {
  bg: "#F4F1EE", sb: "#FFFFFF", main: "#FAF8F6", card: "#FFFFFF",
  border: "#E6E0DA", t1: "#3D3530", t2: "#5C534D", t3: "#8E857E",
  t4: "#B5ADA6", white: "#FFFFFF", accent: "#5B7DB8", teal: "#3D6098",
  green: "#5A9E6F", red: "#C87066", orange: "#C49A3C", lime: "#A8C868",
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return mins + "分前";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "時間前";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "日前";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return ms + "ms";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return secs + "秒";
  const mins = Math.round(secs / 60);
  return mins + "分";
}

export default function RunView({ skills, executionLogs, getOverallStats, onExecuteSkill }) {
  const stats = getOverallStats ? getOverallStats() : { todayCount: 0, successRate: 0, avgDuration: 0, recentLogs: [], totalExecutions: 0 };
  const activeSkills = (skills || []).filter((s) => s.status === "active");
  const recentLogs = stats.recentLogs || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>⚡ おまかせ</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>スキルをワンタップで実行、実行履歴をリアルタイム追跡</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* KPI Cards - Real Data */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[
            { label: "今日の実行", value: stats.todayCount + "件", color: V.accent },
            { label: "成功率", value: stats.totalExecutions > 0 ? stats.successRate + "%" : "—", color: V.green },
            { label: "平均処理時間", value: stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "—", color: V.orange },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden" }}>
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: V.t3 }}>{kpi.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: kpi.color, margin: "4px 0" }}>{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Execute - Active Skills */}
        {activeSkills.length > 0 && (
          <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600, color: V.t1 }}>クイック実行</div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {activeSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onExecuteSkill && onExecuteSkill(skill)}
                  style={{
                    padding: "14px 16px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    backgroundColor: V.accent + "08", border: `1.5px solid ${V.accent}30`,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = V.accent; e.currentTarget.style.backgroundColor = V.accent + "15"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = V.accent + "30"; e.currentTarget.style.backgroundColor = V.accent + "08"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>▶</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: V.accent }}>{skill.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: V.t3 }}>
                    実行 {skill.usageCount || 0}回 · {skill.lastUsed ? timeAgo(skill.lastUsed) : "未実行"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Execution History - Real Data */}
        <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: V.t1 }}>実行履歴</span>
            <span style={{ fontSize: 12, color: V.t3 }}>累計 {stats.totalExecutions}件</span>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: V.t3 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>まだ実行履歴がありません</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>スキルを実行すると、ここに履歴が表示されます</div>
            </div>
          ) : (
            recentLogs.map((log, i) => {
              const sc = { completed: V.green, failed: V.red, partial: V.orange }[log.status] || V.t4;
              const sl = { completed: "完了", failed: "失敗", partial: "一部完了" }[log.status] || log.status;
              return (
                <div key={log.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < recentLogs.length - 1 ? `1px solid ${V.border}` : "none" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: sc, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: V.t1 }}>{log.skillName}</div>
                    <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>
                      {log.summary ? log.summary.substring(0, 60) + (log.summary.length > 60 ? "..." : "") : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: sc, fontWeight: 600 }}>{sl}</span>
                    <div style={{ fontSize: 11, color: V.t4, marginTop: 2 }}>{timeAgo(log.timestamp)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: V.t3, width: 60, textAlign: "right" }}>{formatDuration(log.duration)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
