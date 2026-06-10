import { NextResponse } from "next/server";
import { addTrackerEvent, getTrackerEvents, isDatabaseConfigured } from "@/lib/db";

const statuses = ["completed", "open", "blocked", "skipped"];
const itemTypes = ["checklist", "daily", "action", "week"];

export async function GET(_request: Request, context: { params: Promise<{ planId: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ events: [], database: "not-configured" });
  }

  const { planId } = await context.params;
  const events = await getTrackerEvents(planId);

  return NextResponse.json({ events, database: "connected" });
}

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { planId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const itemType = typeof body.itemType === "string" ? body.itemType : "";
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

  if (!itemId || !itemTypes.includes(itemType) || !statuses.includes(status)) {
    return NextResponse.json({ error: "Invalid tracker event." }, { status: 400 });
  }

  const event = await addTrackerEvent({
    planId,
    itemId,
    itemType: itemType as "checklist" | "daily" | "action" | "week",
    status: status as "completed" | "open" | "blocked" | "skipped",
    note
  });

  return NextResponse.json({ event });
}
