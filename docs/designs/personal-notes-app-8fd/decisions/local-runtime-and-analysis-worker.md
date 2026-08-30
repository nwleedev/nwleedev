# 로컬 실행과 텍스트 분석 Worker 결정

로컬 모드는 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 현재 과업을 완료할 수 있는 실행 형태다. 현재 독립 실행 배포에는 Next.js 정적 내보내기를 사용하고, 줄 단위 텍스트 분석은 사용자의 요청 뒤 지연 생성한 Dedicated Worker에서 실행한다. 정적 내보내기는 현재 배포 선택이며 로컬 모드의 정의가 아니다. 필요한 경우 같은 Next.js 애플리케이션의 Server Actions와 Route Handlers를 사용하는 선택도 로컬 모드에 포함된다.

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
- 현재 결정은 독립 실행 배포에 정적 내보내기를 사용하고, 지연 생성한 단일 Dedicated Worker와 실제 운영용 결과물 검증을 함께 적용하는 것이다. 오래된 응답 폐기와 오류 처리는 유지한다.

## 승인된 결정과 이유

- 현재 독립 실행 배포는 라우트별 HTML, CSS와 JavaScript를 만드는 Next.js 정적 내보내기를 사용한다. 이후 로컬 과업에 요청 시점 서버 기능이 필요해지면 로컬 모드 요구사항을 바꾸지 않고 배포 형식을 다시 결정할 수 있다.
- 현재 과업은 IndexedDB, Clipboard와 Dedicated Worker만으로 완료할 수 있으므로 Server Actions, 동적 Route Handlers, 요청 시점 서버 렌더링, 계정과 원격 자료 기능을 현재 결과물에 포함하지 않는다. 이후 작업 단위에서 필요한 사용자 동작이 확인되면 구현 전에 이 결정과 배포 형식을 다시 검토한다.
- 애플리케이션 자료를 초기화하기 전에 `location.protocol`, `location.hostname`과 `window.isSecureContext`를 함께 확인한다. secure context인 HTTPS 또는 호스트 이름이 정확히 `localhost`인 secure context HTTP만 지원한다.
- `file:`을 포함한 다른 protocol, `localhost`가 아닌 HTTP와 secure context가 아닌 실행 환경에서는 저장소 Provider와 사용자 과업 화면을 시작하지 않는다. 대신 HTTPS 주소 또는 `http://localhost` 주소로 다시 접속하라는 다음 행동을 안내한다.
- 접속 주소 판정은 현재 문서에 확정된 실행 조건이므로 환경변수나 배포별 분기로 바꾸지 않는다.
- 분석 버튼을 누르기 전에는 Worker를 만들거나 분석을 시작하지 않는다.
- 첫 분석 요청에서 Dedicated Worker를 하나 만들고 현재 실행 동안 재사용한다. 분석 영역의 수명이 끝나면 이벤트 listener와 Worker를 정리한다.
- Worker 진입 파일은 빌드 도구가 정적으로 추적할 수 있는 모듈 기준 상대 URL로 만든다. U1의 최소 운영용 내보내기에서 URL, MIME type과 메시지 왕복을 먼저 확인한다.
- Worker 자산 검증이 실패하면 분석 구현을 진행하지 않고 빌드 구조를 다시 결정한다.
- SharedWorker는 여러 탭 조정 요구가 승인될 때만 다시 검토한다.
- 반복 검증을 기존 package 명령이나 검사 도구로 표현할 수 있으면 같은 목적의 별도 실행 스크립트를 추가하지 않는다. 일회성 도구 판별 입력은 저장소에 fixture로 남기지 않는다.

[Next.js SPA 가이드](https://nextjs.org/docs/app/guides/single-page-applications)는 정적 내보내기를 선택 사항으로 설명하고, [Next.js 정적 내보내기 문서](https://nextjs.org/docs/app/guides/static-exports)는 실행 서버가 필요한 기능을 제공하지 못하는 조건을 설명한다. [Next.js 배포 문서](https://nextjs.org/docs/app/getting-started/deploying)는 Node.js 서버와 정적 내보내기를 서로 다른 배포 방식으로 구분한다. [Next.js Backend for Frontend 가이드](https://nextjs.org/docs/app/guides/backend-for-frontend)는 Server Actions와 Route Handlers가 Next.js 실행 환경을 사용하는 방식과 정적 내보내기에서의 제한을 설명한다. [HTML Web Workers](https://html.spec.whatwg.org/multipage/workers.html)는 Worker의 독립 실행과 생성 비용을 정의한다. [Next.js issue #61787](https://github.com/vercel/next.js/issues/61787)는 Worker URL 표현과 운영용 묶음 결과를 실제 파일에서 확인해야 하는 근거다.

## 예상 결과와 계획 영향

정적 빌드와 Worker 자산은 TDD가 아니라 운영용 결과물의 기본 실행 검사와 실제 브라우저 메시지 왕복으로 검증한다. 접속 주소 판정의 순수 규칙은 `file:`과 `localhost`가 아닌 HTTP를 포함한 입력별 결과로 확인하고, 안내 화면은 실제 브라우저에서 확인한다. Worker 안의 순수 분석기는 TDD를 적용하고, 메시지 규칙, 오류와 오래된 응답 폐기는 브라우저 통합 검사로 확인한다.

## 다시 검토할 조건

- Next.js 기술 스택이 바뀌는 경우
- 로컬 과업에 요청 시점 Next.js 서버 기능이 필요한 경우
- 정적 내보내기를 유지하기 위해 반복 사용하지 않을 서버 또는 변환 스크립트를 추가해야 하는 경우
- 운영용 결과물에서 Worker 자산을 올바르게 제공할 수 없는 경우
- 여러 탭이 하나의 분석 작업 대기열이나 IndexedDB 접근을 조정해야 하는 경우
- 측정 결과 Worker 생성 비용이 대상 입력의 계산 비용보다 큰 경우
- 실제 분석 시간이 사용 흐름을 방해해 사용자 취소가 필요하다는 측정 결과가 나오는 경우
