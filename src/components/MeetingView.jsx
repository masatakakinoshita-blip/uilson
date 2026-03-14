import { useState, useEffect, useCallback } from "react";

const V = {
  bg: "#F4F1EE",
  card: "#FFFFFF",
  border: "#E6E0DA",
  t1: "#3D3530",
  t2: "#5C534D",
  t3: "#8E857E",
  t4: "#B5ADA6",
  white: "#FFFFFF",
  accent: "#5B7DB8",
  teal: "#3D6098",
  green: "#5A9E6F",
  red: "#C87066",
  orange: "#D4880F",
  lime: "#A8C868",
};

// Timezone mappings for validation
const TZ_OFFSETS = {
  "Asia/Tokyo": 9,
  "Asia/Kolkata": 5.5,
  "Asia/Calcutta": 5.5,
  "America/New_York": -5,
  "America/Los_Angeles": -8,
  "Europe/London": 0,
  "UTC": 0,
};

// Detect issues in calendar events
function analyzeEvents(googleEvents, outlookEvents, zoomMeetings) {
  const issues = [];
  const allEvents = [
    ...googleEvents.map((e) => ({ ...e, source: "google" })),
    ...outlookEvents.map((e) => ({ ...e, source: "outlook" })),
  ];

  // Build Zoom meeting lookup by join_url
  const zoomByUrl = {};
  zoomMeetings.forEach((m) => {
    if (m.join_url) zoomByUrl[m.join_url] = m;
  });

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  allEvents.forEach((event) => {
    const start = new Date(event.start);
    // Only check events in the next 3 days
    if (start < now || start > threeDaysLater) return;

    const summary = (event.summary || "").toLowerCase();
    const location = (event.location || "").toLowerCase();

    // 1. Check for Zoom link in event
    const zoomLinkMatch = (event.location || event.summary || "").match(
      /https:\/\/[a-z0-9-]*\.?zoom\.us\/j\/(\d+)/i
    );

    // 2. Detect missing Zoom link for meetings that look like they need one
    const looksLikeMeeting =
      summary.includes("meeting") ||
      summary.includes("ミーティング") ||
      summary.includes("会議") ||
      summary.includes("mtg") ||
      summary.includes("sync") ||
      summary.includes("standup") ||
      summary.includes("review");

    if (looksLikeMeeting && !zoomLinkMatch && !location.includes("zoom") && !location.includes("teams") && !location.includes("meet.google")) {
      issues.push({
        type: "missing_link",
        severity: "warning",
        event,
        message: "Zoom/会議リンクが設定されていません",
        suggestion: "新しいZoomミーティングを作成してリンクを追加",
      });
    }

    // 3. If Zoom link exists, validate it
    if (zoomLinkMatch) {
      const meetingId = zoomLinkMatch[1];
      const zoomMeeting = Object.values(zoomByUrl).find(
        (m) => m.join_url && m.join_url.includes(meetingId)
      );

      if (zoomMeeting) {
        // Check timezone mismatch
        const zoomStart = new Date(zoomMeeting.start_time);
        const calStart = new Date(event.start);
        const timeDiffMinutes = Math.abs(zoomStart - calStart) / (1000 * 60);

        if (timeDiffMinutes > 5) {
          // More than 5 minutes difference
          const hoursDiff = Math.round(timeDiffMinutes / 60);
          issues.push({
            type: "time_mismatch",
            severity: "error",
            event,
            zoomMeeting,
            message: `Zoomの開始時間とカレンダーが${hoursDiff > 0 ? hoursDiff + "時間" : Math.round(timeDiffMinutes) + "分"}ずれています`,
            suggestion: "正しい時間で新しいZoomミーティングを再作成",
          });
        }

        // Check if timezone is India but event is for Tokyo team
        if (
          zoomMeeting.timezone &&
          (zoomMeeting.timezone.includes("Kolkata") || zoomMeeting.timezone.includes("Calcutta"))
        ) {
          issues.push({
            type: "wrong_timezone",
            severity: "warning",
            event,
            zoomMeeting,
            message: `Zoomのタイムゾーンがインド(IST)に設定されています`,
            suggestion: "東京時間(JST)で新しいZoomミーティングを作成",
          });
        }
      }
    }

    // 4. Check for events very early or late (possible timezone confusion)
    const hour = start.getHours();
    if ((hour >= 0 && hour <= 4) || (hour >= 23 && hour <= 24)) {
      // Very unusual meeting time - might be timezone error
      issues.push({
        type: "unusual_time",
        severity: "info",
        event,
        message: `異常な時間帯（${hour}時）の会議です。タイムゾーンの設定ミスの可能性があります`,
        suggestion: "会議時間を確認してください",
      });
    }
  });

  return issues;
}

