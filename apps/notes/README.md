# 개인 메모 애플리케이션 실행

개인 메모 애플리케이션은 `apps/notes/`에 있는 독립 실행용 Next.js 애플리케이션이다. 로컬 모드는 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 현재 과업을 완료하며, 운영용 빌드는 Next.js Node.js 서버에서 실행한다.

## 개발과 운영용 빌드

저장소 루트에서 다음 명령을 실행한다.

```sh
pnpm notes:dev
pnpm notes:build
pnpm notes:start
```

개발 서버와 운영 서버는 기본적으로 `http://localhost:3000`에서 실행된다. Worker 자산을 운영용 빌드에 포함하기 위해 개발과 빌드는 Webpack을 사용한다.

## 브라우저 검사

Next.js 운영 서버의 사용자 동작과 Worker 자산은 Playwright Test로 확인한다.

```sh
pnpm notes:test:e2e
```

HTTP에서는 호스트 이름이 정확히 `localhost`인 주소만 지원한다. HTTPS는 같은 운영용 빌드 앞에서 TLS를 종료하는 배포 환경에서 확인하며, 인증서와 개인 키는 저장소에 보관하지 않는다.

## 지원 브라우저

현재 최소 지원 범위는 Chrome 111, Edge 111, Firefox 125와 Safari 16.4다. Next.js의 기본 지원 범위에 맞추되 줄 단위 분석에서 사용할 `Intl.Segmenter` 때문에 Firefox는 125 이상을 요구한다.
