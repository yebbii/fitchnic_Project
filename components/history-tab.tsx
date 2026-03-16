"use client";

import { useCrm, useGoToBoard } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ } from "@/lib/constants";
import { fmtDateKr } from "@/lib/utils";

export default function HistoryTab() {
  const { state, dispatch } = useCrm();
  const goToBoard = useGoToBoard();

  return (
    <div className="p-7 max-w-[1200px] mx-auto animate-fi">
      <h2 className="text-[22px] font-extrabold mb-5">CRM 히스토리</h2>
      {Object.entries(state.data).map(([iN, iD]) => {
        const comp = Object.entries(iD.lectures).filter(([, l]) => l.status === "completed");
        if (!comp.length) return null;
        return (
          <div key={iN} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: iD.color }} />
              <span className="text-lg font-extrabold" style={{ color: iD.color }}>{iN}</span>
              <span className="text-[13px] text-muted-foreground">({comp.length}개)</span>
            </div>
            {comp.map(([lN, lD]) => {
              const ck = state.allChecks[`${iN}|${lN}`] || {};
              const cp = state.allCopies[`${iN}|${lN}`] || {};
              const totalItems = DEFAULT_SEQ.reduce((s, q) => s + q.items.length, 0);
              const checkedCount = DEFAULT_SEQ.reduce((s, q) => s + q.items.filter((it) => ck[it.id]).length, 0);
              const copiedCount = Object.keys(cp).length;
              const pctCheck = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;
              const pctCopy = totalItems ? Math.round((copiedCount / totalItems) * 100) : 0;

              return (
                <div
                  key={lN}
                  className="bg-white border border-border rounded-xl p-[18px] mb-2 ml-5"
                  style={{ borderLeft: `4px solid ${iD.color}40` }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-base font-bold">{lN}</span>
                      {lD.type && <span className="text-sm text-muted-foreground ml-2.5">{lD.type}</span>}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[13px] text-[#aeaeb2]">📅 {fmtDateKr(lD.liveDate)}</span>
                      <button
                        onClick={() => dispatch({ type: "REACTIVATE_LECTURE", ins: iN, lec: lN })}
                        className="bg-amber-50 text-amber-600 border border-amber-200 rounded-lg px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        다시 진행
                      </button>
                      <button
                        onClick={() => goToBoard(iN, lN)}
                        className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-primary/15 transition-colors"
                      >
                        타임라인 보기
                      </button>
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>✏️ 카피 {copiedCount}/{totalItems} ({pctCopy}%)</span>
                      <span>✅ 체크 {checkedCount}/{totalItems} ({pctCheck}%)</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1 h-2 bg-[#f0f0f5] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[#764ba2] rounded-sm transition-all duration-300"
                          style={{ width: `${pctCopy}%` }}
                        />
                      </div>
                      <div className="flex-1 h-2 bg-[#f0f0f5] rounded-sm overflow-hidden">
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
                      <div className="text-[11px] text-gray-500 font-bold mt-1">CRM 완료</div>
                    )}
                  </div>

                  {lD.usps.length > 0 && (
                    <div className="text-[13px] text-muted-foreground mt-2">
                      USP: {lD.usps.join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {Object.values(state.data).every((iD) =>
        Object.values(iD.lectures).every((l) => l.status !== "completed")
      ) && (
        <div className="text-center text-[#aeaeb2] text-sm py-16">
          완료된 강의가 없습니다
        </div>
      )}
    </div>
  );
}
