"use client";

import { useCrm, useGoToBoard } from "@/hooks/use-crm-store";
import { fmtDateKr } from "@/lib/utils";
import { useCompletedLectures } from "@/hooks/use-derived-data";

export default function HistoryTab() {
  const { state, dispatch } = useCrm();
  const goToBoard = useGoToBoard();
  const completedLectures = useCompletedLectures();

  // 강사별 그룹핑
  const grouped = new Map<string, typeof completedLectures>();
  completedLectures.forEach((l) => {
    if (!grouped.has(l.ins)) grouped.set(l.ins, []);
    grouped.get(l.ins)!.push(l);
  });

  return (
    <div className="min-h-page bg-surface">
      <div className="max-w-content mx-auto px-10 py-8">
        <h2 className="text-2xl font-bold mb-6">CRM 히스토리</h2>
        {[...grouped.entries()].map(([iN, lectures]) => {
          const iD = state.data[iN];
          const firstLec = iD ? Object.values(iD.lectures)[0] : null;
          const color = (firstLec ? state.platformColors[firstLec.platform] : undefined) ?? "#667eea";
          return (
            <div key={iN} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-lg font-bold" style={{ color }}>{iN}</span>
                <span className="text-[13px] text-muted-foreground">({lectures.length}개)</span>
              </div>
              {lectures.map((l) => {
                const lD = state.data[iN]?.lectures?.[l.lec];
                const pctCheck = l.pmTotal ? Math.round((l.pmChecked / l.pmTotal) * 100) : 0;
                const pctCopy = l.pmTotal ? Math.round((l.pmCopied / l.pmTotal) * 100) : 0;

                return (
                  <div
                    key={l.lec}
                    className="bg-surface-card rounded-card shadow-card p-5 mb-3 ml-6"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[15px] font-semibold">{l.lec}</span>
                        {lD?.type && <span className="text-sm text-muted-foreground ml-2.5">{lD.type}</span>}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[13px] text-neutral-400">📅 {fmtDateKr(l.liveDate)}</span>
                        <button
                          onClick={() => dispatch({ type: "REACTIVATE_LECTURE", ins: iN, lec: l.lec })}
                          className="bg-amber-50 text-amber-600 border border-amber-200 rounded-card px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                          다시 진행
                        </button>
                        <button
                          onClick={() => goToBoard(iN, l.lec)}
                          className="bg-primary/10 text-primary border border-primary/20 rounded-card px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-primary/15 transition-colors"
                        >
                          타임라인 보기
                        </button>
                      </div>
                    </div>

                    {/* 진행률 바 */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>✏️ 카피 {l.pmCopied}/{l.pmTotal} ({pctCopy}%)</span>
                        <span>✅ 체크 {l.pmChecked}/{l.pmTotal} ({pctCheck}%)</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="flex-1 h-1.5 bg-neutral-track rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 bg-brand"
                            style={{ width: `${pctCopy}%` }}
                          />
                        </div>
                        <div className="flex-1 h-1.5 bg-neutral-track rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${pctCheck === 100 ? "bg-neutral-checked" : "bg-amber-500"}`}
                            style={{ width: `${pctCheck}%` }}
                          />
                        </div>
                      </div>
                      {pctCheck === 100 && pctCopy === 100 && (
                        <div className="text-[11px] text-gray-500 font-bold mt-1">CRM 완료</div>
                      )}
                    </div>

                    <div className={lD?.usps?.length ? "" : "hidden"}>
                      <div className="text-[13px] text-muted-foreground mt-2">
                        USP: {lD?.usps?.join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className={completedLectures.length === 0 ? "" : "hidden"}>
          <div className="text-center text-neutral-400 text-sm py-20">
            완료된 강의가 없습니다
          </div>
        </div>
      </div>
    </div>
  );
}
