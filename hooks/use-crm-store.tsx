"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  CrmData,
  ChecksMap,
  CopiesMap,
  SeqDataMap,
  Feedback,
  TabId,
  TopTabId,
  DesignerTabId,
  HomeCalendarView,
  DesignChecksMap,
  WorkLog,
  Lecture,
  SeqPhase,
  DesignerMilestonesMap,
  MilestoneId,
  Assignee,
  MilestoneMetaMap,
} from "@/lib/types";
import { INIT_DATA, DEFAULT_SEQ, DEFAULT_PLATFORM_COLORS, DESIGNER_MILESTONES } from "@/lib/constants";
import { storage } from "@/lib/storage";

/* ─── State ─── */
interface CrmState {
  data: CrmData;
  allChecks: ChecksMap;
  allCopies: CopiesMap;
  seqDataMap: SeqDataMap;
  feedbacks: Feedback[];
  topTab: TopTabId;
  tab: TabId;           // PM 서브탭
  designerTab: DesignerTabId;
  homeCalView: HomeCalendarView;
  designChecks: DesignChecksMap;
  workLogs: WorkLog[];
  platformColors: Record<string, string>;
  designerMilestones: DesignerMilestonesMap;
  designerProjectAssignees: Record<string, string>;
  pmProjectAssignees: Record<string, string>;
  milestoneMeta: MilestoneMetaMap;
  assignees: Assignee[];
  ins: string;           // PM 선택
  lec: string;
  designerIns: string;   // 디자이너 선택
  designerLec: string;
  hydrated: boolean;
}

const initialState: CrmState = {
  data: INIT_DATA,
  allChecks: {},
  allCopies: {},
  seqDataMap: {},
  feedbacks: [],
  topTab: "home",
  tab: "dashboard",
  designerTab: "calendar",
  homeCalView: "all",
  designChecks: {},
  workLogs: [],
  platformColors: DEFAULT_PLATFORM_COLORS,
  designerMilestones: {},
  designerProjectAssignees: {},
  pmProjectAssignees: {},
  milestoneMeta: {},
  assignees: [],
  ins: "",
  lec: "",
  designerIns: "",
  designerLec: "",
  hydrated: false,
};

/* ─── Actions ─── */
type Action =
  | { type: "HYDRATE"; data: CrmData; checks: ChecksMap; copies: CopiesMap; seqDataMap: SeqDataMap; feedbacks: Feedback[]; designChecks: DesignChecksMap; workLogs: WorkLog[]; platformColors: Record<string, string>; designerMilestones: DesignerMilestonesMap; designerProjectAssignees: Record<string, string>; pmProjectAssignees: Record<string, string>; milestoneMeta: MilestoneMetaMap; assignees: Assignee[] }
  | { type: "SET_DESIGNER_PROJECT_ASSIGNEE"; curKey: string; assignee: string }
  | { type: "SET_PM_PROJECT_ASSIGNEE"; curKey: string; assignee: string }
  | { type: "ADD_ASSIGNEE"; assignee: Assignee }
  | { type: "UPDATE_ASSIGNEE"; id: string; name: string; color: string }
  | { type: "DELETE_ASSIGNEE"; id: string }
  | { type: "SET_DESIGNER_MILESTONE"; curKey: string; milestoneId: MilestoneId; checked?: boolean; assignee?: string }
  | { type: "SET_MILESTONE_META"; curKey: string; field: string; value: string }
  | { type: "SET_TOP_TAB"; tab: TopTabId }
  | { type: "SET_TAB"; tab: TabId }
  | { type: "SET_DESIGNER_TAB"; tab: DesignerTabId }
  | { type: "SET_HOME_CAL_VIEW"; view: HomeCalendarView }
  | { type: "SELECT_INSTRUCTOR"; ins: string }
  | { type: "SELECT_LECTURE"; lec: string }
  | { type: "SELECT_LECTURE_AND_NAV"; ins: string; lec: string; tab: TabId }
  | { type: "SELECT_DESIGNER_INSTRUCTOR"; ins: string }
  | { type: "SELECT_DESIGNER_LECTURE"; lec: string }
  | { type: "SELECT_DESIGNER_LECTURE_AND_NAV"; ins: string; lec: string }
  | { type: "SET_DATA"; data: CrmData }
  | { type: "UPDATE_LECTURE_FIELD"; ins: string; lec: string; field: string; value: unknown }
  | { type: "ADD_LECTURE"; ins: string; lec: string; lecture: Lecture; color: string }
  | { type: "SET_CHECK"; curKey: string; itemId: string; checked: boolean }
  | { type: "SET_COPY"; curKey: string; itemId: string; copy: { text: string; edited: string; status: "ai" | "edited" } }
  | { type: "UPDATE_SEQ"; curKey: string; seq: SeqPhase[] }
  | { type: "ADD_FEEDBACK"; feedback: Feedback }
  | { type: "COMPLETE_LECTURE"; ins: string; lec: string }
  | { type: "REACTIVATE_LECTURE"; ins: string; lec: string }
  | { type: "RENAME_LECTURE"; ins: string; oldLec: string; newLec: string }
  | { type: "SET_DESIGN_CHECK"; lectureKey: string; itemId: string; checked: boolean }
  | { type: "ADD_WORK_LOG"; log: WorkLog }
  | { type: "UPDATE_WORK_LOG"; id: string; content: string }
  | { type: "DELETE_WORK_LOG"; id: string }
  | { type: "RENAME_INSTRUCTOR"; oldIns: string; newIns: string }
  | { type: "SET_INSTRUCTOR_COLOR"; ins: string; color: string }
  | { type: "SET_PLATFORM_COLOR"; platform: string; color: string }
  | { type: "DELETE_LECTURE"; ins: string; lec: string };

