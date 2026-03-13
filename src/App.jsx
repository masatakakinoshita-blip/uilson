import { useState, useEffect, useRef } from "react";
import "./styles.css";
import useAuth from "./hooks/useAuth";
import useDataFetch from "./hooks/useDataFetch";
import useSkills from "./hooks/useSkills";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import CreatePptx from "./components/CreatePptx";
import CreateXlsx from "./components/CreateXlsx";
import CreateDocx from "./components/CreateDocx";
import LearnView from "./components/LearnView";
import RunView from "./components/RunView";
import ReviewView from "./components/ReviewView";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const auth = useAuth();
  const data = useDataFetch(auth);
  const skillsHook = useSkills();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("home");
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastExecLogId, setLastExecLogId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Auto-collapse sidebar on creation sub-pages (3rd level)
  const prevViewRef = useRef(view);
  useEffect(() => {
    const creationPages = ["create-pptx", "create-xlsx", "create-docx"];
    if (creationPages.includes(view) && !creationPages.includes(prevViewRef.current)) {
      setSbCollapsed(true);
    }
    prevViewRef.current = view;
  }, [view]);

  const send = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const ctx = await data.getContext();
      const dowNames = ["日", "月", "火", "水", "木", "金", "土"];
      const now = new Date();
      const connected = [];
      const disconnected = [];
      if (auth.token) connected.push("Google (Gmail, Calendar, Drive)");
      else disconnected.push("Google (Gmail, Calendar, Drive)");
      if (auth.slackToken) connected.push("Slack");
      else disconnected.push("Slack");
      if (auth.msToken) connected.push("Microsoft (Outlook Mail, Outlook Calendar, Teams, SharePoint)");
      else disconnected.push("Microsoft (Outlook, Teams, SharePoint)");
      const connStatus = "\n\n## Connected Services: " + (connected.length ? connected.join(", ") : "NONE") +
        (disconnected.length ? "\n## NOT Connected: " + disconnected.join(", ") : "");
      const systemPrompt =
        "You are UILSON, a friendly and helpful AI assistant. Speak in a warm, easy-to-understand Japanese tone (丁寧だけど堅すぎない、お母さんにも伝わるような優しい口調で). Use simple words and avoid jargon. Current: " +
        now.toLocaleString("ja-JP") +
        " (" +
        dowNames[now.getDay()] +
        "曜日)" +
        connStatus +
        "\nUser data:" +
        ctx +
        "\nCRITICAL: NEVER fabricate or invent data. Only use REAL data from connected services shown above. If a service is NOT connected, say so and guide the user to connect it via the settings (⚙️) button." +
        "\nFor greetings/briefings: Only report data from CONNECTED services. If nothing is connected, tell the user to connect services first." +
        "\nIMPORTANT: Calendar events already include correct day-of-week labels. Always use these labels as-is." +
        "\nFor Outlook calendar operations, use outlook_calendar_create/update/delete tools." +
        "\nIMPORTANT: When user asks about specific emails or calendar events not shown in context, ALWAYS use search tools to dynamically fetch data." +
        "\nFor Slack operations: use slack_search_users to find people, slack_read_dm to read DM history, slack_send_dm to send messages." +
        "\nFor Google Drive: use google_drive_search/google_drive_list/google_drive_get_content/google_drive_create_doc tools." +
        "\n\n=== SMART SCHEDULING ===" +
        "\nWhen user wants to schedule a meeting or asks about availability:" +
        "\n1. Use calendar_list_events to check existing events in the date range" +
        "\n2. Use calendar_find_free_time to find available slots" +
        "\n3. Present 3-5 candidate times in a clear format with day-of-week" +
        "\n4. Before creating any event, use calendar_check_conflicts to verify no double-booking" +
        "\n5. If the user mentions another person, ask for their email to add as attendee" +
        "\nWhen user asks '〇〇さんと来週ミーティングしたい' → find your free time, propose slots, and offer to create the event with the attendee." +
        "\n\n=== ABSOLUTE RULE: NEVER ADD DISCLAIMERS ABOUT DATA LIMITATIONS ===" +
        "\nYou have powerful tools that return real-time data. Follow these rules STRICTLY:" +
        "\n1. NEVER say you 'cannot access', 'don't have access to', or 'cannot retrieve' any type of data" +
        "\n2. NEVER add disclaimers like 'より正確なデータは〇〇でご確認ください' or 'リアルタイムの数値にはアクセスできません'" +
        "\n3. NEVER hedge with phrases like '直接返すデータソースにはアクセスできていません' or '数値そのものは取得できない'" +
        "\n4. When web_search returns results, report ALL information found — including numbers, prices, percentages" +
        "\n5. If search results contain stock prices, exchange rates, or statistics, present them confidently as the data you found" +
        "\n6. Only say a tool failed if it returned an actual error. If it returned ANY data, present that data." +
        "\nBANNED PHRASES (never use any variation): 'アクセスできません', 'データソースにはアクセス', '直接取得できない', '正確な数値は〇〇で確認', 'リアルタイムの株価数値そのもの'" +
        "\nCORRECT PATTERN: web_search('トヨタ 株価') → 'トヨタの株価は〇〇円です（出典：〇〇）'" +
        "\n\n=== WEB SEARCH & STOCK PRICE CAPABILITY ===" +
        "\nThe web_search tool has TWO data sources:" +
        "\n1. Yahoo Finance API — returns EXACT real-time stock prices (price, change, change%, high, low, volume)" +
        "\n2. Google Search (via Gemini Grounding) — returns news, analysis, and web context" +
        "\nFor stock queries, ALWAYS check the 'stockPrices' array in the tool result — it contains exact price data from Yahoo Finance." +
        "\nFormat stock data as: '銘柄名 (ティッカー): ○○ドル/円 (前日比 +/-○○%)'." +
        "\nThe 'answer' field contains a pre-formatted summary — use it directly." +
        "\nAlways use web_search first and present the results directly without disclaimers." +
        "\nWhen searching for Japanese topics, use Japanese queries. When searching for international topics, use the most relevant language." +
        "\n\n=== WEATHER CAPABILITY ===" +
        "\nThe weather_forecast tool provides REAL-TIME weather data (current conditions + 7-day forecast) for any city worldwide." +
        "\nUse it for: weather questions, outdoor planning (BBQ, travel, sports), clothing advice, umbrella reminders, etc." +
        "\nSupports Japanese city names (東京, 大阪, etc.) and international cities." +
        "\n\n=== MORNING BRIEFING ===" +
        "\nWhen user greets you (おはよう, おはようございます, こんにちは, hi, etc.):" +
        "\n1. Greet them warmly" +
        "\n2. If services are connected, proactively provide a brief summary:" +
        "\n   - Today's calendar events (use calendar_list_events for today)" +
        "\n   - Unread important emails (use gmail_search for is:unread is:important)" +
        "\n   - Current weather (use weather_forecast)" +
        "\n3. Keep it concise — highlight only what needs attention" +
        "\n\n=== INTEGRATED SEARCH ===" +
        "\nWhen user asks to find something across services (e.g. '〇〇プロジェクトの資料を探して'):" +
        "\n- Search ALL connected services simultaneously: Gmail (gmail_search), Google Drive (google_drive_search), Calendar (calendar_list_events), Slack (slack_read_dm), Outlook (outlook_search_mail), SharePoint (sharepoint_search_files)" +
        "\n- Present results grouped by source service with clear labels" +
        "\n- Include links where available" +
        "\n\n=== DOCUMENT CREATION ===" +
        "\nWhen user asks to create a document, report, summary, or draft:" +
        "\n- Use google_drive_create_doc to create a Google Doc" +
        "\n- For email drafts, use gmail_create_draft or outlook_create_draft" +
        "\n- Always provide the link to the created document" +
        skillsHook.getActiveSkillsPrompt() +
        (() => {
          // Include feedback summary for skills with feedback
          const fbSkills = skillsHook.skills.filter(s => s.feedbackCount > 0);
          if (fbSkills.length === 0) return "";
          let p = "\n\n## SKILL FEEDBACK HISTORY (use to improve execution quality):\n";
          fbSkills.forEach(s => {
            const ratio = s.feedbackScore >= 0 ? "positive" : "needs improvement";
            p += `- ${s.name}: ${s.feedbackCount} feedback(s), net score ${s.feedbackScore} (${ratio})\n`;
          });
          // Recent negative feedback logs
          const badLogs = skillsHook.executionLogs.filter(l => l.feedback === "bad").slice(0, 5);
          if (badLogs.length > 0) {
            p += "\nRecent negative feedback:\n";
            badLogs.forEach(l => { p += `- ${l.skillName}: "${l.summary?.substring(0, 100)}"\n`; });
            p += "\nPlease adjust execution approach for skills with negative feedback to improve quality.\n";
          }
          return p;
        })();

      // Detect if this message triggers an active skill
      const matchedSkill = skillsHook.activeSkills.find((s) => {
        const triggers = s.triggers || [];
        const lowerText = text.toLowerCase();
        return triggers.some((t) => lowerText.includes(t.toLowerCase())) ||
          lowerText.includes(s.name.toLowerCase()) ||
          lowerText.includes("を実行して");
      });
      const execStart = Date.now();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
          system: systemPrompt,
          googleToken: auth.token,
          msToken: auth.msToken,
          slackToken: auth.slackToken,
        }),
      });
      const respData = await res.json();
      const reply = data.extractReply(respData);
      setMessages((p) => [...p, { role: "assistant", content: reply }]);

      // Record skill execution if a skill was triggered
      if (matchedSkill) {
        const duration = Date.now() - execStart;
        const toolsUsed = respData.toolsUsed || [];
        const hasError = typeof reply === "string" && (reply.includes("Error") || reply.includes("エラー"));
        const execLog = skillsHook.recordExecution(matchedSkill.id, {
          status: hasError ? "failed" : "completed",
          duration,
          summary: typeof reply === "string" ? reply.substring(0, 200) : "実行完了",
          toolsUsed,
        });
        if (execLog) setLastExecLogId(execLog.id);
      }
    } catch (err) {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Error: " + err.message },
      ]);
    }
    setLoading(false);
  };

  const renderView = () => {
    switch (view) {
      case "create-pptx":
        return <CreatePptx setView={setView} />;
      case "create-xlsx":
        return <CreateXlsx setView={setView} />;
      case "create-docx":
        return <CreateDocx setView={setView} />;
      case "learn":
        return (
          <LearnView
            skills={skillsHook.skills}
            onCreateSkill={skillsHook.createSkill}
            onUpdateSkill={skillsHook.updateSkill}
            onDeleteSkill={skillsHook.deleteSkill}
            onFinalizeSkill={skillsHook.finalizeSkill}
            onToggleSkill={skillsHook.toggleSkill}
            onExecuteSkill={(skill) => {
              setView("home");
              const triggerMsg = skill.name + "を実行して";
              setTimeout(() => send(triggerMsg), 300);
            }}
          />
        );
      case "run":
        return <RunView skills={skillsHook.skills} executionLogs={skillsHook.executionLogs} getSkillStats={skillsHook.getSkillStats} getOverallStats={skillsHook.getOverallStats} onExecuteSkill={(skill) => { setView("home"); setTimeout(() => send(skill.name + "を実行して"), 300); }} />;
      case "review":
        return <ReviewView skills={skillsHook.skills} executionLogs={skillsHook.executionLogs} getSkillStats={skillsHook.getSkillStats} getOverallStats={skillsHook.getOverallStats} />;
      default:
        return (
          <ChatView
            messages={messages}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
            loading={loading}
            send={send}
            token={auth.token}
            slackConnected={auth.slackConnected}
            msToken={auth.msToken}
            spSites={data.spSites}
            teamsChats={data.teamsChats}
            teamsChannels={data.teamsChannels}
            driveFiles={data.driveFiles}
            lastExecLogId={lastExecLogId}
            feedbackGiven={feedbackGiven}
            onFeedback={(logId, fb) => {
              skillsHook.recordFeedback(logId, fb);
              setFeedbackGiven((prev) => ({ ...prev, [logId]: fb }));
            }}
            setView={setView}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#F4F1EE",
        color: "#333",
      }}
    >
      <Sidebar
        view={view}
        setView={setView}
        sbCollapsed={sbCollapsed}
        setSbCollapsed={setSbCollapsed}
        token={auth.token}
        slackConnected={auth.slackConnected}
        msToken={auth.msToken}
        onSettingsClick={() => setShowSettings(true)}
        skillCounts={{
          active: skillsHook.activeSkills.length,
          learning: skillsHook.learningSkills.length,
        }}
      />
      <div
        className="uilson-mn"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "#FAF8F6",
        }}
      >
        {renderView()}
      </div>
      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        auth={auth}
        emailCounts={{
          gmail: data.emails.length,
          outlook: data.outlookEmails.length,
        }}
        eventCounts={{
          google: data.events.length,
          outlook: data.outlookEvents.length,
        }}
      />
    </div>
  );
}
