"use client";

import { useState, useEffect } from "react";
import { useCrm, useDesignerCurKey, useToggleDesignerMilestone } from "@/hooks/use-crm-store";
import { DESIGNER_MILESTONES, DEFAULT_DESIGN_SEQ } from "@/lib/constants";
import { fmtDateKr, fmtDate, addDays } from "@/lib/utils";
import type { MilestoneId } from "@/lib/types";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-colors ${
        copied ? "bg-green-100 text-green-600" : "bg-secondary text-muted-foreground hover:bg-accent"
      }`}
    >
      {copied ? "✓ 복사됨" : label || "📋 복사"}
    </button>
  );
}

export default function DesignerTimelineTab() {
  const { state, dispatch } = useCrm();
  const curKey = useDesignerCurKey();
  const toggleMilestone = useToggleDesignerMilestone();
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);

  const ld = state.designerIns && state.designerLec ? state.data[state.designerIns]?.lectures?.[state.designerLec] : null;
  const milestones = curKey ? state.designerMilestones[curKey] || {} : {};
  const today = new Date();
  const todayStr = fmtDate(today);

  const checkedMilestones = DESIGNER_MILESTONES.filter((ms) => milestones[ms.id]?.checked).length;

  const goBack = () => {
    dispatch({ type: "SELECT_DESIGNER_INSTRUCTOR", ins: "" });
  };

  // ── 라이브 다음날(D+1) 이후 → 자동 완료 (1회만, 영구 저장) ──
  useEffect(() => {
    if (!curKey || !ld) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dayAfterLive = new Date(addDays(ld.liveDate, 1));
    dayAfterLive.setHours(0, 0, 0, 0);

    // 라이브 다음날이 아직 안 지났으면 아무것도 안 함
    if (now <= dayAfterLive) return;

    const meta = state.milestoneMeta[curKey] || {};

    DESIGNER_MILESTONES.forEach(ms => {
      const autoKey = `autoCompleted_${ms.id}`;
      // 이미 자동 완료 처리했거나 수동으로 해제 표시된 경우 스킵
      if (meta[autoKey] === "done" || meta[autoKey] === "dismissed") return;
      if (milestones[ms.id]?.checked) return; // 이미 체크되어 있으면 스킵
      dispatch({ type: "SET_DESIGNER_MILESTONE", curKey, milestoneId: ms.id as MilestoneId, checked: true });
      dispatch({ type: "SET_MILESTONE_META", curKey, field: autoKey, value: "done" });
    });

    const lsAutoKey = "autoCompleted_ls_master";
    if (meta.ls_masterDone !== "true" && meta[lsAutoKey] !== "done" && meta[lsAutoKey] !== "dismissed") {
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "true" });
      dispatch({ type: "SET_MILESTONE_META", curKey, field: lsAutoKey, value: "done" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curKey]);

  // ── 카드 선택 화면 ──
  if (!ld) {
    const todayStr2 = new Date().toISOString().slice(0, 10);
    const DES_TOTAL = DEFAULT_DESIGN_SEQ.reduce((s, p) => s + p.items.length, 0);
    const projects: { ins: string; lec: string; liveDate: string; liveTime: string; color: string; platform: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures)
        .filter(([, l]) => l.status === "active" && l.liveDate >= todayStr2)
        .forEach(([lec, l]) => {
          projects.push({ ins, lec, liveDate: l.liveDate, liveTime: l.liveTime, color: state.platformColors[l.platform] ?? iD.color, platform: l.platform || "" });
        });
    });
    projects.sort((a, b) => a.liveDate.localeCompare(b.liveDate));

    return (
      <div className="animate-fi px-7 py-6 max-w-[1100px] mx-auto">
        <h3 className="text-[17px] font-extrabold mb-4">🎨 진행중 강의 선택</h3>
        {projects.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 text-[14px]">진행중인 강의가 없습니다</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {projects.map((p) => {
              const key = `${p.ins}|${p.lec}`;
              const pmA = state.pmProjectAssignees[key] ?? "";
              const desA = state.designerProjectAssignees[key] ?? "";
              const desChecked = Object.values(state.designChecks[key] || {}).filter(Boolean).length;
              const desPct = DES_TOTAL ? Math.round((desChecked / DES_TOTAL) * 100) : 0;
              const diff = Math.ceil((new Date(p.liveDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div
                  key={key}
                  onClick={() => {
                    dispatch({ type: "SELECT_DESIGNER_INSTRUCTOR", ins: p.ins });
                    setTimeout(() => dispatch({ type: "SELECT_DESIGNER_LECTURE", lec: p.lec }), 0);
                  }}
                  className="bg-white rounded-xl border border-border p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                  style={{ borderTop: `3px solid ${p.color}` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-extrabold truncate" style={{ color: p.color }}>{p.ins}</span>
                    {diff <= 7 && diff >= 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${diff <= 1 ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        {diff === 0 ? "D-Day" : `D-${diff}`}
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
                      <span>디자인 진행률</span>
                      <span>{desChecked}/{DES_TOTAL}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0f0f5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${desPct}%`, background: "#764ba2" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── 상세 페이지 ──
  const cardColor = state.platformColors[ld.platform] ?? state.data[state.designerIns]?.color ?? "#764ba2";
  const pmA = state.pmProjectAssignees[curKey] ?? "";
  const desA = state.designerProjectAssignees[curKey] ?? "";

  // ── 라이브 세팅 ──
  const lsChecks = curKey ? state.designChecks[curKey] || {} : {};
  const lsMeta = curKey ? state.milestoneMeta[curKey] || {} : {};
  const setLsMeta = (field: string, value: string) => curKey && dispatch({ type: "SET_MILESTONE_META", curKey, field, value });
  const isFitchnic = ld.platform === "핏크닉";
  const lsCheckIds = ["ls_account", "ls_price", "ls_homepage", ...(isFitchnic ? ["ls_hpLink", "ls_banner"] : []), "ls_ebook", "ls_liveimg", "ls_salesppt", "ls_priceform"];
  const lsCheckedCount = lsCheckIds.filter((id) => !!lsChecks[id]).length;
  const lsTotalCount = lsCheckIds.length;
  const lsAllDone = lsCheckedCount === lsTotalCount && lsTotalCount > 0;
  // ── 하위 체크 상태 판별 (benefit 타입 특수 처리) ──
  const isSubChecked = (sub: { id: string; type?: string }) => {
    if (sub.type === "benefit") return (state.milestoneMeta[curKey]?.benefitDone === "true");
    return !!(state.designChecks[curKey]?.[sub.id]);
  };

  // ── 마일스톤 상위 토글 (공용 훅 사용) ──
  const toggleMilestoneParent = (ms: typeof DESIGNER_MILESTONES[number]) => {
    if (!curKey) return;
    toggleMilestone(curKey, ms);
  };

  // ── 마일스톤 하위 토글 (하위 → 상위) ──
  const toggleMilestoneChild = (ms: typeof DESIGNER_MILESTONES[number], sub: { id: string; type?: string }) => {
    if (!curKey) return;
    const newChecked = !isSubChecked(sub);
    if (sub.type === "benefit") dispatch({ type: "SET_MILESTONE_META", curKey, field: "benefitDone", value: newChecked ? "true" : "" });
    else dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: sub.id, checked: newChecked });

    const subs = ms.subItems || [];
    const allCheckedAfter = subs.every(s => s.id === sub.id ? newChecked : isSubChecked(s));
    if (allCheckedAfter) {
      dispatch({ type: "SET_DESIGNER_MILESTONE", curKey, milestoneId: ms.id as MilestoneId, checked: true });
    } else if (milestones[ms.id]?.checked) {
      dispatch({ type: "SET_DESIGNER_MILESTONE", curKey, milestoneId: ms.id as MilestoneId, checked: false });
    }
  };

  // ── 라이브 세팅 부모-자식 관계 ──
  const lsChildrenMap: Record<string, string[]> = {
    ls_homepage: isFitchnic ? ["ls_hpLink", "ls_banner"] : [],
  };
  const lsParentOf: Record<string, string> = {};
  Object.entries(lsChildrenMap).forEach(([p, children]) => {
    children.forEach(c => { lsParentOf[c] = p; });
  });

  // ── 라이브 세팅 개별 토글 (부모↔자식 + 마스터 연동) ──
  const toggleLs = (id: string) => {
    if (!curKey) return;
    const newChecked = !lsChecks[id];
    const changes: Record<string, boolean> = { [id]: newChecked };

    // 상위 → 하위: 부모 체크 시 자식 전부 체크, 해제 시 스냅샷 복원
    const children = lsChildrenMap[id] || [];
    if (children.length > 0) {
      if (newChecked) {
        const snapshot: Record<string, boolean> = {};
        children.forEach(c => { snapshot[c] = !!lsChecks[c]; });
        dispatch({ type: "SET_MILESTONE_META", curKey, field: `snapshot_ls_${id}`, value: JSON.stringify(snapshot) });
        children.forEach(c => { changes[c] = true; });
      } else {
        const raw = state.milestoneMeta[curKey]?.[`snapshot_ls_${id}`];
        const snapshot: Record<string, boolean> = raw ? JSON.parse(raw) : {};
        children.forEach(c => { changes[c] = snapshot[c] ?? false; });
      }
    }

    // 하위 → 상위: 자식 전부 완료 시 부모 자동 완료
    const parentId = lsParentOf[id];
    if (parentId) {
      const siblings = lsChildrenMap[parentId] || [];
      const allSiblingsAfter = siblings.every(s => changes[s] !== undefined ? changes[s] : !!lsChecks[s]);
      if (allSiblingsAfter && !lsChecks[parentId]) {
        changes[parentId] = true;
      } else if (!allSiblingsAfter && !!lsChecks[parentId]) {
        changes[parentId] = false;
      }
    }

    // 변경 적용
    Object.entries(changes).forEach(([itemId, checked]) => {
      dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId, checked });
    });

    // 마스터 연동
    const allAfter = lsCheckIds.every(cid => changes[cid] !== undefined ? changes[cid] : !!lsChecks[cid]);
    if (allAfter) {
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "true" });
    } else if (lsMeta.ls_masterDone === "true") {
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "" });
    }
  };

  // ── 라이브 세팅 마스터 토글 (상위 → 하위) ──
  const toggleLsMaster = () => {
    if (!curKey) return;
    const masterOn = lsMeta.ls_masterDone === "true";
    if (!masterOn) {
      const snapshot: Record<string, boolean> = {};
      lsCheckIds.forEach(id => { snapshot[id] = !!lsChecks[id]; });
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "snapshot_ls", value: JSON.stringify(snapshot) });
      lsCheckIds.forEach(id => dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: id, checked: true }));
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "true" });
    } else {
      const raw = state.milestoneMeta[curKey]?.snapshot_ls;
      const snapshot: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      lsCheckIds.forEach(id => dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: id, checked: snapshot[id] ?? false }));
      dispatch({ type: "SET_MILESTONE_META", curKey, field: "ls_masterDone", value: "" });
      // 자동 완료 후 수동 해제 시 → dismissed 표시하여 재자동완료 방지
      const lsAutoKey = "autoCompleted_ls_master";
      if (lsMeta[lsAutoKey] === "done") {
        dispatch({ type: "SET_MILESTONE_META", curKey, field: lsAutoKey, value: "dismissed" });
      }
    }
  };


  const ebookLink = lsMeta.ls_ebookLink || ld.ebookUrl || "";
  const ebookPw = lsMeta.ls_ebookPw || "";
  const ebookReady = !!(ebookLink && ebookPw);
  const ebookTemplate = `${ebookLink}\n✅ 전자책 다운로드 (비밀번호: ${ebookPw})\n금일 전자책입니다 :)`;
  const priceExample = `${state.designerLec}\n\n5기\nform: NNNN\n결제: NNN\n금액 : NNN만 원`;

  const resetLiveSetup = () => {
    lsCheckIds.forEach((id) => curKey && dispatch({ type: "SET_DESIGN_CHECK", lectureKey: curKey, itemId: id, checked: false }));
    ["ls_ebookLink", "ls_ebookPw"].forEach((f) => setLsMeta(f, ""));
  };

  const renderLsCheck = (id: string, label: string, icon: string, sub?: boolean) => {
    const checked = !!lsChecks[id];
    return (
      <div
        key={id}
        onClick={() => toggleLs(id)}
        className={`flex items-center gap-2 ${sub ? "p-1.5 ml-7" : "p-2"} rounded-lg cursor-pointer transition-all hover:bg-secondary`}
        style={{ background: checked ? "#f5f5f5" : "transparent" }}
      >
        <div
          className={`${sub ? "w-4 h-4" : "w-5 h-5"} rounded flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0`}
          style={{ border: checked ? "none" : "2px solid #d2d2d7", background: checked ? "#9ca3af" : "#fff" }}
        >
          {checked && "✓"}
        </div>
        <span className={sub ? "text-sm" : "text-base"} style={{ opacity: checked ? 0.4 : 1 }}>{icon}</span>
        <span
          className={`${sub ? "text-[12px]" : "text-[13px]"} font-medium`}
          style={{ color: checked ? "#9ca3af" : "#1c1c1e", textDecoration: checked ? "line-through" : "none" }}
        >
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="animate-fi min-h-[calc(100vh-100px)]">
      {/* 백버튼 바 */}
      <div className="bg-white border-b border-border px-7 py-2">
        <button
          onClick={goBack}
          className="text-[13px] text-muted-foreground hover:text-foreground font-semibold border-none bg-transparent cursor-pointer px-0"
        >
          ← 강의 목록
        </button>
      </div>

      {/* 본문 */}
      <div className="px-7 py-5 pb-[120px] max-w-[1000px] mx-auto">
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 350px" }}>
          {/* 좌측: 강의 정보 + 마일스톤 */}
          <div>
            {/* 강의 정보 헤더 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: cardColor }} />
                <span className="text-[18px] font-extrabold" style={{ color: cardColor }}>{state.designerIns}</span>
                <span className="text-[16px] text-muted-foreground">/</span>
                <span className="text-[18px] font-bold">{state.designerLec}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[13px] text-muted-foreground">📅 {fmtDateKr(ld.liveDate)} {ld.liveTime}</span>
                {desA ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: "#764ba215", color: "#764ba2", border: "1px solid #764ba230" }}>
                    <span className="w-4 h-4 rounded-full bg-[#764ba2] text-white text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">{desA.slice(0, 1)}</span>
                    담당 {desA}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] text-[#aeaeb2] bg-secondary border border-border">
                    <span className="text-[11px]">👤</span> 담당 미지정
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${
                  checkedMilestones === DESIGNER_MILESTONES.length
                    ? "bg-gray-100 text-gray-500 border border-gray-300"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  {checkedMilestones}/{DESIGNER_MILESTONES.length} 완료
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[...DESIGNER_MILESTONES].sort((a, b) => {
                const aChecked = milestones[a.id]?.checked ? 1 : 0;
                const bChecked = milestones[b.id]?.checked ? 1 : 0;
                return aChecked - bChecked;
              }).map((ms, i) => {
                const msDate = fmtDate(addDays(ld.liveDate, ms.dayOffset));
                const item = milestones[ms.id] || { checked: false, assignee: "" };
                const isPast = msDate < todayStr;
                const isEditingThis = editingAssignee === ms.id;

                return (
                  <div
                    key={ms.id}
                    className={`rounded-2xl border-2 p-5 transition-colors ${
                      item.checked
                        ? "bg-gray-50 border-gray-200"
                        : isPast
                        ? "bg-red-50 border-red-100"
                        : "bg-white border-border"
                    }`}
                    style={{ animation: `fi .3s ease ${i * 0.05}s both` }}
                  >
                    <div className="flex items-start gap-4">
                      {/* 체크박스 */}
                      <button
                        onClick={() => toggleMilestoneParent(ms)}
                        className="w-8 h-8 mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center text-[15px] font-extrabold text-white cursor-pointer border-none transition-colors"
                        style={{
                          background: item.checked ? "#9ca3af" : "transparent",
                          border: `2px solid ${item.checked ? "#9ca3af" : ms.color}`,
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
                            style={{ background: item.checked ? "#f3f4f6" : ms.color + "20", color: item.checked ? "#9ca3af" : ms.color }}
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

                        {/* 세부 체크 항목 */}
                        {ms.subItems && ms.subItems.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-2">
                            {ms.subItems.map((sub) => {
                              const subChecked = !!(state.designChecks[curKey]?.[sub.id]);
                              const meta = state.milestoneMeta[curKey] || {};

                              // 자료요청 복사 타입
                              if (sub.type === "copy") {
                                const driveLink = meta.driveLink || "";
                                const figmaLink = meta.figmaLink || "";
                                const assigneeName = state.designerProjectAssignees[curKey] || "담당자";
                                const d9Date = fmtDate(addDays(ld.liveDate, -9));
                                const reqMsg = `[자료요청]\n안녕하세요 대표님 핏크닉 ${assigneeName}입니다\n${ld.liveDate} 예정된 강의 상세페이지 리뉴얼과 관련해 연락 드립니다\n\n아래 정보들 ${d9Date}까지 전달 주시면, 상세페이지에 활용하겠습니다!\n\n자료는 아래 링크로 업로드 부탁 드립니다 :)\n${driveLink || "[드라이브 링크]"}\n\n1. 최신 수익\n2. 수강생 수익 인증, 카톡 대화\n\n수강생 사례 전달 시 구체적인 정보 함께 전달 부탁 드립니다.\nEX) 40대 직장인, 5억 저렴하게 건물 매수!\n\n추가로\n지난 기수 상세페이지 링크 첨부드립니다 확인해보시고\n\n이번기수에\n1. 수강생 혜택 변동 있는지\n2. 커리큘럼 변동 있는지\n3. 강의 소구점 변동 또는 수정 원하시는 부분 있는지\n알려주시면 반영하도록 하겠습니다\n\n감사합니다! 좋은 하루 보내세요!\n\n${figmaLink || "[피그마 링크]"}`;
                                return (
                                  <div key={sub.id} className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleMilestoneChild(ms, sub)}
                                        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer border-none"
                                        style={{ border: subChecked ? "none" : "2px solid #d2d2d7", background: subChecked ? "#9ca3af" : "#fff" }}
                                      >{subChecked && "✓"}</button>
                                      <span className={`text-[13px] font-medium ${subChecked ? "line-through text-muted-foreground" : ""}`}>{sub.name}</span>
                                      <CopyButton text={reqMsg} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 mt-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground w-[75px] flex-shrink-0">드라이브 링크</span>
                                        <input
                                          value={driveLink}
                                          onChange={(e) => curKey && dispatch({ type: "SET_MILESTONE_META", curKey, field: "driveLink", value: e.target.value })}
                                          placeholder="구글 드라이브 링크 입력"
                                          className="flex-1 text-[11px] bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground w-[75px] flex-shrink-0">피그마 링크</span>
                                        <input
                                          value={figmaLink}
                                          onChange={(e) => curKey && dispatch({ type: "SET_MILESTONE_META", curKey, field: "figmaLink", value: e.target.value })}
                                          placeholder="피그마 링크 입력"
                                          className="flex-1 text-[11px] bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                                        />
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground bg-secondary rounded-lg px-2.5 py-2 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto">
                                      {reqMsg}
                                    </div>
                                  </div>
                                );
                              }

                              // 혜택 전달 타입
                              if (sub.type === "benefit") {
                                const benefitText = meta.benefit || "";
                                const benefitDone = meta.benefitDone === "true";
                                return (
                                  <div key={sub.id} className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleMilestoneChild(ms, sub)}
                                        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer border-none"
                                        style={{ border: benefitDone ? "none" : "2px solid #d2d2d7", background: benefitDone ? "#9ca3af" : "#fff" }}
                                      >{benefitDone && "✓"}</button>
                                      <span className={`text-[13px] font-medium ${benefitDone ? "line-through text-muted-foreground" : ""}`}>{sub.name}</span>
                                      {benefitText && <CopyButton text={benefitText} />}
                                    </div>
                                    {benefitText ? (
                                      <div className="bg-secondary rounded-lg px-3 py-2 text-[12px] text-foreground whitespace-pre-wrap">
                                        {benefitText}
                                      </div>
                                    ) : (
                                      <div className="bg-amber-50 rounded-lg px-3 py-2 text-[12px] text-amber-600 font-medium">
                                        ⏳ PM이 혜택 내용을 아직 입력하지 않았습니다
                                      </div>
                                    )}
                                    {!benefitDone && benefitText && (
                                      <div className="text-[11px] text-muted-foreground">PM이 전달 완료 체크하면 자동 반영됩니다</div>
                                    )}
                                  </div>
                                );
                              }

                              // 기본 체크 타입
                              return (
                                <div key={sub.id} className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleMilestoneChild(ms, sub)}
                                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer border-none"
                                    style={{ border: subChecked ? "none" : "2px solid #d2d2d7", background: subChecked ? "#9ca3af" : "#fff" }}
                                  >{subChecked && "✓"}</button>
                                  <span className={`text-[13px] font-medium ${subChecked ? "line-through text-muted-foreground" : ""}`}>{sub.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 라이브 세팅 체크리스트 (강의별 독립) */}
          <div>
            <div className="bg-white rounded-2xl border border-border p-5 sticky top-[80px] max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 cursor-pointer" onClick={toggleLsMaster}>
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0"
                    style={{ border: lsAllDone ? "none" : "2px solid #d2d2d7", background: lsAllDone ? "#9ca3af" : "#fff" }}
                  >
                    {lsAllDone && "✓"}
                  </div>
                  <h3 className="text-[15px] font-extrabold">🎥 라이브 세팅 체크</h3>
                </div>
                <span className={`text-[13px] font-semibold ${lsAllDone ? "text-gray-400" : "text-muted-foreground"}`}>
                  {lsCheckedCount}/{lsTotalCount}
                </span>
              </div>

              {lsAllDone && (
                <div className="mb-3 text-center text-gray-500 font-bold text-[13px] bg-gray-100 rounded-lg py-2">
                  라이브 세팅 완료
                </div>
              )}

              <div className="flex flex-col gap-1">
                {/* 1. 계좌 확인 */}
                {renderLsCheck("ls_account", "계좌 확인", "🏦")}
                <div className="ml-7 flex flex-col gap-1 mb-1">
                  {isFitchnic ? (
                    <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] bg-blue-50 border border-blue-200 font-bold text-blue-700">
                      <span>핏크닉: 신한 140-015-117907 (주)핏크닉</span>
                      <CopyButton text="신한 140-015-117907 (주)핏크닉" label="복사" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] bg-green-50 border border-green-200 font-bold text-green-700">
                      <span>머니업: 신한 140-015-506659 (주)핏크닉</span>
                      <CopyButton text="신한 140-015-506659 (주)핏크닉" label="복사" />
                    </div>
                  )}
                </div>

                {/* 2. 가격 확인 */}
                {renderLsCheck("ls_price", "가격 확인", "💰")}

                {/* 3. 홈페이지 링크 */}
                {renderLsCheck("ls_homepage", "홈페이지 링크", "🔗")}
                {isFitchnic && (
                  <>
                    {renderLsCheck("ls_hpLink", "링크", "🔗", true)}
                    {renderLsCheck("ls_banner", "우측 배너 세팅", "🖼️", true)}
                  </>
                )}

                {/* 4. 전자책 + 문구 */}
                {renderLsCheck("ls_ebook", "전자책 + 문구", "📚")}
                <div className="ml-7 flex flex-col gap-1.5 mb-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">전자책 링크 {ld.ebookUrl && !lsMeta.ls_ebookLink ? "(PM 자동반영)" : ""}</span>
                    <input
                      value={ebookLink}
                      onChange={(e) => setLsMeta("ls_ebookLink", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="전자책 링크"
                      className="w-full text-[11px] bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">비밀번호</span>
                    <input
                      value={ebookPw}
                      onChange={(e) => setLsMeta("ls_ebookPw", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="비밀번호 입력"
                      className="w-full text-[11px] bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {ebookReady ? (
                    <CopyButton text={ebookTemplate} label="📋 문구 복사" />
                  ) : (
                    <button
                      disabled
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border-none bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      📋 문구 복사 {!ebookLink && !ebookPw ? "(링크·비밀번호 입력 필요)" : !ebookLink ? "(링크 입력 필요)" : "(비밀번호 입력 필요)"}
                    </button>
                  )}
                  <div className="text-[10px] text-muted-foreground bg-amber-50 rounded-lg px-2.5 py-1.5">
                    💡 <a href="https://qr.naver.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">네이버 큐알링크</a>로 변환 후 사용하세요
                  </div>
                </div>

                {/* 5. 라이브 이미지 첨부 확인 */}
                {renderLsCheck("ls_liveimg", "라이브 이미지 첨부 확인", "🖼️")}

                {/* 6. 세일즈 PPT 확인 */}
                {renderLsCheck("ls_salesppt", "세일즈 PPT 확인", "📊")}

                {/* 7. 가격 확인 */}
                {renderLsCheck("ls_priceform", "가격 확인", "💳")}
                <div className="ml-7 flex flex-col gap-1.5 mb-1">
                  <CopyButton text={priceExample} label="📋 예시 복사" />
                </div>
              </div>

              {/* 전체 초기화 */}
              <button
                onClick={resetLiveSetup}
                className="mt-4 w-full text-[12px] text-muted-foreground font-semibold py-1.5 rounded-lg bg-secondary border-none cursor-pointer hover:bg-accent transition-colors"
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