function reducer(state: CrmState, action: Action): CrmState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        data: action.data,
        allChecks: action.checks,
        allCopies: action.copies,
        seqDataMap: action.seqDataMap,
        feedbacks: action.feedbacks,
        designChecks: action.designChecks,
        workLogs: action.workLogs,
        platformColors: { ...DEFAULT_PLATFORM_COLORS, ...action.platformColors },
        designerMilestones: action.designerMilestones,
        designerProjectAssignees: action.designerProjectAssignees,
        pmProjectAssignees: action.pmProjectAssignees,
        milestoneMeta: action.milestoneMeta,
        assignees: action.assignees,
        hydrated: true,
      };
    case "SET_TOP_TAB":
      return { ...state, topTab: action.tab };
    case "SET_TAB":
      return { ...state, tab: action.tab };
    case "SET_DESIGNER_TAB":
      return { ...state, designerTab: action.tab };
    case "SET_HOME_CAL_VIEW":
      return { ...state, homeCalView: action.view };
    case "SELECT_INSTRUCTOR":
      return { ...state, ins: action.ins, lec: "" };
    case "SELECT_LECTURE":
      return { ...state, lec: action.lec };
    case "SELECT_LECTURE_AND_NAV":
      return { ...state, ins: action.ins, lec: action.lec, tab: action.tab };
    case "SELECT_DESIGNER_INSTRUCTOR":
      return { ...state, designerIns: action.ins, designerLec: "" };
    case "SELECT_DESIGNER_LECTURE":
      return { ...state, designerLec: action.lec };
    case "SELECT_DESIGNER_LECTURE_AND_NAV":
      return { ...state, designerIns: action.ins, designerLec: action.lec };
    case "SET_DATA":
      return { ...state, data: action.data };
    case "UPDATE_LECTURE_FIELD": {
      const d = { ...state.data };
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        [action.field]: action.value,
      };
      return { ...state, data: d };
    }
    case "ADD_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]) {
        d[action.ins] = { color: action.color, lectures: {} };
      } else {
        d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      }
      d[action.ins].lectures[action.lec] = action.lecture;
      return { ...state, data: d, ins: action.ins, lec: action.lec, topTab: "pm", tab: "board" };
    }
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
    case "COMPLETE_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]?.lectures?.[action.lec]) return state;
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        status: "completed",
      };
      return { ...state, data: d };
    }
    case "REACTIVATE_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]?.lectures?.[action.lec]) return state;
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        status: "active",
      };
      return { ...state, data: d, ins: action.ins, lec: action.lec, topTab: "pm", tab: "board" };
    }
    case "RENAME_LECTURE": {
      const { ins, oldLec, newLec } = action;
      if (!newLec.trim() || oldLec === newLec) return state;
      if (!state.data[ins]?.lectures?.[oldLec]) return state;
      if (state.data[ins].lectures[newLec]) return state;

      const d = { ...state.data };
      d[ins] = { ...d[ins], lectures: { ...d[ins].lectures } };
      const { [oldLec]: lecData, ...rest } = d[ins].lectures;
      d[ins].lectures = { ...rest, [newLec]: lecData };

      const oldKey = `${ins}|${oldLec}`;
      const newKey = `${ins}|${newLec}`;
      const newChecks = { ...state.allChecks };
      const newCopies = { ...state.allCopies };
      const newSeqMap = { ...state.seqDataMap };
      const newDesignChecks = { ...state.designChecks };

      if (newChecks[oldKey]) { newChecks[newKey] = newChecks[oldKey]; delete newChecks[oldKey]; }
      if (newCopies[oldKey]) { newCopies[newKey] = newCopies[oldKey]; delete newCopies[oldKey]; }
      if (newSeqMap[oldKey]) { newSeqMap[newKey] = newSeqMap[oldKey]; delete newSeqMap[oldKey]; }
      if (newDesignChecks[oldKey]) { newDesignChecks[newKey] = newDesignChecks[oldKey]; delete newDesignChecks[oldKey]; }

      return {
        ...state,
        data: d,
        allChecks: newChecks,
        allCopies: newCopies,
        seqDataMap: newSeqMap,
        designChecks: newDesignChecks,
        lec: state.lec === oldLec && state.ins === ins ? newLec : state.lec,
      };
    }
    case "SET_INSTRUCTOR_COLOR": {
      if (!state.data[action.ins]) return state;
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const d = { ...state.data };
      const lectures = { ...d[action.ins].lectures };
      Object.keys(lectures).forEach((lec) => {
        const l = lectures[lec];
        if (l.liveDate && l.liveDate >= todayStr) {
          lectures[lec] = { ...l, color: action.color };
        }
      });
      d[action.ins] = { ...d[action.ins], color: action.color, lectures };
      return { ...state, data: d };
    }
    case "SET_PLATFORM_COLOR":
      return {
        ...state,
        platformColors: { ...state.platformColors, [action.platform]: action.color },
      };
    case "RENAME_INSTRUCTOR": {
      const { oldIns, newIns } = action;
      if (!newIns.trim() || oldIns === newIns) return state;
      if (state.data[newIns]) return state;
      if (!state.data[oldIns]) return state;

      const d = { ...state.data };
      d[newIns] = d[oldIns];
      delete d[oldIns];

      const newChecks = { ...state.allChecks };
      const newCopies = { ...state.allCopies };
      const newSeqMap = { ...state.seqDataMap };
      const newDesignChecks = { ...state.designChecks };

      Object.keys(d[newIns].lectures).forEach((lec) => {
        const oldKey = `${oldIns}|${lec}`;
        const newKey = `${newIns}|${lec}`;
        if (newChecks[oldKey]) { newChecks[newKey] = newChecks[oldKey]; delete newChecks[oldKey]; }
        if (newCopies[oldKey]) { newCopies[newKey] = newCopies[oldKey]; delete newCopies[oldKey]; }
        if (newSeqMap[oldKey]) { newSeqMap[newKey] = newSeqMap[oldKey]; delete newSeqMap[oldKey]; }
        if (newDesignChecks[oldKey]) { newDesignChecks[newKey] = newDesignChecks[oldKey]; delete newDesignChecks[oldKey]; }
      });

      return {
        ...state,
        data: d,
        allChecks: newChecks,
        allCopies: newCopies,
        seqDataMap: newSeqMap,
        designChecks: newDesignChecks,
        ins: state.ins === oldIns ? newIns : state.ins,
      };
    }
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
    case "SET_DESIGNER_PROJECT_ASSIGNEE":
      return {
        ...state,
        designerProjectAssignees: { ...state.designerProjectAssignees, [action.curKey]: action.assignee },
      };
    case "SET_PM_PROJECT_ASSIGNEE":
      return {
        ...state,
        pmProjectAssignees: { ...state.pmProjectAssignees, [action.curKey]: action.assignee },
      };
    case "SET_MILESTONE_META": {
      const prev = state.milestoneMeta[action.curKey] || {};
      return {
        ...state,
        milestoneMeta: { ...state.milestoneMeta, [action.curKey]: { ...prev, [action.field]: action.value } },
      };
    }
    case "ADD_ASSIGNEE":
      return { ...state, assignees: [...state.assignees, action.assignee] };
    case "UPDATE_ASSIGNEE":
      return { ...state, assignees: state.assignees.map((a) => a.id === action.id ? { ...a, name: action.name, color: action.color } : a) };
    case "DELETE_ASSIGNEE":
      return { ...state, assignees: state.assignees.filter((a) => a.id !== action.id) };
    case "DELETE_LECTURE": {
      const nextData = { ...state.data };
      if (nextData[action.ins]) {
        const lectures = { ...nextData[action.ins].lectures };
        delete lectures[action.lec];
        if (Object.keys(lectures).length === 0) {
          delete nextData[action.ins];
        } else {
          nextData[action.ins] = { ...nextData[action.ins], lectures };
        }
      }
      const curKey = `${action.ins}|${action.lec}`;
      const allChecks = { ...state.allChecks };
      const designChecks = { ...state.designChecks };
      const seqDataMap = { ...state.seqDataMap };
      delete allChecks[curKey];
      delete designChecks[curKey];
      delete seqDataMap[curKey];
      return { ...state, data: nextData, allChecks, designChecks, seqDataMap };
    }
    default:
      return state;
  }
}

