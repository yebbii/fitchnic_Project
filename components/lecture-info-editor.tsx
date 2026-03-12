"use client";

import { useState } from "react";
import { useCrm, useCurrentLecture } from "@/hooks/use-crm-store";
import { TONE_PRESETS, TARGET_PRESETS, TYPE_PRESETS } from "@/lib/constants";
import TagPicker from "./tag-picker";

export default function LectureInfoEditor() {
  const { state, dispatch } = useCrm();
  const ld = useCurrentLecture();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  if (!ld) return null;

  const { ins, lec } = state;

  const updateLd = (field: string, value: unknown) => {
    dispatch({ type: "UPDATE_LECTURE_FIELD", ins, lec, field, value });
  };

  const startRename = () => {
    setNameValue(lec);
    setEditingName(true);
  };

  const confirmRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== lec) {
      dispatch({ type: "RENAME_LECTURE", ins, oldLec: lec, newLec: trimmed });
    }
    setEditingName(false);
  };

  const updateArrayItem = (field: "usps" | "proof", idx: number, val: string) => {
    const arr = [...(ld[field] || [])];
    arr[idx] = val;
    updateLd(field, arr);
  };

  const addArrayItem = (field: "usps" | "proof") => {
    updateLd(field, [...(ld[field] || []), ""]);
  };

  const removeArrayItem = (field: "usps" | "proof", idx: number) => {
    updateLd(field, (ld[field] || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="animate-fi">
      {/* 강의명 수정 */}
      <div className="mb-3 pb-3 border-b border-border">
        <div className="text-xs text-muted-foreground mb-1 font-semibold">강의명</div>
        {editingName ? (
          <div className="flex gap-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setEditingName(false); }}
              autoFocus
              className="flex-1 bg-secondary border border-primary rounded-lg text-foreground px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={confirmRename}
              className="px-3 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer bg-primary text-white hover:opacity-90"
            >
              확인
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="px-3 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent"
            >
              취소
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{lec}</span>
            <button
              onClick={startRename}
              className="text-[12px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20 transition-colors"
            >
              이름 변경
            </button>
          </div>
        )}
      </div>

      <TagPicker label="톤앤매너" options={TONE_PRESETS} value={ld.tone} onChange={(v) => updateLd("tone", v)} />
      <TagPicker label="타겟" options={TARGET_PRESETS} value={ld.target} onChange={(v) => updateLd("target", v)} />
      <TagPicker label="강의 유형" options={TYPE_PRESETS} value={ld.type} onChange={(v) => updateLd("type", v)} />

      <div className="grid grid-cols-2 gap-2.5 mt-2">
        {([
          { l: "라이브 날짜", f: "liveDate", disabled: true },
          { l: "라이브 시간", f: "liveTime", disabled: true },
          { l: "전자책", f: "ebook", disabled: false },
          { l: "강사스토리", f: "story", disabled: false },
        ] as const).map(({ l, f, disabled }) => (
          <div key={f}>
            <div className="text-xs text-muted-foreground mb-0.5 font-semibold flex items-center gap-1">
              {l}
              {disabled && <span className="text-[10px] text-[#aeaeb2] font-normal">(홈탭에서 수정)</span>}
            </div>
            <input
              value={(ld[f] as string) || ""}
              onChange={(e) => !disabled && updateLd(f, e.target.value)}
              disabled={disabled}
              className={`w-full border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none ${
                disabled
                  ? "bg-[#f5f5f7] text-[#aeaeb2] cursor-not-allowed"
                  : "bg-secondary focus:ring-1 focus:ring-primary"
              }`}
            />
          </div>
        ))}
      </div>

      {/* 링크 관리 */}
      <div className="mt-2.5 bg-primary/5 rounded-[10px] p-3">
        <div className="text-[13px] text-primary font-bold mb-2">🔗 링크 관리 (복사 시 자동 치환)</div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { l: "무료 톡방", f: "freeUrl" },
            { l: "유튜브 라이브", f: "youtubeUrl" },
            { l: "결제 페이지", f: "payUrl" },
            { l: "전자책 다운", f: "ebookUrl" },
          ] as const).map(({ l, f }) => (
            <div key={f}>
              <div className="text-xs text-muted-foreground mb-0.5 font-semibold">{l}</div>
              <input
                value={(ld[f] as string) || ""}
                onChange={(e) => updateLd(f, e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* USP */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-xs text-muted-foreground font-semibold">핵심 USP</div>
          <button
            onClick={() => addArrayItem("usps")}
            className="text-[11px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20 transition-colors"
          >
            + 추가
          </button>
        </div>
        {(ld.usps || []).length === 0 && (
          <div className="text-[12px] text-[#aeaeb2] py-1">USP를 추가하세요</div>
        )}
        {(ld.usps || []).map((u, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <input
              value={u}
              onChange={(e) => updateArrayItem("usps", i, e.target.value)}
              placeholder={`USP ${i + 1}`}
              className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => removeArrayItem("usps", i)}
              className="w-8 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100 transition-colors flex-shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 성과증거 */}
      <div className="mt-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-xs text-muted-foreground font-semibold">성과증거</div>
          <button
            onClick={() => addArrayItem("proof")}
            className="text-[11px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20 transition-colors"
          >
            + 추가
          </button>
        </div>
        {(ld.proof || []).length === 0 && (
          <div className="text-[12px] text-[#aeaeb2] py-1">성과증거를 추가하세요</div>
        )}
        {(ld.proof || []).map((p, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <input
              value={p}
              onChange={(e) => updateArrayItem("proof", i, e.target.value)}
              placeholder={`성과 ${i + 1}`}
              className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => removeArrayItem("proof", i)}
              className="w-8 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100 transition-colors flex-shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
