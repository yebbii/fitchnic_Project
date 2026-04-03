"use client";

import { useState, useMemo, useRef } from "react";
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
  const [modalName, setModalName] = useState<string | null>(null);

  const instructors = useMemo(() => {
    const profileMap = new Map(state.instructorProfiles.map((p) => [p.name, p]));
    const result: { profile: InstructorProfile | null; stats: InstructorStats }[] = [];
    stats.forEach((s) => {
      result.push({ profile: profileMap.get(s.name) || null, stats: s });
      profileMap.delete(s.name);
    });
    profileMap.forEach((p) => {
      result.push({ profile: p, stats: { name: p.name, totalLectures: 0, activeLectures: 0, standbyLectures: 0, completedLectures: 0, lastLiveDate: null, platforms: p.platforms } });
    });
    return result.sort((a, b) => {
      const aOut = a.profile?.status === "out" ? 1 : 0;
      const bOut = b.profile?.status === "out" ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      return a.stats.name.localeCompare(b.stats.name);
    });
  }, [state.instructorProfiles, stats]);

  const getLectures = (name: string) =>
    summaries.filter((s) => s.ins === name).sort((a, b) => a.daysLeft - b.daysLeft);

  // 새 강사 추가 폼
  const [form, setForm] = useState({ name: "", contact: "", specialty: "", memo: "" });
  const addInstructor = () => {
    if (!form.name.trim()) return;
    dispatch({
      type: "ADD_INSTRUCTOR_PROFILE",
      profile: { id: uid(), name: form.name.trim(), contact: form.contact.trim(), specialty: form.specialty.trim(), platforms: [], profileImageUrl: "", memo: form.memo.trim(), status: "active", createdAt: new Date().toISOString() },
    });
    setForm({ name: "", contact: "", specialty: "", memo: "" });
    setShowAdd(false);
  };

  // 강사 표시 상태 (active 강의 있으면 활동중, 없으면 대기, out이면 OUT)
  const getDisplayStatus = (profile: InstructorProfile | null, s: InstructorStats) => {
    if (profile?.status === "out") return { label: "OUT", cls: "bg-neutral-200 text-neutral-500" };
    if (s.activeLectures > 0) return { label: "활동중", cls: "bg-green-50 text-green-600" };
    if (s.standbyLectures > 0) return { label: "대기", cls: "bg-amber-50 text-amber-600" };
    return { label: "대기", cls: "bg-neutral-100 text-neutral-400" };
  };

  const inputCls = "w-full bg-surface-hover border-none rounded-xl text-foreground px-3 py-[6px] text-sm outline-none focus:ring-1 focus:ring-primary";

  // 모달 데이터
  const modalData = useMemo(() => {
    if (!modalName) return null;
    return instructors.find((i) => i.stats.name === modalName) ?? null;
  }, [modalName, instructors]);

  return (
    <div className="min-h-[calc(100vh-100px)] bg-surface">
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">강사 관리</h2>
            <span className="text-[12px] text-muted-foreground">{instructors.length}명</span>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer text-white transition-opacity hover:opacity-90 bg-brand"
          >
            + 새 강사
          </button>
        </div>

        {/* 새 강사 추가 */}
        <div className={showAdd ? "block" : "hidden"}>
          <div className="bg-surface-card rounded-card shadow-card p-6 mb-6">
            <div className="text-[13px] font-bold mb-3">새 강사 추가</div>
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
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer bg-surface-hover text-muted-foreground hover:bg-accent">취소</button>
              <button onClick={addInstructor} disabled={!form.name.trim()} className="px-3 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer text-white disabled:opacity-40 bg-brand">추가</button>
            </div>
          </div>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-4 gap-5">
          {instructors.map(({ profile, stats: s }) => {
            const color = s.platforms.length > 0 ? (state.platformColors[s.platforms[0]] ?? "#667eea") : "#667eea";
            const initials = s.name.slice(0, 1);
            const isOut = profile?.status === "out";
            const displayStatus = getDisplayStatus(profile, s);

            return (
              <div
                key={`ins-${s.name}`}
                className={`bg-surface-card rounded-card shadow-card overflow-hidden cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all ${isOut ? "opacity-50" : ""}`}
                onClick={() => {
                  if (!profile) {
                    dispatch({ type: "ADD_INSTRUCTOR_PROFILE", profile: { id: uid(), name: s.name, contact: "", specialty: "", platforms: s.platforms, profileImageUrl: "", memo: "", status: "active", createdAt: new Date().toISOString() } });
                  }
                  setModalName(s.name);
                }}
              >
                <div className="px-4 pt-5 pb-4 flex flex-col items-center text-center relative">
                  {/* 상태 뱃지 */}
                  <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-pill ${displayStatus.cls}`}>
                    {displayStatus.label}
                  </span>

                  {/* 아바타 */}
                  <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-[22px] font-bold text-white mb-3"
                    style={{ background: profile?.profileImageUrl ? `url(${profile.profileImageUrl}) center/cover` : color }}
                  >
                    {!profile?.profileImageUrl && initials}
                  </div>

                  {/* 이름 + 플랫폼 */}
                  <div className="text-[14px] font-bold mb-0.5">{s.name}</div>
                  <div className={`flex gap-1 justify-center mb-1 ${s.platforms.length > 0 ? "visible" : "invisible"}`}>
                    {(s.platforms.length > 0 ? s.platforms : [""]).map((p) => (
                      <span key={p || "empty"} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: (state.platformColors[p] ?? "#667eea") + "20", color: state.platformColors[p] ?? "#667eea" }}>{p || "-"}</span>
                    ))}
                  </div>
                  <div className={`text-[11px] text-muted-foreground truncate w-full mb-1 ${profile?.specialty ? "visible" : "invisible"}`}>
                    {profile?.specialty || "-"}
                  </div>

                  {/* 통계 */}
                  <div className="flex gap-2 text-[11px] justify-center">
                    <span className="text-foreground font-bold">{s.totalLectures}개</span>
                    <span className="text-green-600">{s.activeLectures} 진행</span>
                    <span className={s.standbyLectures > 0 ? "text-amber-500" : "hidden"}>{s.standbyLectures} 대기</span>
                    <span className="text-muted-foreground">{s.completedLectures} 완료</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 강사 상세 모달 */}
      {modalData && (
        <InstructorModal
          profile={modalData.profile}
          stats={modalData.stats}
          lectures={getLectures(modalData.stats.name)}
          onClose={() => setModalName(null)}
        />
      )}
    </div>
  );
}

/* ── 강사 상세 모달 ── */
function InstructorModal({
  profile,
  stats: s,
  lectures,
  onClose,
}: {
  profile: InstructorProfile | null;
  stats: InstructorStats;
  lectures: ReturnType<typeof useLectureSummaries>;
  onClose: () => void;
}) {
  const { state, dispatch } = useCrm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", contact: "", specialty: "", memo: "" });
  const [editingLec, setEditingLec] = useState<string | null>(null);
  const [newLecName, setNewLecName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const color = s.platforms.length > 0 ? (state.platformColors[s.platforms[0]] ?? "#667eea") : "#667eea";
  const isOut = profile?.status === "out";

  const startEdit = () => {
    if (!profile) return;
    setEditForm({ name: profile.name, contact: profile.contact, specialty: profile.specialty, memo: profile.memo });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!profile || !editForm.name.trim()) return;
    if (editForm.name.trim() !== profile.name) {
      dispatch({ type: "RENAME_INSTRUCTOR", oldIns: profile.name, newIns: editForm.name.trim() });
    }
    dispatch({ type: "UPDATE_INSTRUCTOR_PROFILE", id: profile.id, updates: { name: editForm.name.trim(), contact: editForm.contact, specialty: editForm.specialty, memo: editForm.memo } });
    setEditing(false);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch({ type: "UPDATE_INSTRUCTOR_PROFILE", id: profile.id, updates: { profileImageUrl: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const saveLecName = (ins: string, oldLec: string) => {
    if (!newLecName.trim() || newLecName.trim() === oldLec) { setEditingLec(null); return; }
    dispatch({ type: "RENAME_LECTURE", ins, oldLec, newLec: newLecName.trim() });
    setEditingLec(null);
  };

  const inputCls = "w-full bg-surface-hover border-none rounded-xl text-foreground px-3 py-[6px] text-sm outline-none focus:ring-1 focus:ring-primary";

  const activeLecs = lectures.filter((l) => l.status === "active");
  const standbyLecs = lectures.filter((l) => l.status === "standby");
  const completedLecs = lectures.filter((l) => l.status === "completed");

  const statusBtnCls = "px-2 py-0.5 rounded-pill text-[9px] font-bold border-none cursor-pointer transition-colors";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" />
      <div
        className="relative bg-surface-card rounded-card shadow-dropdown w-[480px] max-h-[85vh] overflow-y-auto p-6 animate-fi"
        style={{ borderTop: `4px solid ${color}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground border-none cursor-pointer hover:bg-accent">
          ✕
        </button>

        {/* 프로필 헤더 */}
        <div className="flex items-start gap-4 mb-5 pr-8">
          {/* 아바타 + 이미지 업로드 */}
          <div className="relative flex-shrink-0">
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[26px] font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: profile?.profileImageUrl ? `url(${profile.profileImageUrl}) center/cover` : color }}
              onClick={() => fileRef.current?.click()}
            >
              {!profile?.profileImageUrl && s.name.slice(0, 1)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-card shadow-sm flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer border border-border/40 hover:bg-accent" onClick={() => fileRef.current?.click()}>
              📷
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[18px] font-bold truncate" style={{ color }}>{s.name}</span>
              {/* 상태 뱃지 */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${
                isOut ? "bg-neutral-200 text-neutral-500"
                  : s.activeLectures > 0 ? "bg-green-50 text-green-600"
                  : "bg-amber-50 text-amber-600"
              }`}>
                {isOut ? "OUT" : s.activeLectures > 0 ? "활동중" : "대기"}
              </span>
            </div>
            <div className="flex gap-1 mb-1">
              {s.platforms.map((p) => (
                <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: (state.platformColors[p] ?? "#667eea") + "20", color: state.platformColors[p] ?? "#667eea" }}>{p}</span>
              ))}
            </div>
            {profile?.specialty && <div className="text-[11px] text-muted-foreground">{profile.specialty}</div>}
          </div>
        </div>

        {/* 프로필 편집 */}
        <div className={editing ? "block" : "hidden"}>
          <div className="bg-surface-hover rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <div className="text-[11px] text-muted-foreground mb-1 font-semibold">이름</div>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1 font-semibold">연락처</div>
                <input value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} className={inputCls} />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1 font-semibold">전문분야</div>
                <input value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} className={inputCls} />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1 font-semibold">메모</div>
                <input value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1 rounded-xl text-[11px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent">취소</button>
              <button onClick={saveEdit} className="px-3 py-1 rounded-xl text-[11px] font-bold border-none cursor-pointer text-white bg-brand">저장</button>
            </div>
          </div>
        </div>

        {/* 프로필 정보 (비편집) */}
        <div className={editing ? "hidden" : "block"}>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={startEdit} className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border-none cursor-pointer bg-surface-hover text-muted-foreground hover:bg-accent">
              프로필 수정
            </button>
            {profile && (
              <button
                onClick={() => dispatch({ type: "SET_INSTRUCTOR_STATUS", id: profile.id, status: isOut ? "active" : "out" })}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border-none cursor-pointer transition-colors ${
                  isOut ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {isOut ? "활동으로 복구" : "OUT 처리"}
              </button>
            )}
          </div>

          {(profile?.contact || profile?.memo) && (
            <div className="flex flex-col gap-1 mb-4 text-[12px]">
              <div className={profile?.contact ? "flex gap-2" : "hidden"}>
                <span className="text-muted-foreground w-14 flex-shrink-0 font-semibold">연락처</span>
                <span className="font-medium">{profile?.contact}</span>
              </div>
              <div className={profile?.memo ? "flex gap-2" : "hidden"}>
                <span className="text-muted-foreground w-14 flex-shrink-0 font-semibold">메모</span>
                <span className="font-medium">{profile?.memo}</span>
              </div>
            </div>
          )}
        </div>

        {/* 진행중 강의 */}
        <LectureSection
          title="진행중"
          titleCls="text-green-600"
          lectures={activeLecs}
          editingLec={editingLec}
          newLecName={newLecName}
          onStartEdit={(lec) => { setEditingLec(lec); setNewLecName(lec); }}
          onChangeName={setNewLecName}
          onSaveName={saveLecName}
          onCancelEdit={() => setEditingLec(null)}
          statusBtnCls={statusBtnCls}
          dispatch={dispatch}
        />

        {/* 대기 강의 */}
        <LectureSection
          title="대기"
          titleCls="text-amber-500"
          lectures={standbyLecs}
          editingLec={editingLec}
          newLecName={newLecName}
          onStartEdit={(lec) => { setEditingLec(lec); setNewLecName(lec); }}
          onChangeName={setNewLecName}
          onSaveName={saveLecName}
          onCancelEdit={() => setEditingLec(null)}
          statusBtnCls={statusBtnCls}
          dispatch={dispatch}
        />

        {/* 완료 강의 */}
        <LectureSection
          title="완료"
          titleCls="text-muted-foreground"
          lectures={completedLecs}
          editingLec={editingLec}
          newLecName={newLecName}
          onStartEdit={(lec) => { setEditingLec(lec); setNewLecName(lec); }}
          onChangeName={setNewLecName}
          onSaveName={saveLecName}
          onCancelEdit={() => setEditingLec(null)}
          statusBtnCls={statusBtnCls}
          dispatch={dispatch}
        />

        {/* 하단: 삭제 */}
        {profile && (
          <div className="mt-4 pt-4 border-t border-border">
            {deleteConfirm ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-red-500 font-semibold text-center">프로필을 삭제하시겠습니까? 강의 데이터는 유지됩니다.</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => { dispatch({ type: "DELETE_INSTRUCTOR_PROFILE", id: profile.id }); onClose(); }}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >삭제 확인</button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                  >취소</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-2 rounded-xl text-[11px] font-semibold border-none cursor-pointer bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
              >프로필 삭제</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 강의 섹션 (모달 내부) ── */
function LectureSection({
  title,
  titleCls,
  lectures,
  editingLec,
  newLecName,
  onStartEdit,
  onChangeName,
  onSaveName,
  onCancelEdit,
  statusBtnCls,
  dispatch,
}: {
  title: string;
  titleCls: string;
  lectures: ReturnType<typeof useLectureSummaries>;
  editingLec: string | null;
  newLecName: string;
  onStartEdit: (lec: string) => void;
  onChangeName: (v: string) => void;
  onSaveName: (ins: string, oldLec: string) => void;
  onCancelEdit: () => void;
  statusBtnCls: string;
  dispatch: ReturnType<typeof useCrm>["dispatch"];
}) {
  if (lectures.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[12px] font-bold ${titleCls}`}>{title}</span>
        <span className="text-[11px] text-muted-foreground">{lectures.length}개</span>
      </div>
      <div className="flex flex-col gap-1">
        {lectures.map((lec) => {
          const dLabel = lec.daysLeft === 0 ? "D-Day" : lec.daysLeft > 0 ? `D-${lec.daysLeft}` : `D+${Math.abs(lec.daysLeft)}`;
          const isEditingThis = editingLec === lec.lec;

          return (
            <div key={lec.curKey} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover group">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lec.color }} />

              {/* 강의명 (편집 모드) */}
              <div className={isEditingThis ? "flex-1 flex gap-1" : "hidden"}>
                <input
                  value={newLecName}
                  onChange={(e) => onChangeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSaveName(lec.ins, lec.lec); if (e.key === "Escape") onCancelEdit(); }}
                  className="flex-1 bg-white border border-border/50 rounded-lg px-2 py-0.5 text-[11px] outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button onClick={() => onSaveName(lec.ins, lec.lec)} className="text-[10px] font-bold text-brand border-none bg-transparent cursor-pointer">저장</button>
              </div>

              {/* 강의명 (표시 모드) */}
              <span className={`font-semibold text-[11px] text-foreground flex-1 truncate ${isEditingThis ? "hidden" : "block"}`}>{lec.lec}</span>

              {/* 편집 버튼 */}
              <button
                onClick={() => onStartEdit(lec.lec)}
                className={`text-[10px] text-muted-foreground bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${isEditingThis ? "hidden" : "block"}`}
              >✏️</button>

              {/* 날짜 */}
              <span className={`text-[10px] text-muted-foreground flex-shrink-0 ${isEditingThis ? "hidden" : "block"}`}>
                {lec.liveDate ? fmtDateKr(lec.liveDate) : ""}
              </span>

              {/* D-day */}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-pill flex-shrink-0 ${isEditingThis ? "hidden" : "block"} ${
                lec.status === "completed" ? "bg-neutral-100 text-neutral-400"
                  : lec.status === "standby" ? "bg-amber-50 text-amber-500"
                  : lec.daysLeft <= 0 ? "bg-red-50 text-red-500"
                  : lec.daysLeft <= 10 ? "bg-amber-50 text-amber-600"
                  : "bg-neutral-100 text-neutral-500"
              }`}>
                {lec.status === "completed" ? "완료" : lec.status === "standby" ? "대기" : dLabel}
              </span>

              {/* 상태 변경 드롭다운 */}
              <div className={`flex gap-0.5 flex-shrink-0 ${isEditingThis ? "hidden" : "flex"}`}>
                <button
                  onClick={() => { if (lec.status !== "active") dispatch({ type: "REACTIVATE_LECTURE", ins: lec.ins, lec: lec.lec }); }}
                  className={`${statusBtnCls} ${lec.status === "active" ? "bg-green-100 text-green-600" : "bg-transparent text-neutral-300 hover:text-green-500"}`}
                  title="진행"
                >●</button>
                <button
                  onClick={() => { if (lec.status !== "standby") dispatch({ type: "SET_LECTURE_STANDBY", ins: lec.ins, lec: lec.lec }); }}
                  className={`${statusBtnCls} ${lec.status === "standby" ? "bg-amber-100 text-amber-500" : "bg-transparent text-neutral-300 hover:text-amber-500"}`}
                  title="대기"
                >●</button>
                <button
                  onClick={() => { if (lec.status !== "completed") dispatch({ type: "COMPLETE_LECTURE", ins: lec.ins, lec: lec.lec }); }}
                  className={`${statusBtnCls} ${lec.status === "completed" ? "bg-neutral-200 text-neutral-500" : "bg-transparent text-neutral-300 hover:text-neutral-500"}`}
                  title="완료"
                >●</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
