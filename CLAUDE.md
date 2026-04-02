# CLAUDE.md — fitchnic CRM 프로젝트 규칙

## 프로젝트 개요
- **이름**: fitchnic CRM (crm-automation)
- **스택**: Next.js 16, React 19, TypeScript, Tailwind CSS 3.4
- **패키지매니저**: pnpm (없으면 npm 폴백)
- **실행**: `pnpm dev` / `npm run dev` → localhost:3000
- **디자인 기준**: `designer-calendar-tab.tsx` (디자이너 캘린더)

---

## 필수 규칙

### 1. 기능/로직 수정 금지
- UI/디자인 작업 시 기존 비즈니스 로직, 상태 관리, 데이터 흐름을 변경하지 않는다.
- reducer 액션, hook 반환값, 타입 정의를 수정하지 않는다.
- 스타일 리팩토링과 기능 변경을 같은 커밋에 섞지 않는다.

### 2. Tailwind 디자인 토큰만 사용
- 색상, 간격, 라운딩, 그림자 등 스타일 값은 반드시 `tailwind.config.ts` 토큰을 사용한다.
- 인라인 `style={{}}` 에 하드코딩 hex/px 사용 금지. Tailwind 클래스로만 스타일링.
- **예외**: 런타임 동적 색상(`lc.color`, `ev.color`, `mColor` 등 state에서 오는 값)만 inline style 허용.
- 새 디자인 값이 필요하면 먼저 `tailwind.config.ts`에 토큰을 추가한 뒤 사용한다.

### 3. 레이아웃 통일
아래 규칙은 모든 페이지(탭)에 동일하게 적용한다.

### 4. Layout Stability (레이아웃 안정성)
- **필터/탭 변경 시 레이아웃 이동 금지** → 필터 영역에 `min-height` 고정 적용
- **체크박스, 토글, 뱃지 상태 변경 시 주변 요소 밀림 금지** → 고정 크기 사용
- **데이터 로드/변경으로 인한 레이아웃 시프트(CLS) 금지** → 스켈레톤 또는 고정 높이 확보
- **조건부 렌더링으로 요소가 생기고 사라질 때** → `hidden` (`display:none`) 또는 `invisible` (`visibility:hidden`)으로 공간 유지. 조건부 마운트/언마운트(`{cond && <Comp/>}`) 사용 금지.
- **예외**: 사용자가 의도적으로 클릭하여 여닫는 UI(모달, 아코디언, 드롭다운)만 레이아웃 변경 허용
- 구현 패턴:
  ```tsx
  // ✅ 좋음 — 공간 유지
  <div className={showFilter ? "block" : "hidden"}>...</div>
  <span className={checked ? "visible" : "invisible"}>✓</span>

  // ❌ 나쁨 — 레이아웃 시프트 유발
  {showFilter && <div>...</div>}
  {checked && <span>✓</span>}
  ```

---

## 레이아웃 시스템

### 상단 네비게이션 (2단 구조, 모든 페이지 공통)
```
┌─────────────────────────────────────────────────────────┐
│ [로고]  [홈 | PM | 디자이너 | 강의관리]   ← 상위탭     │  h-nav (56px)
├─────────────────────────────────────────────────────────┤
│ [PM캘린더 | 타임라인 | 히스토리]          ← 하위탭     │  ~44px
└─────────────────────────────────────────────────────────┘
```
- 상위탭: `bg-surface-hover rounded-xl p-1` 안에 버튼 그룹
- 하위탭: `bg-primary text-white` (활성) / `bg-secondary text-muted-foreground` (비활성)
- 높이 합산: `h-nav-full` (100px)
- 홈 탭은 하위탭 없음 → `min-h-page-nosub` 사용

### A. 사이드바 + 메인 2단 레이아웃
**적용 대상**: 홈, PM 캘린더(dashboard), 디자이너 캘린더

