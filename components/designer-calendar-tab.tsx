"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DESIGNER_MILESTONES } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay } from "@/lib/utils";
import type { MilestoneId } from "@/lib/types";

export default function DesignerCalendarTab() {
  const { state, dispatch } = useCrm();
  const goToTimeline = useGoToDesignerTimeline();
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [dropdown, setDropdown] = useState<string | null>(null); // "project|curKey" | "ms|curKey|milestoneId"
  const [showMoreProjects, setShowMoreProjects] = useState(false);

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
    const list: { ins: string; lec: string; liveDate: string; color: string; insColor: string; platform: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          list.push({
            ins, lec, liveDate: lD.liveDate,
            color: state.platformColors[lD.platform] ?? iD.color,
            insColor: iD.color,
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
      color: string; insColor: string;
      isLive: boolean;
      milestoneId?: string; milestoneLabel?: string; milestoneTitle?: string; milestoneColor?: string;
      checked?: boolean; assignee?: string; assigneeColor?: string;
    }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lec, lD]) => {
          const color = state.platformColors[lD.platform] ?? iD.color;
          const insColor = iD.color;
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
              ins, lec, color, insColor, isLive: false,
              milestoneId: ms.id, milestoneLabel: ms.label,
              milestoneTitle: ms.title, milestoneColor: ms.color,
              checked: mks[ms.id as MilestoneId]?.checked ?? false,
              assignee: assigneeName,
              assigneeColor,
            });
          });
          ev.push({ date: lD.liveDate, ins, lec, color, insColor, isLive: true });
        });
    });
    return ev;
  }, [state.data, state.designerMilestones, state.designerProjectAssignees, state.platformColors, state.assignees]);

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

  const todayStr = fmtDate(today);

  /* 담당자 드롭다운 공통 렌더 */
  const AssigneeDropdown = ({
    dropKey,
    currentName,
    onSelect,
  }: {
    dropKey: string;
    currentName: string;
    onSelect: (name: string) => void;
  }) => (
    <div
      className="absolute left-0 top-full mt-0.5 z-30 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onSelect(""); setDropdown(null); }}
        className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary border-none bg-transparent cursor-pointer"
      >
        없음
      </button>
      {state.assignees.length === 0 && (
        <div className="px-3 py-1.5 text-[11px] text-[#aeaeb2]">담당자를 먼저 추가하세요</div>
      )}
      {state.assignees.map((a) => (
        <button
          key={a.id}
          onClick={() => { onSelect(a.name); setDropdown(null); }}
          className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-secondary border-none bg-transparent cursor-pointer ${currentName === a.name ? "bg-secondary" : ""}`}
        >
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-extrabold flex-shrink-0"
            style={{ background: a.color }}
          >
            {a.name.slice(0, 1)}
          </div>
          <span className="text-[11px] font-semibold">{a.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-100px)]" onClick={() => setDropdown(null)}>
      {/* ── 사이드 패널 ── */}
      <aside className="w-[300px] min-w-[300px] border-r border-border bg-[#f7f7f8] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border bg-white">
          <div className="text-[13px] font-extrabold">📋 프로젝트 마일스톤</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">진행중 강의 {projects.length}개</div>
        </div>

        {projects.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-[13px]">진행중인 강의가 없습니다</div>
        )}

        {(() => {
          const fiveWeeksLater = fmtDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 35));
          const withinWindow = projects.filter(({ liveDate }) => liveDate >= todayStr && liveDate < fiveWeeksLater);
          const beyond = projects.filter(({ liveDate }) => liveDate >= fiveWeeksLater);
          const displayed = showMoreProjects ? [...withinWindow, ...beyond] : withinWindow;

          return (
        <div className="flex flex-col gap-3 p-3">
          {displayed.map(({ ins, lec, liveDate, insColor }) => {
            const curKey = `${ins}|${lec}`;
            const milestones = state.designerMilestones[curKey] || {};
            const isExpanded = expandedProjects.has(curKey);
            const projectAssigneeName = state.designerProjectAssignees[curKey] ?? "";
            const projectAssigneeColor = projectAssigneeName ? getAssigneeColor(projectAssigneeName) : null;
            const projectDropKey = `project|${curKey}`;

            return (
              <div key={curKey} className="bg-white rounded-2xl border border-border shadow-[0_1px_4px_rgba(0,0,0,.05)] overflow-hidden">
                {/* 카드 상단 색상 바 */}
                <div className="h-1 w-full" style={{ background: insColor }} />

                <div className="p-3.5">
                  {/* 강사명 + 라이브 날짜 */}
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="font-extrabold text-[13px] leading-tight truncate" style={{ color: insColor }}>{ins}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap flex-shrink-0">
                      🔴 {fmtDateKr(liveDate)}
                    </div>
                  </div>

                  {/* 강의명 */}
                  <div className="text-[11px] text-muted-foreground truncate mb-2.5">{lec}</div>

                  {/* 담당자 */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === projectDropKey ? null : projectDropKey); }}
                      className="flex items-center gap-1.5 bg-secondary hover:bg-accent rounded-lg px-2.5 py-1.5 border-none cursor-pointer w-full text-left transition-colors"
                    >
                      {projectAssigneeName ? (
                        <>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-extrabold flex-shrink-0"
                            style={{ background: projectAssigneeColor ?? "#aeaeb2" }}
                          >
                            {projectAssigneeName.slice(0, 1)}
                          </div>
                          <span className="text-[12px] font-semibold" style={{ color: projectAssigneeColor ?? "#1c1c1e" }}>
                            {projectAssigneeName}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#aeaeb2] text-[13px]">👤</span>
                          <span className="text-[11px] text-[#aeaeb2]">담당자 추가</span>
                        </>
                      )}
                    </button>
                    {dropdown === projectDropKey && (
                      <AssigneeDropdown
                        dropKey={projectDropKey}
                        currentName={projectAssigneeName}
                        onSelect={(name) => dispatch({ type: "SET_DESIGNER_PROJECT_ASSIGNEE", curKey, assignee: name })}
                      />
                    )}
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
                                ? "bg-green-50 border-green-200"
                                : isPast
                                ? "bg-red-50 border-red-100"
                                : "bg-[#fafafa] border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => dispatch({
                                  type: "SET_DESIGNER_MILESTONE",
                                  curKey,
                                  milestoneId: ms.id as MilestoneId,
                                  checked: !item.checked,
                                })}
                                className="w-4 h-4 mt-[2px] flex-shrink-0 rounded border-none cursor-pointer flex items-center justify-center text-[11px] font-bold transition-colors"
                                style={{
                                  background: item.checked ? "#22c55e" : "transparent",
                                  border: `1.5px solid ${item.checked ? "#22c55e" : ms.color}`,
                                  color: "#fff",
                                }}
                              >
                                {item.checked ? "✓" : ""}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span
                                    className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
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

                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === msDropKey ? null : msDropKey); }}
                                    className="flex items-center gap-1 text-[10px] hover:opacity-80 bg-transparent border-none cursor-pointer px-0"
                                  >
                                    {effName ? (
                                      <>
                                        <div
                                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-extrabold flex-shrink-0"
                                          style={{ background: effColor ?? "#aeaeb2", opacity: isInherited ? 0.55 : 1 }}
                                        >
                                          {effName.slice(0, 1)}
                                        </div>
                                        <span className="font-semibold" style={{ color: effColor ?? "#6e6e73", opacity: isInherited ? 0.55 : 1 }}>
                                          {effName}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[#aeaeb2]">+ 담당자</span>
                                    )}
                                  </button>
                                  {dropdown === msDropKey && (
                                    <AssigneeDropdown
                                      dropKey={msDropKey}
                                      currentName={item.assignee}
                                      onSelect={(name) => dispatch({
                                        type: "SET_DESIGNER_MILESTONE",
                                        curKey,
                                        milestoneId: ms.id as MilestoneId,
                                        assignee: name,
                                      })}
                                    />
                                  )}
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
                    className="w-full mt-3 py-1.5 text-[11px] text-[#aeaeb2] hover:text-[#6e6e73] bg-transparent border-none cursor-pointer flex items-center justify-center gap-1 select-none border-t border-border"
                  >
                    {isExpanded ? "▲ 접기" : "타임라인 더보기 ▼"}
                  </button>
                </div>
              </div>
            );
          })}
          {withinWindow.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-[12px]">향후 5주 내 강의가 없습니다</div>
          )}
          {beyond.length > 0 && !showMoreProjects && (
            <button
              onClick={() => setShowMoreProjects(true)}
              className="w-full py-2 text-[12px] text-[#764ba2] font-semibold bg-white border border-[#764ba2]/30 rounded-xl cursor-pointer hover:bg-[#764ba2]/5 transition-colors"
            >
              + 5주 이후 강의 {beyond.length}개 더보기
            </button>
          )}
          {showMoreProjects && beyond.length > 0 && (
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
      <div className="flex-1 p-7 overflow-auto">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-[0_2px_8px_rgba(0,0,0,.04)]">
          <div className="flex justify-between items-center mb-[18px]">
            <div>
              <h3 className="text-xl font-extrabold">🎨 디자이너 캘린더</h3>
              <p className="text-sm text-muted-foreground mt-0.5">진행중 강의 {projects.length}개의 디자인 작업 일정</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="bg-secondary rounded-lg px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
              >◀</button>
              <span className="text-lg font-bold min-w-[150px] text-center">
                {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
              </span>
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="bg-secondary rounded-lg px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
              >▶</button>
            </div>
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
              const dayEvts = events.filter((e) => e.date === ds);
              const isT = isSameDay(day, today);
              const isPast = day < today && !isT;
              const showAll = expandedDay === ds;

              return (
                <div
                  key={ds}
                  className={`min-h-[110px] rounded-[10px] p-1.5 overflow-hidden ${
                    isT
                      ? "bg-[#764ba2]/5 border-[1.5px] border-[#764ba2]"
                      : isPast
                      ? "bg-[#fafafa] border-[1.5px] border-[#f0f0f0]"
                      : "bg-white border-[1.5px] border-[#f0f0f0]"
                  } ${dayEvts.length > 2 ? "cursor-pointer" : ""}`}
                  onClick={() => { if (dayEvts.length > 2) setExpandedDay(showAll ? null : ds); }}
                >
                  <div
                    className={`text-[15px] px-1 mb-1 ${
                      isT ? "font-extrabold text-[#764ba2]"
                      : isPast ? "font-semibold text-[#ccc]"
                      : day.getDay() === 0 ? "font-semibold text-red-500"
                      : "font-semibold text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(showAll ? dayEvts : dayEvts.slice(0, 2)).map((ev, ei) => {
                      return (
                        <div
                          key={ei}
                          onClick={(e) => { e.stopPropagation(); goToTimeline(ev.ins, ev.lec); }}
                          className="rounded-md px-1.5 py-1 text-xs font-semibold text-left cursor-pointer leading-tight"
                          style={ev.isLive ? {
                            background: ev.color + "15",
                            border: `1px solid ${ev.color}40`,
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
                                <span
                                  className="text-[9px] font-extrabold px-1 rounded-full mr-0.5 flex-shrink-0 bg-[#e8e8e8] text-[#6e6e73]"
                                >
                                  {ev.milestoneLabel}
                                </span>
                                <span className="font-bold truncate" style={{ color: ev.insColor }}>{ev.ins}</span>
                              </div>
                              <div className="text-[10px] font-medium truncate" style={{ color: ev.checked ? "#059669" : "#6e6e73" }}>
                                {ev.checked ? "✓ " : ""}{ev.milestoneTitle}
                              </div>
                              {ev.assignee && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <div
                                    className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[7px] font-extrabold flex-shrink-0"
                                    style={{ background: ev.assigneeColor ?? "#aeaeb2" }}
                                  >
                                    {ev.assignee.slice(0, 1)}
                                  </div>
                                  <span className="text-[9px] truncate" style={{ color: "#6e6e73" }}>{ev.assignee}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {dayEvts.length > 2 && !showAll && (
                      <div className="text-xs text-[#764ba2] text-center font-semibold py-0.5 cursor-pointer">
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
        </div>
      </div>
    </div>
  );
}
