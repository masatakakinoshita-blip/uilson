import { useRef, useEffect, useMemo } from "react";

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
  red: "#C87066"
};

const quickActions = [
  { icon: "☕️", label: "今日のまとめ", action: "おはよう！今日のブリーフィングをお願いします。" },
  { icon: "✉️", label: "メールチェック", action: "未読メールをわかりやすく教えてください。" },
  { icon: "📅", label: "今日の予定", action: "今日のスケジュールを教えてください。" },
  { icon: "💬", label: "Slackの様子", action: "最近のSlackメッセージを見せてください。" }
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
  onFeedback
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleQuickAction = (action) => {
    send(action);
  };

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
      {/* Top Bar */}
      <div
        style={{
          padding: "20px 24px",
          backgroundColor: V.card,
          borderBottom: `1px solid ${V.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start"
        }}
      >
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: V.t1,
              marginBottom: "4px"
            }}
          >
            💬 なんでも聞いてね
          </div>
          <div
            style={{
              fontSize: "14px",
              color: V.t3,
              lineHeight: "1.4"
            }}
          >
            メール・予定・Slackなど、まとめてお手伝いします
          </div>
        </div>

        {/* Connection Status Badges */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            maxWidth: "300px"
          }}
        >
          {token && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                backgroundColor: `${V.green}14`,
                color: V.green,
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: V.green, display: "inline-block" }} />
              Gmail
            </div>
          )}
          {token && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                backgroundColor: `${V.accent}14`,
                color: V.accent,
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: V.accent, display: "inline-block" }} />
              Calendar
            </div>
          )}
          {slackConnected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                backgroundColor: "#E01E5A14",
                color: "#E01E5A",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#E01E5A", display: "inline-block" }} />
              Slack
            </div>
          )}
          {msToken && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                backgroundColor: "#0078D414",
                color: "#0078D4",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#0078D4", display: "inline-block" }} />
              Outlook Mail
            </div>
          )}
          {msToken && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                backgroundColor: "#9B59B614",
                color: "#9B59B6",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#9B59B6", display: "inline-block" }} />
              Outlook Cal
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "24px"
            }}
          >
            {/* Logo */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${V.teal} 0%, ${V.accent} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}
            >
              <span style={{ fontSize: "32px", fontWeight: "700", color: V.white }}>U</span>
              <div
                style={{
                  position: "absolute",
                  bottom: "-4px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "24px",
                  height: "2px",
                  backgroundColor: V.lime
                }}
              />
            </div>

            {/* Title */}
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: V.t1,
                  marginBottom: "8px"
                }}
              >
                UILSON
              </div>
              <div
                style={{
                  fontSize: "16px",
                  color: V.t3,
                  marginBottom: "4px"
                }}
              >
                あなたのAIアシスタント
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: V.t4
                }}
              >
                お気軽にどうぞ 😊
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                width: "100%",
                maxWidth: "500px",
                marginTop: "12px"
              }}
            >
              {quickActions.map((qa, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(qa.action)}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: V.card,
                    border: `1px solid ${V.border}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = V.bg;
                    e.currentTarget.style.borderColor = V.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = V.card;
                    e.currentTarget.style.borderColor = V.border;
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{qa.icon}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: V.t2,
                      textAlign: "center"
                    }}
                  >
                    {qa.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
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
                  {/* Feedback buttons — show on last assistant message if skill was executed */}
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

      {/* Input Bar */}
      <div
        style={{
          padding: "16px 24px 24px",
          backgroundColor: V.main,
          borderTop: `1px solid ${V.border}`,
          display: "flex",
          gap: "12px",
          alignItems: "flex-end"
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ここに聞きたいことを入力してください 😊"
          style={{
            flex: 1,
            padding: "12px 16px",
            border: `1px solid ${V.border}`,
            borderRadius: "8px",
            backgroundColor: V.card,
            fontSize: "14px",
            color: V.t1,
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = V.accent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = V.border;
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px",
            backgroundColor: loading || !input.trim() ? V.t4 : V.accent,
            color: V.white,
            border: "none",
            borderRadius: "8px",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            transition: "background-color 0.2s ease",
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
