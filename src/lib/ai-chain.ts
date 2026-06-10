import { createLearningPlan, type LearningPlan, type PlanRequest } from "./learning-engine";
import { getModelById } from "./models";

type ChainResult = {
  plan: LearningPlan;
  mode: "live-model" | "local-planner";
  agentTrace: Array<{
    agent: string;
    modelId: string;
    status: "completed" | "fallback";
    note: string;
  }>;
};

function buildPlannerPrompt(input: PlanRequest) {
  return `You are a chain of learning agents inside a web app.

User request:
Topic: ${input.topic}
Outcome: ${input.outcome}
Starting level: ${input.level}
Hours per week: ${input.hoursPerWeek}
Constraints: ${input.constraints || "No extra constraints."}

Generate a concrete learning system for "learn in 20 hours, master in 90 days".
Return JSON only. Match this exact shape:
{
  "executiveSummary": "string",
  "actionItems": [{"id":"string","title":"string","owner":"Scout|Tutor|Drillmaster|Builder|Examiner","due":"string","impact":"High|Medium|Low"}],
  "dailyRoutine": [{"timebox":"string","ritual":"string","agent":"string","output":"string"}],
  "checklist": [{"id":"string","label":"string","category":"string"}],
  "progressTracker": [{"week":1,"target":"string","evidence":"string","score":20}],
  "twentyHourSprint": [{"block":"string","hours":2,"goal":"string","exercises":["string"],"proof":"string"}],
  "ninetyDayRoadmap": [{"phase":"string","days":"string","objective":"string","milestones":["string"],"assessment":"string"}],
  "updateLoop": [{"trigger":"string","prompt":"string","agent":"string"}]
}

Make it practical, specific to the topic, and filled with action items, checklists, daily habits, measurable evidence, and progress updates.`;
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");

  if (first === -1 || last === -1) {
    throw new Error("Model response did not include JSON.");
  }

  return JSON.parse(candidate.slice(first, last + 1)) as Partial<LearningPlan>;
}

function mergeModelPlan(input: PlanRequest, partial: Partial<LearningPlan>) {
  const fallback = createLearningPlan(input);

  return {
    ...fallback,
    ...partial,
    topic: fallback.topic,
    outcome: fallback.outcome,
    selectedModelId: fallback.selectedModelId,
    estimatedCost: fallback.estimatedCost,
    masteryScore: fallback.masteryScore,
    metrics: fallback.metrics,
    agentChain: fallback.agentChain,
    actionItems: partial.actionItems?.length ? partial.actionItems : fallback.actionItems,
    dailyRoutine: partial.dailyRoutine?.length ? partial.dailyRoutine : fallback.dailyRoutine,
    checklist: partial.checklist?.length ? partial.checklist : fallback.checklist,
    progressTracker: partial.progressTracker?.length ? partial.progressTracker : fallback.progressTracker,
    updateLoop: partial.updateLoop?.length ? partial.updateLoop : fallback.updateLoop,
    twentyHourSprint: partial.twentyHourSprint?.length ? partial.twentyHourSprint : fallback.twentyHourSprint,
    ninetyDayRoadmap: partial.ninetyDayRoadmap?.length ? partial.ninetyDayRoadmap : fallback.ninetyDayRoadmap
  } satisfies LearningPlan;
}

async function callGoogle(modelId: string, prompt: string) {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!key) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Google model request failed with ${response.status}.`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function callGroq(modelId: string, prompt: string) {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("Missing GROQ_API_KEY.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    throw new Error(`Groq model request failed with ${response.status}.`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(modelId: string, prompt: string) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 6000,
      system: "Return JSON only.",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic model request failed with ${response.status}.`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.map((part) => part.text ?? "").join("") ?? "";
}

export async function runLearningAgentChain(input: PlanRequest): Promise<ChainResult> {
  const model = getModelById(input.modelId);
  const prompt = buildPlannerPrompt(input);
  const fallbackPlan = createLearningPlan(input);

  try {
    const text =
      model.provider === "google"
        ? await callGoogle(model.id, prompt)
        : model.provider === "groq"
          ? await callGroq(model.id, prompt)
          : await callAnthropic(model.id, prompt);

    const partial = extractJson(text);
    const plan = mergeModelPlan(input, partial);

    return {
      plan,
      mode: "live-model",
      agentTrace: plan.agentChain.map((agent) => ({
        agent: agent.agent,
        modelId: agent.modelId,
        status: "completed",
        note: `${agent.agent} generated or refined the plan through ${getModelById(agent.modelId).name}.`
      }))
    };
  } catch (error) {
    return {
      plan: fallbackPlan,
      mode: "local-planner",
      agentTrace: fallbackPlan.agentChain.map((agent) => ({
        agent: agent.agent,
        modelId: agent.modelId,
        status: "fallback",
        note: error instanceof Error ? error.message : "Live model call unavailable; local planner generated this section."
      }))
    };
  }
}
