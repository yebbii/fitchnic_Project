# fitchnic CRM 프로젝트 대화 컨텍스트

> 마지막 업데이트: 2026-03-13

---

## 작업 히스토리

### 1. 디자이너 탭 캘린더 뷰/표 뷰 토글

**요청**: 디자이너 탭의 캘린더 섹션에 달력 버전 / 표 버전으로 전환할 수 있는 토글 추가

**구현 내용** (`components/designer-calendar-tab.tsx`):
- `viewMode` 상태: `useState<"calendar" | "table">("calendar")`
- 헤더에 달력 | 표 토글 버튼 추가
- 표 뷰: 프로젝트별 마일스톤 섹션, D-day 배지, 담당자 컬럼 표시
- 완료된 항목(체크된 것)은 달력/표 양쪽 모두 무채색(grayscale) 스타일 적용

---

### 2. 새 강의 추가 다이얼로그 대규모 개선

**파일**: `components/add-lecture-dialog.tsx`

#### 2-1. 기수(cohort) 분리
- `splitCohort(raw)` 헬퍼 함수 추가: 강의명에서 기수 자동 추출
  - 패턴: `/^(.*?)\s*(\d+기)\s*$/`
  - 예: `"브랜드파이프 5기"` → `{ name: "브랜드파이프", cohort: "5기" }`
- `ParsedRow` 인터페이스에 `cohort: string` 필드 추가
- 붙여넣기 파싱(`parsePastedRows`, `parseCalendarGrid`) 모두 `splitCohort` 적용
- 수기 입력 폼에 기수 별도 입력 필드 추가 (`manualCohort` 상태)

#### 2-2. 붙여넣기 미리보기 테이블
- 기수 컬럼 추가 (강사 | 강의명 | 기수 | 날짜 | 플랫폼)
- 셀 클릭해서 직접 수정 가능
- 행 배경색: 체크 해제=opacity-40, 유효=없음, 부분=노란색, 빈값=빨간색

#### 2-3. 강사별 강의명 프리셋
- `getPresetNames(ins)`: 기존 스토어 데이터에서 기수 제외한 고유 강의명 목록 추출
- 강사명 선택 시 프리셋이 1개면 강의명 자동 입력
- 수기 입력 폼: 강의명 인풋 아래 프리셋 칩 버튼 표시
- 붙여넣기 표: `displayRows`에서 강의명 비어있고 프리셋 1개면 자동 채움
- 플랫폼도 스토어에서 자동 보완

#### 2-4. 같은 날짜 강의 교체
- `findExistingByDate(ins, liveDate)`: 같은 강사+날짜의 기존 강의 찾기
- 추가 시 같은 날짜 강의가 있으면 `DELETE_LECTURE` 후 `ADD_LECTURE`

#### 2-5. 체크박스 (포함 여부 선택)
- `rowChecks: Record<number, boolean>` 상태 (기본값: 모두 체크)
- `isRowChecked(i)`: `i in rowChecks ? rowChecks[i] : true`
- `toggleRow(i)`: functional update로 stale closure 방지
  ```ts
  setRowChecks(prev => ({ ...prev, [i]: !(i in prev ? prev[i] : true) }))
  ```
- 체크 해제 = 추가에서 제외 (경고 없음)

#### 2-6. 추가 버튼 활성화 조건
```
validRows = 체크된 행 전체
addableRows = 체크된 행 중 강사명 + 강의명 + 기수 모두 채워진 행

비활성화 조건: validRows.length === 0 || addableRows.length < validRows.length
```
- 버튼 텍스트: `"붙여넣기 대기 중"` / `"빈 항목을 채워주세요"` / `"N개 강의 추가"`

#### 2-7. 레이아웃 고정 (최종 수정)
- 경고 메시지를 조건부 렌더링 대신 항상 렌더링 + `opacity-0`/`opacity-100` 토글
- 레이아웃 점프 방지

---

## 버그 수정 이력

| 버그 | 원인 | 해결 |
|------|------|------|
| JSX 닫힘 태그 오류 | `{viewMode === "calendar" && <>` 닫힘 태그 누락 | `</>}` 추가 |
| `getPresetNames` 선언 전 사용 | `displayRows` 계산 시 아래 선언된 함수 참조 | 함수 정의를 `displayRows` 위로 이동 |
| 중복 `getPresetNames` 선언 | 위로 이동 후 원본 삭제 누락 | 원본 제거 |
| Map 리렌더링 미작동 | `Map<number, boolean>` → 같은 참조라 React가 변화 감지 못함 | `Record<number, boolean>` + 스프레드로 마이그레이션 |
| stale closure in toggleRow | render 클로저의 현재값 전달 → 재체크 시 이전 값 참조 | `prev` 상태에서 직접 읽도록 수정 |
| 기수 없이 버튼 활성화 | `addableRows` 필터에 `cohort` 체크 누락 | `r.cohort?.trim()` 조건 추가 |

---

## 주요 컴포넌트 구조 요약

```
add-lecture-dialog.tsx
├── ParsedRow (interface)
├── splitCohort() - 강의명에서 기수 분리
├── parseDate() - 날짜 문자열 파싱
├── parsePastedRows() - 행 목록 파싱
├── parseCalendarGrid() - 달력 시간표 파싱
├── smartParse() - 형식 자동 감지 후 분기
└── AddLectureDialog (component)
    ├── mode: "manual" | "paste"
    ├── rowChecks: Record<number, boolean>
    ├── rowOverrides: Record<number, Partial<ParsedRow>>
    ├── displayRows - 파싱+오버라이드+스토어 자동보완
    ├── validRows - 체크된 행
    ├── addableRows - 체크+완전히 채워진 행
    ├── addManual() - 수기 추가
    └── addPasted() - 붙여넣기 일괄 추가
```
