"use client";

import { useState } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { HOME_TAB_COLORS } from "@/lib/constants";
import type { WorkLog } from "@/lib/types";
import AssigneeManagerModal from "./assignee-manager-modal";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}


export default function WorklogTab() {
  const { state, dispatch } = useCrm();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [lectureKey, setLectureKey] = useState("");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // 담당자 관리
  const [showAssigneeMgr, setShowAssigneeMgr] = useState(false);

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


  const grouped: Record<string, WorkLog[]> = {};
  for (const log of state.workLogs) {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="animate-fi flex min-h-[calc(100vh-100px)]">
      {/* ── 담당자 사이드바 ── */}
      <aside className="w-[260px] min-w-[260px] border-r border-border/50 bg-white overflow-y-auto flex flex-col">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold">담당자</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{state.assignees.filter((a) => a.role === "designer").length}명</div>
          </div>
          <button
            onClick={() => setShowAssigneeMgr(true)}
            className="text-[11px] text-primary font-semibold px-2 py-1 rounded-xl bg-primary/10 border-none cursor-pointer hover:bg-primary/20"
          >
            ⚙️ 관리
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {state.assignees.filter((a) => a.role === "designer").length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-[12px]">담당자가 없습니다</div>
          )}
          {state.assignees.filter((a) => a.role === "designer").map((a) => (
            <div key={a.id} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: a.color }}>
                  {a.name.slice(0, 1)}
                </div>
                <span className="flex-1 text-[12px] font-semibold truncate">{a.name}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── 작업일지 본문 ── */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="pb-[120px] max-w-[760px] mx-auto">
          {/* 입력 영역 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-[15px] font-bold mb-4">작업일지 작성</h3>
            <div className="flex gap-3 mb-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground mb-1">날짜</div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#F0F1F4] border-none rounded-xl text-foreground px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs text-muted-foreground mb-1">강의 (선택)</div>
                <select
                  value={lectureKey}
                  onChange={(e) => setLectureKey(e.target.value)}
                  className="w-full bg-[#F0F1F4] border-none rounded-xl text-foreground px-3 py-2 text-sm outline-none"
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
              className="w-full bg-[#F0F1F4] border-none rounded-xl text-foreground px-4 py-3 text-sm outline-none resize-none leading-relaxed"
            />
            <div className="flex justify-end mt-2.5">
              <button
                onClick={addLog}
                disabled={!content.trim()}
                className="text-white rounded-xl px-6 py-2.5 text-[14px] font-semibold border-none cursor-pointer disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: HOME_TAB_COLORS.designer }}
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
                  <span className="text-[15px] font-bold" style={{ color: HOME_TAB_COLORS.designer }}>{fmtDate(d)}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[12px] text-[#aeaeb2]">{grouped[d].length}건</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {grouped[d].map((log) => (
                    <div key={log.id} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          {log.lectureKey && (
                            <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mb-2" style={{ color: HOME_TAB_COLORS.designer, background: HOME_TAB_COLORS.designer + "1a" }}>
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
                                className="w-full bg-[#F0F1F4] border-none rounded-xl text-foreground px-3 py-2 text-sm outline-none resize-none leading-relaxed"
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => saveEdit(log.id)} className="text-white rounded-xl px-4 py-1.5 text-[13px] font-semibold border-none cursor-pointer" style={{ background: HOME_TAB_COLORS.designer }}>저장</button>
                                <button onClick={() => { setEditId(null); setEditContent(""); }} className="bg-[#F0F1F4] text-muted-foreground rounded-xl px-4 py-1.5 text-[13px] font-semibold border-none cursor-pointer">취소</button>
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
                              className="w-7 h-7 rounded-lg bg-[#F0F1F4] flex items-center justify-center text-[13px] cursor-pointer border-none hover:bg-accent transition-colors"
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
      {showAssigneeMgr && <AssigneeManagerModal onClose={() => setShowAssigneeMgr(false)} />}
    </div>
  );
}
