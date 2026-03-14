import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "uilson_skills";
const LOG_STORAGE_KEY = "uilson_skill_logs";

// Action permissions: services where the AI can WRITE/SEND/CREATE/DELETE
// Reading/searching is ALWAYS allowed on all connected services
export const ACTION_PERMISSIONS = [
  {
    id: "gmail_send",
    label: "Gmailで送信",
    icon: "📧",
    description: "メールの送信・ドラフト作成",
    actions: ["gmail_create_draft", "gmail_send_draft", "gmail_send_direct"],
    requiresAuth: "google",
  },
  {
    id: "gmail_manage",
    label: "Gmailを整理",
    icon: "🗂️",
    description: "メールの削除・ラベル変更・既読/未読",
    actions: ["gmail_trash", "gmail_modify_labels"],
    requiresAuth: "google",
  },
  {
    id: "calendar_write",
    label: "Google予定を操作",
    icon: "📅",
    description: "予定の作成・変更・削除",
    actions: ["calendar_create_event", "calendar_update_event", "calendar_delete_event"],
    requiresAuth: "google",
  },
  {
    id: "drive_write",
    label: "Driveにドキュメント作成",
    icon: "📝",
    description: "Google Docsの新規作成",
    actions: ["google_drive_create_doc"],
    requiresAuth: "google",
  },
  {
    id: "outlook_send",
    label: "Outlookで送信",
    icon: "📨",
    description: "メールの送信・ドラフト作成",
    actions: ["outlook_create_draft"],
    requiresAuth: "microsoft",
  },
  {
    id: "outlook_manage",
    label: "Outlookを整理",
    icon: "📋",
    description: "メールの移動・削除・フラグ・既読",
    actions: ["outlook_delete_mail", "outlook_move_mail", "outlook_mark_read", "outlook_flag_mail"],
    requiresAuth: "microsoft",
  },
  {
    id: "outlook_cal_write",
    label: "Outlook予定を操作",
    icon: "🗓️",
    description: "Outlook予定の作成・変更・削除",
    actions: ["outlook_calendar_create", "outlook_calendar_update", "outlook_calendar_delete"],
    requiresAuth: "microsoft",
  },
  {
    id: "slack_send",
    label: "SlackでDM送信",
    icon: "💬",
    description: "Slackでダイレクトメッセージを送信",
    actions: ["slack_send_dm"],
    requiresAuth: "slack",
  },
];

// Preset approval gate options
export const APPROVAL_GATE_OPTIONS = [
  { id: "send_email", label: "メール送信前", description: "メールを送信する前に確認" },
  { id: "send_message", label: "メッセージ送信前", description: "Slack/Teamsメッセージ送信前に確認" },
  { id: "create_event", label: "予定作成前", description: "カレンダーに予定を作成する前に確認" },
  { id: "delete_anything", label: "削除操作前", description: "メール・予定・ファイルを削除する前に確認" },
  { id: "create_document", label: "ドキュメント作成前", description: "Google Docsなど作成する前に確認" },
  { id: "final_output", label: "最終結果の提示時", description: "最終結果をユーザーに見せて確認" },
];

