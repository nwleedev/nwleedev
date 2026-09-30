# 하이라이트가 마크다운 줄 배치에 미치는 영향

여러 줄의 변경 내용을 하나의 버튼으로 감싼 것이 쇼케이스의 줄 배치를 틀어놓는 원인으로 확인된다. 표시할 문자열이 원문과 일치해도 화면에서 읽는 순서는 달라질 수 있다. 두 보고서의 내용은 유지하고, 강조와 개별 전환을 제공하는 요소의 배치를 수정해야 한다.

이 자료는 [쇼케이스 요구사항](../requirements.md#방문자가-확인할-내용)의 원문 보존과 인라인 강조를 함께 구현할 때 적용한다. 자료와 현재 화면의 확인일은 2026년 9월 30일이다.

## 표준과 문서가 설명하는 동작

버튼에 `display: inline`을 지정해도 일반 텍스트의 인라인 요소처럼 배치되지 않는다. [WHATWG HTML의 Button layout](https://html.spec.whatwg.org/multipage/rendering.html#button-layout)은 버튼의 바깥 표시 유형이 inline인 경우 일부 지정값을 제외하고 inline-block처럼 동작하도록 설명한다. [MDN의 button 설명](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#notes)도 같은 동작을 명시한다. 짧은 원문은 “A button set to `display: inline` will be styled as if the value were set to `display: inline-block`.”이다.

inline-block은 주변 문장에 하나의 상자로 참여한다. [W3C CSS 2.2의 인라인 상자 설명](https://www.w3.org/TR/CSS22/visuren.html#inline-boxes)은 이를 분리되지 않는 인라인 상자로 정의하고, 일반 inline 요소는 하나 이상의 인라인 상자를 만든다고 구별한다. 따라서 여러 줄을 포함한 버튼 내부의 줄과 주변 텍스트의 줄은 같은 방식으로 이어지지 않는다.

공백 보존과 요소의 줄 배치는 별개다. [MDN의 white-space 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/white-space#pre-wrap)에 따르면 `pre-wrap`은 원래 공백과 줄바꿈을 유지하고 너비에 맞춰 추가로 줄을 접는다. 이 설정만으로 여러 줄 버튼이 주변 텍스트와 이어서 배치되지는 않는다.

## 현재 쇼케이스에서 확인한 사실

`apps/entry/src/_pages/better-terms/ui/ShowcasePage.astro`는 변경된 텍스트를 `button`으로 감싸며 `inline`과 `whitespace-pre-wrap`을 지정한다. 원문 상태에서 앞쪽 변경 요소 네 개의 계산된 `display`는 모두 `inline-block`, `white-space`는 `pre-wrap`, `vertical-align`은 `baseline`이었다. 각 요소에는 줄바꿈이 포함되었으며, 요소의 사각형은 각각 하나로 측정되었다.

화면에서는 제목의 `## 0.`과 제목 문구가 다른 높이에 놓이고, 다음 목록의 앞부분이 제목 옆에 배치된다. 2.1절의 `###`가 앞 문단의 오른쪽에 놓이는 현상과 3.4절 코드의 문자열 및 선언이 서로 다른 줄에 배치되는 현상도 같은 구조에서 나타난다. 수정본도 같은 버튼과 토큰 표시를 사용하므로 두 상태를 모두 수정 대상으로 삼는다. 수정본의 모든 지점에서 같은 증상이 발생한다고 단정하지는 않는다.

기존의 문자 단위 대조는 보고서 문자열이 보존되었다는 증거다. 화면의 줄 배치가 올바르다는 증거는 아니므로, 하이라이트 수정의 완료 조건에는 실제 배치 확인이 추가되어야 한다.

## 수정 방향과 남은 확인

강조와 조작 의미를 유지하면서 강조된 텍스트도 주변 텍스트와 이어서 배치하는 방식을 선택해야 한다. 글자 굵기나 본문 너비를 바꾸는 것만으로 여러 줄 버튼의 배치 문제가 해결된다고 볼 근거는 없다. 두 보고서의 줄바꿈을 삭제하거나 새 줄을 끼워 맞추는 방식은 내용 보존 요구를 충족하지 않는다.

표시 요소를 변경하더라도 개별 전환의 키보드 조작과 상태 전달은 유지해야 한다. [WAI-ARIA의 Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)은 Enter와 Space를 통한 실행, 접근 가능한 이름과 토글 상태를 설명한다. 요소 이름이나 역할만 바꿔 이 동작이 자동으로 제공된다고 판단해서는 안 된다.

구체적인 표시 방식은 아직 구현되지 않았다. 수정 후에는 원문, 수정본과 일부 전환 상태에서 제목, 목록, 표와 코드의 줄 순서를 확인해야 한다. 화면 너비 때문에 접히는 줄은 원문에 있는 줄바꿈과 구별하고, 문자 대조와 화면 확인을 모두 완료해야 한다. 동작을 확인할 브라우저의 최종 목록은 기존 개발자 소개 사이트에서도 미정이므로, 특정 브라우저의 확인만으로 모든 환경에서 해결되었다고 기록하지 않는다.