#### 핵심 원칙
1. **사이드바 너비 고정** — `w-72` (288px), 절대 늘어나거나 줄어들지 않음 (`shrink-0`)
2. **스크롤 완전 분리** — 사이드바와 메인 각각 독립 스크롤, 한쪽 스크롤해도 다른 쪽 위치 고정
3. **전체 페이지 스크롤 금지** — 루트를 `h-screen - nav` 고정, 각 영역 내부에서만 스크롤

```
┌─────────────────── 전체: h-[calc(100vh-nav높이)] ───────────────────┐
│ aside (고정 w-72)  │              main (flex-1)                     │
│ overflow-y-auto    │         overflow-y-auto                       │
│ ↕ 독립 스크롤      │         ↕ 독립 스크롤                          │
│                    │    ┌─ card ──────────────┐                    │
│                    │    │ rounded-card p-6    │                    │
│                    │    │ bg-surface-card     │                    │
│                    │    │ shadow-card         │                    │
│                    │    └─────────────────────┘                    │
└────────────────────┴──────────────────────────────────────────────┘
```

#### 클래스 규칙
```tsx
{/* 루트: 고정 높이, 페이지 스크롤 금지 */}
<div className="flex h-[calc(100vh-100px)] overflow-hidden animate-fi">

  {/* 사이드바: 고정 너비, 독립 스크롤 */}
  <aside className="w-72 shrink-0 border-r border-border/50 bg-surface-sidebar overflow-y-auto">
    ...
  </aside>

  {/* 메인: 나머지 채움, 독립 스크롤 */}
  <main className="flex-1 overflow-y-auto p-8">
    <div className="bg-surface-card rounded-card shadow-card p-6">
      ...
    </div>
  </main>
</div>
```
- 홈 탭은 하위탭 없음 → `h-[calc(100vh-56px)]`
- PM/디자이너 캘린더는 하위탭 있음 → `h-[calc(100vh-100px)]`

### B. 메인 단일 레이아웃
**적용 대상**: PM 타임라인, PM 히스토리, 디자이너 타임라인, 작업일지, 강의관리, 강사관리, 대시보드
```
┌──────────────────────────────────────────┐
│              main                        │
│  max-w-content mx-auto px-10 py-8       │
│                                          │
│  ┌─ card ──────────────────────────┐    │
│  │ rounded-card p-6                │    │
│  │ bg-surface-card shadow-card     │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘
```
- 루트: `min-h-page bg-surface animate-fi`
- 콘텐츠 래퍼: `max-w-content mx-auto px-10 py-8`
- 카드: `bg-surface-card rounded-card shadow-card p-6`

---

## 컴포넌트 스타일 규칙

### 카드
| 용도 | 클래스 |
|------|--------|
| 기본 카드 | `bg-surface-card rounded-card shadow-card` |
| 카드 내 패딩 | `p-6` (메인) / `p-3.5` (사이드바 소형 카드) |
| 카드 호버 | `hover:shadow-card-hover hover:-translate-y-0.5 transition-all` |
| 컬러 헤더 바 | `h-1 w-full rounded-t-card` + 동적 `style={{ background: color }}` |

### 뱃지 · 태그
| 용도 | 클래스 |
|------|--------|
| D-Day 뱃지 | `text-[10px] font-bold px-2 py-0.5 rounded-pill` |
| 긴급 (D≤1) | `bg-red-500 text-white` |
| 주의 (D≤3) | `bg-amber-400 text-white` |
| 여유 (D>3) | `bg-emerald-500/15 text-emerald-600` |
| 마일스톤 라벨 | `text-[10px] font-bold px-1.5 py-0.5 rounded-pill` + 동적 색상 |
| 상태 "지남" | `text-[9px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded-pill` |

