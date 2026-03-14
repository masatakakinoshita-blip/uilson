import { useState, useEffect, useCallback, useMemo } from "react";

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

// Video conference link detection patterns
const LINK_PATTERNS = {
  zoom: {
    regex: /https:\/\/[a-z0-9-]*\.?zoom\.us\/j\/(\d+)[^\s"<>]*/i,
    label: "Zoom",
    icon: "📹",
    color: "#2D8CFF",
    shortLabel: "Zoom",
  },
  meet: {
    regex: /https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    label: "Google Meet",
    icon: "🟢",
    color: "#00897B",
    shortLabel: "Meet",
  },
  teams: {
    regex: /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+/i,
    label: "Microsoft Teams",
    icon: "🟪",
    color: "#6264A7",
    shortLabel: "Teams",
  },
};

function detectVideoLinks(event) {
  const searchText = [event.location, event.summary, event.description]
    .filter(Boolean)
    .join(" ");
  const found = [];
  for (const [platform, pattern] of Object.entries(LINK_PATTERNS)) {
    const match = searchText.match(pattern.regex);
    if (match) {
      found.push({
        platform,
        url: match[0],
        id: match[1] || match[0],
        ...pattern,
      });
    }
  }
  return found;
}

// Format time like "14:00"
function fmtTime(date) {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Format duration like "1h", "30m", "1h30m"
function fmtDuration(startDate, endDate) {
  const mins = Math.round((endDate - startDate) / (1000 * 60));
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

// Format date header like "今日 (3月15日 月曜日)"
function fmtDateHeader(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (target - today) / (1000 * 60 * 60 * 24);

  const dateStr = date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  if (diff === 0) return `今日  ${dateStr}`;
  if (diff === 1) return `明日  ${dateStr}`;
  if (diff === 2) return `明後日  ${dateStr}`;
  return dateStr;
}

// Group events by date
function groupByDate(events) {
  const groups = {};
  events.forEach((evt) => {
    const d = new Date(evt.start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(evt);
  });
  // Sort each group by start time
  Object.values(groups).forEach((g) =>
    g.sort((a, b) => new Date(a.start) - new Date(b.start))
  );
  return groups;
}

// Detect issues (simplified from original — runs in background)
function detectIssues(events) {
  const issues = [];
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  events.forEach((event) => {
    const start = new Date(event.start);
    if (start < now || start > threeDaysLater) return;

    const summary = (event.summary || "").toLowerCase();
    const videoLinks = detectVideoLinks(event);

    const looksLikeMeeting =
      summary.includes("meeting") ||
      summary.includes("ミーティング") ||
      summary.includes("会議") ||
      summary.includes("mtg") ||
      summary.includes("sync") ||
      summary.includes("standup") ||
      summary.includes("review") ||
      summary.includes("1on1") ||
      summary.includes("定例") ||
      summary.includes("打ち合わせ") ||
      summary.includes("面談");

    if (looksLikeMeeting && videoLinks.length === 0) {
      issues.push({
        eventId: event.id,
        type: "missing_link",
        severity: "warning",
        message: "ビデオリンクなし",
      });
    }

    if (videoLinks.length > 1) {
      issues.push({
        eventId: event.id,
        type: "multiple_links",
        severity: "warning",
        message: "複数のビデオリンク",
      });
    }

    const hour = start.getHours();
    if ((hour >= 0 && hour <= 4) || hour >= 23) {
      issues.push({
        eventId: event.id,
        type: "unusual_time",
        severity: "info",
        message: "深夜の会議",
      });
    }
  });

  return issues;
}

export default function MeetingView({ auth, data }) {
  const [view, setView] = useState("timeline"); // "timeline" | "issues"
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // days to show

  const hasGoogle = !!auth.token;
  const hasOutlook = !!auth.msToken;
  const hasAnyCalendar = hasGoogle || hasOutlook;
  const hasZoom = !!auth.zoomToken;

  // Merge all events into a unified list
  const allEvents = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + timeRange * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const google = (data.events || []).map((e) => ({
      ...e,
      source: "google",
      sourceLabel: "Google",
      sourceColor: "#4285F4",
    }));
    const outlook = (data.outlookEvents || []).map((e) => ({
      ...e,
      source: "outlook",
      sourceLabel: "Outlook",
      sourceColor: "#0078D4",
    }));

    return [...google, ...outlook]
      .filter((e) => {
        const s = new Date(e.start);
        return s >= startOfToday && s <= cutoff;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [data.events, data.outlookEvents, timeRange]);

  // Issues analysis
  const issues = useMemo(() => detectIssues(allEvents), [allEvents]);
  const issuesByEventId = useMemo(() => {
    const map = {};
    issues.forEach((i) => {
      if (!map[i.eventId]) map[i.eventId] = [];
      map[i.eventId].push(i);
    });
    return map;
  }, [issues]);

  // Group events by date
  const grouped = useMemo(() => groupByDate(allEvents), [allEvents]);
  const dateKeys = Object.keys(grouped).sort();

  // Find the "now" position
  const now = new Date();

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: V.t1,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "26px" }}>📅</span>
            ミーティング
          </h1>
          <p style={{ color: V.t3, fontSize: "13px", margin: "6px 0 0 36px" }}>
            {hasAnyCalendar
              ? `${allEvents.length}件の予定（${timeRange}日間）`
              : "カレンダーを接続してください"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            style={{
              padding: "6px 10px",
              border: `1px solid ${V.border}`,
              borderRadius: "6px",
              fontSize: "13px",
              color: V.t2,
              background: V.white,
              cursor: "pointer",
            }}
          >
            <option value={3}>3日間</option>
            <option value={7}>1週間</option>
            <option value={14}>2週間</option>
            <option value={30}>1ヶ月</option>
          </select>

          {/* View toggle */}
          {issues.length > 0 && (
            <button
              onClick={() => setView(view === "timeline" ? "issues" : "timeline")}
              style={{
                padding: "6px 12px",
                border: `1px solid ${view === "issues" ? V.orange : V.border}`,
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                color: view === "issues" ? V.orange : V.t2,
                background: view === "issues" ? `${V.orange}10` : V.white,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ⚠️ {issues.length}件の注意
            </button>
          )}
        </div>
      </div>

      {/* Connection status */}
      {!hasAnyCalendar && (
        <div
          style={{
            background: `${V.accent}08`,
            border: `1px solid ${V.accent}25`,
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📅</div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: V.t1, marginBottom: "8px" }}>
            カレンダーを接続してください
          </div>
          <div style={{ fontSize: "14px", color: V.t3, lineHeight: "1.6" }}>
            設定（⚙️）からGoogle CalendarまたはOutlookを接続すると、
            <br />
            ミーティングの一覧と管理ができるようになります。
          </div>
        </div>
      )}

      {/* Issues View */}
      {view === "issues" && hasAnyCalendar && (
        <IssuesView
          issues={issues}
          allEvents={allEvents}
          onBack={() => setView("timeline")}
        />
      )}

      {/* Timeline View */}
      {view === "timeline" && hasAnyCalendar && (
        <>
          {dateKeys.length === 0 && (
            <div
              style={{
                background: V.card,
                border: `1px solid ${V.border}`,
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: V.t1 }}>
                予定がありません
              </div>
              <div style={{ fontSize: "14px", color: V.t3, marginTop: "8px" }}>
                今後{timeRange}日間にミーティングはありません
              </div>
            </div>
          )}

          {dateKeys.map((dateKey) => {
            const events = grouped[dateKey];
            const dateObj = new Date(dateKey + "T00:00:00");
            const isToday =
              dateObj.toDateString() === now.toDateString();

            return (
              <div key={dateKey} style={{ marginBottom: "28px" }}>
                {/* Date header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: isToday ? V.accent : V.t1,
                    }}
                  >
                    {fmtDateHeader(dateObj)}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: isToday ? `${V.accent}30` : V.border,
                    }}
                  />
                  <div style={{ fontSize: "12px", color: V.t4 }}>
                    {events.length}件
                  </div>
                </div>

                {/* Event cards */}
                {events.map((event) => {
                  const startDate = new Date(event.start);
                  const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000);
                  const videoLinks = detectVideoLinks(event);
                  const primaryLink = videoLinks[0];
                  const isPast = endDate < now;
                  const isNow = startDate <= now && endDate > now;
                  const eventIssues = issuesByEventId[event.id] || [];
                  const isExpanded = expandedId === event.id;

                  return (
                    <div
                      key={event.id || `${event.source}-${event.start}-${event.summary}`}
                      style={{
                        background: isPast ? `${V.bg}` : V.card,
                        border: `1px solid ${isNow ? V.accent : V.border}`,
                        borderRadius: "10px",
                        padding: "14px 18px",
                        marginBottom: "8px",
                        opacity: isPast ? 0.6 : 1,
                        position: "relative",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s",
                        boxShadow: isNow ? `0 0 0 1px ${V.accent}40` : "none",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      {/* NOW indicator */}
                      {isNow && (
                        <div
                          style={{
                            position: "absolute",
                            top: "-1px",
                            left: "16px",
                            background: V.accent,
                            color: V.white,
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "0 0 4px 4px",
                            letterSpacing: "0.5px",
                          }}
                        >
                          NOW
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        {/* Time column */}
                        <div
                          style={{
                            minWidth: "60px",
                            textAlign: "right",
                            paddingTop: "2px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: isNow ? V.accent : isPast ? V.t4 : V.t1,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {fmtTime(startDate)}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: V.t4,
                              marginTop: "2px",
                            }}
                          >
                            {fmtDuration(startDate, endDate)}
                          </div>
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            width: "3px",
                            alignSelf: "stretch",
                            borderRadius: "2px",
                            background: primaryLink
                              ? primaryLink.color + "60"
                              : event.sourceColor + "40",
                            minHeight: "36px",
                          }}
                        />

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: isPast ? V.t3 : V.t1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {event.summary || "(タイトルなし)"}
                            </div>

                            {/* Issue badge */}
                            {eventIssues.length > 0 && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: `${V.orange}15`,
                                  color: V.orange,
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ⚠ {eventIssues[0].message}
                              </span>
                            )}
                          </div>

                          {/* Meta row: source + video link */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginTop: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Source badge */}
                            <span
                              style={{
                                fontSize: "11px",
                                color: event.sourceColor,
                                background: event.sourceColor + "12",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: "500",
                              }}
                            >
                              {event.sourceLabel}
                            </span>

                            {/* Video platform badges */}
                            {videoLinks.map((link) => (
                              <button
                                key={link.platform}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(link.url, "_blank");
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: link.color,
                                  background: link.color + "12",
                                  border: `1px solid ${link.color}30`,
                                  borderRadius: "4px",
                                  padding: "2px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                {link.icon} {link.shortLabel}で参加
                              </button>
                            ))}

                            {/* Location if no video */}
                            {videoLinks.length === 0 && event.location && (
                              <span style={{ fontSize: "12px", color: V.t3 }}>
                                📍 {event.location.length > 40
                                  ? event.location.slice(0, 40) + "..."
                                  : event.location}
                              </span>
                            )}

                            {/* Copy link button */}
                            {primaryLink && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyLink(primaryLink.url, event.id);
                                }}
                                style={{
                                  fontSize: "11px",
                                  color: copiedId === event.id ? V.green : V.t4,
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                }}
                              >
                                {copiedId === event.id ? "✓ コピー済" : "📋 コピー"}
                              </button>
                            )}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px",
                                background: V.bg,
                                borderRadius: "8px",
                                fontSize: "13px",
                                color: V.t2,
                                lineHeight: "1.6",
                              }}
                            >
                              <div style={{ display: "grid", gap: "6px" }}>
                                <div>
                                  <span style={{ color: V.t4, marginRight: "8px" }}>時間:</span>
                                  {fmtTime(startDate)} 〜 {fmtTime(endDate)}（{fmtDuration(startDate, endDate)}）
                                </div>
                                {event.location && (
                                  <div>
                                    <span style={{ color: V.t4, marginRight: "8px" }}>場所:</span>
                                    {event.location}
                                  </div>
                                )}
                                {event.calendar && (
                                  <div>
                                    <span style={{ color: V.t4, marginRight: "8px" }}>カレンダー:</span>
                                    {event.calendar}
                                  </div>
                                )}
                                {event.description && (
                                  <div style={{ marginTop: "4px" }}>
                                    <span style={{ color: V.t4, display: "block", marginBottom: "4px" }}>
                                      説明:
                                    </span>
                                    <div
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        maxHeight: "120px",
                                        overflow: "auto",
                                        fontSize: "12px",
                                        color: V.t3,
                                      }}
                                    >
                                      {event.description.slice(0, 500)}
                                      {event.description.length > 500 && "..."}
                                    </div>
                                  </div>
                                )}

                                {/* All video links in detail */}
                                {videoLinks.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <span style={{ color: V.t4, display: "block", marginBottom: "4px" }}>
                                      ビデオリンク:
                                    </span>
                                    {videoLinks.map((link) => (
                                      <div key={link.platform} style={{ marginBottom: "4px" }}>
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: V.accent,
                                            fontSize: "12px",
                                            wordBreak: "break-all",
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {link.icon} {link.label}: {link.url}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Issues for this event */}
                                {eventIssues.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      padding: "8px 10px",
                                      background: `${V.orange}08`,
                                      border: `1px solid ${V.orange}20`,
                                      borderRadius: "6px",
                                    }}
                                  >
                                    {eventIssues.map((issue, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          fontSize: "12px",
                                          color: V.orange,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                        }}
                                      >
                                        ⚠️ {issue.message}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}

      {/* Quick Create Zoom Meeting (only if Zoom connected) */}
      {hasZoom && view === "timeline" && (
        <QuickCreateSection auth={auth} />
      )}

      {/* Connection summary at bottom */}
      {hasAnyCalendar && (
        <div
          style={{
            marginTop: "32px",
            padding: "14px 18px",
            background: V.bg,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: V.t4, fontWeight: "600" }}>接続中:</span>
          {hasGoogle && (
            <span style={{ fontSize: "12px", color: "#4285F4", display: "flex", alignItems: "center", gap: "4px" }}>
              ● Google Calendar
            </span>
          )}
          {hasOutlook && (
            <span style={{ fontSize: "12px", color: "#0078D4", display: "flex", alignItems: "center", gap: "4px" }}>
              ● Outlook
            </span>
          )}
          {hasZoom && (
            <span style={{ fontSize: "12px", color: "#2D8CFF", display: "flex", alignItems: "center", gap: "4px" }}>
              ● Zoom
            </span>
          )}
          {!hasZoom && (
            <span style={{ fontSize: "12px", color: V.t4 }}>
              Zoomを接続すると、ミーティングの作成が可能になります
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Issues detail view
function IssuesView({ issues, allEvents, onBack }) {
  // Build event lookup
  const eventMap = {};
  allEvents.forEach((e) => {
    eventMap[e.id] = e;
  });

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: V.accent,
          fontSize: "13px",
          cursor: "pointer",
          padding: "0",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        ← タイムラインに戻る
      </button>

      <h2 style={{ fontSize: "16px", fontWeight: "600", color: V.t1, marginBottom: "16px" }}>
        ⚠️ 注意が必要な予定（{issues.length}件）
      </h2>

      {issues.map((issue, idx) => {
        const event = eventMap[issue.eventId];
        if (!event) return null;
        const startDate = new Date(event.start);

        return (
          <div
            key={idx}
            style={{
              background: V.card,
              border: `1px solid ${V.border}`,
              borderLeft: `4px solid ${issue.severity === "warning" ? V.orange : V.accent}`,
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: V.t1 }}>
                  {event.summary || "(タイトルなし)"}
                </div>
                <div style={{ fontSize: "12px", color: V.t3, marginTop: "4px" }}>
                  {startDate.toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  {fmtTime(startDate)} | {event.sourceLabel}
                </div>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: issue.severity === "warning" ? V.orange : V.accent,
                  background:
                    (issue.severity === "warning" ? V.orange : V.accent) + "12",
                  padding: "3px 8px",
                  borderRadius: "4px",
                }}
              >
                {issue.message}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick create Zoom meeting
function QuickCreateSection({ auth }) {
  const [open, setOpen] = useState(false);
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
        setForm({ topic: "", start_time: "", duration: 60, timezone: "Asia/Tokyo" });
      }
    } catch (e) {
      console.error("Zoom create error:", e);
    }
    setCreating(false);
  };

  if (!open) {
    return (
      <div style={{ marginTop: "24px" }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: V.white,
            border: `1px dashed ${V.border}`,
            borderRadius: "10px",
            padding: "14px 20px",
            fontSize: "13px",
            color: V.t3,
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.target.style.borderColor = V.accent)}
          onMouseLeave={(e) => (e.target.style.borderColor = V.border)}
        >
          + Zoomミーティングを作成
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "24px" }}>
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: V.t1 }}>
            Zoomミーティング作成
          </h3>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "18px",
              color: V.t4,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>タイトル</label>
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
              fontSize: "13px",
              fontWeight: "600",
              cursor: creating || !form.topic || !form.start_time ? "not-allowed" : "pointer",
              opacity: creating || !form.topic || !form.start_time ? 0.5 : 1,
            }}
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </div>

        {lastCreated && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: `${V.green}08`,
              borderRadius: "8px",
              border: `1px solid ${V.green}25`,
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", color: V.green, marginBottom: "6px" }}>
              作成完了
            </div>
            <a
              href={lastCreated.join_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "13px", color: V.accent, wordBreak: "break-all" }}
            >
              {lastCreated.join_url}
            </a>
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={() => navigator.clipboard.writeText(lastCreated.join_url)}
                style={{
                  background: V.white,
                  border: `1px solid ${V.border}`,
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: V.t2,
                }}
              >
                📋 リンクをコピー
              </button>
            </div>
          </div>
        )}
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
