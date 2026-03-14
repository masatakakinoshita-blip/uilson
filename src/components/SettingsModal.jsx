import { googleAuthUrl, slackAuthUrl, msAuthUrl } from "../hooks/useAuth";

// Check if OAuth Client IDs are configured (empty = not available)
const MS_CLIENT_CONFIGURED = !!(import.meta.env.VITE_MS_CLIENT_ID || "");

const V = {
  bg: "#F0F2F7",
  sb: "#FFFFFF",
  main: "#F5F6FA",
  card: "#FFFFFF",
  border: "#DDE1EB",
  t1: "#333333",
  t2: "#555555",
  t3: "#888888",
  t4: "#AAAAAA",
  white: "#FFFFFF",
  accent: "#3C5996",
  teal: "#2B4070",
  red: "#C83732",
  green: "#2E7D32",
};

export default function SettingsModal({ show, onClose, auth, emailCounts, eventCounts }) {
  if (!show) return null;

  const handleDisconnect = async (service) => {
    if (service === "google") {
      auth.logout();
    } else if (service === "slack") {
      auth.slackLogout();
    } else if (service === "outlook") {
      auth.msLogout();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: V.card,
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          maxWidth: "520px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px",
            borderBottom: `1px solid ${V.border}`,
            background: V.white,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: V.t1 }}>
            ⚙️ 接続設定
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: V.t3,
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Google Card */}
          <ServiceCard
            name="Google"
            icon="🔵"
            isConnected={!!auth.token}
            email={auth.googleEmail}
            counts={[
              { label: "Gmail", count: emailCounts?.gmail || 0 },
              { label: "Calendar", count: eventCounts?.google || 0 },
            ]}
            onConnect={() => {
              const savedEmail = localStorage.getItem("g_email");
              window.location.href = googleAuthUrl(savedEmail || undefined);
            }}
            onDisconnect={() => handleDisconnect("google")}
          />

          {/* Slack Card */}
          <ServiceCard
            name="Slack"
            icon="⚫"
            isConnected={auth.slackConnected}
            email={auth.slackEmail}
            counts={[{ label: "Messages", count: auth.slackMsgs || auth.slackMsgCount || 0 }]}
            onConnect={() => {
              window.location.href = slackAuthUrl();
            }}
            onDisconnect={() => handleDisconnect("slack")}
          />

          {/* Outlook Card */}
          <ServiceCard
            name="Outlook (Microsoft 365)"
            icon="🟦"
            isConnected={!!auth.msToken}
            email={auth.msEmail}
            counts={[
              { label: "Mail", count: emailCounts?.outlook || 0 },
              { label: "Calendar", count: eventCounts?.outlook || 0 },
            ]}
            onConnect={MS_CLIENT_CONFIGURED ? () => {
              window.location.href = msAuthUrl();
            } : null}
            onDisconnect={() => handleDisconnect("outlook")}
            disabledMessage={!MS_CLIENT_CONFIGURED ? "準備中（Azure AD設定が必要です）" : null}
          />
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ name, icon, isConnected, email, counts, onConnect, onDisconnect, disabledMessage }) {
  return (
    <div
      style={{
        background: V.main,
        border: `1px solid ${V.border}`,
        borderRadius: "10px",
        padding: "18px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header with status */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: V.t1 }}>
            {name}
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isConnected ? V.green : V.t4,
              }}
            />
            <span style={{ fontSize: "12px", color: V.t3 }}>
              {isConnected ? "接続済み" : "未接続"}
            </span>
          </div>
        </div>
      </div>

      {/* Email display */}
      {isConnected && email && (
        <div
          style={{
            fontSize: "13px",
            color: V.t2,
            background: V.white,
            padding: "8px 12px",
            borderRadius: "6px",
            wordBreak: "break-all",
          }}
        >
          {email}
        </div>
      )}

      {/* Counts */}
      {isConnected && counts && counts.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {counts.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontSize: "12px",
                color: V.t2,
                background: V.white,
                padding: "6px 12px",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontWeight: "600", color: V.accent }}>
                {item.count}
              </span>{" "}
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        {!isConnected ? (
          disabledMessage ? (
            <div
              style={{
                flex: 1,
                background: V.border,
                color: V.t3,
                border: "none",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              {disabledMessage}
            </div>
          ) : (
          <button
            onClick={onConnect}
            style={{
              flex: 1,
              background: V.accent,
              color: V.white,
              border: "none",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = V.teal)}
            onMouseLeave={(e) => (e.target.style.background = V.accent)}
          >
            接続する
          </button>
          )
        ) : (
          <button
            onClick={onDisconnect}
            style={{
              flex: 1,
              background: V.white,
              color: V.red,
              border: `1.5px solid ${V.red}`,
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = V.red;
              e.target.style.color = V.white;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = V.white;
              e.target.style.color = V.red;
            }}
          >
            切断
          </button>
        )}
      </div>
    </div>
  );
}
