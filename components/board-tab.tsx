"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCrm, useCurKey, useCurrentLecture, useCurrentSeq } from "@/hooks/use-crm-store";
import { CH_OPTIONS, HOME_TAB_COLORS, BRAND_GRADIENT } from "@/lib/constants";
import { uid, fmtDateKr, fetchAICopy, genCopyLocal, resolveColor, seqTotalItems } from "@/lib/utils";
import { useActiveLectures } from "@/hooks/use-derived-data";
import LectureInfoEditor from "./lecture-info-editor";
import CopyModal from "./copy-modal";

import type { SeqPhase, SeqItem } from "@/lib/types";
import AssigneeManagerModal from "./assignee-manager-modal";

export default function BoardTab() {
  const { state, dispatch } = useCrm();
  const curKey = useCurKey();
  const ld = useCurrentLecture();
  const seqData = useCurrentSeq();

  const [sel, setSel] = useState<{ seq: SeqPhase; item: SeqItem } | null>(null);
  const [isGen, setIsGen] = useState(false);
  const [editInfo, setEditInfo] = useState(false);

  const [addItemSeq, setAddItemSeq] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCh, setNewItemCh] = useState("문자");
  const [showPmAssignee, setShowPmAssignee] = useState(false);
  const [showAssigneeMgr, setShowAssigneeMgr] = useState(false);
  const activeLectures = useActiveLectures();

  const pmAssigneeName = curKey ? (state.pmProjectAssignees[curKey] ?? "") : "";
  const desAssigneeName = curKey ? (state.designerProjectAssignees[curKey] ?? "") : "";

  const copies = curKey ? state.allCopies[curKey] || {} : {};
  const checks = curKey ? state.allChecks[curKey] || {} : {};
  const cardColor = resolveColor(state.platformColors, ld?.platform);
  const totalItems = seqTotalItems(seqData);
  const gc = Object.keys(copies).length;
  const cc = Object.values(checks).filter(Boolean).length;

  const saveCopy = (itemId: string, text: string) => {
    dispatch({ type: "SET_COPY", curKey, itemId, copy: { text, edited: text, status: "ai" } });
  };

  const doGenAll = async () => {
    if (!ld) return;
    setIsGen(true);
    let success = 0;
    let fail = 0;
    for (const s of seqData) {
      for (const i of s.items) {
        try {
          const text = await fetchAICopy(ld, state.ins, s.id, i, state.lec);
          saveCopy(i.id, text);
          success++;
        } catch {
          const text = genCopyLocal(ld, state.ins, i);
          saveCopy(i.id, text);
          fail++;
        }
      }
    }
    setIsGen(false);
    if (fail === 0) {
      toast.success(`전체 ${success}개 카피 생성 완료`);
    } else {
      toast.warning(`${success}개 성공 / ${fail}개 기본 템플릿 적용`);
    }
  };

  const updateSeq = (newSeq: SeqPhase[]) => {
    if (!curKey) return;
    dispatch({ type: "UPDATE_SEQ", curKey, seq: newSeq });
  };

  const addSeqItem = (seqId: string) => {
    if (!newItemName.trim()) return;
    const ch = CH_OPTIONS.find((c) => c.ch === newItemCh);
    const newSeq = seqData.map((s) =>
      s.id === seqId
        ? {
            ...s,
            items: [
              ...s.items,
              { id: uid(), ch: newItemCh, name: newItemName, icon: ch?.icon || "📱", color: ch?.color || "#999" },
            ],
          }
        : s
    );
    updateSeq(newSeq);
    setNewItemName("");
    setAddItemSeq(null);
  };

  const removeSeqItem = (seqId: string, itemId: string) => {
    const newSeq = seqData.map((s) =>
      s.id === seqId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
    );
    updateSeq(newSeq);
  };

  return (
    <div className="animate-fi">
      {/* 강사/강의 셀렉터 */}
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
              .map(([n]) => (
                <option key={n}>{n}</option>
              ))}
          </select>
        )}
        {state.ins && <span className="text-[#aeaeb2] text-lg">›</span>}
      </div>

      {/* 강의 정보 헤더 */}
      {ld && (
        <div className="px-7 py-3.5 bg-white border-b border-border">
          <div className="flex justify-between items-center mb-0">
            <div className="flex gap-4 text-sm text-muted-foreground flex-wrap items-center">
              <span className="font-bold text-base" style={{ color: cardColor }}>
                {state.ins} · {state.lec}
              </span>
              {!editInfo && <span>📅 {fmtDateKr(ld.liveDate)} {ld.liveTime}</span>}
              {!editInfo && (
                <div className="relative">
                  <button
                    onClick={() => setShowPmAssignee((v) => !v)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border bg-transparent cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <span className="text-muted-foreground">PM</span>
                    <span className={pmAssigneeName ? "text-foreground" : "text-[#aeaeb2]"}>{pmAssigneeName || "미지정"}</span>
                    <span className="text-[9px] text-muted-foreground">▾</span>
                  </button>
                  {showPmAssignee && (() => {
                    const pmAssignees = state.assignees.filter((a) => a.role === "pm");
                    return (
                      <div className="absolute left-0 top-full mt-0.5 z-30 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
                        <button
                          onClick={() => { dispatch({ type: "SET_PM_PROJECT_ASSIGNEE", curKey, assignee: "" }); setShowPmAssignee(false); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary border-none bg-transparent cursor-pointer"
                        >
                          없음
                        </button>
                        {pmAssignees.length === 0 && (
                          <div className="px-3 py-1.5 text-[11px] text-[#aeaeb2]">PM 담당자를 추가하세요</div>
                        )}
                        {pmAssignees.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => { dispatch({ type: "SET_PM_PROJECT_ASSIGNEE", curKey, assignee: a.name }); setShowPmAssignee(false); }}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-secondary border-none bg-transparent cursor-pointer ${pmAssigneeName === a.name ? "bg-secondary" : ""}`}
                          >
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-extrabold flex-shrink-0" style={{ background: a.color }}>{a.name.slice(0, 1)}</div>
                            <span className="text-[11px] font-semibold">{a.name}</span>
                          </button>
                        ))}
                        <div className="border-t border-border mt-1 pt-1">
                          <button
                            onClick={() => { setShowPmAssignee(false); setShowAssigneeMgr(true); }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-primary font-semibold hover:bg-secondary border-none bg-transparent cursor-pointer"
                          >
                            ⚙️ 담당자 관리
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {!editInfo && (
                desAssigneeName ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: HOME_TAB_COLORS.designer + "15", color: HOME_TAB_COLORS.designer, border: `1px solid ${HOME_TAB_COLORS.designer}30` }}>
                    <span className="w-3.5 h-3.5 rounded-full text-white text-[8px] font-extrabold flex items-center justify-center flex-shrink-0" style={{ background: HOME_TAB_COLORS.designer }}>{desAssigneeName.slice(0, 1)}</span>
                    담당 {desAssigneeName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-[#aeaeb2] bg-secondary border border-border">
                    <span className="text-[10px]">👤</span> 담당 미지정
                  </span>
                )
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  dispatch({ type: "COMPLETE_LECTURE", ins: state.ins, lec: state.lec });
                  dispatch({ type: "SET_TAB", tab: "dashboard" });
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                ✅ 완료 처리
              </button>
              <button
                onClick={() => setEditInfo(!editInfo)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none ${
                  editInfo ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"
                }`}
              >
                {editInfo ? "✕ 닫기" : "✏️ 정보 수정"}
              </button>
            </div>
          </div>
          {editInfo && <div className="mt-3.5"><LectureInfoEditor /></div>}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      {!ld ? (() => {
        const futureActive = activeLectures.filter((l) => l.daysLeft >= 0);
        return (
          <div className="px-7 py-6 max-w-[1100px] mx-auto">
            <h3 className="text-[17px] font-extrabold mb-4">📋 진행중 강의 선택</h3>
            {futureActive.length === 0 ? (
              <div className="text-center text-muted-foreground py-16 text-[14px]">진행중인 강의가 없습니다</div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {futureActive.map((p) => {
                  const pmA = state.pmProjectAssignees[p.curKey] ?? "";
                  const desA = state.designerProjectAssignees[p.curKey] ?? "";
                  const pct = p.pmTotal ? Math.round((p.pmChecked / p.pmTotal) * 100) : 0;
                  return (
                    <div
                      key={p.curKey}
                      onClick={() => {
                        dispatch({ type: "SELECT_INSTRUCTOR", ins: p.ins });
                        setTimeout(() => dispatch({ type: "SELECT_LECTURE", lec: p.lec }), 0);
                      }}
                      className="bg-secondary/30 rounded-xl border border-border p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                      style={{ borderTop: `3px solid ${p.color}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-extrabold truncate" style={{ color: p.color }}>{p.ins}</span>
                        {p.daysLeft <= 7 && p.daysLeft >= 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.daysLeft <= 1 ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                            {p.daysLeft === 0 ? "D-Day" : `D-${p.daysLeft}`}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] font-semibold text-foreground truncate">{p.lec}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmtDateKr(p.liveDate)} {p.liveTime}</div>
                      {(pmA || desA) && (
                        <div className="text-[10px] text-[#aeaeb2] mt-1 truncate">
                          {pmA ? `PM ${pmA}` : ""}{pmA && desA ? " / " : ""}{desA ? `담당 ${desA}` : ""}
                        </div>
                      )}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>진행률</span>
                          <span>{p.pmChecked}/{p.pmTotal}</span>
                        </div>
                        <div className="h-1.5 bg-[#f0f0f5] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })() : (
        <div className="px-7 py-5 pb-[120px] max-w-[1000px] mx-auto">
          <div className="flex justify-between items-center mb-5">
            <div className="text-[15px] text-muted-foreground font-semibold">
              {gc}/{totalItems} 생성 · {cc}/{totalItems} 체크
            </div>
            <button
              onClick={doGenAll}
              disabled={isGen}
              className="rounded-[10px] text-white px-7 py-3 text-[15px] font-semibold border-none cursor-pointer disabled:opacity-50"
              style={{ background: BRAND_GRADIENT }}
            >
              {isGen ? "⏳ 생성 중..." : "✨ 전체 카피 생성 (Claude AI)"}
            </button>
          </div>

          {/* D-10 혜택 입력 (디자이너 탭 연동) */}
          {curKey && (() => {
            const meta = state.milestoneMeta[curKey] || {};
            const benefitText = meta.benefit || "";
            const benefitDone = meta.benefitDone === "true";
            return (
              <div className={`rounded-2xl border-2 p-5 mb-5 ${benefitDone ? "bg-gray-50 border-gray-200" : "bg-white border-red-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 text-red-500">D-10</span>
                    <span className="text-[15px] font-extrabold">혜택 전달</span>
                    <span className="text-[12px] text-muted-foreground">→ 디자이너 탭에 자동 반영</span>
                  </div>
                  <button
                    onClick={() => dispatch({ type: "SET_MILESTONE_META", curKey, field: "benefitDone", value: benefitDone ? "false" : "true" })}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                      benefitDone ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {benefitDone ? "✅ 전달 완료" : "전달 완료 체크"}
                  </button>
                </div>
                <textarea
                  value={benefitText}
                  onChange={(e) => dispatch({ type: "SET_MILESTONE_META", curKey, field: "benefit", value: e.target.value })}
                  rows={3}
                  placeholder="혜택 내용을 입력하세요 (디자이너 탭 D-10에 자동 반영됩니다)"
                  className="w-full text-[13px] bg-secondary border border-border rounded-lg px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
            );
          })()}

          {/* 시퀀스 타임라인 */}
          {seqData.map((seq, si) => (
            <div
              key={seq.id}
              id={`seq-${seq.id}`}
              className="mb-1.5 rounded-xl px-1"
              style={{ animation: `fi .3s ease ${si * 0.03}s both` }}
            >
              <div className="flex items-center gap-3 py-3.5 pb-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: cardColor }}
                />
                <span className="text-[17px] font-extrabold">{seq.label}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[13px] text-[#aeaeb2]">{seq.items.length}개</span>
              </div>

              <div className="grid gap-2.5 pl-[22px] mb-1" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
                {seq.items.map((item) => {
                  const cp = copies[item.id];
                  const ck = checks[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSel({ seq, item })}
                      className="bg-secondary/30 rounded-xl px-4 py-3.5 cursor-pointer relative transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ border: `2px solid ${ck ? "#d1d5db" : cp ? cardColor + "40" : "#e5e5ea"}` }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm font-bold" style={{ color: item.color }}>{item.ch}</span>
                          <span className="text-[13px] text-muted-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.id.startsWith("c_") && (
                            <div
                              onClick={(e) => { e.stopPropagation(); removeSeqItem(seq.id, item.id); }}
                              className="w-[22px] h-[22px] rounded-md bg-red-50 flex items-center justify-center cursor-pointer text-xs text-red-500"
                            >
                              ×
                            </div>
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "SET_CHECK", curKey, itemId: item.id, checked: !ck });
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer text-[13px] text-white font-bold"
                            style={{
                              border: ck ? "none" : "2px solid #d2d2d7",
                              background: ck ? "#9ca3af" : "#fff",
                            }}
                          >
                            {ck && "✓"}
                          </div>
                        </div>
                      </div>
                      {cp ? (
                        <div className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-h-[52px] overflow-hidden">
                          {cp.edited?.substring(0, 120)}...
                        </div>
                      ) : (
                        <div className="text-[13px] text-[#aeaeb2] mt-2 italic">클릭하여 카피 생성</div>
                      )}
                      {cp?.status === "edited" && (
                        <div className="absolute top-2.5 right-14 w-[7px] h-[7px] rounded-full bg-[#e67e22]" />
                      )}
                    </div>
                  );
                })}

                {/* 알림 추가 */}
                {addItemSeq === seq.id ? (
                  <div className="bg-white border-2 border-dashed border-primary rounded-xl p-4 animate-fi">
                    <div className="text-sm font-bold text-primary mb-2.5">새 알림 추가</div>
                    <div className="mb-2">
                      <div className="text-xs text-muted-foreground mb-1">채널</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {CH_OPTIONS.map((o) => (
                          <button
                            key={o.ch}
                            onClick={() => setNewItemCh(o.ch)}
                            className="rounded-lg px-3 py-1.5 text-[13px] cursor-pointer border-2 font-medium"
                            style={{
                              background: newItemCh === o.ch ? o.color + "15" : "#fff",
                              borderColor: newItemCh === o.ch ? o.color : "#d2d2d7",
                              color: newItemCh === o.ch ? o.color : "#6e6e73",
                            }}
                          >
                            {o.icon} {o.ch}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-2.5">
                      <div className="text-xs text-muted-foreground mb-1">알림 이름</div>
                      <input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="예: 추가 리마인드"
                        className="w-full bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addSeqItem(seq.id)}
                        className="bg-primary rounded-lg text-white px-[18px] py-2 text-[13px] font-semibold border-none cursor-pointer"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => { setAddItemSeq(null); setNewItemName(""); }}
                        className="bg-secondary rounded-lg text-muted-foreground px-[18px] py-2 text-[13px] font-semibold border-none cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setAddItemSeq(seq.id)}
                    className="bg-transparent border-2 border-dashed border-[#e5e5ea] rounded-xl px-4 py-3.5 cursor-pointer flex items-center justify-center text-[#aeaeb2] text-sm font-semibold min-h-[60px] transition-all hover:border-primary hover:text-primary"
                  >
                    + 알림 추가
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {sel && <CopyModal sel={sel} onClose={() => setSel(null)} />}

      {showAssigneeMgr && <AssigneeManagerModal onClose={() => setShowAssigneeMgr(false)} />}
    </div>
  );
}
