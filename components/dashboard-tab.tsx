"use client";

import { useState, useMemo } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay, daysUntil, seqTotalItems, seqCheckedItems, resolveColor } from "@/lib/utils";
import { useCalendar } from "@/hooks/use-calendar";
import { useActiveLectures, useCompletedLectures, useLiveEvents } from "@/hooks/use-derived-data";

import type { CalendarEvent } from "@/lib/types";

export default function DashboardTab() {
  const { state, dispatch } = useCrm();
  const { today, calMonth, calDays, prevMonth, nextMonth, monthLabel } = useCalendar();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);


  const goToBoard = (iN: string, lN: string, seqId?: string) => {
    dispatch({ type: "SELECT_INSTRUCTOR", ins: iN });
    setTimeout(() => {
      dispatch({ type: "SELECT_LECTURE", lec: lN });
      dispatch({ type: "SET_TAB", tab: "board" });
      if (seqId) {
        setTimeout(() => {
          const el = document.getElementById(`seq-${seqId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.transition = "box-shadow .3s";
            el.style.boxShadow = "0 0 0 3px #667eea60";
            setTimeout(() => { el.style.boxShadow = "none"; }, 2000);
          }
        }, 400);
      }
    }, 0);
  };

  const completeLecture = (e: React.MouseEvent, ins: string, lec: string) => {
    e.stopPropagation();
    dispatch({ type: "COMPLETE_LECTURE", ins, lec });
  };

  /* 공통 훅: 최근 완료 / LIVE 이벤트 / 진행중 (홈탭과 동일 데이터 보장) */
  const completedLectures = useCompletedLectures();
  const recentCompleted = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return completedLectures
      .filter((l) => new Date(l.liveDate) >= sevenDaysAgo)
      .slice(0, 3);
  }, [completedLectures]);
  const activeLectures = useActiveLectures();
  const liveEvents = useLiveEvents();

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const ev: CalendarEvent[] = [];
    Object.entries(state.data).forEach(([iN, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate)
        .forEach(([lN, lD]) => {
          const ck = state.allChecks[`${iN}|${lN}`] || {};
          const cp = state.allCopies[`${iN}|${lN}`] || {};
          DEFAULT_SEQ.forEach((seq) => {
            const d = addDays(lD.liveDate, seq.dayOffset);
            const checkedCount = seq.items.filter((it) => ck[it.id]).length;
            const copiedCount = seq.items.filter((it) => cp[it.id]).length;
            ev.push({
              date: fmtDate(d),
              ins: iN,
              lec: lN,
              seqId: seq.id,
              seqLabel: seq.label,
              items: seq.items,
              color: resolveColor(state.platformColors, lD.platform),
              isLiveDay: seq.dayOffset === 0,
              checkedCount,
              copiedCount,
              allDone: checkedCount === seq.items.length,
              allCopied: copiedCount === seq.items.length,
            });
          });
        });
    });
    return ev;
  }, [state.data, state.allChecks, state.allCopies]);

  const activeCount = activeLectures.length;

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden">
      {/* 좌측: 진행중 + 최근 완료 */}
      <aside className="w-72 shrink-0 border-r border-border/50 bg-surface-sidebar overflow-y-auto">
          <div className="px-4 py-3 border-b border-border/40">
            <h3 className="text-[15px] font-medium text-foreground">{calMonth.getMonth() + 1}월 진행강의 {activeLectures.filter((al) => { const d = al.liveDate ? new Date(al.liveDate) : null; return d && d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth(); }).length}개</h3>
          </div>
          <div className="flex flex-col gap-2 px-4 py-3">
            {activeLectures.map((al) => {
                  const pctCheck = al.pmTotal ? Math.round((al.pmChecked / al.pmTotal) * 100) : 0;
                  const pctCopy = al.pmTotal ? Math.round((al.pmCopied / al.pmTotal) * 100) : 0;

                  return (
                    <div
                      key={al.curKey}
                      onClick={() => goToBoard(al.ins, al.lec)}
                      className="rounded-[12px] border border-border/40 overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      {/* 헤더: 플랫폼 컬러 8% 배경 */}
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ background: `${al.color}14` }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: al.color }} />
                          <span className="text-xs font-medium truncate" style={{ color: al.color }}>{al.ins}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${
                            !al.liveDate ? "hidden" :
                            al.daysLeft <= 0
                              ? "bg-red-50 text-red-500"
                              : al.daysLeft <= 10
                              ? "bg-amber-50 text-amber-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {al.daysLeft <= 0 ? "D-Day" : `D-${al.daysLeft}`}
                        </span>
                      </div>

                      {/* 바디: 강의명 + 날짜 + 진행바 */}
                      <div className="px-4 py-3">
                        <div className="text-[13px] font-medium text-foreground leading-tight truncate">{al.lec}</div>
                        <div className="text-[11px] font-normal text-muted-foreground mt-0.5">📅 {fmtDateKr(al.liveDate)} {al.liveTime}</div>

                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>카피 {al.pmCopied}/{al.pmTotal}</span>
                            <span>체크 {al.pmChecked}/{al.pmTotal}</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300 bg-brand"
                                style={{ width: `${pctCopy}%` }}
                              />
                            </div>
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${pctCheck === 100 ? "bg-neutral-checked" : "bg-amber-500"}`}
                                style={{ width: `${pctCheck}%` }}
                              />
                            </div>
                          </div>
                          <div className={`text-[11px] text-emerald-600 font-bold mt-1 ${pctCheck === 100 && pctCopy === 100 ? "block" : "hidden"}`}>CRM 준비 완료</div>
                        </div>

                        <button
                          onClick={(e) => completeLecture(e, al.ins, al.lec)}
                          className="mt-2.5 w-full bg-surface-hover border-none rounded-card text-[12px] text-muted-foreground font-semibold py-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          완료 처리
                        </button>
                      </div>
                    </div>
                  );
                })}
            <div className={`text-center text-neutral-400 text-sm py-12 ${activeCount === 0 ? "block" : "hidden"}`}>
              진행중인 강의가 없습니다
            </div>
          </div>

          {/* 최근 완료 섹션 */}
          <div className={`${recentCompleted.length > 0 ? "block" : "hidden"}`}>
              <div className="px-4 py-3 border-b border-border/40">
                <h4 className="text-[15px] font-medium text-muted-foreground">최근 완료</h4>
              </div>
              <div className="flex flex-col gap-2">
                {recentCompleted.map((r) => (
                  <div
                    key={`${r.ins}|${r.lec}`}
                    onClick={() => goToBoard(r.ins, r.lec)}
                    className="bg-surface-card rounded-card px-5 py-3.5 cursor-pointer transition-all shadow-card opacity-80 hover:shadow-card-hover hover:opacity-100"
                    style={{ borderTop: `2px solid ${r.color}40` }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[14px] font-bold" style={{ color: r.color }}>{r.ins}</span>
                        <span className="text-[13px] text-muted-foreground ml-1.5">{r.lec}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: "REACTIVATE_LECTURE", ins: r.ins, lec: r.lec });
                          }}
                          className="text-[11px] text-primary font-semibold px-2.5 py-1 rounded-card bg-primary/10 border-none cursor-pointer hover:bg-primary/20 transition-colors"
                        >
                          다시 진행
                        </button>
                        <span className="text-[12px] text-gray-400 font-bold">
                          ✓ {r.pmChecked}/{r.pmTotal}
                        </span>
                      </div>
                    </div>
                    <div className="text-[12px] text-neutral-400 mt-0.5">📅 {fmtDateKr(r.liveDate)}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => dispatch({ type: "SET_TAB", tab: "history" })}
                className="mt-3 w-full text-[13px] text-primary font-semibold py-2.5 rounded-card bg-primary/5 border-none cursor-pointer hover:bg-primary/10 transition-colors"
              >
                전체 히스토리 보기 →
              </button>
          </div>
      </aside>

      {/* 우측: 캘린더 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-surface-card rounded-card shadow-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">CRM 발송 캘린더</h3>
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
              const evts = calendarEvents.filter((e) => e.date === ds);
              const dayLives = liveEvents.filter((e) => e.date === ds);
              const isT = isSameDay(day, today);
              const isPast = day < today && !isT;

              return (
                <div
                  key={ds}
                  className={`min-h-[110px] rounded-card p-1.5 overflow-hidden ${
                    isT ? "bg-primary/5 border border-primary" : isPast ? "bg-surface-inset border border-border/30" : "bg-surface-card border border-border/30"
                  } ${evts.length > 2 ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (evts.length > 2) setExpandedDay(expandedDay === ds ? null : ds);
                  }}
                >
                  <div
                    className={`text-[14px] px-1 mb-1 ${
                      isT ? "font-bold text-primary" : isPast ? "font-semibold text-neutral-300" : day.getDay() === 0 ? "font-semibold text-red-500" : "font-semibold text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-[3px]">
                    {/* LIVE 이벤트 블록 — 홈탭과 동일 */}
                    {dayLives.map((ev, ei) => (
                      <div
                        key={`live-${ei}`}
                        onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                        className="rounded-lg px-1.5 py-[3px] text-[10px] font-bold cursor-pointer leading-tight truncate"
                        style={{ background: ev.color + "18", color: ev.color, border: `1.5px solid ${ev.color}35` }}
                      >
                        <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-500 mr-0.5 align-middle flex-shrink-0" />{ev.ins}
                      </div>
                    ))}
                    {(expandedDay === ds ? evts : evts.slice(0, 2)).map((ev, ei) => (
                      <div
                        key={ei}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToBoard(ev.ins, ev.lec, ev.seqId);
                        }}
                        className={`rounded-lg px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight ${
                          ev.allDone ? "bg-surface-inset text-neutral-checked border border-neutral-300" : ""
                        }`}
                        style={ev.allDone ? undefined : {
                          background: ev.color + "10",
                          color: ev.color,
                          border: `1px solid ${ev.color}25`,
                        }}
                      >
                        <div className="flex items-center gap-0.5">
                          {ev.allDone ? (
                            <span>✓</span>
                          ) : ev.isLiveDay ? (
                            <span>🔴</span>
                          ) : null}
                          <span className="font-bold">{ev.ins}</span>
                        </div>
                        <div
                          className={`text-[9px] font-medium ${ev.allDone ? "text-neutral-checked" : "text-neutral-600"}`}
                        >
                          {ev.seqLabel}
                        </div>
                        <div className={`flex gap-0.5 mt-0.5 ${(ev.copiedCount > 0 || ev.checkedCount > 0) && !ev.allDone && !ev.allCopied ? "flex" : "hidden"}`}>
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${ev.items.length ? (ev.copiedCount / ev.items.length) * 100 : 0}%` }}
                              />
                            </div>
                            <div className="flex-1 h-[3px] bg-neutral-track rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${ev.items.length ? (ev.checkedCount / ev.items.length) * 100 : 0}%` }}
                              />
                            </div>
                        </div>
                        {expandedDay === ds && (
                          <div className="mt-0.5 border-t border-border/30 pt-0.5">
                            {ev.items.map((it) => {
                              const ckMap = state.allChecks[`${ev.ins}|${ev.lec}`] || {};
                              const cpMap = state.allCopies[`${ev.ins}|${ev.lec}`] || {};
                              const done = !!ckMap[it.id];
                              const hasCopy = !!cpMap[it.id];
                              return (
                                <div
                                  key={it.id}
                                  className={`text-[10px] flex items-center gap-0.5 leading-relaxed ${done ? "text-neutral-checked font-semibold" : hasCopy ? "text-brand font-normal" : "text-neutral-400 font-normal"}`}
                                >
                                  <span>{done ? "✓" : hasCopy ? "✏️" : "⬜"}</span>
                                  <span>{it.icon} {it.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {evts.length > 2 && expandedDay !== ds && (
                      <div className="text-[9px] text-muted-foreground text-center font-semibold py-0.5 cursor-pointer">
                        +{evts.length - 2}개
                      </div>
                    )}
                    {evts.length > 2 && expandedDay === ds && (
                      <div className="text-[9px] text-muted-foreground text-center py-0.5">접기 ▲</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

    </div>
  );
}
