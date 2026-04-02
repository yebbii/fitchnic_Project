"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToDesignerTimeline, useToggleDesignerMilestone } from "@/hooks/use-crm-store";
import { DESIGNER_MILESTONES, HOME_TAB_COLORS } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay, resolveColor } from "@/lib/utils";
import { useCalendar } from "@/hooks/use-calendar";
import type { MilestoneId } from "@/lib/types";
import AssigneeManagerModal from "./assignee-manager-modal";

export default function DesignerCalendarTab() {
  const { state, dispatch } = useCrm();
  const goToTimeline = useGoToDesignerTimeline();
  const toggleMilestone = useToggleDesignerMilestone();
  const { today, calMonth, calDays, prevMonth, nextMonth, monthLabel } = useCalendar();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [dropdown, setDropdown] = useState<string | null>(null); // "project|curKey" | "ms|curKey|milestoneId"
  const [showMoreProjects, setShowMoreProjects] = useState(false);
  const [showAssigneeMgr, setShowAssigneeMgr] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);

  const toggleProject = (curKey: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(curKey)) next.delete(curKey);
      else next.add(curKey);
      return next;
    });
  };

  /* 담당자 색상 조회 */
  const getAssigneeColor = (name: string) =>
    state.assignees.find((a) => a.name === name)?.color ?? null;

  /* 마일스톤의 실효 담당자: 개별 담당자 > 프로젝트 담당자 */
  const effectiveAssignee = (curKey: string, milestoneId: MilestoneId): string => {
    const own = state.designerMilestones[curKey]?.[milestoneId]?.assignee ?? "";
    if (own) return own;
    return state.designerProjectAssignees[curKey] ?? "";
  };

  /* 진행중 강의 프로젝트 목록 */
  const projects = useMemo(() => {
    const list: { ins: string; lec: string; liveDate: string; color: string; platform: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          list.push({
            ins, lec, liveDate: lD.liveDate,
            color: resolveColor(state.platformColors, lD.platform),
            platform: lD.platform,
          });
        });
    });
    return list.sort((a, b) => a.liveDate.localeCompare(b.liveDate));
  }, [state.data, state.platformColors]);

  /* 디자이너 캘린더 이벤트 */
  const events = useMemo(() => {
    const ev: {
      date: string; ins: string; lec: string;
      color: string;
      isLive: boolean;
      milestoneId?: string; milestoneLabel?: string; milestoneTitle?: string; milestoneColor?: string;
      checked?: boolean; assignee?: string; assigneeColor?: string;
    }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          const color = resolveColor(state.platformColors, lD.platform);
          const curKey = `${ins}|${lec}`;
          const mks = state.designerMilestones[curKey] || {};
          const projectAssignee = state.designerProjectAssignees[curKey] ?? "";
          DESIGNER_MILESTONES.forEach((ms) => {
            const ownAssignee = mks[ms.id as MilestoneId]?.assignee ?? "";
            const assigneeName = ownAssignee || projectAssignee;
            const assigneeColor = assigneeName
              ? state.assignees.find((a) => a.name === assigneeName)?.color
              : undefined;
            ev.push({
              date: fmtDate(addDays(lD.liveDate, ms.dayOffset)),
              ins, lec, color, isLive: false,
              milestoneId: ms.id, milestoneLabel: ms.label,
              milestoneTitle: ms.title, milestoneColor: ms.color,
              checked: mks[ms.id as MilestoneId]?.checked ?? false,
              assignee: assigneeName,
              assigneeColor,
            });
          });
          ev.push({ date: lD.liveDate, ins, lec, color, isLive: true });
        });
    });
    return ev;
  }, [state.data, state.designerMilestones, state.designerProjectAssignees, state.platformColors, state.assignees]);

  const todayStr = fmtDate(today);

  /* 담당자 필터용 목록 (프로젝트에 배정된 디자이너 담당자들) */
  const assigneeList = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(({ ins, lec }) => {
      const curKey = `${ins}|${lec}`;
      const name = state.designerProjectAssignees[curKey];
      if (name) names.add(name);
    });
    return Array.from(names).map((name) => ({
      name,
      color: state.assignees.find((a) => a.name === name)?.color ?? "#aeaeb2",
    }));
  }, [projects, state.designerProjectAssignees, state.assignees]);

  /* 필터된 이벤트 & 프로젝트 */
  const filteredEvents = useMemo(() => {
    if (!filterAssignee) return events;
    return events.filter((ev) => {
      if (ev.isLive) {
        const curKey = `${ev.ins}|${ev.lec}`;
        return state.designerProjectAssignees[curKey] === filterAssignee;
      }
      return ev.assignee === filterAssignee;
    });
  }, [events, filterAssignee, state.designerProjectAssignees]);

  const filteredProjects = useMemo(() => {
    if (!filterAssignee) return projects;
    return projects.filter(({ ins, lec }) => {
      const curKey = `${ins}|${lec}`;
      return state.designerProjectAssignees[curKey] === filterAssignee;
    });
  }, [projects, filterAssignee, state.designerProjectAssignees]);

  /* 담당자 드롭다운 공통 렌더 */
  const AssigneeDropdown = ({
    dropKey,
    currentName,
    onSelect,
    role,
  }: {
    dropKey: string;
    currentName: string;
    onSelect: (name: string) => void;
    role?: "pm" | "designer";
  }) => {
    const filtered = role ? state.assignees.filter((a) => a.role === role) : state.assignees;
    return (
      <div
        className="absolute left-0 top-full mt-0.5 z-[100] bg-white rounded-xl shadow-lg py-1 min-w-[140px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { onSelect(""); setDropdown(null); }}
          className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary border-none bg-transparent cursor-pointer"
        >
          없음
        </button>
        {filtered.length === 0 && (
          <div className="px-3 py-1.5 text-[11px] text-[#aeaeb2]">담당자를 먼저 추가하세요</div>
        )}
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => { onSelect(a.name); setDropdown(null); }}
            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-secondary border-none bg-transparent cursor-pointer ${currentName === a.name ? "bg-secondary" : ""}`}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
              style={{ background: a.color }}
            >
              {a.name.slice(0, 1)}
            </div>
            <span className="text-[11px] font-semibold">{a.name}</span>
          </button>
        ))}
        <div className="border-t border-border mt-1 pt-1">
          <button
            onClick={() => { setDropdown(null); setShowAssigneeMgr(true); }}
            className="w-full text-left px-3 py-1.5 text-[11px] text-primary font-semibold hover:bg-secondary border-none bg-transparent cursor-pointer"
          >
            ⚙️ 담당자 관리
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden animate-fi" onClick={() => setDropdown(null)}>
      {/* ── 사이드 패널 ── */}
      <aside className="w-72 shrink-0 border-r border-border/50 bg-surface-sidebar overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/40 bg-surface-sidebar">
          <h3 className="text-[15px] font-medium text-foreground">{calMonth.getMonth() + 1}월 진행강의 {projects.filter(({ liveDate }) => { const d = new Date(liveDate); return d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth(); }).length}개</h3>
        </div>

        {projects.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-[13px]">진행중인 강의가 없습니다</div>
        )}

        {(() => {
          const displayed = showMoreProjects ? projects : projects.slice(0, 5);

          return (
        <div className="flex flex-col gap-2 px-4 py-3">
          {displayed.map(({ ins, lec, liveDate, color }) => {
            const curKey = `${ins}|${lec}`;
            const milestones = state.designerMilestones[curKey] || {};
            const isExpanded = expandedProjects.has(curKey);
            const projectAssigneeName = state.designerProjectAssignees[curKey] ?? "";
            const projectAssigneeColor = projectAssigneeName ? getAssigneeColor(projectAssigneeName) : null;
            const pmName = state.pmProjectAssignees[curKey] ?? "";
            const pmColor = pmName ? getAssigneeColor(pmName) : null;
            const projectDropKey = `project|${curKey}`;
            const msCheckedCount = DESIGNER_MILESTONES.filter((m) => milestones[m.id]?.checked).length;
            const msTotal = DESIGNER_MILESTONES.length;

            return (
              <div key={curKey} className="rounded-[12px] border border-border/40 overflow-hidden">
                {/* 헤더: 플랫폼 컬러 8% 배경 */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ background: `${color}14` }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-medium truncate" style={{ color: color }}>{ins}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap flex-shrink-0">
                    🔴 {fmtDateKr(liveDate)}
                  </div>
                </div>

                {/* 바디 */}
                <div className="px-4 py-3">
                  {/* 강의명 + 담당자들 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[13px] font-medium text-foreground truncate">{lec}</div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {/* 디자이너 담당자 */}
                      <div className="relative">
                        <div
                          onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === projectDropKey ? null : projectDropKey); }}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                            style={{ background: projectAssigneeColor ?? "#d1d5db" }}
                          >
                            {projectAssigneeName ? projectAssigneeName.slice(0, 1) : "?"}
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: projectAssigneeColor ?? "#aeaeb2" }}>
                            {projectAssigneeName || "미지정"}
                          </span>
                        </div>
                        {dropdown === projectDropKey && (
                          <AssigneeDropdown
                            dropKey={projectDropKey}
                            currentName={projectAssigneeName}
                            onSelect={(name) => dispatch({ type: "SET_DESIGNER_PROJECT_ASSIGNEE", curKey, assignee: name })}
                            role="designer"
                          />
                        )}
                      </div>
                      {/* PM 담당자 */}
                      <div className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                          style={{ background: pmColor ?? "#d1d5db" }}
                        >
                          {pmName ? pmName.slice(0, 1) : "?"}
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: pmColor ?? "#aeaeb2" }}>
                          {pmName ? `PM ${pmName}` : "PM 미지정"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3행: 진행률 바 */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-muted-foreground">마일스톤</span>
                      <span className="font-semibold text-muted-foreground">{msCheckedCount}/{msTotal}</span>
                    </div>
                    <div className="h-[3px] bg-neutral-track rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all bg-designer" style={{ width: `${msTotal ? (msCheckedCount / msTotal) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {/* 마일스톤 목록 (펼쳤을 때) */}
                  {isExpanded && (
                    <div className="flex flex-col gap-1.5 mt-3">
                      {DESIGNER_MILESTONES.map((ms) => {
                        const msDate = fmtDate(addDays(liveDate, ms.dayOffset));
                        const item = milestones[ms.id] || { checked: false, assignee: "" };
                        const isPast = msDate < todayStr;
                        const msDropKey = `ms|${curKey}|${ms.id}`;
                        const effName = item.assignee || projectAssigneeName;
                        const effColor = effName ? getAssigneeColor(effName) : null;
                        const isInherited = !item.assignee && !!projectAssigneeName;

                        return (
                          <div
                            key={ms.id}
                            className={`rounded-xl px-3 py-2.5 border transition-colors ${
                              item.checked
                                ? "bg-gray-50 border-gray-200"
                                : isPast
                                ? "bg-red-50 border-red-100"
                                : "bg-[#fafafa] border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleMilestone(curKey, ms)}
                                className="w-4 h-4 mt-[2px] flex-shrink-0 rounded border-none cursor-pointer flex items-center justify-center text-[11px] font-bold transition-colors"
                                style={{
                                  background: item.checked ? "#9ca3af" : "transparent",
                                  border: `1.5px solid ${item.checked ? "#9ca3af" : ms.color}`,
                                  color: "#fff",
                                }}
                              >
                                {item.checked ? "✓" : ""}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: ms.color + "20", color: ms.color }}
                                  >
                                    {ms.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">{msDate}</span>
                                  {isPast && !item.checked && (
                                    <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded-full">지남</span>
                                  )}
                                </div>
                                <div className={`text-[11px] font-semibold leading-snug mb-1.5 ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {ms.title}
                                </div>

                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 토글 버튼 (하단) */}
                  <button
                    onClick={() => toggleProject(curKey)}
                    className="w-full mt-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer flex items-center justify-center gap-1 select-none border-t border-border"
                  >
                    {isExpanded ? "▲ 접기" : "타임라인 더보기 ▼"}
                  </button>
                </div>
              </div>
            );
          })}
          {projects.length > 5 && !showMoreProjects && (
            <button
              onClick={() => setShowMoreProjects(true)}
              className="w-full py-2 text-[12px] font-semibold bg-white rounded-xl cursor-pointer transition-colors"
              style={{ color: HOME_TAB_COLORS.designer, border: `1px solid ${HOME_TAB_COLORS.designer}4d` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOME_TAB_COLORS.designer + "0d"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              + 나머지 {projects.length - 5}개 더보기
            </button>
          )}
          {showMoreProjects && projects.length > 5 && (
            <button
              onClick={() => setShowMoreProjects(false)}
              className="w-full py-2 text-[11px] text-[#aeaeb2] bg-transparent border-none cursor-pointer hover:text-[#6e6e73]"
            >
              ▲ 접기
            </button>
          )}
        </div>
          );
        })()}
      </aside>

      {/* ── 캘린더 ── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-surface-card rounded-card shadow-card p-6">
          <div className="flex justify-between items-center mb-[18px]">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">디자이너 캘린더</h3>
              {/* 뷰 토글 */}
              <div className="flex gap-0.5 bg-[#F0F1F4] rounded-xl p-[3px]">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1 ${
                    viewMode === "calendar" ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="14" x2="8" y2="14" strokeLinecap="round"/><line x1="12" y1="14" x2="12" y2="14" strokeLinecap="round"/><line x1="16" y1="14" x2="16" y2="14" strokeLinecap="round"/><line x1="8" y1="18" x2="8" y2="18" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round"/></svg>
                  달력
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1 ${
                    viewMode === "table" ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  표
                </button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={prevMonth}
                className="bg-[#F0F1F4] rounded-xl px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
              >◀</button>
              <span className="text-lg font-bold min-w-[150px] text-center">
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                className="bg-[#F0F1F4] rounded-xl px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
              >▶</button>
            </div>
          </div>

          {/* ── 담당자 필터 ── */}
          {assigneeList.length > 0 && (
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              <button
                onClick={() => setFilterAssignee(null)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                  filterAssignee === null
                    ? "bg-foreground text-white"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                전체
              </button>
              {assigneeList.map((a) => (
                <button
                  key={a.name}
                  onClick={() => setFilterAssignee(filterAssignee === a.name ? null : a.name)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold border-none cursor-pointer transition-colors flex items-center gap-1.5"
                  style={filterAssignee === a.name ? {
                    background: a.color,
                    color: "#fff",
                  } : {
                    background: a.color + "18",
                    color: a.color,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                    style={{ background: filterAssignee === a.name ? "rgba(255,255,255,0.3)" : a.color }}
                  >
                    {a.name.slice(0, 1)}
                  </div>
                  {a.name}
                </button>
              ))}
            </div>
          )}

          {/* ── 오늘 할 일 배너 ── */}
          {(() => {
            const todayTasks = filteredEvents.filter((ev) => !ev.isLive && ev.date === todayStr && !ev.checked);
            if (todayTasks.length === 0) return null;
            return (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-[13px] font-bold text-amber-700 flex-shrink-0 whitespace-nowrap">
                    오늘 할 일 ({todayTasks.length}건)
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {todayTasks.map((ev, i) => (
                      <span
                        key={i}
                        onClick={() => goToTimeline(ev.ins, ev.lec)}
                        className="text-[12px] text-amber-800 cursor-pointer hover:underline"
                      >
                        <span className="font-bold">{ev.lec}</span>
                        {" "}
                        <span className="font-bold" style={{ color: ev.milestoneColor }}>{ev.milestoneLabel}</span>
                        {" "}
                        <span className="text-amber-600">{ev.milestoneTitle}</span>
                        {i < todayTasks.length - 1 && <span className="text-amber-300 ml-1">·</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── 표 뷰 ── */}
          {viewMode === "table" && (() => {
            function dday(dateStr: string) {
              const t = new Date(); t.setHours(0,0,0,0);
              const d = new Date(dateStr); d.setHours(0,0,0,0);
              return Math.round((d.getTime() - t.getTime()) / 86400000);
            }
            function ddayBadge(dateStr: string, checked: boolean) {
              const diff = dday(dateStr);
              if (checked) return <span className="text-[10px] font-bold text-[#aeaeb2] bg-[#f0f0f0] rounded-full px-2 py-0.5">완료</span>;
              if (diff < 0) return <span className="text-[10px] font-bold text-[#aeaeb2] bg-[#f5f5f5] rounded-full px-2 py-0.5">D+{Math.abs(diff)}</span>;
              if (diff === 0) return <span className="text-[10px] font-bold text-white bg-red-400 rounded-full px-2 py-0.5">오늘!</span>;
              if (diff <= 3) return <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded-full px-2 py-0.5">D-{diff}</span>;
              if (diff <= 7) return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">D-{diff}</span>;
              return <span className="text-[10px] font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5">D-{diff}</span>;
            }

            // 프로젝트별로 그룹핑
            if (filteredProjects.length === 0) {
              return <div className="text-center text-muted-foreground py-16 text-[13px]">{filterAssignee ? `${filterAssignee} 담당 강의가 없습니다` : "진행중인 강의가 없습니다"}</div>;
            }

            return (
              <div className="grid grid-cols-2 gap-4">
                {filteredProjects.map(({ ins, lec, liveDate, color }) => {
                  const curKey = `${ins}|${lec}`;
                  const milestones = state.designerMilestones[curKey] || {};
                  const projectAssigneeName = state.designerProjectAssignees[curKey] ?? "";
                  const projectAssigneeColor = projectAssigneeName ? getAssigneeColor(projectAssigneeName) : null;
                  const liveDiff = dday(liveDate);

                  return (
                    <div key={curKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {/* 프로젝트 헤더 */}
                      <div
                        className="flex items-center justify-between px-4 py-3 gap-2"
                        style={{ borderLeft: `4px solid ${color}`, background: color + "08" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[14px] flex-shrink-0" style={{ color: color }}>{ins}</span>
                          <span className="text-[12px] text-muted-foreground font-medium truncate">{lec}</span>
                          {projectAssigneeName && (
                            <button
                              onClick={() => setFilterAssignee(filterAssignee === projectAssigneeName ? null : projectAssigneeName)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border-none cursor-pointer flex-shrink-0 transition-colors"
                              style={filterAssignee === projectAssigneeName ? {
                                background: projectAssigneeColor ?? "#aeaeb2",
                                color: "#fff",
                              } : {
                                background: (projectAssigneeColor ?? "#aeaeb2") + "18",
                                color: projectAssigneeColor ?? "#aeaeb2",
                              }}
                            >
                              <div
                                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0"
                                style={{ background: filterAssignee === projectAssigneeName ? "rgba(255,255,255,0.3)" : (projectAssigneeColor ?? "#aeaeb2") }}
                              >
                                {projectAssigneeName.slice(0, 1)}
                              </div>
                              {projectAssigneeName}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground">🔴</span>
                          <span className="text-[11px] font-bold text-foreground">{fmtDateKr(liveDate)}</span>
                          {liveDiff >= 0
                            ? <span className="text-[10px] font-bold text-white bg-red-400 rounded-full px-1.5 py-0.5">{liveDiff === 0 ? "오늘" : `D-${liveDiff}`}</span>
                            : <span className="text-[10px] font-bold text-[#aeaeb2] bg-[#f5f5f5] rounded-full px-1.5 py-0.5">D+{Math.abs(liveDiff)}</span>
                          }
                        </div>
                      </div>

                      {/* 마일스톤 테이블 */}
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-[#fafafa]">
                            <th className="text-left py-2 px-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wide w-[90px]">단계</th>
                            <th className="text-left py-2 px-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wide">작업 내용</th>
                            <th className="text-left py-2 px-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wide w-[110px]">날짜</th>
                            <th className="text-left py-2 px-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wide w-[80px]">D-day</th>
                            <th className="text-center py-2 px-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wide w-[50px]">완료</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DESIGNER_MILESTONES.map((ms) => {
                            const msDate = fmtDate(addDays(liveDate, ms.dayOffset));
                            const item = milestones[ms.id as MilestoneId] || { checked: false, assignee: "" };
                            const isPast = msDate < todayStr && !item.checked;
                            const isToday = msDate === todayStr;
                            const effAssignee = item.assignee || projectAssigneeName;
                            const effColor = effAssignee ? state.assignees.find((a) => a.name === effAssignee)?.color : undefined;
                            const msDropKey = `ms|${curKey}|${ms.id}`;
                            const days7 = ["일","월","화","수","목","금","토"];
                            const dObj = new Date(msDate);

                            return (
                              <tr
                                key={ms.id}
                                className={`border-b border-border/40 transition-colors hover:bg-secondary/20 ${
                                  item.checked ? "bg-[#f7f7f7]" : isToday ? "bg-amber-50/50" : isPast ? "bg-red-50/30" : ""
                                }`}
                              >
                                {/* 단계 */}
                                <td className="py-2.5 px-4">
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={item.checked
                                      ? { background: "#ebebeb", color: "#aeaeb2" }
                                      : { background: ms.color + "20", color: ms.color }}
                                  >
                                    {ms.label}
                                  </span>
                                </td>
                                {/* 작업 내용 */}
                                <td className="py-2.5 px-4">
                                  <span className={`text-[12px] ${item.checked ? "line-through text-muted-foreground" : isPast ? "text-red-500 font-semibold" : "text-foreground"}`}>
                                    {ms.title}
                                  </span>
                                  {isPast && !item.checked && (
                                    <span className="ml-1.5 text-[9px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded-full">지남</span>
                                  )}
                                </td>
                                {/* 날짜 */}
                                <td className="py-2.5 px-4">
                                  <span className={`text-[11px] font-semibold ${isToday ? "text-amber-600" : isPast ? "text-[#ccc]" : "text-muted-foreground"}`}>
                                    {dObj.getMonth()+1}/{dObj.getDate()}({days7[dObj.getDay()]})
                                  </span>
                                </td>
                                {/* D-day */}
                                <td className="py-2.5 px-4">
                                  {ddayBadge(msDate, item.checked ?? false)}
                                </td>
                                {/* 완료 체크 */}
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    onClick={() => toggleMilestone(curKey, ms)}
                                    className="w-5 h-5 rounded border-none cursor-pointer flex items-center justify-center text-[11px] font-bold transition-colors mx-auto"
                                    style={{
                                      background: item.checked ? "#22c55e" : "transparent",
                                      border: `1.5px solid ${item.checked ? "#22c55e" : ms.color}`,
                                      color: "#fff",
                                    }}
                                  >
                                    {item.checked ? "✓" : ""}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── 달력 뷰 ── */}
          {viewMode === "calendar" && <>
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
              const dayEvts = filteredEvents.filter((e) => e.date === ds).sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
              const isT = isSameDay(day, today);
              const isPast = day < today && !isT;
              const showAll = expandedDay === ds;

              return (
                <div
                  key={ds}
                  className={`min-h-[110px] rounded-xl p-1.5 overflow-hidden ${
                    isT
                      ? "border border-border/30"
                      : isPast
                      ? "bg-[#fafafa] border border-border/30"
                      : "bg-white border border-border/30"
                  } ${dayEvts.length > 2 ? "cursor-pointer" : ""}`}
                  style={isT ? { background: HOME_TAB_COLORS.designer + "0d", borderColor: HOME_TAB_COLORS.designer } : undefined}
                  onClick={() => { if (dayEvts.length > 2) setExpandedDay(showAll ? null : ds); }}
                >
                  <div
                    className={`text-[15px] px-1 mb-1 ${
                      isT ? "font-bold"
                      : isPast ? "font-semibold text-[#ccc]"
                      : day.getDay() === 0 ? "font-semibold text-red-500"
                      : "font-semibold text-foreground"
                    }`}
                    style={isT ? { color: HOME_TAB_COLORS.designer } : undefined}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(showAll ? dayEvts : dayEvts.slice(0, 2)).map((ev, ei) => {
                      const evMs = !ev.isLive ? DESIGNER_MILESTONES.find((m) => m.id === ev.milestoneId) : null;
                      return (
                        <div
                          key={ei}
                          onClick={(e) => { e.stopPropagation(); goToTimeline(ev.ins, ev.lec); }}
                          className="rounded-lg px-1.5 py-1 text-xs font-semibold text-left cursor-pointer leading-tight"
                          style={ev.isLive ? {
                            background: ev.color + "15",
                            border: `1px solid ${ev.color}40`,
                          } : ev.checked ? {
                            background: "#f0f0f0",
                            border: "1px solid #e0e0e0",
                          } : ev.assigneeColor ? {
                            background: ev.assigneeColor + "18",
                            border: `1px solid ${ev.assigneeColor}38`,
                          } : {
                            background: "#f5f5f5",
                            border: "1px solid #e0e0e0",
                          }}
                        >
                          {ev.isLive ? (
                            <div className="flex items-center gap-0.5">
                              <span>🔴</span>
                              <span className="font-bold truncate" style={{ color: ev.color }}>{ev.ins}</span>
                              <span className="text-[10px] font-semibold ml-0.5" style={{ color: ev.color }}>LIVE</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-0.5">
                                {/* 체크 토글 (캘린더 ↔ 타임라인 ↔ 마일스톤 3자 연동) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (evMs) toggleMilestone(`${ev.ins}|${ev.lec}`, evMs);
                                  }}
                                  className="w-3 h-3 rounded-sm flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-white border-none cursor-pointer p-0"
                                  style={{
                                    background: ev.checked ? "#9ca3af" : "transparent",
                                    border: `1.5px solid ${ev.checked ? "#9ca3af" : (ev.milestoneColor ?? "#ccc")}`,
                                  }}
                                >
                                  {ev.checked ? "✓" : ""}
                                </button>
                                <span className="text-[9px] font-bold px-1 rounded-full flex-shrink-0 bg-[#e8e8e8] text-[#aeaeb2]">
                                  {ev.milestoneLabel}
                                </span>
                                <span className="font-bold truncate" style={{ color: ev.checked ? "#aeaeb2" : ev.color }}>{ev.ins}</span>
                              </div>
                              <div className={`text-[10px] font-medium truncate ${ev.checked ? "line-through" : ""}`} style={{ color: ev.checked ? "#c0c0c0" : "#6e6e73" }}>
                                {ev.milestoneTitle}
                              </div>
                              {ev.assignee && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <div
                                    className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0"
                                    style={{ background: ev.checked ? "#d0d0d0" : (ev.assigneeColor ?? "#aeaeb2") }}
                                  >
                                    {ev.assignee.slice(0, 1)}
                                  </div>
                                  <span className="text-[9px] truncate" style={{ color: ev.checked ? "#c0c0c0" : "#6e6e73" }}>{ev.assignee}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {dayEvts.length > 2 && !showAll && (
                      <div className="text-xs text-center font-semibold py-0.5 cursor-pointer" style={{ color: HOME_TAB_COLORS.designer }}>
                        +{dayEvts.length - 2}개 더 보기
                      </div>
                    )}
                    {dayEvts.length > 2 && showAll && (
                      <div className="text-[11px] text-[#aeaeb2] text-center py-0.5">접기 ▲</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>}
        </div>
      </main>
      {showAssigneeMgr && <AssigneeManagerModal onClose={() => setShowAssigneeMgr(false)} />}
    </div>
  );
}
