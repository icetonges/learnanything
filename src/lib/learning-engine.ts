import { DEFAULT_MODEL_ID, estimateModelCost, getModelById, MODELS } from "./models";

export type PlanRequest = {
  topic: string;
  outcome: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  hoursPerWeek: number;
  modelId: string;
};

export type AgentOutput = {
  agent: string;
  modelId: string;
  mission: string;
  deliverable: string;
  cadence: string;
};

export type LearningPlan = {
  topic: string;
  outcome: string;
  selectedModelId: string;
  estimatedCost: number;
  masteryScore: number;
  twentyHourSprint: Array<{
    block: string;
    hours: number;
    goal: string;
    exercises: string[];
    proof: string;
  }>;
  ninetyDayRoadmap: Array<{
    phase: string;
    days: string;
    objective: string;
    milestones: string[];
    assessment: string;
  }>;
  agentChain: AgentOutput[];
  weeklyOperatingSystem: Array<{
    day: string;
    focus: string;
    minutes: number;
    output: string;
  }>;
  metrics: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
};

const agentRoles = [
  {
    agent: "Scout",
    mission: "Map the subject, collect canonical resources, and identify what matters first.",
    deliverable: "One-page knowledge graph plus prerequisite checklist.",
    cadence: "Runs at the start of each phase."
  },
  {
    agent: "Tutor",
    mission: "Explain concepts in layers, generate analogies, and convert confusion into examples.",
    deliverable: "Daily lesson card with questions and teach-back prompt.",
    cadence: "Runs every focused study block."
  },
  {
    agent: "Drillmaster",
    mission: "Create retrieval practice, timed quizzes, flashcards, and progressively harder problems.",
    deliverable: "Adaptive practice set with answer key and weak-spot tags.",
    cadence: "Runs after every lesson."
  },
  {
    agent: "Builder",
    mission: "Turn knowledge into projects, simulations, mini-cases, and artifacts.",
    deliverable: "Weekly project brief and grading rubric.",
    cadence: "Runs weekly."
  },
  {
    agent: "Examiner",
    mission: "Grade work, run oral defense questions, and decide what needs another loop.",
    deliverable: "Mastery report with next actions.",
    cadence: "Runs twice per week."
  }
];

function clampText(value: string, fallback: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.slice(0, maxLength) || fallback;
}

function chooseAgentModel(agent: string, requestedModelId: string) {
  if (agent === "Scout") {
    return MODELS.find((model) => model.id === "groq/compound-beta")?.id ?? requestedModelId;
  }

  if (agent === "Drillmaster") {
    return MODELS.find((model) => model.id === "llama-3.1-8b-instant")?.id ?? requestedModelId;
  }

  if (agent === "Examiner") {
    return requestedModelId || DEFAULT_MODEL_ID;
  }

  return requestedModelId || DEFAULT_MODEL_ID;
}

