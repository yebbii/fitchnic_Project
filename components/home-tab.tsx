"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ, DEFAULT_DESIGN_SEQ, HOME_TAB_COLORS } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay } from "@/lib/utils";
import AddLectureDialog from "./add-lecture-dialog";
import type { HomeCalendarView } from "@/lib/types";

const CAL_VIEWS: { id: HomeCalendarView; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "pm", label: "PM" },
  { id: "designer", label: "디자이너" },
];

const DES_TOTAL = DEFAULT_DESIGN_SEQ.reduce((s, p) => s + p.items.length, 0);
const PM_DEFAULT_TOTAL = DEFAULT_SEQ.reduce((s, p) => s + p.items.length, 0);

function diffDays(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HomeTab() {
  const { state, dispatch } = useCrm();
  const goToBoard = useGoToBoard();
  const goToDesignerTimeline = useGoToDesignerTimeline();
  const today = new Date();

  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sideExpanded, setSideExpanded] = useState(false);
  const [lecturesExpanded, setLecturesExpanded] = useState(false);

  // 강의 카드 상태
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ins: "", lec: "", liveDate: "", color: "" });
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [modalKey, setModalKey] = useState<string | null>(null);

  const calView = state.homeCalView;

  /* 진행 예정 강의 목록 — 사이드바용 (오늘 이후만, 과거 제외) */
  const activeLectures = useMemo(() => {
    const todayStr = fmtDate(today);
    const twoWeeksLater = fmtDate(addDays(todayStr, 14));
    const list: { ins: string; lec: string; liveDate: string; liveTime: string; color: string; platform: string; isNear: boolean }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate >= todayStr)
        .forEach(([lec, l]) => {
          list.push({ ins, lec, liveDate: l.liveDate, liveTime: l.liveTime, color: l.color ?? iD.color, platform: l.platform || "", isNear: l.liveDate <= twoWeeksLater });
        });
    });
    return list.sort((a, b) => a.liveDate.localeCompare(b.liveDate));
  }, [state.data]);

  /* 강의 LIVE 이벤트 (라이브 당일) — 완료된 강의도 포함 */
  const liveEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; color: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          ev.push({ date: lD.liveDate, ins, lec, color: state.platformColors[lD.platform] ?? lD.color ?? iD.color });
        });
    });
    return ev;
  }, [state.data, state.platformColors]);

  /* 강의 D-10 이벤트 (라이브 10일 전 알림) */
  const d10Events = useMemo(() => {
    const ev: { date: string; ins: string; lec: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          ev.push({ date: fmtDate(addDays(lD.liveDate, -10)), ins, lec });
        });
    });
    return ev;
  }, [state.data]);

  /* PM: 날짜별 총 알림 수 (전체 뷰용 요약) */
  const pmSummaryByDate = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          const seq = state.seqDataMap[`${ins}|${lec}`] || DEFAULT_SEQ;
          seq.forEach((phase) => {
            const date = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            map[date] = (map[date] || 0) + phase.items.length;
          });
        });
    });
    return map;
  }, [state.data, state.seqDataMap]);

  /* PM: 개별 이벤트 (pm 뷰 상세용) */
  const pmDetailEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; seqLabel: string; isLive: boolean }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          DEFAULT_SEQ.forEach((seq) => {
            ev.push({ date: fmtDate(addDays(lD.liveDate, seq.dayOffset)), ins, lec, seqLabel: seq.label, isLive: seq.dayOffset === 0 });
          });
        });
    });
    return ev;
  }, [state.data]);

  /* 디자이너: 날짜별 총 작업 수 (전체 뷰용 요약) */
  const designerSummaryByDate = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(state.data).forEach(([, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([, lD]) => {
          DEFAULT_DESIGN_SEQ.forEach((phase) => {
            const date = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            map[date] = (map[date] || 0) + phase.items.length;
          });
        });
    });
    return map;
  }, [state.data]);

  /* 디자이너: 개별 이벤트 (designer 뷰 상세용) */
  const designerDetailEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; phaseLabel: string; isLive: boolean }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          DEFAULT_DESIGN_SEQ.forEach((phase) => {
            ev.push({ date: fmtDate(addDays(lD.liveDate, phase.dayOffset)), ins, lec, phaseLabel: phase.label, isLive: phase.dayOffset === 0 });
          });
        });
    });
    return ev;
  }, [state.data]);

  /* 사이드바 일정 리스트 */
  const sideSchedule = useMemo(() => {
    const todayStr = fmtDate(today);
    const cutoff = fmtDate(addDays(todayStr, 60));
    type Item = { date: string; ins: string; lec: string; label: string; color: string; isLive: boolean; kind: "live" | "d10" | "pm" | "designer" };
    const items: Item[] = [];
    // 강의 LIVE / D-10 은 항상 표시
    liveEvents.forEach((e) => {
      if (e.date >= todayStr && e.date <= cutoff)
        items.push({ ...e, label: "라이브", isLive: true, kind: "live" });
    });
    d10Events.forEach((e) => {
      if (e.date >= todayStr && e.date <= cutoff)
        items.push({ ...e, label: "D-10", color: HOME_TAB_COLORS.d10, isLive: false, kind: "d10" });
    });
    if (calView === "all" || calView === "pm") {
      pmDetailEvents.forEach((e) => {
        if (e.date >= todayStr && e.date <= cutoff)
          items.push({ ...e, label: e.seqLabel, color: HOME_TAB_COLORS.pm, kind: "pm" });
      });
    }
    if (calView === "all" || calView === "designer") {
      designerDetailEvents.forEach((e) => {
        if (e.date >= todayStr && e.date <= cutoff)
          items.push({ ...e, label: e.phaseLabel, color: HOME_TAB_COLORS.designer, kind: "designer" });
      });
    }
    const kindOrder = { live: 0, d10: 1, pm: 2, designer: 3 };
    items.sort((a, b) => a.date.localeCompare(b.date) || kindOrder[a.kind] - kindOrder[b.kind]);
    const grouped: Record<string, Item[]> = {};
    items.forEach((item) => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [calView, liveEvents, d10Events, pmDetailEvents, designerDetailEvents]);

  /* 달력 날짜 배열 */
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  }, [calMonth]);

  function fmtDayLabel(dateStr: string) {
    const d = new Date(dateStr);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  }

  function dateBadge(dateStr: string) {
    const diff = diffDays(dateStr);
    if (diff === 0) return <span className="text-[10px] font-bold text-white bg-primary rounded-full px-1.5 py-0.5 ml-1">오늘</span>;
    if (diff === 1) return <span className="text-[10px] font-bold text-orange-500 bg-orange-50 rounded-full px-1.5 py-0.5 ml-1">내일</span>;
    if (diff <= 7) return <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5 ml-1">D-{diff}</span>;
    return null;
  }

  function startEdit(ins: string, lec: string, liveDate: string, color: string) {
    const key = `${ins}|${lec}`;
    if (editKey === key) {
      setEditKey(null);
      setDeleteConfirmKey(null);
    } else {
      setEditKey(key);
      setEditForm({ ins, lec, liveDate, color });
      setSelectedKey(null);
      setModalKey(null);
    }
  }

  function saveEdit(originalIns: string, originalLec: string, originalColor: string) {
    const { ins: newIns, lec: newLec, liveDate, color } = editForm;
    const trimIns = newIns.trim();
    const trimLec = newLec.trim();
    if (!trimIns || !trimLec) return;

    if (trimIns !== originalIns) {
      dispatch({ type: "RENAME_INSTRUCTOR", oldIns: originalIns, newIns: trimIns });
    }
    const curIns = trimIns !== originalIns ? trimIns : originalIns;
    if (trimLec !== originalLec) {
      dispatch({ type: "RENAME_LECTURE", ins: curIns, oldLec: originalLec, newLec: trimLec });
    }
    if (liveDate !== state.data[originalIns]?.lectures?.[originalLec]?.liveDate) {
      const finalIns = trimIns !== originalIns ? trimIns : originalIns;
      const finalLec = trimLec !== originalLec ? trimLec : originalLec;
      dispatch({ type: "UPDATE_LECTURE_FIELD", ins: finalIns, lec: finalLec, field: "liveDate", value: liveDate });
    }
    if (color && color !== originalColor) {
      dispatch({ type: "SET_INSTRUCTOR_COLOR", ins: trimIns, color });
    }
    setEditKey(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] animate-fi">
      {/* ── 좌측 사이드바 ── */}
      <aside className="w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 border-r border-border bg-white flex flex-col sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable" }}>
        {/* 새 강의 추가 / 강의 관리 */}
        <div className="px-4 py-3.5 border-b border-border flex flex-col gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full bg-gradient-to-br from-primary to-[#764ba2] text-white rounded-xl py-2.5 text-[13px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            + 새 강의 추가
          </button>
          <button
            onClick={() => dispatch({ type: "SET_TOP_TAB", tab: "lecture" })}
            className="w-full bg-secondary text-foreground rounded-xl py-2 text-[13px] font-semibold border-none cursor-pointer hover:bg-accent transition-colors"
          >
            📚 강의 관리
          </button>
        </div>

        {/* 진행중 강의 블록 */}
        <div className="px-4 py-3 border-b border-border">
          <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide mb-2.5">
            진행중 강의 {activeLectures.length}개
          </div>
          {activeLectures.length === 0 ? (
            <div className="text-[12px] text-[#aeaeb2] py-1">진행중인 강의가 없습니다</div>
          ) : (
            <div className="flex flex-col gap-2">
              {(lecturesExpanded ? activeLectures : activeLectures.filter((l) => l.isNear)).map((l) => {
                const curKey = `${l.ins}|${l.lec}`;
                const isEditing = editKey === curKey;
                const isSelected = selectedKey === curKey;
                const diff = l.liveDate ? diffDays(l.liveDate) : null;
                const cardColor = state.platformColors[l.platform] ?? l.color;
                const isDeleteConfirm = deleteConfirmKey === curKey;
                const pmSeq = state.seqDataMap[curKey];
                const pmTotal = pmSeq ? pmSeq.reduce((s, p) => s + p.items.length, 0) : PM_DEFAULT_TOTAL;
                const pmChecked = Object.values(state.allChecks[curKey] || {}).filter(Boolean).length;
                const desChecked = Object.values(state.designChecks[curKey] || {}).filter(Boolean).length;

                return (
                  <div
                    key={curKey}
                    className="rounded-xl overflow-hidden border border-border"
                    style={{ borderLeft: `3px solid ${cardColor}` }}
                  >
                    {/* 카드 헤더 — 클릭 시 인라인 상세 토글 */}
                    <div
                      className="px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                      style={{ background: isSelected ? `${cardColor}08` : undefined }}
                      onClick={() => { if (!isEditing) setSelectedKey(isSelected ? null : curKey); }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-extrabold truncate" style={{ color: cardColor }}>
                              {l.ins}
                            </span>
                            {diff !== null && (
                              diff === 0 ? (
                                <span className="text-[9px] font-bold text-white bg-red-400 rounded-full px-1.5 py-0.5 flex-shrink-0">LIVE</span>
                              ) : diff > 0 && diff <= 7 ? (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 flex-shrink-0">D-{diff}</span>
                              ) : diff > 0 ? (
                                <span className="text-[9px] font-semibold text-muted-foreground flex-shrink-0">D-{diff}</span>
                              ) : null
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{l.lec}</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(l.ins, l.lec, l.liveDate, l.color); }}
                          className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[11px] border-none cursor-pointer hover:bg-accent transition-colors flex-shrink-0"
                          title="수정"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    {/* 인라인 수정 폼 */}
                    {isEditing && (
                      <div className="px-3 pb-3 pt-1 bg-secondary/30 border-t border-border animate-fi">
                        <div className="flex flex-col gap-1.5">
                          <div>
                            <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">강사명</div>
                            <input
                              value={editForm.ins}
                              onChange={(e) => setEditForm((f) => ({ ...f, ins: e.target.value }))}
                              className="w-full bg-white border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">강의명</div>
                            <input
                              value={editForm.lec}
                              onChange={(e) => setEditForm((f) => ({ ...f, lec: e.target.value }))}
                              className="w-full bg-white border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">라이브 일자</div>
                            <input
                              type="date"
                              value={editForm.liveDate}
                              onChange={(e) => setEditForm((f) => ({ ...f, liveDate: e.target.value }))}
                              className="w-full bg-white border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">강사 색상</div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={editForm.color}
                                onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                                className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 flex-shrink-0"
                              />
                              <input
                                value={editForm.color}
                                onChange={(e) => {
                                  const stripped = e.target.value.replace(/#/g, "");
                                  setEditForm((f) => ({ ...f, color: stripped ? "#" + stripped : "" }));
                                }}
                                placeholder="667eea"
                                className="flex-1 bg-white border border-border rounded-lg text-foreground px-2 py-1.5 text-[11px] outline-none font-mono focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                          {/* 저장 / 취소 */}
                          <div className="flex gap-1.5 mt-0.5">
                            <button
                              onClick={() => saveEdit(l.ins, l.lec, l.color)}
                              className="flex-1 bg-primary text-white rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:opacity-90"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => { setEditKey(null); setDeleteConfirmKey(null); }}
                              className="flex-1 bg-secondary text-muted-foreground rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:bg-accent"
                            >
                              취소
                            </button>
                          </div>
                          {/* 삭제 확인 UI */}
                          {isDeleteConfirm ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex flex-col gap-1.5">
                              <p className="text-[11px] text-red-600 font-semibold text-center">정말 삭제하시겠습니까?<br /><span className="font-normal">복구되지 않습니다.</span></p>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    dispatch({ type: "DELETE_LECTURE", ins: l.ins, lec: l.lec });
                                    setEditKey(null);
                                    setDeleteConfirmKey(null);
                                  }}
                                  className="flex-1 bg-red-500 text-white rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:bg-red-600"
                                >
                                  삭제 확인
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmKey(null)}
                                  className="flex-1 bg-secondary text-muted-foreground rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:bg-accent"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmKey(curKey)}
                              className="w-full bg-red-50 text-red-500 rounded-lg py-1.5 text-[12px] font-semibold border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 인라인 상세 (클릭 시 펼침) */}
                    {isSelected && !isEditing && (
                      <div className="px-3 pb-3 pt-1 border-t border-border animate-fi" style={{ background: `${cardColor}05` }}>
                        <div className="flex flex-col gap-1.5">
                          <div className="text-[11px] text-muted-foreground"><span className="font-semibold">강사</span> {l.ins}</div>
                          <div className="text-[11px] text-muted-foreground"><span className="font-semibold">강의</span> {l.lec}</div>
                          {l.liveDate && (
                            <div className="text-[11px] text-muted-foreground"><span className="font-semibold">라이브</span> {fmtDateKr(l.liveDate)} {l.liveTime}</div>
                          )}
                          <div className="mt-1">
                            <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                              <span className="text-primary">PM 진행</span>
                              <span className="text-muted-foreground">{pmChecked}/{pmTotal}</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pmTotal ? (pmChecked / pmTotal) * 100 : 0}%`, background: cardColor }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                              <span style={{ color: HOME_TAB_COLORS.designer }}>디자이너 진행</span>
                              <span className="text-muted-foreground">{desChecked}/{DES_TOTAL}</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(desChecked / DES_TOTAL) * 100}%`, background: HOME_TAB_COLORS.designer }} />
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-1">
                            <button onClick={() => goToBoard(l.ins, l.lec)} className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold border-none cursor-pointer transition-colors" style={{ background: `${cardColor}15`, color: cardColor }}>PM 보드</button>
                            <button onClick={() => goToDesignerTimeline(l.ins, l.lec)} className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold border-none cursor-pointer transition-colors" style={{ background: `${HOME_TAB_COLORS.designer}1a`, color: HOME_TAB_COLORS.designer }}>디자인</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {activeLectures.filter((l) => !l.isNear).length > 0 && (
                <button
                  onClick={() => setLecturesExpanded((v) => !v)}
                  className="w-full text-[11px] font-semibold text-muted-foreground py-1.5 rounded-lg bg-secondary border-none cursor-pointer hover:bg-accent transition-colors"
                >
                  {lecturesExpanded
                    ? "▲ 접기"
                    : `▼ 2주 이후 ${activeLectures.filter((l) => !l.isNear).length}개 더 보기`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 일정 필터 + 리스트 */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide mb-2">
            다가오는 일정
          </div>
          <div className="flex gap-1 bg-secondary rounded-lg p-[3px] mb-3">
            {CAL_VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => dispatch({ type: "SET_HOME_CAL_VIEW", view: v.id })}
                className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border-none ${
                  calView === v.id
                    ? "bg-white text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {sideSchedule.length === 0 ? (
            <div className="text-[12px] text-[#aeaeb2]">향후 60일 내 일정 없음</div>
          ) : (
            <>
              {(sideExpanded ? sideSchedule : sideSchedule.slice(0, 3)).map(([date, items]) => (
                <div key={date} className="mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[11px] font-extrabold text-foreground">{fmtDayLabel(date)}</span>
                    {dateBadge(date)}
                  </div>
                  <div className="flex flex-col gap-0.5 pl-1">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (item.kind === "pm") goToBoard(item.ins, item.lec);
                          else goToDesignerTimeline(item.ins, item.lec);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: item.color }}
                        />
                        <span
                          className="text-[11px] font-bold truncate"
                          style={{ color: item.color }}
                        >
                          {item.ins}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
                        {item.isLive && (
                          <span className="text-[8px] font-bold text-white bg-red-400 rounded-full px-1 flex-shrink-0">LIVE</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {sideSchedule.length > 3 && (
                <button
                  onClick={() => setSideExpanded((v) => !v)}
                  className="w-full text-[11px] font-semibold text-muted-foreground py-1.5 rounded-lg bg-secondary border-none cursor-pointer hover:bg-accent transition-colors"
                >
                  {sideExpanded ? "▲ 접기" : `▼ 더 보기`}
                </button>
              )}
            </>
          )}
        </div>

      </aside>

      {/* ── 우측: 달력 ── */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-[0_2px_8px_rgba(0,0,0,.04)]">
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-extrabold">📅 통합 캘린더</h3>
                <div className="flex gap-1 bg-secondary rounded-lg p-[3px]">
                  {CAL_VIEWS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => dispatch({ type: "SET_HOME_CAL_VIEW", view: v.id })}
                      className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer border-none ${
                        calView === v.id
                          ? "bg-white text-foreground shadow-sm"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  className="bg-secondary rounded-lg px-3 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >
                  ◀
                </button>
                <span className="text-base font-bold min-w-[130px] text-center">
                  {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
                </span>
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  className="bg-secondary rounded-lg px-3 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* 범례 */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
              {/* LIVE */}
              <div className="flex items-center gap-1 bg-secondary rounded-full px-2 py-0.5">
                <span className="text-[10px]">🔴</span>
                <span className="font-bold text-muted-foreground">LIVE</span>
                <span className="text-muted-foreground mx-0.5">·</span>
                {Object.entries(state.platformColors).map(([platform, color]) => (
                  <span key={platform} className="font-semibold" style={{ color }}>{platform}</span>
                ))}
              </div>
              {/* D-10 */}
              <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${HOME_TAB_COLORS.d10}15` }}>
                <span className="font-bold" style={{ color: HOME_TAB_COLORS.d10 }}>D-10</span>
              </div>
              {/* PM */}
              {(calView === "all" || calView === "pm") && (
                <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${HOME_TAB_COLORS.pm}15` }}>
                  <span className="font-bold" style={{ color: HOME_TAB_COLORS.pm }}>PM 업무</span>
                </div>
              )}
              {/* 디자이너 */}
              {(calView === "all" || calView === "designer") && (
                <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${HOME_TAB_COLORS.designer}15` }}>
                  <span className="font-bold" style={{ color: HOME_TAB_COLORS.designer }}>디자이너</span>
                </div>
              )}
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-0.5 mb-1.5">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div
                  key={d}
                  className={`text-center text-sm font-bold p-2 ${
                    d === "일" ? "text-red-500" : d === "토" ? "text-blue-500" : "text-muted-foreground"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="min-h-[90px]" />;
                const ds = fmtDate(day);
                const isT = isSameDay(day, today);
                const isPast = day < today && !isT;

                const dayLiveEvts = liveEvents.filter((e) => e.date === ds);
                const dayD10Evts = d10Events.filter((e) => e.date === ds);
                const dayPmCount = pmSummaryByDate[ds] || 0;
                const dayDesCount = designerSummaryByDate[ds] || 0;
                const dayPmEvts = calView === "pm" ? pmDetailEvents.filter((e) => e.date === ds) : [];
                const dayDesEvts = calView === "designer" ? designerDetailEvents.filter((e) => e.date === ds) : [];
                const totalDetailEvts = dayPmEvts.length + dayDesEvts.length;
                const showAll = expandedDay === ds;

                return (
                  <div
                    key={ds}
                    className={`min-h-[90px] rounded-[10px] p-1.5 overflow-hidden ${
                      isT
                        ? "bg-primary/5 border-[1.5px] border-primary"
                        : isPast
                        ? "bg-[#fafafa] border-[1.5px] border-[#f0f0f0]"
                        : "bg-white border-[1.5px] border-[#f0f0f0]"
                    } ${totalDetailEvts > 3 ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (totalDetailEvts > 3) setExpandedDay(showAll ? null : ds);
                    }}
                  >
                    <div
                      className={`text-[14px] px-1 mb-1 ${
                        isT
                          ? "font-extrabold text-primary"
                          : isPast
                          ? "font-semibold text-[#ccc]"
                          : day.getDay() === 0
                          ? "font-semibold text-red-500"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {/* 1순위: 강의 LIVE 블록 */}
                      {dayLiveEvts.map((ev, ei) => (
                        <div
                          key={`live-${ei}`}
                          onClick={(e) => { e.stopPropagation(); setModalKey(`${ev.ins}|${ev.lec}`); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight truncate"
                          style={{ background: ev.color + "25", color: ev.color, border: `1px solid ${ev.color}50` }}
                        >
                          <span className="font-bold">{ev.ins}</span>
                          <span className="text-[9px] ml-0.5">🔴LIVE</span>
                        </div>
                      ))}
                      {/* 2순위: D-10 블록 */}
                      {dayD10Evts.map((ev, ei) => (
                        <div
                          key={`d10-${ei}`}
                          onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight truncate"
                          style={{ background: `${HOME_TAB_COLORS.d10}15`, color: HOME_TAB_COLORS.d10, border: `1px solid ${HOME_TAB_COLORS.d10}30` }}
                        >
                          <span className="font-bold">{ev.ins}</span>
                          <span className="text-[9px] ml-0.5 opacity-80">D-10</span>
                        </div>
                      ))}
                      {/* 3순위: PM 요약 블록 (전체 뷰) */}
                      {calView === "all" && dayPmCount > 0 && (
                        <div
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "pm" }); dispatch({ type: "SET_TAB", tab: "board" }); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight cursor-pointer hover:opacity-75 transition-opacity truncate"
                          style={{ background: `${HOME_TAB_COLORS.pm}18`, color: HOME_TAB_COLORS.pm, border: `1px solid ${HOME_TAB_COLORS.pm}30` }}
                        >
                          PM 일정 ({dayPmCount}건)
                        </div>
                      )}
                      {/* 4순위: 디자이너 요약 블록 (전체 뷰) */}
                      {calView === "all" && dayDesCount > 0 && (
                        <div
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "designer" }); dispatch({ type: "SET_DESIGNER_TAB", tab: "timeline" }); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight cursor-pointer hover:opacity-75 transition-opacity truncate"
                          style={{ background: `${HOME_TAB_COLORS.designer}18`, color: HOME_TAB_COLORS.designer, border: `1px solid ${HOME_TAB_COLORS.designer}30` }}
                        >
                          디자이너 ({dayDesCount}건)
                        </div>
                      )}
                      {/* PM 상세 블록 (pm 뷰) */}
                      {(showAll ? dayPmEvts : dayPmEvts.slice(0, 3)).map((ev, ei) => (
                        <div
                          key={`pm-${ei}`}
                          onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight truncate"
                          style={{ background: `${HOME_TAB_COLORS.pm}18`, color: HOME_TAB_COLORS.pm, border: `1px solid ${HOME_TAB_COLORS.pm}30` }}
                        >
                          <span className="font-bold">{ev.ins}</span>
                          <span className="text-[9px] opacity-75 ml-0.5">{ev.seqLabel}</span>
                        </div>
                      ))}
                      {/* 디자이너 상세 블록 (designer 뷰) */}
                      {(showAll ? dayDesEvts : dayDesEvts.slice(0, 3)).map((ev, ei) => (
                        <div
                          key={`des-${ei}`}
                          onClick={(e) => { e.stopPropagation(); goToDesignerTimeline(ev.ins, ev.lec); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight truncate"
                          style={{ background: `${HOME_TAB_COLORS.designer}18`, color: HOME_TAB_COLORS.designer, border: `1px solid ${HOME_TAB_COLORS.designer}30` }}
                        >
                          <span className="font-bold">{ev.ins}</span>
                          <span className="text-[9px] opacity-75 ml-0.5">{ev.phaseLabel}</span>
                        </div>
                      ))}
                      {totalDetailEvts > 3 && !showAll && (
                        <div className="text-[10px] text-primary text-center font-semibold py-0.5 cursor-pointer">
                          +{totalDetailEvts - 3}개
                        </div>
                      )}
                      {totalDetailEvts > 3 && showAll && (
                        <div className="text-[10px] text-[#aeaeb2] text-center py-0.5">접기 ▲</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showAdd && <AddLectureDialog onClose={() => setShowAdd(false)} />}

      {/* 강의 상세 모달 (달력 LIVE 클릭) */}
      {modalKey && (() => {
        const [mIns, mLec] = modalKey.split("|");
        const mID = state.data[mIns];
        const mLD = mID?.lectures?.[mLec];
        if (!mID || !mLD) return null;
        const mColor = state.platformColors[mLD.platform ?? ""] ?? mID.color;
        const mPmSeq = state.seqDataMap[modalKey];
        const mPmTotal = mPmSeq ? mPmSeq.reduce((s, p) => s + p.items.length, 0) : PM_DEFAULT_TOTAL;
        const mPmChecked = Object.values(state.allChecks[modalKey] || {}).filter(Boolean).length;
        const mDesChecked = Object.values(state.designChecks[modalKey] || {}).filter(Boolean).length;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setModalKey(null)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-[320px] p-5 border border-border animate-fi"
              style={{ borderTop: `4px solid ${mColor}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 닫기 */}
              <button
                onClick={() => setModalKey(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[13px] text-muted-foreground border-none cursor-pointer hover:bg-accent"
              >
                ✕
              </button>

              {/* 헤더 */}
              <div className="mb-4 pr-6">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[16px] font-extrabold" style={{ color: mColor }}>{mIns}</span>
                  {mLD.liveDate && diffDays(mLD.liveDate) === 0 && (
                    <span className="text-[10px] font-bold text-white bg-red-400 rounded-full px-2 py-0.5">LIVE</span>
                  )}
                </div>
                <div className="text-[13px] text-muted-foreground font-medium">{mLec}</div>
              </div>

              {/* 정보 */}
              <div className="flex flex-col gap-2 mb-4">
                {mLD.liveDate && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-muted-foreground w-16 flex-shrink-0 font-semibold">라이브</span>
                    <span className="font-medium">{fmtDateKr(mLD.liveDate)} {mLD.liveTime}</span>
                  </div>
                )}
                {mLD.platform && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-muted-foreground w-16 flex-shrink-0 font-semibold">플랫폼</span>
                    <span className="font-medium">{mLD.platform}</span>
                  </div>
                )}
              </div>

              {/* PM 진행율 */}
              <div className="mb-3">
                <div className="flex justify-between text-[12px] font-semibold mb-1">
                  <span className="text-primary">PM 진행</span>
                  <span className="text-muted-foreground">{mPmChecked}/{mPmTotal}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${mPmTotal ? (mPmChecked / mPmTotal) * 100 : 0}%`, background: mColor }} />
                </div>
              </div>

              {/* 디자이너 진행율 */}
              <div className="mb-4">
                <div className="flex justify-between text-[12px] font-semibold mb-1">
                  <span style={{ color: HOME_TAB_COLORS.designer }}>디자이너 진행</span>
                  <span className="text-muted-foreground">{mDesChecked}/{DES_TOTAL}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(mDesChecked / DES_TOTAL) * 100}%`, background: HOME_TAB_COLORS.designer }} />
                </div>
              </div>

              {/* 이동 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setModalKey(null); goToBoard(mIns, mLec); }}
                  className="flex-1 rounded-xl py-2 text-[12px] font-semibold border-none cursor-pointer transition-colors"
                  style={{ background: `${mColor}18`, color: mColor }}
                >
                  PM 보드
                </button>
                <button
                  onClick={() => { setModalKey(null); goToDesignerTimeline(mIns, mLec); }}
                  className="flex-1 rounded-xl py-2 text-[12px] font-semibold border-none cursor-pointer transition-colors"
                  style={{ background: `${HOME_TAB_COLORS.designer}18`, color: HOME_TAB_COLORS.designer }}
                >
                  디자인
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
