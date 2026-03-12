"use client";

import { useState, useMemo, useEffect } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { COLORS, NEW_LECTURE_INIT, NEW_LECTURE_DEFAULTS } from "@/lib/constants";
import type { NewLectureForm } from "@/lib/types";

/* ─────────── 공통 타입 ─────────── */

interface ParsedRow {
  instructor: string;
  lectureName: string;
  liveDate: string;
  platform?: string;
  valid: boolean;
  partial: boolean;
  raw: string;
}

/* ─────────── 날짜 파싱 ─────────── */

function parseDate(cell: string): string {
  const s = cell.trim();

  let m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\([^\)]*\))?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/^(\d{1,2})[/\-](\d{1,2})$/);
  if (m) {
    const year = new Date().getFullYear();
    return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (m) {
    const year = new Date().getFullYear();
    return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  return "";
}

/* ─────────── 1) 행 목록 파싱 (개선) ─────────── */

function parsePastedRows(text: string): ParsedRow[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((raw) => {
      // 탭 우선, 없으면 2칸 이상 공백으로 분리
      const rawCells = raw.includes("\t")
        ? raw.split("\t").map((c) => c.trim()).filter(Boolean)
        : raw.split(/  +/).map((c) => c.trim()).filter(Boolean);

      let liveDate = "";
      let platform = "";
      const cleanedCells: string[] = [];

      for (const cell of rawCells) {
        // 날짜 우선 처리
        const d = parseDate(cell);
        if (d && !liveDate) { liveDate = d; continue; }

        // [플랫폼] 추출 후 셀에서 제거
        let cleaned = cell;
        const tags = cell.match(/\[([^\]]+)\]/g);
        if (tags) {
          for (const tag of tags) {
            const content = tag.slice(1, -1).trim();
            if (!platform) platform = content;
          }
          cleaned = cell.replace(/\[[^\]]+\]/g, "").trim();
        }
        if (cleaned) cleanedCells.push(cleaned);
      }

      // 첫 셀 = 강사, 나머지 = 강의명
      const instructor = cleanedCells[0] || "";
      const lectureName = cleanedCells.slice(1).join(" ").trim();

      const valid = !!instructor && !!lectureName && !!liveDate;
      const partial = !valid && (!!instructor || !!lectureName || !!liveDate);
      return { instructor, lectureName, liveDate, platform, valid, partial, raw };
    });
}

/* ─────────── 2) 달력 시간표 파싱 ─────────── */

const PLATFORM_TAGS = ["핏크닉", "머니업"];
const DAY_RE = /^(\d{1,2})\([일월화수목금토]\)$/;

function isCalendarFormat(text: string): boolean {
  return /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(text) && /\d+\([일월화수목금토]\)/.test(text);
}

