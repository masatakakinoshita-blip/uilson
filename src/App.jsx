import { useState, useEffect, useRef } from "react";
import "./styles.css";
import useAuth from "./hooks/useAuth";
import useDataFetch from "./hooks/useDataFetch";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import CreateMenu from "./components/CreateMenu";
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

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("chat");
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      const systemPrompt =
        "You are UILSON, a professional AI business assistant. Current: " +
        now.toLocaleString("ja-JP") +
        " (" +
        dowNames[now.getDay()] +
        "曜日)" +
        "\nUser data:" +
        ctx +
        "\nReply in user language. For greetings, give a brief daily briefing using Gmail, Calendar, Slack, and Outlook data." +
        "\nIMPORTANT: Calendar events already include correct day-of-week labels. Always use these labels as-is." +
        "\nFor Outlook calendar operations, use outlook_calendar_create/update/delete tools." +
        "\nIMPORTANT: When user asks about specific emails or calendar events not shown in context, ALWAYS use search tools to dynamically fetch data." +
        "\nFor Slack operations: use slack_search_users to find people, slack_read_dm to read DM history, slack_send_dm to send messages." +
        "\nFor Google Drive: use google_drive_search/google_drive_list/google_drive_get_content tools.";

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
      case "create-menu":
        return <CreateMenu setView={setView} />;
      case "create-pptx":
        return <CreatePptx setView={setView} />;
      case "create-xlsx":
        return <CreateXlsx setView={setView} />;
      case "create-docx":
        return <CreateDocx setView={setView} />;
      case "learn":
        return <LearnView />;
      case "run":
        return <RunView />;
      case "review":
        return <ReviewView />;
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
          />
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#F0F2F7",
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
      />
      <div
        className="uilson-mn"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "#F5F6FA",
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
