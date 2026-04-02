"use client";

import { CrmProvider, useCrm } from "@/hooks/use-crm-store";
import DashboardTab from "@/components/dashboard-tab";
import BoardTab from "@/components/board-tab";
import HistoryTab from "@/components/history-tab";
import HomeTab from "@/components/home-tab";
import DesignerContainer from "@/components/designer-container";
import LectureManagement from "@/components/lecture-management";
import LectureDashboard from "@/components/lecture-dashboard";
import InstructorManagement from "@/components/instructor-management";
import { BRAND_GRADIENT } from "@/lib/constants";
import type { TopTabId, TabId, DesignerTabId, LectureSubTabId } from "@/lib/types";

const TOP_TABS: { id: TopTabId; label: string }[] = [
  { id: "home", label: "홈" },
  { id: "pm", label: "PM" },
  { id: "designer", label: "디자이너" },
  { id: "lecture", label: "강의 관리" },
];

const PM_SUB_TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "PM 캘린더" },
  { id: "board", label: "타임라인" },
  { id: "history", label: "히스토리" },
];

const DESIGNER_SUB_TABS: { id: DesignerTabId; label: string }[] = [
  { id: "calendar", label: "캘린더" },
  { id: "timeline", label: "타임라인" },
  { id: "worklog", label: "작업일지" },
];

const LECTURE_SUB_TABS: { id: LectureSubTabId; label: string }[] = [
  { id: "lec-dashboard", label: "대시보드" },
  { id: "lec-management", label: "강의 관리" },
  { id: "lec-instructor", label: "강사 관리" },
];

function NavHeader() {
  const { state, dispatch } = useCrm();

  return (
    <div className="bg-white border-b border-border/40 sticky top-0 z-[100]">
      {/* 상단 바 */}
      <div className="px-10 flex items-center justify-between h-14">
        <div className="flex items-center gap-5">
          {/* 로고 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] font-bold text-white" style={{ background: BRAND_GRADIENT }}>
              F
            </div>
            <span className="text-base font-semibold">핏크닉 프로젝트 관리</span>
          </div>

          {/* 최상위 탭 */}
          <div className="flex gap-0.5 bg-[#F0F1F4] rounded-xl p-1">
            {TOP_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({ type: "SET_TOP_TAB", tab: t.id })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                  state.topTab === t.id
                    ? "bg-white text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {state.feedbacks.length > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            피드백 {state.feedbacks.length}건
          </span>
        )}
      </div>

      {/* PM 서브탭 */}
      {state.topTab === "pm" && (
        <div className="px-10 pb-2.5 flex gap-1">
          {PM_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                dispatch({ type: "SET_TAB", tab: t.id });
                if (t.id === "board") { dispatch({ type: "SELECT_INSTRUCTOR", ins: "" }); }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
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
        <div className="px-10 pb-2.5 flex gap-1">
          {DESIGNER_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                dispatch({ type: "SET_DESIGNER_TAB", tab: t.id });
                if (t.id === "timeline") { dispatch({ type: "SELECT_DESIGNER_INSTRUCTOR", ins: "" }); }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                state.designerTab === t.id
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 강의 관리 서브탭 */}
      {state.topTab === "lecture" && (
        <div className="px-10 pb-2.5 flex gap-1">
          {LECTURE_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "SET_LECTURE_SUB_TAB", tab: t.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                state.lectureSubTab === t.id
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
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
    <div className="min-h-screen bg-[#F7F8FA] text-foreground">
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
      {state.topTab === "lecture" && (
        <>
          {state.lectureSubTab === "lec-dashboard" && <LectureDashboard />}
          {state.lectureSubTab === "lec-management" && <LectureManagement />}
          {state.lectureSubTab === "lec-instructor" && <InstructorManagement />}
        </>
      )}
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