export default function MeetingView({ auth, data }) {
  const [issues, setIssues] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [creatingMeeting, setCreatingMeeting] = useState(null); // issue index being fixed
  const [newMeetingForm, setNewMeetingForm] = useState({
    topic: "",
    start_time: "",
    duration: 60,
    timezone: "Asia/Tokyo",
  });

  const scan = useCallback(() => {
    setScanning(true);
    const googleEvents = data.events || [];
    const outlookEvents = data.outlookEvents || [];
    const zoomMeetings = data.zoomMeetings || [];
    const found = analyzeEvents(googleEvents, outlookEvents, zoomMeetings);
    setIssues(found);
    setScanning(false);
  }, [data.events, data.outlookEvents, data.zoomMeetings]);

  useEffect(() => {
    if (data.events.length > 0 || data.outlookEvents.length > 0) {
      scan();
    }
  }, [data.events, data.outlookEvents, data.zoomMeetings, scan]);

  const createReplacementMeeting = async (issue, idx) => {
    if (!auth.zoomToken) {
      setActionLog((prev) => [
        ...prev,
        { type: "error", message: "Zoomが接続されていません。設定からZoomを接続してください。", time: new Date() },
      ]);
      return;
    }

    setCreatingMeeting(idx);

    // Pre-fill form from event data
    const event = issue.event;
    const start = new Date(event.start);
    // Format for datetime-local input
    const pad = (n) => String(n).padStart(2, "0");
    const localStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;

    const endTime = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
    const durationMin = Math.round((endTime - start) / (1000 * 60));

    setNewMeetingForm({
      topic: event.summary || "Meeting",
      start_time: localStr,
      duration: durationMin || 60,
      timezone: "Asia/Tokyo",
    });
  };

  const submitNewMeeting = async (issueIdx) => {
    const issue = issues[issueIdx];
    try {
      setActionLog((prev) => [
        ...prev,
        { type: "info", message: `新しいZoomミーティングを作成中: ${newMeetingForm.topic}`, time: new Date() },
      ]);

      // Convert local datetime to ISO format with timezone
      const startDate = new Date(newMeetingForm.start_time);
      const isoStart = startDate.toISOString();

      const meetingBody = {
        topic: newMeetingForm.topic,
        type: 2, // Scheduled meeting
        start_time: isoStart,
        duration: newMeetingForm.duration,
        timezone: newMeetingForm.timezone,
        settings: {
          join_before_host: true,
          waiting_room: false,
          auto_recording: "none",
          mute_upon_entry: true,
        },
      };

      const res = await fetch("/api/zoom-meetings?action=create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zoom-token": auth.zoomToken,
        },
        body: JSON.stringify({ action: "create", meeting: meetingBody }),
      });

      const result = await res.json();

      if (result.id && result.join_url) {
        setActionLog((prev) => [
          ...prev,
          {
            type: "success",
            message: `Zoomミーティング作成完了! ID: ${result.id}`,
            joinUrl: result.join_url,
            time: new Date(),
          },
        ]);

        // Try to update Google Calendar event with new Zoom link
        if (issue.event.source === "google" && auth.token) {
          try {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${issue.event.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${auth.token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  location: result.join_url,
                  description:
                    (issue.event.description || "") +
                    `\n\n[UILSON] Zoom meeting updated: ${result.join_url}`,
                }),
              }
            );
            setActionLog((prev) => [
              ...prev,
              { type: "success", message: "Googleカレンダーを更新しました", time: new Date() },
            ]);
          } catch (e) {
            setActionLog((prev) => [
              ...prev,
              { type: "warning", message: `カレンダー更新に失敗: ${e.message}`, time: new Date() },
            ]);
          }
        }

        // Try to send Slack notification if connected
        if (auth.slackToken) {
          try {
            await fetch("/api/slack-messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: auth.slackToken,
                action: "notify",
                message: `会議「${newMeetingForm.topic}」のZoomリンクが更新されました。\n新しいリンク: ${result.join_url}`,
              }),
            });
            setActionLog((prev) => [
              ...prev,
              { type: "success", message: "Slack通知を送信しました", time: new Date() },
            ]);
          } catch {
            // Slack notification is best-effort
          }
        }

        // Mark issue as resolved
        setIssues((prev) =>
          prev.map((iss, i) =>
            i === issueIdx ? { ...iss, resolved: true, newJoinUrl: result.join_url } : iss
          )
        );
      } else {
        setActionLog((prev) => [
          ...prev,
          { type: "error", message: `Zoom作成エラー: ${JSON.stringify(result)}`, time: new Date() },
        ]);
      }
    } catch (e) {
      setActionLog((prev) => [
        ...prev,
        { type: "error", message: `エラー: ${e.message}`, time: new Date() },
      ]);
    }
    setCreatingMeeting(null);
  };

  const severityColor = (s) =>
    s === "error" ? V.red : s === "warning" ? V.orange : V.accent;
  const severityLabel = (s) =>
    s === "error" ? "要修正" : s === "warning" ? "注意" : "情報";
  const logColor = (t) =>
    t === "error" ? V.red : t === "success" ? V.green : t === "warning" ? V.orange : V.accent;

  const hasConnections = !!auth.token || !!auth.msToken;
  const hasZoom = !!auth.zoomToken;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: V.t1,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "28px" }}>📹</span>
          ミーティング管理
        </h1>
        <p style={{ color: V.t3, fontSize: "14px", margin: "8px 0 0 40px" }}>
          カレンダーとZoomの不整合を検出し、自動修正します
        </p>
      </div>

      {/* Connection Status Banner */}
      {(!hasConnections || !hasZoom) && (
        <div
          style={{
            background: `${V.orange}12`,
            border: `1px solid ${V.orange}40`,
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: V.t1 }}>
              接続が必要です
            </div>
            <div style={{ fontSize: "13px", color: V.t2, marginTop: "4px" }}>
              {!hasConnections && "Google CalendarまたはOutlookを接続してください。"}
              {hasConnections && !hasZoom && "Zoomを接続すると、ミーティングの自動修正が可能になります。"}
              設定(⚙️)から接続できます。
            </div>
          </div>
        </div>
      )}

      {/* Scan Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          label="検出された問題"
          value={issues.filter((i) => !i.resolved).length}
          icon="🔍"
          color={issues.filter((i) => !i.resolved).length > 0 ? V.red : V.green}
        />
        <StatCard
          label="解決済み"
          value={issues.filter((i) => i.resolved).length}
          icon="✅"
          color={V.green}
        />
        <StatCard
          label="次の3日間の会議"
          value={(data.events || []).length + (data.outlookEvents || []).length}
          icon="📅"
          color={V.accent}
        />
        <StatCard
          label="Zoom会議"
          value={(data.zoomMeetings || []).length}
          icon="📹"
          color={V.teal}
        />
      </div>

      {/* Scan Button */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={scan}
          disabled={scanning || !hasConnections}
          style={{
            background: V.accent,
            color: V.white,
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: scanning || !hasConnections ? "not-allowed" : "pointer",
            opacity: scanning || !hasConnections ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {scanning ? "⏳ スキャン中..." : "🔄 再スキャン"}
        </button>
      </div>

      {/* Issues List */}
      {issues.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: V.t1, marginBottom: "16px" }}>
            検出された問題
          </h2>
          {issues.map((issue, idx) => (
            <div
              key={idx}
              style={{
                background: issue.resolved ? `${V.green}08` : V.card,
                border: `1px solid ${issue.resolved ? V.green + "40" : V.border}`,
                borderRadius: "10px",
                padding: "18px",
                marginBottom: "12px",
                borderLeft: `4px solid ${issue.resolved ? V.green : severityColor(issue.severity)}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* Severity badge */}
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: issue.resolved ? V.green : severityColor(issue.severity),
                      background: issue.resolved
                        ? `${V.green}15`
                        : `${severityColor(issue.severity)}15`,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                  >
                    {issue.resolved ? "解決済み" : severityLabel(issue.severity)}
                  </span>

                  {/* Event name and time */}
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "600",
                      color: V.t1,
                      marginBottom: "4px",
                    }}
                  >
                    {issue.event.summary || "(タイトルなし)"}
                  </div>
                  <div style={{ fontSize: "13px", color: V.t3, marginBottom: "8px" }}>
                    {new Date(issue.event.start).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" | "}
                    {issue.event.source === "google" ? "Google Calendar" : "Outlook"}
                  </div>

                  {/* Issue description */}
                  <div style={{ fontSize: "14px", color: V.t2, marginBottom: "6px" }}>
                    {issue.message}
                  </div>
                  <div style={{ fontSize: "13px", color: V.accent }}>
                    💡 {issue.suggestion}
                  </div>

                  {/* Resolved: show new link */}
                  {issue.resolved && issue.newJoinUrl && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: `${V.green}10`,
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: V.green,
                        wordBreak: "break-all",
                      }}
                    >
                      新しいリンク:{" "}
                      <a
                        href={issue.newJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: V.accent }}
                      >
                        {issue.newJoinUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!issue.resolved && hasZoom && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {issue.type !== "unusual_time" && (
                      <button
                        onClick={() => createReplacementMeeting(issue, idx)}
                        disabled={creatingMeeting !== null}
                        style={{
                          background: V.accent,
                          color: V.white,
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 14px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: creatingMeeting !== null ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: creatingMeeting !== null ? 0.5 : 1,
                        }}
                      >
                        🔧 修正する
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline meeting creation form */}
              {creatingMeeting === idx && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    background: "#F5F6FA",
                    borderRadius: "8px",
                    border: `1px solid ${V.border}`,
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: V.t1,
                    }}
                  >
                    新しいZoomミーティングを作成
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>タイトル</label>
                      <input
                        value={newMeetingForm.topic}
                        onChange={(e) =>
                          setNewMeetingForm((f) => ({ ...f, topic: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>開始日時</label>
                      <input
                        type="datetime-local"
                        value={newMeetingForm.start_time}
                        onChange={(e) =>
                          setNewMeetingForm((f) => ({ ...f, start_time: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>時間（分）</label>
                      <input
                        type="number"
                        value={newMeetingForm.duration}
                        onChange={(e) =>
                          setNewMeetingForm((f) => ({
                            ...f,
                            duration: parseInt(e.target.value) || 60,
                          }))
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>タイムゾーン</label>
                      <select
                        value={newMeetingForm.timezone}
                        onChange={(e) =>
                          setNewMeetingForm((f) => ({ ...f, timezone: e.target.value }))
                        }
                        style={inputStyle}
                      >
                        <option value="Asia/Tokyo">東京 (JST)</option>
                        <option value="Asia/Kolkata">インド (IST)</option>
                        <option value="America/New_York">ニューヨーク (EST)</option>
                        <option value="America/Los_Angeles">ロサンゼルス (PST)</option>
                        <option value="Europe/London">ロンドン (GMT)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "16px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => setCreatingMeeting(null)}
                      style={{
                        background: V.white,
                        color: V.t2,
                        border: `1px solid ${V.border}`,
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => submitNewMeeting(idx)}
                      style={{
                        background: V.green,
                        color: V.white,
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      作成してカレンダー更新
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No issues */}
      {issues.length === 0 && hasConnections && !scanning && (
        <div
          style={{
            background: `${V.green}08`,
            border: `1px solid ${V.green}30`,
            borderRadius: "10px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "48px" }}>✅</span>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: V.green,
              marginTop: "12px",
            }}
          >
            問題は検出されませんでした
          </div>
          <div style={{ fontSize: "14px", color: V.t3, marginTop: "8px" }}>
            次の3日間のカレンダーイベントに不整合はありません
          </div>
        </div>
      )}

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: V.t1,
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📋</span> アクションログ
          </h2>
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.border}`,
              borderRadius: "10px",
              padding: "16px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {actionLog
              .slice()
              .reverse()
              .map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 0",
                    borderBottom: idx < actionLog.length - 1 ? `1px solid ${V.border}` : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: logColor(log.type),
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", color: V.t2 }}>{log.message}</div>
                    {log.joinUrl && (
                      <a
                        href={log.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: V.accent,
                          wordBreak: "break-all",
                        }}
                      >
                        {log.joinUrl}
                      </a>
                    )}
                    <div style={{ fontSize: "11px", color: V.t4, marginTop: "2px" }}>
                      {log.time.toLocaleTimeString("ja-JP")}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Create Meeting */}
      {hasZoom && (
        <QuickCreateSection auth={auth} setActionLog={setActionLog} />
      )}
    </div>
  );
}

// Quick create section for ad-hoc meetings
function QuickCreateSection({ auth, setActionLog }) {
  const [form, setForm] = useState({
    topic: "",
    start_time: "",
    duration: 60,
    timezone: "Asia/Tokyo",
  });
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const handleCreate = async () => {
    if (!form.topic || !form.start_time) return;
    setCreating(true);
    try {
      const startDate = new Date(form.start_time);
      const res = await fetch("/api/zoom-meetings?action=create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zoom-token": auth.zoomToken,
        },
        body: JSON.stringify({
          action: "create",
          meeting: {
            topic: form.topic,
            type: 2,
            start_time: startDate.toISOString(),
            duration: form.duration,
            timezone: form.timezone,
            settings: {
              join_before_host: true,
              waiting_room: false,
              mute_upon_entry: true,
            },
          },
        }),
      });
      const result = await res.json();
      if (result.id && result.join_url) {
        setLastCreated(result);
        setActionLog((prev) => [
          ...prev,
          {
            type: "success",
            message: `新規ミーティング作成: ${form.topic}`,
            joinUrl: result.join_url,
            time: new Date(),
          },
        ]);
        setForm({ topic: "", start_time: "", duration: 60, timezone: "Asia/Tokyo" });
      }
    } catch (e) {
      setActionLog((prev) => [
        ...prev,
        { type: "error", message: `作成エラー: ${e.message}`, time: new Date() },
      ]);
    }
    setCreating(false);
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: V.t1,
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>➕</span> 新規Zoomミーティング作成
      </h2>
      <div
        style={{
          background: V.card,
          border: `1px solid ${V.border}`,
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>会議タイトル</label>
            <input
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="例: 週次定例ミーティング"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>開始日時</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>時間（分）</label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 60 }))
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>タイムゾーン</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              style={inputStyle}
            >
              <option value="Asia/Tokyo">東京 (JST)</option>
              <option value="Asia/Kolkata">インド (IST)</option>
              <option value="America/New_York">ニューヨーク (EST)</option>
              <option value="America/Los_Angeles">ロサンゼルス (PST)</option>
              <option value="Europe/London">ロンドン (GMT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            onClick={handleCreate}
            disabled={creating || !form.topic || !form.start_time}
            style={{
              background: V.accent,
              color: V.white,
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: creating || !form.topic || !form.start_time ? "not-allowed" : "pointer",
              opacity: creating || !form.topic || !form.start_time ? 0.5 : 1,
            }}
          >
            {creating ? "作成中..." : "Zoomミーティングを作成"}
          </button>
        </div>

        {lastCreated && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: `${V.green}10`,
              borderRadius: "8px",
              border: `1px solid ${V.green}30`,
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "600", color: V.green }}>
              ミーティング作成完了
            </div>
            <div style={{ fontSize: "13px", color: V.t2, marginTop: "4px" }}>
              <strong>ID:</strong> {lastCreated.id}
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              <a
                href={lastCreated.join_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: V.accent, wordBreak: "break-all" }}
              >
                {lastCreated.join_url}
              </a>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastCreated.join_url);
              }}
              style={{
                marginTop: "8px",
                background: V.white,
                border: `1px solid ${V.border}`,
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
                color: V.t2,
              }}
            >
              📋 リンクをコピー
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div
      style={{
        background: V.card,
        border: `1px solid ${V.border}`,
        borderRadius: "10px",
        padding: "18px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "24px", fontWeight: "700", color }}>{value}</div>
        <div style={{ fontSize: "12px", color: V.t3 }}>{label}</div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#5C534D",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #E6E0DA",
  borderRadius: "6px",
  fontSize: "14px",
  color: "#3D3530",
  background: "#FFFFFF",
  boxSizing: "border-box",
};
