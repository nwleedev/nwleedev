# 편집형 홈페이지 한국어 문구 초안

아래 문구는 [편집형 단일 페이지 요구사항](../requirements.md)의 Identity, Experience, Open Source, Independent Work, Background와 Contact에 넣을 초안이다. 방문자에게 보여줄 본문을 먼저 적고, 마지막 절에서 근거와 게재 전 확인 사항을 구분한다.

## 방문자에게 보여줄 본문

### 이노원

Frontend Engineer

서비스에서 발생하는 문제의 원인을 찾고, 데이터 흐름과 비동기 상태를 개선하며 배포 후 실제 동작까지 확인합니다.

TypeScript와 React 기반 웹 서비스에서 실시간 데이터, 장시간 작업, 운영 대시보드와 서비스 품질 문제를 해결해 왔습니다.

링크: GitHub, Blog, LinkedIn, Résumé

### Experience

#### 인공지능팩토리

2025 — Present

Frontend Engineer

공공기관 대상 웹 서비스 구축 프로젝트에서 실시간 데이터 처리, 장시간 비동기 작업, 운영 대시보드와 품질 검증을 담당했습니다.

##### Data & Monitoring

운영 대시보드의 데이터 조회와 변환 구조를 개선하고, 실제 응답을 기준으로 잘못 표시되던 지표를 교정했습니다.

10분 기준 데이터 전송량 `96.5 MB → 41 KB`

Next.js, Prometheus, Recharts

##### Async State & Realtime

5~10분 동안 실행되는 문서 생성 작업의 상태 확인을 반복 조회에서 이벤트를 계기로 서버 상태를 다시 확인하는 방식으로 변경했습니다.

상태 요청 `100~200회 → 10회 이하`

React, SSE, Next.js

##### Browser Runtime & Realtime Data

대용량 응답 처리와 실시간 데이터 병합 중 발생하던 브라우저 문제를 해결했습니다.

약 5 MB 응답 처리 중 발생한 `3~4초 화면 정지 해결`

SharedWorker, REST, Streaming

##### Reliability & Delivery

배포 전에 실제 사용 흐름을 반복해서 확인할 수 있는 E2E 체계를 만들고 인증 상태 문제를 발견했습니다.

`70개 이상의 실행 가능한 E2E 시나리오`

Playwright, Authentication, QA

#### 크러스트유니버스 / Quarkonix

2022 — 2024

Frontend Engineer

React와 TypeScript 기반 서비스에서 발생한 오류와 성능 저하의 원인을 찾고 데이터 갱신, 로딩 성능과 실시간 연결을 개선했습니다.

- 주기적인 refetch 환경에 optimistic update를 적용해 중복 요청을 줄이고 사용자 화면과 서버 값이 달라지는 문제를 해결했습니다.
- Vite 설정과 React lazy loading을 적용하고 다른 프론트엔드 프로젝트에서도 재사용할 수 있도록 적용 절차를 문서화했습니다.
- Chrome DevTools로 간헐적인 WebSocket 연결 중단 원인을 확인하고 실시간 데이터 갱신 문제를 해결했습니다.

### Open Source

#### React Router

React Router v7.13.1

선택적 URL parameter가 `/` 구분자 없는 주소까지 잘못 매칭되는 문제를 수정하고 기존 dot-suffix 동작을 보존하는 회귀 검사를 추가했습니다.

링크: PR #14689, Release v7.13.1

#### Outline

Outline v1.2.0

인라인 이미지 앞의 마지막 글자를 Delete 또는 Backspace로 지울 수 없는 편집기 문제를 수정하고 표 안팎의 삭제 동작을 확인했습니다.

링크: PR #10759, Release v1.2.0

### Independent Work

#### AI Agent Workflow

요구사항, 조사, 결정과 구현을 구분해 작업하도록 저장소 규칙과 Skill을 구성하고 여러 저장소의 에이전트 설정에 적용했습니다.

2026 — Present

Node.js, Repository Rules, Text Validation

#### Offline Translation Web App

네트워크가 없는 환경에서도 앱과 번역 기능을 사용할 수 있도록 브라우저 캐시, Web Worker, IndexedDB와 배포 자동화를 구성했습니다.

2025

Web Worker, IndexedDB, Offline, GitHub Actions

### Background

- 단국대학교 응용컴퓨터공학과, 2016 — 2022
- 정보처리기사, 2022
- TOEIC Speaking IH, 2025

### Contact

Email, GitHub, Blog, LinkedIn, Résumé

## 문구의 근거와 게재 판단

Identity는 [개발자 소개에서 앞세울 가치](../decisions/developer-positioning.md)를 반영한다. 운영 문제, 데이터 흐름, 비동기 상태와 배포 후 확인을 함께 말하되 모든 경험에 관여한 것처럼 확대하지 않는다.

네 Engineering Contribution의 사실과 수치 조건은 [이력서와 포트폴리오 분석](content-and-site-direction.md) 및 [대표 경험의 편집 근거](featured-case-copy.md)를 대조했다. 수치는 비교 조건과 함께 표시하고, 상세한 구현 절차는 홈페이지 본문에 추가하지 않는다.

오픈소스 기여는 실제 PR과 공식 릴리스 링크가 준비된 경우에만 게재한다. Independent Work의 이용 및 소스 링크도 외부에서 열 수 있는 주소를 확인한 뒤 추가한다.

Offline Translation Web App의 `30초 이내 배포`는 비교 조건을 추가로 확인해야 하므로 현재 방문자용 문구에서 제외했다. 실제 Email, GitHub, Blog, LinkedIn과 Résumé 주소도 게재 전에 확인한다.
