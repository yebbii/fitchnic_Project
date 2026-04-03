# ARCHITECTURE.md — fitchnic CRM 데이터 구조

## 프로젝트 목표

> 한 강의를 PM과 디자이너가 어긋남 없이 진행하고,
> 그 과정이 데이터로 보이며,
> 다른 담당자들이 데이터를 참고할 수 있는 상태를 만든다.

---

## 강의 생명주기

```
강사 확정
  │
  ├─ 사전질문지 배포 (디자이너) → 회수 → 각 팀 활용
  ├─ 강의 기획 (PM: 소구점, 타겟, 톤앤매너)
  ├─ 무료 상세페이지 제작 (디자이너)
  │
D-29 ── 무료 강의 세팅 완료 (필수 마감)
  │
  ├─ PM: 강의 PPT 확인, CRM 세팅, 리허설 준비
  │
D-28 ── 광고 ON
  │     ├─ 디자이너: 상세페이지 세팅, 카페 배너
  │     ├─ PM: 퍼널 체크 → 완료 시 광고 담당자 확인 가능
  │     └─ 광고 담당자(PD): 광고 집행 (보류 — 추후 추가)
  │
D-14 ── 유료 강의 자료 요청 (강사에게)
  │     └─ 유료 상세페이지 제작 시작
  │
D-10 ── PM → 디자이너 혜택 전달
  │     └─ 디자이너: 유료 상세페이지 제작 + 수정
  │
D-Day ── 라이브 진행
  │
이후 ── 2기/3기 연장 | 주제 변경 | 플랫폼 변경 | 중단(standby)
```

---

## 핵심 엔티티

### 1. 강의 (Lecture)

한 강사의 한 강의를 나타내는 최소 단위. `curKey = "강사명|강의명"`으로 식별.

```
CrmData (전체)
└─ Record<강사명, InstructorData>
   └─ lectures: Record<강의명, Lecture>
```

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | 강의 유형 |
| tone | string | 톤앤매너 |
| platform | string | "핏크닉" \| "머니업" |
| usps | string[] | 핵심 USP |
| proof | string[] | 증거/후기 |
| target | string | 타겟 |
| story | string | 스토리 |
| ebook | string | ebook 자료명 |
| freeUrl | string | 무료 강의 URL |
| youtubeUrl | string | 유튜브 URL |
| payUrl | string | 유료 강의 URL |
| ebookUrl | string | ebook URL |
| figmaUrl | string | 피그마 디자인 링크 |
| liveDate | string | 라이브 날짜 (YYYY-MM-DD) |
| liveTime | string | 라이브 시간 (HH:MM) |
| status | "active" \| "standby" \| "completed" | 강의 상태 |

**상태 흐름:**
```
active (진행중) ←→ standby (대기/보류)
       ↓
  completed (완료)  ← D+2 자동완료 또는 수동
```

- `active`: 캘린더, 사이드바, 보드에 표시
- `standby`: 어디에도 표시 안 됨 (강사관리에서만 보임)
- `completed`: 히스토리에 표시

### 콘텐츠 정보 (공통 참고 자료)

Lecture의 아래 필드들이 **모든 역할이 참고하는 공통 자료**:

```
tone + target + type + usps + proof + story + ebook
+ freeUrl + youtubeUrl + payUrl + ebookUrl + figmaUrl
```

---

### 2. 강사 (Instructor)

두 가지 데이터로 구성:

**InstructorData** (자동 — 강의 추가 시 생성)
```
CrmData[강사명] = { lectures: { ... } }
```

**InstructorProfile** (수동 — 프로필 생성 시 저장)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | UUID |
| name | string | 강사명 (CrmData 키와 동기화) |
| contact | string | 연락처 |
| specialty | string | 전문분야 |
| platforms | string[] | 소속 플랫폼 |
| profileImageUrl | string | 프로필 사진 (base64) |
| memo | string | 메모 |
| status | "active" \| "out" | 강사 상태 |
| createdAt | string | 생성일시 |

