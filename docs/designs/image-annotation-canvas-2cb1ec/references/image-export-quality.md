# 캔버스에서 내보낸 이미지의 원본 품질

기본 PNG는 업로드한 원본을 캔버스에 설정된 이미지 크기로 합성한다. 원본 크기로 배치하면 방향 정보를 반영한 원본의 가로와 세로 픽셀 수를 유지한다. 줄인 이미지를 원본 크기로 되돌릴 때는 보존한 원본을 사용한다. [이미지 저장 요구사항](../requirements.md#이미지-파일로-저장)

- Canvas의 `drawImage()`는 원본 영역을 대상 영역에 그린다. 두 영역의 치수를 같게 하고 저장할 이미지에서 원본을 그리기 시작할 위치를 정수 픽셀에 맞추면 크기 조절과 소수 픽셀 위치에서 생기는 보간을 피할 수 있다. 선택 영역 저장에서 일부가 가려지거나 잘리면 선택 안에 있고 가려지지 않은 픽셀만 비교한다. [WHATWG 이미지 그리기](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images), [ImageBitmap 방향 처리](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap) (2026-11-12 확인)
- PNG는 합성한 픽셀을 무손실로 저장하고 투명도를 담을 수 있다. 색 공간 변환이나 반투명 픽셀 합성에서 바뀐 값은 PNG에도 반영된다. 저장 파일의 색 프로필은 합성 비트맵의 색 공간을 나타낸다. [W3C PNG 3판, 2025-06-24](https://www.w3.org/TR/png-3/), [WHATWG Canvas 색 공간과 파일 저장](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file) (2026-11-12 확인)
- 가려지지 않은 불투명 sRGB 이미지로 원본과 저장 파일의 픽셀 치수 및 값을 비교한다. 화면 확대율을 바꿔 다시 확인한다. 이미지의 배치 크기를 줄였다가 원본 크기로 되돌린 뒤에도 같은 비교를 수행한다. EXIF 회전, 투명도, Display P3와 HDR은 별도 사례로 확인한다. 색과 투명도에서 허용할 차이, 중앙이 반 픽셀에 걸리는 경우의 처리, 기기 한도를 넘었을 때 저장을 어떻게 처리할지는 아직 정해지지 않았다. 브라우저별 픽셀 일치는 실측하지 않았다.
