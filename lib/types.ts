/* ── 핏크닉 CRM 자동화 — 전체 타입 정의 ── */

export interface Lecture {
  type: string;
  tone: string;
  platform: string;
  usps: string[];
  proof: string[];
  target: string;
  story: string;
  ebook: string;
  freeUrl: string;
  youtubeUrl: string;
  payUrl: string;
  ebookUrl: string;
  figmaUrl: string;
  liveDate: string;
  liveTime: string;
  status: "active" | "standby" | "completed";
}

export interface InstructorData {
  lectures: Record<string, Lecture>;
}

export type CrmData = Record<string, InstructorData>;

export interface SeqItem {
  id: string;
  ch: string;
  name: string;
  icon: string;
  color: string;
}

export interface SeqPhase {
  id: string;
  label: string;
  dayOffset: number;
  items: SeqItem[];
}

export interface CopyData {
  text: string;
  edited: string;
  status: "ai" | "edited";
}

export type ChecksMap = Record<string, Record<string, boolean>>;
export type CopiesMap = Record<string, Record<string, CopyData>>;
export type SeqDataMap = Record<string, SeqPhase[]>;

export interface Feedback {
  id: number;
  curKey: string;
  itemId: string;
  text: string;
  createdAt: string;
}

export interface CalendarEvent {
  date: string;
  ins: string;
  lec: string;
  seqId: string;
  seqLabel: string;
  items: SeqItem[];
  color: string;
  isLiveDay: boolean;
  checkedCount: number;
  copiedCount: number;
  allDone: boolean;
  allCopied: boolean;
}

export interface NewLectureForm {
  instructor: string;
  lectureName: string;
  liveDate: string;
}

export type TabId = "dashboard" | "board" | "history";

/* ── 최상위 탭 ── */
export type TopTabId = "home" | "pm" | "designer" | "lecture";
export type DesignerTabId = "calendar" | "timeline" | "worklog";
export type LectureSubTabId = "lec-dashboard" | "lec-management" | "lec-instructor";
export type HomeCalendarView = "all" | "pm" | "designer";

/* ── 강사 프로필 ── */
export interface InstructorProfile {
  id: string;
  name: string;
  contact: string;
  specialty: string;
  platforms: string[];
  profileImageUrl: string;
  memo: string;
  status: "active" | "out";
  createdAt: string;
}

/* ── 디자이너 체크리스트 ── */
export interface DesignCheckItem {
  id: string;
  phaseId: string;
  name: string;
  icon: string;
  category: "design" | "live";
}

export interface DesignSeqPhase {
  id: string;
  label: string;
  dayOffset: number;
  items: DesignCheckItem[];
}

export type DesignChecksMap = Record<string, Record<string, boolean>>;

/* ── 디자이너 프로젝트 마일스톤 ── */
export type MilestoneId = "d28" | "d14" | "d10" | "d3" | "d0";
export interface MilestoneItem {
  checked: boolean;
  assignee: string;
}
export type DesignerMilestonesMap = Record<string, Partial<Record<MilestoneId, MilestoneItem>>>;

/* ── 마일스톤 메타 (자료요청 멘트, 혜택 내용 등) ── */
export type MilestoneMetaMap = Record<string, Record<string, string>>;
// curKey → { requestMsg: "...", benefit: "...", benefitDone: "true" }

/* ── PM 체크리스트 ── */
export type PmCheckId = "pre_survey" | "usp" | "ppt" | "crm_setup" | "funnel_check" | "rehearsal" | "d10_benefit";
export interface PmCheckItem {
  checked: boolean;
  note: string;
}
export type PmChecklistMap = Record<string, Partial<Record<PmCheckId, PmCheckItem>>>;
// curKey → { "funnel_check": { checked: true, note: "4/1 완료" }, ... }

/* ── 작업일지 ── */
export interface WorkLog {
  id: string;
  date: string;        // YYYY-MM-DD
  lectureKey: string;  // "ins|lec" or ""
  content: string;
  createdAt: string;
}

/* ── 담당자 ── */
export type AssigneeRole = "pm" | "designer";

export interface Assignee {
  id: string;
  name: string;
  color: string;
  role: AssigneeRole;
}

export interface ChOption {
  ch: string;
  icon: string;
  color: string;
}

export interface ChRule {
  emoji: string;
  btn: string;
  len: string;
}
