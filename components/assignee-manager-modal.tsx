"use client";

import { useState } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { HOME_TAB_COLORS } from "@/lib/constants";
import type { Assignee, AssigneeRole } from "@/lib/types";

const PRESET_COLORS = [HOME_TAB_COLORS.designer, HOME_TAB_COLORS.pm, "#22c55e", "#38bdf8", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#667eea"];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const ROLE_TABS: { id: AssigneeRole; label: string; color: string }[] = [
  { id: "pm", label: "PM", color: HOME_TAB_COLORS.pm },
  { id: "designer", label: "디자이너", color: HOME_TAB_COLORS.designer },
];

export default function AssigneeManagerModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useCrm();
  const [roleTab, setRoleTab] = useState<AssigneeRole>("pm");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const filtered = state.assignees.filter((a) => a.role === roleTab);
  const tabColor = ROLE_TABS.find((t) => t.id === roleTab)!.color;

  const addAssignee = () => {
    if (!newName.trim()) return;
    const assignee: Assignee = { id: uid(), name: newName.trim(), color: newColor, role: roleTab };
    dispatch({ type: "ADD_ASSIGNEE", assignee });
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  const startEdit = (a: Assignee) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditColor(a.color);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    dispatch({ type: "UPDATE_ASSIGNEE", id: editingId, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[380px] max-h-[80vh] flex flex-col border border-border animate-fi"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold">👤 담당자 관리</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[13px] text-muted-foreground border-none cursor-pointer hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* 역할 탭 */}
        <div className="px-5 pb-3">
          <div className="flex gap-1 bg-secondary rounded-lg p-[3px]">
            {ROLE_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setRoleTab(t.id)}
                className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer border-none ${
                  roleTab === t.id
                    ? "bg-white text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label} ({state.assignees.filter((a) => a.role === t.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-5 min-h-[120px]">
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-[12px]">
              {roleTab === "pm" ? "PM" : "디자이너"} 담당자가 없습니다
            </div>
          )}
          <div className="flex flex-col gap-2">
            {filtered.map((a) => (
              <div key={a.id}>
                {editingId === a.id ? (
                  <div className="flex flex-col gap-2 bg-secondary/50 rounded-xl p-3">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      className="w-full text-[12px] bg-white border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                      placeholder="이름"
                    />
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full border-none cursor-pointer flex-shrink-0 transition-transform"
                          style={{ background: c, outline: editColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px", transform: editColor === c ? "scale(1.2)" : "scale(1)" }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={saveEdit} className="flex-1 text-white rounded-lg py-1 text-[11px] font-semibold border-none cursor-pointer hover:opacity-90" style={{ background: tabColor }}>저장</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-secondary text-muted-foreground rounded-lg py-1 text-[11px] font-semibold border-none cursor-pointer hover:bg-accent">취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-extrabold" style={{ background: a.color }}>
                      {a.name.slice(0, 1)}
                    </div>
                    <span className="flex-1 text-[13px] font-semibold truncate">{a.name}</span>
                    <button
                      onClick={() => startEdit(a)}
                      className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[11px] border-none cursor-pointer hover:bg-accent"
                      title="수정"
                    >✏️</button>
                    <button
                      onClick={() => dispatch({ type: "DELETE_ASSIGNEE", id: a.id })}
                      className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center text-[12px] font-bold text-red-400 border-none cursor-pointer hover:bg-red-100"
                      title="삭제"
                    >×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 추가 */}
        <div className="border-t border-border px-5 py-4 bg-[#fafafa] rounded-b-2xl">
          <div className="text-[11px] font-extrabold text-muted-foreground mb-2">
            {roleTab === "pm" ? "PM" : "디자이너"} 담당자 추가
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAssignee()}
            placeholder="이름 입력"
            className="w-full text-[12px] bg-white border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary mb-2"
          />
          <div className="flex flex-wrap gap-1 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-none cursor-pointer flex-shrink-0 transition-transform"
                style={{ background: c, outline: newColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px", transform: newColor === c ? "scale(1.2)" : "scale(1)" }}
              />
            ))}
          </div>
          <button
            onClick={addAssignee}
            disabled={!newName.trim()}
            className="w-full text-white rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:opacity-90 disabled:opacity-40"
            style={{ background: tabColor }}
          >
            + 추가
          </button>
        </div>
      </div>
    </div>
  );
}
