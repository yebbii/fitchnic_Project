"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCrm, useCurKey, useCurrentLecture } from "@/hooks/use-crm-store";
import { CH_RULES, FEEDBACK_TAGS, HOME_TAB_COLORS, BRAND_GRADIENT } from "@/lib/constants";
import { fetchAICopy, genCopyLocal } from "@/lib/utils";
import type { SeqPhase, SeqItem, CopyData } from "@/lib/types";

interface CopyModalProps {
  sel: { seq: SeqPhase; item: SeqItem };
  onClose: () => void;
}

export default function CopyModal({ sel, onClose }: CopyModalProps) {
  const { state, dispatch } = useCrm();
  const curKey = useCurKey();
  const ld = useCurrentLecture();
  const [isGen, setIsGen] = useState(false);
  const [fbOn, setFbOn] = useState(false);
  const [fbText, setFbText] = useState("");

  const copies = curKey ? state.allCopies[curKey] || {} : {};
  const cp = copies[sel.item.id] as CopyData | undefined;

  const saveCopy = (text: string) => {
    dispatch({
      type: "SET_COPY",
      curKey,
      itemId: sel.item.id,
      copy: { text, edited: text, status: "ai" },
    });
  };

  const doGen = async () => {
    if (!ld) return;
    setIsGen(true);
    try {
      const text = await fetchAICopy(ld, state.ins, sel.seq.id, sel.item, state.lec);
      saveCopy(text);
      toast.success("카피 생성 완료");
    } catch {
      const text = genCopyLocal(ld, state.ins, sel.item);
      saveCopy(text);
      toast.error("AI 생성 실패 — 기본 템플릿 적용됨");
    }
    setIsGen(false);
  };

  const handleCopy = () => {
    if (!cp?.edited) return;
    let t = cp.edited;
    if (ld) {
      t = t.replaceAll("{무료링크}", ld.freeUrl || "{무료링크}");
      t = t.replaceAll("{유튜브링크}", ld.youtubeUrl || "{유튜브링크}");
      t = t.replaceAll("{결제링크}", ld.payUrl || "{결제링크}");
      t = t.replaceAll("{전자책링크}", ld.ebookUrl || "{전자책링크}");
    }
    navigator.clipboard.writeText(t);
    toast.success("클립보드에 복사됨");
  };

  const handleFeedback = () => {
    if (!fbText.trim()) return;
    dispatch({
      type: "ADD_FEEDBACK",
      feedback: {
        id: Date.now(),
        curKey,
        itemId: sel.item.id,
        text: fbText,
        createdAt: new Date().toISOString(),
      },
    });
    setFbText("");
    setFbOn(false);
    toast.success("피드백 저장됨");
  };

  const rule = CH_RULES[sel.item.ch];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/25 backdrop-blur-sm z-[200] flex justify-center items-center p-5"
      style={{ animation: "pop .2s ease" }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[640px] max-h-[85vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="px-7 py-5 border-b border-border/50 flex justify-between items-center sticky top-0 bg-white z-[1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[22px]">{sel.item.icon}</span>
              <span className="text-lg font-bold">{sel.item.name}</span>
              <span
                className="text-[13px] px-2.5 py-0.5 rounded-lg font-bold"
                style={{ background: sel.item.color + "15", color: sel.item.color }}
              >
                {sel.item.ch}
              </span>
            </div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {sel.seq.label} · {state.ins} · {state.lec}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-[#F0F1F4] text-muted-foreground text-lg w-9 h-9 rounded-xl border-none cursor-pointer font-semibold hover:bg-accent"
          >
            ×
          </button>
        </div>

        {/* Channel rules */}
        {rule && (
          <div className="mx-7 mt-3 p-3 px-3.5 bg-[#F0F1F4] rounded-xl flex gap-4 text-[13px] text-muted-foreground flex-wrap">
            <span>이모티콘 {rule.emoji}</span>
            <span>버튼 {rule.btn}</span>
            <span>글자수 {rule.len}</span>
          </div>
        )}

        {/* Content */}
        <div className="px-7 pt-5 pb-7">
          {!cp ? (
            <div className="text-center py-9">
              <button
                onClick={doGen}
                disabled={isGen}
                className="rounded-2xl text-white px-8 py-3.5 text-base font-semibold border-none cursor-pointer disabled:opacity-50"
                style={{ background: BRAND_GRADIENT }}
              >
                {isGen ? "⏳ 생성중..." : "✨ AI 카피 생성"}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={cp.edited || ""}
                onChange={(e) => {
                  dispatch({
                    type: "SET_COPY",
                    curKey,
                    itemId: sel.item.id,
                    copy: {
                      text: cp.text,
                      edited: e.target.value,
                      status: e.target.value !== cp.text ? "edited" : "ai",
                    },
                  });
                }}
                className="w-full min-h-[240px] p-5 bg-[#F7F8FA] border-none rounded-2xl text-foreground text-[15px] leading-[1.8] resize-y outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-between mt-3 flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={doGen}
                    className="bg-primary/10 rounded-xl text-primary px-4 py-2 text-[13px] font-semibold cursor-pointer hover:bg-primary/15 border-none"
                  >
                    🔄 재생성
                  </button>
                  <button
                    onClick={handleCopy}
                    className="bg-emerald-50 rounded-xl text-emerald-600 px-4 py-2 text-[13px] font-semibold cursor-pointer hover:bg-emerald-100 border-none"
                  >
                    📋 복사 (링크치환)
                  </button>
                  <button
                    onClick={() => setFbOn(!fbOn)}
                    className={`rounded-xl px-4 py-2 text-[13px] font-semibold cursor-pointer border-none ${
                      fbOn
                        ? "bg-red-50 text-red-500"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {fbOn ? "✕ 취소" : "💬 피드백"}
                  </button>
                </div>
                <span className="text-[13px] text-muted-foreground font-semibold">
                  {cp.status === "edited" ? "🟠 수정됨" : "🟢 AI원본"}
                </span>
              </div>

              {/* Feedback */}
              {fbOn && (
                <div className="mt-3.5 p-5 bg-amber-50/50 border-none rounded-2xl animate-fi">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {FEEDBACK_TAGS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFbText((p) => (p ? `${p} [${t}]` : `[${t}] `))}
                        className="bg-white border-none rounded-lg text-muted-foreground px-2.5 py-1 text-xs cursor-pointer hover:bg-secondary font-medium"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={fbText}
                    onChange={(e) => setFbText(e.target.value)}
                    placeholder="수정 사유 (AI 학습 반영)"
                    className="w-full min-h-[60px] p-2.5 bg-white border-none rounded-xl text-foreground text-sm outline-none resize-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    onClick={handleFeedback}
                    className="mt-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-lg text-white px-5 py-2 text-[13px] font-semibold border-none cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
