import { neon } from "@neondatabase/serverless";
import type { LearningPlan, PlanRequest } from "./learning-engine";
import { analyzePlanProgress } from "./analysis";

type StoredPlanRow = {
  id: string;
  topic: string;
  outcome: string;
  level: PlanRequest["level"];
  hours_per_week: number;
  model_id: string;
  mode: "live-model" | "local-planner";
  plan: LearningPlan;
  created_at: string;
  updated_at: string;
};

type TrackerRow = {
  id: string;
  plan_id: string;
  item_id: string;
  item_type: string;
  status: string;
  note: string | null;
  created_at: string;
};

let schemaReady: Promise<void> | null = null;

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

function sql() {
  const url = getDatabaseUrl();

  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL is not configured.");
  }

  return neon(url);
}

async function ensureSchema() {
  if (!schemaReady) {
    const db = sql();
    schemaReady = (async () => {
      await db`
        create table if not exists learning_plans (
          id uuid primary key default gen_random_uuid(),
          topic text not null,
          outcome text not null,
          level text not null,
          hours_per_week integer not null,
          model_id text not null,
          mode text not null,
          plan jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;
      await db`
        create table if not exists tracker_events (
          id uuid primary key default gen_random_uuid(),
          plan_id uuid not null references learning_plans(id) on delete cascade,
          item_id text not null,
          item_type text not null,
          status text not null,
          note text,
          created_at timestamptz not null default now()
        )
      `;
      await db`
        create index if not exists learning_plans_created_at_idx
        on learning_plans (created_at desc)
      `;
      await db`
        create index if not exists tracker_events_plan_id_created_at_idx
        on tracker_events (plan_id, created_at desc)
      `;
    })();
  }

  return schemaReady;
}

export async function saveLearningPlan(input: PlanRequest, plan: LearningPlan, mode: "live-model" | "local-planner") {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    insert into learning_plans (topic, outcome, level, hours_per_week, model_id, mode, plan)
    values (${plan.topic}, ${plan.outcome}, ${input.level}, ${Math.round(input.hoursPerWeek)}, ${plan.selectedModelId}, ${mode}, ${JSON.stringify(plan)}::jsonb)
    returning id, topic, outcome, level, hours_per_week, model_id, mode, plan, created_at, updated_at
  `;

  return rows[0] as StoredPlanRow;
}

export async function listLearningPlans() {
  await ensureSchema();
  const rows = await sql()`
    select id, topic, outcome, level, hours_per_week, model_id, mode, plan, created_at, updated_at
    from learning_plans
    order by created_at desc
    limit 30
  `;

  return rows as StoredPlanRow[];
}

export async function getLearningPlan(planId: string) {
  await ensureSchema();
  const rows = await sql()`
    select id, topic, outcome, level, hours_per_week, model_id, mode, plan, created_at, updated_at
    from learning_plans
    where id = ${planId}
    limit 1
  `;

  return (rows[0] as StoredPlanRow | undefined) ?? null;
}

export async function addTrackerEvent(input: {
  planId: string;
  itemId: string;
  itemType: "checklist" | "daily" | "action" | "week";
  status: "completed" | "open" | "blocked" | "skipped";
  note?: string;
}) {
  await ensureSchema();
  const rows = await sql()`
    insert into tracker_events (plan_id, item_id, item_type, status, note)
    values (${input.planId}, ${input.itemId}, ${input.itemType}, ${input.status}, ${input.note ?? null})
    returning id, plan_id, item_id, item_type, status, note, created_at
  `;

  return rows[0] as TrackerRow;
}

export async function getTrackerEvents(planId: string) {
  await ensureSchema();
  const rows = await sql()`
    select id, plan_id, item_id, item_type, status, note, created_at
    from tracker_events
    where plan_id = ${planId}
    order by created_at desc
  `;

  return rows as TrackerRow[];
}

export async function getStoredGapAnalysis(planId: string) {
  const stored = await getLearningPlan(planId);

  if (!stored) {
    return null;
  }

  const events = await getTrackerEvents(planId);
  const completedItemIds = events
    .filter((event) => event.item_type === "checklist" && event.status === "completed")
    .map((event) => event.item_id);

  return {
    plan: stored,
    trackerEvents: events,
    analysis: analyzePlanProgress(stored.plan, completedItemIds)
  };
}
