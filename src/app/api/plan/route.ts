import { NextResponse } from "next/server";
import { createLearningPlan, validatePlanRequest } from "@/lib/learning-engine";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = validatePlanRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const plan = createLearningPlan(parsed.value);

  return NextResponse.json({
    plan,
    mode: "local-planner",
    note: "Provider keys are kept server-side. This route is ready to call live Gemini, Groq, or Claude adapters when configured."
  });
}