function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    let cell: string;

    if (text[i] === '"') {
      cell = "";
      i++;
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') { cell += '"'; i += 2; }
          else { i++; break; }
        } else { cell += text[i]; i++; }
      }
    } else {
      cell = "";
      while (i < len && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
        cell += text[i]; i++;
      }
    }

    row.push(cell.trim());

    if (i < len && text[i] === '\t') {
      i++;
    } else {
      if (i < len && text[i] === '\r') i++;
      if (i < len && text[i] === '\n') i++;
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function extractLectureFromCell(
  cell: string,
  knownInstructors: string[],
): { instructor: string; lectureName: string; platform: string } | null {
  const lines = cell.split("\n").map((l) => l.trim()).filter(Boolean);

  const platformLine = lines.find((l) => PLATFORM_TAGS.some((p) => l === `[${p}]`));
  if (!platformLine) return null;
  const platform = platformLine.replace(/[\[\]]/g, "");

  const infoLines = lines.filter((l) => l !== platformLine);
  if (infoLines.length === 0) return null;

  const mainInfo = infoLines[0];
  const sorted = [...knownInstructors].sort((a, b) => b.length - a.length);
  let instructor = "";
  let lectureName = "";

  for (const ins of sorted) {
    if (mainInfo.startsWith(ins)) {
      instructor = ins;
      lectureName = mainInfo.slice(ins.length).trim();
      break;
    }
  }

  if (!instructor) {
    const sp = mainInfo.indexOf(" ");
    if (sp > 0) {
      instructor = mainInfo.slice(0, sp);
      lectureName = mainInfo.slice(sp + 1);
    } else {
      instructor = mainInfo;
    }
  }

  if (!lectureName && infoLines.length > 1) {
    const secondLine = infoLines[1];
    const cohortMatch = secondLine.match(/^(.*?\d+기)/);
    if (cohortMatch) lectureName = cohortMatch[1];
  }

  return { instructor, lectureName, platform };
}

function parseCalendarGrid(text: string, knownInstructors: string[]): ParsedRow[] {
  const grid = parseTSV(text);
  const results: ParsedRow[] = [];

  let month = 0;
  const year = new Date().getFullYear();
  for (const row of grid.slice(0, 5)) {
    const joined = row.join(" ");
    const mm = joined.match(/(\d{1,2})월/);
    if (mm) { month = parseInt(mm[1]); break; }
  }
  if (!month) return [];

  let colDateMap = new Map<number, string>();
  const skipRows = new Set<number>();

  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    let foundDays = false;
    const weekMap = new Map<number, string>();

    for (let ci = 0; ci < row.length; ci++) {
      const dm = row[ci]?.match(DAY_RE);
      if (dm) {
        foundDays = true;
        const day = parseInt(dm[1]);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        weekMap.set(ci, dateStr);
        weekMap.set(ci + 1, dateStr);
        weekMap.set(ci + 2, dateStr);
      }
    }

    if (foundDays) {
      colDateMap = weekMap;
      skipRows.add(ri);
      skipRows.add(ri + 1);
      continue;
    }

    if (skipRows.has(ri) || colDateMap.size === 0) continue;

    for (let ci = 1; ci < row.length; ci++) {
      const cell = row[ci];
      if (!cell || !PLATFORM_TAGS.some((p) => cell.includes(`[${p}]`))) continue;

      const date = colDateMap.get(ci) || "";
      const info = extractLectureFromCell(cell, knownInstructors);
      if (!info) continue;

      const { instructor, lectureName, platform } = info;
      const valid = !!instructor && !!lectureName && !!date;
      const partial = !valid && (!!instructor || !!lectureName || !!date);

      results.push({
        instructor, lectureName, liveDate: date, platform,
        valid, partial, raw: cell.replace(/\n/g, " / "),
      });
    }
  }

  return results;
}

function smartParse(text: string, knownInstructors: string[]): { rows: ParsedRow[]; isCalendar: boolean } {
  if (isCalendarFormat(text)) {
    return { rows: parseCalendarGrid(text, knownInstructors), isCalendar: true };
  }
  return { rows: parsePastedRows(text), isCalendar: false };
}

/* ─────────── 컴포넌트 ─────────── */

type Mode = "manual" | "paste";

interface AddLectureDialogProps {
  defaultInstructor?: string;
  onClose: () => void;
}

