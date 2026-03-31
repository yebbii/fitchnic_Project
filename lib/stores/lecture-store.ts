/**
 * Lecture Store — 강의 도메인
 *
 * 담당 데이터: CrmData (강사 → 강의 Record)
 * 담당 액션: SET_DATA, ADD_LECTURE, UPDATE_LECTURE_FIELD,
 *           COMPLETE_LECTURE, REACTIVATE_LECTURE, RENAME_LECTURE,
 *           DELETE_LECTURE, RENAME_INSTRUCTOR
 */

import type { CrmData, Lecture } from "@/lib/types";
import { INIT_DATA } from "@/lib/constants";

/* ── State ── */

export interface LectureState {
  data: CrmData;
}

export const lectureInitialState: LectureState = {
  data: INIT_DATA,
};

/* ── Actions ── */

export type LectureAction =
  | { type: "LECTURE_HYDRATE"; data: CrmData }
  | { type: "SET_DATA"; data: CrmData }
  | { type: "ADD_LECTURE"; ins: string; lec: string; lecture: Lecture }
  | { type: "UPDATE_LECTURE_FIELD"; ins: string; lec: string; field: string; value: unknown }
  | { type: "COMPLETE_LECTURE"; ins: string; lec: string }
  | { type: "REACTIVATE_LECTURE"; ins: string; lec: string }
  | { type: "RENAME_LECTURE"; ins: string; oldLec: string; newLec: string }
  | { type: "DELETE_LECTURE"; ins: string; lec: string }
  | { type: "RENAME_INSTRUCTOR"; oldIns: string; newIns: string };

/* ── Reducer ── */

export function lectureReducer(state: LectureState, action: LectureAction): LectureState {
  switch (action.type) {
    case "LECTURE_HYDRATE":
      return { data: action.data };

    case "SET_DATA":
      return { data: action.data };

    case "ADD_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]) {
        d[action.ins] = { lectures: {} };
      } else {
        d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      }
      d[action.ins].lectures[action.lec] = action.lecture;
      return { data: d };
    }

    case "UPDATE_LECTURE_FIELD": {
      const d = { ...state.data };
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        [action.field]: action.value,
      };
      return { data: d };
    }

    case "COMPLETE_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]?.lectures?.[action.lec]) return state;
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        status: "completed",
      };
      return { data: d };
    }

    case "REACTIVATE_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]?.lectures?.[action.lec]) return state;
      d[action.ins] = { ...d[action.ins], lectures: { ...d[action.ins].lectures } };
      d[action.ins].lectures[action.lec] = {
        ...d[action.ins].lectures[action.lec],
        status: "active",
      };
      return { data: d };
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
      return { data: d };
    }

    case "DELETE_LECTURE": {
      const d = { ...state.data };
      if (!d[action.ins]) return state;
      const lectures = { ...d[action.ins].lectures };
      delete lectures[action.lec];
      if (Object.keys(lectures).length === 0) {
        delete d[action.ins];
      } else {
        d[action.ins] = { ...d[action.ins], lectures };
      }
      return { data: d };
    }

    case "RENAME_INSTRUCTOR": {
      const { oldIns, newIns } = action;
      if (!newIns.trim() || oldIns === newIns) return state;
      if (state.data[newIns]) return state;
      if (!state.data[oldIns]) return state;

      const d = { ...state.data };
      d[newIns] = d[oldIns];
      delete d[oldIns];
      return { data: d };
    }

    default:
      return state;
  }
}

/* ── Selectors ── */

export function selectLecture(data: CrmData, ins: string, lec: string): Lecture | null {
  return data[ins]?.lectures?.[lec] || null;
}

export function selectActiveLectures(data: CrmData): Array<{ ins: string; lec: string; lecture: Lecture }> {
  const result: Array<{ ins: string; lec: string; lecture: Lecture }> = [];
  Object.entries(data).forEach(([ins, iD]) => {
    Object.entries(iD.lectures).forEach(([lec, lecture]) => {
      if (lecture.status === "active") result.push({ ins, lec, lecture });
    });
  });
  return result;
}

export function selectCompletedLectures(data: CrmData): Array<{ ins: string; lec: string; lecture: Lecture }> {
  const result: Array<{ ins: string; lec: string; lecture: Lecture }> = [];
  Object.entries(data).forEach(([ins, iD]) => {
    Object.entries(iD.lectures).forEach(([lec, lecture]) => {
      if (lecture.status === "completed") result.push({ ins, lec, lecture });
    });
  });
  return result;
}

/**
 * curKey 리네임 맵 생성 (강의명 변경 / 강사명 변경 시)
 * 호출측에서 PM·Designer store의 키 마이그레이션에 사용
 */
export function buildKeyRenameMap(
  action: { type: "RENAME_LECTURE"; ins: string; oldLec: string; newLec: string } |
          { type: "RENAME_INSTRUCTOR"; oldIns: string; newIns: string },
  data: CrmData,
): Map<string, string> {
  const map = new Map<string, string>();
  if (action.type === "RENAME_LECTURE") {
    map.set(`${action.ins}|${action.oldLec}`, `${action.ins}|${action.newLec}`);
  } else {
    const insData = data[action.oldIns];
    if (insData) {
      Object.keys(insData.lectures).forEach((lec) => {
        map.set(`${action.oldIns}|${lec}`, `${action.newIns}|${lec}`);
      });
    }
  }
  return map;
}
