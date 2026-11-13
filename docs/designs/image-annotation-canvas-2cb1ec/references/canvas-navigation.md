# 캔버스 화면 이동과 확대 방식

마우스, 터치패드와 터치스크린은 화면을 이동하는 동작과 확대하는 동작이 다르다. [캔버스 화면 이동과 확대 요구사항](../requirements.md#캔버스-화면-이동과-확대)은 입력 방식별 조작을 정하고 화면 이동과 이미지 편집을 구분한다.

- Miro는 마우스에서 오른쪽 버튼 드래그로 보드를 옮기고 휠로 확대한다. 터치패드에서 두 손가락을 밀면 이동하고 핀치하면 확대한다. 터치스크린에서는 드래그와 핀치를 사용한다. 자동 전환 외에 마우스 또는 터치패드 방식도 선택할 수 있다. [Miro 입력 방식](https://help.miro.com/hc/en-us/articles/360017731053-Using-Miro-with-a-mouse-trackpad-or-touchscreen)
- Figma는 Ctrl 또는 Command와 휠을 조합해 확대하며 터치패드 핀치도 지원한다. FigJam은 화면 이동에 손 도구를 제공한다. Figma의 확대 메뉴에는 전체 작업을 다시 찾을 수 있는 화면 맞춤 조작도 있다. [Figma 확대 메뉴](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options) [FigJam 화면 이동](https://www.figma.com/resource-library/figjam-tools-for-the-classroom/)
- Excalidraw는 마우스 방식에서 일반 휠을 확대에, 터치패드 방식에서 스크롤을 화면 이동에 사용한다. Ctrl 또는 Command와 휠을 조합하면 어느 방식에서든 확대한다. 자동 구분 외에도 입력 방식을 지정할 수 있다. [Excalidraw 입력 설정 소스](https://github.com/excalidraw/excalidraw/blob/82d5847e57dcb6fb5982833ea9ec2137fe0b2bd5/packages/excalidraw/types.ts#L376-L383)

자료는 2026-11-13에 확인했다. 휠 동작은 서비스마다 달랐다. 이 캔버스에서는 일반 마우스 휠 확대와 터치패드의 두 손가락 이동을 함께 지원하고, 입력 방식이 잘못 감지되면 사용자가 방식을 지정할 수 있게 한다. 핀치 없이도 확대 조작을 사용할 수 있도록 버튼을 제공한다. [W3C 멀티터치 대체 조작](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

Konva는 포인터 위치를 기준으로 확대하는 예제와 두 손가락의 거리 및 가운데 위치로 화면을 조작하는 예제를 제공한다. 이 캔버스에서는 화면 변환과 편집 좌표를 분리하고, 이미지 위에서 핀치를 시작했을 때 드래그가 계속되는지 별도로 검증해야 한다. 지원 기기에서의 입력 감지와 렌더링 성능은 아직 측정하지 않았다. [포인터 기준 확대](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html) [멀티터치 예제](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html)
