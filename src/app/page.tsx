"use client";

import { useEffect, useMemo, useState } from "react";
import type { LearningPlan, PlanRequest } from "@/lib/learning-engine";
import { createLearningPlan, deriveTopicFromPrompt } from "@/lib/learning-engine";
import { DEFAULT_MODEL_ID, getModelById, MODELS } from "@/lib/models";
import type { GapAnalysis } from "@/lib/analysis";

type Theme = "dark" | "light";
type Level = PlanRequest["level"];
type StoredPlanSummary = {
  id: string;
  topic: string;
  outcome: string;
  level: Level;
  hours_per_week: number;
  model_id: string;
  mode: "live-model" | "local-planner";
  plan: LearningPlan;
  created_at: string;
};
type TrackerEvent = {
  item_id: string;
  item_type: string;
  status: string;
  created_at: string;
};

const starterPlan = createLearningPlan({
  topic: "Your learning goal",
  outcome: "Enter a topic or goal in the AI study-plan chatbox to generate a comprehensive plan.",
  level: "Intermediate",
  hoursPerWeek: 10,
  modelId: DEFAULT_MODEL_ID,
  constraints: "Create a comprehensive, daily-use study plan with lessons, projects, quizzes, checklist, and gap analysis."
});

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [chatPrompt, setChatPrompt] = useState("");
  const [constraints, setConstraints] = useState(
    "Create a comprehensive, daily-use study plan with lessons, projects, quizzes, checklist, and gap analysis."
  );
  const [level, setLevel] = useState<Level>("Intermediate");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [plan, setPlan] = useState<LearningPlan>(starterPlan);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [generationMode, setGenerationMode] = useState<"live-model" | "local-planner">("local-planner");
  const [storedPlanId, setStoredPlanId] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<"saved" | "not-configured" | "error">("not-configured");
  const [savedPlans, setSavedPlans] = useState<StoredPlanSummary[]>([]);
  const [savedPlansStatus, setSavedPlansStatus] = useState<"idle" | "loading" | "connected" | "not-configured" | "error">("idle");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingInquiry, setEditingInquiry] = useState("");
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(() => getModelById(modelId), [modelId]);
  const completedCount = plan.checklist.filter((item) => checkedItems[item.id]).length;
  const completionPercent = Math.round((completedCount / Math.max(plan.checklist.length, 1)) * 100);

  useEffect(() => {
    if (storedPlanId) {
      return;
    }

    const stored = window.localStorage.getItem(`learnanything:${plan.topic}:checklist`);
    setCheckedItems(stored ? (JSON.parse(stored) as Record<string, boolean>) : {});
  }, [plan.topic, storedPlanId]);

  useEffect(() => {
    if (storedPlanId) {
      return;
    }

    window.localStorage.setItem(`learnanything:${plan.topic}:checklist`, JSON.stringify(checkedItems));
  }, [checkedItems, plan.topic, storedPlanId]);

  useEffect(() => {
    void loadSavedPlans();
  }, []);

  function applyTrackerEvents(events: TrackerEvent[]) {
    const next: Record<string, boolean> = {};
    const seen = new Set<string>();

    for (const event of events) {
      if (event.item_type !== "checklist" || seen.has(event.item_id)) {
        continue;
      }

      seen.add(event.item_id);
      next[event.item_id] = event.status === "completed";
    }

    setCheckedItems(next);
  }

  async function loadSavedPlans() {
    setSavedPlansStatus("loading");

    try {
      const response = await fetch("/api/plans");
      const payload = (await response.json()) as {
        plans?: StoredPlanSummary[];
        database?: "connected" | "not-configured" | "error";
      };

      setSavedPlans(payload.plans ?? []);
      setSavedPlansStatus(payload.database ?? "error");
    } catch {
      setSavedPlansStatus("error");
    }
  }

  async function openStoredPlan(planId: string) {
    setError("");

    try {
      const [planResponse, trackerResponse] = await Promise.all([
        fetch(`/api/plans/${planId}`),
        fetch(`/api/plans/${planId}/tracker`)
      ]);
      const planPayload = (await planResponse.json()) as { plan?: StoredPlanSummary; error?: string };
      const trackerPayload = (await trackerResponse.json()) as { events?: TrackerEvent[] };

      if (!planResponse.ok || !planPayload.plan) {
        throw new Error(planPayload.error ?? "Could not load saved plan.");
      }

      const stored = planPayload.plan;
      setPlan(stored.plan);
      setChatPrompt(stored.outcome);
      setLevel(stored.level);
      setHoursPerWeek(stored.hours_per_week);
      setModelId(stored.model_id);
      setGenerationMode(stored.mode);
      setStoredPlanId(stored.id);
      setDatabaseStatus("saved");
      setGapAnalysis(null);
      applyTrackerEvents(trackerPayload.events ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load saved plan.");
      setDatabaseStatus("error");
    }
  }

  function startEditingStoredPlan(stored: StoredPlanSummary) {
    setEditingPlanId(stored.id);
    setEditingInquiry(stored.outcome);
  }

  async function saveStoredPlanInquiry(stored: StoredPlanSummary) {
    const prompt = editingInquiry.trim();

    if (!prompt) {
      setError("Saved inquiry cannot be empty.");
      return;
    }

    try {
      const response = await fetch(`/api/plans/${stored.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: deriveTopicFromPrompt(prompt),
          outcome: prompt,
          level: stored.level,
          hoursPerWeek: stored.hours_per_week,
          modelId: stored.model_id
        })
      });
      const payload = (await response.json()) as { plan?: StoredPlanSummary; error?: string };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "Could not update saved inquiry.");
      }

      setSavedPlans((current) => current.map((item) => (item.id === stored.id ? payload.plan as StoredPlanSummary : item)));
      setEditingPlanId(null);
      setEditingInquiry("");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update saved inquiry.");
      setDatabaseStatus("error");
    }
  }

  async function deleteStoredPlan(planId: string) {
    try {
      const response = await fetch(`/api/plans/${planId}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Could not delete saved plan.");
      }

      setSavedPlans((current) => current.filter((item) => item.id !== planId));
      if (storedPlanId === planId) {
        setStoredPlanId(null);
        setCheckedItems({});
        setGapAnalysis(null);
        setDatabaseStatus("not-configured");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete saved plan.");
      setDatabaseStatus("error");
    }
  }

  async function reproduceStoredPlan(stored: StoredPlanSummary) {
    setChatPrompt(stored.outcome);
    setLevel(stored.level);
    setHoursPerWeek(stored.hours_per_week);
    setModelId(stored.model_id);
    await generatePlanFromPrompt(stored.outcome, stored.level, stored.hours_per_week, stored.model_id);
  }

  async function generatePlan() {
    const prompt = chatPrompt.trim();
    await generatePlanFromPrompt(prompt, level, hoursPerWeek, modelId);
  }

  async function generatePlanFromPrompt(prompt: string, nextLevel: Level, nextHoursPerWeek: number, nextModelId: string) {
    const inferredTopic = deriveTopicFromPrompt(prompt);

    if (!prompt) {
      setError("Enter what you want to learn in the AI study-plan chatbox.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: inferredTopic,
          outcome: prompt,
          constraints,
          level: nextLevel,
          hoursPerWeek: nextHoursPerWeek,
          modelId: nextModelId
        })
      });

      const payload = (await response.json()) as {
        plan?: LearningPlan;
        error?: string;
        mode?: "live-model" | "local-planner";
        storedPlanId?: string | null;
        database?: "saved" | "not-configured" | "error";
      };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "Could not generate plan.");
      }

      setPlan(payload.plan);
      setGenerationMode(payload.mode ?? "local-planner");
      setStoredPlanId(payload.storedPlanId ?? null);
      setDatabaseStatus(payload.database ?? "not-configured");
      setGapAnalysis(null);
      setCheckedItems({});
      void loadSavedPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function toggleChecklistItem(itemId: string, checked: boolean) {
    setCheckedItems((current) => ({ ...current, [itemId]: checked }));

    if (!storedPlanId) {
      return;
    }

    try {
      await fetch(`/api/plans/${storedPlanId}/tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          itemType: "checklist",
          status: checked ? "completed" : "open"
        })
      });
    } catch {
      setDatabaseStatus("error");
    }
  }

  async function refreshGapAnalysis() {
    if (!storedPlanId) {
      setGapAnalysis({
        completionPercent,
        completedCount,
        totalChecklistItems: plan.checklist.length,
        weakCategories: plan.checklist.filter((item) => !checkedItems[item.id]).map((item) => item.category).slice(0, 4),
        nextActions: plan.actionItems.slice(0, 4).map((item) => item.title),
        riskLevel: completionPercent >= 70 ? "Low" : completionPercent >= 35 ? "Medium" : "High",
        summary: "Local analysis only. Save the plan to Neon to analyze persisted tracker events."
      });
      return;
    }

    try {
      const response = await fetch(`/api/plans/${storedPlanId}/analysis`);
      const payload = (await response.json()) as { analysis?: GapAnalysis };
      if (payload.analysis) {
        setGapAnalysis(payload.analysis);
      }
    } catch {
      setDatabaseStatus("error");
    }
  }

  return (
    <main className={`shell ${theme}`}>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#console" aria-label="LearnAnything AI home">
          <span className="brand-mark">LA</span>
          <span>LearnAnything AI</span>
        </a>
        <div className="nav-actions">
          <a href="#plan-output">Plan</a>
          <a href="#console">Chatbox</a>
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <section className="tool-intro" aria-labelledby="tool-title">
        <div>
          <p className="eyebrow">AI study-plan creator</p>
          <h1 id="tool-title">Create a study plan you can actually follow.</h1>
          <p>
            Enter any learning goal. The planner agent turns it into a readable plan with daily actions, projects, checkpoints, saved progress, and gap analysis.
          </p>
        </div>
        <div className="visual-panel" aria-hidden="true">
          <div className="visual-orbit">
            <span>Plan</span>
            <span>Study</span>
            <span>Track</span>
          </div>
          <div className="visual-bars">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      <section className="app-workbench" aria-label="Study plan creator workspace">
        <div className="control-column" id="console">
          <div className="console-main">
            <p className="eyebrow">AI study-plan creator</p>
            <h2>What do you want to learn?</h2>
          <label>
            Study-plan request
            <textarea
              placeholder="Example: Generate a comprehensive 90-day study plan to master enterprise data architecture, including daily routine, projects, quizzes, checklist, progress tracker, and gap analysis."
              value={chatPrompt}
              onChange={(event) => setChatPrompt(event.target.value)}
              rows={8}
            />
          </label>
          <label>
            Planner instructions
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} rows={4} />
          </label>
          <div className="console-controls">
            <label>
              Model
              <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starting level
              <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              Weekly load: {hoursPerWeek}h
              <input
                min="3"
                max="30"
                onChange={(event) => setHoursPerWeek(Number(event.target.value))}
                type="range"
                value={hoursPerWeek}
              />
            </label>
          </div>
          <div className="console-actions">
            <button className="generate-button" disabled={isGenerating} onClick={generatePlan} type="button">
              {isGenerating ? "Creating study plan..." : `Create study plan with ${selectedModel.name}`}
            </button>
            <span className={generationMode === "live-model" ? "mode-pill live" : "mode-pill"}>
              {generationMode === "live-model" ? "Live model" : "Local fallback"}
            </span>
          </div>
          <div className="storage-row">
            <span>Database: {databaseStatus === "saved" ? "saved to Neon" : databaseStatus}</span>
            {storedPlanId ? <code>{storedPlanId}</code> : null}
          </div>
          {error ? <p className="error-message">{error}</p> : null}
          </div>

          <div className="saved-plans" aria-label="Saved learning plans">
            <div className="section-heading compact">
              <p className="eyebrow">Saved plans</p>
              <h2>Continue tracking</h2>
            </div>
            <div className="saved-plans-toolbar">
              <span>Database: {savedPlansStatus}</span>
              <button className="secondary-tool-button" onClick={() => void loadSavedPlans()} type="button">
                Refresh
              </button>
            </div>
            <div className="saved-plan-list">
              {savedPlans.length ? (
                savedPlans.map((stored) => (
                  <article
                    className={storedPlanId === stored.id ? "saved-plan-card active" : "saved-plan-card"}
                    key={stored.id}
                    onClick={() => void openStoredPlan(stored.id)}
                  >
                    <strong>{stored.topic}</strong>
                    <span>{new Date(stored.created_at).toLocaleString()}</span>
                    <p>{stored.outcome}</p>
                    <div className="saved-plan-actions" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => void openStoredPlan(stored.id)} type="button">Open</button>
                      <button onClick={() => startEditingStoredPlan(stored)} type="button">Edit</button>
                      <button onClick={() => void reproduceStoredPlan(stored)} type="button">Reproduce</button>
                      <button className="danger" onClick={() => void deleteStoredPlan(stored.id)} type="button">Delete</button>
                    </div>
                    {editingPlanId === stored.id ? (
                      <div className="saved-plan-edit" onClick={(event) => event.stopPropagation()}>
                        <textarea
                          value={editingInquiry}
                          onChange={(event) => setEditingInquiry(event.target.value)}
                          rows={4}
                        />
                        <div>
                          <button onClick={() => void saveStoredPlanInquiry(stored)} type="button">Save inquiry</button>
                          <button onClick={() => setEditingPlanId(null)} type="button">Cancel</button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty-state">Saved plans will appear here after generation.</div>
              )}
            </div>
          </div>
        </div>

        <section className="plan-output" id="plan-output" aria-label="Generated learning plan output">
          <div className="section-heading">
            <p className="eyebrow">Generated study plan</p>
            <h2>{plan.topic === "Your learning goal" ? "Your plan will appear here" : plan.topic}</h2>
          </div>
          {plan.topic === "Your learning goal" ? (
            <div className="plan-placeholder">
              <strong>No plan generated yet.</strong>
              <p>
                Enter a learning goal in the chatbox. The generated response will render here as a readable plan you can follow and track.
              </p>
            </div>
          ) : (
            <>
              <div className="reader-layout">
                <article className="reader-main">
                  <span className="reader-kicker">Plan summary</span>
                  <h3>{plan.outcome}</h3>
                  <p>{plan.executiveSummary}</p>
                  <div className="reader-meta">
                    <span>{getModelById(plan.selectedModelId).name}</span>
                    <span>{generationMode === "live-model" ? "Live model" : "Local fallback"}</span>
                    <span>{storedPlanId ? "Saved" : "Not saved"}</span>
                    <span>{completionPercent}% complete</span>
                  </div>
                </article>

                <aside className="today-card">
                  <span className="reader-kicker">Today</span>
                  <h3>{plan.dailyRoutine[0]?.ritual ?? "Start with recall"}</h3>
                  <p>{plan.dailyRoutine[0]?.output ?? "Create your first study note."}</p>
                  <button
                    className="secondary-tool-button"
                    onClick={() => void toggleChecklistItem(plan.checklist[0]?.id ?? "today", true)}
                    type="button"
                  >
                    Mark first step done
                  </button>
                </aside>
              </div>

              <div className="reader-sections">
                <article>
                  <h3>Action Items</h3>
                  {plan.actionItems.map((item) => (
                    <div className="reader-row" key={item.id}>
                      <span>{item.due}</span>
                      <p>
                        <strong>{item.title}</strong>
                        {item.owner} agent - {item.impact} impact
                      </p>
                    </div>
                  ))}
                </article>

                <article>
                  <h3>Daily Routine</h3>
                  {plan.dailyRoutine.map((routine) => (
                    <div className="reader-row" key={`${routine.timebox}-${routine.ritual}`}>
                      <span>{routine.timebox}</span>
                      <p>
                        <strong>{routine.ritual}</strong>
                        {routine.agent} output: {routine.output}
                      </p>
                    </div>
                  ))}
                </article>

                <article>
                  <h3>20-Hour Sprint</h3>
                  {plan.twentyHourSprint.map((block) => (
                    <div className="reader-row" key={block.block}>
                      <span>{block.block}</span>
                      <p>
                        <strong>{block.goal}</strong>
                        {block.proof}
                      </p>
                    </div>
                  ))}
                </article>
              </div>

              <div className="reader-checklist">
                <div>
                  <h3>Execution Checklist</h3>
                  <p>{completedCount} of {plan.checklist.length} complete. Check items off as you study.</p>
                  <button className="secondary-tool-button" onClick={refreshGapAnalysis} type="button">
                    Analyze gaps
                  </button>
                  {gapAnalysis ? (
                    <div className="analysis-box">
                      <strong>{gapAnalysis.riskLevel} risk</strong>
                      <p>{gapAnalysis.summary}</p>
                      <span>Weak areas: {gapAnalysis.weakCategories.join(", ") || "none"}</span>
                    </div>
                  ) : null}
                </div>
                <div className="reader-check-grid">
                  {plan.checklist.map((item) => (
                    <label className="compact-check" key={item.id}>
                      <input
                        checked={Boolean(checkedItems[item.id])}
                        onChange={(event) => void toggleChecklistItem(item.id, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="reader-sections two-column">
                <article>
                  <h3>90-Day Roadmap</h3>
                  {plan.ninetyDayRoadmap.map((phase) => (
                    <div className="reader-row" key={phase.phase}>
                      <span>{phase.days}</span>
                      <p>
                        <strong>{phase.phase}: {phase.objective}</strong>
                        {phase.assessment}
                      </p>
                    </div>
                  ))}
                </article>

                <article>
                  <h3>Update Loop</h3>
                  {plan.updateLoop.map((item) => (
                    <div className="reader-row" key={item.trigger}>
                      <span>{item.trigger}</span>
                      <p>
                        <strong>{item.agent}</strong>
                        {item.prompt}
                      </p>
                    </div>
                  ))}
                </article>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
