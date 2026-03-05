import { useState } from "react";
import { XLSX_CHAT } from "../data/slides";

const V = {
  bg:"#F0F2F7", sb:"#FFFFFF", main:"#F5F6FA", card:"#FFFFFF", border:"#DDE1EB",
  border2:"#C8CDD8", t1:"#333333", t2:"#555555", t3:"#888888", t4:"#AAAAAA",
  white:"#FFFFFF", accent:"#3C5996", teal:"#2B4070", navy:"#1E2D50", blue:"#3C5996",
  red:"#C83732", green:"#2E7D32", orange:"#D4880F", lime:"#ABCD00"
};

const sheetStructure = [
  { name: "営業サマリー", desc: "月次KPI", cols: ["項目", "予算", "実績", "達成率"] },
  { name: "部門別 予実比較", desc: "予実比較", cols: ["部門", "予算", "実績", "差分", "前月比"] },
  { name: "案件一覧", desc: "ステータス別", cols: ["案件名", "ステータス", "金額", "進捗"] },
];

const sampleData = [
  ["月次売上", "¥50M", "¥45.2M", "90.4%"],
  ["営業利益", "¥15M", "¥14.1M", "94.0%"],
  ["新規案件", "12", "8", "66.7%"],
];

export default function CreateXlsx({ setView }) {
  const [curSheet, setCurSheet] = useState(0);

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
            📈 スプレッドシートを作る
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
            📥 XLSXダウンロード
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
            {XLSX_CHAT.map((msg, i) => (
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

        {/* Center Panel: Sheet Structure (35%) */}
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
            📋 シート構成
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {sheetStructure.map((sheet, i) => (
              <div
                key={sheet.name}
                onClick={() => setCurSheet(i)}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: curSheet === i ? V.accent : V.main,
                  color: curSheet === i ? V.white : V.t2,
                  border: `1px solid ${curSheet === i ? V.accent : V.border}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (curSheet !== i) {
                    e.currentTarget.style.backgroundColor = `${V.accent}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (curSheet !== i) {
                    e.currentTarget.style.backgroundColor = V.main;
                  }
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Sheet {i + 1}: {sheet.name}
                </div>
                <div style={{
                  fontSize: "12px",
                  opacity: curSheet === i ? 0.9 : 0.7,
                  marginBottom: "6px"
                }}>
                  {sheet.desc}
                </div>
                <div style={{
                  fontSize: "11px",
                  opacity: curSheet === i ? 0.8 : 0.6
                }}>
                  列: {sheet.cols.join(", ")}
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

          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "16px"
          }}>
            <div style={{
              background: V.card,
              borderRadius: "8px",
              overflow: "hidden",
              border: `1px solid ${V.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
            }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px"
              }}>
                <thead>
                  <tr style={{ background: V.accent }}>
                    {sheetStructure[curSheet].cols.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "10px",
                          color: V.white,
                          fontWeight: 600,
                          textAlign: "left",
                          borderRight: `1px solid ${V.border}`
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${V.border}` }}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "10px",
                            borderRight: j < row.length - 1 ? `1px solid ${V.border}` : "none",
                            background: i % 2 === 0 ? V.white : V.main
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: "14px",
              padding: "12px",
              background: V.card,
              borderRadius: "8px",
              border: `1px solid ${V.border}`,
              fontSize: "11px",
              color: V.t3
            }}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>🎨 書式ルール適用済み</div>
              <div>⚡ 前月比 ≥ +30% → 青ハイライト</div>
              <div>⚡ 前月比 ≤ -30% → 赤ハイライト</div>
              <div style={{
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: `1px solid ${V.border}`
              }}>
                📊 データソース: Salesforce (142件) + freee (38仕訳)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
