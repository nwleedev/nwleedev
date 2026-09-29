# 브라우저 렌더링과 웹 성능 지표

LCP에는 이전 페이지를 떠나는 과정, 리디렉션, 연결 수립, 첫 바이트를 기다리는 시간도 들어간다. HTML이 빠르게 도착하더라도 이미지 요청이 늦게 발견되거나 이미지가 늦게 준비되거나 렌더링 작업이 밀리면 LCP는 늦어진다. 역으로 가장 큰 요소가 일찍 보였다는 사실만으로 페이지의 다른 요소도 표시되고 조작 가능하다고 말할 수 없다. LCP의 후보 선정에는 콘텐츠 여부를 추정하는 규칙이 쓰인다. W3C 명세는 이 방식의 한계와 입력이나 스크롤이 매우 일찍 일어났을 때의 누락 가능성도 밝힌다. 또 문서 전체를 다시 불러오지 않는 탐색이나 뒤로 가기 캐시 복원은 같은 방식으로 지표가 재설정되지 않는다. [web.dev, LCP](https://web.dev/articles/lcp), [W3C Largest Contentful Paint](https://www.w3.org/TR/largest-contentful-paint/).

Google의 현재 권장 기준에서 좋은 값은 LCP 2.5초 이하, INP 200밀리초 이하, CLS 0.1 이하다. 나쁨의 기준은 각각 4초 초과, 500밀리초 초과, 0.25 초과이며 사이 값은 개선 필요로 분류된다. 이 기준을 모든 방문에서 반드시 충족한다는 뜻은 아니다. 페이지 방문 값의 75번째 백분위수를 모바일과 데스크톱으로 나눠 평가하며, 세 지표가 모두 권장값을 만족해야 Core Web Vitals의 전체 통과로 본다. 기준값은 인간의 지각에 관한 연구와 실제 웹에서 달성 가능한 범위를 함께 고려해 정해졌다. 75번째 백분위수는 대다수 방문의 경험을 보면서 일부 극단적인 표본의 영향을 줄이려는 선택이다. [Web Vitals](https://web.dev/articles/vitals), [web.dev, 기준값 연구](https://web.dev/articles/defining-core-web-vitals-thresholds).
---
# 웹 접근성과 키보드 상호작용: 초점 이동이 실제 이용을 결정한다

WCAG의 [2.4.13 초점 표시의 모양](https://www.w3.org/TR/WCAG22/#focus-appearance)은 수준 AAA 기준으로, 표시가 차지하는 면적과 초점 전후의 대비 변화에 정량적 하한을 둔다. [해설 문서](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)는 이 기준과 2.4.7을 구분한다. 2.4.7은 보이는 표시의 존재를, 2.4.13은 표시의 면적과 대비가 기준에 맞는지를 정한다. 따라서 특정한 두께나 색을 모든 페이지에 공통으로 강제하는 기준으로 읽으면 부정확하다. 또 [1.4.11 비문자 콘텐츠 대비](https://www.w3.org/TR/WCAG22/#non-text-contrast)는 초점 표시와 인접한 색의 대비에도 적용될 수 있어, 초점 전후의 변화량을 따지는 2.4.13과 측정 대상이 다르다.

초점을 받았다는 사실만으로 예상 밖의 페이지 전환이나 대화상자 열기가 일어나면 키보드로 화면을 살피기 어렵다. [WCAG 3.2.1 초점 시](https://www.w3.org/TR/WCAG22/#on-focus)는 구성 요소가 초점을 받는 것만으로 맥락을 바꾸지 않도록 규정한다. 선택값을 바꾸는 입력에서도 [3.2.2 입력 시](https://www.w3.org/TR/WCAG22/#on-input)는 변경 전에 사용자가 그 결과를 안내받지 않았다면 맥락 변경을 일으키지 않도록 한다. 이 기준들은 초점 순서와 별개로, 이동 과정이 예측 가능한지 판단하는 근거가 된다. 단순한 내용 갱신이 모두 맥락 변경인 것은 아니지만, 초점 이동이나 페이지 전환처럼 사용자의 작업 위치를 바꾸는 결과는 별도 검토 대상이다.
---
# 반응형 레이아웃과 CSS 컨테이너 쿼리

웹 문서는 하나의 기기 해상도 안에서도 서로 다른 폭을 받는다. 같은 카드는 본문 전체를 차지하거나, 여러 열 중 하나에 들어가거나, 보조 영역에 놓일 수 있다. 창 크기가 그대로여도 주변 영역의 유무와 너비가 달라지면 카드가 쓸 수 있는 공간은 달라진다. 화면 전체의 폭만 보는 조건으로는 이런 차이를 직접 표현할 수 없다. 반대로 페이지 전체의 탐색 구조나 사용자의 움직임 감소 설정은 개별 카드의 폭만으로 판단할 수 없다. 반응형 레이아웃은 이처럼 뷰포트와 사용자 설정, 구성 요소가 실제로 받은 공간을 함께 고려한다. [출처: W3C CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/#container-queries), [출처: W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#intro)

미디어 쿼리는 문서 전체에 같은 배치 규칙을 적용할 때 유용하다. 페이지의 큰 영역 배치나 표시 환경에 따른 변화가 여기에 해당한다. 다만 뷰포트가 넓다는 사실은 그 안의 모든 구성 요소도 넓다는 뜻이 아니다. 넓은 창의 좁은 보조 열에 들어간 구성 요소가 화면 전체 너비에 따른 규칙만 적용받으면, 실제 공간과 맞지 않는 배치를 가질 수 있다. 이는 미디어 쿼리의 결함이라기보다 질문의 대상이 다른 데서 생기는 차이다. 표준의 표현을 빌리면 미디어 쿼리 값은 “independent of the document being rendered”인 특성을 조회한다. [출처: W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#intro), [출처: W3C CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/#container-queries)
---
# 클라이언트 데이터 갱신과 캐시

서버 응답을 기다리지 않고 변경 결과를 먼저 보여 주는 낙관적 갱신은 지연을 감추지만, 성공이 확정되기 전의 값을 화면에 놓는다. TanStack Query 문서는 화면에서 임시 항목을 보여 주는 방식과 캐시 자체를 먼저 바꾸는 방식을 구분한다. 후자는 서버 요청이 실패했을 때 이전 값을 복구할 정보가 필요하고, 진행 중인 재조회를 취소해 임시 값을 덮어쓰지 않게 해야 한다. 서버가 실제로 저장한 결과가 클라이언트의 예상과 다르거나 다른 사용자의 변경이 끼어들 수 있으므로, 이 방식의 화면 응답성과 확정된 저장 상태는 동일한 사실이 아니다. [TanStack Query 낙관적 갱신](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

결국 클라이언트 데이터 갱신은 “얼마나 오래 저장하는가”만의 문제가 아니다. HTTP 응답이 언제 신선한지, 애플리케이션이 어떤 조회를 같은 자료로 묶는지, 서버 변경 뒤 무엇을 다시 확인하는지, 연결이 끊기거나 요청이 실패했을 때 어떤 값을 보여 주는지에 따라 화면의 최신성과 응답 속도가 달라진다. 표준은 HTTP 응답 재사용과 조건부 검증의 범위를 정하고, 서비스 워커 표준은 별도 저장소의 수명을 설명한다. 애플리케이션 라이브러리는 화면에 남은 조회 결과의 재검증과 무효화 방식을 제공한다. 세 층의 시간과 식별 기준이 다르다는 사실이 클라이언트 캐시의 성능 이익과 오래된 데이터의 위험을 동시에 설명한다. [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html), [서비스 워커 표준](https://www.w3.org/TR/service-workers/), [TanStack Query 기본 동작](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
---
# 웹 프론트엔드의 보안 모델과 사용자 입력

XSS는 신뢰할 수 없는 데이터가 브라우저에서 실행 가능한 문맥으로 해석될 때 발생한다. 같은 문자열도 HTML 본문, 속성, URL, CSS, JavaScript 가운데 어디에 놓이느냐에 따라 해석 방식이 달라진다. 그러므로 입력을 받을 때 한 차례 문자열을 치환하는 방식으로 모든 출력 위치를 보호할 수 없다. OWASP는 출력 문맥에 맞는 인코딩과, HTML 자체를 허용해야 할 때의 정화를 구별한다. DOM의 텍스트와 HTML 조각은 해석 방식이 달라 필요한 보호 조치도 다르다. [OWASP XSS 방지 자료](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

현대적인 화면 구성 도구의 자동 이스케이프도 모든 상황을 포함하지 않는다. 일반 텍스트를 표시하는 동작과 HTML을 직접 주입하거나 특수한 URL을 연결하는 동작은 다르다. CSP는 콘텐츠 주입의 위험과 실행 권한을 줄이기 위한 브라우저 정책이며, Trusted Types는 지정된 DOM 삽입 지점에 임의 문자열 대신 정해진 유형을 요구할 수 있게 한다. 두 기능은 데이터가 위험한 위치에 닿는 일을 제한하지만, 허용된 정책이나 생성 함수의 내용까지 자동으로 안전하게 판정하지는 않는다. CSP와 Trusted Types만으로는 출력 문맥에 맞는 인코딩이나 HTML 정화를 대신할 수 없다. [W3C CSP 3](https://www.w3.org/TR/CSP3/), [W3C Trusted Types](https://www.w3.org/TR/trusted-types/), [OWASP XSS 방지 자료](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
