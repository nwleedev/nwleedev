# 경력 수치와 개인 프로젝트 소개의 보강 근거

홈페이지는 확인된 경력 수치를 갱신하고, 라이브러리 구성 경험과 두 개인 프로젝트의 목적 및 판단을 보강한다. Personal Notes Workspace에는 필요한 문구를 조합해 다시 쓰는 목적, 원본과 복사할 항목을 구분한 판단, 기기에 맞춰 같은 작업을 제공한 경험을 우선 제안한다.

이 조사는 [Experience](../requirements.md#experience)와 [Projects](../requirements.md#projects)를 구현할 때 소개할 사실과 표현의 범위를 정하는 자료다. 2026년 10월 19일 생성 이력서 전체 2쪽, 현재 홈페이지 문구, 기존 메모 앱 평가, [메모 앱 코드의 확인 버전](https://github.com/nwleedev/nwleedev/tree/f12ff7de38d6b64b6dc42325366675cfe5778591/apps/notes)과 공식 문서를 대조했다. 회사 업무의 측정 원본을 감사한 결과는 아니다. 소개 문장의 후보는 [한국어 초안](homepage-copy.md)에서 관리한다.

## 회사 기여의 갱신 기준

이력서 1쪽의 최대 330 MB 응답과 최대 프레임 갱신 시간 간격 1,316.6 ms에서 16.8 ms로의 개선을 현재 기준으로 사용한다. API 요청, JSON 분석과 표시값 변환을 Web Worker로 분리한 모듈이 근거다. 홈페이지의 이전 3~4초 정지 문장은 이 확인값으로 교체한다. 최대 프레임 간격을 평균 처리 시간이나 FPS로 바꾸지 않는다.

문서 생성은 5~10분 작업의 상태 확인 API 요청이 150~200회에서 30회 이하로 줄었다는 이력서 1쪽의 확인값을 사용한다. 기존 문구의 작업당 10회 이하와 3초 간격의 예상 100~200회 비교를 교체한다. 작업 완료가 빨라졌다는 해석을 보태지 않고 진행 상황 안내, 이동 확인과 서버 상태 재조회는 유지한다.

대시보드의 600초는 현재 문구의 10분과 같은 구간이며 96.5 MB에서 41 KB라는 전송량도 같다. 여기에 브라우저의 Prometheus 직접 호출을 방지하도록 Next.js API를 설계한 사실을 보탠다. 표시값 교정과 전송량 감소를 유지하면서 조회를 맡는 API까지 설명할 수 있다.

라이브러리 구성은 같은 이력서 1쪽에 있는 별도의 경험이다. 단독 실행하던 프론트엔드를 다른 앱에 통합할 수 있도록 Vite 빌드, 타입 선언, CSS와 Provider 연결을 정리했다. 기존 이전 회사의 Vite 로딩 개선과는 목적이 다르므로 합치지 않는다. 회사 공통 라이브러리 전체를 설계했다거나 여러 서비스에 이미 도입됐다는 주장은 자료에 없다.

## AI Agent Workflow에 보탤 내용

[Docs System의 한국어 README](https://github.com/nwleedev/docs-system/blob/183a1c7a329917318cbe00e0523696ae8a0cecf8/README.ko.md)는 저장소의 코드, 설정과 결정에 맞는 규칙만 선택하고 설계 및 개발 지침을 나눠 관리하는 목적을 설명한다. 모든 저장소에 같은 지침을 복사했다는 소개보다, 작업의 근거와 결정을 구분해 다시 확인하도록 했다는 설명이 자료와 맞는다. 이력서 2쪽은 여러 저장소에 적용한 사실을 뒷받침한다.

같은 버전의 [검사기 입력과 실행](https://github.com/nwleedev/docs-system/blob/183a1c7a329917318cbe00e0523696ae8a0cecf8/skills/use-better-terms/scripts/scan.mjs)은 `--changed`, `--file`, `--stdin`을 지원한다. 일반 검사에서는 결과를 JSON으로 내보낸다. [한국어 검사 모듈](https://github.com/nwleedev/docs-system/blob/183a1c7a329917318cbe00e0523696ae8a0cecf8/skills/use-better-terms/scripts/korean-expressions.mjs)은 NFD 정규화와 원문 위치 대응을 사용한다.

따라서 현재의 추상적인 검사 소개에 서로 다른 한글 표기 형태와 여러 입력 방식을 처리한 사실을 보탤 수 있다. 검사기가 문서를 자동으로 고친다고 설명하지 않는다. [표현 검토 Skill](https://github.com/nwleedev/docs-system/blob/183a1c7a329917318cbe00e0523696ae8a0cecf8/skills/use-better-terms/SKILL.md)은 경고의 문맥을 판단하고 뜻을 보존하는 대안을 적용하도록 정한다. 검출과 실제 문구 개선은 구분할 필요가 있다.

## Personal Notes Workspace에 보탤 내용

### 반복 문구를 고르고 조합하는 목적

소개는 새 기능의 수보다 반복 입력과 메모 증가의 원인을 먼저 설명한다. 기존 [사용 목적 조사](../../notes-independent-work-3c7a/references/workflow-and-input.md#직접-사용하면서-정의한-문제와-선택)에는 AI 지침과 스킬 호출 문구를 반복 입력한 불편, 입력 및 출력 파일마다 명령어 메모가 늘어난 문제가 기록되어 있다. 이 근거는 현재도 유효하다.

비교 자료인 [Raycast Snippets](https://manual.raycast.com/snippets)는 자주 쓰는 텍스트의 저장과 삽입을, [Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)는 사용 시 바뀌는 값의 대입을 설명한다. [Obsidian Templates](https://obsidian.md/help/plugins/templates)는 미리 작성한 텍스트와 날짜 및 제목 변수의 삽입을 설명하며, 짧은 원문은 “insert pre-defined snippets of text”다. 반복 텍스트와 바뀌는 값을 나누는 방식은 다른 도구에서도 확인된다.

이 비교로 메모 앱의 독창성이나 다른 도구보다 뛰어난 성능을 주장할 수는 없다. 홈페이지에서는 필요한 지침을 그때그때 선택하고 순서를 정해 하나의 입력으로 가져가는 사용 상황을 구체적으로 설명하는 편이 낫다. 외부 기능을 새로 도입하는 제안은 아니다.

### 원본을 유지하면서 복사할 구성을 바꾸는 판단

현재 [메모 추가](../../../../apps/notes/src/features/add-note-to-batch-copy/model/add-note.ts)는 원문과 수정 번호를 복사할 항목에 보관한다. [일괄 복사 명령](../../../../apps/notes/src/entities/batch-copy/model/batch-copy-commands.ts)은 그 작업 사본의 순서, 복제, 제거와 복원을 처리하고 저장된 구분자로 텍스트를 합친다. [변경 저장](../../../../apps/notes/src/features/edit-batch-copy/model/save-changes.ts)은 일괄 복사 자료를 저장한다.

이 사실은 필요한 순서로 복사할 구성을 바꿀 때 원본 메모를 같은 방식으로 고칠 필요가 없다는 사용상의 이점을 뒷받침한다. 단순히 순서 변경 오류를 수정했다고 나열하는 대신, 원본을 다시 사용할 수 있게 두고 이번 작업의 구성만 조정하려고 두 자료를 구분했다는 설명을 제안한다. 오류가 완전히 사라졌다는 성과로 확대하지 않는다.

### 명령어가 늘어나는 문제를 템플릿으로 풀어낸 판단

[템플릿 편집](../../../../apps/notes/src/entities/template/model/edit-segments.ts)은 사용자가 원문의 일부를 입력 항목으로 정할 수 있게 하고, [문장 생성](../../../../apps/notes/src/entities/template/model/render-template.ts)은 고정된 문구와 입력값을 합친다. [템플릿 제안](../../../../apps/notes/src/features/suggest-template/model/suggestion.ts)은 두 문장의 공통 부분과 다른 부분을 템플릿 후보로 만든다.

소개에서는 입력 및 출력 파일명만 바뀌는 명령어를 매번 별도 메모로 만들던 불편과, 같은 문장에서 필요한 값만 바꾸도록 한 판단을 연결한다. 알고리즘 이름과 함수 목록은 홈페이지 설명의 중심으로 삼지 않는다. AI가 문장의 의미를 이해하거나 명령을 실행하는 기능으로 소개할 근거도 없다.

### 기기에 맞게 같은 작업을 제공한 경험

[현재 모바일 조작 결정](../../personal-notes-app-8fd/decisions/note-copy-and-edit.md#모바일-메모의-현재-조작)은 짧은 터치 복사, 길게 눌러 일괄 복사 추가와 더보기에서 수정을 구분한다. 현재 [모바일 카드](../../../../apps/notes/src/_pages/notes/ui/mobile-note-card.tsx)와 [길게 누르기 처리](../../../../apps/notes/src/_pages/notes/model/use-mobile-note-long-press.ts)에서도 이 구분을 확인했다. 이전 평가의 모바일 조사 단계에서 실제 조작을 제공하는 단계로 근거가 늘었다.

2026년 10월 19일 MCP 브라우저로 실제 서비스의 1280×720 첫 화면과 템플릿 화면을 읽었다. 첫 화면에서는 메모와 일괄 복사 진입을, 템플릿 화면에서는 직접 작성 및 분석 결과를 이용하는 선택지를 확인했다. 데이터를 입력하거나 복사 및 저장 동작을 실행하지 않았으므로 이 관찰로 전체 기능의 성공이나 모바일 사용성을 판정하지 않는다.

홈페이지에는 구체적인 손가락 조작 안내보다, 데스크톱에서는 메모를 보며 문구를 고르고 모바일에서는 복사, 선택과 편집이 중복되지 않도록 나눈 판단을 압축해서 제안한다. 사용자가 작업의 다음 단계를 알 수 있게 한 경험을 보태되 전체 기기의 접근성 충족이나 조작 속도 개선을 주장하지 않는다.

### 선별할 소개 내용

기존 항목을 유지하면서 다음 연결이 드러나도록 보강한다. 문단 수는 내용에 맞춰 정한다.

- 반복 지침과 명령어 메모가 늘어난 불편에서 출발해, 필요한 문구를 조합하고 달라지는 값만 바꾸도록 한 목적과 선택.
- 원본과 복사할 작업 사본을 구분하고, 직접 사용하며 기기별 선택과 편집 방법을 개선한 경험.

텍스트 분석, 사용 빈도, 저장 실패 복구와 개별 수정 기록은 위 설명을 보충하는 후보로 남긴다. 기능을 모두 열거하거나 검사 통과 건수를 프로젝트의 사용 성과로 바꾸지 않는다. AI Agent Workflow는 작업 기준을 정하는 경험을, 메모 앱은 그때 필요한 텍스트를 구성해 다시 사용하는 경험을 설명한다.

## 홈페이지 구현에 적용할 패턴

Astro 7.3.3과 현재 JSON 문구 자료형을 유지한다. [Astro 컴포넌트 문서](https://docs.astro.build/en/basics/astro-components/)는 정적 HTML을 만들고 props로 자료를 받는 구성을 설명한다. 짧은 원문은 “HTML-only templating components with no client-side runtime”이다. [JSON import 안내](https://docs.astro.build/en/guides/imports/#json)는 JSON을 직접 읽는 방식을 지원한다. 두 문서는 2026년 10월 19일의 현행 안내이며 이 작업에서 의존성 변경은 필요하지 않다.

이 근거와 [저장소 개발 지침](../../../dev/frontend/astro-fsd-tailwind.md)에 따라 데이터 기반 렌더링, 데이터와 표시 책임 분리, 컴포넌트 합성을 적용한다. 사실을 보강할 때는 JSON의 본문 배열을 바꾸고 기존 `CompanyExperience`, `ContributionBlock`과 `ProjectsSection`을 재사용한다. 새 전용 카드, 수치 variant나 상태 관리 코드를 만들 필요가 없다.

이 패턴은 홈페이지를 구성하는 방식이다. 소개에 나오는 Web Worker, Next.js API와 Vite 라이브러리 설정을 `apps/entry`에 새로 구현한다는 뜻이 아니다. 공통 컴포넌트로 합칠 때에도 같은 의미와 접근성 규칙을 공유하는 기존 `MetadataLine`과 `ExternalTextLink`를 사용한다.