### 버튼
| 용도 | 클래스 |
|------|--------|
| 네비 월 이동 | `bg-surface-hover rounded-card px-4 py-2 text-muted-foreground border-none cursor-pointer font-semibold hover:bg-accent` |
| 필터 칩 (활성) | `bg-foreground text-white rounded-pill px-3 py-1.5 text-[12px] font-semibold` |
| 필터 칩 (비활성) | `bg-secondary text-muted-foreground rounded-pill px-3 py-1.5 text-[12px] font-semibold hover:bg-accent` |
| 뷰 토글 그룹 | 외곽 `bg-surface-hover rounded-xl p-[3px]` / 활성 `bg-white shadow-sm` / 비활성 `bg-transparent text-muted-foreground` |
| 닫기 (모달) | `w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground border-none cursor-pointer hover:bg-accent` |

### 프로그레스 바
```
트랙: h-1.5 bg-neutral-track rounded-full overflow-hidden
바:   h-full rounded-full transition-all bg-{역할색상}
100%: bg-green-500 (완료 시)
```

### 체크박스 (마일스톤·시퀀스)
```
미체크: bg-transparent border-[1.5px] border-{milestone.color}
체크:   bg-neutral-checked border-neutral-checked text-white
```

### 드롭다운
```
bg-surface-card rounded-card shadow-dropdown py-1 min-w-[140px]
항목: px-3 py-1.5 text-[11px] hover:bg-secondary
```

### 캘린더
| 요소 | 클래스 |
|------|--------|
| 요일 헤더 그리드 | `grid grid-cols-7 gap-0.5 mb-1.5` |
| 일요일 텍스트 | `text-red-500` |
| 토요일 텍스트 | `text-blue-500` |
| 날짜 셀 | `min-h-[110px] rounded-card p-1.5 border border-border/30` |
| 오늘 셀 | `bg-{역할색상}/5 border-{역할색상}` |
| 과거 셀 | `bg-surface-inset` |
| 이벤트 블록 | `rounded-lg px-1.5 py-1 text-xs font-semibold cursor-pointer leading-tight` |

### 사이드바 프로젝트 카드
```
bg-surface-card rounded-card shadow-card
컬러 바: h-1 rounded-t-card + 동적 background
내부:    p-3.5
강사명:  font-bold text-[13px] + 동적 color
강의명:  text-[11px] text-muted-foreground
진행률:  h-1.5 bg-neutral-track rounded-full
토글:    text-[11px] text-neutral-400 hover:text-neutral-600
```

### 모달
```
배경: fixed inset-0 z-[200] bg-black/25 backdrop-blur-[3px]
패널: bg-surface-card rounded-card shadow-dropdown p-6 animate-fi
```

---

## 색상 토큰 요약

| 토큰 | 값 | 용도 |
|------|-----|------|
| `brand` | #006BFE | 브랜드 메인 (로고, 링크) |
| `pm` | #fc8b57 | PM 업무 블록·도트 |
| `designer` | #b589e0 | 디자이너 업무 블록·도트 |
| `d-10` | #ef4444 | D-10 알림 |
| `fitchnic` | #38BDF8 | 핏크닉 플랫폼 |
| `moneyup` | #22C55E | 머니업 플랫폼 |
| `surface` | #F7F8FA | 페이지 배경 |
| `surface-hover` | #F0F1F4 | 버튼·탭 그룹 배경 |
| `surface-inset` | #FAFAFA | 과거 셀·테이블 헤더 |
| `neutral-track` | #F0F0F5 | 프로그레스 바 트랙 |
| `neutral-checked` | #9CA3AF | 완료 체크 색상 |
| `neutral-400` | #AEAEB2 | 비활성 텍스트 |

---

## 코드 컨벤션

### 상태 관리
- 전역 상태: `useCrm()` (useReducer + Context)
- 파생 데이터: `useActiveLectures()`, `useCompletedLectures()` 등 전용 hook 사용
- curKey 형식: `${강사명}|${강의명}`

### 파일 구조
- 컴포넌트: `components/` (탭 컴포넌트는 `*-tab.tsx`)
- 훅: `hooks/`
- 타입/상수/유틸: `lib/`
- 스토어 리듀서: `lib/stores/`

### 커밋
- 커밋 시 `git push`까지 함께 수행한다.
- 스타일 변경과 로직 변경은 별도 커밋으로 분리한다.