export function createLearningPlan(input: PlanRequest): LearningPlan {
  const topic = clampText(input.topic, "Any knowledge domain", 120);
  const outcome = clampText(input.outcome, "Build practical mastery and prove it with a project.", 220);
  const hoursPerWeek = Math.min(Math.max(Math.round(input.hoursPerWeek), 3), 30);
  const selectedModel = getModelById(input.modelId);
  const levelMultiplier = input.level === "Beginner" ? 0.62 : input.level === "Intermediate" ? 0.74 : 0.84;
  const masteryScore = Math.min(96, Math.round(levelMultiplier * 100 + Math.min(hoursPerWeek, 20) * 0.8));
  const dailyMinutes = Math.round((hoursPerWeek * 60) / 6);

  return {
    topic,
    outcome,
    selectedModelId: selectedModel.id,
    estimatedCost: Number(estimateModelCost(selectedModel.id, 45_000, 18_000).toFixed(2)),
    masteryScore,
    twentyHourSprint: [
      {
        block: "Hour 1-2",
        hours: 2,
        goal: `Define the map of ${topic} and separate essentials from noise.`,
        exercises: ["Ask the Scout agent for a dependency map.", "Write 25 key terms in your own words."],
        proof: "Explain the field, its subdomains, and the first five skills to learn."
      },
      {
        block: "Hour 3-7",
        hours: 5,
        goal: "Build the first usable mental model.",
        exercises: ["Study three guided lessons.", "Create contrast pairs: what this is and is not.", "Run one teach-back session."],
        proof: "Record a five-minute explanation without notes."
      },
      {
        block: "Hour 8-13",
        hours: 6,
        goal: "Convert passive understanding into retrieval speed.",
        exercises: ["Complete timed recall drills.", "Generate flashcards only from missed ideas.", "Solve 20 targeted examples."],
        proof: "Score 80% or higher on a mixed quiz."
      },
      {
        block: "Hour 14-18",
        hours: 5,
        goal: "Apply the knowledge in a realistic artifact.",
        exercises: ["Build a mini-project.", "Ask Builder for edge cases.", "Run Examiner critique."],
        proof: "Ship a small artifact that demonstrates the core skill."
      },
      {
        block: "Hour 19-20",
        hours: 2,
        goal: "Lock the habit loop and choose the 90-day capstone.",
        exercises: ["Summarize weak spots.", "Schedule spaced review.", "Choose a public proof of mastery."],
        proof: "Publish a 90-day learning contract and weekly rubric."
      }
    ],
    ninetyDayRoadmap: [
      {
        phase: "Foundation",
        days: "Days 1-30",
        objective: `Build the vocabulary, principles, and core workflows of ${topic}.`,
        milestones: ["Finish the 20-hour sprint.", "Create a knowledge graph.", "Pass a foundation oral exam."],
        assessment: "Can explain the domain to a smart beginner and answer why each concept matters."
      },
      {
        phase: "Fluency",
        days: "Days 31-60",
        objective: "Move from recognition to fast recall, problem solving, and pattern matching.",
        milestones: ["Complete 12 practice sets.", "Ship two applied mini-projects.", "Reduce weak-spot tags by 50%."],
        assessment: "Can solve unfamiliar cases with a visible reasoning trace."
      },
      {
        phase: "Mastery",
        days: "Days 61-90",
        objective: "Demonstrate transfer with a capstone, defense, and long-term memory system.",
        milestones: ["Build capstone portfolio.", "Pass Examiner defense.", "Create retention schedule for the next 180 days."],
        assessment: "Can teach, apply, critique, and extend the knowledge without relying on notes."
      }
    ],
    agentChain: agentRoles.map((role) => ({
      ...role,
      modelId: chooseAgentModel(role.agent, selectedModel.id)
    })),
    weeklyOperatingSystem: [
      { day: "Mon", focus: "Map and lesson", minutes: dailyMinutes, output: "Updated concept map" },
      { day: "Tue", focus: "Practice drills", minutes: dailyMinutes, output: "Quiz and weak-spot tags" },
      { day: "Wed", focus: "Case study", minutes: dailyMinutes, output: "Worked example" },
      { day: "Thu", focus: "Teach-back", minutes: Math.max(30, dailyMinutes - 10), output: "Short explanation" },
      { day: "Fri", focus: "Project work", minutes: dailyMinutes + 20, output: "Artifact increment" },
      { day: "Sat", focus: "Examiner review", minutes: dailyMinutes, output: "Mastery report" },
      { day: "Sun", focus: "Spaced review", minutes: Math.max(25, dailyMinutes - 25), output: "Next-week queue" }
    ],
    metrics: [
      { label: "20h sprint", value: 20, unit: "hours" },
      { label: "Weekly load", value: hoursPerWeek, unit: "hours" },
      { label: "Mastery target", value: masteryScore, unit: "%" },
      { label: "Agent loops", value: 5, unit: "agents" }
    ]
  };
}

export function validatePlanRequest(input: unknown): { ok: true; value: PlanRequest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request body must be an object." };
  }

  const data = input as Record<string, unknown>;
  const topic = typeof data.topic === "string" ? data.topic : "";
  const outcome = typeof data.outcome === "string" ? data.outcome : "";
  const level = typeof data.level === "string" ? data.level : "Beginner";
  const hoursPerWeek = typeof data.hoursPerWeek === "number" ? data.hoursPerWeek : Number(data.hoursPerWeek);
  const modelId = typeof data.modelId === "string" ? data.modelId : DEFAULT_MODEL_ID;

  if (topic.trim().length < 2 || topic.length > 120) {
    return { ok: false, error: "Topic must be between 2 and 120 characters." };
  }

  if (outcome.trim().length < 8 || outcome.length > 220) {
    return { ok: false, error: "Outcome must be between 8 and 220 characters." };
  }

  if (!["Beginner", "Intermediate", "Advanced"].includes(level)) {
    return { ok: false, error: "Level must be Beginner, Intermediate, or Advanced." };
  }

  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 3 || hoursPerWeek > 30) {
    return { ok: false, error: "Hours per week must be between 3 and 30." };
  }

  return {
    ok: true,
    value: {
      topic,
      outcome,
      level: level as PlanRequest["level"],
      hoursPerWeek,
      modelId
    }
  };
}
