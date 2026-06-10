import { NextResponse } from "next/server";
import { getLearningPlan, isDatabaseConfigured } from "@/lib/db";

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
