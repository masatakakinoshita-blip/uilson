import { useState, useRef } from "react";
import { ACTION_PERMISSIONS, APPROVAL_GATE_OPTIONS, SCHEDULE_OPTIONS } from "../hooks/useSkills";

const V = {
  bg: "#F4F1EE", sb: "#FFFFFF", main: "#FAF8F6", card: "#FFFFFF",
  border: "#E6E0DA", t1: "#3D3530", t2: "#5C534D", t3: "#8E857E",
  t4: "#B5ADA6", white: "#FFFFFF", accent: "#5B7DB8", teal: "#3D6098",
  green: "#5A9E6F", red: "#C87066", orange: "#C49A3C", lime: "#A8C868",
};

export default function LearnView({ skills, onCreateSkill, onUpdateSkill, onDeleteSkill, onFinalizeSkill, onToggleSkill, onExecuteSkill }) {
  const [tab, setTab] = useState("teach");
  const [showWizard, setShowWizard] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const activeSkills = (skills || []).filter((s) => s.status === "active");
  const learningSkills = (skills || []).filter((s) => s.status === "learning");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>🧠 おぼえる</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>AIに業務ワークフローを教えて、自律的に実行させます（{activeSkills.length}件アクティブ）</div>
      </div>
      <div style={{ display: "flex", gap: 0, padding: "0 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        {[{ id: "teach", label: "新しく覚えさせる", count: learningSkills.length }, { id: "myskills", label: "スキル一覧", count: skills?.length || 0 }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 16px", borderBottom: tab === t.id ? `3px solid ${V.accent}` : "none", background: tab === t.id ? V.white : "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? V.accent : V.t3, display: "flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {t.count > 0 && <span style={{ backgroundColor: tab === t.id ? V.accent : V.t4, color: V.white, padding: "1px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "teach" && <TeachTab skills={skills} learningSkills={learningSkills} showWizard={showWizard} setShowWizard={setShowWizard} editingSkill={editingSkill} setEditingSkill={setEditingSkill} onCreateSkill={onCreateSkill} onUpdateSkill={onUpdateSkill} onFinalizeSkill={onFinalizeSkill} onDeleteSkill={onDeleteSkill} />}
        {tab === "myskills" && <SkillsTab skills={skills || []} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} onExecuteSkill={onExecuteSkill} setEditingSkill={(s) => { setEditingSkill(s); setTab("teach"); setShowWizard(true); }} />}
      </div>
    </div>
  );
}

function TeachTab({ skills, learningSkills, showWizard, setShowWizard, editingSkill, setEditingSkill, onCreateSkill, onUpdateSkill, onFinalizeSkill, onDeleteSkill }) {
  if (showWizard || editingSkill) {
    return <SkillWizard skill={editingSkill} onClose={() => { setShowWizard(false); setEditingSkill(null); }} onCreateSkill={onCreateSkill} onUpdateSkill={onUpdateSkill} onFinalizeSkill={onFinalizeSkill} />;
  }
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 700, color: V.t1 }}>🧠 AIにワークフローを教える</h1>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, color: V.t3, lineHeight: 1.6 }}>ゴールを定義し、アクション権限と制約を設定すると、AIが自律的にタスクを実行します。情報収集は常にすべてのサービスを使えます。</p>
        <button onClick={() => setShowWizard(true)} style={{ padding: "12px 20px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>＋ 新しいスキルを作成</button>
      </div>
      {learningSkills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: V.orange }}>作成中のスキル</h2>
          {learningSkills.map((s) => (
            <div key={s.id} style={{ backgroundColor: V.card, border: `1px solid ${V.orange}40`, borderLeft: `4px solid ${V.orange}`, borderRadius: 8, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: V.t3 }}>{s.goal ? s.goal.substring(0, 60) + "..." : "ゴール未設定"} · ステップ {s.step}/5</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditingSkill(s); setShowWizard(true); }} style={{ padding: "8px 14px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>続ける</button>
                <button onClick={() => onDeleteSkill(s.id)} style={{ padding: "8px 10px", backgroundColor: "transparent", color: V.t4, border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>スキルの仕組み</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { step: "①", title: "ゴール定義", desc: "AIに達成してほしい目標を記述" },
            { step: "②", title: "アクション許可", desc: "送信・作成・削除の許可範囲を設定" },
            { step: "③", title: "制約と承認", desc: "やってはいけないことと確認ポイント" },
            { step: "④", title: "AI生成→有効化", desc: "AIがオーケストレーション計画を生成" },
          ].map((item, idx) => (
            <div key={idx} style={{ backgroundColor: V.card, border: `1px solid ${V.border}`, borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: V.t3 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Example templates */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>テンプレートから作成</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {TEMPLATES.map((tpl, idx) => (
            <button key={idx} onClick={() => { setEditingSkill({ ...tpl.data, id: null, status: "learning", step: 1 }); setShowWizard(true); }} style={{ backgroundColor: V.card, border: `1px solid ${V.border}`, borderRadius: 8, padding: 16, textAlign: "left", cursor: "pointer", transition: "border-color 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = V.accent} onMouseOut={e => e.currentTarget.style.borderColor = V.border}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{tpl.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 4 }}>{tpl.name}</div>
              <div style={{ fontSize: 12, color: V.t3, lineHeight: 1.5 }}>{tpl.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  {
    icon: "📋",
    name: "会議準備アシスト",
    description: "次の会議に関連する情報を全サービスから収集し、アジェンダ案を自動作成",
    data: {
      name: "会議準備アシスト",
      goal: "次の会議の参加者・議題に関連する情報をメール・ドキュメント・カレンダー・Slackから収集し、アジェンダ案と要点サマリーを作成する",
      actionPermissions: [],
      constraints: ["情報収集のみ行い、メールの送信やカレンダーの変更は行わない", "機密性の高い内容は要約に含めず、リンクのみ提示する"],
      approvalGates: ["final_output"],
      context: "定例会議やプロジェクトミーティングの事前準備に使用。全サービスから情報を自由に収集してよい。",
    },
  },
  {
    icon: "📧",
    name: "メールトリアージ",
    description: "未読メールを全サービス横断で分類し、重要度別に整理。返信ドラフトも自動作成",
    data: {
      name: "メールトリアージ",
      goal: "未読メールをスキャンし、緊急度（高・中・低）に分類する。高の場合は返信ドラフトを作成し、中は要約を提示、低はスキップする",
      actionPermissions: ["gmail_send", "outlook_send"],
      constraints: ["メールの削除は絶対にしない", "返信はドラフト作成のみ、自動送信しない", "個人的なメールはスキップする"],
      approvalGates: ["send_email", "final_output"],
      context: "朝のメール確認時に使用。カレンダーやSlackも参照して文脈を補完してよい。",
    },
  },
  {
    icon: "📊",
    name: "週次レポート作成",
    description: "全サービスから1週間の活動を集約し、Google Docsにレポートを自動生成",
    data: {
      name: "週次レポート作成",
      goal: "過去1週間のカレンダーイベント、送受信メール、Slackメッセージ、天気、ニュースなどから業務活動を収集し、進捗・達成事項・来週の予定をまとめたレポートをGoogle Docsに作成する",
      actionPermissions: ["drive_write"],
      constraints: ["プライベートな予定やメールはレポートに含めない", "他人のメッセージは要約のみ、原文を転載しない"],
      approvalGates: ["create_document", "final_output"],
      context: "毎週金曜日に上司やチームに提出する週次報告に使用。Web検索で業界ニュースも補完する。",
    },
  },
  {
    icon: "🌅",
    name: "朝のブリーフィング",
    description: "今日の予定・天気・ニュース・未読メールをまとめて報告",
    data: {
      name: "朝のブリーフィング",
      goal: "今日のカレンダー予定、天気予報、主要ニュース、未読メールの要約、Slackの未読メッセージをまとめて朝のブリーフィングとして報告する",
      actionPermissions: [],
      constraints: ["情報の閲覧・収集のみ行う", "メール・メッセージの送信や予定の変更は一切しない"],
      approvalGates: [],
      context: "毎朝の業務開始時に使用。全サービス＋Web検索＋天気APIを横断して情報を収集する。",
    },
  },
];

function SkillWizard({ skill: initialSkill, onClose, onCreateSkill, onUpdateSkill, onFinalizeSkill }) {
  const [step, setStep] = useState(initialSkill?.step || 1);
  const [skillId, setSkillId] = useState(initialSkill?.id || null);
  const [name, setName] = useState(initialSkill?.name || "");
  const [goal, setGoal] = useState(initialSkill?.goal || "");
  const [actionPermissions, setActionPermissions] = useState(initialSkill?.actionPermissions || []);
  const [constraints, setConstraints] = useState(initialSkill?.constraints || []);
  const [currentConstraint, setCurrentConstraint] = useState("");
  const [approvalGates, setApprovalGates] = useState(initialSkill?.approvalGates || []);
  const [context, setContext] = useState(initialSkill?.context || "");
  const [schedule, setSchedule] = useState(initialSkill?.schedule || null);
  const [orchestration, setOrchestration] = useState(initialSkill?.orchestration || "");
  const [triggers, setTriggers] = useState(initialSkill?.triggers?.join(", ") || "");
  const [generating, setGenerating] = useState(false);
  const [editOrchestration, setEditOrchestration] = useState(false);
  const constraintRef = useRef(null);

  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${V.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };

  const handleStep1 = () => {
    if (!name.trim() || !goal.trim()) return;
    if (!skillId) {
      const created = onCreateSkill({ name: name.trim(), goal: goal.trim() });
      setSkillId(created.id);
    } else {
      onUpdateSkill(skillId, { name: name.trim(), goal: goal.trim() });
    }
    setStep(2);
  };

  const handleStep2 = () => {
    if (skillId) onUpdateSkill(skillId, { actionPermissions, step: 3 });
    setStep(3);
  };

  const toggleAction = (permId) => {
    setActionPermissions(prev => prev.includes(permId) ? prev.filter(t => t !== permId) : [...prev, permId]);
  };

  const handleAddConstraint = () => {
    if (!currentConstraint.trim()) return;
    setConstraints(prev => [...prev, currentConstraint.trim()]);
    setCurrentConstraint("");
    setTimeout(() => constraintRef.current?.focus(), 50);
  };

  const toggleGate = (gateId) => {
    setApprovalGates(prev => prev.includes(gateId) ? prev.filter(g => g !== gateId) : [...prev, gateId]);
  };

  const handleStep3 = () => {
    if (skillId) onUpdateSkill(skillId, { constraints, approvalGates, context, schedule, step: 4 });
    handleGenerate();
  };

  const handleGenerate = async () => {
    setStep(4);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, goal, actionPermissions, constraints, approvalGates, context,
        }),
      });
      const data = await res.json();
      if (data.orchestration) {
        setOrchestration(data.orchestration);
        setTriggers(data.triggers?.join(", ") || "");
      } else {
        useFallback();
      }
    } catch {
      useFallback();
    }
    setGenerating(false);

    function useFallback() {
      const actionNames = actionPermissions.map(apId => {
        const perm = ACTION_PERMISSIONS.find(p => p.id === apId);
        return perm ? perm.label : apId;
      });
      setOrchestration(
        `## オーケストレーション計画: ${name}\n\n` +
        `### ゴール\n${goal}\n\n` +
        `### 情報収集（制限なし）\n` +
        `全ての接続サービス（Gmail, Calendar, Drive, Outlook, Slack, Teams, SharePoint）および\nWeb検索・天気APIを自由に使って、ゴール達成に必要な情報を収集する。\n\n` +
        `### 実行手順\n` +
        `1. ユーザーのリクエストを分析し、ゴール達成に必要な情報を特定する\n` +
        `2. 全ての利用可能なサービスから関連情報を収集する\n` +
        `3. 収集した情報を分析・整理する\n` +
        (actionNames.length > 0
          ? `4. 許可されたアクション（${actionNames.join(", ")}）を実行する\n`
          : `4. 結果をユーザーに提示する（読み取り専用モード）\n`) +
        (approvalGates.length > 0 ? `5. 承認ゲートで確認を取る\n` : "") +
        `\n### 制約条件\n` +
        (constraints.length > 0 ? constraints.map(c => `- ${c}`).join("\n") : "- 特になし")
      );
      setTriggers(name);
    }
  };

  const handleFinalize = () => {
    if (skillId) onFinalizeSkill(skillId, orchestration, triggers.split(",").map(t => t.trim()).filter(Boolean));
    setStep(5);
  };

  return (
    <div>
      <button onClick={onClose} style={{ marginBottom: 16, padding: "6px 12px", background: "transparent", border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: V.t3 }}>← 戻る</button>
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map((s) => (<div key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= step ? V.accent : V.border }} />))}
      </div>

      {/* Step 1: Name + Goal */}
      {step === 1 && (
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>① ゴールを定義する</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>AIに「何を達成してほしいか」を具体的に記述してください。</p>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: V.t2 }}>スキル名 *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 朝のブリーフィング" style={{ ...inputStyle, marginBottom: 16 }} autoFocus />
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: V.t2 }}>ゴール（AIが達成すべき目標） *</label>
          <textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="例: 今日の予定・天気・ニュース・未読メールをまとめて報告する" rows={4} style={{ ...inputStyle, marginBottom: 20, resize: "vertical" }} />
          <button onClick={handleStep1} disabled={!name.trim() || !goal.trim()} style={{ padding: "12px 24px", backgroundColor: name.trim() && goal.trim() ? V.accent : V.border, color: V.white, border: "none", borderRadius: 8, cursor: name.trim() && goal.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}>次へ →</button>
        </div>
      )}

      {/* Step 2: Action Permissions */}
      {step === 2 && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>② アクション権限を設定</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: V.t3 }}>AIが<strong>書き込み・送信・作成・削除</strong>できる範囲を設定します。</p>
          <div style={{ padding: "10px 14px", backgroundColor: V.accent + "08", borderRadius: 8, fontSize: 12, color: V.accent, marginBottom: 20, lineHeight: 1.6 }}>
            💡 情報収集（検索・閲覧）は全サービスで常に許可されています。ここで設定するのは「変更を加える」アクションのみです。何も選ばなければ読み取り専用になります。
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 24 }}>
            {ACTION_PERMISSIONS.map(perm => {
              const selected = actionPermissions.includes(perm.id);
              return (
                <button key={perm.id} onClick={() => toggleAction(perm.id)} style={{
                  padding: "14px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  backgroundColor: selected ? V.green + "10" : V.card,
                  border: `2px solid ${selected ? V.green : V.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{perm.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selected ? V.green : V.t2 }}>{perm.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: V.t4 }}>{perm.description}</div>
                </button>
              );
            })}
          </div>
          <div style={{ padding: "10px 14px", backgroundColor: V.main, borderRadius: 8, fontSize: 13, color: V.t2, marginBottom: 20 }}>
            {actionPermissions.length === 0
              ? "🔒 読み取り専用モード — 情報収集のみ（最も安全）"
              : `✅ ${actionPermissions.length}件のアクションを許可`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ padding: "12px 20px", backgroundColor: "transparent", color: V.t3, border: `1px solid ${V.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 戻る</button>
            <button onClick={handleStep2} style={{ padding: "12px 24px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>次へ →</button>
          </div>
        </div>
      )}

      {/* Step 3: Constraints + Approval Gates */}
      {step === 3 && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>③ 制約条件と承認ゲート</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>AIがやってはいけないことと、人間の確認が必要なポイントを設定します。</p>

          {/* Constraints */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: V.t1 }}>制約条件（AIがやってはいけないこと）</label>
            {constraints.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {constraints.map((c, idx) => (
                  <div key={idx} style={{ backgroundColor: V.main, border: `1px solid ${V.border}`, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: V.t2 }}>🚫 {c}</span>
                    <button onClick={() => setConstraints(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: V.t4, fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input ref={constraintRef} value={currentConstraint} onChange={e => setCurrentConstraint(e.target.value)} placeholder="例: メールを自動送信しない" style={{ ...inputStyle, flex: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddConstraint(); } }} />
              <button onClick={handleAddConstraint} disabled={!currentConstraint.trim()} style={{ padding: "10px 16px", backgroundColor: currentConstraint.trim() ? V.accent : V.border, color: V.white, border: "none", borderRadius: 8, cursor: currentConstraint.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>追加</button>
            </div>
          </div>

          {/* Approval Gates */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: V.t1 }}>承認ゲート（人間の確認が必要なポイント）</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {APPROVAL_GATE_OPTIONS.map(gate => {
                const selected = approvalGates.includes(gate.id);
                return (
                  <button key={gate.id} onClick={() => toggleGate(gate.id)} style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    backgroundColor: selected ? V.orange + "12" : V.card,
                    border: `1.5px solid ${selected ? V.orange : V.border}`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? V.orange : V.t2, marginBottom: 2 }}>
                      {selected ? "⚠️ " : "○ "}{gate.label}
                    </div>
                    <div style={{ fontSize: 11, color: V.t4 }}>{gate.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: V.t1 }}>自動スケジュール（任意）</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {SCHEDULE_OPTIONS.map(opt => {
                const selected = schedule === opt.value;
                return (
                  <button key={opt.id} onClick={() => setSchedule(selected ? null : opt.value)} style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    backgroundColor: selected ? V.teal + "12" : V.card,
                    border: `1.5px solid ${selected ? V.teal : V.border}`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? V.teal : V.t2, marginBottom: 2 }}>
                      {selected ? "🕐 " : "○ "}{opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: V.t4 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
            {schedule && (
              <div style={{ marginTop: 8, padding: "8px 12px", backgroundColor: V.teal + "08", borderRadius: 6, fontSize: 12, color: V.teal }}>
                🕐 このスキルは自動スケジュールで実行されます（Vercel Cron）
              </div>
            )}
          </div>

          {/* Context */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600, color: V.t1 }}>補足情報（任意）</label>
            <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="例: 毎週月曜の朝に実行。レポートは日本語で作成。" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{ padding: "12px 20px", backgroundColor: "transparent", color: V.t3, border: `1px solid ${V.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 戻る</button>
            <button onClick={handleStep3} style={{ padding: "12px 24px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>AIに生成させる →</button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && generating && (
        <div style={{ maxWidth: 500, textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: V.t1 }}>オーケストレーション計画を生成中...</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: V.t3 }}>ゴールとアクション権限から最適な実行計画を組み立てています</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", maxWidth: 360, margin: "0 auto" }}>
            {["ゴールを分析中", "情報収集戦略を設計中", "アクション計画を構成中", "承認ゲートを組み込み中"].map((text, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: V.orange, animation: "pulse 1s infinite" }}>●</span>
                <span style={{ fontSize: 13, color: V.t3 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && !generating && (
        <div style={{ maxWidth: 680 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>④ オーケストレーション計画を確認</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>AIが生成した自律実行計画を確認してください。必要に応じて編集できます。</p>

          <div style={{ backgroundColor: V.card, border: `1px solid ${V.accent}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            {/* Summary */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: V.accent + "15", color: V.accent }}>🎯 {name}</span>
              <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, backgroundColor: V.teal + "15", color: V.teal }}>🔍 全サービス検索可</span>
              {actionPermissions.length === 0
                ? <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, backgroundColor: V.t4 + "20", color: V.t3 }}>🔒 読み取り専用</span>
                : actionPermissions.map(apId => {
                  const perm = ACTION_PERMISSIONS.find(p => p.id === apId);
                  return perm ? <span key={apId} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, backgroundColor: V.green + "15", color: V.green }}>{perm.icon} {perm.label}</span> : null;
                })
              }
              {approvalGates.length > 0 && <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, backgroundColor: V.orange + "15", color: V.orange }}>⚠️ 承認ゲート×{approvalGates.length}</span>}
            </div>

            {/* Triggers */}
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: V.t2 }}>トリガーキーワード</label>
            <input value={triggers} onChange={e => setTriggers(e.target.value)} placeholder="キーワードをカンマ区切りで" style={{ ...inputStyle, fontSize: 13, marginBottom: 14 }} />

            {/* Orchestration */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: V.t2 }}>オーケストレーション計画（AIへの実行指示）</label>
              <button onClick={() => setEditOrchestration(!editOrchestration)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: V.accent, textDecoration: "underline" }}>{editOrchestration ? "プレビュー" : "編集する"}</button>
            </div>
            {editOrchestration ? (
              <textarea value={orchestration} onChange={e => setOrchestration(e.target.value)} rows={12} style={{ ...inputStyle, fontSize: 13, resize: "vertical", lineHeight: 1.6 }} />
            ) : (
              <div style={{ backgroundColor: V.main, padding: 14, borderRadius: 6, fontSize: 13, color: V.t2, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto" }}>{orchestration}</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(3)} style={{ padding: "12px 20px", backgroundColor: "transparent", color: V.t3, border: `1px solid ${V.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 戻る</button>
            <button onClick={handleFinalize} style={{ padding: "12px 24px", backgroundColor: V.green, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✓ スキルを有効化</button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <div style={{ maxWidth: 480, textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: V.green }}>スキル有効化完了！</h2>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: V.t1, fontWeight: 600 }}>「{name}」</p>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: V.t3 }}>チャットでゴールに関連するリクエストをすると、AIが自律的にこのスキルを実行します。</p>
          <div style={{ backgroundColor: V.main, borderRadius: 8, padding: 16, marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 13, color: V.t2, lineHeight: 1.8 }}>
              <div>✓ 全サービスから自由に情報収集</div>
              <div>✓ Plan→Execute→Observe ループで自律実行</div>
              {actionPermissions.length > 0
                ? <div>✓ {actionPermissions.length}件のアクション（書き込み）を許可</div>
                : <div>✓ 読み取り専用モード（最も安全）</div>
              }
              {constraints.length > 0 && <div>✓ {constraints.length}件の制約条件を遵守</div>}
              {approvalGates.length > 0 && <div>✓ {approvalGates.length}箇所で人間の承認を要求</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: "12px 24px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>完了</button>
        </div>
      )}

      <style>{"@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }"}</style>
    </div>
  );
}

function SkillsTab({ skills, onToggleSkill, onDeleteSkill, onExecuteSkill, setEditingSkill }) {
  const activeSkills = skills.filter((s) => s.status === "active");
  const pausedSkills = skills.filter((s) => s.status === "paused");
  const learningSkills = skills.filter((s) => s.status === "learning");

  if (skills.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: V.t3 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>スキルがまだありません</div>
        <div style={{ fontSize: 13 }}>「新しく覚えさせる」タブからスキルを作成してください</div>
      </div>
    );
  }

  return (
    <div>
      {activeSkills.length > 0 && <SkillSection title="アクティブ" badge={V.green} skills={activeSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} onExecuteSkill={onExecuteSkill} setEditingSkill={setEditingSkill} />}
      {pausedSkills.length > 0 && <SkillSection title="一時停止中" badge={V.t4} skills={pausedSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={setEditingSkill} />}
      {learningSkills.length > 0 && <SkillSection title="作成中" badge={V.orange} skills={learningSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={setEditingSkill} />}
    </div>
  );
}

function SkillSection({ title, badge, skills, onToggleSkill, onDeleteSkill, onExecuteSkill, setEditingSkill }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: V.t1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: badge, display: "inline-block" }} />
        {title}（{skills.length}件）
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {skills.map((skill) => <SkillCard key={skill.id} skill={skill} onToggle={() => onToggleSkill(skill.id)} onDelete={() => onDeleteSkill(skill.id)} onExecute={onExecuteSkill ? () => onExecuteSkill(skill) : null} onEdit={() => setEditingSkill(skill)} />)}
      </div>
    </div>
  );
}

function SkillCard({ skill, onToggle, onDelete, onEdit, onExecute }) {
  const isActive = skill.status === "active";
  const created = skill.createdAt ? new Date(skill.createdAt).toLocaleDateString("ja-JP") : "—";
  const lastUsed = skill.lastUsed ? timeAgo(skill.lastUsed) : "未実行";
  const permCount = (skill.actionPermissions || []).length;

  return (
    <div style={{ backgroundColor: V.card, border: `1px solid ${isActive ? V.green + "40" : V.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, flex: 1 }}>{skill.name}</div>
        {skill.status !== "learning" && (
          <button onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", backgroundColor: isActive ? V.green : V.border, position: "relative" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: V.white, position: "absolute", top: 2, left: isActive ? 20 : 2, transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        )}
      </div>
      {skill.goal && <div style={{ fontSize: 12, color: V.t3, marginBottom: 8, lineHeight: 1.4 }}>{skill.goal.substring(0, 80)}{skill.goal.length > 80 ? "..." : ""}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.teal + "15", color: V.teal }}>🔍 全サービス検索</span>
        {permCount > 0
          ? <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.green + "15", color: V.green }}>✅ アクション×{permCount}</span>
          : <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.t4 + "15", color: V.t3 }}>🔒 読み取り専用</span>
        }
        {(skill.approvalGates || []).length > 0 && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.orange + "15", color: V.orange }}>⚠️ 承認×{skill.approvalGates.length}</span>}
        {(skill.constraints || []).length > 0 && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.red + "15", color: V.red }}>🚫 制約×{skill.constraints.length}</span>}
        {skill.schedule && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: V.teal + "15", color: V.teal }}>🕐 自動実行</span>}
        {(skill.feedbackCount || 0) > 0 && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, backgroundColor: (skill.feedbackScore || 0) >= 0 ? V.green + "15" : V.red + "15", color: (skill.feedbackScore || 0) >= 0 ? V.green : V.red }}>{(skill.feedbackScore || 0) >= 0 ? "👍" : "👎"} {skill.feedbackCount}</span>}
      </div>
      <div style={{ fontSize: 11, color: V.t4, display: "flex", justifyContent: "space-between", borderTop: `1px solid ${V.border}`, paddingTop: 10, marginBottom: 10 }}>
        <span>実行: {skill.usageCount || 0}回</span><span>最終: {lastUsed}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {isActive && onExecute && (
          <button onClick={onExecute} style={{ flex: 2, padding: "8px 0", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>▶ 実行</button>
        )}
        <button onClick={onEdit} style={{ flex: 1, padding: "6px 0", backgroundColor: "transparent", border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11, color: V.t3 }}>編集</button>
        <button onClick={onDelete} style={{ padding: "6px 12px", backgroundColor: "transparent", border: `1px solid ${V.red}30`, borderRadius: 6, cursor: "pointer", fontSize: 11, color: V.red }}>削除</button>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return mins + "分前";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "時間前";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "日前";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}