/* ─── Context ─── */
interface CrmContextValue {
  state: CrmState;
  dispatch: React.Dispatch<Action>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage
  useEffect(() => {
    const d = storage.loadData() || INIT_DATA;
    const c = storage.loadChecks() || {};
    const cp = storage.loadCopies() || {};
    const sm = storage.loadSeqDataMap() || {};
    const fb = storage.loadFeedbacks() || [];
    const dc = storage.loadDesignChecks() || {};
    const wl = storage.loadWorkLogs() || [];
    const pc = storage.loadPlatformColors() || {};
    const dm = storage.loadDesignerMilestones() || {};
    const pa = storage.loadDesignerProjectAssignees() || {};
    const pma = storage.loadPmProjectAssignees() || {};
    const mm = storage.loadMilestoneMeta() || {};
    const as = storage.loadAssignees() || [];
    dispatch({ type: "HYDRATE", data: d, checks: c, copies: cp, seqDataMap: sm, feedbacks: fb, designChecks: dc, workLogs: wl, platformColors: pc, designerMilestones: dm, designerProjectAssignees: pa, pmProjectAssignees: pma, milestoneMeta: mm, assignees: as });
  }, []);

  // Auto-complete lectures past D+2
  useEffect(() => {
    if (!state.hydrated) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures).forEach(([lec, lD]) => {
        if (lD.status !== "active" || !lD.liveDate) return;
        const live = new Date(lD.liveDate);
        live.setHours(0, 0, 0, 0);
        const diff = (now.getTime() - live.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 2) {
          dispatch({ type: "COMPLETE_LECTURE", ins, lec });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated]);

  // Debounced auto-save to localStorage (500ms)
  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveData(state.data), 500);
    return () => clearTimeout(t);
  }, [state.data, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveChecks(state.allChecks), 500);
    return () => clearTimeout(t);
  }, [state.allChecks, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveCopies(state.allCopies), 500);
    return () => clearTimeout(t);
  }, [state.allCopies, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveSeqDataMap(state.seqDataMap), 500);
    return () => clearTimeout(t);
  }, [state.seqDataMap, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveFeedbacks(state.feedbacks), 500);
    return () => clearTimeout(t);
  }, [state.feedbacks, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveDesignChecks(state.designChecks), 500);
    return () => clearTimeout(t);
  }, [state.designChecks, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveWorkLogs(state.workLogs), 500);
    return () => clearTimeout(t);
  }, [state.workLogs, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.savePlatformColors(state.platformColors), 500);
    return () => clearTimeout(t);
  }, [state.platformColors, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveDesignerMilestones(state.designerMilestones), 500);
    return () => clearTimeout(t);
  }, [state.designerMilestones, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveAssignees(state.assignees), 500);
    return () => clearTimeout(t);
  }, [state.assignees, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveDesignerProjectAssignees(state.designerProjectAssignees), 500);
    return () => clearTimeout(t);
  }, [state.designerProjectAssignees, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.savePmProjectAssignees(state.pmProjectAssignees), 500);
    return () => clearTimeout(t);
  }, [state.pmProjectAssignees, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => storage.saveMilestoneMeta(state.milestoneMeta), 500);
    return () => clearTimeout(t);
  }, [state.milestoneMeta, state.hydrated]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

