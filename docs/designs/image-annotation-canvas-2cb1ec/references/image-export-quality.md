# 캔버스에서 내보낸 이미지의 원본 품질

기본 PNG는 업로드한 원본을 캔버스에 설정된 이미지 크기로 합성한다. 원본 크기로 배치하면 방향 정보를 반영한 원본의 가로와 세로 픽셀 수를 유지한다. 줄인 이미지를 원본 크기로 되돌릴 때는 보존한 원본을 사용한다. [이미지 저장 요구사항](../requirements.md#이미지-파일로-저장)

- Canvas의 `drawImage()`는 원본 영역을 대상 영역에 그린다. 두 영역의 치수를 같게 하고 저장할 이미지에서 원본을 그리기 시작할 위치를 정수 픽셀에 맞추면 크기 조절과 소수 픽셀 위치에서 생기는 보간을 피할 수 있다. 선택 영역 저장에서 일부가 가려지거나 잘리면 선택 안에 있고 가려지지 않은 픽셀만 비교한다. [WHATWG 이미지 그리기](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images), [ImageBitmap 방향 처리](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap) (2026-11-12 확인)
- PNG는 합성한 픽셀을 무손실로 저장하고 투명도를 담을 수 있다. 색 공간 변환이나 반투명 픽셀 합성에서 바뀐 값은 PNG에도 반영된다. 저장 파일의 색 프로필은 합성 비트맵의 색 공간을 나타낸다. [W3C PNG 3판, 2025-06-24](https://www.w3.org/TR/png-3/), [WHATWG Canvas 색 공간과 파일 저장](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file) (2026-11-12 확인)
- 불투명 8비트 sRGB 표본은 픽셀 값을 직접 비교한다. Canvas는 투명 색을 알파가 곱해진 형태로 저장하므로 반투명 색을 원래 표현으로 바꾸는 과정에서 반올림 차이가 생길 수 있다. 반투명 가장자리는 밝고 어두운 배경에 합성한 색으로 확인한다. Display P3와 HDR은 [백로그](../requirements.md#백로그)에서 다룬다. [WHATWG Canvas의 투명도 표현](https://html.spec.whatwg.org/dev/canvas.html) (2026-11-13 확인)

## 통합 이미지의 초기 한도

초기 한도는 [이미지 저장 요구사항](../requirements.md#이미지-파일로-저장)에 둔다. 브라우저 내 합성 성능은 아직 측정하지 않았으므로 아래 계산과 상용 도구 사례는 초기값을 정하는 근거로 사용한다.

- Figma REST API의 이미지 렌더링은 3,200만 픽셀보다 큰 결과를 자동으로 줄인다. 플러그인 API에서는 배율, 지정 너비와 높이, 색 프로필을 각각 지정한다. API에서 적용하는 출력 정책을 브라우저 로컬 처리 성능으로 해석할 수는 없다. [Figma 렌더링 API](https://developers.figma.com/docs/rest-api/file-endpoints/#get-image) [Figma 플러그인 ExportSettings](https://developers.figma.com/docs/plugins/api/ExportSettings/) (2026-11-13 확인)
- Canva Connect의 PNG 내보내기 작업은 너비와 높이 입력에 각각 25,000px 상한을 둔다. Photopea 유지보수자는 특정 환경에서 8,192px를 넘는 GPU 텍스처 문제를 보고받아 WebGL을 끄고 비교하도록 안내했다. Adobe Photoshop UXP Imaging API도 픽셀 요청 크기를 줄이고 사용이 끝난 이미지 데이터를 해제하도록 안내한다. [Canva Connect 내보내기 API](https://www.canva.dev/docs/apps/rest-apis/reference/exports/create-design-export-job/) [Photopea 유지보수자 답변](https://github.com/photopea/photopea/issues/5888) [Photoshop UXP Imaging API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/imaging) (2026-11-13 확인)

1080p 이미지 10장을 5열 2행에 놓고 이미지 아래에 200px 높이의 메모를 붙인다고 가정한다. 열과 행 사이에 64px를 띄우고 외곽에 24px 여백을 적용하면 결과는 9,904 × 2,672px, 약 2,646만 픽셀이다. 각 변 12,288px, 총 2,800만 픽셀의 초기값은 이 배치를 수용한다. 총 픽셀 한도에서 8비트 RGBA 버퍼 하나는 약 106.8 MiB를 사용한다. 원본 디코딩, 미리보기와 인코더 메모리는 별도로 필요하다. [WHATWG ImageData 저장 형식](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagedata)

파일 한도 64 MiB는 초기 추정값이다. 예를 들어 편집용 ZIP의 32 MiB 원본을 SVG에 Base64로 모두 넣으면 인코딩 데이터는 약 42.7 MiB가 되고 여기에 SVG 구조와 메모가 추가된다. PNG는 합성 픽셀의 내용에 따라 파일 크기가 달라지므로 치수 검사를 통과하더라도 별도로 파일 바이트를 확인한다. [RFC 4648 Base64](https://www.rfc-editor.org/rfc/rfc4648.html#section-4) [W3C PNG 명세](https://www.w3.org/TR/png-3/)


## 브라우저의 기준 배치 확인

Chromium 156은 CPU를 12.1배 느리게 설정했고, WebKit 27.2는 CPU 제한 없이 영구 프로필로 실행했다. 브라우저에서 만든 불투명 단색 PNG 5장과 무작위 색을 담은 PNG 5장을 각각 1,920×1,080으로 준비했다. 이미지에 높이 200px의 빈 메모 상자를 붙여 5열 2행에 배치하고 외곽에 24px 여백을 적용했다. 브라우저별 한 번씩 실행했다.

- Chromium에서 PNG는 15,329,812바이트였고 미리보기 확인에 약 0.93초가 걸렸다. SVG는 47,862,128바이트였고 약 9.69초가 걸렸다.
- WebKit에서 PNG는 15,056,304바이트였고 약 1.00초가 걸렸다. SVG는 48,636,468바이트였고 약 0.39초가 걸렸다.
- 네 파일 모두 9,904×2,672px였고 현재 치수와 용량 한도를 충족했다. 측정 시간에는 형식 선택, 미리보기 디코딩과 Blob 크기 조회가 포함된다. CPU 조건이 달라 엔진 간 처리 속도를 직접 비교할 수 없다.

같은 Chromium과 CPU 제한 조건에서 SVG를 두 번씩 비교했다. 기존 Worker 응답은 270~271ms였고 응답부터 미리보기 디코딩까지 8,783~9,294ms가 걸렸다. 긴 변 768px의 PNG 미리보기를 Worker에서 별도로 합성한 뒤 응답은 384~395ms, 응답 후 디코딩은 428~494ms였다. 미리보기를 768×208px로 표시해도 다운로드한 SVG는 9,904×2,672px와 47,862,128바이트를 유지했다. 편집 입력과 겹칠 때의 프레임 지연은 별도 검증 대상이다.
