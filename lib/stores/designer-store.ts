/**
 * Designer Store — 디자이너 도메인
 *
 * 담당 데이터: designChecks, designerMilestones, milestoneMeta, workLogs
 * 담당 액션: SET_DESIGN_CHECK, SET_DESIGNER_MILESTONE, SET_MILESTONE_META,
 *           ADD/UPDATE/DELETE_WORK_LOG
 * 키 마이그레이션: DESIGNER_RENAME_KEYS
 */

import type {
  DesignChecksMap,
  DesignerMilestonesMap,
  MilestoneMetaMap,
  MilestoneId,
  WorkLog,
} from "@/lib/types";

/* ── State ── */

export interface DesignerState {
  designChecks: DesignChecksMap;
  designerMilestones: DesignerMilestonesMap;
  milestoneMeta: MilestoneMetaMap;
  workLogs: WorkLog[];
}

export const designerInitialState: DesignerState = {
  designChecks: {},
  designerMilestones: {},
  milestoneMeta: {},
  workLogs: [],
};

/* ── Actions ── */

export type DesignerAction =
  | { type: "DESIGNER_HYDRATE"; designChecks: DesignChecksMap; designerMilestones: DesignerMilestonesMap; milestoneMeta: MilestoneMetaMap; workLogs: WorkLog[] }
  | { type: "SET_DESIGN_CHECK"; lectureKey: string; itemId: string; checked: boolean }
  | { type: "SET_DESIGNER_MILESTONE"; curKey: string; milestoneId: MilestoneId; checked?: boolean; assignee?: string }
  | { type: "SET_MILESTONE_META"; curKey: string; field: string; value: string }
  | { type: "ADD_WORK_LOG"; log: WorkLog }
  | { type: "UPDATE_WORK_LOG"; id: string; content: string }
  | { type: "DELETE_WORK_LOG"; id: string }
  | { type: "DESIGNER_RENAME_KEYS"; renameMap: Map<string, string> }
  | { type: "DESIGNER_DELETE_KEY"; curKey: string };

/* ── Reducer ── */

export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case "DESIGNER_HYDRATE":
      return {
        designChecks: action.designChecks,
        designerMilestones: action.designerMilestones,
        milestoneMeta: action.milestoneMeta,
        workLogs: action.workLogs,
      };

    case "SET_DESIGN_CHECK": {
      const prev = state.designChecks[action.lectureKey] || {};
      return {
        ...state,
        designChecks: {
          ...state.designChecks,
          [action.lectureKey]: { ...prev, [action.itemId]: action.checked },
        },
      };
    }

    case "SET_DESIGNER_MILESTONE": {
      const prev = state.designerMilestones[action.curKey] || {};
      const prevItem = prev[action.milestoneId] || { checked: false, assignee: "" };
      return {
        ...state,
        designerMilestones: {
          ...state.designerMilestones,
          [action.curKey]: {
            ...prev,
            [action.milestoneId]: {
              checked: action.checked ?? prevItem.checked,
              assignee: action.assignee ?? prevItem.assignee,
            },
          },
        },
      };
    }

    case "SET_MILESTONE_META": {
      const prev = state.milestoneMeta[action.curKey] || {};
      return {
        ...state,
        milestoneMeta: {
          ...state.milestoneMeta,
          [action.curKey]: { ...prev, [action.field]: action.value },
        },
      };
    }

    case "ADD_WORK_LOG":
      return { ...state, workLogs: [action.log, ...state.workLogs] };

    case "UPDATE_WORK_LOG":
      return {
        ...state,
        workLogs: state.workLogs.map((w) =>
          w.id === action.id ? { ...w, content: action.content } : w
        ),
      };

    case "DELETE_WORK_LOG":
      return { ...state, workLogs: state.workLogs.filter((w) => w.id !== action.id) };

    case "DESIGNER_RENAME_KEYS": {
      const designChecks = renameKeys(state.designChecks, action.renameMap);
      const designerMilestones = renameKeys(state.designerMilestones, action.renameMap);
      const milestoneMeta = renameKeys(state.milestoneMeta, action.renameMap);
      return { ...state, designChecks, designerMilestones, milestoneMeta };
    }

    case "DESIGNER_DELETE_KEY": {
      const designChecks = { ...state.designChecks };
      const designerMilestones = { ...state.designerMilestones };
      const milestoneMeta = { ...state.milestoneMeta };
      delete designChecks[action.curKey];
      delete designerMilestones[action.curKey];
      delete milestoneMeta[action.curKey];
      return { ...state, designChecks, designerMilestones, milestoneMeta };
    }

    default:
      return state;
  }
}

/* ── Helpers ── */

function renameKeys<T>(map: Record<string, T>, renameMap: Map<string, string>): Record<string, T> {
  const result = { ...map };
  renameMap.forEach((newKey, oldKey) => {
    if (result[oldKey]) {
      result[newKey] = result[oldKey];
      delete result[oldKey];
    }
  });
  return result;
}

/* ── Selectors ── */

export function selectDesignChecks(state: DesignerState, curKey: string): Record<string, boolean> {
  return state.designChecks[curKey] || {};
}

export function selectMilestones(state: DesignerState, curKey: string) {
  return state.designerMilestones[curKey] || {};
}

export function selectMilestoneMeta(state: DesignerState, curKey: string): Record<string, string> {
  return state.milestoneMeta[curKey] || {};
}
