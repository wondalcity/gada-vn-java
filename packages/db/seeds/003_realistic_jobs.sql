-- ============================================================
-- GADA VN — Realistic Job Seed Data (003)
-- Replaces / enriches 002 jobs with proper requirements format
-- and realistic manager-written descriptions.
-- SAFE TO RE-RUN: uses ON CONFLICT DO UPDATE for jobs.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- UPDATE existing jobs with correct requirements format
-- (002 used experience_months; frontend expects minExperienceMonths)
-- ─────────────────────────────────────────────────────────────

UPDATE app.jobs SET
  title = '콘크리트 타설 — 하노이 오피스텔 A동 3층',
  description = '하노이 Thanh Xuân 구 오피스텔 신축 현장입니다.
3층 슬라브 콘크리트 타설 작업으로 숙련된 작업자를 모집합니다.

■ 작업 내용
- 펌프카 이용 콘크리트 타설
- 레벨 확인 및 마감 고르기
- 양생 후 청소 보조

■ 참고 사항
- 안전화, 안전모 지참 필수 (현장 지급 가능)
- 작업 당일 오전 6:50까지 현장 도착
- 우천 시 일정 변경될 수 있음',
  requirements = '{"minExperienceMonths": 12, "notes": "콘크리트 타설 경험 1년 이상 필수. 고소 작업 가능자 우대. 안전 교육 이수자 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'concrete-office-a-floor3';

UPDATE app.jobs SET
  title = '철근 조립 — 하노이 오피스텔 A동 4층 기둥',
  description = '오피스텔 A동 4층 기둥 철근 조립 작업입니다.
도면에 따라 기둥 주근 및 띠철근 조립 작업을 진행합니다.

■ 작업 내용
- 기둥 주근(D22, D25) 배근 및 결속
- 띠철근 간격 유지 및 결속
- 스페이서 설치

■ 자격 요건
- 철근 기능사 또는 동등 경력자
- 도면 해독 가능자

■ 현장 정보
- 현장 내 식사 제공 (조식·중식)
- 안전장비 일체 현장 지급',
  requirements = '{"minExperienceMonths": 24, "notes": "철근 기능사 자격증 보유 또는 철근 조립 경력 2년 이상. 도면 해독 가능자. 용접 자격증 보유 시 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'steel-office-a-floor4';

UPDATE app.jobs SET
  title = '전기 배선 — 롯데몰 하노이 지하 1층',
  description = '롯데몰 하노이 확장 공사 현장 지하 1층 전기 배선 작업입니다.
대형 쇼핑몰 규모의 배선 공사로 숙련된 전기 기능사를 모집합니다.

■ 작업 내용
- 주배전반 ~ 분전반 간 간선 배관·배선
- 콘센트·조명 분기회로 배관·배선
- 접지선 시공

■ 필수 자격
- 전기 기능사 1급 또는 2급 (필수)
- 전기 안전 교육 이수자

■ 현장 조건
- 지하 작업 (조명 충분히 확보됨)
- 현장 식사 3식 제공
- 교통비 별도 지급 (왕복 VND 50,000)',
  requirements = '{"minExperienceMonths": 36, "notes": "전기 기능사 자격증 필수 (1급 또는 2급). 대형 건물 배선 경력 3년 이상 우대. 안전 교육 이수 필수."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'electrical-lotte-b1';

UPDATE app.jobs SET
  title = '배관 설치 — 롯데몰 2층 화장실 위생설비',
  description = '롯데몰 하노이 2층 공용 화장실 위생설비 배관 공사입니다.

■ 작업 내용
- 급수관 (PP-R Φ20, Φ25) 설치
- 배수관 (PVC Φ50, Φ100) 설치
- 대소변기 연결 배관
- 수압 테스트 보조

■ 우대 조건
- 배관 기능사 자격증 보유
- 대형 상업시설 배관 시공 경험',
  requirements = '{"minExperienceMonths": 24, "notes": "급배수 배관 경력 2년 이상. 배관 기능사 자격증 보유자 우대. 상업시설 화장실 시공 경험자 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'plumbing-lotte-floor2';

UPDATE app.jobs SET
  title = '콘크리트 기초 타설 — 호치민 빌라 B단지',
  description = '호치민 Quận 3 빌라 신축 현장입니다.
