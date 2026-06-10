"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Theme = "dark" | "light";
type Intensity = "Focused" | "Balanced" | "Accelerated";

const modelChain = [
  { name: "Gemini", role: "Map broad domains", color: "#7bdff2", load: 86 },
  { name: "Groq", role: "Drill fast recall", color: "#f7b267", load: 72 },
  { name: "DeepSeek", role: "Solve hard problems", color: "#b8f2e6", load: 64 },
  { name: "Claude", role: "Coach reflection", color: "#f79d84", load: 78 }
];

const weeklyRhythm = [
  { day: "Mon", topic: "Concept map", minutes: 55, score: 72 },
  { day: "Tue", topic: "Guided lesson", minutes: 70, score: 81 },
  { day: "Wed", topic: "Practice lab", minutes: 80, score: 76 },
  { day: "Thu", topic: "Teach-back", minutes: 45, score: 88 },
  { day: "Fri", topic: "Challenge set", minutes: 65, score: 84 },
  { day: "Sat", topic: "Project block", minutes: 95, score: 91 },
  { day: "Sun", topic: "Review loop", minutes: 35, score: 86 }
];

const milestones = [
  { week: "01-02", label: "Orientation", detail: "Scope the field, diagnose gaps, build vocabulary." },
  { week: "03-04", label: "Foundation", detail: "Core principles, annotated examples, daily retrieval." },
  { week: "05-08", label: "Fluency", detail: "Problem sets, case studies, feedback from model chain." },
  { week: "09-11", label: "Application", detail: "Capstone build, peer-grade rubrics, synthesis notes." },
  { week: "12-13", label: "Mastery", detail: "Final project, oral defense, long-term memory schedule." }
];

const processSteps = [
  "Intake",
  "Knowledge graph",
  "Model chain",
  "Practice loops",
  "Milestones",
  "Mastery proof"
];

function buildPlan(topic: string, intensity: Intensity) {
  const multiplier = intensity === "Focused" ? 0.85 : intensity === "Accelerated" ? 1.25 : 1;
  return {
    hours: Math.round(82 * multiplier),
    daily: Math.round(48 * multiplier),
    capstone: `${topic || "Your topic"} mastery portfolio`,
    monthly: [
      `Month 1: build a precise mental model for ${topic || "the subject"}`,
      "Month 2: convert concepts into drills, explanations, and projects",
      "Month 3: prove transfer with capstone work and spaced retention"
    ]
  };
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [topic, setTopic] = useState("Federal financial management");
  const [goal, setGoal] = useState("Become job-ready and able to explain, analyze, and build with confidence.");
  const [intensity, setIntensity] = useState<Intensity>("Balanced");
  const [selectedMonth, setSelectedMonth] = useState(1);

  const plan = useMemo(() => buildPlan(topic, intensity), [topic, intensity]);
  const progress = selectedMonth === 1 ? 32 : selectedMonth === 2 ? 63 : 91;

  return (
    <main className={`shell ${theme}`}>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#planner" aria-label="LearnAnything AI home">
          <span className="brand-mark">LA</span>
          <span>LearnAnything AI</span>
        </a>
        <div className="nav-actions">
          <a href="#chain">Models</a>
          <a href="#roadmap">Roadmap</a>
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">AI-native learning operating system</p>
          <h1 id="hero-title">Master any knowledge with a living 90-day plan.</h1>
          <p>
            Turn a topic into milestones, weekly practice loops, model-assisted coaching, charts, and a final proof of mastery.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#planner">Build my plan</a>
            <a className="secondary-action" href="#roadmap">View roadmap</a>
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
        <div>
          <span>{plan.hours}</span>
          <p>guided hours</p>
        </div>
        <div>
          <span>{plan.daily}m</span>
          <p>daily target</p>
        </div>
        <div>
          <span>13</span>
          <p>weekly sprints</p>
        </div>
        <div>
          <span>{progress}%</span>
          <p>current mastery</p>
        </div>
      </section>

      <section className="workspace" id="planner" aria-label="Learning planner">
        <div className="planner-panel">
          <div className="section-heading">
            <p className="eyebrow">Plan generator</p>
            <h2>Personalized learning command center</h2>
          </div>
          <label>
            Knowledge target
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <label>
            Outcome
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={4} />
          </label>
          <div className="segmented" role="group" aria-label="Plan intensity">
            {(["Focused", "Balanced", "Accelerated"] as const).map((level) => (
              <button
                className={intensity === level ? "active" : ""}
                key={level}
                onClick={() => setIntensity(level)}
                type="button"
              >
                {level}
              </button>
            ))}
          </div>
          <div className="generated-plan">
            <strong>AI objective</strong>
            <p>{goal}</p>
            <strong>Capstone</strong>
            <p>{plan.capstone}</p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="section-heading compact">
            <p className="eyebrow">90-day roadmap</p>
            <h2>{topic || "Choose a topic"}</h2>
          </div>
          <div className="month-tabs" role="tablist" aria-label="Roadmap month">
            {[1, 2, 3].map((month) => (
              <button
                aria-selected={selectedMonth === month}
                className={selectedMonth === month ? "active" : ""}
                key={month}
                onClick={() => setSelectedMonth(month)}
                role="tab"
                type="button"
              >
                Month {month}
              </button>
            ))}
          </div>
          <div className="radial" style={{ "--progress": `${progress}%` } as React.CSSProperties}>
            <span>{progress}%</span>
            <p>mastery confidence</p>
          </div>
          <div className="monthly-plan">
            {plan.monthly.map((item, index) => (
              <div className={selectedMonth === index + 1 ? "active" : ""} key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
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

      <section className="insights" id="chain">
        <div className="chart-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Weekly plan</p>
            <h2>Practice load and confidence</h2>
          </div>
          <div className="bar-chart" aria-label="Weekly study minutes chart">
            {weeklyRhythm.map((day) => (
              <div key={day.day} className="bar-wrap">
                <div className="bar" style={{ height: `${day.minutes}%` }}>
                  <span>{day.minutes}m</span>
                </div>
                <strong>{day.day}</strong>
                <small>{day.topic}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="model-panel">
          <div className="section-heading compact">
            <p className="eyebrow">LLM chain</p>
            <h2>Specialist model routing</h2>
          </div>
          {modelChain.map((model) => (
            <div className="model-row" key={model.name}>
              <div>
                <strong>{model.name}</strong>
                <p>{model.role}</p>
              </div>
              <div className="model-meter" aria-label={`${model.name} load ${model.load}%`}>
                <span style={{ width: `${model.load}%`, background: model.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="roadmap" id="roadmap" aria-label="Milestones">
        <div className="section-heading">
          <p className="eyebrow">Milestones</p>
          <h2>From curiosity to durable capability</h2>
        </div>
        <div className="timeline">
          {milestones.map((item) => (
            <article key={item.label}>
              <span>Week {item.week}</span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
