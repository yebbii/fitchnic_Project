"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ, DESIGNER_MILESTONES } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay, resolveColor, daysUntil, seqTotalItems, getDesignerProgress } from "@/lib/utils";
import { useCalendar } from "@/hooks/use-calendar";
import { useActiveLectures, useLiveEvents } from "@/hooks/use-derived-data";
type FilterTagId = "d10" | "pm" | "designer";
type PlatformFilterId = "fitchnic" | "moneyup";

const STANDALONE_TAGS: { id: FilterTagId; label: string }[] = [
  { id: "d10", label: "D-10" },
  { id: "pm", label: "PM 업무" },
  { id: "designer", label: "디자이너" },
];

const TAG_CLS: Record<FilterTagId, { border: string; bg: string; text: string }> = {
  d10: { border: "border-d-10", bg: "bg-d-10", text: "text-d-10" },
  pm: { border: "border-pm", bg: "bg-pm", text: "text-pm" },
  designer: { border: "border-designer", bg: "bg-designer", text: "text-designer" },
};

const PLATFORM_TAGS: { id: PlatformFilterId; label: string }[] = [
  { id: "fitchnic", label: "핏크닉" },
  { id: "moneyup", label: "머니업" },
];

const PLAT_CLS: Record<PlatformFilterId, { border: string; bg: string; text: string }> = {
  fitchnic: { border: "border-fitchnic", bg: "bg-fitchnic", text: "text-fitchnic" },
  moneyup: { border: "border-moneyup", bg: "bg-moneyup", text: "text-moneyup" },
};

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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fi">
      {/* ── 좌측 사이드바: 강의별 요약 카드 ── */}
      <aside className="w-72 shrink-0 border-r border-border/50 bg-surface-sidebar overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable" }}>
        <div className="px-4 py-3 border-b border-border/40">
          <h3 className="text-[15px] font-medium text-foreground">강의 요약</h3>
        </div>
        <div className="px-4 py-3 flex-1">
          {activeLecSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-2xl mb-2">📭</div>
              <div className="text-[13px] font-medium text-foreground">진행중인 강의 없음</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
                      className="rounded-[12px] border border-border/40 overflow-hidden transition-all"
                    >
                      {/* 헤더: 플랫폼 컬러 8% 배경 */}
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ background: `${lc.color}14` }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lc.color }} />
                          <span className="text-xs font-medium truncate" style={{ color: lc.color }}>{lc.ins}</span>
                          {lc.platform && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-white/70 text-muted-foreground font-normal flex-shrink-0">{lc.platform}</span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${
                            lc.daysLeft <= 0
                              ? "bg-red-50 text-red-500"
                              : lc.daysLeft <= 10
                              ? "bg-amber-50 text-amber-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {lc.daysLeft <= 0 ? "D-Day" : `D-${lc.daysLeft}`}
                        </span>
                      </div>

                      {/* 바디: 강의명 + 날짜 + 진행바 */}
                      <div className="px-4 py-3">
                        <div className="text-[13px] font-medium text-foreground leading-tight truncate">{lc.lec}</div>
                        <div className="text-[11px] font-normal text-muted-foreground mt-0.5">{fmtDateKr(lc.liveDate)} {lc.liveTime}</div>

                        <div className="mt-2.5 flex flex-col gap-1.5">
                          {/* 발송 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-muted-foreground w-8 flex-shrink-0">발송</span>
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${pctPm === 100 ? "bg-green-500" : "bg-pm"}`}
                                style={{ width: `${pctPm}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-right ${pctPm === 100 ? "text-green-500" : "text-pm"}`}>
                              {lc.pmChecked}/{lc.pmTotal}
                            </span>
                          </div>
                          {/* 디자인 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-muted-foreground w-8 flex-shrink-0">디자인</span>
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${pctDes === 100 ? "bg-green-500" : "bg-designer"}`}
                                style={{ width: `${pctDes}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-right ${pctDes === 100 ? "text-green-500" : "text-designer"}`}>
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
                                className={`h-[3px] flex-1 rounded-full ${i >= lc.phasesDone ? "bg-neutral-track" : ""}`}
                                style={i < lc.phasesDone ? { background: lc.color } : undefined}
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
      <main className="flex-1 overflow-y-auto p-8">
        <div>
          <div className="bg-surface-card rounded-card shadow-card p-6">
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">통합 캘린더</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={prevMonth}
                  className="bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >
                  ◀
                </button>
                <span className="text-base font-bold min-w-[130px] text-center">
                  {monthLabel}
                </span>
                <button
                  onClick={nextMonth}
                  className="bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
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
                className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold border-none transition-all cursor-pointer ${
                  isAllSelected
                    ? "bg-foreground text-white"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
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
                  className={`w-3 h-3 rounded-full border-2 transition-all border-d-10 ${showLive && !isAllSelected ? "bg-d-10" : "bg-transparent"}`}
                />
                <span className={`font-semibold transition-colors ${showLive && !isAllSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  LIVE
                </span>
                <span className={`text-[10px] text-muted-foreground ml-[-2px] ${showLive && !isAllSelected ? "visible" : "invisible"}`}>▾</span>
              </button>

              {/* D-10 / PM / 디자이너 */}
              {STANDALONE_TAGS.map((t) => {
                const active = activeFilters.has(t.id) && !isAllSelected;
                const cls = TAG_CLS[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleStandalone(t.id)}
                    className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer transition-all"
                  >
                    <span
                      className={`w-3 h-3 rounded-full border-2 transition-all ${cls.border} ${active ? cls.bg : "bg-transparent"}`}
                    />
                    <span
                      className={`font-semibold transition-colors ${active ? cls.text : "text-muted-foreground"}`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* LIVE 서브필터 — 2단계 (Layout Stability: invisible로 공간 유지) */}
            <div className={`flex items-center gap-3 mb-2 pl-[88px] text-[11px] transition-opacity duration-150 ${
              showLive && !isAllSelected ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}>
              {PLATFORM_TAGS.map((p) => {
                const cls = PLAT_CLS[p.id];
                const on = activePlatforms.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className="flex items-center gap-1 bg-transparent border-none cursor-pointer transition-all"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border-[1.5px] transition-all ${cls.border} ${on ? cls.bg : "bg-transparent"}`}
                    />
                    <span
                      className={`font-medium transition-colors ${on ? cls.text : "text-muted-foreground"}`}
                    >
                      {p.label}
                    </span>
                  </button>
                );
              })}
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
                if (!day) return <div key={`e${i}`} className="min-h-[110px]" />;
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
                    className={`min-h-[110px] rounded-card p-1.5 overflow-hidden ${
                      isT
                        ? "bg-primary/5 border border-primary"
                        : isPast
                        ? "bg-surface-inset border border-border/30"
                        : "bg-surface-card border border-border/30"
                    } ${totalDetailEvts > 3 ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (totalDetailEvts > 3) setExpandedDay(showAll ? null : ds);
                    }}
                  >
                    <div
                      className={`text-[14px] px-1 mb-1 ${
                        isT
                          ? "font-bold text-primary"
                          : isPast
                          ? "font-semibold text-neutral-300"
                          : day.getDay() === 0
                          ? "font-semibold text-red-500"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      {/* LIVE 섹션 — 1번 슬롯 (Layout Stability: 필터 ON이면 빈 날에도 공간 유지) */}
                      <div className={showLive ? "min-h-[18px]" : "hidden"}>
                        {dayLiveEvts.map((ev, ei) => (
                          <div
                            key={`live-${ei}`}
                            onClick={(e) => { e.stopPropagation(); setModalKey(`${ev.ins}|${ev.lec}`); setModalDeleteConfirm(false); }}
                            className="rounded-md px-1.5 py-[3px] text-[10px] font-bold cursor-pointer leading-tight truncate"
                            style={{ background: ev.color + "18", color: ev.color, border: `1.5px solid ${ev.color}35` }}
                          >
                            <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-500 mr-0.5 align-middle flex-shrink-0" />{ev.ins}
                          </div>
                        ))}
                      </div>
                      {/* D-10 섹션 — 2번 슬롯 */}
                      <div className={showD10 ? "min-h-[18px]" : "hidden"}>
                        {dayD10Evts.map((ev, ei) => (
                          <div
                            key={`d10-${ei}`}
                            onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                            className="rounded-md px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity bg-yellow-50 text-yellow-700 border-[1.5px] border-yellow-200"
                          >
                            <span className="text-[9px] mr-0.5">⚠</span>{ev.ins} D-10
                          </div>
                        ))}
                      </div>
                      {/* PM 섹션 — 3번 슬롯 */}
                      <div className={showPm ? "min-h-[18px]" : "hidden"}>
                        {showDesigner ? (
                          dayPmCount > 0 ? (
                            <div
                              onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "pm" }); dispatch({ type: "SET_TAB", tab: "board" }); }}
                              className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity bg-neutral-100 text-neutral-500 border-[1.5px] border-neutral-200"
                            >
                              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-pm" />
                              PM {dayPmCount}건
                            </div>
                          ) : null
                        ) : (
                          <>
                            {(showAll ? dayPmEvts : dayPmEvts.slice(0, 3)).map((ev, ei) => (
                              <div
                                key={`pm-${ei}`}
                                onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                                className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity bg-neutral-100 text-neutral-500 border-[1.5px] border-neutral-200"
                              >
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-pm" />
                                <span className="truncate">{ev.ins}</span>
                                <span className="text-[9px] opacity-60 truncate">{ev.seqLabel}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      {/* 디자이너 섹션 — 4번 슬롯 */}
                      <div className={showDesigner ? "min-h-[18px]" : "hidden"}>
                        {showPm ? (
                          dayDesCount > 0 ? (
                            <div
                              onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_TOP_TAB", tab: "designer" }); dispatch({ type: "SET_DESIGNER_TAB", tab: "timeline" }); }}
                              className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity bg-neutral-100 text-neutral-500 border-[1.5px] border-neutral-200"
                            >
                              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-designer" />
                              디자인 {dayDesCount}건
                            </div>
                          ) : null
                        ) : (
                          <>
                            {(showAll ? dayDesEvts : dayDesEvts.slice(0, 3)).map((ev, ei) => (
                              <div
                                key={`des-${ei}`}
                                onClick={(e) => { e.stopPropagation(); goToDesignerTimeline(ev.ins, ev.lec); }}
                                className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate hover:opacity-80 transition-opacity bg-neutral-100 text-neutral-500 border-[1.5px] border-neutral-200"
                              >
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-designer" />
                                <span className="truncate">{ev.ins}</span>
                                <span className="text-[9px] opacity-60 truncate">{ev.phaseLabel}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      {/* 더 보기 / 접기 */}
                      {totalDetailEvts > 3 && !showAll && (
                        <div className="text-[9px] text-muted-foreground text-center font-semibold py-0.5 cursor-pointer">
                          +{totalDetailEvts - 3}개
                        </div>
                      )}
                      {totalDetailEvts > 3 && showAll && (
                        <div className="text-[9px] text-muted-foreground text-center py-0.5">접기 ▲</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

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
            <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" />
            <div
              className="relative bg-surface-card rounded-card shadow-dropdown w-[340px] p-6 animate-fi"
              style={{ borderTop: `4px solid ${mColor}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 닫기 */}
              <button
                onClick={() => setModalKey(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-[13px] text-muted-foreground border-none cursor-pointer hover:bg-accent"
              >
                ✕
              </button>

              {/* 헤더 */}
              <div className="mb-4 pr-6">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[16px] font-bold" style={{ color: mColor }}>{mIns}</span>
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
                <div className="h-2 bg-neutral-track rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${mPmTotal ? (mPmChecked / mPmTotal) * 100 : 0}%`, background: mColor }} />
                </div>
              </div>

              {/* 디자이너 진행율 */}
              <div className="mb-4">
                <div className="flex justify-between text-[12px] font-semibold mb-1">
                  <span className="text-designer">디자이너 진행</span>
                  <span className="text-muted-foreground">{mDesProg.checked}/{mDesProg.total}</span>
                </div>
                <div className="h-2 bg-neutral-track rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-designer" style={{ width: `${mDesProg.total ? (mDesProg.checked / mDesProg.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* 이동 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setModalKey(null); goToBoard(mIns, mLec); }}
                  className="flex-1 rounded-card py-2 text-[12px] font-semibold border-none cursor-pointer transition-colors"
                  style={{ background: `${mColor}18`, color: mColor }}
                >
                  PM 보드
                </button>
                <button
                  onClick={() => { setModalKey(null); goToDesignerTimeline(mIns, mLec); }}
                  className="flex-1 rounded-card py-2 text-[12px] font-semibold border-none cursor-pointer transition-colors bg-designer/10 text-designer"
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
                        className="flex-1 rounded-card py-2 text-[12px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        삭제 확인
                      </button>
                      <button
                        onClick={() => setModalDeleteConfirm(false)}
                        className="flex-1 rounded-card py-2 text-[12px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalDeleteConfirm(true)}
                    className="w-full rounded-card py-2 text-[12px] font-semibold border-none cursor-pointer bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
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
