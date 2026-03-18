import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lecture, SeqItem, SeqPhase } from "./types";
import { DESIGNER_MILESTONES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let _c = 1000;
export function uid(): string {
  return `c_${_c++}`;
}

export function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDateKr(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dateStr}(${days[d.getDay()]})`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ── 공통 계산 유틸 ── */

/** 강의 색상 결정 (플랫폼 색상 → 강의 개별 색상 → 강사 색상 → 기본값) */
export function resolveColor(
  platformColors: Record<string, string>,
  platform: string | undefined,
  lectureColor: string | undefined,
  instructorColor: string,
): string {
  return (platform ? platformColors[platform] : undefined) ?? lectureColor ?? instructorColor;
}

/** 오늘 기준 D-day 계산 (양수 = 미래, 0 = 오늘, 음수 = 과거) */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 시퀀스 전체 아이템 수 합산 */
export function seqTotalItems(seq: { items: { id: string }[] }[]): number {
  return seq.reduce((s, phase) => s + phase.items.length, 0);
}

/** 시퀀스 체크된 아이템 수 합산 */
export function seqCheckedItems(seq: SeqPhase[], checks: Record<string, boolean>): number {
  return seq.reduce((s, phase) => s + phase.items.filter((it) => checks[it.id]).length, 0);
}

/** 디자이너 마일스톤 진행률 (모든 탭에서 동일한 결과 보장) */
export function getDesignerProgress(
  curKey: string,
  designerMilestones: Record<string, Record<string, { checked?: boolean; assignee?: string }>>,
): { total: number; checked: number } {
  const ms = designerMilestones[curKey] || {};
  const total = DESIGNER_MILESTONES.length;
  const checked = DESIGNER_MILESTONES.filter((m) => ms[m.id]?.checked).length;
  return { total, checked };
}

export async function fetchAICopy(
  lecture: Lecture,
  instructorName: string,
  seqId: string,
  item: SeqItem,
  lectureName: string,
): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lecture, instructorName, seqId, item, lectureName }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "AI 생성 실패");
  return data.text || genCopyLocal(lecture, instructorName, item);
}

export function genCopyLocal(d: Lecture, ins: string, item: SeqItem): string {
  const u0 = (d.usps || [])[0] || "";
  const p0 = (d.proof || [])[0] || "";
  const eb = d.ebook || "";

  if (item.ch === "문자")
    return `[${u0}]\n\n${p0}\n${ins}이 직접 공개!\n\n▣ 참여: {무료링크}\n\n${eb} 무료!\n마감 전 신청!`;
  if (item.ch === "알림톡")
    return `[${ins} ${d.type}]\n\n${d.liveDate || "곧"}!\n${p0}\n\n참여: {무료링크}`;
  if (item.ch === "이메일")
    return `제목: ${ins}의 ${d.type} 무료특강!\n\n${u0}\n${d.story || ""}\n\n${d.liveDate || ""} ${d.liveTime || ""}\n▶ 무료강의 신청: {무료링크}\n\n★참여혜택\n1. ${eb} 무료\n2. ${p0}`;
  if (item.ch === "채널톡")
    return `🔥 ${ins}의 ${d.type}!\n\n${u0} ✨\n${p0}\n\n👉 {무료링크}\n\n${eb} 무료! 🎁`;
  return `📢 ${ins} 라이브!\n${u0}\n${p0}\n❌다시보기 없음!❌\n🎁 ${eb} 무료!`;
}
