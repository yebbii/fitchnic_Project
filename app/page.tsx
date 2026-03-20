"use client";

import { CrmProvider, useCrm } from "@/hooks/use-crm-store";
import DashboardTab from "@/components/dashboard-tab";
import BoardTab from "@/components/board-tab";
import HistoryTab from "@/components/history-tab";
import HomeTab from "@/components/home-tab";
import DesignerContainer from "@/components/designer-container";
import LectureManagement from "@/components/lecture-management";
import { HOME_TAB_COLORS } from "@/lib/constants";
import type { TopTabId, TabId, DesignerTabId } from "@/lib/types";

const TOP_TABS: { id: TopTabId; label: string }[] = [
  { id: "home", label: "🏠 홈" },
  { id: "pm", label: "📊 PM" },
  { id: "designer", label: "🎨 디자이너" },
  { id: "lecture", label: "📚 강의 관리" },
];

const PM_SUB_TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "📊 PM 캘린더" },
  { id: "board", label: "📋 타임라인" },
  { id: "history", label: "📁 히스토리" },
];

const DESIGNER_SUB_TABS: { id: DesignerTabId; label: string }[] = [
  { id: "calendar", label: "📅 캘린더" },
  { id: "timeline", label: "✅ 타임라인" },
  { id: "worklog", label: "📝 작업일지" },
];

function NavHeader() {
  const { state, dispatch } = useCrm();

  return (
    <div className="bg-white border-b border-border sticky top-0 z-[100] shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      {/* 상단 바 */}
      <div className="px-7 flex items-center justify-between h-[60px]">
        <div className="flex items-center gap-5">
          {/* 로고 */}
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[15px] font-extrabold text-white" style={{ background: `linear-gradient(to bottom right, var(--color-primary), ${HOME_TAB_COLORS.designer})` }}>
              F
            </div>
            <span className="text-[17px] font-extrabold">핏크닉 프로젝트 관리</span>
          </div>

          {/* 최상위 탭 */}
          <div className="flex gap-0.5 bg-secondary rounded-[10px] p-[3px]">
            {TOP_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({ type: "SET_TOP_TAB", tab: t.id })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${
                  state.topTab === t.id
                    ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,.08)]"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {state.feedbacks.length > 0 && (
          <span className="text-[13px] text-[#f39c12] font-semibold">
            💬 피드백 {state.feedbacks.length}건
          </span>
        )}
      </div>

      {/* PM 서브탭 */}
      {state.topTab === "pm" && (
        <div className="px-7 pb-2 flex gap-1">
          {PM_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                dispatch({ type: "SET_TAB", tab: t.id });
                if (t.id === "board") { dispatch({ type: "SELECT_INSTRUCTOR", ins: "" }); }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none ${
                state.tab === t.id
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 디자이너 서브탭 */}
      {state.topTab === "designer" && (
        <div className="px-7 pb-2 flex gap-1">
          {DESIGNER_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                dispatch({ type: "SET_DESIGNER_TAB", tab: t.id });
                if (t.id === "timeline") { dispatch({ type: "SELECT_DESIGNER_INSTRUCTOR", ins: "" }); }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none ${
                state.designerTab === t.id
                  ? "text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              style={state.designerTab === t.id ? { background: HOME_TAB_COLORS.designer } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MainContent() {
  const { state } = useCrm();

  if (!state.hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-lg font-semibold">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader />
      {state.topTab === "home" && <HomeTab />}
      {state.topTab === "pm" && (
        <>
          {state.tab === "dashboard" && <DashboardTab />}
          {state.tab === "board" && <BoardTab />}
          {state.tab === "history" && <HistoryTab />}
        </>
      )}
      {state.topTab === "designer" && <DesignerContainer />}
      {state.topTab === "lecture" && <LectureManagement />}
    </div>
  );
}

export default function Page() {
  return (
    <CrmProvider>
      <MainContent />
    </CrmProvider>
  );
}
