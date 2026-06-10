import { NextResponse } from "next/server";
import { isDatabaseConfigured, listLearningPlans } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ plans: [], database: "not-configured" });
  }

  try {
    const plans = await listLearningPlans();
    return NextResponse.json({ plans, database: "connected" });
  } catch {
    return NextResponse.json({ plans: [], database: "error" }, { status: 500 });
  }
}
