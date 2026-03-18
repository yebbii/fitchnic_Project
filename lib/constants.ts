import type { CrmData, SeqPhase, ChOption, ChRule, Lecture, DesignSeqPhase } from "./types";

function daysFromNow(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const COLORS = [
  "#667eea", "#e67e22", "#e74c3c", "#2ecc71", "#9b59b6",
  "#1abc9c", "#e84393", "#00b894", "#fdcb6e", "#6c5ce7",
];

/** 플랫폼별 기본 색상 (state.platformColors에 없으면 이 값 사용) */
export const DEFAULT_PLATFORM_COLORS: Record<string, string> = {
  "핏크닉": "#38BDF8",
  "머니업": "#22C55E",
};

/**
 * 홈탭 캘린더 & 사이드바 색상 규칙
 * 이 상수를 수정하면 홈탭 전체 색상이 일괄 변경됩니다.
 */
export const HOME_TAB_COLORS = {
  /** PM 업무 블록 색상 — 주황색 */
  pm: "#f97316",
  /** 디자이너 업무 블록 색상 — 보라색 */
  designer: "#764ba2",
  /** 강의 D-10 알림 블록 색상 — 빨간색 */
  d10: "#ef4444",
} as const;

export const TONE_PRESETS = [
  "열정+전문가형", "친근+실전형", "도전+자신감형", "시니어친화+진정성",
  "신뢰+성장형", "실전+친근형", "유머+공감형", "차분+논리형",
];

export const TARGET_PRESETS = [
  "직장인/왕초보/부업", "주부/초보/무자본", "비전공자/초보/부업", "시니어/50~60대",
  "직장인/퇴근후부업", "초보/부업/시니어", "대학생/사회초년생", "프리랜서/1인사업자",
];

export const TYPE_PRESETS = [
  "이커머스(브랜드)", "이커머스(로켓)", "이커머스(쿠팡)", "쇼핑몰(대량등록)",
  "상세페이지", "유튜브(롱폼)", "유튜브(숏폼)", "블로그/SNS", "디지털마케팅",
];

export function createInitData(): CrmData {
  return {
    셀링남: {
      color: "#667eea",
      lectures: {
        "브랜드파이프 4기": {
          type: "이커머스(브랜드)", tone: "열정+전문가형", platform: "머니업",
          usps: ["마진율 50% 비밀링크 소싱", "AI 자동 소싱+엑셀정리", "상품등록 후 바로 다음날 수익"],
          proof: ["시작 한달만에 5천만원 매출", "수강생 한달 평균수익 3천만원"],
          target: "직장인/왕초보/부업", story: "11년차 직장인→상위1% 셀러",
          ebook: "마진계산기 등 BIG5 자료", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(7), liveTime: "19:30", status: "active",
        },
        "브랜드파이프 3기": {
          type: "이커머스(브랜드)", tone: "열정+전문가형", platform: "머니업",
          usps: ["마진율 50%", "AI 소싱", "다음날 수익"],
          proof: ["5천만원 매출", "평균 3천만원"],
          target: "직장인/왕초보", story: "11년차→상위1%",
          ebook: "BIG5 자료", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(-45), liveTime: "19:30", status: "completed",
        },
        "로켓그로스 8기": {
          type: "이커머스(로켓)", tone: "열정+전문가형", platform: "머니업",
          usps: ["로켓그로스 AI 수익화", "무재고 쿠팡 판매", "월급 이상 수익"],
          proof: ["직원0명 월급이상", "다수 수익화 성공"],
          target: "직장인/쿠팡", story: "14년차 셀러 노하우",
          ebook: "로켓그로스 가이드북", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(-90), liveTime: "19:30", status: "completed",
        },
      },
    },
    파이: {
      color: "#e67e22",
      lectures: {
        "AI 대량등록 3기": {
          type: "쇼핑몰(대량등록)", tone: "친근+실전형", platform: "핏크닉",
          usps: ["무재고 월300 AI 대량등록", "데이터기반 AI 상품분석", "2주만에 수익"],
          proof: ["연매출 50억", "초년생/주부/장애인 성공"],
          target: "주부/초보/무자본", story: "연매출 50억 사업가",
          ebook: "대량등록 바이블", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(5), liveTime: "19:30", status: "active",
        },
      },
    },
    디선제압: {
      color: "#e74c3c",
      lectures: {
        "상세페이지 7기": {
          type: "상세페이지", tone: "도전+자신감형", platform: "핏크닉",
          usps: ["무자본 AI 상세페이지", "건당 100만원 AI+템플릿", "비전공자도 시작"],
          proof: ["25억 기업이 찾는 디자이너", "영디자이너 20인"],
          target: "비전공자/초보/부업", story: "실패→월1000 수익화",
          ebook: "수익화 전자책(30만원)", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(10), liveTime: "19:30", status: "active",
        },
        "상세페이지 6기": {
          type: "상세페이지", tone: "도전+자신감형", platform: "핏크닉",
          usps: ["무자본 AI 상세페이지", "건당 100만원", "비전공자"],
          proof: ["25억 기업", "영디자이너 20인"],
          target: "비전공자/초보", story: "실패→월1000",
          ebook: "수익화 전자책", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(-55), liveTime: "19:30", status: "completed",
        },
      },
    },
    지인옥: {
      color: "#2ecc71",
      lectures: {
        "유튜브 롱폼 2기": {
          type: "유튜브(롱폼)", tone: "시니어친화+진정성", platform: "핏크닉",
          usps: ["60대도 월600 AI 유튜브", "인생 연금", "3개월 월600"],
          proof: ["60대 3개월 월600", "전자책 2종"],
          target: "시니어/50~60대", story: "60대 유튜브 전문가",
          ebook: "AI유튜브 활용서 2종", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(12), liveTime: "19:30", status: "active",
        },
        "유튜브 롱폼 1기": {
          type: "유튜브(롱폼)", tone: "시니어친화+진정성", platform: "핏크닉",
          usps: ["60대도 월600", "인생 연금", "3개월 월600"],
          proof: ["60대 월600", "전자책 2종"],
          target: "시니어/50~60대", story: "60대 유튜브 전문가",
          ebook: "AI유튜브 활용서", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(-30), liveTime: "19:30", status: "completed",
        },
      },
    },
    셀팜: {
      color: "#1abc9c",
      lectures: {
        "AI 숏폼 1기": {
          type: "유튜브(숏폼)", tone: "실전+친근형", platform: "핏크닉",
          usps: ["AI 숏폼 자동화", "하루 30분 수익", "무편집 숏폼"],
          proof: ["누적매출 66억", "수강생 3000명"],
          target: "초보/부업/시니어", story: "66억 셀러의 AI 숏폼",
          ebook: "AI 숏폼 가이드북", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(14), liveTime: "19:30", status: "active",
        },
        "쿠팡 농수산물 6기": {
          type: "이커머스(쿠팡)", tone: "실전+친근형", platform: "핏크닉",
          usps: ["AI 쿠팡 농수산물", "3일 500만원", "리뷰없이 매출"],
          proof: ["누적매출 66억", "3000명 검증"],
          target: "초보/부업", story: "66억 셀러의 쿠팡",
          ebook: "쿠팡 비법 전자책", freeUrl: "", youtubeUrl: "", payUrl: "", ebookUrl: "",
          liveDate: daysFromNow(-120), liveTime: "19:30", status: "completed",
        },
      },
    },
  };
}

export const INIT_DATA: CrmData = createInitData();

export const DEFAULT_SEQ: SeqPhase[] = [
  { id: "d7", label: "D-7", dayOffset: -7, items: [
    { id: "d7_mail", ch: "이메일", name: "7일전 메일", icon: "✉️", color: "#E74C3C" },
    { id: "d7_alim", ch: "알림톡", name: "7일전 알림톡", icon: "🔔", color: "#F39C12" },
  ]},
  { id: "d3", label: "D-3", dayOffset: -3, items: [
    { id: "d3_mail", ch: "이메일", name: "3일전 메일", icon: "✉️", color: "#E74C3C" },
    { id: "d3_alim", ch: "알림톡", name: "3일전 알림톡", icon: "🔔", color: "#F39C12" },
  ]},
  { id: "d1", label: "D-1", dayOffset: -1, items: [
    { id: "d1_mail", ch: "이메일", name: "1일전 메일", icon: "✉️", color: "#E74C3C" },
    { id: "d1_alim", ch: "알림톡", name: "1일전 알림톡", icon: "🔔", color: "#F39C12" },
    { id: "d1_ch", ch: "채널톡", name: "1일전 채널톡", icon: "💬", color: "#3498DB" },
    { id: "d1_sms", ch: "문자", name: "1일전 문자", icon: "📱", color: "#2ECC71" },
  ]},
  { id: "prev", label: "전날 저녁", dayOffset: -1, items: [
    { id: "prev_sms", ch: "문자", name: "전날 문자", icon: "📱", color: "#2ECC71" },
    { id: "prev_ch", ch: "채널톡", name: "전날 채널톡", icon: "💬", color: "#3498DB" },
  ]},
  { id: "am", label: "당일 오전", dayOffset: 0, items: [
    { id: "am_alim", ch: "알림톡", name: "오전 알림톡", icon: "🔔", color: "#F39C12" },
    { id: "am_mail", ch: "이메일", name: "오전 메일", icon: "✉️", color: "#E74C3C" },
    { id: "am_ch", ch: "채널톡", name: "오전 채널톡", icon: "💬", color: "#3498DB" },
  ]},
  { id: "pm1", label: "당일 1시", dayOffset: 0, items: [
    { id: "pm1_sms", ch: "문자", name: "1시 문자", icon: "📱", color: "#2ECC71" },
  ]},
  { id: "pm5", label: "5~6시", dayOffset: 0, items: [
    { id: "pm5_no", ch: "문자", name: "5:45 미신청자", icon: "📱", color: "#E67E22" },
    { id: "pm5_yes", ch: "문자", name: "6:15 신청자", icon: "📱", color: "#27AE60" },
    { id: "pm5_mail", ch: "이메일", name: "5시 메일", icon: "✉️", color: "#E74C3C" },
  ]},
  { id: "pre", label: "직전 7:20", dayOffset: 0, items: [
    { id: "pre_alim", ch: "알림톡", name: "직전 알림톡", icon: "🔔", color: "#F39C12" },
    { id: "pre_ch", ch: "채널톡", name: "직전 채널톡", icon: "💬", color: "#3498DB" },
    { id: "pre_sms", ch: "문자", name: "직전 문자", icon: "📱", color: "#2ECC71" },
  ]},
  { id: "live", label: "라이브 7:30", dayOffset: 0, items: [
    { id: "live_y", ch: "이메일", name: "입장메일(참여)", icon: "✉️", color: "#C0392B" },
    { id: "live_n", ch: "이메일", name: "입장메일(미참)", icon: "✉️", color: "#E74C3C" },
    { id: "live_notice", ch: "카톡", name: "톡방 공지", icon: "📢", color: "#8E44AD" },
  ]},
  { id: "during", label: "라이브 중", dayOffset: 0, items: [
    { id: "dur_alim", ch: "알림톡", name: "시청중 알림톡", icon: "🔔", color: "#F39C12" },
    { id: "dur_sms1", ch: "문자", name: "라이브 문자1", icon: "📱", color: "#2ECC71" },
    { id: "dur_sms2", ch: "문자", name: "라이브 문자2", icon: "📱", color: "#2ECC71" },
  ]},
  { id: "after", label: "세일즈", dayOffset: 0, items: [
    { id: "aft1", ch: "문자", name: "세일즈1", icon: "💰", color: "#F1C40F" },
    { id: "aft2", ch: "문자", name: "세일즈2", icon: "💰", color: "#F1C40F" },
    { id: "aft3", ch: "문자", name: "세일즈3", icon: "💰", color: "#F1C40F" },
  ]},
  { id: "next", label: "D+1 이후", dayOffset: 1, items: [
    { id: "next_zoom", ch: "문자", name: "앵콜 줌", icon: "🎬", color: "#9B59B6" },
    { id: "next_cafe", ch: "이메일", name: "카페 메일", icon: "☕", color: "#795548" },
  ]},
];

export const CH_OPTIONS: ChOption[] = [
  { ch: "이메일", icon: "✉️", color: "#E74C3C" },
  { ch: "알림톡", icon: "🔔", color: "#F39C12" },
  { ch: "채널톡", icon: "💬", color: "#3498DB" },
  { ch: "문자", icon: "📱", color: "#2ECC71" },
  { ch: "카톡", icon: "📢", color: "#8E44AD" },
];

export const CH_RULES: Record<string, ChRule> = {
  이메일: { emoji: "✅", btn: "✅", len: "제목30+본문500자" },
  알림톡: { emoji: "❌", btn: "❌", len: "200자" },
  채널톡: { emoji: "✅", btn: "✅", len: "200자" },
  문자: { emoji: "❌", btn: "❌", len: "90자×2장" },
  카톡: { emoji: "✅", btn: "✅", len: "자유" },
};

export const SEQ_CTX: Record<string, string> = {
  d7: "D-7 기대감 유발. USP 티저로 궁금증. 무료혜택으로 톡방 입장 유도.",
  d3: "D-3 구체적 증거. 수강생 성과 숫자. 이미 N명 신청!",
  d1: "D-1 시간 압박. 내일! 혜택 총정리. 마지막 기회.",
  prev: "전날 리마인드. 시간/링크 확인 중심. 짧고 간결.",
  am: "당일 오전. 오늘밤! 드디어! 기대 최고조. 시간+링크+혜택 총정리.",
  pm1: "당일1시 미신청자 FOMO. 아직도 망설이시나요? 기회는 한번뿐!",
  pm5: "5~6시 극단적FOMO 놓치면끝. 퇴근시간 리마인드.",
  pre: "직전7:20 지금시작합니다!!! 극긴급. 입장링크 크게. 다시보기없음!",
  live: "라이브시작 참여자=링크+혜택대기. 미참여=지금이라도. 다시보기없음.",
  during: "라이브중 OOO명시청중!! 사회적증거. 혜택상기.",
  after: "세일즈 선착순압박+할인쿠폰+계좌이체+환급보장.",
  next: "D+1 문의폭주! 다시보기한정. 앵콜줌. 두번다시없는기회!",
};

export const CH_R: Record<string, string> = {
  문자: "90자x2장(180자). 이모티콘절대금지(☆★▣⇒OK). [대괄호제목]후킹. 줄당15자. ▣CTA. #{이름}변수OK.",
  알림톡: "200자이내. 이모티콘금지. 팩트중심.",
  이메일: "제목:으로시작(30자). 본문500자. [태그]형식. 후킹→크리덴셜→USP→CTA→혜택.",
  채널톡: "200자이내. 이모티콘적극(🔥👉🎁✅💸😎).",
  카톡: "300~500자. 이모티콘적극(📢🚨🔥🎁). 링크2회반복. ✅①②③혜택.",
};

export const COPY_EXAMPLES = `[문자 레퍼런스]
[퍼플오션 들어보셨나요?!]
이미 경쟁은 있지만 차별화 하나로 독점이 되는 시장
그게 바로 퍼플오션!
내일 밤 7시 30분, 시작 한 달도 안 돼 5천만 원 매출 구조를 만든
⇒참여만해도 마진계산기 등 5종 자료가 무료!

[이메일 레퍼런스]
제목: [D-1]노트북 하나면 월300 벌 준비 끝
무자본·무기술로 시작하는 수익화의 신세계!
올해 당신의 인생을 바꿀 최고의 선택이 내일 시작됩니다!
▶ 무료강의 바로 신청하기(클릭)

[톡방 레퍼런스]
🔥기다리시던 강의 시작합니다!!!
🎁참여만 해도 이 모든 게 무료! ①1:1 코칭 ②마진계산기 ③전자책 3종
💸오늘 상품 등록해 내일 수익창출! 😍제일빠르고 확실한 수익화!

[세일즈 레퍼런스]
🚨[선착순 쿠폰 50개]
🔥라이브특가 20만원 할인+계좌이체 30만원 추가 할인
👉수익100% 보장! 바로 합류하기`;

export const FEEDBACK_TAGS = ["톤 조정", "소구점 변경", "길이 조정", "강사특성 미반영", "기타"];

export const NEW_LECTURE_INIT: import("./types").NewLectureForm = {
  instructor: "",
  lectureName: "",
  liveDate: "",
};

/* ── 디자이너 체크리스트 시퀀스 ── */
export const DEFAULT_DESIGN_SEQ: DesignSeqPhase[] = [
  {
    id: "d14", label: "D-14 기획", dayOffset: -14,
    items: [
      { id: "d14_concept", phaseId: "d14", name: "키비주얼 컨셉 기획", icon: "💡", category: "design" },
      { id: "d14_ref", phaseId: "d14", name: "레퍼런스 수집", icon: "📂", category: "design" },
      { id: "d14_profile", phaseId: "d14", name: "강사 프로필 이미지 수령", icon: "📸", category: "design" },
    ],
  },
  {
    id: "d7", label: "D-7 제작", dayOffset: -7,
    items: [
      { id: "d7_thumb", phaseId: "d7", name: "썸네일 초안 제작", icon: "🖼️", category: "design" },
      { id: "d7_landing", phaseId: "d7", name: "랜딩페이지 초안", icon: "📄", category: "design" },
      { id: "d7_sns", phaseId: "d7", name: "SNS 홍보 이미지", icon: "📱", category: "design" },
      { id: "d7_email", phaseId: "d7", name: "이메일 헤더 이미지", icon: "✉️", category: "design" },
    ],
  },
  {
    id: "d3", label: "D-3 마감", dayOffset: -3,
    items: [
      { id: "d3_landing", phaseId: "d3", name: "랜딩페이지 최종 완료", icon: "✅", category: "design" },
      { id: "d3_thumb", phaseId: "d3", name: "썸네일 최종 확정", icon: "🖼️", category: "design" },
      { id: "d3_crm", phaseId: "d3", name: "CRM 이미지 최종 검수", icon: "📧", category: "design" },
    ],
  },
  {
    id: "d1", label: "D-1 라이브 준비", dayOffset: -1,
    items: [
      { id: "d1_bg", phaseId: "d1", name: "라이브 배경 이미지 준비", icon: "🖥️", category: "live" },
      { id: "d1_slide", phaseId: "d1", name: "OT 슬라이드 최종 확인", icon: "📊", category: "live" },
      { id: "d1_zoom", phaseId: "d1", name: "줌/유튜브 세팅 테스트", icon: "🎥", category: "live" },
    ],
  },
  {
    id: "live", label: "라이브 당일", dayOffset: 0,
    items: [
      { id: "live_cam", phaseId: "live", name: "카메라·마이크·조명 확인", icon: "📹", category: "live" },
      { id: "live_share", phaseId: "live", name: "화면공유 테스트", icon: "🖥️", category: "live" },
      { id: "live_link", phaseId: "live", name: "입장 링크 최종 배포 준비", icon: "🔗", category: "live" },
      { id: "live_rec", phaseId: "live", name: "녹화 설정 확인", icon: "⏺️", category: "live" },
    ],
  },
  {
    id: "after", label: "D+1 마무리", dayOffset: 1,
    items: [
      { id: "after_thumb", phaseId: "after", name: "다시보기 썸네일 제작", icon: "🖼️", category: "design" },
      { id: "after_sns", phaseId: "after", name: "SNS 결과 피드 제작", icon: "📱", category: "design" },
    ],
  },
];

export const LIVE_SETUP_ITEMS = [
  { id: "ls_cam", name: "카메라 화질 확인", icon: "📹" },
  { id: "ls_mic", name: "마이크 음질 테스트", icon: "🎙️" },
  { id: "ls_light", name: "조명 세팅", icon: "💡" },
  { id: "ls_bg", name: "배경 정리", icon: "🏠" },
  { id: "ls_net", name: "인터넷 속도 체크 (100Mbps+)", icon: "🌐" },
  { id: "ls_zoom", name: "줌/유튜브 접속 테스트", icon: "💻" },
  { id: "ls_share", name: "화면 공유 테스트", icon: "🖥️" },
  { id: "ls_chat", name: "채팅 관리자 배정", icon: "💬" },
  { id: "ls_wait", name: "대기 화면 준비", icon: "⏳" },
  { id: "ls_link", name: "입장 링크 최종 확인", icon: "🔗" },
  { id: "ls_rec", name: "녹화 설정 확인", icon: "⏺️" },
];

/* ── 디자이너 프로젝트 마일스톤 정의 ── */
export interface MilestoneSubItem {
  id: string;
  name: string;
  type?: "check" | "copy" | "benefit" | "live_setting";  // default: "check"
}

export const DESIGNER_MILESTONES = [
  { id: "d28" as const, label: "D-28", title: "무료 세팅",           dayOffset: -28, color: "#f97316", subItems: [
    { id: "d28_homepage", name: "홈페이지 세팅" },
    { id: "d28_banner", name: "홈페이지 좌측 배너 세팅" },
    { id: "d28_cafe", name: "카페배너 세팅" },
  ] as MilestoneSubItem[] },
  { id: "d14" as const, label: "D-14", title: "상세페이지 자료요청", dayOffset: -14, color: "#764ba2", subItems: [
    { id: "d14_request", name: "자료요청", type: "copy" },
  ] as MilestoneSubItem[] },
  { id: "d10" as const, label: "D-10", title: "혜택 마감",           dayOffset: -10, color: "#ef4444", subItems: [
    { id: "d10_benefit", name: "혜택 전달", type: "benefit" },
  ] as MilestoneSubItem[] },
  { id: "d3"  as const, label: "D-3",  title: "유료 상페 완료",      dayOffset: -3,  color: "#22c55e", subItems: [
    { id: "d3_toss", name: "토스 검수" },
    { id: "d3_pm", name: "PM 공유" },
    { id: "d3_instructor", name: "강사 공유" },
  ] as MilestoneSubItem[] },
  { id: "d0"  as const, label: "당일", title: "라이브 세팅",         dayOffset: 0,   color: "#ef4444", subItems: [
    { id: "d0_live_setting", name: "라이브 세팅 완료", type: "live_setting" },
  ] as MilestoneSubItem[] },
];

export const DEFAULT_REQUEST_MSG = `안녕하세요, 강사님!
상세페이지 제작을 위해 아래 자료를 요청드립니다.

1. 프로필 사진 (고화질)
2. 강의 소개 텍스트
3. 수강생 후기/성과 자료
4. 강조하고 싶은 핵심 내용

감사합니다!`;

/** 새 강의 추가 시 Lecture 기본값 (폼에서 안 쓰이는 필드) */
export const NEW_LECTURE_DEFAULTS: Omit<Lecture, "liveDate" | "status"> = {
  type: "",
  tone: "",
  platform: "핏크닉",
  usps: [],
  proof: [],
  target: "",
  story: "",
  ebook: "",
  freeUrl: "",
  youtubeUrl: "",
  payUrl: "",
  ebookUrl: "",
  liveTime: "19:30",
};
