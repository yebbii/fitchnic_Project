"use client";

import { useState, useMemo } from "react";
import { useCrm } from "@/hooks/use-crm-store";
import { useInstructorStats, useLectureSummaries, type InstructorStats } from "@/hooks/use-derived-data";
import { HOME_TAB_COLORS } from "@/lib/constants";
import { uid, fmtDateKr } from "@/lib/utils";
import type { InstructorProfile } from "@/lib/types";

export default function InstructorManagement() {
  const { state, dispatch } = useCrm();
  const stats = useInstructorStats();
  const summaries = useLectureSummaries();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const instructors = useMemo(() => {
    const profileMap = new Map(state.instructorProfiles.map((p) => [p.name, p]));
    const result: { profile: InstructorProfile | null; stats: InstructorStats }[] = [];
    stats.forEach((s) => {
      result.push({ profile: profileMap.get(s.name) || null, stats: s });
      profileMap.delete(s.name);
    });
    profileMap.forEach((p) => {
      result.push({ profile: p, stats: { name: p.name, totalLectures: 0, activeLectures: 0, completedLectures: 0, lastLiveDate: null, platforms: p.platforms } });
    });
    return result.sort((a, b) => a.stats.name.localeCompare(b.stats.name));
  }, [state.instructorProfiles, stats]);

  // 강사별 강의 목록
  const getLectures = (name: string) =>
    summaries.filter((s) => s.ins === name).sort((a, b) => a.daysLeft - b.daysLeft);

  // 폼
  const [form, setForm] = useState({ name: "", contact: "", specialty: "", memo: "" });
  const addInstructor = () => {
    if (!form.name.trim()) return;
    dispatch({
      type: "ADD_INSTRUCTOR_PROFILE",
      profile: { id: uid(), name: form.name.trim(), contact: form.contact.trim(), specialty: form.specialty.trim(), platforms: [], profileImageUrl: "", memo: form.memo.trim(), createdAt: new Date().toISOString() },
    });
    setForm({ name: "", contact: "", specialty: "", memo: "" });
    setShowAdd(false);
  };

  // 편집
  const [editForm, setEditForm] = useState<Partial<InstructorProfile>>({});
  const startEdit = (p: InstructorProfile) => { setEditId(p.id); setEditForm({ name: p.name, contact: p.contact, specialty: p.specialty, memo: p.memo }); };
  const saveEdit = () => {
    if (!editId || !editForm.name?.trim()) return;
    const old = state.instructorProfiles.find((p) => p.id === editId);
    if (old && editForm.name!.trim() !== old.name) dispatch({ type: "RENAME_INSTRUCTOR", oldIns: old.name, newIns: editForm.name!.trim() });
    dispatch({ type: "UPDATE_INSTRUCTOR_PROFILE", id: editId, updates: { name: editForm.name!.trim(), contact: editForm.contact, specialty: editForm.specialty, memo: editForm.memo } });
    setEditId(null);
  };

  const inputCls = "w-full bg-[#F0F1F4] border-none rounded-xl text-foreground px-3 py-[6px] text-sm outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#F7F8FA]">
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">강사 관리</h2>
            <span className="text-[12px] text-muted-foreground">{instructors.length}명</span>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer text-white transition-opacity hover:opacity-90"
            style={{ background: HOME_TAB_COLORS.primary }}
          >
            + 새 강사
          </button>
        </div>

        {/* 새 강사 추가 */}
        {showAdd && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="text-[13px] font-extrabold mb-3">새 강사 추가</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[12px] text-muted-foreground mb-1 font-semibold">이름 *</div>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="강사명" className={inputCls} />
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground mb-1 font-semibold">연락처</div>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="연락처" className={inputCls} />
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground mb-1 font-semibold">전문분야</div>
                <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="예: 이커머스, 유튜브" className={inputCls} />
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground mb-1 font-semibold">메모</div>
                <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="메모" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer bg-[#F0F1F4] text-muted-foreground hover:bg-accent">취소</button>
              <button onClick={addInstructor} disabled={!form.name.trim()} className="px-3 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer text-white disabled:opacity-40" style={{ background: HOME_TAB_COLORS.primary }}>추가</button>
            </div>
          </div>
        )}

        {/* 카드 그리드 */}
        <div className="grid grid-cols-4 gap-5">
          {instructors.map(({ profile, stats: s }) => {
            const isEditing = editId === profile?.id;
            const isExpanded = expandedName === s.name;
            const isDeleting = deleteConfirmId === profile?.id;
            const color = s.platforms.length > 0 ? (state.platformColors[s.platforms[0]] ?? "#667eea") : "#667eea";
            const initials = s.name.slice(0, 1);
            const lectures = isExpanded ? getLectures(s.name) : [];

            return (
              <div key={profile?.id ?? s.name} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* 카드 본체 */}
                <div
                  className="px-4 pt-5 pb-4 cursor-pointer hover:bg-[#F7F8FA] transition-colors flex flex-col items-center text-center relative"
                  onClick={() => setExpandedName(isExpanded ? null : s.name)}
                >
                  {/* 편집 버튼 */}
                  {profile ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(profile); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-md text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer hover:bg-secondary flex items-center justify-center"
                    >⋯</button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: "ADD_INSTRUCTOR_PROFILE", profile: { id: uid(), name: s.name, contact: "", specialty: "", platforms: s.platforms, profileImageUrl: "", memo: "", createdAt: new Date().toISOString() } }); }}
                      className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded text-primary bg-primary/10 border-none cursor-pointer hover:bg-primary/20"
                    >+프로필</button>
                  )}

                  {/* 원형 아바타 */}
                  <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-[22px] font-extrabold text-white mb-3"
                    style={{ background: profile?.profileImageUrl ? `url(${profile.profileImageUrl}) center/cover` : color }}
                  >
                    {!profile?.profileImageUrl && initials}
                  </div>

                  {/* 이름 + 플랫폼 */}
                  <div className="text-[14px] font-extrabold mb-0.5">{s.name}</div>
                  {s.platforms.length > 0 && (
                    <div className="flex gap-1 justify-center mb-1">
                      {s.platforms.map((p) => (
                        <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: (state.platformColors[p] ?? "#667eea") + "20", color: state.platformColors[p] ?? "#667eea" }}>{p}</span>
                      ))}
                    </div>
                  )}
                  {profile?.specialty && <div className="text-[11px] text-muted-foreground truncate w-full mb-1">{profile.specialty}</div>}

                  {/* 통계 */}
                  <div className="flex gap-2 text-[11px] justify-center">
                    <span className="text-foreground font-bold">{s.totalLectures}개</span>
                    <span className="text-green-600">{s.activeLectures} 진행</span>
                    <span className="text-muted-foreground">{s.completedLectures} 완료</span>
                  </div>
                </div>

                {/* 편집 모드 */}
                {isEditing && profile && (
                  <div className="border-t border-border/50 px-3 py-2.5 bg-[#F7F8FA] rounded-b-xl">
                    <div className="flex flex-col gap-1.5 mb-2">
                      <input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="이름" className={inputCls} />
                      <input value={editForm.contact ?? ""} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} placeholder="연락처" className={inputCls} />
                      <input value={editForm.specialty ?? ""} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} placeholder="전문분야" className={inputCls} />
                      <input value={editForm.memo ?? ""} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} placeholder="메모" className={inputCls} />
                    </div>
                    <div className="flex gap-1 justify-between">
                      {isDeleting ? (
                        <div className="flex gap-1">
                          <button onClick={() => { dispatch({ type: "DELETE_INSTRUCTOR_PROFILE", id: profile.id }); setDeleteConfirmId(null); setEditId(null); }} className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer bg-red-500 text-white">삭제 확인</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer bg-[#F0F1F4] text-muted-foreground">취소</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(profile.id)} className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer text-red-400 hover:bg-red-50">삭제</button>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => setEditId(null)} className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer bg-[#F0F1F4] text-muted-foreground hover:bg-accent">취소</button>
                        <button onClick={saveEdit} className="px-2 py-1 rounded-xl text-[10px] font-bold border-none cursor-pointer text-white" style={{ background: HOME_TAB_COLORS.primary }}>저장</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 강의 목록 (펼침) */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-border/50">
                    {lectures.length === 0 ? (
                      <div className="px-3 py-2.5 text-[11px] text-muted-foreground text-center">강의 없음</div>
                    ) : (
                      lectures.map((lec, i) => {
                        const dLabel = lec.daysLeft === 0 ? "D-Day" : lec.daysLeft > 0 ? `D-${lec.daysLeft}` : `D+${Math.abs(lec.daysLeft)}`;
                        return (
                          <div key={lec.curKey} className={`flex items-center gap-2 px-3.5 py-2 text-[11px] ${i > 0 ? "border-t border-border/40" : ""}`}>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lec.color }} />
                            <span className="font-semibold text-foreground flex-1 truncate">{lec.lec}</span>
                            {lec.status === "active" ? (
                              <span className={`text-[9px] font-bold px-1 py-px rounded flex-shrink-0 ${
                                lec.daysLeft <= 1 ? "bg-red-100 text-red-600" : lec.daysLeft <= 3 ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"
                              }`}>{dLabel}</span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground flex-shrink-0">완료</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
