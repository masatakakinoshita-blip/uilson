import { useRef, useEffect, useState } from "react";

function renderMarkdown(text) {
  if (!text) return text;
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "8px 0", paddingLeft: "20px" }}>
          {listItems.map((li, i) => (
            <li key={i} style={{ marginBottom: "4px" }}>{formatInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };
  const formatInline = (str) => {
    const parts = [];
    let remaining = str;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const idx = remaining.indexOf(boldMatch[0]);
        if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(idx + boldMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }
    return parts;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      flushList();
      elements.push(<div key={i} style={{ fontWeight: "700", fontSize: "13px", color: "#3C5996", margin: "12px 0 4px" }}>{formatInline(line.slice(4))}</div>);
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(<div key={i} style={{ fontWeight: "700", fontSize: "14px", color: "#2B4070", margin: "14px 0 6px", borderBottom: "1px solid #DDE1EB", paddingBottom: "4px" }}>{formatInline(line.slice(3))}</div>);
    } else if (line.startsWith("# ")) {
      flushList();
      elements.push(<div key={i} style={{ fontWeight: "700", fontSize: "16px", color: "#2B4070", margin: "16px 0 8px" }}>{formatInline(line.slice(2))}</div>);
    } else if (/^[-•*]\s/.test(line)) {
      listItems.push(line.replace(/^[-•*]\s/, ""));
    } else if (/^\d+\.\s/.test(line)) {
      flushList();
      elements.push(<div key={i} style={{ margin: "4px 0", paddingLeft: "8px" }}>{formatInline(line)}</div>);
    } else if (line.trim() === "") {
      flushList();
      elements.push(<div key={i} style={{ height: "8px" }} />);
    } else {
      flushList();
      elements.push(<div key={i} style={{ margin: "2px 0" }}>{formatInline(line)}</div>);
    }
  }
  flushList();
  return elements;
}

const V = {
  bg: "#F4F1EE",
  sb: "#FFFFFF",
  main: "#FAF8F6",
  card: "#FFFFFF",
  border: "#E6E0DA",
  t1: "#3D3530",
  t2: "#5C534D",
  t3: "#8E857E",
  t4: "#B5ADA6",
  white: "#FFFFFF",
  accent: "#5B7DB8",
  teal: "#3D6098",
  lime: "#A8C868",
  green: "#5A9E6F",
  red: "#C87066",
  orange: "#D4A050"
};

/* ── Suggestion Cards: quick actions + document creation ── */
const suggestionCards = [
  // Quick actions (top row)
  { id: "briefing", icon: "☀️", label: "今日のまとめ", sub: "予定・メール・天気を一括チェック", action: "おはよう！今日のブリーフィングをお願いします。", type: "action" },
  { id: "email",    icon: "✉️", label: "メールチェック", sub: "未読メールをわかりやすく整理", action: "未読メールをわかりやすく教えてください。", type: "action" },
  { id: "calendar", icon: "📅", label: "今日の予定", sub: "スケジュールを確認", action: "今日のスケジュールを教えてください。", type: "action" },
  { id: "slack",    icon: "💬", label: "Slackの様子", sub: "最近のメッセージをチェック", action: "最近のSlackメッセージを見せてください。", type: "action" },
  // Document creation (bottom row)
  { id: "pptx", icon: "📊", label: "プレゼン資料", sub: "PPTX生成エンジン", type: "create", viewTarget: "create-pptx", badgeColor: V.red },
  { id: "xlsx", icon: "📈", label: "スプレッドシート", sub: "Excel生成エンジン", type: "create", viewTarget: "create-xlsx", badgeColor: V.green },
  { id: "docx", icon: "📄", label: "フォーマル文書", sub: "Word生成エンジン", type: "create", viewTarget: "create-docx", badgeColor: V.accent },
];

export default function ChatView({
  messages,
  setMessages,
  input,
  setInput,
  loading,
  send,
  token,
  slackConnected,
  msToken,
  spSites,
  teamsChats,
  teamsChannels,
  driveFiles,
  lastExecLogId,
  feedbackGiven,
  onFeedback,
  setView,
  aiSuggestions = [],
  onSuggestionClick,
  onSuggestionDismiss,
}) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (input.trim()) {
      send(input);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCardClick = (card) => {
    if (card.type === "create" && card.viewTarget && setView) {
      setView(card.viewTarget);
    } else if (card.action) {
      send(card.action);
    }
  };

  const handleAiSuggestionClick = (sug) => {
    if (onSuggestionClick) onSuggestionClick(sug.id);
    if (sug.action) send(sug.action);
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: V.main,
        overflow: "hidden"
      }}
    >
      {/* ── Chat Area ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: hasMessages ? "20px 24px" : "0",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {!hasMessages ? (
          /* ── Empty State: centered hero + suggestion cards ── */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 24px 0"
            }}
          >
            {/* Hero Logo */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: `linear-gradient(135deg, ${V.teal} 0%, ${V.accent} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                marginBottom: "16px"
              }}
            >
              <span style={{ fontSize: "28px", fontWeight: "700", color: V.white }}>U</span>
              <div
                style={{
                  position: "absolute",
                  bottom: "-3px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "22px",
                  height: "2px",
                  backgroundColor: V.lime
                }}
              />
            </div>

            <div style={{ fontSize: "22px", fontWeight: "700", color: V.t1, marginBottom: "6px" }}>
              UILSON
            </div>
            <div style={{ fontSize: "14px", color: V.t3, marginBottom: "32px" }}>
              なんでもお手伝いします
            </div>

            {/* ── Suggestion Cards Grid ── */}
            <div style={{ width: "100%", maxWidth: "640px" }}>
              {/* Quick Actions Row */}
              <div style={{ fontSize: "11px", fontWeight: "600", color: V.t4, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                すぐに使える
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginBottom: "20px"
                }}
              >
                {suggestionCards.filter(c => c.type === "action").map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    style={{
                      padding: "14px 10px",
                      backgroundColor: V.card,
                      border: `1px solid ${V.border}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = V.bg;
                      e.currentTarget.style.borderColor = V.accent;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = V.card;
                      e.currentTarget.style.borderColor = V.border;
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: "22px" }}>{card.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: V.t2, textAlign: "center" }}>{card.label}</span>
                    <span style={{ fontSize: "10px", color: V.t4, textAlign: "center", lineHeight: "1.3" }}>{card.sub}</span>
                  </button>
                ))}
              </div>

              {/* AI-generated suggestion cards (from Firestore onSnapshot) */}
              {aiSuggestions.length > 0 && (
                <>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: V.lime, marginBottom: "10px", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: V.lime, display: "inline-block", animation: "pulse 2s infinite" }} />
                    AI おすすめ
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.min(aiSuggestions.length, 4)}, 1fr)`,
                      gap: "10px",
                      marginBottom: "20px"
                    }}
                  >
                    {aiSuggestions.slice(0, 4).map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => handleAiSuggestionClick(sug)}
                        style={{
                          padding: "14px 10px",
                          backgroundColor: V.card,
                          border: `1px solid ${sug.priority === "high" ? V.orange + "60" : V.border}`,
                          borderRadius: "10px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                          position: "relative"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = V.bg;
                          e.currentTarget.style.borderColor = V.lime;
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = V.card;
                          e.currentTarget.style.borderColor = sug.priority === "high" ? V.orange + "60" : V.border;
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {sug.priority === "high" && (
                          <span style={{ position: "absolute", top: "6px", right: "8px", fontSize: "8px", backgroundColor: V.orange + "20", color: V.orange, padding: "1px 5px", borderRadius: "4px", fontWeight: "600" }}>
                            重要
                          </span>
                        )}
                        <span style={{ fontSize: "22px" }}>
                          {sug.type === "email_action" ? "📧" : sug.type === "calendar_prep" ? "📅" : sug.type === "slack_update" ? "💬" : "✨"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: V.t2, textAlign: "center", lineHeight: "1.3" }}>{sug.title}</span>
                        <span style={{ fontSize: "10px", color: V.t4, textAlign: "center", lineHeight: "1.3" }}>{sug.body}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Create Documents Row */}
              <div style={{ fontSize: "11px", fontWeight: "600", color: V.t4, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                つくる
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px"
                }}
              >
                {suggestionCards.filter(c => c.type === "create").map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    style={{
                      padding: "14px 10px",
                      backgroundColor: V.card,
                      border: `1px solid ${V.border}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s ease",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = card.badgeColor || V.accent;
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = V.border;
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span style={{ fontSize: "22px" }}>{card.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: V.t2, textAlign: "center" }}>{card.label}</span>
                    <span style={{ fontSize: "10px", color: V.t4, textAlign: "center", lineHeight: "1.3" }}>{card.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: "12px"
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: `linear-gradient(135deg, ${V.teal} 0%, ${V.accent} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: "700",
                      color: V.white,
                      flexShrink: 0
                    }}
                  >
                    U
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      maxWidth: msg.role === "assistant" ? "75%" : "60%",
                      padding: msg.role === "assistant" ? "16px 20px" : "12px 16px",
                      borderRadius: "12px",
                      backgroundColor: msg.role === "user" ? V.accent : V.card,
                      color: msg.role === "user" ? V.white : V.t1,
                      fontSize: "14px",
                      lineHeight: "1.6",
                      wordBreak: "break-word",
                      boxShadow: msg.role === "assistant" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                    }}
                  >
                    {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                  </div>
                  {/* Feedback buttons */}
                  {msg.role === "assistant" && lastExecLogId && idx === messages.length - 1 && onFeedback && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {feedbackGiven?.[lastExecLogId] ? (
                        <span style={{ fontSize: 12, color: V.t3, padding: "4px 10px", backgroundColor: V.main, borderRadius: 12 }}>
                          {feedbackGiven[lastExecLogId] === "good" ? "👍 フィードバック済み" : "👎 フィードバック済み"}
                        </span>
                      ) : (
                        <>
                          <button onClick={() => onFeedback(lastExecLogId, "good")} style={{ padding: "4px 12px", fontSize: 12, border: `1px solid ${V.green}40`, borderRadius: 12, background: V.green + "08", color: V.green, cursor: "pointer", fontWeight: 500 }}>👍 良い</button>
                          <button onClick={() => onFeedback(lastExecLogId, "bad")} style={{ padding: "4px 12px", fontSize: 12, border: `1px solid ${V.red}40`, borderRadius: 12, background: V.red + "08", color: V.red, cursor: "pointer", fontWeight: 500 }}>👎 改善が必要</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "12px"
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: `linear-gradient(135deg, ${V.teal} 0%, ${V.accent} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: "700",
                    color: V.white,
                    flexShrink: 0,
                    animation: "pulse 1.5s infinite"
                  }}
                >
                  U
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: V.card,
                    color: V.t2,
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>🔍</span>
                  <span>調べています、少々お待ちくださいね...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} style={{ height: 0 }} />
          </>
        )}
      </div>

      {/* ── Inline suggestion chips (when chat is active) ── */}
      {hasMessages && !loading && (
        <div
          style={{
            padding: "0 24px 4px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap"
          }}
        >
          {/* AI suggestion chips first */}
          {aiSuggestions.slice(0, 2).map((sug) => (
            <button
              key={`ai-${sug.id}`}
              onClick={() => handleAiSuggestionClick(sug)}
              style={{
                padding: "6px 12px",
                backgroundColor: V.lime + "12",
                border: `1px solid ${V.lime}40`,
                borderRadius: "16px",
                cursor: "pointer",
                fontSize: "12px",
                color: V.t2,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = V.lime;
                e.currentTarget.style.backgroundColor = V.lime + "20";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = V.lime + "40";
                e.currentTarget.style.backgroundColor = V.lime + "12";
              }}
            >
              <span style={{ fontSize: "13px" }}>
                {sug.type === "email_action" ? "📧" : sug.type === "calendar_prep" ? "📅" : sug.type === "slack_update" ? "💬" : "✨"}
              </span>
              <span>{sug.title?.replace(/^[📧📅💬✨]\s*/, "")}</span>
            </button>
          ))}
          {suggestionCards.filter(c => c.type === "action").slice(0, 3).map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                padding: "6px 12px",
                backgroundColor: V.card,
                border: `1px solid ${V.border}`,
                borderRadius: "16px",
                cursor: "pointer",
                fontSize: "12px",
                color: V.t2,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = V.accent;
                e.currentTarget.style.backgroundColor = `${V.accent}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = V.border;
                e.currentTarget.style.backgroundColor = V.card;
              }}
            >
              <span style={{ fontSize: "13px" }}>{card.icon}</span>
              <span>{card.label}</span>
            </button>
          ))}
          {suggestionCards.filter(c => c.type === "create").map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                padding: "6px 12px",
                backgroundColor: V.card,
                border: `1px solid ${V.border}`,
                borderRadius: "16px",
                cursor: "pointer",
                fontSize: "12px",
                color: V.t2,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.badgeColor || V.accent;
                e.currentTarget.style.backgroundColor = `${(card.badgeColor || V.accent)}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = V.border;
                e.currentTarget.style.backgroundColor = V.card;
              }}
            >
              <span style={{ fontSize: "13px" }}>{card.icon}</span>
              <span>{card.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar ── */}
      <div
        style={{
          padding: "12px 24px 24px",
          backgroundColor: V.main,
          borderTop: hasMessages ? `1px solid ${V.border}` : "none",
          display: "flex",
          gap: "12px",
          alignItems: "flex-end"
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            border: `1px solid ${inputFocused ? V.accent : V.border}`,
            borderRadius: "10px",
            backgroundColor: V.card,
            transition: "border-color 0.2s ease",
            boxShadow: inputFocused ? `0 0 0 3px ${V.accent}15` : "none"
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="なんでも聞いてください..."
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "none",
              backgroundColor: "transparent",
              fontSize: "14px",
              color: V.t1,
              fontFamily: "inherit",
              outline: "none"
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px",
            backgroundColor: loading || !input.trim() ? V.t4 : V.accent,
            color: V.white,
            border: "none",
            borderRadius: "10px",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
            opacity: loading || !input.trim() ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = V.teal;
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = V.accent;
            }
          }}
        >
          送信 →
        </button>
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
