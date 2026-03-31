/**
 * PM Store — PM팀 도메인
 *
 * 담당 데이터: checks, copies, seqDataMap, feedbacks, platformColors
 * 담당 액션: SET_CHECK, SET_COPY, UPDATE_SEQ, ADD_FEEDBACK, SET_PLATFORM_COLOR
 * 키 마이그레이션: RENAME_KEYS (강의/강사 이름 변경 시 curKey 갱신)
 */

import type {
  ChecksMap,
  CopiesMap,
  SeqDataMap,
  SeqPhase,
  Feedback,
  CopyData,
} from "@/lib/types";
import { DEFAULT_PLATFORM_COLORS } from "@/lib/constants";

/* ── State ── */

export interface PmState {
  allChecks: ChecksMap;
  allCopies: CopiesMap;
  seqDataMap: SeqDataMap;
  feedbacks: Feedback[];
  platformColors: Record<string, string>;
}

export const pmInitialState: PmState = {
  allChecks: {},
  allCopies: {},
  seqDataMap: {},
  feedbacks: [],
  platformColors: DEFAULT_PLATFORM_COLORS,
};

/* ── Actions ── */

export type PmAction =
  | { type: "PM_HYDRATE"; checks: ChecksMap; copies: CopiesMap; seqDataMap: SeqDataMap; feedbacks: Feedback[]; platformColors: Record<string, string> }
  | { type: "SET_CHECK"; curKey: string; itemId: string; checked: boolean }
  | { type: "SET_COPY"; curKey: string; itemId: string; copy: CopyData }
  | { type: "UPDATE_SEQ"; curKey: string; seq: SeqPhase[] }
  | { type: "ADD_FEEDBACK"; feedback: Feedback }
  | { type: "SET_PLATFORM_COLOR"; platform: string; color: string }
  | { type: "PM_RENAME_KEYS"; renameMap: Map<string, string> }
  | { type: "PM_DELETE_KEY"; curKey: string };

/* ── Reducer ── */

export function pmReducer(state: PmState, action: PmAction): PmState {
  switch (action.type) {
    case "PM_HYDRATE":
      return {
        allChecks: action.checks,
        allCopies: action.copies,
        seqDataMap: action.seqDataMap,
        feedbacks: action.feedbacks,
        platformColors: { ...DEFAULT_PLATFORM_COLORS, ...action.platformColors },
      };

    case "SET_CHECK": {
      const prev = state.allChecks[action.curKey] || {};
      return {
        ...state,
        allChecks: {
          ...state.allChecks,
          [action.curKey]: { ...prev, [action.itemId]: action.checked },
        },
      };
    }

    case "SET_COPY": {
      const prev = state.allCopies[action.curKey] || {};
      return {
        ...state,
        allCopies: {
          ...state.allCopies,
          [action.curKey]: { ...prev, [action.itemId]: action.copy },
        },
      };
    }

    case "UPDATE_SEQ":
      return {
        ...state,
        seqDataMap: { ...state.seqDataMap, [action.curKey]: action.seq },
      };

    case "ADD_FEEDBACK":
      return { ...state, feedbacks: [...state.feedbacks, action.feedback] };

    case "SET_PLATFORM_COLOR":
      return {
        ...state,
        platformColors: { ...state.platformColors, [action.platform]: action.color },
      };

    case "PM_RENAME_KEYS": {
      const newChecks = renameKeys(state.allChecks, action.renameMap);
      const newCopies = renameKeys(state.allCopies, action.renameMap);
      const newSeqMap = renameKeys(state.seqDataMap, action.renameMap);
      return { ...state, allChecks: newChecks, allCopies: newCopies, seqDataMap: newSeqMap };
    }

    case "PM_DELETE_KEY": {
      const allChecks = { ...state.allChecks };
      const allCopies = { ...state.allCopies };
      const seqDataMap = { ...state.seqDataMap };
      delete allChecks[action.curKey];
      delete allCopies[action.curKey];
      delete seqDataMap[action.curKey];
      return { ...state, allChecks, allCopies, seqDataMap };
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

export function selectChecks(state: PmState, curKey: string): Record<string, boolean> {
  return state.allChecks[curKey] || {};
}

export function selectCopies(state: PmState, curKey: string): Record<string, CopyData> {
  return state.allCopies[curKey] || {};
}

export function selectSeq(state: PmState, curKey: string): SeqPhase[] | null {
  return state.seqDataMap[curKey] || null;
}