**강사 표시 상태 (UI에서 자동 계산):**
```
active 강의 1개 이상  → "활동중" (초록)
standby만 있거나 0건 → "대기" (노랑)
profile.status = out → "OUT" (회색, 수동 설정)
```

---

### 3. PM 업무 트래커

강의별로 두 가지 트래커가 존재:

#### 3-A. CRM 발송 시퀀스 (기존)

라이브 D-Day 역산으로 12단계 발송 일정 관리.

```
SeqDataMap: Record<curKey, SeqPhase[]>
ChecksMap:  Record<curKey, Record<itemId, boolean>>    // 발송 체크
CopiesMap:  Record<curKey, Record<itemId, CopyData>>   // 카피 데이터
```

| 시퀀스 단계 | 오프셋 |
|-------------|--------|
| D-7 | -7 |
| D-3 | -3 |
| D-1 | -1 |
| 전날저녁 | -1 |
| 당일오전 | 0 |
| 당일1시 | 0 |
| 5~6시 | 0 |
| 직전7:20 | 0 |
| 라이브7:30 | 0 |
| 라이브중 | 0 |
| 세일즈 | 0 |
| D+1이후 | +1 |

각 단계에는 채널별 아이템(이메일, 알림톡, 채널톡, 문자, 카톡 등)이 포함.

#### 3-B. PM 체크리스트 (신규)

CRM 발송 외의 PM 업무를 체크.

```
PmChecklistMap: Record<curKey, Partial<Record<PmCheckId, PmCheckItem>>>
PmCheckItem: { checked: boolean, note: string }
```

| ID | 라벨 | 설명 |
|----|------|------|
| pre_survey | 사전질문지 확인 | 디자이너 배포 후 회수된 내용 확인 |
| usp | 소구점 정리 | 핵심 USP, 타겟, 톤앤매너 정리 |
| ppt | 강의 PPT 확인 | 강사 강의 PPT 검토 완료 |
| crm_setup | CRM 세팅 | 발송 시퀀스, 채널별 카피 세팅 |
| funnel_check | 퍼널 체크 | 디자이너 세팅 후 퍼널 확인 완료 |
| rehearsal | 리허설 체크 | 라이브 리허설 진행 및 확인 |
| d10_benefit | D-10 혜택 전달 | 일정/혜택 정리 후 디자이너에게 전달 |

**핸드오프 포인트:**
- `funnel_check` 완료 → 광고 담당자가 확인 가능 (추후 PD 기능 연동)
- `d10_benefit` 완료 → 디자이너가 유료 상세페이지 제작 시작

---

### 4. 디자이너 업무 트래커

#### 4-A. 디자이너 마일스톤 (기존)

```
DesignerMilestonesMap: Record<curKey, Partial<Record<MilestoneId, MilestoneItem>>>
MilestoneItem: { checked: boolean, assignee: string }
```

| ID | 라벨 | 제목 | D-Day 오프셋 |
|----|------|------|-------------|
| d28 | D-28 | 무료 세팅 | -28 |
| d14 | D-14 | 상세페이지 자료요청 | -14 |
| d10 | D-10 | 혜택 마감 | -10 |
| d3 | D-3 | 유료 상페 완료 | -3 |
| d0 | 당일 | 라이브 세팅 | 0 |

각 마일스톤에는 세부 작업(subItems)이 포함:
- D-28: 홈페이지 세팅, 좌측 배너, 카페배너
- D-14: 자료요청
- D-10: 혜택 전달
- D-3: 토스 검수, PM 공유, 강사 공유
- 당일: 라이브 세팅 완료

#### 4-B. 마일스톤 메타

```
MilestoneMetaMap: Record<curKey, Record<string, string>>
```

자료요청 멘트, 혜택 내용 등 마일스톤에 딸린 텍스트 데이터.

