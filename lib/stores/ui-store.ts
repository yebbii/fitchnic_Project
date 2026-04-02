/**
 * UI Store — 탭·뷰·선택 상태
 *
 * 담당 데이터: topTab, tab, designerTab, homeCalView,
 *            ins, lec (PM 선택), designerIns, designerLec (디자이너 선택)
 *
 * 이 store는 localStorage에 저장하지 않는 휘발성 UI 상태만 관리한다.
 */

import type { TabId, TopTabId, DesignerTabId, HomeCalendarView } from "@/lib/types";

/* ── State ── */

export interface UiState {
  topTab: TopTabId;
  tab: TabId;
  designerTab: DesignerTabId;
  homeCalView: HomeCalendarView;
  ins: string;
  lec: string;
  designerIns: string;
  designerLec: string;
}

export const uiInitialState: UiState = {
  topTab: "home",
  tab: "dashboard",
  designerTab: "calendar",
  homeCalView: "all",
  ins: "",
  lec: "",
  designerIns: "",
  designerLec: "",
};

/* ── Actions ── */

export type UiAction =
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
  | { type: "UI_NAVIGATE_TO_BOARD"; ins: string; lec: string }
  | { type: "UI_NAVIGATE_TO_DESIGNER_TIMELINE"; ins: string; lec: string };

/* ── Reducer ── */

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "SET_TOP_TAB":
      return {
        ...state,
        topTab: action.tab,
        tab: "dashboard",
        designerTab: "calendar",
        ins: "", lec: "",
        designerIns: "", designerLec: "",
      };

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

    case "UI_NAVIGATE_TO_BOARD":
      return { ...state, ins: action.ins, lec: action.lec, topTab: "pm", tab: "board" };

    case "UI_NAVIGATE_TO_DESIGNER_TIMELINE":
      return { ...state, designerIns: action.ins, designerLec: action.lec, topTab: "designer", designerTab: "timeline" };

    default:
      return state;
  }
}
