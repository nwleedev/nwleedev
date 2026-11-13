# 로컬 프로젝트 화면의 라우팅

Vite와 React Router의 Data Mode를 사용한다. 프로젝트 목록과 편집 화면을 구분하고, 편집 화면을 열 때 URL에 해당하는 프로젝트를 브라우저 저장소에서 읽는다. [React Router Data Mode](https://reactrouter.com/start/modes)

Declarative Mode는 화면을 연결할 수 있지만, 프로젝트를 열기 전의 데이터 조회와 조회 실패 처리는 화면에서 따로 구성해야 한다. Data Mode는 경로에 연결된 로더와 오류 처리를 제공한다. Next.js App Router도 검토했다. 초기 범위에서는 프로젝트가 브라우저에 저장되므로 Vite로 정적 배포하고 브라우저에서 프로젝트를 읽는다.

SSR이 필요한 화면이나 SSR과 브라우저 전용 코드의 호환 문제가 생기면 [백로그](../requirements.md#백로그)에 따라 대응 방식을 검토한다.
