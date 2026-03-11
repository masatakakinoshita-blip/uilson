import { useState, useRef } from "react";

const V = {
  bg: "#F4F1EE", sb: "#FFFFFF", main: "#FAF8F6", card: "#FFFFFF",
  border: "#E6E0DA", t1: "#3D3530", t2: "#5C534D", t3: "#8E857E",
  t4: "#B5ADA6", white: "#FFFFFF", accent: "#5B7DB8", teal: "#3D6098",
  green: "#5A9E6F", red: "#C87066", orange: "#C49A3C", lime: "#A8C868",
};

export default function LearnView({ skills, onCreateSkill, onUpdateSkill, onDeleteSkill, onAddExample, onFinalizeSkill, onToggleSkill }) {
  const [tab, setTab] = useState("teach");
  const [showWizard, setShowWizard] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const activeSkills = (skills || []).filter((s) => s.status === "active");
  const learningSkills = (skills || []).filter((s) => s.status === "learning");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${V.border}`, background: V.sb }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: V.t1 }}>📖 おぼえる</div>
        <div style={{ fontSize: 14, color: V.t3, marginTop: 2 }}>AIにスキルを教えて、業務を自動化します（{activeSkills.length}件アクティブ）</div>
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
        {tab === "teach" && <TeachTab skills={skills} learningSkills={learningSkills} showWizard={showWizard} setShowWizard={setShowWizard} editingSkill={editingSkill} setEditingSkill={setEditingSkill} onCreateSkill={onCreateSkill} onUpdateSkill={onUpdateSkill} onAddExample={onAddExample} onFinalizeSkill={onFinalizeSkill} onDeleteSkill={onDeleteSkill} />}
        {tab === "myskills" && <SkillsTab skills={skills || []} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={(s) => { setEditingSkill(s); setTab("teach"); setShowWizard(true); }} />}
      </div>
    </div>
  );
}

function TeachTab({ skills, learningSkills, showWizard, setShowWizard, editingSkill, setEditingSkill, onCreateSkill, onUpdateSkill, onAddExample, onFinalizeSkill, onDeleteSkill }) {
  if (showWizard || editingSkill) {
    return <SkillWizard skill={editingSkill} onClose={() => { setShowWizard(false); setEditingSkill(null); }} onCreateSkill={onCreateSkill} onUpdateSkill={onUpdateSkill} onAddExample={onAddExample} onFinalizeSkill={onFinalizeSkill} />;
  }
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 700, color: V.t1 }}>📖 AIに新しいスキルを教える</h1>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, color: V.t3, lineHeight: 1.6 }}>業務のやり方をAIに教えると、次からはAIが自動で対応してくれます。</p>
        <button onClick={() => setShowWizard(true)} style={{ padding: "12px 20px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>＋ 新しいスキルを覚えさせる</button>
      </div>
      {learningSkills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: V.orange }}>学習中のスキル</h2>
          {learningSkills.map((s) => (
            <div key={s.id} style={{ backgroundColor: V.card, border: `1px solid ${V.orange}40`, borderLeft: `4px solid ${V.orange}`, borderRadius: 8, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: V.t3 }}>{s.description} · 例: {s.examples?.length || 0}件 · ステップ {s.step}/5</div>
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
        <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: V.t1 }}>使い方</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[{ step: "①", title: "名前をつける", desc: "覚えさせたい業務の名前を入力" }, { step: "②", title: "例を教える", desc: "3つ以上の具体例やルールを入力" }, { step: "③", title: "AIが学習", desc: "パターンを抽出しスキル化" }, { step: "④", title: "確認・完成", desc: "内容を確認してアクティブに" }].map((item, idx) => (
            <div key={idx} style={{ backgroundColor: V.card, border: `1px solid ${V.border}`, borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: V.t3 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkillWizard({ skill: initialSkill, onClose, onCreateSkill, onUpdateSkill, onAddExample, onFinalizeSkill }) {
  const [step, setStep] = useState(initialSkill ? initialSkill.step : 1);
  const [skillId, setSkillId] = useState(initialSkill?.id || null);
  const [name, setName] = useState(initialSkill?.name || "");
  const [description, setDescription] = useState(initialSkill?.description || "");
  const [examples, setExamples] = useState(initialSkill?.examples || []);
  const [currentExample, setCurrentExample] = useState("");
  const [generatedInstructions, setGeneratedInstructions] = useState(initialSkill?.instructions || "");
  const [triggers, setTriggers] = useState(initialSkill?.triggers?.join(", ") || "");
  const [generating, setGenerating] = useState(false);
  const [editInstructions, setEditInstructions] = useState(false);
  const exampleInputRef = useRef(null);

  const handleStep1 = () => {
    if (!name.trim()) return;
    if (!skillId) { const created = onCreateSkill(name.trim(), description.trim()); setSkillId(created.id); }
    else { onUpdateSkill(skillId, { name: name.trim(), description: description.trim() }); }
    setStep(2);
  };

  const handleAddExample = () => {
    if (!currentExample.trim()) return;
    const newExamples = [...examples, currentExample.trim()];
    setExamples(newExamples);
    setCurrentExample("");
    if (skillId) onAddExample(skillId, currentExample.trim());
    setTimeout(() => exampleInputRef.current?.focus(), 50);
  };

  const handleRemoveExample = (idx) => {
    const newExamples = examples.filter((_, i) => i !== idx);
    setExamples(newExamples);
    if (skillId) onUpdateSkill(skillId, { examples: newExamples, step: newExamples.length >= 3 ? 3 : 2 });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-skill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, examples }) });
      const data = await res.json();
      if (data.instructions) {
        setGeneratedInstructions(data.instructions);
        setTriggers(data.triggers?.join(", ") || "");
        setStep(4);
        if (skillId) onUpdateSkill(skillId, { step: 4 });
      } else { useFallback(); }
    } catch (err) { useFallback(); }
    setGenerating(false);

    function useFallback() {
      const fb = "このスキル「" + name + "」のルール:\n" + examples.map((e, i) => (i + 1) + ". " + e).join("\n") + "\nこれらのパターンに基づいて対応してください。";
      setGeneratedInstructions(fb); setTriggers(name); setStep(4);
    }
  };

  const handleFinalize = () => {
    if (skillId) onFinalizeSkill(skillId, generatedInstructions, triggers.split(",").map((t) => t.trim()).filter(Boolean));
    setStep(5);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${V.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };

  return (
    <div>
      <button onClick={onClose} style={{ marginBottom: 16, padding: "6px 12px", background: "transparent", border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: V.t3 }}>← 戻る</button>
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map((s) => (<div key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= step ? V.accent : V.border }} />))}
      </div>

      {step === 1 && (
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>① スキルの名前と概要</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>AIに覚えさせたい業務の名前と説明を入力してください。</p>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: V.t2 }}>スキル名 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 見積書の作成ルール" style={{ ...inputStyle, marginBottom: 16 }} autoFocus />
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: V.t2 }}>説明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: お客様の問い合わせに応じて見積書を作成する" rows={3} style={{ ...inputStyle, marginBottom: 20, resize: "vertical" }} />
          <button onClick={handleStep1} disabled={!name.trim()} style={{ padding: "12px 24px", backgroundColor: name.trim() ? V.accent : V.border, color: V.white, border: "none", borderRadius: 8, cursor: name.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}>次へ →</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>② 具体例を教える</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>「{name}」の具体的なルールや例を入力してください。3件以上でAIが正確に学習できます。</p>
          {examples.length > 0 && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {examples.map((ex, idx) => (
                <div key={idx} style={{ backgroundColor: V.main, border: `1px solid ${V.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 13, color: V.t2, lineHeight: 1.5, flex: 1 }}><span style={{ color: V.accent, fontWeight: 600 }}>例{idx + 1}: </span>{ex}</div>
                  <button onClick={() => handleRemoveExample(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: V.t4, fontSize: 16, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <textarea ref={exampleInputRef} value={currentExample} onChange={(e) => setCurrentExample(e.target.value)} placeholder="例: 金額が100万円以上の場合は部長承認が必要" rows={2} style={{ ...inputStyle, flex: 1, resize: "vertical" }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddExample(); } }} />
            <button onClick={handleAddExample} disabled={!currentExample.trim()} style={{ padding: "10px 16px", backgroundColor: currentExample.trim() ? V.accent : V.border, color: V.white, border: "none", borderRadius: 8, cursor: currentExample.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, alignSelf: "flex-end" }}>追加</button>
          </div>
          <div style={{ padding: "10px 14px", backgroundColor: examples.length >= 3 ? V.green + "10" : V.orange + "10", borderRadius: 8, fontSize: 13, color: examples.length >= 3 ? V.green : V.orange, marginBottom: 20 }}>
            {examples.length >= 3 ? "✓ " + examples.length + "件の例が登録済み — AIに学習させる準備ができました" : "あと" + (3 - examples.length) + "件の例を追加してください（現在 " + examples.length + "/3）"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ padding: "12px 20px", backgroundColor: "transparent", color: V.t3, border: `1px solid ${V.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 戻る</button>
            <button onClick={() => { setStep(3); handleGenerate(); }} disabled={examples.length < 1} style={{ padding: "12px 24px", backgroundColor: examples.length >= 1 ? V.accent : V.border, color: V.white, border: "none", borderRadius: 8, cursor: examples.length >= 1 ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}>AIに学習させる →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ maxWidth: 500, textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: V.t1 }}>AIが学習中...</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: V.t3 }}>{examples.length}件の例からパターンを抽出しています</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", maxWidth: 360, margin: "0 auto" }}>
            {[{ text: "例を分析中", done: true }, { text: "パターンを抽出中", done: generating }, { text: "スキル定義を生成中", done: false }].map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {item.done === true ? <span style={{ color: V.green, fontWeight: 700 }}>✓</span> : generating ? <span style={{ color: V.orange, animation: "pulse 1s infinite" }}>●</span> : <span style={{ color: V.t4 }}>○</span>}
                <span style={{ fontSize: 13, color: item.done ? V.t1 : V.t3 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: V.t1 }}>④ 確認・調整</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: V.t3 }}>AIが生成したスキル定義を確認してください。必要に応じて編集できます。</p>
          <div style={{ backgroundColor: V.card, border: `1px solid ${V.accent}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: V.t1, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 12, color: V.t3, marginBottom: 12 }}>{description}</div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: V.t2 }}>トリガーキーワード</label>
            <input value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder="キーワードをカンマ区切りで" style={{ ...inputStyle, fontSize: 13, marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: V.t2 }}>スキル定義（AIへの指示）</label>
              <button onClick={() => setEditInstructions(!editInstructions)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: V.accent, textDecoration: "underline" }}>{editInstructions ? "プレビュー" : "編集する"}</button>
            </div>
            {editInstructions ? (
              <textarea value={generatedInstructions} onChange={(e) => setGeneratedInstructions(e.target.value)} rows={8} style={{ ...inputStyle, fontSize: 13, resize: "vertical", lineHeight: 1.6 }} />
            ) : (
              <div style={{ backgroundColor: V.main, padding: 14, borderRadius: 6, fontSize: 13, color: V.t2, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 240, overflowY: "auto" }}>{generatedInstructions}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{ padding: "12px 20px", backgroundColor: "transparent", color: V.t3, border: `1px solid ${V.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 例を追加</button>
            <button onClick={handleFinalize} style={{ padding: "12px 24px", backgroundColor: V.green, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✓ スキルを有効化</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ maxWidth: 480, textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: V.green }}>スキル完成！</h2>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: V.t1, fontWeight: 600 }}>「{name}」</p>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: V.t3 }}>チャットで関連する質問をすると、このスキルが自動で適用されます。</p>
          <div style={{ backgroundColor: V.main, borderRadius: 8, padding: 16, marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 13, color: V.t2, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>✓ スキルがアクティブになりました</div>
              <div style={{ marginBottom: 8 }}>✓ チャットで自動適用されます</div>
              <div>✓ 「スキル一覧」タブで管理できます</div>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: "12px 24px", backgroundColor: V.accent, color: V.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>完了</button>
        </div>
      )}

      <style>{"@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }"}</style>
    </div>
  );
}

function SkillsTab({ skills, onToggleSkill, onDeleteSkill, setEditingSkill }) {
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
      {activeSkills.length > 0 && <SkillSection title="アクティブ" badge={V.green} skills={activeSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={setEditingSkill} />}
      {pausedSkills.length > 0 && <SkillSection title="一時停止中" badge={V.t4} skills={pausedSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={setEditingSkill} />}
      {learningSkills.length > 0 && <SkillSection title="学習中" badge={V.orange} skills={learningSkills} onToggleSkill={onToggleSkill} onDeleteSkill={onDeleteSkill} setEditingSkill={setEditingSkill} />}
    </div>
  );
}

function SkillSection({ title, badge, skills, onToggleSkill, onDeleteSkill, setEditingSkill }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: V.t1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: badge, display: "inline-block" }} />
        {title}（{skills.length}件）
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {skills.map((skill) => <SkillCard key={skill.id} skill={skill} onToggle={() => onToggleSkill(skill.id)} onDelete={() => onDeleteSkill(skill.id)} onEdit={() => setEditingSkill(skill)} />)}
      </div>
    </div>
  );
}

function SkillCard({ skill, onToggle, onDelete, onEdit }) {
  const isActive = skill.status === "active";
  const created = skill.createdAt ? new Date(skill.createdAt).toLocaleDateString("ja-JP") : "—";
  return (
    <div style={{ backgroundColor: V.card, border: `1px solid ${isActive ? V.green + "40" : V.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: V.t1, flex: 1 }}>{skill.name}</div>
        {skill.status !== "learning" && (
          <button onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", backgroundColor: isActive ? V.green : V.border, position: "relative" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: V.white, position: "absolute", top: 2, left: isActive ? 20 : 2, transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        )}
      </div>
      {skill.description && <div style={{ fontSize: 12, color: V.t3, marginBottom: 10, lineHeight: 1.4 }}>{skill.description}</div>}
      <div style={{ fontSize: 11, color: V.t4, display: "flex", justifyContent: "space-between", borderTop: `1px solid ${V.border}`, paddingTop: 10, marginBottom: 10 }}>
        <span>作成: {created}</span><span>利用: {skill.usageCount || 0}回</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} style={{ flex: 1, padding: "6px 0", backgroundColor: "transparent", border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11, color: V.t3 }}>編集</button>
        <button onClick={onDelete} style={{ padding: "6px 12px", backgroundColor: "transparent", border: `1px solid ${V.red}30`, borderRadius: 6, cursor: "pointer", fontSize: 11, color: V.red }}>削除</button>
      </div>
    </div>
  );
}