export default function AddLectureDialog({ defaultInstructor, onClose }: AddLectureDialogProps) {
  const { state, dispatch } = useCrm();
  const [mode, setMode] = useState<Mode>("manual");

  /* 수기 입력 */
  const [form, setForm] = useState<NewLectureForm>({
    ...NEW_LECTURE_INIT,
    instructor: defaultInstructor || "",
  });
  const [newInsColor, setNewInsColor] = useState(COLORS[Object.keys(state.data).length % COLORS.length]);
  const update = (partial: Partial<NewLectureForm>) => setForm((p) => ({ ...p, ...partial }));
  const isNewInstructor = !!form.instructor.trim() && !state.data[form.instructor.trim()];
  const canSubmitManual = !!form.instructor.trim() && !!form.lectureName.trim() && !!form.liveDate;

  /* 붙여넣기 */
  const [pasteText, setPasteText] = useState("");
  const [rowOverrides, setRowOverrides] = useState<Record<number, Partial<ParsedRow>>>({});
  const instructors = Object.keys(state.data);

  const { rows: parsed, isCalendar } = useMemo(
    () => smartParse(pasteText, instructors),
    [pasteText, instructors],
  );

  // 붙여넣기 텍스트 바뀌면 편집 오버라이드 초기화
  useEffect(() => setRowOverrides({}), [pasteText]);

  // 실제 표시 행 (파싱 결과 + 사용자 편집 병합)
  const displayRows = parsed.map((r, i) => {
    const merged = { ...r, ...(rowOverrides[i] ?? {}) };
    const valid = !!merged.instructor?.trim() && !!merged.lectureName?.trim() && !!merged.liveDate;
    return { ...merged, valid, partial: !valid && (!!merged.instructor || !!merged.lectureName || !!merged.liveDate) };
  });
  const validRows = displayRows.filter((r) => r.valid);

  const updateRow = (i: number, field: keyof ParsedRow, value: string) => {
    setRowOverrides((prev) => ({ ...prev, [i]: { ...(prev[i] ?? {}), [field]: value } }));
  };

  /* ── 수기 추가 ── */
  const addManual = () => {
    if (!canSubmitManual) return;
    const ins = form.instructor.trim();
    const color = state.data[ins]?.color ?? newInsColor;
    dispatch({
      type: "ADD_LECTURE",
      ins,
      lec: form.lectureName.trim(),
      color,
      lecture: { ...NEW_LECTURE_DEFAULTS, liveDate: form.liveDate, status: "active" },
    });
    onClose();
  };

  /* ── 붙여넣기 일괄 추가 ── */
  const addPasted = () => {
    if (validRows.length === 0) return;
    let usedColors = Object.keys(state.data).length;

    for (const r of validRows) {
      const color = state.data[r.instructor]?.color ?? COLORS[usedColors++ % COLORS.length];
      dispatch({
        type: "ADD_LECTURE",
        ins: r.instructor,
        lec: r.lectureName,
        color,
        lecture: {
          ...NEW_LECTURE_DEFAULTS,
          ...(r.platform ? { platform: r.platform } : {}),
          liveDate: r.liveDate,
          status: "active",
        },
      });
    }

    const first = validRows[0];
    dispatch({ type: "SELECT_INSTRUCTOR", ins: first.instructor });
    setTimeout(() => {
      dispatch({ type: "SELECT_LECTURE", lec: first.lectureName });
      dispatch({ type: "SET_TOP_TAB", tab: "home" });
    }, 0);
    onClose();
  };

  const tabBtn = (t: Mode, label: string) => (
    <button
      onClick={() => setMode(t)}
      className={`flex-1 py-2 text-sm font-semibold rounded-lg border-none cursor-pointer transition-colors ${
        mode === t ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex justify-center items-center p-5"
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[540px] max-h-[90vh] overflow-auto p-7 shadow-[0_20px_60px_rgba(0,0,0,.15)]"
        style={{ animation: "pop .2s ease" }}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-extrabold">+ 새 강의 추가</h3>
          <button
            onClick={onClose}
            className="bg-secondary text-muted-foreground text-lg w-[34px] h-[34px] rounded-lg border-none cursor-pointer font-semibold"
          >
            ×
          </button>
        </div>

        {/* 모드 탭 */}
        <div className="flex gap-2 mb-5">
          {tabBtn("manual", "수기 입력")}
          {tabBtn("paste", "붙여넣기")}
        </div>

        {/* ── 수기 입력 ── */}
        {mode === "manual" && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[13px] text-muted-foreground mb-1.5 font-semibold">
                강사 <span className="text-red-500">*</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={form.instructor}
                  onChange={(e) => update({ instructor: e.target.value })}
                  className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2.5 text-[15px] outline-none"
                >
                  <option value="">강사 선택 또는 신규 입력 ▼</option>
                  {instructors.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              {/* 신규 강사 직접 입력 */}
              <input
                value={form.instructor}
                onChange={(e) => update({ instructor: e.target.value })}
                placeholder="또는 새 강사명 직접 입력"
                className="w-full mt-1.5 bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2 text-[14px] outline-none"
              />
            </div>

            {/* 신규 강사일 때 색상 지정 */}
            {isNewInstructor && (
              <div>
                <div className="text-[13px] text-muted-foreground mb-1.5 font-semibold">
                  강사 색상 <span className="text-[11px] font-normal text-[#aeaeb2]">(신규 강사)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newInsColor}
                    onChange={(e) => setNewInsColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5"
                  />
                  <input
                    value={newInsColor}
                    onChange={(e) => setNewInsColor(e.target.value)}
                    placeholder="#667eea"
                    className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-[14px] outline-none font-mono"
                  />
                  <div className="flex gap-1">
                    {COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewInsColor(c)}
                        className="w-6 h-6 rounded-full border-2 cursor-pointer"
                        style={{ background: c, borderColor: newInsColor === c ? "#1c1c1e" : "transparent" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-[13px] text-muted-foreground mb-1.5 font-semibold">
                강의명 <span className="text-red-500">*</span>
              </div>
              <input
                value={form.lectureName}
                onChange={(e) => update({ lectureName: e.target.value })}
                placeholder="예: 브랜드파이프 5기"
                className="w-full bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2.5 text-[15px] outline-none"
              />
            </div>

            <div>
              <div className="text-[13px] text-muted-foreground mb-1.5 font-semibold">
                라이브 일자 <span className="text-red-500">*</span>
              </div>
              <input
                type="date"
                value={form.liveDate}
                onChange={(e) => update({ liveDate: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2.5 text-[15px] outline-none"
              />
            </div>

            <div className="text-[12px] text-[#aeaeb2] bg-[#f8f8fa] rounded-lg px-3.5 py-2.5 leading-relaxed">
              톤, 타겟, USP 등은 타임라인 탭 &quot;정보 수정&quot;에서 입력하세요.
            </div>

            <button
              onClick={addManual}
              disabled={!canSubmitManual}
              className="w-full bg-gradient-to-br from-primary to-[#764ba2] rounded-xl text-white py-3.5 text-base font-semibold border-none cursor-pointer hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              강의 추가하고 타임라인으로 이동
            </button>
          </div>
        )}

        {/* ── 붙여넣기 ── */}
        {mode === "paste" && (
          <div className="flex flex-col gap-4">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={
                "구글 시트에서 복사해서 붙여넣으세요\n\n" +
                "예) 민대표\t[핏크닉] 4기 은비\t2026.04.19\n" +
                "    강사명\t강의명\t날짜  (탭으로 구분)\n\n" +
                "강의실 시간표 형식도 자동 인식합니다"
              }
              rows={5}
              className="w-full bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2.5 text-[14px] outline-none resize-y font-mono leading-relaxed"
            />

            {/* 형식 감지 표시 */}
            {parsed.length > 0 && (
              <div className="text-[12px] text-primary font-semibold">
                {isCalendar ? "달력 시간표 형식 감지" : "행 목록 형식 감지"}
                {" — "}
                {validRows.length}개 유효 / {displayRows.length}개 행
                <span className="text-[#aeaeb2] font-normal ml-2">셀을 클릭해 직접 수정 가능</span>
              </div>
            )}

            {/* 편집 가능 미리보기 테이블 */}
            {displayRows.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-secondary text-muted-foreground">
                      <th className="text-center px-2 py-2 font-semibold w-6"></th>
                      <th className="text-left px-2 py-2 font-semibold">강사</th>
                      <th className="text-left px-2 py-2 font-semibold">강의명</th>
                      <th className="text-left px-2 py-2 font-semibold">날짜</th>
                      <th className="text-left px-2 py-2 font-semibold">플랫폼</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t border-border ${
                          r.valid ? "" : r.partial ? "bg-yellow-50" : "bg-red-50"
                        }`}
                      >
                        <td className="px-2 py-1 text-center text-base">
                          {r.valid ? (
                            <span className="text-emerald-600">✓</span>
                          ) : (
                            <span className="text-yellow-500">!</span>
                          )}
                        </td>
                        {(["instructor", "lectureName", "liveDate", "platform"] as const).map((field) => (
                          <td key={field} className="px-1 py-1">
                            <input
                              value={(r[field] as string) || ""}
                              onChange={(e) => updateRow(i, field, e.target.value)}
                              placeholder={
                                field === "instructor" ? "강사명" :
                                field === "lectureName" ? "강의명" :
                                field === "liveDate" ? "YYYY-MM-DD" : "플랫폼"
                              }
                              className={`w-full px-2 py-1 rounded text-[12px] outline-none border focus:border-primary bg-white ${
                                !r[field] && field !== "platform" ? "border-red-200" : "border-transparent"
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {displayRows.length > 0 && validRows.length < displayRows.length && (
              <div className="text-[12px] text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 leading-relaxed">
                {displayRows.length - validRows.length}개 행이 불완전합니다. 위 표에서 직접 수정하거나, 유효한 행만 추가됩니다.
              </div>
            )}

            <div className="text-[12px] text-[#aeaeb2] bg-[#f8f8fa] rounded-lg px-3.5 py-2.5 leading-relaxed">
              {isCalendar
                ? "[핏크닉], [머니업] 태그된 강의만 추출합니다."
                : "[플랫폼명] 태그를 강의명에 포함하면 자동 추출됩니다. (예: [핏크닉] 4기)"}
            </div>

            <button
              onClick={addPasted}
              disabled={validRows.length === 0}
              className="w-full bg-gradient-to-br from-primary to-[#764ba2] rounded-xl text-white py-3.5 text-base font-semibold border-none cursor-pointer hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {validRows.length > 0 ? `${validRows.length}개 강의 추가` : "붙여넣기 대기 중"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
