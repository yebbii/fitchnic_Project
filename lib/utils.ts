import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lecture, SeqItem } from "./types";

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
