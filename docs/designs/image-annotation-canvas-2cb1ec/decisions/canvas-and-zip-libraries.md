# 캔버스 편집과 ZIP 처리 라이브러리

캔버스 편집에는 Konva를 사용하고, 편집용 ZIP을 저장하고 불러올 때는 zip.js를 사용한다.

Konva는 React에서 편집 화면을 구성할 수 있고 이미지 이동과 크기 조절을 지원한다. 메모 입력은 우측 패널에서 처리하며, 편집용 파일에는 메모 원문과 이미지의 연결 관계를 저장한다. Fabric.js의 SVG 텍스트 출력도 검토했다. 현재 요구사항은 SVG에서 이미지와 메모를 볼 수 있어야 한다는 것이므로, SVG에서 텍스트를 선택하거나 복사하는 기능은 이번 선택을 좌우하지 않는다. [Konva React 문서](https://konvajs.org/docs/react/index.html), [Fabric.js 핵심 개념](https://fabricjs.com/docs/core-concepts/)

zip.js는 ZIP의 항목 목록을 확인한 뒤 필요한 원본 이미지 파일을 개별적으로 꺼낼 수 있다. fflate도 검토했으며 원본 이미지 파일을 무압축으로 담는 기능은 두 라이브러리 모두 제공한다. [zip.js 공식 문서](https://gildas-lormeau.github.io/zip.js/), [fflate ZIP 문서](https://github.com/101arrowz/fflate#zip)

실제 사용에서 성능 문제가 발생하면 [성능 개선 백로그](../requirements.md#백로그)에 따라 대안을 조사한다.
