/**
 * Assignee Store — 담당자 도메인
 *
 * 담당 데이터: assignees[], designerProjectAssignees, pmProjectAssignees
 * 담당 액션: ADD/UPDATE/DELETE_ASSIGNEE,
 *           SET_DESIGNER_PROJECT_ASSIGNEE, SET_PM_PROJECT_ASSIGNEE
 */

import type { Assignee } from "@/lib/types";

/* ── State ── */

export interface AssigneeState {
  assignees: Assignee[];
  designerProjectAssignees: Record<string, string>;
  pmProjectAssignees: Record<string, string>;
}

export const assigneeInitialState: AssigneeState = {
  assignees: [],
  designerProjectAssignees: {},
  pmProjectAssignees: {},
};

/* ── Actions ── */

export type AssigneeAction =
  | { type: "ASSIGNEE_HYDRATE"; assignees: Assignee[]; designerProjectAssignees: Record<string, string>; pmProjectAssignees: Record<string, string> }
  | { type: "ADD_ASSIGNEE"; assignee: Assignee }
  | { type: "UPDATE_ASSIGNEE"; id: string; name: string; color: string }
  | { type: "DELETE_ASSIGNEE"; id: string }
  | { type: "SET_DESIGNER_PROJECT_ASSIGNEE"; curKey: string; assignee: string }
  | { type: "SET_PM_PROJECT_ASSIGNEE"; curKey: string; assignee: string };

/* ── Reducer ── */

export function assigneeReducer(state: AssigneeState, action: AssigneeAction): AssigneeState {
  switch (action.type) {
    case "ASSIGNEE_HYDRATE":
      return {
        assignees: action.assignees,
        designerProjectAssignees: action.designerProjectAssignees,
        pmProjectAssignees: action.pmProjectAssignees,
      };

    case "ADD_ASSIGNEE":
      return { ...state, assignees: [...state.assignees, action.assignee] };

    case "UPDATE_ASSIGNEE":
      return {
        ...state,
        assignees: state.assignees.map((a) =>
          a.id === action.id ? { ...a, name: action.name, color: action.color } : a
        ),
      };

    case "DELETE_ASSIGNEE":
      return { ...state, assignees: state.assignees.filter((a) => a.id !== action.id) };

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

    default:
      return state;
  }
}

/* ── Selectors ── */

export function selectAssigneesByRole(state: AssigneeState, role: "pm" | "designer"): Assignee[] {
  return state.assignees.filter((a) => a.role === role);
}

export function selectProjectAssignee(state: AssigneeState, curKey: string, role: "pm" | "designer"): string {
  if (role === "designer") return state.designerProjectAssignees[curKey] || "";
  return state.pmProjectAssignees[curKey] || "";
}
