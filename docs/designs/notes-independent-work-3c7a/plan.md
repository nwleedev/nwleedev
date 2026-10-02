# 개인 메모 앱의 소개 가치 평가 플랜

반복 지침과 명령어 관리의 불편을 직접 정의하고 일괄 복사와 템플릿을 선택한 기여를 근거로 Independent Work 추가를 권고한다. 개별 커밋의 입력 및 저장 문제 해결을 그 목적에 연결한다. 항목 등록과 애플리케이션 변경은 포함하지 않는다.

기준은 [요구사항의 필요한 결과와 완료 자료](requirements.md)다. 이후 화면을 변경하게 되면 [개발 지침](../../dev/README.md)과 [Astro 구현 지침](../../dev/frontend/astro-fsd-tailwind.md)을 적용한다.

## 평가 단위와 완료 근거

평가는 아래 순서의 문서 작성 단위로 구성한다. 각 단위의 완료 기준은 연결된 문서에서 확인할 수 있으며 모두 완료됐다. 앱과 테스트 코드를 작성하는 단위는 없어 TDD를 적용하지 않는다.

1. 사이트의 역할과 선정 기준을 판단한다. `references/assessment.md`에 현재 소개와 기존 선정 기록을 연결하고, 새 항목이 보태는 역량을 설명하면 완료다. [entry의 역할](references/assessment.md#appsentry의-역할과-개발-의도)에 그 근거가 있다.
2. 채용 요구와 경험 서술 기준을 비교한다. `references/hiring-and-writing.md`에 각 기준의 출처, 확인일, 모집 상태와 메모 앱에 적용할 내용을 기록하면 완료다. [여섯 기업의 경력 채용 조사](references/hiring-and-writing.md)에서 확인할 수 있다.
3. 커밋별 소개 가치를 판단한다. `references/commit-assessment.md`에 현재 이력 18개를, `references/squashed-history.md`에 중복을 제외한 통합 전 변경 175개를 평가하면 완료다. [현재 이력](references/commit-assessment.md)과 [통합 전 이력](references/squashed-history.md)은 수정된 결함, 검사에서 만든 실패와 이후 제거된 동작을 구분한다.
4. 사용 목적과 직접 정한 기여를 확인한다. `references/workflow-and-input.md`에 반복 지침 및 명령어 메모의 불편, 기능 선택과 드래그 세 사례의 원인 및 수정 뒤 동작을 연결하면 완료다. [사용 목적과 입력 문제](references/workflow-and-input.md)는 회고로 확인한 선택과 코드로 확인한 동작을 구분한다.
5. 선정 이유와 소개 문구를 제안한다. 앞의 근거를 바탕으로 `references/assessment.md`에 추가 권고 또는 보류 이유, 한국어 및 영어 문구와 후속 조건을 기록하면 완료다. [소개 가치 평가](references/assessment.md)는 실제 목적과 직접 정한 기여를 앞에 둔 추가 권고를 담는다.

실행 근거는 2026년 10월 2일 로컬 운영 빌드에서 저장, 복구와 분석 시나리오 다섯 개를 브라우저 3종으로 확인한 15개 통과 기록이다. [실행 확인 범위](references/assessment.md#2026년-10월-2일-확인한-실행-결과)에 검사 대상과 실패를 주입한 조건이 있다.

## 항목 추가를 선택할 때의 후속 적용안

항목 추가와 소개 문구가 확정되면 아래 순서로 사이트에 반영한다. 다음 절차는 후속 제안이다.

1. 소개 문구와 링크를 선택한다. [소개안](references/assessment.md#independent-work에-실을-문구-제안)에서 실제 목적과 직접 정한 기여를 담은 문구를 확정한다. 이용 성과나 개별 수정의 직접 역할을 더하려면 [추가 사실](references/commit-assessment.md#선정-판단과-확인할-사실)을 확인한다. 링크는 실행 서비스와 검토한 소스를 구분해 표시한다.
2. 사이트 선정 기록을 반영한다. `docs/designs/developer-portfolio-f4b7/requirements.md`의 Independent Work에 필요한 변경을 제안하고, 문구가 확정되면 `decisions/project-availability.md`에 새 선정 이유를 반영한다. 메모 앱의 필수 제외 기록과 새 소개가 모순되지 않으면 완료다.
3. 소개 내용을 반영한다. `apps/entry/src/shared/terms/ko.json`과 `en.json`에 같은 목적, 확인된 기여, 기간과 링크를 담는다. 기존 한 페이지 구성과 다른 항목의 표시 및 링크를 유지하고, 두 언어가 같은 내용을 전달하는지 확인한다.
4. 소개 화면을 확인한다. [개발 지침](../../dev/README.md)과 [Astro 구현 지침](../../dev/frontend/astro-fsd-tailwind.md)의 검사 및 빌드 기준을 적용하고, 한국어와 영어 화면에서 항목과 링크를 확인한다. 새 테스트 코드 작성이나 별도 상세 화면 제작은 이 제안에 포함하지 않는다.

## 평가를 멈추는 조건

수치, 개인 역할이나 이용 성과의 근거가 없으면 그 주장을 보류한다. 확인된 문제 정의와 기능 선택은 소개할 수 있다. 실제 항목 등록은 소개 문구와 선정 기록을 확정한 뒤 진행한다.