/* ─── Hooks ─── */
export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside CrmProvider");
  return ctx;
}

export function useCurKey(): string {
  const { state } = useCrm();
  return state.ins && state.lec ? `${state.ins}|${state.lec}` : "";
}

export function useCurrentLecture(): import("@/lib/types").Lecture | null {
  const { state } = useCrm();
  if (!state.ins || !state.lec) return null;
  return state.data[state.ins]?.lectures?.[state.lec] || null;
}

export function useCurrentSeq(): SeqPhase[] {
  const { state } = useCrm();
  const curKey = state.ins && state.lec ? `${state.ins}|${state.lec}` : "";
  return state.seqDataMap[curKey] || JSON.parse(JSON.stringify(DEFAULT_SEQ));
}

export function useGoToBoard() {
  const { dispatch } = useCrm();
  return useCallback(
    (ins: string, lec: string) => {
      dispatch({ type: "SELECT_LECTURE_AND_NAV", ins, lec, tab: "board" });
      dispatch({ type: "SET_TOP_TAB", tab: "pm" });
    },
    [dispatch]
  );
}

export function useGoToDesignerTimeline() {
  const { dispatch } = useCrm();
  return useCallback(
    (ins: string, lec: string) => {
      dispatch({ type: "SELECT_DESIGNER_LECTURE_AND_NAV", ins, lec });
      dispatch({ type: "SET_TOP_TAB", tab: "designer" });
      dispatch({ type: "SET_DESIGNER_TAB", tab: "timeline" });
    },
    [dispatch]
  );
}

