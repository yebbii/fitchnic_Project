"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ, DESIGNER_MILESTONES, HOME_TAB_COLORS } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay, resolveColor, daysUntil, seqTotalItems, getDesignerProgress } from "@/lib/utils";
import { useCalendar } from "@/hooks/use-calendar";
import { useActiveLectures, useLiveEvents } from "@/hooks/use-derived-data";
type FilterTagId = "d10" | "pm" | "designer";
type PlatformFilterId = "fitchnic" | "moneyup";

const STANDALONE_TAGS: { id: FilterTagId; label: string; color: string }[] = [
  { id: "d10", label: "D-10", color: "#ef4444" },
  { id: "pm", label: "PM 업무", color: HOME_TAB_COLORS.pm },
  { id: "designer", label: "디자이너", color: HOME_TAB_COLORS.designer },
];

const PLATFORM_TAGS: { id: PlatformFilterId; label: string; color: string }[] = [
  { id: "fitchnic", label: "핏크닉", color: "#38BDF8" },
  { id: "moneyup", label: "머니업", color: "#22C55E" },
];

export default function HomeTab() {
  const { state, dispatch } = useCrm();
  const goToBoard = useGoToBoard();
  const goToDesignerTimeline = useGoToDesignerTimeline();
  const { today, calDays, prevMonth, nextMonth, monthLabel } = useCalendar();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // 필터 태그 상태
  const ALL_STANDALONE: FilterTagId[] = STANDALONE_TAGS.map((t) => t.id);
  const ALL_PLATFORMS: PlatformFilterId[] = PLATFORM_TAGS.map((t) => t.id);
  const [activeFilters, setActiveFilters] = useState<Set<FilterTagId>>(new Set(ALL_STANDALONE));
  const [activePlatforms, setActivePlatforms] = useState<Set<PlatformFilterId>>(new Set(ALL_PLATFORMS));
  const [liveEnabled, setLiveEnabled] = useState(true);

  const isAllSelected = liveEnabled && activePlatforms.size === ALL_PLATFORMS.length && activeFilters.size === ALL_STANDALONE.length;

  const selectAll = () => {
    setLiveEnabled(true);
    setActivePlatforms(new Set(ALL_PLATFORMS));
    setActiveFilters(new Set(ALL_STANDALONE));
  };

  const toggleStandalone = (id: FilterTagId) => {
    if (isAllSelected) {
      // 전체 → 이것만 선택
      setLiveEnabled(false);
      setActivePlatforms(new Set());
      setActiveFilters(new Set([id]));
      return;
    }
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // 모두 해제되면 전체 복원
      if (next.size === 0 && !liveEnabled && activePlatforms.size === 0) {
        setLiveEnabled(true);
        setActivePlatforms(new Set(ALL_PLATFORMS));
        return new Set(ALL_STANDALONE);
      }
      return next;
    });
  };

  const toggleLiveGroup = () => {
    if (isAllSelected) {
      // 전체 → LIVE만
      setActiveFilters(new Set());
      setLiveEnabled(true);
      setActivePlatforms(new Set(ALL_PLATFORMS));
      return;
    }
    if (liveEnabled) {
      // LIVE 끄기
      setLiveEnabled(false);
      setActivePlatforms(new Set());
      if (activeFilters.size === 0) selectAll();
    } else {
      // LIVE 켜기
      setLiveEnabled(true);
      setActivePlatforms(new Set(ALL_PLATFORMS));
    }
  };

  const togglePlatform = (id: PlatformFilterId) => {
    if (isAllSelected) {
      // 전체 → 이 플랫폼만
      setActiveFilters(new Set());
      setLiveEnabled(true);
      setActivePlatforms(new Set([id]));
      return;
    }
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // 플랫폼 모두 해제 → LIVE 자체도 꺼짐
        if (next.size === 0) {
          setLiveEnabled(false);
          if (activeFilters.size === 0) selectAll();
        }
      } else {
        next.add(id);
        setLiveEnabled(true);
      }
      return next;
    });
  };

  // 강의 카드 상태
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [modalDeleteConfirm, setModalDeleteConfirm] = useState(false);

  // 필터 헬퍼
  const showFitchnic = liveEnabled && activePlatforms.has("fitchnic");
  const showMoneyup = liveEnabled && activePlatforms.has("moneyup");
  const showLive = showFitchnic || showMoneyup;
  const showD10 = activeFilters.has("d10");
  const showPm = activeFilters.has("pm");
  const showDesigner = activeFilters.has("designer");

  /* 공통 훅: 사이드바 + 모달에서 공유 */
  const activeLecSummaries = useActiveLectures();
  const liveEvents = useLiveEvents();

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

  /* PM: 날짜별 시퀀스 단계 수 (전체 뷰용 요약 — 단계 1건 = 1건) */
  const pmSummaryByDate = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          const seq = state.seqDataMap[`${ins}|${lec}`] || DEFAULT_SEQ;
          seq.forEach((phase) => {
            const date = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            map[date] = (map[date] || 0) + 1;
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

  /* 디자이너: 날짜별 마일스톤 수 (DESIGNER_MILESTONES 기준 — 디자이너탭과 동일) */
  const designerSummaryByDate = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(state.data).forEach(([, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([, lD]) => {
          DESIGNER_MILESTONES.forEach((ms) => {
            const date = fmtDate(addDays(lD.liveDate, ms.dayOffset));
            map[date] = (map[date] || 0) + 1;
          });
        });
    });
    return map;
  }, [state.data]);

  /* 디자이너: 개별 이벤트 (DESIGNER_MILESTONES 기준 — 디자이너탭과 동일) */
  const designerDetailEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; phaseLabel: string; isLive: boolean }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          DESIGNER_MILESTONES.forEach((ms) => {
            ev.push({ date: fmtDate(addDays(lD.liveDate, ms.dayOffset)), ins, lec, phaseLabel: ms.label, isLive: false });
          });
        });
    });
    return ev;
  }, [state.data]);

  return (
    <div className="flex min-h-[calc(100vh-52px)] animate-fi">
      {/* ── 좌측 사이드바: 강의별 요약 카드 ── */}
      <aside className="w-[300px] min-w-[300px] max-w-[300px] flex-shrink-0 border-r border-border bg-white flex flex-col sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable" }}>
        <div className="px-3 py-4 flex-1">
          <h3 className="text-[14px] font-extrabold text-foreground mb-3 px-1">강의 요약</h3>
          {activeLecSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-2xl mb-2">📭</div>
              <div className="text-[13px] font-semibold text-foreground">진행중인 강의 없음</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeLecSummaries.map((lc) => {
                  const isUrgent = lc.daysLeft <= 1;
                  const isNear = lc.daysLeft <= 3;
                  const pctPm = lc.pmTotal ? Math.round((lc.pmChecked / lc.pmTotal) * 100) : 0;
                  const pctCopy = lc.pmTotal ? Math.round((lc.pmCopied / lc.pmTotal) * 100) : 0;
                  const pctDes = lc.desTotal ? Math.round((lc.desChecked / lc.desTotal) * 100) : 0;
                  const allDone = pctPm === 100 && pctCopy === 100;

                  return (
                    <div
                      key={`${lc.ins}|${lc.lec}`}
                      className="bg-secondary/30 rounded-xl border border-border overflow-hidden transition-all"
                    >
                      {/* 컬러 헤더 */}
                      <div
                        className="px-3 py-2 flex items-center justify-between"
                        style={{ background: `${lc.color}08`, borderBottom: `1.5px solid ${lc.color}15` }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lc.color }} />
                          <span className="text-[12px] font-bold truncate" style={{ color: lc.color }}>{lc.ins}</span>
                          {lc.platform && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-white/70 text-muted-foreground font-medium flex-shrink-0">{lc.platform}</span>
                          )}
                        </div>
                        <span
                          className={`text-[12px] font-extrabold px-2 py-0.5 rounded-md flex-shrink-0 ${
                            isUrgent
                              ? "bg-red-500 text-white"
                              : isNear
                              ? "bg-amber-400 text-white"
                              : "bg-emerald-500/15 text-emerald-600"
                          }`}
                        >
                          {lc.daysLeft <= 0 ? "D-Day" : `D-${lc.daysLeft}`}
                        </span>
                      </div>

                      {/* 본문 */}
                      <div className="px-3 py-2.5">
                        <div className="text-[13px] font-extrabold text-foreground leading-tight truncate">{lc.lec}</div>
                        <div className="text-[11px] text-[#aeaeb2] mt-0.5">{fmtDateKr(lc.liveDate)} {lc.liveTime}</div>

                        {/* 진행률 — PM 카피 / PM 발송 / 디자인 */}
                        <div className="mt-2.5 flex flex-col gap-1.5">
                          {/* 발송 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-muted-foreground w-8 flex-shrink-0">발송</span>
                            <div className="flex-1 h-[5px] bg-[#f0f0f5] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pctPm}%`, background: pctPm === 100 ? "#22c55e" : HOME_TAB_COLORS.pm }}
                              />
                            </div>
                            <span className="text-[10px] font-bold w-8 text-right" style={{ color: pctPm === 100 ? "#22c55e" : HOME_TAB_COLORS.pm }}>
                              {lc.pmChecked}/{lc.pmTotal}
                            </span>
                          </div>
                          {/* 디자인 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-muted-foreground w-8 flex-shrink-0">디자인</span>
                            <div className="flex-1 h-[5px] bg-[#f0f0f5] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pctDes}%`, background: pctDes === 100 ? "#22c55e" : HOME_TAB_COLORS.designer }}
                              />
                            </div>
                            <span className="text-[10px] font-bold w-8 text-right" style={{ color: pctDes === 100 ? "#22c55e" : HOME_TAB_COLORS.designer }}>
                              {lc.desChecked}/{lc.desTotal}
                            </span>
                          </div>
                        </div>

                        {/* 시퀀스 단계 바 */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="flex gap-[2px] flex-1">
                            {Array.from({ length: lc.phasesTotal }, (_, i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full"
                                style={{ background: i < lc.phasesDone ? lc.color : "#f0f0f5" }}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            {lc.phasesDone}/{lc.phasesTotal}
                          </span>
                        </div>

                        {/* 완료 표시 */}
                        {allDone && (
                          <div className="mt-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-md px-2 py-1 text-center">
                            CRM 준비 완료
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </aside>

      {/* ── 우측: 달력 ── */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-secondary/30 rounded-2xl border border-border p-6">
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold">📅 통합 캘린더</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={prevMonth}
                  className="bg-secondary rounded-lg px-3 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >
                  ◀
                </button>
                <span className="text-base font-bold min-w-[130px] text-center">
                  {monthLabel}
                </span>
                <button
                  onClick={nextMonth}
                  className="bg-secondary rounded-lg px-3 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* 필터 태그 — 1단계 */}
            <div className="flex items-center gap-3 mb-2 text-[12px]">
              {/* 전체 */}
              <button
                onClick={selectAll}
                className={`px-3 py-1 rounded-md text-[12px] font-semibold border transition-all cursor-pointer ${
                  isAllSelected
                    ? "bg-foreground text-white border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                전체
              </button>

              <div className="w-px h-4 bg-border" />

              {/* LIVE */}
              <button
                onClick={toggleLiveGroup}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer transition-all"
              >
                <span
                  className="w-3 h-3 rounded-full border-2 transition-all"
                  style={{
                    borderColor: "#ef4444",
                    background: showLive && !isAllSelected ? "#ef4444" : "transparent",
                  }}
                />
                <span className={`font-semibold transition-colors ${showLive && !isAllSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  LIVE
                </span>
                {showLive && !isAllSelected && (
                  <span className="text-[10px] text-muted-foreground ml-[-2px]">▾</span>
                )}
              </button>

              {/* D-10 / PM / 디자이너 */}
              {STANDALONE_TAGS.map((t) => {
                const active = activeFilters.has(t.id) && !isAllSelected;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleStandalone(t.id)}
                    className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer transition-all"
                  >
                    <span
                      className="w-3 h-3 rounded-full border-2 transition-all"
                      style={{
                        borderColor: t.color,
                        background: active ? t.color : "transparent",
                      }}
                    />
                    <span
                      className="font-semibold transition-colors"
                      style={{ color: active ? t.color : "var(--muted-foreground)" }}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* LIVE 서브필터 — 2단계 */}
            {showLive && !isAllSelected && (
              <div className="flex items-center gap-3 mb-2 pl-[88px] text-[11px] animate-fi">
                {PLATFORM_TAGS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className="flex items-center gap-1 bg-transparent border-none cursor-pointer transition-all"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border-[1.5px] transition-all"
                      style={{
                        borderColor: p.color,
                        background: activePlatforms.has(p.id) ? p.color : "transparent",
                      }}
                    />
                    <span
                      className="font-medium transition-colors"
                      style={{ color: activePlatforms.has(p.id) ? p.color : "var(--muted-foreground)" }}
                    >
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

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

                const dayLiveEvts = showLive
                  ? liveEvents.filter((e) => e.date === ds && ((e.platform === "핏크닉" && showFitchnic) || (e.platform === "머니업" && showMoneyup) || (!e.platform)))
                  : [];
                const dayD10Evts = showD10 ? d10Events.filter((e) => e.date === ds) : [];
                const dayPmCount = showPm ? (pmSummaryByDate[ds] || 0) : 0;
                const dayDesCount = showDesigner ? (designerSummaryByDate[ds] || 0) : 0;
                const dayPmEvts = (showPm && !showDesigner) ? pmDetailEvents.filter((e) => e.date === ds) : [];
                const dayDesEvts = (showDesigner && !showPm) ? designerDetailEvents.filter((e) => e.date === ds) : [];
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
                    <div className="flex flex-col gap-[3px]">
                      {/* LIVE 섹션 — 컬러 배경 블록 (시선 1순위) */}
                      {showLive && (
                        <div className="min-h-[20px]">
                          {dayLiveEvts.map((ev, ei) => (
                            <div
                              key={`live-${ei}`}
                              onClick={(e) => { e.stopPropagation(); setModalKey(`${ev.ins}|${ev.lec}`); setModalDeleteConfirm(false); }}
                              className="rounded-[5px] px-1.5 py-[3px] text-[10px] font-bold cursor-pointer leading-tight truncate"
                              style={{ background: ev.color + "18", color: ev.color, border: `1.5px solid ${ev.color}35` }}
                            >
                              <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-500 mr-0.5 align-middle flex-shrink-0" />{ev.ins}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* D-10 섹션 — 연한 빨강 배경 블록 */}
                      {showD10 && (
                        <div className="min-h-[20px]">
                          {dayD10Evts.map((ev, ei) => (
                            <div
                              key={`d10-${ei}`}
                              onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                              className="rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity"
                              style={{ background: "#fefce8", color: "#a16207", border: "1.5px solid #fde68a" }}
                            >
                              <span className="text-[9px] mr-0.5">⚠</span>{ev.ins} D-10
                            </div>
                          ))}
                        </div>
                      )}
                      {/* PM 섹션 — 연회색 배경 + 주황 도트 */}
                      {showPm && (
                        <div className="min-h-[20px]">
                          {showDesigner ? (
                            dayPmCount > 0 ? (
                              <div
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "pm" }); dispatch({ type: "SET_TAB", tab: "board" }); }}
                                className="flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity"
                                style={{ background: "#f5f5f4", color: "#78716c", border: "1.5px solid #e7e5e4" }}
                              >
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: HOME_TAB_COLORS.pm }} />
                                PM {dayPmCount}건
                              </div>
                            ) : null
                          ) : (
                            <>
                              {(showAll ? dayPmEvts : dayPmEvts.slice(0, 3)).map((ev, ei) => (
                                <div
                                  key={`pm-${ei}`}
                                  onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                                  className="flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity"
                                  style={{ background: "#f5f5f4", color: "#78716c", border: "1.5px solid #e7e5e4" }}
                                >
                                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: HOME_TAB_COLORS.pm }} />
                                  <span className="truncate">{ev.ins}</span>
                                  <span className="text-[9px] opacity-60 truncate">{ev.seqLabel}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      {/* 디자이너 섹션 — 연회색 배경 + 보라 도트 */}
                      {showDesigner && (
                        <div className="min-h-[20px]">
                          {showPm ? (
                            dayDesCount > 0 ? (
                              <div
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "designer" }); dispatch({ type: "SET_DESIGNER_TAB", tab: "timeline" }); }}
                                className="flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity"
                                style={{ background: "#f5f5f4", color: "#78716c", border: "1.5px solid #e7e5e4" }}
                              >
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: HOME_TAB_COLORS.designer }} />
                                디자인 {dayDesCount}건
                              </div>
                            ) : null
                          ) : (
                            <>
                              {(showAll ? dayDesEvts : dayDesEvts.slice(0, 3)).map((ev, ei) => (
                                <div
                                  key={`des-${ei}`}
                                  onClick={(e) => { e.stopPropagation(); goToDesignerTimeline(ev.ins, ev.lec); }}
                                  className="flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity"
                                  style={{ background: "#f5f5f4", color: "#78716c", border: "1.5px solid #e7e5e4" }}
                                >
                                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: HOME_TAB_COLORS.designer }} />
                                  <span className="truncate">{ev.ins}</span>
                                  <span className="text-[9px] opacity-60 truncate">{ev.phaseLabel}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      {/* 더 보기 / 접기 */}
                      {totalDetailEvts > 3 && !showAll && (
                        <div className="text-[9px] text-muted-foreground text-center font-semibold py-0.5 cursor-pointer">
                          +{totalDetailEvts - 3}개
                        </div>
                      )}
                      {totalDetailEvts > 3 && showAll && (
                        <div className="text-[9px] text-[#aeaeb2] text-center py-0.5">접기 ▲</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 강의 상세 모달 (달력 LIVE 클릭) */}
      {modalKey && (() => {
        const [mIns, mLec] = modalKey.split("|");
        const mID = state.data[mIns];
        const mLD = mID?.lectures?.[mLec];
        if (!mID || !mLD) return null;
        const mColor = resolveColor(state.platformColors, mLD.platform);
        const mPmSeq = state.seqDataMap[modalKey] || DEFAULT_SEQ;
        const mPmTotal = seqTotalItems(mPmSeq);
        const mPmChecked = Object.values(state.allChecks[modalKey] || {}).filter(Boolean).length;
        const mDesProg = getDesignerProgress(modalKey, state.designerMilestones);
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
                  {mLD.liveDate && daysUntil(mLD.liveDate) === 0 && (
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
                  <span className="text-muted-foreground">{mDesProg.checked}/{mDesProg.total}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${mDesProg.total ? (mDesProg.checked / mDesProg.total) * 100 : 0}%`, background: HOME_TAB_COLORS.designer }} />
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

              {/* 삭제 */}
              <div className="mt-3 pt-3 border-t border-border">
                {modalDeleteConfirm ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-red-500 font-semibold text-center">정말 삭제하시겠습니까? 복구되지 않습니다.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { dispatch({ type: "DELETE_LECTURE", ins: mIns, lec: mLec }); setModalKey(null); setModalDeleteConfirm(false); }}
                        className="flex-1 rounded-xl py-2 text-[12px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        삭제 확인
                      </button>
                      <button
                        onClick={() => setModalDeleteConfirm(false)}
                        className="flex-1 rounded-xl py-2 text-[12px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalDeleteConfirm(true)}
                    className="w-full rounded-xl py-2 text-[12px] font-semibold border-none cursor-pointer bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                  >
                    강의 삭제
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