기초 슬라브 콘크리트 타설 작업으로 초보자도 지원 가능합니다.

■ 작업 내용
- 기초 거푸집 내 콘크리트 타설
- 바이브레이터 이용 다짐 작업
- 표면 고르기 및 마감

■ 복리후생
- 현장 숙소 제공 (2인 1실)
- 3식 제공
- 교통비 지원

■ 호치민 현지 거주자 우대',
  requirements = '{"minExperienceMonths": 0, "notes": "경력 무관, 성실한 분이라면 누구나 지원 가능합니다. 현장 안전 교육은 입장 시 실시합니다."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": true, "insurance": false}'::jsonb
WHERE slug = 'concrete-villa-b-foundation';

UPDATE app.jobs SET
  title = '미장 마감 — 호치민 빌라 B단지 내부 전체',
  description = '호치민 빌라 B단지 내부 전체 미장 마감 작업입니다.
신축 빌라 내부벽 미장으로 장기 작업 가능합니다.

■ 작업 내용
- 시멘트 모르타르 바름 (초벌·재벌)
- 석고 보드 이음부 처리
- 코너 비드 설치 및 마감

■ 작업 기간
- 약 3주 (연속 작업 가능자 우대)

■ 주의 사항
- 실내 작업이므로 방진 마스크 지참 권장
- 작업복은 개인 지참',
  requirements = '{"minExperienceMonths": 12, "notes": "미장 경력 1년 이상. 석고 미장 및 시멘트 미장 모두 가능한 분. 장기 작업 가능자 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'masonry-villa-b-interior';

UPDATE app.jobs SET
  title = '철근 조립 — 빈홈 스마트시티 C동 5층',
  description = '하노이 Nam Từ Liêm 구 빈홈 스마트시티 고층 아파트 현장입니다.
C동 5층 바닥 슬라브 및 기둥 철근 조립 작업입니다.

■ 작업 내용
- 슬라브 하부근·상부근 배근
- 기둥 주근 이음 및 띠철근 조립
- 개구부 보강근 배치

■ 현장 정보
- 고층 작업이므로 안전 고리 착용 필수
- 현장 안전 교육 입장 전 필수 이수
- 식사 및 교통비 지원

■ 급여 조건
- 기본 일당 VND 650,000
- 야근 시 추가 지급 협의',
  requirements = '{"minExperienceMonths": 24, "notes": "철근 조립 경력 2년 이상 필수. 고층 작업 경험자 우대. 안전 교육 이수 필수. 철근 기능사 자격증 보유자 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'steel-vinhome-c-floor5';

UPDATE app.jobs SET
  title = '아파트 세대 전기 배선 — 빈홈 스마트시티',
  description = '빈홈 스마트시티 아파트 각 세대 내부 전기 배선 작업입니다.
세대당 동일한 작업 반복으로 효율적인 작업이 가능합니다.

■ 작업 내용 (세대당)
- 분전반 배선 및 차단기 결선
- 조명 회로 배관·배선
- 콘센트·스위치 배관·배선
- 에어컨 전용 회로 설치

■ 작업 조건
- 하루 3~4세대 작업 목표
- 자재는 현장 지급
- 공구는 개인 지참 (일부 현장 대여 가능)',
  requirements = '{"minExperienceMonths": 36, "notes": "전기 기능사 자격증 필수. 아파트 세대 내부 배선 경력 3년 이상. 분전반 결선 및 차단기 설치 경험 필수."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'electrical-vinhome-units';

UPDATE app.jobs SET
  title = '욕실 타일 시공 — 빈홈 스마트시티 각 세대',
  description = '빈홈 스마트시티 각 세대 욕실 타일 시공 작업입니다.
300×600 포세린 타일 시공으로 숙련공을 모집합니다.

■ 작업 내용
- 욕실 벽면 타일 붙임 (줄눈 포함)
- 욕실 바닥 타일 시공 (구배 주의)
- 타일 절단 및 마감 처리

■ 작업 조건
- 세대당 욕실 1.5개 기준 (약 2일/세대)
- 타일 및 접착제 현장 지급
- 타일 커터기 개인 지참 권장

