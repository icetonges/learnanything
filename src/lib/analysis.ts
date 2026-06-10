import type { LearningPlan } from "./learning-engine";

export type GapAnalysis = {
  completionPercent: number;
  completedCount: number;
  totalChecklistItems: number;
  weakCategories: string[];
  nextActions: string[];
  riskLevel: "Low" | "Medium" | "High";
  summary: string;
};

export function analyzePlanProgress(plan: LearningPlan, completedItemIds: string[]): GapAnalysis {
  const completed = new Set(completedItemIds);
  const totalChecklistItems = plan.checklist.length;
  const completedCount = plan.checklist.filter((item) => completed.has(item.id)).length;
  const completionPercent = Math.round((completedCount / Math.max(totalChecklistItems, 1)) * 100);
  const weakCategories = Array.from(
    new Set(plan.checklist.filter((item) => !completed.has(item.id)).map((item) => item.category))
  ).slice(0, 4);
  const nextActions = plan.actionItems
    .filter((item) => !completed.has(item.id.replace("-a", "-c")))
    .slice(0, 4)
    .map((item) => item.title);
  const riskLevel = completionPercent >= 70 ? "Low" : completionPercent >= 35 ? "Medium" : "High";

  return {
    completionPercent,
    completedCount,
    totalChecklistItems,
    weakCategories,
    nextActions: nextActions.length ? nextActions : plan.actionItems.slice(0, 3).map((item) => item.title),
    riskLevel,
    summary:
      completionPercent >= 70
        ? "Execution is on track. Focus on capstone proof and defense questions."
        : completionPercent >= 35
          ? "Progress is forming, but the plan needs tighter daily execution and weak-spot review."
          : "The plan is at risk. Start with setup, daily routine, and the first shipped artifact."
  };
}
