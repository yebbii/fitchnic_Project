"use client";

import { useState } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import type { WorkLog, Assignee } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const PRESET_COLORS = ["#764ba2", "#f97316", "#22c55e", "#38bdf8", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#667eea"];

export default function WorklogTab() {
  const { state, dispatch } = useCrm();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [lectureKey, setLectureKey] = useState("");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // 담당자 관리
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const activeLectures: { key: string; label: string }[] = [];
  Object.entries(state.data).forEach(([ins, iD]) => {
    Object.entries(iD.lectures).forEach(([lec, lD]) => {
      if (lD.status === "active") {
        activeLectures.push({ key: `${ins}|${lec}`, label: `${ins} · ${lec}` });
      }
    });
  });

  const addLog = () => {
    if (!content.trim()) return;
    const log: WorkLog = {
      id: uid(),
      date,
      lectureKey,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_WORK_LOG", log });
    setContent("");
  };

  const saveEdit = (id: string) => {
    if (!editContent.trim()) return;
    dispatch({ type: "UPDATE_WORK_LOG", id, content: editContent.trim() });
    setEditId(null);
    setEditContent("");
  };

  const addAssignee = () => {
    if (!newName.trim()) return;
    const assignee: Assignee = { id: uid(), name: newName.trim(), color: newColor };
    dispatch({ type: "ADD_ASSIGNEE", assignee });
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  const startEditAssignee = (a: Assignee) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditColor(a.color);
  };

  const saveAssignee = () => {
    if (!editName.trim() || !editingId) return;
    dispatch({ type: "UPDATE_ASSIGNEE", id: editingId, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const grouped: Record<string, WorkLog[]> = {};
  for (const log of state.workLogs) {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="animate-fi flex min-h-[calc(100vh-100px)]">
      {/* ── 담당자 사이드바 ── */}
      <aside className="w-[240px] min-w-[240px] border-r border-border bg-white overflow-y-auto flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-[13px] font-extrabold">👤 담당자</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{state.assignees.length}명</div>
        </div>

        {/* 담당자 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {state.assignees.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-[12px]">담당자가 없습니다</div>
          )}
          {state.assignees.map((a) => (
            <div key={a.id} className="px-4 py-3">
              {editingId === a.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveAssignee()}
                    className="w-full text-[12px] bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
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
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-5 h-5 rounded-full border-none cursor-pointer p-0 bg-transparent"
                      title="직접 입력"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={saveAssignee} className="flex-1 bg-[#764ba2] text-white rounded-lg py-1 text-[11px] font-semibold border-none cursor-pointer hover:opacity-90">저장</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-secondary text-muted-foreground rounded-lg py-1 text-[11px] font-semibold border-none cursor-pointer hover:bg-accent">취소</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-extrabold" style={{ background: a.color }}>
                    {a.name.slice(0, 1)}
                  </div>
                  <span className="flex-1 text-[12px] font-semibold truncate">{a.name}</span>
                  <button
                    onClick={() => startEditAssignee(a)}
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

        {/* 담당자 추가 */}
        <div className="border-t border-border px-4 py-3 bg-[#fafafa]">
          <div className="text-[11px] font-extrabold text-muted-foreground mb-2">담당자 추가</div>
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
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-5 h-5 rounded-full border-none cursor-pointer p-0 bg-transparent"
              title="직접 입력"
            />
          </div>
          <button
            onClick={addAssignee}
            disabled={!newName.trim()}
            className="w-full bg-[#764ba2] text-white rounded-lg py-1.5 text-[12px] font-semibold border-none cursor-pointer hover:opacity-90 disabled:opacity-40"
          >
            + 추가
          </button>
        </div>
      </aside>

      {/* ── 작업일지 본문 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-7 py-5 pb-[120px] max-w-[760px] mx-auto">
          {/* 입력 영역 */}
          <div className="bg-white rounded-2xl border border-border p-5 mb-6">
            <h3 className="text-[15px] font-extrabold mb-4">📝 작업일지 작성</h3>
            <div className="flex gap-3 mb-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground mb-1">날짜</div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs text-muted-foreground mb-1">강의 (선택)</div>
                <select
                  value={lectureKey}
                  onChange={(e) => setLectureKey(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none"
                >
                  <option value="">강의 없음 (일반 작업)</option>
                  {activeLectures.map((l) => (
                    <option key={l.key} value={l.key}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addLog(); }}
              placeholder="오늘 작업한 내용을 기록하세요... (Ctrl+Enter로 저장)"
              rows={4}
              className="w-full bg-secondary border border-border rounded-xl text-foreground px-4 py-3 text-sm outline-none resize-none leading-relaxed"
            />
            <div className="flex justify-end mt-2.5">
              <button
                onClick={addLog}
                disabled={!content.trim()}
                className="bg-[#764ba2] text-white rounded-xl px-6 py-2.5 text-[14px] font-semibold border-none cursor-pointer disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                저장
              </button>
            </div>
          </div>

          {/* 로그 목록 */}
          {state.workLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] text-[#aeaeb2]">
              <div className="text-5xl mb-3.5">📓</div>
              <div className="text-xl font-bold text-muted-foreground">작업일지가 없습니다</div>
              <div className="text-[15px] text-[#aeaeb2] mt-1.5">위에서 첫 번째 일지를 작성해보세요</div>
            </div>
          ) : (
            sortedDates.map((d) => (
              <div key={d} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[14px] font-extrabold text-[#764ba2]">{fmtDate(d)}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[12px] text-[#aeaeb2]">{grouped[d].length}건</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {grouped[d].map((log) => (
                    <div key={log.id} className="bg-white rounded-xl border border-border p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          {log.lectureKey && (
                            <div className="text-[11px] font-semibold text-[#764ba2] bg-[#764ba2]/10 px-2 py-0.5 rounded-full inline-block mb-2">
                              {log.lectureKey.replace("|", " · ")}
                            </div>
                          )}
                          {editId === log.id ? (
                            <div>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full bg-secondary border border-border rounded-lg text-foreground px-3 py-2 text-sm outline-none resize-none leading-relaxed"
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => saveEdit(log.id)} className="bg-[#764ba2] text-white rounded-lg px-4 py-1.5 text-[13px] font-semibold border-none cursor-pointer">저장</button>
                                <button onClick={() => { setEditId(null); setEditContent(""); }} className="bg-secondary text-muted-foreground rounded-lg px-4 py-1.5 text-[13px] font-semibold border-none cursor-pointer">취소</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground">{log.content}</p>
                          )}
                        </div>
                        {editId !== log.id && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { setEditId(log.id); setEditContent(log.content); }}
                              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-[13px] cursor-pointer border-none hover:bg-accent transition-colors"
                              title="수정"
                            >✏️</button>
                            <button
                              onClick={() => dispatch({ type: "DELETE_WORK_LOG", id: log.id })}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[13px] cursor-pointer border-none hover:bg-red-100 transition-colors text-red-500 font-bold"
                              title="삭제"
                            >×</button>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-[#aeaeb2] mt-2">
                        {new Date(log.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
