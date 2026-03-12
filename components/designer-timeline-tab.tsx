"use client";

import { useState } from "react";
import { useCrm, useCurKey } from "@/hooks/use-crm-store";
import { LIVE_SETUP_ITEMS, DESIGNER_MILESTONES } from "@/lib/constants";
import { fmtDateKr, fmtDate, addDays } from "@/lib/utils";
import type { MilestoneId } from "@/lib/types";

export default function DesignerTimelineTab() {
  const { state, dispatch } = useCrm();
  const curKey = useCurKey();
  const liveSetupKey = "__live_setup__";
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);

  const ld = state.ins && state.lec ? state.data[state.ins]?.lectures?.[state.lec] : null;
  const liveSetupChecks = state.designChecks[liveSetupKey] || {};
  const milestones = curKey ? state.designerMilestones[curKey] || {} : {};
  const today = new Date();
  const todayStr = fmtDate(today);

  const checkedMilestones = DESIGNER_MILESTONES.filter((ms) => milestones[ms.id]?.checked).length;
  const checkedLive = LIVE_SETUP_ITEMS.filter((it) => liveSetupChecks[it.id]).length;

  const toggleLiveSetup = (itemId: string, checked: boolean) => {
    dispatch({ type: "SET_DESIGN_CHECK", lectureKey: liveSetupKey, itemId, checked });
  };

  return (
    <div className="animate-fi">
      {/* 강의 선택 */}
      <div className="px-7 py-3.5 border-b border-border bg-white flex items-center gap-3 flex-wrap">
        <select
          value={state.ins}
          onChange={(e) => dispatch({ type: "SELECT_INSTRUCTOR", ins: e.target.value })}
          className="bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2 text-sm outline-none"
        >
          <option value="">강사 선택</option>
          {Object.keys(state.data).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        {state.ins && <span className="text-[#aeaeb2] text-lg">›</span>}
        {state.ins && (
          <select
            value={state.lec}
            onChange={(e) => dispatch({ type: "SELECT_LECTURE", lec: e.target.value })}
            className="bg-secondary border border-border rounded-lg text-foreground px-3.5 py-2 text-sm outline-none"
          >
            <option value="">강의 선택</option>
            {Object.entries(state.data[state.ins]?.lectures || {})
              .filter(([, l]) => l.status === "active")
              .map(([n]) => <option key={n}>{n}</option>)}
          </select>
        )}
        {ld && (
          <span className="text-sm text-muted-foreground ml-2">
            📅 {fmtDateKr(ld.liveDate)} {ld.liveTime}
          </span>
        )}
      </div>

      <div className="px-7 py-5 pb-[120px] max-w-[1000px] mx-auto">
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 320px" }}>
          {/* 좌측: 프로젝트 마일스톤 */}
          <div>
            {!ld ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-[#aeaeb2]">
                <div className="text-5xl mb-3.5">🎨</div>
                <div className="text-xl font-bold text-muted-foreground">강사와 강의를 선택하세요</div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[17px] font-extrabold">📋 프로젝트 마일스톤</h3>
                  <div className="text-[14px] text-muted-foreground font-semibold">
                    {checkedMilestones}/{DESIGNER_MILESTONES.length} 완료
                    {checkedMilestones === DESIGNER_MILESTONES.length && (
                      <span className="text-emerald-600 ml-2">🎉 완료!</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {DESIGNER_MILESTONES.map((ms, i) => {
                    const msDate = fmtDate(addDays(ld.liveDate, ms.dayOffset));
                    const item = milestones[ms.id] || { checked: false, assignee: "" };
                    const isPast = msDate < todayStr;
                    const isEditingThis = editingAssignee === ms.id;

                    return (
                      <div
                        key={ms.id}
                        className={`rounded-2xl border-2 p-5 transition-colors ${
                          item.checked
                            ? "bg-green-50 border-green-200"
                            : isPast
                            ? "bg-red-50 border-red-100"
                            : "bg-white border-border"
                        }`}
                        style={{ animation: `fi .3s ease ${i * 0.05}s both` }}
                      >
                        <div className="flex items-start gap-4">
                          {/* 체크박스 */}
                          <button
                            onClick={() => curKey && dispatch({
                              type: "SET_DESIGNER_MILESTONE",
                              curKey,
                              milestoneId: ms.id as MilestoneId,
                              checked: !item.checked,
                            })}
                            className="w-8 h-8 mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center text-[15px] font-extrabold text-white cursor-pointer border-none transition-colors"
                            style={{
                              background: item.checked ? "#22c55e" : "transparent",
                              border: `2px solid ${item.checked ? "#22c55e" : ms.color}`,
                              color: item.checked ? "#fff" : ms.color,
                            }}
                          >
                            {item.checked ? "✓" : ""}
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* 레이블 + 날짜 */}
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-[12px] font-extrabold px-2.5 py-1 rounded-full"
                                style={{ background: ms.color + "20", color: ms.color }}
                              >
                                {ms.label}
                              </span>
                              <span className="text-[13px] font-semibold text-muted-foreground">{msDate}</span>
                              {isPast && !item.checked && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">지남</span>
                              )}
                            </div>

                            {/* 제목 */}
                            <div
                              className={`text-[15px] font-extrabold mb-2 ${
                                item.checked ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {ms.title}
                            </div>

                            {/* 담당자 */}
                            {isEditingThis ? (
                              <input
                                autoFocus
                                value={item.assignee}
                                onChange={(e) => curKey && dispatch({
                                  type: "SET_DESIGNER_MILESTONE",
                                  curKey,
                                  milestoneId: ms.id as MilestoneId,
                                  assignee: e.target.value,
                                })}
                                onBlur={() => setEditingAssignee(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingAssignee(null)}
                                placeholder="담당자 입력"
                                className="w-full max-w-[240px] text-[12px] bg-white border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingAssignee(ms.id)}
                                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground bg-secondary hover:bg-accent rounded-lg px-3 py-1.5 border-none cursor-pointer transition-colors"
                              >
                                <span>👤</span>
                                <span className="font-semibold">{item.assignee || "담당자 없음"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 우측: 라이브 세팅 체크리스트 */}
          <div>
            <div className="bg-white rounded-2xl border border-border p-5 sticky top-[80px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-extrabold">🎥 라이브 세팅 체크</h3>
                <span className="text-[13px] text-muted-foreground">
                  {checkedLive}/{LIVE_SETUP_ITEMS.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {LIVE_SETUP_ITEMS.map((item) => {
                  const checked = !!liveSetupChecks[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleLiveSetup(item.id, !checked)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-secondary"
                      style={{ background: checked ? "#ecfdf5" : "transparent" }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0"
                        style={{
                          border: checked ? "none" : "2px solid #d2d2d7",
                          background: checked ? "#2ecc71" : "#fff",
                        }}
                      >
                        {checked && "✓"}
                      </div>
                      <span className="text-base">{item.icon}</span>
                      <span
                        className="text-[13px] font-medium"
                        style={{
                          color: checked ? "#059669" : "#1c1c1e",
                          textDecoration: checked ? "line-through" : "none",
                          opacity: checked ? 0.7 : 1,
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              {checkedLive === LIVE_SETUP_ITEMS.length && (
                <div className="mt-3 text-center text-emerald-600 font-bold text-[13px]">
                  🎉 라이브 세팅 완료!
                </div>
              )}
              <button
                onClick={() => {
                  LIVE_SETUP_ITEMS.forEach((item) => {
                    dispatch({ type: "SET_DESIGN_CHECK", lectureKey: liveSetupKey, itemId: item.id, checked: false });
                  });
                }}
                className="mt-3 w-full text-[12px] text-muted-foreground font-semibold py-1.5 rounded-lg bg-secondary border-none cursor-pointer hover:bg-accent transition-colors"
              >
                전체 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
