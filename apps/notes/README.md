# 개인 메모 애플리케이션 실행

개인 메모 애플리케이션은 `apps/notes/`에 있는 독립 실행용 Next.js 애플리케이션이다. 로컬 모드는 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 현재 과업을 완료한다. 운영 환경은 Next.js Node.js 서버 또는 OpenNext가 변환한 Cloudflare Worker를 사용한다.

## 개발과 운영용 빌드

저장소 루트에서 다음 명령을 실행한다.

```sh
pnpm notes:dev
pnpm notes:build
pnpm notes:start
```

개발 서버와 운영 서버는 기본적으로 `http://localhost:3000`에서 실행된다. Worker 자산을 운영용 빌드에 포함하기 위해 개발과 빌드는 Webpack을 사용한다.

## Cloudflare Workers

Cloudflare Workers용 빌드와 로컬 미리보기는 저장소 루트에서 실행한다.

```sh
pnpm notes:cloudflare:build
pnpm notes:cloudflare:preview
```

일반 개발에는 `pnpm notes:dev`를 사용한다. Cloudflare 미리보기는 OpenNext가 변환한 산출물을 Workers 실행 환경에서 확인할 때 사용한다.

Cloudflare 계정에 로그인한 환경에서는 다음 명령으로 `notes-app` Worker를 배포한다.

```sh
pnpm notes:cloudflare:deploy
```

Wrangler 설정은 `workers.dev` 주소를 활성화하지 않으며 실제 도메인도 기록하지 않는다. 첫 배포 뒤 Cloudflare 대시보드에서 `notes-app` Worker를 선택하고 Settings, Domains & Routes, Add, Custom Domain 순서로 도메인을 연결한다. Cloudflare는 DNS 레코드와 인증서를 만든다. 연결할 호스트 이름에 CNAME 레코드가 이미 있으면 기존 용도를 확인하기 전에는 삭제하거나 Custom Domain을 추가하지 않는다.

Cloudflare API token, account ID와 zone ID는 저장소 파일에 기록하지 않는다. 로컬에서는 Wrangler의 대화형 로그인을 사용하고, CI에서는 배포 환경에 등록한 secret으로 전달한다.

## 브라우저 검사

Next.js 운영 서버의 사용자 동작과 Worker 자산은 Playwright Test로 확인한다.

```sh
pnpm notes:test:e2e
```

HTTP에서는 호스트 이름이 정확히 `localhost`인 주소만 지원한다. HTTPS는 같은 운영용 빌드 앞에서 TLS를 종료하는 배포 환경에서 확인하며, 인증서와 개인 키는 저장소에 보관하지 않는다.

IndexedDB는 프로토콜, 호스트 이름과 포트 조합으로 정해지는 origin마다 분리된다. 미리보기 URL이나 이전 호스트 이름에서 만든 메모는 Custom Domain으로 자동 이전되지 않는다. 실제 사용을 시작한 뒤에는 같은 Custom Domain을 유지한다.

## 지원 브라우저

현재 최소 지원 범위는 Chrome 111, Edge 111, Firefox 125와 Safari 16.4다. Next.js의 기본 지원 범위에 맞추되 줄 단위 분석에서 사용할 `Intl.Segmenter` 때문에 Firefox는 125 이상을 요구한다.
