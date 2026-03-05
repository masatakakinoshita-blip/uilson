import { useState } from "react";
import { SLIDES, MODEL_COLORS, MODEL_NAMES, CREATE_CHAT } from "../data/slides";

const V = {
  bg:"#F0F2F7", sb:"#FFFFFF", main:"#F5F6FA", card:"#FFFFFF", border:"#DDE1EB",
  border2:"#C8CDD8", t1:"#333333", t2:"#555555", t3:"#888888", t4:"#AAAAAA",
  white:"#FFFFFF", accent:"#3C5996", teal:"#2B4070", navy:"#1E2D50", blue:"#3C5996",
  red:"#C83732", green:"#2E7D32", orange:"#D4880F", lime:"#ABCD00"
};

export default function CreatePptx({ setView }) {
  const [curSlide, setCurSlide] = useState(0);
  const [curModel, setCurModel] = useState("claude");

  const slide = SLIDES[curSlide];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: V.main }}>
      {/* Top Bar */}
      <div style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${V.border}`,
        background: V.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
          <button
            onClick={() => setView("create-menu")}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: `1px solid ${V.border}`,
              background: V.white,
              cursor: "pointer",
              fontSize: 14,
              color: V.t2,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = V.main;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = V.white;
            }}
          >
            ← 作るメニュー
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: V.t1, margin: 0 }}>
            📊 プレゼン資料を作る
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${V.border}`,
              background: V.white,
              cursor: "pointer",
              fontSize: 13,
              color: V.t2,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = V.main;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = V.white;
            }}
          >
            📥 PPTXダウンロード
          </button>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${V.border}`,
              background: V.white,
              cursor: "pointer",
              fontSize: 13,
              color: V.t2,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = V.main;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = V.white;
            }}
          >
            🔄 再生成
          </button>
        </div>
      </div>

      {/* Main Content - 3 Panels */}
      <div className="panel-3" style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        gap: 0
      }}>
        {/* Left Panel: Source (30%) */}
        <div style={{
          flex: "0 0 30%",
          borderRight: `1px solid ${V.border}`,
          display: "flex",
          flexDirection: "column",
          background: V.card,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px",
            fontWeight: 600,
            color: V.t3
          }}>
            📎 ソース
          </div>

          {/* Chat Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            {CREATE_CHAT.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  background: msg.from === "user" ? V.accent : V.main,
                  color: msg.from === "user" ? V.white : V.t2,
                  fontSize: "12px",
                  lineHeight: 1.4
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
            ))}
          </div>

          {/* Send Button */}
          <div style={{
            padding: "12px",
            borderTop: `1px solid ${V.border}`,
            display: "flex",
            gap: "8px"
          }}>
            <input
              type="text"
              placeholder="質問を入力..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: `1px solid ${V.border}`,
                fontSize: "12px",
                backgroundColor: V.white
              }}
            />
            <button
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                background: V.accent,
                color: V.white,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              送信 →
            </button>
          </div>
        </div>

        {/* Center Panel: Composition (35%) */}
        <div style={{
          flex: "0 0 35%",
          borderRight: `1px solid ${V.border}`,
          display: "flex",
          flexDirection: "column",
          background: V.white,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px",
            fontWeight: 600,
            color: V.t3
          }}>
            📑 構成
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px"
          }}>
            {SLIDES.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setCurSlide(i)}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  background: curSlide === i ? V.accent : V.main,
                  color: curSlide === i ? V.white : V.t2,
                  cursor: "pointer",
                  marginBottom: "8px",
                  fontSize: "12px",
                  fontWeight: curSlide === i ? 600 : 500,
                  border: `1px solid ${curSlide === i ? V.accent : V.border}`,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (curSlide !== i) {
                    e.currentTarget.style.backgroundColor = `${V.accent}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (curSlide !== i) {
                    e.currentTarget.style.backgroundColor = V.main;
                  }
                }}
              >
                <div>{s.id}. {s.title}</div>
                <div style={{
                  fontSize: "11px",
                  color: curSlide === i ? "rgba(255,255,255,0.7)" : V.t4,
                  marginTop: "4px"
                }}>
                  {s.layoutLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Preview (35%) */}
        <div style={{
          flex: "0 0 35%",
          display: "flex",
          flexDirection: "column",
          background: V.main,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px",
            fontWeight: 600,
            color: V.t3,
            background: V.white
          }}>
            👁️ プレビュー
          </div>

          {/* Model Selector */}
          <div style={{
            display: "flex",
            gap: "4px",
            padding: "8px 12px",
            borderBottom: `1px solid ${V.border}`,
            background: V.white,
            overflowX: "auto"
          }}>
            {Object.entries(MODEL_COLORS).map(([key, color]) => (
              <button
                key={key}
                onClick={() => setCurModel(key)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: curModel === key ? `2px solid ${color}` : `1px solid ${V.border}`,
                  background: curModel === key ? `${color}15` : V.white,
                  color: curModel === key ? color : V.t2,
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: curModel === key ? 600 : 500,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap"
                }}
              >
                {MODEL_NAMES[key]}
              </button>
            ))}
          </div>
          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* Slide Preview Box */}
            <div
              style={{
                width: "100%",
                maxWidth: "480px",
                aspectRatio: "16 / 9",
                borderRadius: "8px",
                background: slide.bg,
                border: `1px solid ${V.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: slide.layout === "cover" ? "center" : "flex-start",
                justifyContent: slide.layout === "cover" ? "center" : "flex-start",
                padding: "24px",
                color: slide.light ? V.white : V.t1,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                position: "relative"
              }}
            >
              {slide.layout === "cover" ? (
                <>
                  <div style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    textAlign: "center",
                    lineHeight: 1.3,
                    marginBottom: "16px"
                  }}>
                    {slide.heading}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    textAlign: "center",
                    opacity: 0.9
                  }}>
                    {slide.sub}
                  </div>
                  <div style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "24px",
                    fontSize: "12px",
                    opacity: 0.7
                  }}>
                    {slide.note}
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    marginBottom: "12px"
                  }}>
                    {slide.heading}
                  </div>
                  {slide.sub && (
                    <div style={{
                      fontSize: "13px",
                      color: slide.light ? "rgba(255,255,255,0.8)" : V.t3,
                      marginBottom: "14px",
                      fontWeight: 500
                    }}>
                      {slide.sub}
                    </div>
                  )}
                  <div style={{
                    fontSize: "12px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    opacity: slide.light ? 0.9 : 1
                  }}>
                    {slide.body}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{
            padding: "12px 16px",
            borderTop: `1px solid ${V.border}`,
            background: V.white,
            fontSize: "11px",
            color: V.t4
          }}>
            <div>
              <strong>AI割当:</strong> {slide.ai.map((a) => `${a.part}(${MODEL_NAMES[a.model]})`).join(", ")}
            </div>
            {slide.dataSrc.length > 0 && (
              <div style={{ marginTop: "4px" }}>
                データ: {slide.dataSrc.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
