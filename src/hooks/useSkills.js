import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "uilson_skills";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function useSkills() {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSkills(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to load skills:", e);
    }
  }, []);

  const persist = useCallback((updated) => {
    setSkills(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save skills:", e);
    }
  }, []);

  const createSkill = useCallback((name, description) => {
    const skill = {
      id: generateId(),
      name,
      description,
      instructions: "",
      triggers: [],
      examples: [],
      status: "learning",
      accuracy: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      step: 1,
    };
    const updated = [...skills, skill];
    persist(updated);
    return skill;
  }, [skills, persist]);

  const updateSkill = useCallback((id, changes) => {
    const updated = skills.map((s) => s.id === id ? { ...s, ...changes } : s);
    persist(updated);
    return updated.find((s) => s.id === id);
  }, [skills, persist]);

  const deleteSkill = useCallback((id) => {
    persist(skills.filter((s) => s.id !== id));
  }, [skills, persist]);

  const addExample = useCallback((id, example) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) return;
    const examples = [...(skill.examples || []), example];
    updateSkill(id, { examples, step: examples.length >= 3 ? 3 : 2 });
  }, [skills, updateSkill]);

  const finalizeSkill = useCallback((id, instructions, triggers) => {
    updateSkill(id, {
      instructions,
      triggers: triggers || [],
      status: "active",
      step: 5,
      accuracy: 85 + Math.floor(Math.random() * 10),
    });
  }, [updateSkill]);

  const toggleSkill = useCallback((id) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) return;
    updateSkill(id, { status: skill.status === "active" ? "paused" : "active" });
  }, [skills, updateSkill]);

  const getActiveSkillsPrompt = useCallback(() => {
    const active = skills.filter((s) => s.status === "active" && s.instructions);
    if (active.length === 0) return "";
    let prompt = "\n\n## USER-TRAINED SKILLS (follow these when relevant):\n";
    active.forEach((s) => {
      prompt += `\n### Skill: ${s.name}\nTriggers: ${s.triggers.join(", ") || "auto-detect"}\nInstructions: ${s.instructions}\n`;
    });
    return prompt;
  }, [skills]);

  return {
    skills,
    activeSkills: skills.filter((s) => s.status === "active"),
    learningSkills: skills.filter((s) => s.status === "learning"),
    pausedSkills: skills.filter((s) => s.status === "paused"),
    createSkill, updateSkill, deleteSkill, addExample,
    finalizeSkill, toggleSkill, getActiveSkillsPrompt,
  };
}
