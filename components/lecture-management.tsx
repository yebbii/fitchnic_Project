"use client";

import { useState, useMemo } from "react";
import { useCrm, useGoToBoard, useGoToDesignerTimeline } from "@/hooks/use-crm-store";
import { DEFAULT_SEQ, DEFAULT_DESIGN_SEQ, TONE_PRESETS, TARGET_PRESETS, TYPE_PRESETS } from "@/lib/constants";
import { fmtDate, fmtDateKr, addDays, isSameDay } from "@/lib/utils";
import TagPicker from "./tag-picker";

const DES_TOTAL = DEFAULT_DESIGN_SEQ.reduce((s, p) => s + p.items.length, 0);
const PM_DEFAULT_TOTAL = DEFAULT_SEQ.reduce((s, p) => s + p.items.length, 0);

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

  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [listMonth, setListMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [listTab, setListTab] = useState<"active" | "completed">("active");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  // 현재와 가까운 순 정렬
  const allLectures = useMemo(() => {
    const list: { ins: string; lec: string; liveDate: string; liveTime: string; platform: string; color: string; status: "active" | "completed"; type: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures).forEach(([lec, l]) => {
        list.push({ ins, lec, liveDate: l.liveDate, liveTime: l.liveTime, platform: l.platform, color: iD.color, status: l.status, type: l.type });
      });
    });
    return list.sort((a, b) => {
      const da = Math.abs(new Date(a.liveDate).getTime() - today.getTime());
      const db = Math.abs(new Date(b.liveDate).getTime() - today.getTime());
      return da - db;
    });
  }, [state.data]);

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

  // Calendar events: all lectures
  const calEvents = useMemo(() => {
    const ev: { date: string; ins: string; lec: string; color: string; status: string }[] = [];
    Object.entries(state.data).forEach(([ins, iD]) => {
      Object.entries(iD.lectures).forEach(([lec, l]) => {
        if (l.liveDate) ev.push({ date: l.liveDate, ins, lec, color: state.platformColors[l.platform] ?? iD.color, status: l.status });
      });
    });
    return ev;
  }, [state.data, state.platformColors]);

  // ── 상세 페이지 ──
  if (detailKey) {
    const [ins, lec] = detailKey.split("|");
    const iD = state.data[ins];
    const ld = iD?.lectures[lec];
    if (!ld || !iD) return <div className="p-8 text-muted-foreground">강의를 찾을 수 없습니다.</div>;
    const curKey = detailKey;
    const pmSeq = state.seqDataMap[curKey];
    const pmTotal = pmSeq ? pmSeq.reduce((s, p) => s + p.items.length, 0) : PM_DEFAULT_TOTAL;
    const pmChecked = Object.values(state.allChecks[curKey] || {}).filter(Boolean).length;
    const desChecked = Object.values(state.designChecks[curKey] || {}).filter(Boolean).length;
    const cardColor = state.platformColors[ld.platform] ?? iD.color;

    const upd = (field: string, value: unknown) =>
      dispatch({ type: "UPDATE_LECTURE_FIELD", ins, lec, field, value });
    const updArr = (field: "usps" | "proof", idx: number, val: string) => {
      const arr = [...(ld[field] || [])];
      arr[idx] = val;
      upd(field, arr);
    };

    return (
      <div className="min-h-[calc(100vh-60px)] bg-background">
        {/* 헤더 */}
        <div className="bg-white border-b border-border px-8 py-4 flex items-center justify-between sticky top-[60px] z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDetailKey(null)}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground font-semibold border-none bg-transparent cursor-pointer px-0"
            >
              ← 강의 목록
            </button>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cardColor }} />
              <span className="font-extrabold text-[15px]">{ins}</span>
              <span className="text-muted-foreground text-[14px]">/</span>
              <span className="font-bold text-[15px]">{lec}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch({ type: "UPDATE_LECTURE_FIELD", ins, lec, field: "status", value: ld.status === "active" ? "completed" : "active" })}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-none cursor-pointer transition-colors ${
                ld.status === "active"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              {ld.status === "active" ? "● 진행중" : "○ 완료"}
            </button>
            <button
              onClick={() => goToBoard(ins, lec)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer text-white"
              style={{ background: cardColor }}
            >
              PM 보드
            </button>
            <button
              onClick={() => goToDesignerTimeline(ins, lec)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer bg-[#764ba2] text-white"
            >
              디자인
            </button>
            {deleteConfirmKey === detailKey ? (
              <>
                <button
                  onClick={() => { dispatch({ type: "DELETE_LECTURE", ins, lec }); setDetailKey(null); setDeleteConfirmKey(null); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  삭제 확인
                </button>
                <button
                  onClick={() => setDeleteConfirmKey(null)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                onClick={() => setDeleteConfirmKey(detailKey)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
              >
                삭제
              </button>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="max-w-[900px] mx-auto px-8 py-6 grid grid-cols-2 gap-6">
          {/* 왼쪽: 기본 정보 */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide mb-3">기본 정보</div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { l: "라이브 날짜", f: "liveDate", type: "date" },
                  { l: "라이브 시간", f: "liveTime", type: "text" },
                  { l: "전자책", f: "ebook", type: "text" },
                  { l: "강사스토리", f: "story", type: "text" },
                ] as const).map(({ l, f, type }) => (
                  <div key={f}>
                    <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">{l}</div>
                    <input
                      type={type}
                      value={(ld[f] as string) || ""}
                      onChange={(e) => upd(f, e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <TagPicker label="톤앤매너" options={TONE_PRESETS} value={ld.tone} onChange={(v) => upd("tone", v)} />
                <TagPicker label="타겟" options={TARGET_PRESETS} value={ld.target} onChange={(v) => upd("target", v)} />
                <TagPicker label="강의 유형" options={TYPE_PRESETS} value={ld.type} onChange={(v) => upd("type", v)} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide mb-3">링크 관리</div>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { l: "무료 톡방", f: "freeUrl" },
                  { l: "유튜브 라이브", f: "youtubeUrl" },
                  { l: "결제 페이지", f: "payUrl" },
                  { l: "전자책 다운", f: "ebookUrl" },
                ] as const).map(({ l, f }) => (
                  <div key={f}>
                    <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">{l}</div>
                    <input
                      value={(ld[f] as string) || ""}
                      onChange={(e) => upd(f, e.target.value)}
                      placeholder="https://"
                      className="w-full bg-secondary border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 진행 상황 + USP + 성과 */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide mb-3">진행 상황</div>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1.5">
                    <span style={{ color: "#f97316" }}>PM 진행률</span>
                    <span className="text-muted-foreground">{pmChecked}/{pmTotal} ({pmTotal ? Math.round(pmChecked/pmTotal*100) : 0}%)</span>
                  </div>
                  <ProgressBar checked={pmChecked} total={pmTotal} color="#f97316" />
                </div>
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1.5">
                    <span style={{ color: "#764ba2" }}>디자이너 진행률</span>
                    <span className="text-muted-foreground">{desChecked}/{DES_TOTAL} ({DES_TOTAL ? Math.round(desChecked/DES_TOTAL*100) : 0}%)</span>
                  </div>
                  <ProgressBar checked={desChecked} total={DES_TOTAL} color="#764ba2" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">핵심 USP</div>
                <button
                  onClick={() => upd("usps", [...(ld.usps || []), ""])}
                  className="text-[11px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20"
                >+ 추가</button>
              </div>
              {(ld.usps || []).length === 0 && <div className="text-[12px] text-[#aeaeb2]">USP를 추가하세요</div>}
              {(ld.usps || []).map((u, i) => (
                <div key={i} className="flex gap-1 mb-1">
                  <input
                    value={u}
                    onChange={(e) => updArr("usps", i, e.target.value)}
                    placeholder={`USP ${i + 1}`}
                    className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => upd("usps", (ld.usps || []).filter((_, j) => j !== i))}
                    className="w-7 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100"
                  >×</button>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">성과증거</div>
                <button
                  onClick={() => upd("proof", [...(ld.proof || []), ""])}
                  className="text-[11px] text-primary font-semibold px-2 py-0.5 rounded-md bg-primary/10 border-none cursor-pointer hover:bg-primary/20"
                >+ 추가</button>
              </div>
              {(ld.proof || []).length === 0 && <div className="text-[12px] text-[#aeaeb2]">성과증거를 추가하세요</div>}
              {(ld.proof || []).map((p, i) => (
                <div key={i} className="flex gap-1 mb-1">
                  <input
                    value={p}
                    onChange={(e) => updArr("proof", i, e.target.value)}
                    placeholder={`성과 ${i + 1}`}
                    className="flex-1 bg-secondary border border-border rounded-lg text-foreground px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => upd("proof", (ld.proof || []).filter((_, j) => j !== i))}
                    className="w-7 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-base font-bold hover:bg-red-100"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 리스트 / 달력 뷰 ──
  const getLecStats = (ins: string, lec: string) => {
    const curKey = `${ins}|${lec}`;
    const pmSeq = state.seqDataMap[curKey];
    const pmTotal = pmSeq ? pmSeq.reduce((s, p) => s + p.items.length, 0) : PM_DEFAULT_TOTAL;
    const pmChecked = Object.values(state.allChecks[curKey] || {}).filter(Boolean).length;
    const desChecked = Object.values(state.designChecks[curKey] || {}).filter(Boolean).length;
    return { pmTotal, pmChecked, desChecked };
  };

  const LectureCard = ({ l }: { l: typeof allLectures[0] }) => {
    const { pmTotal, pmChecked, desChecked } = getLecStats(l.ins, l.lec);
    const cardColor = state.platformColors[l.platform] ?? l.color;
    const curKey = `${l.ins}|${l.lec}`;
    const isDeleting = deleteConfirmKey === curKey;
    return (
      <div
        className="bg-white rounded-xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
        style={{ borderLeft: `3px solid ${cardColor}` }}
        onClick={() => setDetailKey(curKey)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-extrabold text-[13px]" style={{ color: cardColor }}>{l.ins}</span>
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
              <div className="text-[10px] text-muted-foreground">디자인 {desChecked}/{DES_TOTAL}</div>
            </div>
            {isDeleting ? (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { dispatch({ type: "DELETE_LECTURE", ins: l.ins, lec: l.lec }); setDeleteConfirmKey(null); }}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold border-none cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  확인
                </button>
                <button
                  onClick={() => setDeleteConfirmKey(null)}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold border-none cursor-pointer bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmKey(curKey); }}
                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 border-none cursor-pointer text-[13px] hover:bg-red-100 transition-colors flex items-center justify-center flex-shrink-0"
                title="삭제"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-1">
          <ProgressBar checked={pmChecked} total={pmTotal} color="#f97316" />
          <ProgressBar checked={desChecked} total={DES_TOTAL} color="#764ba2" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-background">
      {/* 헤더 */}
      <div className="bg-white border-b border-border px-8 py-4 flex items-center justify-between sticky top-[60px] z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-extrabold">📚 강의 관리</h2>
          <span className="text-[12px] text-muted-foreground">
            진행중 {activeLectures.length}개 · 완료 {completedLectures.length}개
          </span>
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-[3px]">
          {([{ id: "list", label: "☰ 리스트" }, { id: "calendar", label: "📅 달력" }] as const).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer border-none ${
                view === v.id ? "bg-white text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 뷰 */}
      {view === "list" && (
        <div className="max-w-[900px] mx-auto px-8 py-6">
          {/* 컨트롤 행: 탭 | 월 네비(진행중) 또는 페이지크기(완료) */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* 진행중/완료 탭 */}
            <div className="flex gap-1 bg-secondary rounded-lg p-[3px]">
              {([{ id: "active", label: "진행중" }, { id: "completed", label: "완료" }] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setListTab(t.id); setPage(1); setFilterPlatform(null); }}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer border-none ${
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
                    className={`px-2.5 py-1 rounded-full font-semibold border-none cursor-pointer transition-colors ${
                      filterPlatform === null
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    총 <span className="font-extrabold">{activeMonthFiltered.length}개</span>
                  </button>
                  {Object.entries(platformCounts).map(([plat, cnt]) => {
                    const plColor = state.platformColors[plat];
                    const isActive = filterPlatform === plat;
                    return (
                      <button
                        key={plat}
                        onClick={() => { setFilterPlatform(isActive ? null : plat); setPage(1); }}
                        className="px-2.5 py-1 rounded-full font-semibold border-none cursor-pointer transition-colors"
                        style={{
                          background: isActive ? (plColor ?? "#667eea") : (plColor ? plColor + "18" : undefined),
                          color: isActive ? "#fff" : (plColor ?? undefined),
                          ...(isActive ? {} : { backgroundColor: plColor ? plColor + "18" : "var(--secondary)" }),
                        }}
                      >
                        {plat} <span className="font-extrabold">{cnt}개</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => { setListMonth(new Date(listMonth.getFullYear(), listMonth.getMonth() - 1, 1)); setPage(1); }}
                    className="bg-secondary rounded-lg px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                  >◀</button>
                  <span className="text-[13px] font-extrabold min-w-[80px] text-center">
                    {listMonth.getFullYear()}년 {listMonth.getMonth() + 1}월
                  </span>
                  <button
                    onClick={() => { setListMonth(new Date(listMonth.getFullYear(), listMonth.getMonth() + 1, 1)); setPage(1); }}
                    className="bg-secondary rounded-lg px-2.5 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                  >▶</button>
                </div>
              </>
            )}

            {/* 완료: 페이지 크기 드롭다운 */}
            {listTab === "completed" && (
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="ml-auto bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
              </select>
            )}
          </div>

          {/* 강의 리스트 */}
          {pagedLectures.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
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
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-secondary border-none cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                    page === p ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-secondary border-none cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >▶</button>
            </div>
          )}
        </div>
      )}

      {/* 달력 뷰 */}
      {view === "calendar" && (
        <div className="max-w-[900px] mx-auto px-8 py-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            {/* 월 네비게이션 */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[15px] font-extrabold">
                {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  className="bg-secondary rounded-lg px-3 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[13px]"
                >◀</button>
                <button
                  onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="bg-secondary rounded-lg px-3 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[12px]"
                >오늘</button>
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  className="bg-secondary rounded-lg px-3 py-1.5 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent text-[13px]"
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
                if (!day) return <div key={`e${i}`} className="min-h-[90px]" />;
                const ds = fmtDate(day);
                const isT = isSameDay(day, today);
                const isPast = day < today && !isT;
                const dayEvts = calEvents.filter((e) => e.date === ds);
                return (
                  <div
                    key={ds}
                    className={`min-h-[90px] rounded-[10px] p-1.5 ${
                      isT ? "bg-primary/5 border-[1.5px] border-primary"
                      : isPast ? "bg-[#fafafa] border-[1.5px] border-[#f0f0f0]"
                      : "bg-white border-[1.5px] border-[#f0f0f0]"
                    }`}
                  >
                    <div className={`text-[13px] px-1 mb-1 ${
                      isT ? "font-extrabold text-primary"
                      : isPast ? "font-semibold text-[#ccc]"
                      : day.getDay()===0 ? "font-semibold text-red-500"
                      : "font-semibold text-foreground"
                    }`}>{day.getDate()}</div>
                    <div className="flex flex-col gap-0.5">
                      {dayEvts.map((ev, ei) => (
                        <div
                          key={ei}
                          onClick={() => setDetailKey(`${ev.ins}|${ev.lec}`)}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer leading-tight"
                          style={{ background: ev.color+"22", color: ev.color, border: `1px solid ${ev.color}40`, opacity: ev.status==="completed"?0.6:1 }}
                        >
                          <span className="font-bold">{ev.ins}</span>
                          {ev.status==="active" && <span className="ml-0.5 text-[9px]">🔴LIVE</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
