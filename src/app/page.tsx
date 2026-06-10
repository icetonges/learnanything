"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { LearningPlan, PlanRequest } from "@/lib/learning-engine";
import { createLearningPlan } from "@/lib/learning-engine";
import { DEFAULT_MODEL_ID, getModelById, MODELS } from "@/lib/models";
import type { GapAnalysis } from "@/lib/analysis";

type Theme = "dark" | "light";
type Level = PlanRequest["level"];
type AgentTrace = {
  agent: string;
  modelId: string;
  status: "completed" | "fallback";
  note: string;
};

const processSteps = ["Diagnose", "Compress", "Explain", "Drill", "Build", "Defend"];

const starterPlan = createLearningPlan({
  topic: "Foundry technical solution",
  outcome:
    "Generate a detailed learning plan and roadmap to master Foundry technical solution work, with action items, checklist, daily routine, progress tracker, and update loops.",
  level: "Intermediate",
  hoursPerWeek: 10,
  modelId: DEFAULT_MODEL_ID,
  constraints:
    "Prioritize hands-on projects, technical architecture, customer solutioning, implementation patterns, and measurable proof of mastery."
});

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [topic, setTopic] = useState(starterPlan.topic);
  const [outcome, setOutcome] = useState(starterPlan.outcome);
  const [constraints, setConstraints] = useState(
    "Prioritize hands-on projects, technical architecture, customer solutioning, implementation patterns, and measurable proof of mastery."
  );
  const [level, setLevel] = useState<Level>("Intermediate");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [plan, setPlan] = useState<LearningPlan>(starterPlan);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [agentTrace, setAgentTrace] = useState<AgentTrace[]>([]);
  const [generationMode, setGenerationMode] = useState<"live-model" | "local-planner">("local-planner");
  const [storedPlanId, setStoredPlanId] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<"saved" | "not-configured" | "error">("not-configured");
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(() => getModelById(modelId), [modelId]);
  const activePhase = plan.ninetyDayRoadmap[selectedPhase] ?? plan.ninetyDayRoadmap[0];
  const weeklyMax = Math.max(...plan.weeklyOperatingSystem.map((day) => day.minutes));
  const completedCount = plan.checklist.filter((item) => checkedItems[item.id]).length;
  const completionPercent = Math.round((completedCount / Math.max(plan.checklist.length, 1)) * 100);

  useEffect(() => {
    const stored = window.localStorage.getItem(`learnanything:${plan.topic}:checklist`);
    setCheckedItems(stored ? (JSON.parse(stored) as Record<string, boolean>) : {});
  }, [plan.topic]);

  useEffect(() => {
    window.localStorage.setItem(`learnanything:${plan.topic}:checklist`, JSON.stringify(checkedItems));
  }, [checkedItems, plan.topic]);

  async function generatePlan() {
    setIsGenerating(true);
    setError("");
    setAgentTrace(
      plan.agentChain.map((agent) => ({
        agent: agent.agent,
        modelId: agent.modelId,
        status: "fallback",
        note: `${agent.agent} queued for ${getModelById(agent.modelId).name}.`
      }))
    );

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          outcome,
          constraints,
          level,
          hoursPerWeek,
          modelId
        })
      });

      const payload = (await response.json()) as {
        plan?: LearningPlan;
        error?: string;
        mode?: "live-model" | "local-planner";
        agentTrace?: AgentTrace[];
        storedPlanId?: string | null;
        database?: "saved" | "not-configured" | "error";
      };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "Could not generate plan.");
      }

      setPlan(payload.plan);
      setAgentTrace(payload.agentTrace ?? []);
      setGenerationMode(payload.mode ?? "local-planner");
      setStoredPlanId(payload.storedPlanId ?? null);
      setDatabaseStatus(payload.database ?? "not-configured");
      setGapAnalysis(null);
      setSelectedPhase(0);
      setCheckedItems({});
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
        <a className="brand" href="#planner" aria-label="LearnAnything AI home">
          <span className="brand-mark">LA</span>
          <span>LearnAnything AI</span>
        </a>
        <div className="nav-actions">
          <a href="#sprint">20h sprint</a>
          <a href="#tracker">Tracker</a>
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Embedded AI learning agents</p>
          <h1 id="hero-title">Generate a real roadmap, then execute it.</h1>
          <p>
            Enter a goal like "master Foundry technical solution." The app routes the job through a model chain and returns action items, checklists, daily routines, progress trackers, and update prompts.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#console">Generate plan</a>
            <a className="secondary-action" href="#models">Model chain</a>
          </div>
        </div>
        <div className="hero-art" aria-label="AI learning cockpit visualization">
          <Image
            src="/assets/ai-learning-cockpit.png"
            alt="A futuristic AI learning cockpit with plans, charts, and knowledge maps."
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
          />
        </div>
      </section>

      <section className="agent-console" id="console" aria-label="AI agent console">
        <div className="console-main">
          <p className="eyebrow">Prompt to plan</p>
          <h2>Ask the embedded chain to build your learning tool</h2>
          <label>
            What do you want to learn or master?
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <label>
            Request
            <textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={5} />
          </label>
          <label>
            Focus and constraints
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
              {isGenerating ? "Agents generating..." : `Generate with ${selectedModel.name}`}
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

        <div className="agent-run">
          <p className="eyebrow">Agent run</p>
          {(agentTrace.length
            ? agentTrace
            : plan.agentChain.map((agent) => ({
                agent: agent.agent,
                modelId: agent.modelId,
                status: "fallback" as const,
                note: `${agent.agent} is ready to run through ${getModelById(agent.modelId).name}.`
              }))
          ).map((trace) => (
            <div className="trace-row" key={trace.agent}>
              <strong>{trace.agent}</strong>
              <span>{getModelById(trace.modelId).name}</span>
              <p>{trace.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="metrics" aria-label="Plan summary">
        {plan.metrics.map((metric) => (
          <div key={metric.label}>
            <span>
              {metric.value}
              {metric.unit === "%" ? "%" : ""}
            </span>
            <p>{metric.label}</p>
          </div>
        ))}
      </section>

      <section className="workspace" id="planner" aria-label="Learning planner">
        <div className="planner-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Generated system</p>
            <h2>{plan.topic}</h2>
          </div>
          <div className="generated-plan">
            <strong>Agent summary</strong>
            <p>{plan.executiveSummary}</p>
            <strong>Outcome</strong>
            <p>{plan.outcome}</p>
            <strong>Model route</strong>
            <p>
              Default synthesis: {getModelById(plan.selectedModelId).name}. Estimated orchestration cost: $
              {plan.estimatedCost.toFixed(2)} per full planning cycle.
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Execution progress</p>
            <h2>{completedCount} of {plan.checklist.length} checklist items done</h2>
          </div>
          <div className="radial" style={{ "--progress": `${completionPercent}%` } as React.CSSProperties}>
            <span>{completionPercent}%</span>
            <p>local progress</p>
          </div>
          <div className="progress-strip">
            <span>90-day readiness target: {plan.masteryScore}%</span>
            <div>
              <i style={{ width: `${plan.masteryScore}%` }} />
            </div>
          </div>
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
      </section>

      <section className="tool-grid" aria-label="Action plan and daily routine">
        <div className="action-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Action items</p>
            <h2>Do this next</h2>
          </div>
          {plan.actionItems.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.owner} agent - due {item.due}</p>
              </div>
              <span>{item.impact}</span>
            </article>
          ))}
        </div>

        <div className="routine-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Daily routine</p>
            <h2>Repeatable study loop</h2>
          </div>
          {plan.dailyRoutine.map((routine) => (
            <article key={`${routine.timebox}-${routine.ritual}`}>
              <span>{routine.timebox}</span>
              <div>
                <strong>{routine.ritual}</strong>
                <p>{routine.agent} produces: {routine.output}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process-flow" aria-label="Learning process flow">
        {processSteps.map((step, index) => (
          <div key={step} className="flow-node">
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </section>

      <section className="sprint-grid" id="sprint" aria-label="20 hour learning sprint">
        <div className="section-heading">
          <p className="eyebrow">20-hour sprint</p>
          <h2>Fast competence before deep mastery</h2>
        </div>
        <div className="sprint-cards">
          {plan.twentyHourSprint.map((block) => (
            <article key={block.block}>
              <span>{block.block}</span>
              <h3>{block.goal}</h3>
              <ul>
                {block.exercises.map((exercise) => (
                  <li key={exercise}>{exercise}</li>
                ))}
              </ul>
              <p>{block.proof}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tracker-grid" id="tracker" aria-label="Checklist and progress tracker">
        <div className="checklist-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Checklist</p>
            <h2>Track execution</h2>
          </div>
          {plan.checklist.map((item) => (
            <label className="check-row" key={item.id}>
              <input
                checked={Boolean(checkedItems[item.id])}
                onChange={(event) => void toggleChecklistItem(item.id, event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.category}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="progress-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Progress tracker</p>
            <h2>13-week mastery curve</h2>
          </div>
          <div className="tracker-list">
            {plan.progressTracker.map((week) => (
              <article key={week.week}>
                <span>W{week.week}</span>
                <div>
                  <strong>{week.target}</strong>
                  <p>{week.evidence}</p>
                  <div className="mini-meter">
                    <i style={{ width: `${week.score}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="insights" id="agents">
        <div className="chart-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Weekly operating system</p>
            <h2>Study load becomes outputs</h2>
          </div>
          <div className="bar-chart" aria-label="Weekly study minutes chart">
            {plan.weeklyOperatingSystem.map((day) => (
              <div key={day.day} className="bar-wrap">
                <div className="bar" style={{ height: `${Math.max(18, (day.minutes / weeklyMax) * 100)}%` }}>
                  <span>{day.minutes}m</span>
                </div>
                <strong>{day.day}</strong>
                <small>{day.focus}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="model-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Agent chain</p>
            <h2>Specialists embedded in the app</h2>
          </div>
          {plan.agentChain.map((agent) => {
            const model = getModelById(agent.modelId);
            return (
              <div className="model-row" key={agent.agent}>
                <div className="agent-title">
                  <strong>{agent.agent}</strong>
                  <span style={{ borderColor: model.providerColor }}>{model.name}</span>
                </div>
                <p>{agent.mission}</p>
                <small>{agent.deliverable}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="roadmap" id="roadmap" aria-label="90 day roadmap">
        <div className="section-heading">
          <p className="eyebrow">90-day mastery</p>
          <h2>Three phases with proof gates</h2>
        </div>
        <div className="month-tabs phase-tabs" role="tablist" aria-label="Roadmap phase">
          {plan.ninetyDayRoadmap.map((phase, index) => (
            <button
              aria-selected={selectedPhase === index}
              className={selectedPhase === index ? "active" : ""}
              key={phase.phase}
              onClick={() => setSelectedPhase(index)}
              role="tab"
              type="button"
            >
              {phase.phase}
            </button>
          ))}
        </div>
        <div className="phase-detail">
          <span>{activePhase.days}</span>
          <h3>{activePhase.objective}</h3>
          <div>
            {activePhase.milestones.map((milestone) => (
              <p key={milestone}>{milestone}</p>
            ))}
          </div>
          <strong>{activePhase.assessment}</strong>
        </div>
      </section>

      <section className="update-loop" aria-label="Progress update prompts">
        <div className="section-heading">
          <p className="eyebrow">Update loop</p>
          <h2>Prompts that keep the AI chain working after day one</h2>
        </div>
        <div className="update-grid">
          {plan.updateLoop.map((item) => (
            <article key={item.trigger}>
              <span>{item.trigger}</span>
              <h3>{item.agent}</h3>
              <p>{item.prompt}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="models" id="models" aria-label="Model configuration">
        <div className="section-heading">
          <p className="eyebrow">Model economics</p>
          <h2>Choose the default brain for planning and evaluation</h2>
        </div>
        <div className="selected-model">
          <strong>{selectedModel.name}</strong>
          <p>{selectedModel.description}</p>
          <span>
            {selectedModel.contextWindow} context - ${selectedModel.inputPricePer1M}/M in - $
            {selectedModel.outputPricePer1M}/M out
          </span>
        </div>
        <div className="model-grid">
          {MODELS.map((model) => (
            <button
              className={modelId === model.id ? "model-card active" : "model-card"}
              key={model.id}
              onClick={() => setModelId(model.id)}
              type="button"
            >
              <span style={{ background: model.providerColor }}>{model.providerLabel ?? model.provider}</span>
              <strong>{model.name}</strong>
              <p>{model.description}</p>
              <small>
                {model.isFree ? "Free tier" : `$${model.inputPricePer1M}/M in`} - {model.contextWindow}
              </small>
              {model.badge ? <em>{model.badge}</em> : null}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
