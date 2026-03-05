import { useState } from "react";
import { DOCX_CHAT } from "../data/slides";

const V = {
  bg:"#F0F2F7", sb:"#FFFFFF", main:"#F5F6FA", card:"#FFFFFF", border:"#DDE1EB",
  border2:"#C8CDD8", t1:"#333333", t2:"#555555", t3:"#888888", t4:"#AAAAAA",
  white:"#FFFFFF", accent:"#3C5996", teal:"#2B4070", navy:"#1E2D50", blue:"#3C5996",
  red:"#C83732", green:"#2E7D32", orange:"#D4880F", lime:"#ABCD00"
};

const sections = [
  { name: "表紙・会議情報", icon: "📋" },
  { name: "出席者一覧", icon: "👥" },
  { name: "議案一覧", icon: "📝" },
  { name: "決議事項", icon: "✅" },
  { name: "次回予定", icon: "📅" },
];

export default function CreateDocx({ setView }) {
  const [curSection, setCurSection] = useState(0);

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
            📄 フォーマル文書を作る
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
            📥 DOCXダウンロード
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
        {/* Left Panel: Chat (30%) */}
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

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            {DOCX_CHAT.map((msg, i) => (
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

          <div style={{
            padding: "12px",
            borderTop: `1px solid ${V.border}`,
            background: V.white
          }}>
            <div style={{
              fontSize: "11px",
              color: V.green,
              fontWeight: 600,
              padding: "8px",
              background: "rgba(46,125,50,0.08)",
              borderRadius: "4px",
              textAlign: "center"
            }}>
              ✅ 生成完了
            </div>
          </div>
        </div>

        {/* Center Panel: Section Structure (35%) */}
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
            📑 文書構成
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            {sections.map((section, i) => (
              <div
                key={section.name}
                onClick={() => setCurSection(i)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: curSection === i ? V.accent : V.main,
                  color: curSection === i ? V.white : V.t2,
                  border: `1px solid ${curSection === i ? V.accent : V.border}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: "13px",
                  fontWeight: curSection === i ? 600 : 500
                }}
                onMouseEnter={(e) => {
                  if (curSection !== i) {
                    e.currentTarget.style.backgroundColor = `${V.accent}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (curSection !== i) {
                    e.currentTarget.style.backgroundColor = V.main;
                  }
                }}
              >
                <span style={{ fontSize: "16px", marginRight: "8px" }}>
                  {section.icon}
                </span>
                {section.name}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Document Preview (35%) */}
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

          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "16px"
          }}>
            <div style={{
              background: V.card,
              borderRadius: "8px",
              padding: "24px",
              minHeight: "100%",
              border: `1px solid ${V.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
            }}>
              {curSection === 0 && (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>取締役会 議事録</div>
                  <div style={{ fontSize: 14, textAlign: "center", color: V.t3, marginBottom: 20 }}>第43回 定例取締役会</div>
                  <div style={{ borderTop: `1px solid ${V.border}`, paddingTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <div style={{ color: V.t4, fontWeight: 600 }}>開催日時</div>
                        <div style={{ marginTop: 2 }}>2026年3月5日 14:00-15:30</div>
                      </div>
                      <div>
                        <div style={{ color: V.t4, fontWeight: 600 }}>開催場所</div>
                        <div style={{ marginTop: 2 }}>本社 8F 役員会議室</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {curSection === 1 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>出席者一覧</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${V.border}` }}>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 600 }}>役職</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 600 }}>氏名</th>
                        <th style={{ textAlign: "center", padding: 8, fontWeight: 600 }}>出席</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { title: "代表取締役", name: "田中 太郎", present: "○" },
                        { title: "取締役（営業）", name: "佐藤 次郎", present: "○" },
                        { title: "取締役（開発）", name: "山田 三郎", present: "○" },
                        { title: "監査役", name: "鈴木 四郎", present: "○" },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${V.border}` }}>
                          <td style={{ padding: 8 }}>{row.title}</td>
                          <td style={{ padding: 8 }}>{row.name}</td>
                          <td style={{ padding: 8, textAlign: "center" }}>{row.present}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {curSection === 2 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>議案一覧</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ padding: 10, background: V.main, borderRadius: 6, borderLeft: `3px solid ${V.accent}` }}>
                      <div style={{ fontWeight: 600 }}>宿題1: Q1予算承認</div>
                      <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>前回会議からの継続案件</div>
                    </div>
                    <div style={{ padding: 10, background: V.main, borderRadius: 6, borderLeft: `3px solid ${V.accent}` }}>
                      <div style={{ fontWeight: 600 }}>宿題2: 人事評価制度改定</div>
                      <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>前回会議からの継続案件</div>
                    </div>
                    <div style={{ padding: 10, background: V.main, borderRadius: 6, borderLeft: `3px solid ${V.accent}` }}>
                      <div style={{ fontWeight: 600 }}>宿題3: システム投資計画</div>
                      <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>前回会議からの継続案件</div>
                    </div>
                    <div style={{ padding: 10, background: "rgba(60,89,150,0.08)", borderRadius: 6, borderLeft: `3px solid ${V.accent}` }}>
                      <div style={{ fontWeight: 600 }}>新議案: UILSON AI導入の稟議</div>
                      <div style={{ fontSize: 12, color: V.t3, marginTop: 2 }}>新規提案</div>
                    </div>
                  </div>
                </>
              )}

              {curSection === 3 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>決議事項</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["Q1予算を承認した", "人事評価制度の改定について協議した", "システム投資計画を了承した"].map((item, i) => (
                      <div key={i} style={{ padding: 10, background: V.main, borderRadius: 6, fontSize: 12, borderLeft: `3px solid ${V.green}` }}>
                        <span style={{ fontWeight: 600 }}>決議{i + 1}:</span> {item}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {curSection === 4 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>次回予定</div>
                  <div style={{ fontSize: 12, color: V.t2, lineHeight: 1.8 }}>
                    <div style={{ padding: "8px 0" }}>
                      <strong>次回開催:</strong> 2026年4月2日 14:00
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      <strong>開催場所:</strong> 本社 8F 役員会議室
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      <strong>想定議案:</strong> Q2経営報告、技術戦略の進捗確認
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
