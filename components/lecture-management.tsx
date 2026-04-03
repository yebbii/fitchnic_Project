"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { useLectureSummaries, type LectureSummary } from "@/hooks/use-derived-data";
import { TONE_PRESETS, TARGET_PRESETS, TYPE_PRESETS, HOME_TAB_COLORS, BRAND_GRADIENT } from "@/lib/constants";
import { fmtDate, fmtDateKr, isSameDay } from "@/lib/utils";
import TagPicker from "./tag-picker";
import AddLectureDialog from "./add-lecture-dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";

function splitCohort(raw: string): { name: string; cohort: string } {
  const m = raw.match(/^(.*?)\s*(\d+기)\s*$/);
  if (m) return { name: m[1].trim(), cohort: m[2] };
  return { name: raw, cohort: "" };
}

function ProgressBar({ checked, total, color }: { checked: number; total: number; color: string }) {
  const pct = total ? (checked / total) * 100 : 0;
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function LectureManagement() {
  const { state, dispatch } = useCrm();
  const goToBoard = useGoToBoard();
  const goToDesignerTimeline = useGoToDesignerTimeline();
  const today = new Date();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [listMonth, setListMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailStep, setDetailStep] = useState<1 | 2>(1);
  const [detailLayout, setDetailLayout] = useState<"step" | "split">("step");
  const [draft, setDraft] = useState<{ ins: string; lecName: string; cohort: string; platform: string; liveDate: string; liveTime: string } | null>(null);
  const [contentDraft, setContentDraft] = useState<{ tone: string; target: string; type: string; ebook: string; story: string; usps: string[]; proof: string[]; freeUrl: string; youtubeUrl: string; payUrl: string; ebookUrl: string } | null>(null);
  const [listTab, setListTab] = useState<"active" | "completed">("active");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  const summaries = useLectureSummaries();
  // 현재와 가까운 순 정렬
  const allLectures = useMemo(() => {
    return [...summaries].sort((a, b) => a.daysLeft - b.daysLeft);
  }, [summaries]);

  const activeLectures = allLectures.filter((l) => l.status === "active");
  const completedLectures = allLectures.filter((l) => l.status === "completed");

  // 리스트 뷰 — 월 필터 + 플랫폼 필터 + 페이지네이션
  const listMonthStr = `${listMonth.getFullYear()}-${String(listMonth.getMonth() + 1).padStart(2, "0")}`;
  // 진행중: 월 필터 → 플랫폼 필터 / 완료: 전체
  const activeMonthFiltered = activeLectures.filter((l) => l.liveDate.startsWith(listMonthStr));
  const activeDisplayed = filterPlatform
    ? activeMonthFiltered.filter((l) => (l.platform || "기타") === filterPlatform)
    : activeMonthFiltered;
  const listSource = listTab === "active" ? activeDisplayed : completedLectures;
  const totalPages = Math.max(1, Math.ceil(listSource.length / pageSize));
  const pagedLectures = listTab === "active" ? activeDisplayed : listSource.slice((page - 1) * pageSize, page * pageSize);

  // 진행중 탭 플랫폼별 강의 수 (현재 월 기준)
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMonthFiltered.forEach((l) => {
      const p = l.platform || "기타";
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMonthStr, activeLectures]);

  // Calendar days
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  }, [calMonth]);

  // Calendar events: summaries에서 파생
  const calEvents = useMemo(() => {
    return summaries.filter((s) => s.liveDate).map((s) => ({
      date: s.liveDate, ins: s.ins, lec: s.lec, color: s.color, status: s.status, platform: s.platform,
    }));
  }, [summaries]);

  // ── 상세 페이지 ──
  if (detailKey) {
    const [ins, lec] = detailKey.split("|");
    const iD = state.data[ins];
    const ld = iD?.lectures[lec];
    if (!ld || !iD) return <div className="p-8 text-muted-foreground">강의를 찾을 수 없습니다.</div>;
    const curKey = detailKey;
    const summary = summaries.find((s) => s.curKey === curKey);
    const pmTotal = summary?.pmTotal ?? 0;
    const pmChecked = summary?.pmChecked ?? 0;
    const desTotal = summary?.desTotal ?? 0;
    const desChecked = summary?.desChecked ?? 0;
    const cardColor = summary?.color ?? "#667eea";
    const platforms = Object.keys(state.platformColors);

    // ── 강의 정보 드래프트 ──
    const d = draft ?? { ins, lecName: splitCohort(lec).name, cohort: splitCohort(lec).cohort, platform: ld.platform, liveDate: ld.liveDate, liveTime: ld.liveTime };
    const setD = (partial: Partial<typeof d>) => setDraft({ ...d, ...partial });
    const isDirty = draft !== null && (
      d.ins !== ins || (d.cohort ? `${d.lecName} ${d.cohort}` : d.lecName) !== lec ||
      d.platform !== ld.platform || d.liveDate !== ld.liveDate || d.liveTime !== ld.liveTime
    );
    const handleSave = () => {
      if (!draft) return;
      const newLec = d.cohort.trim() ? `${d.lecName.trim()} ${d.cohort.trim()}` : d.lecName.trim();
      if (!d.ins.trim() || !newLec) return;
      let currentIns = ins;
      if (d.ins.trim() !== ins) { dispatch({ type: "RENAME_INSTRUCTOR", oldIns: ins, newIns: d.ins.trim() }); currentIns = d.ins.trim(); }
      let currentLec = lec;
      if (newLec !== lec) { dispatch({ type: "RENAME_LECTURE", ins: currentIns, oldLec: lec, newLec }); currentLec = newLec; }
      if (d.platform !== ld.platform) dispatch({ type: "UPDATE_LECTURE_FIELD", ins: currentIns, lec: currentLec, field: "platform", value: d.platform });
      if (d.liveDate !== ld.liveDate) dispatch({ type: "UPDATE_LECTURE_FIELD", ins: currentIns, lec: currentLec, field: "liveDate", value: d.liveDate });
      if (d.liveTime !== ld.liveTime) dispatch({ type: "UPDATE_LECTURE_FIELD", ins: currentIns, lec: currentLec, field: "liveTime", value: d.liveTime });
      setDetailKey(`${currentIns}|${currentLec}`); setDraft(null);
    };

    // ── 콘텐츠 드래프트 ──
    const cd = contentDraft ?? { tone: ld.tone, target: ld.target, type: ld.type, ebook: ld.ebook, story: ld.story, usps: [...(ld.usps || [])], proof: [...(ld.proof || [])], freeUrl: ld.freeUrl, youtubeUrl: ld.youtubeUrl, payUrl: ld.payUrl, ebookUrl: ld.ebookUrl };
    const setCd = (partial: Partial<typeof cd>) => setContentDraft({ ...cd, ...partial });
    const isContentDirty = contentDraft !== null && (
      cd.tone !== ld.tone || cd.target !== ld.target || cd.type !== ld.type ||
      cd.ebook !== ld.ebook || cd.story !== ld.story ||
      cd.freeUrl !== ld.freeUrl || cd.youtubeUrl !== ld.youtubeUrl || cd.payUrl !== ld.payUrl || cd.ebookUrl !== ld.ebookUrl ||
      JSON.stringify(cd.usps) !== JSON.stringify(ld.usps || []) ||
      JSON.stringify(cd.proof) !== JSON.stringify(ld.proof || [])
    );
    const handleContentSave = () => {
      if (!contentDraft) return;
      const fields: [string, unknown][] = [
        ["tone", cd.tone], ["target", cd.target], ["type", cd.type],
        ["ebook", cd.ebook], ["story", cd.story],
        ["freeUrl", cd.freeUrl], ["youtubeUrl", cd.youtubeUrl], ["payUrl", cd.payUrl], ["ebookUrl", cd.ebookUrl],
        ["usps", cd.usps], ["proof", cd.proof],
      ];
      for (const [f, v] of fields) dispatch({ type: "UPDATE_LECTURE_FIELD", ins, lec, field: f, value: v });
      setContentDraft(null);
    };

    // 나가기
    const handleBack = () => { setDraft(null); setContentDraft(null); setDetailKey(null); setDetailStep(1); };

    // ── 공통 UI 조각 ──
    const labelCls = "text-sm text-muted-foreground mb-2 font-medium";
    const inputCls = "w-full bg-surface-hover border-none rounded-xl text-foreground px-4 py-[9px] text-sm outline-none focus:ring-2 focus:ring-primary/20";

    const MetaFields = () => (
      <div className="flex flex-col gap-4">
        <div>
          <div className={labelCls}>강사명</div>
          <input value={d.ins} onChange={(e) => setD({ ins: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelCls}>강의명</div>
            <input value={d.lecName} onChange={(e) => setD({ lecName: e.target.value })} placeholder="강의명" className={inputCls} />
          </div>
          <div>
            <div className={labelCls}>기수</div>
            <input value={d.cohort} onChange={(e) => setD({ cohort: e.target.value })} placeholder="예: 5기" className={inputCls} />
          </div>
        </div>
        <div>
          <div className={labelCls}>플랫폼</div>
          <div className="flex gap-1.5 flex-wrap">
            {platforms.map((p) => (
              <button key={p} onClick={() => setD({ platform: p })} className="px-4 py-[7px] rounded-xl text-sm font-medium border-[1.5px] cursor-pointer transition-all duration-150"
                style={{ background: d.platform === p ? (state.platformColors[p] ?? "#667eea") : undefined, color: d.platform === p ? "#fff" : (state.platformColors[p] ?? "#667eea"), borderColor: d.platform === p ? (state.platformColors[p] ?? "#667eea") : "var(--border)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelCls}>라이브 날짜</div>
            <input type="date" value={d.liveDate} onChange={(e) => setD({ liveDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <div className={labelCls}>라이브 시간</div>
            <input value={d.liveTime} onChange={(e) => setD({ liveTime: e.target.value })} className={inputCls} />
          </div>
        </div>
      </div>
    );

    const ContentFields = () => (
      <div className="flex flex-col gap-4">
        <TagPicker label="톤앤매너" options={TONE_PRESETS} value={cd.tone} onChange={(v) => setCd({ tone: v })} />
        <TagPicker label="타겟" options={TARGET_PRESETS} value={cd.target} onChange={(v) => setCd({ target: v })} />
        <TagPicker label="강의 유형" options={TYPE_PRESETS} value={cd.type} onChange={(v) => setCd({ type: v })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelCls}>전자책</div>
            <input value={cd.ebook} onChange={(e) => setCd({ ebook: e.target.value })} className={inputCls} />
          </div>
          <div>
            <div className={labelCls}>강사스토리</div>
            <input value={cd.story} onChange={(e) => setCd({ story: e.target.value })} className={inputCls} />
          </div>
        </div>
        {/* USP */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className={labelCls}>핵심 USP</div>
            <button onClick={() => setCd({ usps: [...cd.usps, ""] })} className="text-sm text-primary font-semibold px-3 py-1 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20">+ 추가</button>
          </div>
          {cd.usps.length === 0 && <div className="text-sm text-neutral-400">USP를 추가하세요</div>}
          {cd.usps.map((u, i) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <input value={u} onChange={(e) => { const arr = [...cd.usps]; arr[i] = e.target.value; setCd({ usps: arr }); }} placeholder={`USP ${i + 1}`} className={`flex-1 ${inputCls}`} />
              <button onClick={() => setCd({ usps: cd.usps.filter((_, j) => j !== i) })} className="w-9 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100">×</button>
            </div>
          ))}
        </div>
        {/* 성과증거 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className={labelCls}>성과증거</div>
            <button onClick={() => setCd({ proof: [...cd.proof, ""] })} className="text-sm text-primary font-semibold px-3 py-1 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20">+ 추가</button>
          </div>
          {cd.proof.length === 0 && <div className="text-sm text-neutral-400">성과증거를 추가하세요</div>}
          {cd.proof.map((p, i) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <input value={p} onChange={(e) => { const arr = [...cd.proof]; arr[i] = e.target.value; setCd({ proof: arr }); }} placeholder={`성과 ${i + 1}`} className={`flex-1 ${inputCls}`} />
              <button onClick={() => setCd({ proof: cd.proof.filter((_, j) => j !== i) })} className="w-9 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100">×</button>
            </div>
          ))}
        </div>
        {/* 링크 */}
        <div>
          <div className={labelCls}>링크 관리</div>
          <div className="grid grid-cols-1 gap-2">
            {([{ l: "무료 톡방", f: "freeUrl" as const }, { l: "유튜브 라이브", f: "youtubeUrl" as const }, { l: "결제 페이지", f: "payUrl" as const }, { l: "전자책 다운", f: "ebookUrl" as const }]).map(({ l, f }) => (
              <div key={f}>
                <div className={labelCls}>{l}</div>
                <input value={cd[f]} onChange={(e) => setCd({ [f]: e.target.value })} placeholder="https://" className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const ProgressSection = () => (
      <div className="bg-surface-card rounded-card shadow-card p-6">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">진행 상황</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-[12px] font-semibold mb-1.5">
              <span style={{ color: HOME_TAB_COLORS.pm }}>PM 진행률</span>
              <span className="text-muted-foreground">{pmChecked}/{pmTotal} ({pmTotal ? Math.round(pmChecked/pmTotal*100) : 0}%)</span>
            </div>
            <ProgressBar checked={pmChecked} total={pmTotal} color={HOME_TAB_COLORS.pm} />
          </div>
          <div>
            <div className="flex justify-between text-[12px] font-semibold mb-1.5">
              <span style={{ color: HOME_TAB_COLORS.designer }}>디자이너 진행률</span>
              <span className="text-muted-foreground">{desChecked}/{desTotal} ({desTotal ? Math.round(desChecked/desTotal*100) : 0}%)</span>
            </div>
            <ProgressBar checked={desChecked} total={desTotal} color={HOME_TAB_COLORS.designer} />
          </div>
        </div>
      </div>
    );

    const SaveButton = ({ dirty, onSave }: { dirty: boolean; onSave: () => void }) => (
      <button onClick={onSave} disabled={!dirty}
        className="w-full py-3 rounded-2xl text-[14px] font-bold border-none cursor-pointer text-white transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: HOME_TAB_COLORS.primary }}>
        {dirty ? "수정 완료" : "변경사항 없음"}
      </button>
    );

    return (
      <div className="min-h-[calc(100vh-64px)] bg-surface">
        {/* 헤더 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 px-8 py-4 flex items-center justify-between sticky top-[64px] z-10">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium border-none bg-transparent cursor-pointer px-0">← 강의 목록</button>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cardColor }} />
              <span className="font-bold text-[15px]">{ins}</span>
              <span className="text-muted-foreground text-[14px]">/</span>
              <span className="font-bold text-[15px]">{lec}</span>
            </div>
            {(isDirty || isContentDirty) && <span className="text-[11px] text-amber-500 font-semibold">● 수정됨</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* 레이아웃 토글 */}
            <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
              {([{ id: "step" as const, label: "스텝" }, { id: "split" as const, label: "2단" }]).map((v) => (
                <button key={v.id} onClick={() => setDetailLayout(v.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-none ${detailLayout === v.id ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
                  {v.label}
                </button>
              ))}
            </div>
            <button onClick={() => dispatch({ type: "UPDATE_LECTURE_FIELD", ins, lec, field: "status", value: ld.status === "active" ? "completed" : "active" })}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-colors ${ld.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-secondary text-muted-foreground hover:bg-accent"}`}>
              {ld.status === "active" ? "● 진행중" : "○ 완료"}
            </button>
            <button onClick={() => goToBoard(ins, lec)} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer text-white" style={{ background: cardColor }}>PM 보드</button>
            <button onClick={() => goToDesignerTimeline(ins, lec)} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer text-white" style={{ background: HOME_TAB_COLORS.designer }}>디자인</button>
            {deleteConfirmKey === detailKey ? (
              <>
                <button onClick={() => { dispatch({ type: "DELETE_LECTURE", ins, lec }); setDetailKey(null); setDeleteConfirmKey(null); setDraft(null); setContentDraft(null); }}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors">삭제 확인</button>
                <button onClick={() => setDeleteConfirmKey(null)}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors">취소</button>
              </>
            ) : (
              <button onClick={() => setDeleteConfirmKey(detailKey)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold border-none cursor-pointer bg-red-50 text-red-400 hover:bg-red-100 transition-colors">삭제</button>
            )}
          </div>
        </div>

        {/* ── 스텝 레이아웃 ── */}
        {detailLayout === "step" && (
          <div className="min-h-[calc(100vh-120px)]">
            {/* 스텝 탭 */}
            <div className="sticky top-[112px] z-[5] bg-surface px-8 py-2">
              <div className="max-w-[600px] mx-auto flex gap-1 bg-surface-hover rounded-xl p-1">
                {([{ id: 1 as const, label: "강의 정보" }, { id: 2 as const, label: "콘텐츠 정보" }]).map((s) => (
                  <button key={s.id} onClick={() => setDetailStep(s.id)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none ${detailStep === s.id ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
                    {s.label}
                    {s.id === 1 && isDirty && <span className="ml-1 text-amber-500">●</span>}
                    {s.id === 2 && isContentDirty && <span className="ml-1 text-amber-500">●</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-[600px] mx-auto px-8 py-8 flex flex-col gap-5">
              {detailStep === 1 && (
                <>
                  <MetaFields />
                  <SaveButton dirty={isDirty} onSave={handleSave} />
                  <ProgressSection />
                </>
              )}

              {detailStep === 2 && (
                <>
                  <ContentFields />
                  <SaveButton dirty={isContentDirty} onSave={handleContentSave} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 2단 레이아웃 ── */}
        {detailLayout === "split" && (
          <div className="min-h-[calc(100vh-120px)]">
            <div className="max-w-[1000px] mx-auto px-8 py-8 grid grid-cols-2 gap-12">
              {/* 왼쪽: 강의 정보 */}
              <div className="flex flex-col gap-5">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">강의 정보</div>
                <MetaFields />
                <SaveButton dirty={isDirty} onSave={handleSave} />
                <ProgressSection />
              </div>
              {/* 오른쪽: 콘텐츠 정보 */}
              <div className="flex flex-col gap-5 border-l border-border/50 pl-12">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">콘텐츠 정보</div>
                <ContentFields />
                <SaveButton dirty={isContentDirty} onSave={handleContentSave} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 리스트 / 달력 뷰 ──
  const LectureCard = ({ l }: { l: LectureSummary }) => {
    const { pmTotal, pmChecked, desTotal, desChecked, color: cardColor } = l;
    const curKey = `${l.ins}|${l.lec}`;
    const isDeleting = deleteConfirmKey === curKey;
    return (
      <div
        className="bg-surface-card rounded-card shadow-card p-5 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDetailKey(curKey)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cardColor }} />
              <span className="font-bold text-[13px]" style={{ color: cardColor }}>{l.ins}</span>
              {l.platform && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: cardColor + "20", color: cardColor }}>{l.platform}</span>
              )}
              {l.status === "active" ? (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">진행중</span>
              ) : (
                <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">완료</span>
              )}
            </div>
            <div className="text-[13px] font-bold text-foreground truncate">{l.lec}</div>
            {l.liveDate && (
              <div className="text-[11px] text-muted-foreground mt-0.5">{fmtDateKr(l.liveDate)} {l.liveTime}</div>
            )}
          </div>
          <div className="flex-shrink-0 flex items-start gap-2">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground mb-0.5">PM {pmChecked}/{pmTotal}</div>
              <div className="text-[10px] text-muted-foreground">디자인 {desChecked}/{desTotal}</div>
            </div>
            {isDeleting ? (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { dispatch({ type: "DELETE_LECTURE", ins: l.ins, lec: l.lec }); setDeleteConfirmKey(null); }}
                  className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  확인
                </button>
                <button
                  onClick={() => setDeleteConfirmKey(null)}
                  className="px-2 py-1 rounded-xl text-[10px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmKey(curKey); }}
                className="w-7 h-7 rounded-xl bg-red-50 text-red-400 border-none cursor-pointer text-[13px] hover:bg-red-100 transition-colors flex items-center justify-center flex-shrink-0"
                title="삭제"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-1">
          <ProgressBar checked={pmChecked} total={pmTotal} color={HOME_TAB_COLORS.pm} />
          <ProgressBar checked={desChecked} total={desTotal} color={HOME_TAB_COLORS.designer} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 px-8 py-4 flex items-center justify-between sticky top-[64px] z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">강의 관리</h2>
          <span className="text-[12px] text-muted-foreground">
            진행중 {activeLectures.length}개 · 완료 {completedLectures.length}개
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer text-white transition-opacity hover:opacity-90"
            style={{ background: BRAND_GRADIENT }}
          >
            + 새 강의
          </button>
          <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
            {([{ id: "list", label: "리스트" }, { id: "calendar", label: "달력" }] as const).map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-none ${
                  view === v.id ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAddDialog && <AddLectureDialog onClose={() => setShowAddDialog(false)} />}

      {/* 리스트 뷰 */}
      {view === "list" && (
        <div className="max-w-[900px] mx-auto px-8 py-8">
          {/* 컨트롤 행: 탭 | 월 네비(진행중) 또는 페이지크기(완료) */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* 진행중/완료 탭 */}
            <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
              {([{ id: "active", label: "진행중" }, { id: "completed", label: "완료" }] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setListTab(t.id); setPage(1); setFilterPlatform(null); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-none ${
                    listTab === t.id ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} {t.id === "active" ? activeLectures.length : completedLectures.length}
                </button>
              ))}
            </div>

            {/* 진행중: 플랫폼별 요약 + 월 네비게이션 */}
            {listTab === "active" && (
              <>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  {/* 총(전체) 버튼 */}
                  <button
                    onClick={() => { setFilterPlatform(null); setPage(1); }}
                    className={`px-2.5 py-1 rounded-xl font-semibold border-none cursor-pointer transition-colors ${
                      filterPlatform === null
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    총 <span className="font-bold">{activeMonthFiltered.length}개</span>
                  </button>
                  {Object.entries(platformCounts).map(([plat, cnt]) => {
                    const plColor = state.platformColors[plat];
                    const isActive = filterPlatform === plat;
                    return (
                      <button
                        key={plat}
                        onClick={() => { setFilterPlatform(isActive ? null : plat); setPage(1); }}
                        className="px-2.5 py-1 rounded-xl font-semibold border-none cursor-pointer transition-colors"
                        style={{
                          background: isActive ? (plColor ?? "#667eea") : (plColor ? plColor + "18" : undefined),
                          color: isActive ? "#fff" : (plColor ?? undefined),
                          ...(isActive ? {} : { backgroundColor: plColor ? plColor + "18" : "var(--secondary)" }),
                        }}
                      >
                        {plat} <span className="font-bold">{cnt}개</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => { setListMonth(new Date(listMonth.getFullYear(), listMonth.getMonth() - 1, 1)); setPage(1); }}
                    className="bg-surface-hover rounded-xl px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                  >◀</button>
                  <span className="text-[13px] font-bold min-w-[80px] text-center">
                    {listMonth.getFullYear()}년 {listMonth.getMonth() + 1}월
                  </span>
                  <button
                    onClick={() => { setListMonth(new Date(listMonth.getFullYear(), listMonth.getMonth() + 1, 1)); setPage(1); }}
                    className="bg-surface-hover rounded-xl px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                  >▶</button>
                </div>
              </>
            )}

            {/* 완료: 페이지 크기 드롭다운 */}
            {listTab === "completed" && (
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="ml-auto bg-surface-hover border-none rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
              </select>
            )}
          </div>

          {/* 강의 리스트 */}
          {pagedLectures.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {pagedLectures.map((l) => <LectureCard key={`${l.ins}|${l.lec}`} l={l} />)}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16 text-[14px]">
              {listTab === "active" ? `${listMonthStr}에 진행중인 강의가 없습니다` : "완료된 강의가 없습니다"}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-secondary border-none cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                    page === p ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-secondary border-none cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >▶</button>
            </div>
          )}
        </div>
      )}

      {/* 달력 뷰 */}
      {view === "calendar" && (
        <TooltipProvider delayDuration={200}>
        <div className="max-w-[900px] mx-auto px-8 py-8">
          <div className="bg-surface-card rounded-card shadow-card p-6">
            {/* 월 네비게이션 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
              </h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  className="bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >◀</button>
                <button
                  onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                >오늘</button>
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  className="bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent"
                >▶</button>
              </div>
            </div>
            {/* 요일 */}
            <div className="grid grid-cols-7 gap-0.5 mb-1.5">
              {["일","월","화","수","목","금","토"].map((d) => (
                <div key={d} className={`text-center text-sm font-bold p-2 ${d==="일"?"text-red-500":d==="토"?"text-blue-500":"text-muted-foreground"}`}>{d}</div>
              ))}
            </div>
            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="min-h-[110px]" />;
                const ds = fmtDate(day);
                const isT = isSameDay(day, today);
                const isPast = day < today && !isT;
                const dayEvts = calEvents.filter((e) => e.date === ds);
                return (
                  <div
                    key={ds}
                    className={`min-h-[110px] rounded-card p-1.5 overflow-hidden ${
                      isT ? "bg-primary/5 border border-primary"
                      : isPast ? "bg-surface-inset border border-border/30"
                      : "bg-surface-card border border-border/30"
                    }`}
                  >
                    <div className={`text-[14px] px-1 mb-1 ${
                      isT ? "font-bold text-primary"
                      : isPast ? "font-semibold text-neutral-300"
                      : day.getDay()===0 ? "font-semibold text-red-500"
                      : "font-semibold text-foreground"
                    }`}>{day.getDate()}</div>
                    <div className="flex flex-col gap-[3px]">
                      {dayEvts.map((ev, ei) => (
                        <Tooltip key={ei}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => setDetailKey(`${ev.ins}|${ev.lec}`)}
                              className="rounded-lg px-1.5 py-[3px] text-[10px] font-semibold cursor-pointer leading-tight truncate"
                              style={{ background: ev.color+"18", color: ev.color, border: `1.5px solid ${ev.color}35`, opacity: ev.status==="completed"?0.6:1 }}
                            >
                              <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-500 mr-0.5 align-middle flex-shrink-0" />{ev.ins}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="font-bold">{ev.ins} / {ev.lec}</div>
                            {ev.platform && <div className="text-muted-foreground text-[12px]">{ev.platform}</div>}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </TooltipProvider>
      )}
    </div>
  );
}