---

### 5. 담당자 (Assignee)

```
Assignee: { id, name, color, role: "pm" | "designer" }
```

- 강의별 담당자 배정: `designerProjectAssignees[curKey]`, `pmProjectAssignees[curKey]`
- 마일스톤별 담당자: `MilestoneItem.assignee`

---

### 6. 작업일지 (WorkLog)

```
WorkLog: { id, date, lectureKey, content, createdAt }
```

날짜별 + 강의별 자유 메모.

---

## 역할별 데이터 접근

| 데이터 | PM | 디자이너 | 광고(PD) | 강사 |
|--------|:--:|:-------:|:-------:|:----:|
| 콘텐츠 정보 (Lecture) | 읽기/쓰기 | 읽기 | 읽기 | - |
| CRM 시퀀스 | 읽기/쓰기 | - | - | - |
| PM 체크리스트 | 읽기/쓰기 | 읽기 | 읽기 | - |
| 디자이너 마일스톤 | 읽기 | 읽기/쓰기 | - | - |
| 퍼널 체크 결과 | 쓰기 | 요청 | 읽기 | - |
| 강사 프로필 | 읽기/쓰기 | 읽기 | 읽기 | - |

※ 현재는 단일 사용자 앱이므로 권한 구분은 UI 레벨에서만 적용

---

## 저장소 (localStorage)

| 키 | 타입 | 설명 |
|----|------|------|
| crm_data | CrmData | 강사 + 강의 전체 데이터 |
| crm_checks | ChecksMap | CRM 발송 체크 상태 |
| crm_copies | CopiesMap | CRM 카피 데이터 |
| crm_seqDataMap | SeqDataMap | 시퀀스 커스텀 데이터 |
| crm_feedbacks | Feedback[] | 피드백 |
| crm_platformColors | Record | 플랫폼 색상 |
| crm_milestone_meta | MilestoneMetaMap | 마일스톤 메타 텍스트 |
| crm_instructor_profiles | InstructorProfile[] | 강사 프로필 |
| crm_pm_checklist | PmChecklistMap | PM 체크리스트 |
| designer_checks | DesignChecksMap | 디자이너 체크 상태 |
| designer_milestones | DesignerMilestonesMap | 디자이너 마일스톤 |
| designer_worklogs | WorkLog[] | 작업일지 |
| designer_assignees | Assignee[] | 담당자 목록 |
| designer_project_assignees | Record | 디자이너 프로젝트별 담당자 |
| pm_project_assignees | Record | PM 프로젝트별 담당자 |

모든 데이터는 state 변경 후 500ms 디바운스로 자동 저장.

---

## 상태 관리 흐름

```
UI 컴포넌트
  ↓ dispatch(action)
useReducer (use-crm-store.tsx)
  ↓ 상태 업데이트
파생 데이터 훅 (use-derived-data.ts)
  ├─ useActiveLectures()     — active 강의만
  ├─ useCompletedLectures()  — completed 강의만
  ├─ useLectureSummaries()   — 전체 강의 요약
  ├─ useLiveEvents()         — 라이브 이벤트
  └─ useInstructorStats()    — 강사별 통계
  ↓
localStorage 자동 저장 (500ms 디바운스)
```

---

## 탭 구조

```
홈 ─────────── 통합 캘린더 + 강의 요약 사이드바
PM ─────────── PM 캘린더 | 타임라인 (보드) | 히스토리
디자이너 ───── 디자이너 캘린더 | 타임라인 | 작업일지
강의 관리 ──── 대시보드 | 강의 관리 | 강사 관리
```

---

## 추후 확장 예정

- **광고 담당자(PD) 역할**: 퍼널 체크 확인 뷰, 광고 ON/OFF 상태 관리
- **사전질문지 관리**: 디자이너가 배포, 회수 상태 추적
- **알림/핸드오프**: PM↔디자이너 간 업무 전달 알림
