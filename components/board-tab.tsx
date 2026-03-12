"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCrm, useCurKey, useCurrentLecture, useCurrentSeq } from "@/hooks/use-crm-store";
import { CH_OPTIONS } from "@/lib/constants";
import { uid, fmtDateKr, fetchAICopy, genCopyLocal } from "@/lib/utils";
import LectureInfoEditor from "./lecture-info-editor";
import CopyModal from "./copy-modal";
import AddLectureDialog from "./add-lecture-dialog";
import type { SeqPhase, SeqItem } from "@/lib/types";

export default function BoardTab() {
  const { state, dispatch } = useCrm();
  const curKey = useCurKey();
  const ld = useCurrentLecture();
  const seqData = useCurrentSeq();

  const [sel, setSel] = useState<{ seq: SeqPhase; item: SeqItem } | null>(null);
  const [isGen, setIsGen] = useState(false);
  const [editInfo, setEditInfo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addItemSeq, setAddItemSeq] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCh, setNewItemCh] = useState("문자");

  const copies = curKey ? state.allCopies[curKey] || {} : {};
  const checks = curKey ? state.allChecks[curKey] || {} : {};
  const cardColor = ld?.color ?? (ld?.platform ? state.platformColors[ld.platform] : undefined) ?? state.data[state.ins]?.color ?? "#667eea";
  const totalItems = seqData.reduce((s, q) => s + q.items.length, 0);
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
        {state.ins && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary/10 border border-primary/30 rounded-lg text-primary px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-primary/15"
          >
            + 강의 추가
          </button>
        )}
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
      {!ld ? (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-[#aeaeb2]">
          <div className="text-5xl mb-3.5">📋</div>
          <div className="text-xl font-bold text-muted-foreground">강사와 강의를 선택하세요</div>
          <div className="text-[15px] text-[#aeaeb2] mt-1.5">또는 대시보드에서 강의를 클릭하세요</div>
        </div>
      ) : (
        <div className="px-7 py-5 pb-[120px] max-w-[1000px] mx-auto">
          <div className="flex justify-between items-center mb-5">
            <div className="text-[15px] text-muted-foreground font-semibold">
              {gc}/{totalItems} 생성 · {cc}/{totalItems} 체크
            </div>
            <button
              onClick={doGenAll}
              disabled={isGen}
              className="bg-gradient-to-br from-primary to-[#764ba2] rounded-[10px] text-white px-7 py-3 text-[15px] font-semibold border-none cursor-pointer disabled:opacity-50"
            >
              {isGen ? "⏳ 생성 중..." : "✨ 전체 카피 생성 (Claude AI)"}
            </button>
          </div>

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
                      className="bg-white rounded-xl px-4 py-3.5 cursor-pointer relative transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ border: `2px solid ${ck ? "#2ecc71" : cp ? cardColor + "40" : "#e5e5ea"}` }}
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
                              background: ck ? "#2ecc71" : "#fff",
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
      {showAdd && <AddLectureDialog defaultInstructor={state.ins} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
