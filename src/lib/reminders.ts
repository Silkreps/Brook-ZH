import type { TenderProject } from "./types";

export const defaultReminderDays = [30, 14, 7, 3, 1, 0];

export function dueReminderDays(project: TenderProject, now = new Date()) {
  if (!project.deadlineAt) return [];
  const deadline = new Date(`${project.deadlineAt}T00:00:00Z`);
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  return defaultReminderDays.filter((day) => day === diffDays);
}

export function buildDailyDigest(projects: TenderProject[]) {
  return {
    newProjects: projects.filter((project) => project.publishedAt === "2026-07-17"),
    postponed: projects.filter((project) => project.status === "延期"),
    addenda: projects.filter((project) => project.addendaCount > 0),
    clarifications: projects.filter((project) => project.clarificationCount > 0),
    awarded: projects.filter((project) => project.status === "已授标"),
    cancelled: projects.filter((project) => project.status === "已取消"),
    upcomingDeadlines: projects.filter((project) => Boolean(project.deadlineAt)),
    recommended: [...projects].sort((a, b) => b.score - a.score).slice(0, 10),
  };
}