■ 위생
- 식사 및 정수기 현장 제공',
  requirements = '{"minExperienceMonths": 12, "notes": "욕실 타일 시공 경력 1년 이상. 포세린 타일 (300×600 이상) 시공 가능자. 타일 절단 및 줄눈 마감 경험 필수."}'::jsonb,
  benefits = '{"meals": false, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'tiling-vinhome-bathroom';

UPDATE app.jobs SET
  title = '잡부 — 자재 운반 및 현장 정리 (오피스텔 A동)',
  description = '하노이 오피스텔 A동 현장 잡부 모집입니다.
경력 무관, 성실하신 분이라면 누구나 지원 가능합니다.

■ 작업 내용
- 층간 자재 (블록, 모르타르, 자재 등) 운반
- 시공 후 잔재 정리 및 폐기물 처리
- 기능공 작업 보조

■ 주의 사항
- 무거운 자재 운반이 있으므로 체력 필수
- 안전화 개인 지참 (현장 지급 가능)
- 성실하고 시간 약속 지키는 분 환영',
  requirements = '{"minExperienceMonths": 0, "notes": "경력 무관. 성실하고 체력이 좋은 분. 안전화 착용 필수 (개인 지참 또는 현장 지급)."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": false}'::jsonb
WHERE slug = 'general-office-a-transport';

UPDATE app.jobs SET
  title = '콘크리트 옥상 방수층 타설 — 롯데몰 하노이',
  description = '롯데몰 하노이 확장관 옥상 방수 콘크리트 타설 작업입니다.

■ 작업 내용
- 옥상 PE 필름 설치 및 스티로폼 단열재 배치
- 철근망 설치 (D10 @200)
- 콘크리트 타설 및 마감 (두께 100mm)
- 드레인 주변 방수 처리

■ 작업 특이사항
- 옥상 고소 작업이므로 안전 장비 필수
- 기상 상황에 따라 일정 조정 가능
- 현장 집결 후 차량 이동 있음',
  requirements = '{"minExperienceMonths": 12, "notes": "콘크리트 타설 경력 1년 이상. 방수 콘크리트 또는 옥상 타설 경험자 우대. 고소 작업 가능자."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'concrete-lotte-rooftop';

UPDATE app.jobs SET
  title = '현장 정리 및 청소 잡부 — 호치민 빌라 B단지',
  description = '호치민 Quận 3 빌라 B단지 현장 청소 및 정리 작업입니다.
준공 전 최종 정리 작업으로 세심한 분을 모집합니다.

■ 작업 내용
- 각 층별 잔재 및 폐자재 수거·분류
- 먼지 및 시멘트 찌꺼기 청소
- 창호 보양재 제거 및 유리 청소
- 각 세대 내부 청소

■ 현장 정보
- 총 10명 모집 (팀 작업)
- 호치민 거주자 우대
- 중식 및 교통비 지원',
  requirements = '{"minExperienceMonths": 0, "notes": "경력 무관. 꼼꼼하고 성실한 분 환영. 청소 및 정리 작업 경험자 우대."}'::jsonb,
  benefits = '{"meals": true, "transport": true, "accommodation": false, "insurance": false}'::jsonb
WHERE slug = 'general-villa-b-cleanup';

UPDATE app.jobs SET
  title = '아파트 복도 미장 마감 — 빈홈 스마트시티',
  description = '빈홈 스마트시티 아파트 각 층 공용 복도 미장 마감 작업입니다.

■ 작업 내용
- 공용 복도 벽면 시멘트 미장 (초벌·정벌)
- 코너 처리 및 문틀 주변 미장
- 마감 확인 및 보수 작업

■ 현장 규모
- 전 40개 층 복도 미장 (장기 작업)
- 층당 2인 1조 작업

■ 조건
- 식사 제공 (중식)
- 안전 장비 현장 지급',
  requirements = '{"minExperienceMonths": 6, "notes": "미장 경력 6개월 이상. 아파트 공용부 미장 경험자 우대. 장기 작업 가능자 (최소 2주)."}'::jsonb,
  benefits = '{"meals": true, "transport": false, "accommodation": false, "insurance": true}'::jsonb
WHERE slug = 'masonry-vinhome-corridor';

COMMIT;
