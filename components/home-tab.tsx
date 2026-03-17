"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ, DEFAULT_DESIGN_SEQ, HOME_TAB_COLORS, DESIGNER_MILESTONES } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay } from "@/lib/utils";
type FilterTagId = "d10" | "pm" | "designer";
type PlatformFilterId = "fitchnic" | "moneyup";

const STANDALONE_TAGS: { id: FilterTagId; label: string; color: string }[] = [
  { id: "d10", label: "D-10", color: "#ef4444" },
  { id: "pm", label: "PM 업무", color: "#f97316" },
  { id: "designer", label: "디자이너", color: "#764ba2" },
];

const PLATFORM_TAGS: { id: PlatformFilterId; label: string; color: string }[] = [
  { id: "fitchnic", label: "핏크닉", color: "#38BDF8" },
  { id: "moneyup", label: "머니업", color: "#22C55E" },
];

const PM_DEFAULT_TOTAL = DEFAULT_SEQ.reduce((s, p) => s + p.items.length, 0);

/* 디자이너 캘린더 기준 진행률 (마일스톤 D-28/D-14/D-10/D-3 완료 수 / 4) */
function getDesignerProgress(
  curKey: string,
  designerMilestones: Record<string, Record<string, { checked?: boolean; assignee?: string }>>,
) {
  const ms = designerMilestones[curKey] || {};
  const total = DESIGNER_MILESTONES.length;
  const checked = DESIGNER_MILESTONES.filter((m) => ms[m.id]?.checked).length;
  return { total, checked };
}

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

  /* 오늘~3일 내 할 일 (PM 시퀀스 + 디자이너 체크리스트) */
  const todoItems = useMemo(() => {
    const todayStr = fmtDate(today);
    type TodoItem = { date: string; ins: string; lec: string; label: string; itemId: string; kind: "pm" | "designer" | "live"; done: boolean; color: string };
    const items: TodoItem[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          const curKey = `${ins}|${lec}`;
          const cardColor = state.platformColors[lD.platform] ?? lD.color ?? iD.color;
          const ck = state.allChecks[curKey] || {};
          // PM 시퀀스 아이템
          const seq = state.seqDataMap[curKey] || DEFAULT_SEQ;
          seq.forEach((phase) => {
            const d = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            if (d >= todayStr && d <= fmtDate(addDays(todayStr, 3))) {
              phase.items.forEach((it) => {
                items.push({ date: d, ins, lec, label: `${it.name}`, itemId: it.id, kind: "pm", done: !!ck[it.id], color: cardColor });
              });
            }
          });
          // 디자이너 체크리스트 아이템
          const dck = state.designChecks[curKey] || {};
          DEFAULT_DESIGN_SEQ.forEach((phase) => {
            const d = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            if (d >= todayStr && d <= fmtDate(addDays(todayStr, 3))) {
              phase.items.forEach((it) => {
                items.push({ date: d, ins, lec, label: `${it.name}`, itemId: it.id, kind: "designer", done: !!dck[it.id], color: cardColor });
              });
            }
          });
          // LIVE 당일
          if (lD.liveDate >= todayStr && lD.liveDate <= fmtDate(addDays(todayStr, 3))) {
            if (lD.liveDate === fmtDate(addDays(lD.liveDate, 0))) {
              items.push({ date: lD.liveDate, ins, lec, label: `라이브 ${lD.liveTime}`, itemId: `live_${curKey}`, kind: "live", done: false, color: cardColor });
            }
          }
        });
    });
    items.sort((a, b) => a.date.localeCompare(b.date) || (a.done ? 1 : 0) - (b.done ? 1 : 0));
    // 날짜별 그룹
    const grouped: Record<string, TodoItem[]> = {};
    items.forEach((item) => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [state.data, state.allChecks, state.designChecks, state.seqDataMap, state.platformColors]);

  /* 강의 LIVE 이벤트 (라이브 당일) — 완료된 강의도 포함 */
  const liveEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; color: string; platform: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([lec, lD]) => {
          ev.push({ date: lD.liveDate, ins, lec, color: state.platformColors[lD.platform] ?? lD.color ?? iD.color, platform: lD.platform || "" });
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

  /* 디자이너: 날짜별 작업 단계 수 (전체 뷰용 요약 — 단계 1건 = 1건) */
  const designerSummaryByDate = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(state.data).forEach(([, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.liveDate)
        .forEach(([, lD]) => {
          DEFAULT_DESIGN_SEQ.forEach((phase) => {
            const date = fmtDate(addDays(lD.liveDate, phase.dayOffset));
            map[date] = (map[date] || 0) + 1;
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

  return (
    <div className="flex min-h-[calc(100vh-52px)] animate-fi">
      {/* ── 좌측 사이드바: 오늘 할 일 ── */}
      <aside className="w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 border-r border-border bg-white flex flex-col sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable" }}>
        <div className="px-4 py-4 flex-1">
          {todoItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-[13px] font-semibold text-foreground">할 일이 없습니다</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">3일 내 예정된 작업이 없어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {todoItems.map(([date, items]) => {
                const diff = diffDays(date);
                const dayLabel = diff === 0 ? "오늘" : diff === 1 ? "내일" : fmtDayLabel(date);
                const doneCount = items.filter((t) => t.done).length;
                const totalCount = items.length;
                return (
                  <div key={date}>
                    {/* 날짜 헤더 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-extrabold ${diff === 0 ? "text-primary" : "text-foreground"}`}>
                          {dayLabel}
                        </span>
                        {diff === 0 && (
                          <span className="text-[9px] font-bold text-white bg-primary rounded-full px-1.5 py-0.5">TODAY</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                    {/* 진행률 바 */}
                    <div className="h-1 bg-secondary rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`, background: diff === 0 ? "var(--primary)" : "#a1a1aa" }}
                      />
                    </div>
                    {/* 아이템 리스트 */}
                    <div className="flex flex-col gap-0.5">
                      {items.map((item) => (
                        <div
                          key={item.itemId}
                          onClick={() => {
                            if (item.kind === "live" || item.kind === "pm") goToBoard(item.ins, item.lec);
                            else goToDesignerTimeline(item.ins, item.lec);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            item.done ? "opacity-40" : "hover:bg-secondary"
                          }`}
                        >
                          {/* 상태 표시 */}
                          <div
                            className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 text-[8px] ${
                              item.done ? "border-gray-300 bg-gray-100 text-gray-400" : "border-gray-300"
                            }`}
                          >
                            {item.done && "✓"}
                          </div>
                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] font-semibold truncate ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.label}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: item.color }} />
                              <span className="text-[10px] text-muted-foreground truncate">{item.ins} · {item.lec}</span>
                            </div>
                          </div>
                          {/* 종류 뱃지 */}
                          {item.kind === "live" && (
                            <span className="text-[8px] font-bold text-white bg-red-400 rounded-full px-1.5 py-0.5 flex-shrink-0">LIVE</span>
                          )}
                          {item.kind === "designer" && (
                            <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
                          )}
                          {item.kind === "pm" && (
                            <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#d97706" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── 우측: 달력 ── */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-[0_2px_8px_rgba(0,0,0,.04)]">
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold">📅 통합 캘린더</h3>
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
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#d97706" }} />
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
                                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#d97706" }} />
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
                                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
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
                                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
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
        const mColor = state.platformColors[mLD.platform ?? ""] ?? mID.color;
        const mPmSeq = state.seqDataMap[modalKey] || DEFAULT_SEQ;
        const mPmTotal = mPmSeq.reduce((s, p) => s + p.items.length, 0);
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
