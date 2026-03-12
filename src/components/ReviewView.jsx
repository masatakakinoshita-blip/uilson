const V = {
  bg: "#F4F1EE", sb: "#FFFFFF", main: "#FAF8F6", card: "#FFFFFF",
  border: "#E6E0DA", t1: "#3D3530", t2: "#5C534D", t3: "#8E857E",
  t4: "#B5ADA6", white: "#FFFFFF", accent: "#5B7DB8", teal: "#3D6098",
  green: "#5A9E6F", red: "#C87066", orange: "#C49A3C", lime: "#A8C868",
};

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return ms + "ms";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return secs + "秒";
  return Math.round(secs / 60) + "分";
}

export default function ReviewView({ skills, executionLogs, getSkillStats, getOverallStats }) {
  const stats = getOverallStats ? getOverallStats() : { totalExecutions: 0, successful: 0, failed: 0, successRate: 0, avgDuration: 0, todayCount: 0, weekCount: 0, topSkills: [], recentLogs: [] };
  const activeSkills = (skills || []).filter((s) => s.status === "active");
  const hasData = stats.totalExecutions > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>📊 ふりかえり</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>スキルのパフォーマンスと実行状況を分析</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* KPI Dashboard - Real Data */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[
            { l: "総実行回数", v: hasData ? stats.totalExecutions + "回" : "—", delta: "今週 " + stats.weekCount + "回", c: V.accent },
            { l: "成功率", v: hasData ? stats.successRate + "%" : "—", delta: hasData ? "成功 " + stats.successful + " / 失敗 " + stats.failed : "データなし", c: V.green },
            { l: "平均処理時間", v: hasData ? formatDuration(stats.avgDuration) : "—", delta: "今日 " + stats.todayCount + "回実行", c: V.orange },
            { l: "アクティブスキル", v: activeSkills.length + "件", delta: (() => { const fb = (executionLogs || []).filter(l => l.feedback); const good = fb.filter(l => l.feedback === "good").length; return fb.length > 0 ? `👍${good} 👎${fb.length - good}` : (skills || []).length + "件中"; })(), c: V.teal },
          ].map((k) => (
            <div key={k.l} style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}` }}>
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: V.t3, marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: k.c, margin: "6px 0" }}>{k.v}</div>
                <div style={{ fontSize: 12, color: V.t3, fontWeight: 500 }}>{k.delta}</div>
              </div>
            </div>
          ))}
        </div>

        {!hasData ? (
          <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: V.t1, marginBottom: 8 }}>まだ実行データがありません</div>
            <div style={{ fontSize: 14, color: V.t3, lineHeight: 1.6 }}>
              スキルを作成して実行すると、ここにパフォーマンスデータが表示されます。<br />
              「おぼえる」からスキルを作成し、「おまかせ」または「聞いてみる」から実行してください。
            </div>
          </div>
        ) : (
          <>
            {/* Skill Performance Ranking */}
            {stats.topSkills.length > 0 && (
              <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, marginBottom: 16 }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600, color: V.t1 }}>スキル実行ランキング</div>
                <div style={{ padding: 16 }}>
                  {stats.topSkills.map((skill, idx) => (
                    <div key={skill.id || idx} style={{ marginBottom: idx < stats.topSkills.length - 1 ? 16 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: V.t2, fontWeight: 500 }}>
                          {idx + 1}. {skill.name}
                          <span style={{ color: V.t4, fontWeight: 400, marginLeft: 8 }}>({skill.count}回実行)</span>
                        </span>
                        <span style={{ color: skill.successRate >= 90 ? V.green : skill.successRate >= 70 ? V.orange : V.red, fontWeight: 700 }}>
                          成功率 {skill.successRate}%
                        </span>
                      </div>
                      <div style={{ backgroundColor: V.border, height: 8, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          backgroundColor: skill.successRate >= 90 ? V.green : skill.successRate >= 70 ? V.orange : V.red,
                          height: "100%", width: `${skill.successRate}%`, transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-Skill Stats */}
            <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}`, marginBottom: 16 }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600, color: V.t1 }}>スキル別パフォーマンス</div>
              <div style={{ padding: 16 }}>
                {activeSkills.length === 0 ? (
                  <div style={{ fontSize: 13, color: V.t3, textAlign: "center", padding: 20 }}>アクティブなスキルがありません</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {activeSkills.map((skill) => {
                      const ss = getSkillStats ? getSkillStats(skill.id) : { total: 0, success: 0, failed: 0, avgDuration: 0, successRate: 0 };
                      return (
                        <div key={skill.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 8 }}>{skill.name}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: V.t3 }}>実行回数</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: V.accent }}>{ss.total}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: V.t3 }}>成功率</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: ss.successRate >= 80 ? V.green : ss.successRate >= 50 ? V.orange : ss.total === 0 ? V.t4 : V.red }}>
                                {ss.total > 0 ? ss.successRate + "%" : "—"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: V.t3 }}>平均時間</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: V.t2 }}>{formatDuration(ss.avgDuration)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: V.t3 }}>失敗</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: ss.failed > 0 ? V.red : V.t4 }}>{ss.failed}回</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Execution Log */}
            <div style={{ background: V.card, borderRadius: 10, border: `1px solid ${V.border}` }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 16, fontWeight: 600, color: V.t1 }}>最近の実行ログ</div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {(stats.recentLogs || []).slice(0, 10).map((log, i) => {
                  const sc = { completed: V.green, failed: V.red, partial: V.orange }[log.status] || V.t4;
                  const sl = { completed: "✓", failed: "✗", partial: "△" }[log.status] || "?";
                  const time = new Date(log.timestamp).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={log.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${V.border}`, fontSize: 13 }}>
                      <span style={{ color: sc, fontWeight: 700, fontSize: 14, width: 20 }}>{sl}</span>
                      <span style={{ flex: 1, color: V.t2, fontWeight: 500 }}>
                        {log.skillName}
                        {log.scheduled && <span style={{ marginLeft: 6, fontSize: 10, color: V.teal, backgroundColor: V.teal + "12", padding: "1px 5px", borderRadius: 6 }}>🕐 自動</span>}
                        {log.feedback && <span style={{ marginLeft: 6, fontSize: 10, color: log.feedback === "good" ? V.green : V.red }}>{log.feedback === "good" ? "👍" : "👎"}</span>}
                      </span>
                      <span style={{ color: V.t3, fontSize: 12 }}>{formatDuration(log.duration)}</span>
                      <span style={{ color: V.t4, fontSize: 11, width: 90, textAlign: "right" }}>{time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
