# 로컬 실행과 텍스트 분석 Worker 결정

로컬 모드는 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 현재 과업을 완료할 수 있는 실행 형태다. 현재 독립 실행 배포는 `next build`와 `next start`를 사용하는 Next.js Node.js 서버로 제공하고, 줄 단위 텍스트 분석은 사용자의 요청 뒤 지연 생성한 Dedicated Worker에서 실행한다. 정적 사이트 산출물은 만들지 않으며, 필요한 경우 같은 Next.js 애플리케이션의 Server Actions와 Route Handlers를 사용하는 선택도 로컬 모드에 포함된다.

## 결정 질문과 요구 결과

[요구사항의 로컬 실행 조건과 완료 증거](../requirements.md#반드시-지킬-조건)는 별도의 애플리케이션 백엔드와 데이터베이스 서버에 연결하지 않고 현재 과업을 완료하며, 독립 실행용 빌드를 HTTPS와 정확한 `localhost` HTTP에서 실행하고, 분석은 명시적인 요청 뒤에만 시작하도록 요구한다. 정적 HTML 산출물은 요구사항이 아니며 필요한 Next.js Server Actions와 Route Handlers를 금지하지 않는다.

## 검토한 선택지

- Next.js 실행 서버도 별도 애플리케이션 백엔드 없이 로컬 모드를 제공할 수 있지만, 현재 과업에는 요청 시점 서버 기능이 필요하지 않다.
- SPA 전용 빌드 도구는 더 단순할 수 있지만 선택한 Next.js 기술 스택을 바꾸는 결정이 필요하다.
- 주 실행 흐름에서 분석하면 줄 수가 늘 때 드래그, 편집과 화면 갱신을 막을 수 있다.
- SharedWorker는 여러 탭의 작업 대기열이나 저장소를 조정할 요구가 없는 현재 범위에 수명 관리만 추가한다.

## 결정 이력

- 초기 권장안은 Next.js 정적 내보내기와 Dedicated Worker를 사용하고 서버, SharedWorker와 계정 기능을 제외하는 것이었다.
- 재검토에서는 운영용 빌드가 Worker 진입 파일을 올바른 URL과 MIME type으로 제공하는지 기능 개발 전에 확인해야 한다는 제약을 추가했다.
- 범위 재검토에서는 사용자 취소가 현재 요구되지 않았고 실제 분석 지연도 측정되지 않았으므로, 취소 메시지와 수명 처리를 초기 구현에서 제외했다.
- 요구사항 정정으로 로컬 모드는 정적 HTML 형식이 아니라 애플리케이션 백엔드 및 데이터베이스 서버로부터의 독립성을 뜻한다고 확정했다.
- 추가 정정으로 같은 Next.js 애플리케이션의 Server Actions와 Route Handlers는 로컬 모드에서도 필요하면 사용할 수 있다고 확정했다.
- 구현 전 검토에서 지원 접속 주소를 문서에만 적고 실행 중 판정과 안내 화면을 작업 단위에 배정하지 않은 공백을 확인했다.
- 통합 검토에서 정적 결과물 전용 기본 실행 스크립트가 IndexedDB 내부 스키마, 화면 순서와 조작 시간까지 직접 고정해 검증 책임을 벗어난 문제가 확인됐다.
- 정적 사이트 배포가 필요하지 않다는 요구사항에 따라 `output: "export"`, 자체 정적 서버와 전용 기본 실행 스크립트를 제거하고 Next.js 운영 서버 및 표준 Playwright Test로 책임을 나누기로 했다.
- Worker 경계 검토에서는 요청과 응답의 메모 및 줄 참조를 결합해 검증하고, 표시 원문을 결과 쌍마다 반복하지 않는 메시지 형태가 필요하다고 확인했다.
- 2026년 9월 4일 접속 안내를 다시 검토했다. 판정만 말하는 제목으로는 다시 열 수 있는 조건을 알기 어려우므로 문제와 허용되는 주소 조건을 함께 안내하기로 했다.
- 같은 날 후속 요구사항에서 접속 제한 화면의 제목을 `잘못된 접근입니다.`로 확정했다. 구체적인 해결 방법은 본문에 남겨 제목만으로 주소 조건을 추측하게 하지 않는다.
- 현재 결정은 Next.js Node.js 서버, 지연 생성한 단일 Dedicated Worker와 실제 운영용 빌드의 브라우저 검증을 함께 적용하는 것이다. 오래된 응답 폐기와 오류 처리는 유지한다.

## 승인된 결정과 이유

- 현재 독립 실행 배포는 `next build`로 운영용 빌드를 만들고 `next start`로 Node.js 서버를 시작한다. 애플리케이션 자료는 IndexedDB에 남으며 이 서버에 자료 저장 책임을 추가하지 않는다.
- 현재 과업은 IndexedDB, Clipboard와 Dedicated Worker만으로 완료할 수 있으므로 Server Actions, 동적 Route Handlers, 요청 시점 서버 렌더링, 계정과 원격 자료 기능을 현재 결과물에 포함하지 않는다. 이후 작업 단위에서 필요한 사용자 동작이 확인되면 구현 전에 이 결정과 배포 형식을 다시 검토한다.
- 호스트 이름이 정확히 `localhost`인 HTTP는 Next.js 운영 서버에서 제공한다. HTTPS는 운영 서버 앞의 reverse proxy 또는 배포 플랫폼이 TLS를 종료하며, 인증서와 개인 키를 다루는 자체 서버를 이 저장소에 추가하지 않는다.
- 애플리케이션 자료를 초기화하기 전에 `location.protocol`, `location.hostname`과 `window.isSecureContext`를 함께 확인한다. secure context인 HTTPS 또는 호스트 이름이 정확히 `localhost`인 secure context HTTP만 지원한다.
- `file:`을 포함한 다른 protocol, `localhost`가 아닌 HTTP와 secure context가 아닌 실행 환경에서는 저장소 Provider와 사용자 과업 화면을 시작하지 않는다. 안내 제목은 `잘못된 접근입니다.`로 쓰고, 본문에서 HTTPS 주소 또는 `http://localhost` 주소로 다시 열라는 다음 행동을 설명한다. `지원하지 않는 접속 주소`, `유효하지 않음`, 내부 판정값과 Web API 이름은 화면에 표시하지 않는다.
- 주소를 확인하는 동안에는 별도 카드, 테두리, 그림자와 채운 표면을 만들지 않고 주 화면의 빈 배경 위에 간결한 진행 상태만 표시한다. 실패 안내도 페이지 안의 유일한 내용을 장식용 카드로 감싸지 않고 제목, 본문과 여백으로 읽기 순서를 만든다.
- 접속 주소 판정은 현재 문서에 확정된 실행 조건이므로 환경변수나 배포별 분기로 바꾸지 않는다.
- 분석 버튼을 누르기 전에는 Worker를 만들거나 분석을 시작하지 않는다.
- 첫 분석 요청에서 Dedicated Worker를 하나 만들고 현재 실행 동안 재사용한다. 분석 영역의 수명이 끝나면 이벤트 listener와 Worker를 정리한다.
- 대기 중인 분석에는 원래 요청의 알고리즘과 입력 메모를 함께 보관한다. 응답의 메모 집합, 표시 원문 줄과 결과 쌍이 원래 요청에 속하지 않거나 메시지 스키마를 통과하지 못하면 Worker를 종료하고 대기 중인 분석을 실패로 마친다. 다음 요청은 새 Worker로 다시 시도한다.
- Worker 응답은 결과가 참조하는 원문 줄을 `sourceLines`에 한 번씩 담고 결과 쌍에서는 메모 참조와 줄 위치만 보낸다. 주 실행 흐름은 검증된 참조를 원문 목록과 연결하며 분석 전처리를 반복하지 않는다.
- Worker 진입 파일은 빌드 도구가 정적으로 추적할 수 있는 모듈 기준 상대 URL로 만든다. U1의 최소 운영용 빌드와 Next.js 서버에서 URL, MIME type과 메시지 왕복을 먼저 확인한다.
- Worker 자산 검증이 실패하면 분석 구현을 진행하지 않고 빌드 구조를 다시 결정한다.
- SharedWorker는 여러 탭 조정 요구가 승인될 때만 다시 검토한다.
- 반복 검증을 기존 package 명령이나 검사 도구로 표현할 수 있으면 같은 목적의 별도 실행 스크립트를 추가하지 않는다. 일회성 도구 판별 입력은 저장소에 fixture로 남기지 않는다.

[Next.js 배포 문서](https://nextjs.org/docs/app/getting-started/deploying)는 `next build`와 `next start`를 Node.js 배포의 표준 명령으로 안내하고, [Next.js CLI 문서](https://nextjs.org/docs/app/api-reference/cli/next)는 `next start`가 운영 모드 서버를 시작한다고 설명한다. [Next.js 자체 호스팅 문서](https://nextjs.org/docs/app/guides/self-hosting)는 공개 배포에서 Next.js 서버 앞에 reverse proxy를 두도록 권장한다. [Next.js SPA 가이드](https://nextjs.org/docs/app/guides/single-page-applications)와 [정적 내보내기 문서](https://nextjs.org/docs/app/guides/static-exports)는 정적 내보내기가 선택 사항이며 서버 기능을 제한한다고 설명한다. [Playwright 설정 문서](https://playwright.dev/docs/test-configuration)는 `webServer`로 대상 애플리케이션 서버를 시작하는 표준 구성을 제공한다. [HTML Web Workers](https://html.spec.whatwg.org/multipage/workers.html)는 Worker의 독립 실행과 생성 비용을 정의한다.

[GOV.UK 오류 메시지 지침](https://design-system.service.gov.uk/components/error-message/)은 `valid`와 `invalid`처럼 해결 방법을 보태지 않는 판정어를 피하고, 무엇이 일어났는지와 어떻게 바로잡을지를 구체적으로 쓰도록 안내한다. 같은 지침은 사용자가 고칠 폼 입력 오류가 아닌 서비스 이용 제한을 필드 오류처럼 표시하지 말고 문제와 다음 행동을 설명하는 별도 화면으로 다루도록 구분한다. [WCAG 2.2 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)은 오류를 텍스트로 설명해야 한다는 최소 조건을 제시하지만 표시 형태를 카드로 요구하지 않는다.

## 예상 결과와 계획 영향

운영용 빌드와 Worker 자산은 TDD가 아니라 Next.js 운영 서버를 시작하는 Playwright Test와 실제 브라우저 메시지 왕복으로 검증한다. IndexedDB repository 자체는 Vitest Browser Mode에서 운영 모듈을 직접 확인한다. 접속 주소 판정의 순수 규칙은 `file:`과 `localhost`가 아닌 HTTP를 포함한 입력별 결과로 확인하고, 안내 화면은 실제 브라우저에서 제목, 다음 행동과 카드 없는 진행 및 실패 상태를 확인한다. Worker 안의 순수 분석기는 TDD를 적용한다. 메시지 규칙과 원래 요청 결합은 경계 입력으로 확인하고, Worker 자산 실패 뒤 재시도, 오래된 응답 폐기와 분석 요청 직후 탐색은 Chromium, Firefox와 WebKit의 운영용 빌드에서 확인한다.

## 다시 검토할 조건

- Next.js 기술 스택이 바뀌는 경우
- 로컬 과업에 요청 시점 Next.js 서버 기능이 필요한 경우
- 운영용 결과물에서 Worker 자산을 올바르게 제공할 수 없는 경우
- Next.js 운영 서버 외에 별도 애플리케이션 백엔드나 데이터베이스 서버가 필요한 사용자 과업이 생기는 경우
- 여러 탭이 하나의 분석 작업 대기열이나 IndexedDB 접근을 조정해야 하는 경우
- 측정 결과 Worker 생성 비용이 대상 입력의 계산 비용보다 큰 경우
- 실제 분석 시간이 사용 흐름을 방해해 사용자 취소가 필요하다는 측정 결과가 나오는 경우