// Schedule presets
export const SCHEDULE_OPTIONS = [
  { id: "none", label: "スケジュールなし", desc: "手動実行のみ", value: null },
  { id: "daily_8", label: "毎朝 8:00", desc: "毎日午前8時に自動実行", value: "daily:8" },
  { id: "daily_9", label: "毎朝 9:00", desc: "毎日午前9時に自動実行", value: "daily:9" },
  { id: "weekdays_8", label: "平日 8:00", desc: "月〜金の午前8時に自動実行", value: "weekdays:8" },
  { id: "weekdays_9", label: "平日 9:00", desc: "月〜金の午前9時に自動実行", value: "weekdays:9" },
  { id: "weekly_1_9", label: "毎週月曜 9:00", desc: "毎週月曜午前9時に自動実行", value: "weekly:1:9" },
  { id: "weekly_5_17", label: "毎週金曜 17:00", desc: "毎週金曜午後5時に自動実行", value: "weekly:5:17" },
  { id: "hourly", label: "毎時", desc: "1時間ごとに自動実行", value: "hourly" },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== Firestore API helpers =====
async function firestoreCall(action, body = {}) {
  try {
    const resp = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    // Guard against non-JSON responses (e.g. HTML fallback when Cloud Functions not deployed)
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.warn("Firestore API returned non-JSON response (Cloud Functions may not be deployed)");
      return null;
    }
    const data = await resp.json();
    if (!data.ok && data.error) {
      // Suppress noisy warnings for expected Firestore states
      if (data.error.includes("NOT_FOUND")) {
        // Firestore database/collection not yet created — normal for fresh setup
        return null;
      }
      console.warn("Firestore API error:", data.error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("Firestore API unreachable:", e.message);
    return null;
  }
}

export default function useSkills() {
  const [skills, setSkills] = useState([]);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, synced, error
  const initialLoadDone = useRef(false);

  // ===== LOAD: Firestore first, localStorage fallback =====
  useEffect(() => {
    async function loadData() {
      setSyncStatus("syncing");

      // 1. Load from localStorage first (instant)
      let localSkills = [];
      let localLogs = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) localSkills = JSON.parse(stored);
      } catch (e) {
        console.warn("Failed to load skills from localStorage:", e);
      }
      try {
        const logs = localStorage.getItem(LOG_STORAGE_KEY);
        if (logs) localLogs = JSON.parse(logs);
      } catch (e) {
        console.warn("Failed to load logs from localStorage:", e);
      }

      // Set local data immediately for fast UI
      if (localSkills.length > 0) setSkills(localSkills);
      if (localLogs.length > 0) setExecutionLogs(localLogs);

      // 2. Try to load from Firestore
      const [skillsResult, logsResult] = await Promise.all([
        firestoreCall("get_skills"),
        firestoreCall("get_logs"),
      ]);

      if (skillsResult && logsResult) {
        const fsSkills = skillsResult.skills || [];
        const fsLogs = logsResult.logs || [];

        if (fsSkills.length > 0 || fsLogs.length > 0) {
          // Firestore has data — use it as source of truth
          setSkills(fsSkills);
          setExecutionLogs(fsLogs);
          // Also update localStorage cache
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fsSkills));
            localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(fsLogs));
          } catch (e) { /* ignore */ }
          setSyncStatus("synced");
        } else if (localSkills.length > 0 || localLogs.length > 0) {
          // Firestore is empty but localStorage has data — migrate up
          console.log("Migrating localStorage data to Firestore...");
          const syncResult = await firestoreCall("sync", {
            skills: localSkills,
            logs: localLogs,
          });
          if (syncResult) {
            console.log("Migration complete:", syncResult);
          }
          setSyncStatus("synced");
        } else {
          setSyncStatus("synced");
        }
      } else {
        // Firestore unreachable — use localStorage data
        setSyncStatus("error");
        console.warn("Firestore unreachable, using localStorage only");
      }

      initialLoadDone.current = true;
    }

    loadData();
  }, []);

  // ===== PERSIST: localStorage + async Firestore =====
  const persist = useCallback((updated) => {
    setSkills(updated);
    // localStorage (sync, fast)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save skills to localStorage:", e);
    }
  }, []);

  // Save a single skill to Firestore (fire-and-forget)
  const saveSkillToFirestore = useCallback((skill) => {
    firestoreCall("save_skill", { skill }).catch(() => {});
  }, []);

  // Delete a skill from Firestore (fire-and-forget)
  const deleteSkillFromFirestore = useCallback((skillId) => {
    firestoreCall("delete_skill", { skillId }).catch(() => {});
  }, []);

  const persistLogs = useCallback((updated) => {
    setExecutionLogs(updated);
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save execution logs to localStorage:", e);
    }
  }, []);

  // Save a single log to Firestore (fire-and-forget)
  const saveLogToFirestore = useCallback((log) => {
    firestoreCall("save_log", { log }).catch(() => {});
  }, []);

  // ===== CRUD Operations =====
  const createSkill = useCallback((data) => {
    const skill = {
      id: generateId(),
      name: data.name || "",
      goal: data.goal || "",
      actionPermissions: data.actionPermissions || [],
      constraints: data.constraints || [],
      approvalGates: data.approvalGates || [],
      context: data.context || "",
      orchestration: data.orchestration || "",
      triggers: data.triggers || [],
      schedule: data.schedule || null,
      lastScheduledRun: null,
      status: "learning",
      usageCount: 0,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      step: 1,
      feedbackScore: 0,
      feedbackCount: 0,
    };
    const updated = [...skills, skill];
    persist(updated);
    saveSkillToFirestore(skill);
    return skill;
  }, [skills, persist, saveSkillToFirestore]);

  const updateSkill = useCallback((id, changes) => {
    const updated = skills.map((s) => s.id === id ? { ...s, ...changes } : s);
    persist(updated);
    const updatedSkill = updated.find((s) => s.id === id);
    if (updatedSkill) saveSkillToFirestore(updatedSkill);
    return updatedSkill;
  }, [skills, persist, saveSkillToFirestore]);

  const deleteSkill = useCallback((id) => {
    persist(skills.filter((s) => s.id !== id));
    deleteSkillFromFirestore(id);
  }, [skills, persist, deleteSkillFromFirestore]);

  const finalizeSkill = useCallback((id, orchestration, triggers) => {
    updateSkill(id, {
      orchestration,
      triggers: triggers || [],
      status: "active",
      step: 5,
    });
  }, [updateSkill]);

  const toggleSkill = useCallback((id) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) return;
    updateSkill(id, { status: skill.status === "active" ? "paused" : "active" });
  }, [skills, updateSkill]);

  // Record a skill execution
  const recordExecution = useCallback((skillId, result) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // Update usage count and lastUsed
    const updatedSkills = skills.map((s) =>
      s.id === skillId
        ? { ...s, usageCount: (s.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
        : s
    );
    persist(updatedSkills);
    const updatedSkill = updatedSkills.find((s) => s.id === skillId);
    if (updatedSkill) saveSkillToFirestore(updatedSkill);

    // Add execution log
    const log = {
      id: generateId(),
      skillId,
      skillName: skill.name,
      timestamp: new Date().toISOString(),
      status: result.status || "completed",
      duration: result.duration || null,
      summary: result.summary || "",
      toolsUsed: result.toolsUsed || [],
      error: result.error || null,
    };
    const updatedLogs = [log, ...executionLogs].slice(0, 200);
    persistLogs(updatedLogs);
    saveLogToFirestore(log);

    return log;
  }, [skills, executionLogs, persist, persistLogs, saveSkillToFirestore, saveLogToFirestore]);

  // Get execution stats for a skill
  const getSkillStats = useCallback((skillId) => {
    const logs = executionLogs.filter((l) => l.skillId === skillId);
    if (logs.length === 0) return { total: 0, success: 0, failed: 0, avgDuration: 0, successRate: 0 };

    const success = logs.filter((l) => l.status === "completed").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const durations = logs.filter((l) => l.duration).map((l) => l.duration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      total: logs.length,
      success,
      failed,
      partial: logs.filter((l) => l.status === "partial").length,
      avgDuration,
      successRate: Math.round((success / logs.length) * 100),
      lastExecution: logs[0] || null,
    };
  }, [executionLogs]);

  // Get overall stats across all skills
  const getOverallStats = useCallback(() => {
    const totalExecutions = executionLogs.length;
    const successful = executionLogs.filter((l) => l.status === "completed").length;
    const failed = executionLogs.filter((l) => l.status === "failed").length;
    const durations = executionLogs.filter((l) => l.duration).map((l) => l.duration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const today = new Date().toDateString();
    const todayLogs = executionLogs.filter((l) => new Date(l.timestamp).toDateString() === today);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekLogs = executionLogs.filter((l) => new Date(l.timestamp) >= weekAgo);

    const skillUsage = {};
    executionLogs.forEach((l) => {
      if (!skillUsage[l.skillId]) {
        skillUsage[l.skillId] = { name: l.skillName, count: 0, success: 0 };
      }
      skillUsage[l.skillId].count++;
      if (l.status === "completed") skillUsage[l.skillId].success++;
    });
    const topSkills = Object.entries(skillUsage)
      .map(([id, data]) => ({ id, ...data, successRate: Math.round((data.success / data.count) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalExecutions,
      successful,
      failed,
      successRate: totalExecutions > 0 ? Math.round((successful / totalExecutions) * 100) : 0,
      avgDuration,
      todayCount: todayLogs.length,
      weekCount: weekLogs.length,
      topSkills,
      recentLogs: executionLogs.slice(0, 20),
    };
  }, [executionLogs]);

  // Record user feedback on an execution (thumbs up / thumbs down)
  const recordFeedback = useCallback((logId, feedback) => {
    // feedback: "good" or "bad"
    const updatedLogs = executionLogs.map((l) => {
      if (l.id === logId) return { ...l, feedback };
      return l;
    });
    persistLogs(updatedLogs);

    // Update feedback log in Firestore
    const log = updatedLogs.find((l) => l.id === logId);
    if (log) {
      saveLogToFirestore(log);

      // Update skill's feedback score
      const skill = skills.find((s) => s.id === log.skillId);
      if (skill) {
        const delta = feedback === "good" ? 1 : -1;
        const updatedSkills = skills.map((s) => {
          if (s.id === log.skillId) {
            return {
              ...s,
              feedbackScore: (s.feedbackScore || 0) + delta,
              feedbackCount: (s.feedbackCount || 0) + 1,
            };
          }
          return s;
        });
        persist(updatedSkills);
        const updatedSkill = updatedSkills.find((s) => s.id === log.skillId);
        if (updatedSkill) saveSkillToFirestore(updatedSkill);
      }
    }
  }, [executionLogs, skills, persistLogs, persist, saveLogToFirestore, saveSkillToFirestore]);

  // Generate the orchestration prompt for active skills
  const getActiveSkillsPrompt = useCallback(() => {
    const active = skills.filter((s) => s.status === "active" && s.orchestration);
    if (active.length === 0) return "";

    let prompt = "\n\n## ACTIVE SKILL ORCHESTRATIONS (autonomous execution blueprints):\n";
    prompt += "When user's request matches a skill's triggers/goal, follow the orchestration plan autonomously.\n";
    prompt += "Use the Plan→Execute→Observe loop: analyze the goal, plan tool calls, execute them, observe results, adjust plan if needed.\n";
    prompt += "IMPORTANT: You can ALWAYS use ALL read/search tools (gmail_search, calendar_list_events, web_search, weather_forecast, google_drive_search, outlook_search_mail, slack_read_dm, etc.) regardless of skill permissions. Permissions only restrict WRITE actions.\n";
    prompt += "ALWAYS respect approval gates — pause and ask the user before taking gated actions.\n\n";

    active.forEach((s) => {
      prompt += `### SKILL: ${s.name}\n`;
      prompt += `**GOAL**: ${s.goal}\n`;
      prompt += `**TRIGGERS**: ${s.triggers.join(", ") || "auto-detect from goal"}\n`;
      const permittedActions = (s.actionPermissions || []).map(apId => {
        const perm = ACTION_PERMISSIONS.find(p => p.id === apId);
        return perm ? `${perm.label} (${perm.actions.join(", ")})` : apId;
      });
      if (permittedActions.length > 0) {
        prompt += `**PERMITTED ACTIONS (write/send/create/delete)**:\n${permittedActions.map(a => "- ✅ " + a).join("\n")}\n`;
      } else {
        prompt += `**PERMITTED ACTIONS**: READ-ONLY (no write/send/create/delete actions allowed)\n`;
      }
      prompt += `**INFORMATION GATHERING**: All search/read tools are available — use web_search, weather_forecast, gmail_search, calendar_list_events, google_drive_search, etc. freely to gather information needed for the goal.\n`;
      if (s.constraints.length > 0) {
        prompt += `**CONSTRAINTS (MUST follow)**:\n${s.constraints.map(c => "- 🚫 " + c).join("\n")}\n`;
      }
      if (s.approvalGates.length > 0) {
        const gateLabels = s.approvalGates.map(gId => {
          const gate = APPROVAL_GATE_OPTIONS.find(g => g.id === gId);
          return gate ? gate.label : gId;
        });
        prompt += `**APPROVAL GATES (MUST pause and confirm with user)**:\n${gateLabels.map(g => "- ⚠️ " + g).join("\n")}\n`;
      }
      if (s.context) {
        prompt += `**CONTEXT**: ${s.context}\n`;
      }
      prompt += `**ORCHESTRATION PLAN**:\n${s.orchestration}\n\n`;
    });

    return prompt;
  }, [skills]);

  return {
    skills,
    executionLogs,
    syncStatus,
    activeSkills: skills.filter((s) => s.status === "active"),
    learningSkills: skills.filter((s) => s.status === "learning"),
    pausedSkills: skills.filter((s) => s.status === "paused"),
    createSkill, updateSkill, deleteSkill,
    finalizeSkill, toggleSkill, getActiveSkillsPrompt,
    recordExecution, recordFeedback, getSkillStats, getOverallStats,
  };
}
