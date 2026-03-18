"use client";

import { useState, useMemo } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ } from "@/lib/constants";
import { addDays, fmtDate, fmtDateKr, isSameDay, daysUntil, seqTotalItems, seqCheckedItems } from "@/lib/utils";
import { useCalendar } from "@/hooks/use-calendar";
import { useActiveLectures, useCompletedLectures, useLiveEvents } from "@/hooks/use-derived-data";
import AddLectureDialog from "./add-lecture-dialog";
import type { CalendarEvent } from "@/lib/types";

export default function DashboardTab() {
  const { state, dispatch } = useCrm();
  const { today, calDays, prevMonth, nextMonth, monthLabel } = useCalendar();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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
              color: iD.color,
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
    <div className="p-7 max-w-[1300px] mx-auto animate-fi">
      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* 좌측: 진행중 + 최근 완료 */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-lg font-extrabold">진행중 ({activeCount})</h3>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-gradient-to-br from-primary to-[#764ba2] text-white rounded-lg px-3.5 py-1.5 text-[13px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              + 새 강의
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {activeLectures.map((al) => {
                  const pctCheck = al.pmTotal ? Math.round((al.pmChecked / al.pmTotal) * 100) : 0;
                  const pctCopy = al.pmTotal ? Math.round((al.pmCopied / al.pmTotal) * 100) : 0;

                  return (
                    <div
                      key={al.curKey}
                      onClick={() => goToBoard(al.ins, al.lec)}
                      className="bg-white border border-border rounded-xl px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderLeft: `4px solid ${al.color}` }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[15px] font-extrabold" style={{ color: al.color }}>{al.ins}</span>
                          <span className="text-sm text-muted-foreground ml-2">{al.lec}</span>
                        </div>
                        {al.liveDate && (
                          <span
                            className={`text-[13px] px-2.5 py-0.5 rounded-[10px] font-bold ${
                              al.daysLeft <= 1
                                ? "bg-red-100 text-red-600"
                                : al.daysLeft <= 3
                                ? "bg-amber-100 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {al.daysLeft <= 0 ? "D-Day" : `D-${al.daysLeft}`}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-[#aeaeb2] mt-1">📅 {fmtDateKr(al.liveDate)} {al.liveTime}</div>

                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                          <span>✏️ 카피 {al.pmCopied}/{al.pmTotal}</span>
                          <span>✅ 체크 {al.pmChecked}/{al.pmTotal}</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1 h-1.5 bg-[#f0f0f5] rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-[#764ba2] rounded-sm transition-all duration-300"
                              style={{ width: `${pctCopy}%` }}
                            />
                          </div>
                          <div className="flex-1 h-1.5 bg-[#f0f0f5] rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all duration-300"
                              style={{
                                width: `${pctCheck}%`,
                                background: pctCheck === 100 ? "#9ca3af" : "linear-gradient(90deg,#f39c12,#e67e22)",
                              }}
                            />
                          </div>
                        </div>
                        {pctCheck === 100 && pctCopy === 100 && (
                          <div className="text-[11px] text-gray-500 font-bold mt-0.5">CRM 준비 완료</div>
                        )}
                      </div>

                      {/* 완료 처리 버튼 */}
                      <button
                        onClick={(e) => completeLecture(e, al.ins, al.lec)}
                        className="mt-2.5 w-full bg-[#f8f8fa] border border-border rounded-lg text-[13px] text-muted-foreground font-semibold py-1.5 cursor-pointer hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                      >
                        완료 처리
                      </button>
                    </div>
                  );
                })}
            {activeCount === 0 && (
              <div className="text-center text-[#aeaeb2] text-sm py-8">
                진행중인 강의가 없습니다
              </div>
            )}
          </div>

          {/* 최근 완료 섹션 */}
          {recentCompleted.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-border" />
              </div>
              <h4 className="text-[15px] font-extrabold text-muted-foreground mb-2.5">최근 완료</h4>
              <div className="flex flex-col gap-1.5">
                {recentCompleted.map((r) => (
                  <div
                    key={`${r.ins}|${r.lec}`}
                    onClick={() => goToBoard(r.ins, r.lec)}
                    className="bg-[#f8f8fa] border border-border rounded-xl px-4 py-3 cursor-pointer transition-all hover:shadow-sm"
                    style={{ borderLeft: `4px solid ${r.color}40` }}
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
                          className="text-[11px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20 transition-colors"
                        >
                          다시 진행
                        </button>
                        <span className="text-[12px] text-gray-400 font-bold">
                          ✓ {r.pmChecked}/{r.pmTotal}
                        </span>
                      </div>
                    </div>
                    <div className="text-[12px] text-[#aeaeb2] mt-0.5">📅 {fmtDateKr(r.liveDate)}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => dispatch({ type: "SET_TAB", tab: "history" })}
                className="mt-2.5 w-full text-[13px] text-primary font-semibold py-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
              >
                전체 히스토리 보기 →
              </button>
            </div>
          )}
        </div>

        {/* 우측: 캘린더 */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-[0_2px_8px_rgba(0,0,0,.04)]">
          <div className="flex justify-between items-center mb-[18px]">
            <h3 className="text-xl font-extrabold">📅 CRM 발송 캘린더</h3>
            <div className="flex gap-2 items-center">
              <button
                onClick={prevMonth}
                className="bg-secondary rounded-lg px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
              >
                ◀
              </button>
              <span className="text-lg font-bold min-w-[150px] text-center">
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                className="bg-secondary rounded-lg px-4 py-2 text-lg text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
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
                  className={`min-h-[110px] rounded-[10px] p-1.5 overflow-hidden relative ${
                    isT ? "bg-primary/5 border-[1.5px] border-primary" : isPast ? "bg-[#fafafa] border-[1.5px] border-[#f0f0f0]" : "bg-white border-[1.5px] border-[#f0f0f0]"
                  } ${evts.length > 2 ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (evts.length > 2) setExpandedDay(expandedDay === ds ? null : ds);
                  }}
                >
                  <div
                    className={`text-[15px] px-1 mb-1 ${
                      isT ? "font-extrabold text-primary" : isPast ? "font-semibold text-[#ccc]" : day.getDay() === 0 ? "font-semibold text-red-500" : "font-semibold text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {/* LIVE 이벤트 블록 — 홈탭과 동일 */}
                    {dayLives.map((ev, ei) => (
                      <div
                        key={`live-${ei}`}
                        onClick={(e) => { e.stopPropagation(); goToBoard(ev.ins, ev.lec); }}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight truncate"
                        style={{ background: ev.color + "22", color: ev.color, border: `1px solid ${ev.color}40` }}
                      >
                        <span className="font-bold">{ev.ins}</span>
                        <span className="ml-0.5">🔴LIVE</span>
                      </div>
                    ))}
                    {(expandedDay === ds ? evts : evts.slice(0, 2)).map((ev, ei) => (
                      <div
                        key={ei}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToBoard(ev.ins, ev.lec, ev.seqId);
                        }}
                        className="rounded-md px-1.5 py-1 text-xs font-semibold text-left cursor-pointer leading-tight"
                        style={{
                          background:
                            ev.allDone
                              ? "#f5f5f5"
                              : ev.color + "10",
                          color:
                            ev.allDone
                              ? "#9ca3af"
                              : ev.color,
                          border: `1px solid ${
                            ev.allDone
                              ? "#d1d5db"
                              : ev.color + "25"
                          }`,
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
                          className="text-[11px] font-medium"
                          style={{ color: ev.allDone ? "#9ca3af" : "#6e6e73" }}
                        >
                          {ev.seqLabel}
                        </div>
                        {(ev.copiedCount > 0 || ev.checkedCount > 0) && !ev.allDone && !ev.allCopied && (
                          <div className="flex gap-0.5 mt-0.5">
                            <div className="flex-1 h-[3px] bg-[#e5e5ea] rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-sm"
                                style={{ width: `${ev.items.length ? (ev.copiedCount / ev.items.length) * 100 : 0}%` }}
                              />
                            </div>
                            <div className="flex-1 h-[3px] bg-[#e5e5ea] rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-[#f39c12] rounded-sm"
                                style={{ width: `${ev.items.length ? (ev.checkedCount / ev.items.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {expandedDay === ds && (
                          <div className="mt-0.5 border-t border-border/40 pt-0.5">
                            {ev.items.map((it) => {
                              const ckMap = state.allChecks[`${ev.ins}|${ev.lec}`] || {};
                              const cpMap = state.allCopies[`${ev.ins}|${ev.lec}`] || {};
                              const done = !!ckMap[it.id];
                              const hasCopy = !!cpMap[it.id];
                              return (
                                <div
                                  key={it.id}
                                  className="text-[10px] flex items-center gap-0.5 leading-relaxed"
                                  style={{ color: done ? "#9ca3af" : hasCopy ? "#667eea" : "#aeaeb2", fontWeight: done ? 600 : 400 }}
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
                      <div className="text-xs text-primary text-center font-semibold py-0.5 cursor-pointer">
                        +{evts.length - 2}개 더 보기
                      </div>
                    )}
                    {evts.length > 2 && expandedDay === ds && (
                      <div className="text-[11px] text-[#aeaeb2] text-center py-0.5">접기 ▲</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showAdd && <AddLectureDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}
