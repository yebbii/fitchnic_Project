import type { CrmData, ChecksMap, CopiesMap, SeqDataMap, Feedback, DesignChecksMap, WorkLog, DesignerMilestonesMap, Assignee, InstructorProfile } from "./types";

const KEYS = {
  data: "crm_data",
  checks: "crm_checks",
  copies: "crm_copies",
  seqData: "crm_seqDataMap",
  feedbacks: "crm_feedbacks",
  designChecks: "designer_checks",
  workLogs: "designer_worklogs",
  platformColors: "crm_platformColors",
  designerMilestones: "designer_milestones",
  assignees: "designer_assignees",
  designerProjectAssignees: "designer_project_assignees",
  pmProjectAssignees: "pm_project_assignees",
  milestoneMeta: "crm_milestone_meta",
  instructorProfiles: "crm_instructor_profiles",
} as const;

function load<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export const storage = {
  loadData: () => load<CrmData>(KEYS.data),
  saveData: (v: CrmData) => save(KEYS.data, v),

  loadChecks: () => load<ChecksMap>(KEYS.checks),
  saveChecks: (v: ChecksMap) => save(KEYS.checks, v),

  loadCopies: () => load<CopiesMap>(KEYS.copies),
  saveCopies: (v: CopiesMap) => save(KEYS.copies, v),

  loadSeqDataMap: () => load<SeqDataMap>(KEYS.seqData),
  saveSeqDataMap: (v: SeqDataMap) => save(KEYS.seqData, v),

  loadFeedbacks: () => load<Feedback[]>(KEYS.feedbacks),
  saveFeedbacks: (v: Feedback[]) => save(KEYS.feedbacks, v),

  loadDesignChecks: () => load<DesignChecksMap>(KEYS.designChecks),
  saveDesignChecks: (v: DesignChecksMap) => save(KEYS.designChecks, v),

  loadWorkLogs: () => load<WorkLog[]>(KEYS.workLogs),
  saveWorkLogs: (v: WorkLog[]) => save(KEYS.workLogs, v),

  loadPlatformColors: () => load<Record<string, string>>(KEYS.platformColors),
  savePlatformColors: (v: Record<string, string>) => save(KEYS.platformColors, v),

  loadDesignerMilestones: () => load<DesignerMilestonesMap>(KEYS.designerMilestones),
  saveDesignerMilestones: (v: DesignerMilestonesMap) => save(KEYS.designerMilestones, v),

  loadAssignees: () => load<Assignee[]>(KEYS.assignees),
  saveAssignees: (v: Assignee[]) => save(KEYS.assignees, v),

  loadDesignerProjectAssignees: () => load<Record<string, string>>(KEYS.designerProjectAssignees),
  saveDesignerProjectAssignees: (v: Record<string, string>) => save(KEYS.designerProjectAssignees, v),

  loadPmProjectAssignees: () => load<Record<string, string>>(KEYS.pmProjectAssignees),
  savePmProjectAssignees: (v: Record<string, string>) => save(KEYS.pmProjectAssignees, v),

  loadMilestoneMeta: () => load<Record<string, Record<string, string>>>(KEYS.milestoneMeta),
  saveMilestoneMeta: (v: Record<string, Record<string, string>>) => save(KEYS.milestoneMeta, v),

  loadInstructorProfiles: () => load<InstructorProfile[]>(KEYS.instructorProfiles),
  saveInstructorProfiles: (v: InstructorProfile[]) => save(KEYS.instructorProfiles, v),
};
