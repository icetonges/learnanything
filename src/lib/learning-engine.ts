import { DEFAULT_MODEL_ID, estimateModelCost, getModelById, MODELS } from "./models";

export type PlanRequest = {
  topic: string;
  outcome: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  hoursPerWeek: number;
  modelId: string;
  constraints?: string;
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
  executiveSummary: string;
  actionItems: Array<{
    id: string;
    title: string;
    owner: string;
    due: string;
    impact: "High" | "Medium" | "Low";
  }>;
  dailyRoutine: Array<{
    timebox: string;
    ritual: string;
    agent: string;
    output: string;
  }>;
  checklist: Array<{
    id: string;
    label: string;
    category: string;
  }>;
  progressTracker: Array<{
    week: number;
    target: string;
    evidence: string;
    score: number;
  }>;
  updateLoop: Array<{
    trigger: string;
    prompt: string;
    agent: string;
  }>;
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

function topicSlug(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

export function deriveTopicFromPrompt(prompt: string) {
  const cleaned = clampText(prompt, "Your learning goal", 180)
    .replace(/^(generate|create|build|make|design)\s+(a\s+)?/i, "")
    .replace(/(detailed?|comprehensive|complete)\s+/gi, "")
    .replace(/(study|learning)\s+(plan|roadmap)\s+(for|to)?\s*/gi, "")
    .replace(/^(for|to|about)\s+/i, "")
    .replace(/\s+(with|including|include)\s+.*$/i, "")
    .trim();

  return cleaned || "Your learning goal";
}

export function createLearningPlan(input: PlanRequest): LearningPlan {
  const topic = clampText(input.topic, "Any knowledge domain", 120);
  const outcome = clampText(input.outcome, "Build practical mastery and prove it with a project.", 220);
  const constraints = clampText(input.constraints ?? "", "Use practical exercises, fast feedback, and proof-based learning.", 220);
  const hoursPerWeek = Math.min(Math.max(Math.round(input.hoursPerWeek), 3), 30);
  const selectedModel = getModelById(input.modelId);
  const levelMultiplier = input.level === "Beginner" ? 0.62 : input.level === "Intermediate" ? 0.74 : 0.84;
  const masteryScore = Math.min(96, Math.round(levelMultiplier * 100 + Math.min(hoursPerWeek, 20) * 0.8));
  const dailyMinutes = Math.round((hoursPerWeek * 60) / 6);
  const slug = topicSlug(topic);

  return {
    topic,
    outcome,
    selectedModelId: selectedModel.id,
    estimatedCost: Number(estimateModelCost(selectedModel.id, 45_000, 18_000).toFixed(2)),
    masteryScore,
    executiveSummary: `This plan treats ${topic} as a skill system, not a reading list. The 20-hour sprint builds usable competence through compression, explanation, drills, and one applied artifact. The 90-day roadmap then compounds that base into mastery through weekly projects, examiner reviews, and measurable evidence. Constraint profile: ${constraints}`,
    actionItems: [
      {
        id: `${slug}-a1`,
        title: `Define the mastery standard for ${topic}`,
        owner: "Scout",
        due: "Today",
        impact: "High"
      },
      {
        id: `${slug}-a2`,
        title: "Build the first concept map and prerequisite list",
        owner: "Scout",
        due: "Hour 2",
        impact: "High"
      },
      {
        id: `${slug}-a3`,
        title: "Complete the first teach-back lesson without notes",
        owner: "Tutor",
        due: "Hour 7",
        impact: "High"
      },
      {
        id: `${slug}-a4`,
        title: "Run a mixed quiz and tag every weak spot",
        owner: "Drillmaster",
        due: "Hour 13",
        impact: "Medium"
      },
      {
        id: `${slug}-a5`,
        title: "Ship a small applied artifact and get critique",
        owner: "Builder",
        due: "Hour 18",
        impact: "High"
      },
      {
        id: `${slug}-a6`,
        title: "Create the 90-day capstone rubric",
        owner: "Examiner",
        due: "Hour 20",
        impact: "High"
      }
    ],
    dailyRoutine: [
      {
        timebox: "10 min",
        ritual: "Recall yesterday from memory before opening notes.",
        agent: "Drillmaster",
        output: "Missed ideas list"
      },
      {
        timebox: `${Math.max(20, dailyMinutes - 45)} min`,
        ritual: `Learn one essential ${topic} concept with examples and counterexamples.`,
        agent: "Tutor",
        output: "Lesson card"
      },
      {
        timebox: "20 min",
        ritual: "Convert the lesson into retrieval questions and scenario drills.",
        agent: "Drillmaster",
        output: "Practice set"
      },
      {
        timebox: "15 min",
        ritual: "Apply the idea to a real artifact, workflow, or decision.",
        agent: "Builder",
        output: "Artifact increment"
      },
      {
        timebox: "10 min",
        ritual: "Score confidence, update weak spots, and choose tomorrow's target.",
        agent: "Examiner",
        output: "Progress update"
      }
    ],
    checklist: [
      { id: `${slug}-c1`, label: "Topic scope is narrow enough for 20 hours", category: "Setup" },
      { id: `${slug}-c2`, label: "Mastery outcome is observable and testable", category: "Setup" },
      { id: `${slug}-c3`, label: "Knowledge map has prerequisites and dependencies", category: "Foundation" },
      { id: `${slug}-c4`, label: "Daily recall log has at least five entries", category: "Routine" },
      { id: `${slug}-c5`, label: "First mini-project is shipped", category: "Application" },
      { id: `${slug}-c6`, label: "Weak-spot tags are reviewed twice weekly", category: "Feedback" },
      { id: `${slug}-c7`, label: "Capstone rubric has pass/fail criteria", category: "Mastery" },
      { id: `${slug}-c8`, label: "Examiner defense questions are answered without notes", category: "Mastery" }
    ],
    progressTracker: Array.from({ length: 13 }, (_, index) => {
      const week = index + 1;
      const score = Math.min(95, Math.round(18 + week * 6 + (input.level === "Advanced" ? 8 : 0)));
      return {
        week,
        target:
          week <= 2
            ? "Map foundations and finish the 20-hour sprint"
            : week <= 6
              ? "Build fluency through drills and worked cases"
              : week <= 10
                ? "Ship applied projects and reduce weak spots"
                : "Defend capstone and lock long-term retention",
        evidence:
          week <= 2
            ? "Concept map, vocabulary test, first teach-back"
            : week <= 6
              ? "Quiz scores, practice log, two corrected mistakes"
              : week <= 10
                ? "Project artifacts, critique notes, revised rubric"
                : "Capstone, oral defense, retention calendar",
        score
      };
    }),
    updateLoop: [
      {
        trigger: "After every study session",
        prompt: `Update my ${topic} plan. I completed: [work]. I got stuck on: [blocker]. Choose tomorrow's highest leverage drill.`,
        agent: "Examiner"
      },
      {
        trigger: "When quiz score is below 80%",
        prompt: "Diagnose my misses, group them by concept, and generate a 30-minute recovery drill.",
        agent: "Drillmaster"
      },
      {
        trigger: "Every Friday",
        prompt: "Review this week's artifacts and choose one project improvement that proves deeper understanding.",
        agent: "Builder"
      },
      {
        trigger: "Every 30 days",
        prompt: "Run a mastery gate: oral exam, applied scenario, weak-spot audit, and next phase adjustment.",
        agent: "Examiner"
      }
    ],
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
  const constraints = typeof data.constraints === "string" ? data.constraints : "";

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
      modelId,
      constraints
    }
  };
}
