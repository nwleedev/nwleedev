# 개인 메모 애플리케이션 실행

개인 메모 애플리케이션은 `apps/notes/`에 있는 독립 실행용 Next.js 애플리케이션이다. 로컬 모드는 별도의 백엔드와 데이터베이스 없이 현재 과업을 완료할 수 있으며, 지금은 배포 방식으로 정적 내보내기를 사용한다.

## 개발과 정적 빌드

저장소 루트에서 다음 명령을 실행한다.

```sh
pnpm notes:dev
pnpm notes:build
```

개발 서버는 `http://localhost:3000`에서 실행된다. 정적 빌드 결과는 `apps/notes/out/`에 만들어진다. Worker를 JavaScript 자산으로 내보내기 위해 개발과 빌드는 Webpack을 사용한다.

## 정적 결과물 제공

HTTP에서는 호스트 이름이 정확히 `localhost`인 주소만 지원한다.

```sh
pnpm --filter notes-app serve:http
```

HTTPS에서는 사용할 인증서와 개인 키 파일을 `serve:https` 명령의 `--cert`와 `--key` 인수로 전달한다. 인증서와 개인 키는 저장소에 보관하지 않는다.

정적 결과물 기본 실행 검사는 임시 자체 서명 인증서를 저장소의 무시된 `temps/` 아래에서 만들고 Chromium, Firefox와 WebKit에서 HTTP 및 HTTPS를 각각 확인한 뒤 인증서를 지운다.

```sh
pnpm --filter notes-app smoke:static
```

## 지원 브라우저

현재 최소 지원 범위는 Chrome 111, Edge 111, Firefox 125와 Safari 16.4다. Next.js의 기본 지원 범위에 맞추되 줄 단위 분석에서 사용할 `Intl.Segmenter` 때문에 Firefox는 125 이상을 요구한다.
