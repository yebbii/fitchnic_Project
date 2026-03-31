"use client";

import { useState, useMemo } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { useLectureSummaries, type LectureSummary } from "@/hooks/use-derived-data";
import { HOME_TAB_COLORS } from "@/lib/constants";

export default function LectureDashboard() {
  const [filter, setFilter] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const { state, dispatch } = useCrm();
  const summaries = useLectureSummaries();

  const viewYear = viewMonth.getFullYear();
  const viewMon = viewMonth.getMonth();
  const MONTHLY_GOAL = 8;

  const prevMonth = () => { setViewMonth(new Date(viewYear, viewMon - 1, 1)); setFilter(null); };
  const nextMonth = () => { setViewMonth(new Date(viewYear, viewMon + 1, 1)); setFilter(null); };
  const goToday = () => { const n = new Date(); setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setFilter(null); };

  // 선택 월 전체 강의 (진행중+완료)
  const monthAll = useMemo(
    () => summaries.filter((s) =>
      s.liveDate &&
      new Date(s.liveDate).getFullYear() === viewYear &&
      new Date(s.liveDate).getMonth() === viewMon
    ),
    [summaries, viewYear, viewMon],
  );

  // 이번 달 플랫폼별
  const monthPlatformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthAll.forEach((s) => {
      const p = s.platform || "기타";
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [monthAll]);

  // 필터된 이번 달 강의
  const filteredMonth = useMemo(
    () => {
      const list = filter ? monthAll.filter((s) => (s.platform || "기타") === filter) : monthAll;
      return list.sort((a, b) => a.daysLeft - b.daysLeft);
    },
    [monthAll, filter],
  );

  const goToDetail = (s: LectureSummary) => {
    dispatch({ type: "SET_LECTURE_SUB_TAB", tab: "lec-management" });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-white">
      <div className="max-w-[1000px] mx-auto px-8 py-6 flex flex-col gap-6">

        {/* 월 목표 도달율 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-extrabold text-muted-foreground uppercase tracking-wide">강의 현황</div>
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="bg-secondary rounded-lg px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]">◀</button>
              <button onClick={goToday} className="bg-secondary rounded-lg px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]">오늘</button>
              <span className="text-[13px] font-extrabold min-w-[90px] text-center">{viewYear}년 {viewMon + 1}월</span>
              <button onClick={nextMonth} className="bg-secondary rounded-lg px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]">▶</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* 전체 (해당 월) */}
            <div
              onClick={() => setFilter(null)}
              className={`rounded-2xl border p-5 cursor-pointer transition-all ${filter === null ? "border-[2px] bg-secondary/60" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}
              style={filter === null ? { borderColor: HOME_TAB_COLORS.primary } : undefined}
            >
              <div className="text-[12px] text-muted-foreground font-semibold mb-2">전체</div>
              <div className="text-[32px] font-extrabold leading-none mb-2" style={{ color: HOME_TAB_COLORS.primary }}>{monthAll.length}</div>
              <div className="text-[11px] text-muted-foreground">
                진행중 {monthAll.filter((s) => s.status === "active").length} · 완료 {monthAll.filter((s) => s.status === "completed").length}
              </div>
            </div>
            {/* 플랫폼별 도달율 */}
            {Object.entries(monthPlatformCounts).map(([plat, cnt]) => {
              const color = state.platformColors[plat] ?? "#667eea";
              const pct = Math.min(100, Math.round((cnt / MONTHLY_GOAL) * 100));
              const active = filter === plat;
              return (
                <div key={plat} onClick={() => setFilter(active ? null : plat)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${active ? "border-[2px] bg-secondary/60" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}
                  style={active ? { borderColor: color } : undefined}
                >
                  <div className="text-[12px] text-muted-foreground font-semibold mb-2">{plat}</div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-[32px] font-extrabold leading-none" style={{ color }}>{cnt}</span>
                    <span className="text-[14px] text-muted-foreground font-semibold mb-0.5">/ {MONTHLY_GOAL}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="text-[11px] font-bold" style={{ color }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 강의 리스트 */}
        <div>
          {filteredMonth.length === 0 ? (
            <div className="text-[14px] text-muted-foreground py-10 text-center">이번 달 강의가 없습니다</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {filteredMonth.map((s, i) => {
                const dLabel = s.daysLeft === 0 ? "D-Day" : s.daysLeft > 0 ? `D-${s.daysLeft}` : `D+${Math.abs(s.daysLeft)}`;
                return (
                  <div
                    key={s.curKey}
                    onClick={() => goToDetail(s)}
                    className={`flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-secondary/50 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="font-extrabold text-[13px] w-[70px] flex-shrink-0" style={{ color: s.color }}>{s.ins}</span>
                    <span className="text-[13px] font-semibold text-foreground flex-1 truncate">{s.lec}</span>
                    {s.platform && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: s.color + "20", color: s.color }}>{s.platform}</span>
                    )}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      s.daysLeft <= 1 ? "bg-red-100 text-red-600" : s.daysLeft <= 3 ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"
                    }`}>{dLabel}</span>
                    <span className={`text-[11px] font-semibold flex-shrink-0 ${s.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                      {s.status === "active" ? "진행중" : "완료"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