export function useDesignerCurKey(): string {
  const { state } = useCrm();
  return state.designerIns && state.designerLec ? `${state.designerIns}|${state.designerLec}` : "";
}

export function useDesignerCurrentLecture(): import("@/lib/types").Lecture | null {
  const { state } = useCrm();
  if (!state.designerIns || !state.designerLec) return null;
  return state.data[state.designerIns]?.lectures?.[state.designerLec] || null;
}

/**
 * 마일스톤 블록(캘린더)과 타임라인 블록의 완료 상태를 동기화하는 공용 토글 훅.
 * 상위 체크 시 하위 전부 완료 + 스냅샷 저장, 해제 시 스냅샷 복원.
 */
export function useToggleDesignerMilestone() {
  const { state, dispatch } = useCrm();

  const isSubChecked = useCallback(
    (curKey: string, sub: { id: string; type?: string }) => {
      if (sub.type === "benefit") return state.milestoneMeta[curKey]?.benefitDone === "true";
      if (sub.type === "live_setting") return state.milestoneMeta[curKey]?.ls_masterDone === "true";
      return !!state.designChecks[curKey]?.[sub.id];
    },
    [state.designChecks, state.milestoneMeta],
  );

  const toggle = useCallback(
    (curKey: string, ms: (typeof DESIGNER_MILESTONES)[number]) => {
      const milestones = state.designerMilestones[curKey] || {};
      const item = milestones[ms.id] || { checked: false, assignee: "" };
      const subs = ms.subItems || [];

      if (!item.checked) {
        // 체크: 스냅샷 저장 후 하위 전부 완료
        const snapshot: Record<string, boolean> = {};
        subs.forEach((sub) => { snapshot[sub.id] = isSubChecked(curKey, sub); });
        dispatch({ type: "SET_MILESTONE_META", curKey, field: `snapshot_${ms.id}`, value: JSON.stringify(snapshot) });
        subs.forEach((sub) => {
          if (sub.type === "benefit") dispatch({ type: "SET_MILESTONE_META", curKey, field: "benefitDone", value: "true" });
          else if (sub.type === "live_setting") dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "true" });
          else dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: sub.id, checked: true });
        });
        dispatch({ type: "SET_DESIGNER_MILESTONE", curKey, milestoneId: ms.id as MilestoneId, checked: true });
      } else {
        // 해제: 스냅샷에서 복원
        const raw = state.milestoneMeta[curKey]?.[`snapshot_${ms.id}`];
        const snapshot: Record<string, boolean> = raw ? JSON.parse(raw) : {};
        subs.forEach((sub) => {
          const prev = snapshot[sub.id] ?? false;
          if (sub.type === "benefit") dispatch({ type: "SET_MILESTONE_META", curKey, field: "benefitDone", value: prev ? "true" : "" });
          else if (sub.type === "live_setting") dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: prev ? "true" : "" });
          else dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: sub.id, checked: prev });
        });
        dispatch({ type: "SET_DESIGNER_MILESTONE", curKey, milestoneId: ms.id as MilestoneId, checked: false });
        // 자동 완료 후 수동 해제 시 → dismissed 표시하여 재자동완료 방지
        const autoKey = `autoCompleted_${ms.id}`;
        if (state.milestoneMeta[curKey]?.[autoKey] === "done") {
          dispatch({ type: "SET_MILESTONE_META", curKey, field: autoKey, value: "dismissed" });
        }
      }
    },
    [state.designerMilestones, state.milestoneMeta, isSubChecked, dispatch],
  );

  return toggle;
}
