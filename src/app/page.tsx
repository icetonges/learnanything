"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { LearningPlan, PlanRequest } from "@/lib/learning-engine";
import { createLearningPlan } from "@/lib/learning-engine";
import { DEFAULT_MODEL_ID, getModelById, MODELS } from "@/lib/models";

type Theme = "dark" | "light";
type Level = PlanRequest["level"];

const processSteps = [
  "Diagnose",
  "Compress",
  "Explain",
  "Drill",
  "Build",
  "Defend"
];

const starterPlan = createLearningPlan({
  topic: "Federal financial management",
  outcome: "Become job-ready and able to explain, analyze, and build useful AI tools with confidence.",
  level: "Intermediate",
  hoursPerWeek: 10,
  modelId: DEFAULT_MODEL_ID
});

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [topic, setTopic] = useState(starterPlan.topic);
  const [outcome, setOutcome] = useState(starterPlan.outcome);
  const [level, setLevel] = useState<Level>("Intermediate");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [plan, setPlan] = useState<LearningPlan>(starterPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(() => getModelById(modelId), [modelId]);
  const activePhase = plan.ninetyDayRoadmap[selectedPhase] ?? plan.ninetyDayRoadmap[0];
  const weeklyMax = Math.max(...plan.weeklyOperatingSystem.map((day) => day.minutes));

  async function generatePlan() {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          outcome,
          level,
          hoursPerWeek,
          modelId
        })
      });

      const payload = (await response.json()) as { plan?: LearningPlan; error?: string };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "Could not generate plan.");
      }

      setPlan(payload.plan);
      setSelectedPhase(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate plan.");
    } finally {
      setIsGenerating(false);
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
          <a href="#agents">Agents</a>
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">AI agent learning studio</p>
          <h1 id="hero-title">Learn anything in 20 hours. Master it in 90 days.</h1>
          <p>
            Use AI agents to compress a topic, teach it back, drill weak spots, build artifacts, and defend mastery with measurable proof.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#planner">Generate learning system</a>
            <a className="secondary-action" href="#models">Tune model chain</a>
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
          <div className="section-heading">
            <p className="eyebrow">Control room</p>
            <h2>Build the agent-assisted learning contract</h2>
          </div>
          <label>
            Knowledge target
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <label>
            Mastery outcome
            <textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={4} />
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
            Weekly learning load: {hoursPerWeek} hours
            <input
              min="3"
              max="30"
              onChange={(event) => setHoursPerWeek(Number(event.target.value))}
              type="range"
              value={hoursPerWeek}
            />
          </label>
          <button className="generate-button" disabled={isGenerating} onClick={generatePlan} type="button">
            {isGenerating ? "Generating..." : "Generate 20h + 90d plan"}
          </button>
          {error ? <p className="error-message">{error}</p> : null}
        </div>

        <div className="dashboard-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Mastery system</p>
            <h2>{plan.topic}</h2>
          </div>
          <div className="radial" style={{ "--progress": `${plan.masteryScore}%` } as React.CSSProperties}>
            <span>{plan.masteryScore}%</span>
            <p>90-day readiness target</p>
          </div>
          <div className="generated-plan">
            <strong>Outcome</strong>
            <p>{plan.outcome}</p>
            <strong>Model route</strong>
            <p>
              Default synthesis: {getModelById(plan.selectedModelId).name}. Estimated orchestration cost: $
              {plan.estimatedCost.toFixed(2)} per full planning cycle.
            </p>
          </div>
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
            <h2>Specialists that facilitate learning</h2>
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

      <section className="models" id="models" aria-label="Model configuration">
        <div className="section-heading">
          <p className="eyebrow">Model economics</p>
          <h2>Choose the default brain for planning and evaluation</h2>
        </div>
        <div className="selected-model">
          <strong>{selectedModel.name}</strong>
          <p>{selectedModel.description}</p>
          <span>
            {selectedModel.contextWindow} context · ${selectedModel.inputPricePer1M}/M in · $
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
                {model.isFree ? "Free tier" : `$${model.inputPricePer1M}/M in`} · {model.contextWindow}
              </small>
              {model.badge ? <em>{model.badge}</em> : null}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
