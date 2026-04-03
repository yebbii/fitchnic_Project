/**
 * 중앙화된 파생 데이터 훅
 * 모든 탭(홈/PM/디자이너)이 동일한 데이터를 참조하여 숫자 불일치를 방지합니다.
 */
import { useMemo } from "react";
import { useCrm } from "./use-crm-store";
import { DEFAULT_SEQ } from "@/lib/constants";
import { resolveColor, daysUntil, seqTotalItems, seqCheckedItems, getDesignerProgress } from "@/lib/utils";

export interface LectureSummary {
  ins: string;
  lec: string;
  curKey: string;
  color: string;
  platform: string;
  liveDate: string;
  liveTime: string;
  status: "active" | "standby" | "completed";
  daysLeft: number;
  pmTotal: number;
  pmChecked: number;
  pmCopied: number;
  desTotal: number;
  desChecked: number;
  phasesDone: number;
  phasesTotal: number;
}

export interface LiveEvent {
  date: string;
  ins: string;
  lec: string;
  color: string;
  platform: string;
}

/**
 * 전체 강의 요약 데이터 (모든 탭에서 동일한 결과 보장)
 * - active/completed 모두 포함
 * - seqDataMap을 사용하여 커스텀 시퀀스 반영
 */
export function useLectureSummaries(): LectureSummary[] {
  const { state } = useCrm();
  return useMemo(() => {
    const result: LectureSummary[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures).forEach(([lec, lD]) => {
        const curKey = `${ins}|${lec}`;
        const color = resolveColor(state.platformColors, lD.platform);
        const seq = state.seqDataMap[curKey] || DEFAULT_SEQ;
        const ck = state.allChecks[curKey] || {};
        const cp = state.allCopies[curKey] || {};
        const pmTotal = seqTotalItems(seq);
        const pmChecked = seqCheckedItems(seq, ck);
        const desProg = getDesignerProgress(curKey, state.designerMilestones);
        let phasesDone = 0;
        for (const phase of seq) {
          if (phase.items.every((it) => ck[it.id])) phasesDone++;
        }
        result.push({
          ins, lec, curKey, color, platform: lD.platform || "",
          liveDate: lD.liveDate, liveTime: lD.liveTime || "",
          status: lD.status, daysLeft: lD.liveDate ? daysUntil(lD.liveDate) : 999,
          pmTotal, pmChecked, pmCopied: Object.keys(cp).length,
          desTotal: desProg.total, desChecked: desProg.checked,
          phasesDone, phasesTotal: seq.length,
        });
      });
    });
    return result;
  }, [state.data, state.allChecks, state.allCopies, state.seqDataMap, state.platformColors, state.designerMilestones]);
}

/** 진행중 강의만 필터 + D-day 가까운 순 정렬 */
export function useActiveLectures(): LectureSummary[] {
  const all = useLectureSummaries();
  return useMemo(
    () => all.filter((l) => l.status === "active" && l.liveDate).sort((a, b) => a.daysLeft - b.daysLeft),
    [all],
  );
}

/** 완료 강의만 필터 + 최신순 정렬 */
export function useCompletedLectures(): LectureSummary[] {
  const all = useLectureSummaries();
  return useMemo(
    () => all.filter((l) => l.status === "completed" && l.liveDate).sort((a, b) => b.liveDate.localeCompare(a.liveDate)),
    [all],
  );
}

/** LIVE 이벤트 (모든 탭에서 동일한 결과) — liveDate가 있는 모든 강의 */
export function useLiveEvents(): LiveEvent[] {
  const { state } = useCrm();
  return useMemo(() => {
    const ev: LiveEvent[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          ev.push({
            date: lD.liveDate,
            ins, lec,
            color: resolveColor(state.platformColors, lD.platform),
            platform: lD.platform || "",
          });
        });
    });
    return ev;
  }, [state.data, state.platformColors]);
}

/** 강사별 통계 (자동 집계) */
export interface InstructorStats {
  name: string;
  totalLectures: number;
  activeLectures: number;
  standbyLectures: number;
  completedLectures: number;
  lastLiveDate: string | null;
  platforms: string[];
}

export function useInstructorStats(): InstructorStats[] {
  const { state } = useCrm();
  return useMemo(() => {
    return Object.entries(state.data).map(([name, iD]) => {
      const lectures = Object.values(iD.lectures);
      const liveDates = lectures.filter((l) => l.liveDate).map((l) => l.liveDate).sort();
      return {
        name,
        totalLectures: lectures.length,
        activeLectures: lectures.filter((l) => l.status === "active").length,
        standbyLectures: lectures.filter((l) => l.status === "standby").length,
        completedLectures: lectures.filter((l) => l.status === "completed").length,
        lastLiveDate: liveDates.length ? liveDates[liveDates.length - 1] : null,
        platforms: [...new Set(lectures.map((l) => l.platform).filter(Boolean))],
      };
    });
  }, [state.data]);
}
