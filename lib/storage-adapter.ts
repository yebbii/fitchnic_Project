/**
 * Storage Adapter — 저장소 추상화 인터페이스
 *
 * 현재: localStorage 구현
 * 추후: Supabase 구현으로 교체 가능
 *
 * 모든 store는 이 인터페이스를 통해서만 데이터를 읽고 쓴다.
 */

import type {
  CrmData,
  ChecksMap,
  CopiesMap,
  SeqDataMap,
  Feedback,
  DesignChecksMap,
  WorkLog,
  DesignerMilestonesMap,
  Assignee,
  MilestoneMetaMap,
} from "./types";

/* ── 도메인별 데이터 형태 ── */

export interface LectureStorageData {
  data: CrmData;
}

export interface PmStorageData {
  checks: ChecksMap;
  copies: CopiesMap;
  seqDataMap: SeqDataMap;
  feedbacks: Feedback[];
  platformColors: Record<string, string>;
}

export interface DesignerStorageData {
  designChecks: DesignChecksMap;
  designerMilestones: DesignerMilestonesMap;
  milestoneMeta: MilestoneMetaMap;
  workLogs: WorkLog[];
}

export interface AssigneeStorageData {
  assignees: Assignee[];
  designerProjectAssignees: Record<string, string>;
  pmProjectAssignees: Record<string, string>;
}

/* ── 어댑터 인터페이스 ── */

export interface StorageAdapter {
  lecture: {
    load(): LectureStorageData | null;
    save(data: LectureStorageData): void;
  };
  pm: {
    load(): PmStorageData | null;
    save(data: PmStorageData): void;
  };
  designer: {
    load(): DesignerStorageData | null;
    save(data: DesignerStorageData): void;
  };
  assignee: {
    load(): AssigneeStorageData | null;
    save(data: AssigneeStorageData): void;
  };
}

/* ── localStorage 구현 ── */

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
} as const;

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export const localStorageAdapter: StorageAdapter = {
  lecture: {
    load() {
      const data = loadJson<CrmData>(KEYS.data);
      return data ? { data } : null;
    },
    save({ data }) {
      saveJson(KEYS.data, data);
    },
  },

  pm: {
    load() {
      const checks = loadJson<ChecksMap>(KEYS.checks);
      const copies = loadJson<CopiesMap>(KEYS.copies);
      const seqDataMap = loadJson<SeqDataMap>(KEYS.seqData);
      const feedbacks = loadJson<Feedback[]>(KEYS.feedbacks);
      const platformColors = loadJson<Record<string, string>>(KEYS.platformColors);
      if (!checks && !copies && !seqDataMap && !feedbacks && !platformColors) return null;
      return {
        checks: checks || {},
        copies: copies || {},
        seqDataMap: seqDataMap || {},
        feedbacks: feedbacks || [],
        platformColors: platformColors || {},
      };
    },
    save({ checks, copies, seqDataMap, feedbacks, platformColors }) {
      saveJson(KEYS.checks, checks);
      saveJson(KEYS.copies, copies);
      saveJson(KEYS.seqData, seqDataMap);
      saveJson(KEYS.feedbacks, feedbacks);
      saveJson(KEYS.platformColors, platformColors);
    },
  },

  designer: {
    load() {
      const designChecks = loadJson<DesignChecksMap>(KEYS.designChecks);
      const designerMilestones = loadJson<DesignerMilestonesMap>(KEYS.designerMilestones);
      const milestoneMeta = loadJson<MilestoneMetaMap>(KEYS.milestoneMeta);
      const workLogs = loadJson<WorkLog[]>(KEYS.workLogs);
      if (!designChecks && !designerMilestones && !milestoneMeta && !workLogs) return null;
      return {
        designChecks: designChecks || {},
        designerMilestones: designerMilestones || {},
        milestoneMeta: milestoneMeta || {},
        workLogs: workLogs || [],
      };
    },
    save({ designChecks, designerMilestones, milestoneMeta, workLogs }) {
      saveJson(KEYS.designChecks, designChecks);
      saveJson(KEYS.designerMilestones, designerMilestones);
      saveJson(KEYS.milestoneMeta, milestoneMeta);
      saveJson(KEYS.workLogs, workLogs);
    },
  },

  assignee: {
    load() {
      const assignees = loadJson<Assignee[]>(KEYS.assignees);
      const designerProjectAssignees = loadJson<Record<string, string>>(KEYS.designerProjectAssignees);
      const pmProjectAssignees = loadJson<Record<string, string>>(KEYS.pmProjectAssignees);
      if (!assignees && !designerProjectAssignees && !pmProjectAssignees) return null;
      return {
        assignees: assignees || [],
        designerProjectAssignees: designerProjectAssignees || {},
        pmProjectAssignees: pmProjectAssignees || {},
      };
    },
    save({ assignees, designerProjectAssignees, pmProjectAssignees }) {
      saveJson(KEYS.assignees, assignees);
      saveJson(KEYS.designerProjectAssignees, designerProjectAssignees);
      saveJson(KEYS.pmProjectAssignees, pmProjectAssignees);
    },
  },
};
