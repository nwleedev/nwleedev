# UI Design System Proposal v1 반영 위치

`UI Design System Proposal v1`의 결정은 [편집형 단일 페이지 요구사항](../requirements.md), [편집형 시각 방향](../decisions/editorial-direction.md), [홈페이지 문구](homepage-copy.md), [편집형 디자인 조사](editorial-design-system.md)와 [제작 플랜](../plan.md)에 나누어 반영했다. 임시 폴더의 제안서 원본은 추적 파일에 추가하지 않으며 이후 작업은 이 설계 문서를 기준으로 한다.

## 목적과 콘텐츠

제안서의 기술 프로필 목적과 개발자 포지셔닝은 [사이트의 역할과 자료 활용](../requirements.md#사이트의-역할과-자료-활용), [개발자 소개와 편집 기준](../requirements.md#개발자-소개와-편집-기준) 및 [개발자 소개 결정](../decisions/developer-positioning.md)에 반영했다.

Header, Identity, Experience, Open Source, Independent Work, Background, Contact 순서는 [한 페이지의 정보 순서](../requirements.md#한-페이지의-정보-순서)에 반영했다. 개인 프로젝트와 글 목록을 먼저 보여주는 이전 구성은 더 이상 현재 기준이 아니다.

인공지능팩토리의 네 Engineering Contribution과 이전 회사의 압축된 설명은 [Experience](../requirements.md#experience)와 [기여 선정 결정](../decisions/featured-cases.md)에 반영했다. AI Agent Workflow 및 Offline Translation Web App은 [Independent Work](../requirements.md#independent-work)와 [독립 작업 결정](../decisions/project-availability.md)에 반영했다.

방문자에게 보여줄 현재 문구는 [편집형 홈페이지 한국어 문구](homepage-copy.md)에서 관리한다. 수치의 대상과 조건, 역할 표현 및 게재 전에 확인할 링크를 같은 문서에서 구분한다.

## 시각 규칙

Technical Publication, Career Index와 Evidence-driven 방향은 [편집형 시각 규칙](../requirements.md#편집형-시각-규칙)에 반영했다. Pretendard, 글자 크기, 색상 역할, 여백 값, 1200px 내용 폭, 48rem 및 70rem의 페이지 구성 검토값과 컨테이너 쿼리도 같은 절에 기록했다.

제안서의 글꼴과 색상은 더 이상 미결정 항목이 아니다. 다만 글꼴 제공 방식, Header 고정 여부와 실제 한국어 문구에 맞춘 반응형 값은 구현에서 확인한다. 확정한 시작값과 조정 조건은 [편집형 시각 방향 결정](../decisions/editorial-direction.md)에 있다.

## 조작, 접근성과 배제할 표현

링크 상태, 제한된 움직임, 움직임 감소 설정, 문서 구조와 WCAG 2.2 AA 기준은 [조작과 움직임](../requirements.md#조작과-움직임) 및 [접근성](../requirements.md#접근성)에 반영했다. 구체적인 외부 자료와 색상 대비 계산은 [편집형 디자인 조사](editorial-design-system.md)에 있다.

입체 장식, 가짜 회사 화면, 반복되는 큰 카드, Bento grid, 가짜 터미널, 기술 로고 모음과 모든 영역의 등장 애니메이션을 제외하는 조건은 [기본 구성에서 제외하는 표현](../requirements.md#기본-구성에서-제외하는-표현)에 반영했다.

## 구현에서 확정할 내용

제안서가 `로컬 확인 필요`로 남긴 프레임워크, 스타일 작성 방식, 토큰 이름, Pretendard 제공 방식, 아이콘, 지원 브라우저와 검사 방법은 [제작 플랜](../plan.md#구현-환경과-기존-자료-확인)에서 먼저 결정한다.

`DESIGN.md`에는 요구사항을 복사하는 대신 실제 구현에서 사용하는 토큰, 구성 요소, 상태, 반응형 예외와 접근성 확인 결과를 기록한다. 현재 브랜치에는 애플리케이션 소스와 의존성 명세가 없으므로 기술 이름이나 파일 구성을 제안서만으로 확정하지 않는다.
