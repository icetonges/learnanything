import { NextResponse } from "next/server";
import { deleteLearningPlan, getLearningPlan, isDatabaseConfigured, updateLearningPlanInquiry } from "@/lib/db";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export async function GET(_request: Request, context: { params: Promise<{ planId: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { planId } = await context.params;
  const plan = await getLearningPlan(planId);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, context: { params: Promise<{ planId: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { planId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 120) : "";
  const outcome = typeof body.outcome === "string" ? body.outcome.trim().slice(0, 220) : "";
  const level = typeof body.level === "string" ? body.level : "Intermediate";
  const hoursPerWeek = typeof body.hoursPerWeek === "number" ? body.hoursPerWeek : Number(body.hoursPerWeek);
  const modelId = typeof body.modelId === "string" ? body.modelId : DEFAULT_MODEL_ID;

  if (!topic || !outcome || !["Beginner", "Intermediate", "Advanced"].includes(level) || !Number.isFinite(hoursPerWeek)) {
    return NextResponse.json({ error: "Invalid saved-plan update." }, { status: 400 });
  }

  const plan = await updateLearningPlanInquiry(planId, {
    topic,
    outcome,
    level: level as "Beginner" | "Intermediate" | "Advanced",
    hoursPerWeek,
    modelId
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function DELETE(_request: Request, context: { params: Promise<{ planId: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { planId } = await context.params;
  const deleted = await deleteLearningPlan(planId);

  if (!deleted) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
