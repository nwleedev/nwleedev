# 캔버스 편집용 파일 형식과 호환성

원본 이미지 여러 장과 편집 상태를 다른 기기로 옮기려면 JSON 문서와 원본 이미지 파일을 한 ZIP에 담는 방식을 우선 검토할 만하다. 작업당 원본 이미지의 총용량이 낮다면 이미지를 Base64로 담는 단일 JSON도 후보다. 비교 기준은 [편집용 파일로 저장](../requirements.md#편집용-파일로-저장)이다. 편집용 파일은 ZIP으로 저장하며, 내부 구성과 버전 호환 정책은 아직 결정되지 않았다.

## 파일 구성 후보

### JSON과 원본 이미지를 묶는 ZIP

ZIP은 이름이 있는 여러 파일을 하나로 묶는다. EPUB의 OCF는 ZIP 내부에 형식을 식별하는 파일과 문서 및 리소스를 함께 두는 사례다. [PKWARE ZIP APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), [W3C EPUB 3.3 권고안, 2026-01-13](https://www.w3.org/TR/2026/REC-epub-33-20260113/#sec-zip-container)

이 캔버스에서는 JSON에 객체의 식별자, 캔버스 좌표, 이미지 배치 크기, 메모 크기와 내용과 부착 정보, 이미지 파일의 참조를 둘 수 있다. 원본 이미지는 별도 항목으로 넣어 이미지 바이트를 그대로 가져갈 수 있다. 이 방식에는 ZIP 처리와 내부 파일 참조 검사가 필요하다. PNG나 JPEG를 다시 압축해 얻는 이득과 기기에서 쓰는 메모리는 대표 작업 파일로 확인해야 한다.

### 이미지를 포함하는 단일 JSON

Excalidraw의 로컬 저장 코드는 형식과 버전, 편집 요소와 참조된 파일을 하나의 JSON으로 직렬화한다. 바이너리를 JSON에 넣는 한 방법인 Base64는 입력 3바이트를 문자 4개로 바꾼다. UTF-8로 저장하면 이미지 부분만 보아도 큰 입력에서 약 3분의 1이 늘어난다. [Excalidraw 저장 소스, dd8296a](https://github.com/excalidraw/excalidraw/blob/dd8296af1802d4920a645591e0de88b9272745fa/packages/excalidraw/data/json.ts), [RFC 4648 §4, 2006-10](https://www.rfc-editor.org/rfc/rfc4648.html#section-4)

JSON 하나는 내용을 직접 확인하기 쉽고 압축 파일을 푸는 단계가 없다. 다만 파일 전체를 문자열로 읽고 이미지까지 디코딩하면 원본 바이트와 별도로 문자열과 디코딩 자료가 메모리를 차지할 수 있다. 이미지 URL이나 기기 내부의 파일 위치만 저장하면 새 기기에서 원본을 열 수 없는 경우가 생긴다. 두 후보 모두 편집에 필요한 원본을 파일 안에 포함하는 구성이 적합하다.

## 전용 확장자와 일반 ZIP 비교

전용 확장자는 편집할 수 있는 캔버스 파일임을 이름으로 드러낸다. ZIP에 JSON과 원본 이미지를 담는 내부 구성에도 전용 확장자를 붙일 수 있다. EPUB 3.3은 ZIP 기반 컨테이너에 `.epub`을 쓰는 사례다. [W3C EPUB 3.3 권고안, 2026-01-13](https://www.w3.org/TR/2026/REC-epub-33-20260113/)

Figma Design은 로컬 복사본을 `.fig`로 저장하며, 사용자는 Figma의 파일 브라우저에서 다시 가져올 수 있다. Figma는 이 형식을 자체 형식으로 설명하며 변경될 수 있다고 명시한다. 이 사례는 전용 확장자로 편집 문서를 구분하는 근거다. Figma 도움말에는 내부 컨테이너 구성이 명시되어 있지 않다. [Figma 로컬 복사본 저장](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files), [Figma 파일 가져오기](https://help.figma.com/hc/en-us/articles/360041003114-Import-files-to-the-file-browser) (2026-11-12 확인)

- 전용 확장자의 장점은 다운로드 폴더에서 일반 압축 파일과 캔버스 문서를 구별하기 쉽고, 앱의 파일 선택창에서 편집용 파일을 찾도록 도울 수 있다는 점이다.
- 전용 확장자의 단점은 운영체제나 파일 앱이 파일 종류를 모를 때 연결 앱, 미리보기 또는 압축 풀기가 바로 제공되지 않을 수 있다는 점이다. 브라우저의 파일 선택 필터는 확장자를 힌트로 사용한다. 운영체제에서 파일을 바로 열 수 있는지, 웹 앱에서 파일을 골라 불러올 수 있는지 각각 확인한다. [WHATWG 파일 선택 규칙](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept), [Apple 파일 형식 정의](https://developer.apple.com/documentation/UniformTypeIdentifiers/defining-file-and-data-types-for-your-app) (2026-11-12 확인)
- 일반 `.zip`은 iPhone과 iPad의 파일 앱이나 Windows 파일 탐색기에서 원본 이미지를 직접 꺼낼 수 있다. 일반 압축 파일과 섞이기 쉬우며 파일을 탭했을 때 편집을 재개하는 대신 압축이 풀릴 수 있다. [Apple ZIP 안내](https://support.apple.com/en-ae/102532), [Microsoft ZIP 안내](https://support.microsoft.com/en-us/windows/experience/storage-filemanagement/zip-and-unzip-files) (2026-11-12 확인)

편집용 파일은 이름에 `.nwlee`를 붙이고 표준 `.zip` 확장자를 사용한다. 전용 확장자 정의는 보류한다. 파일명이 바뀌어도 내부 식별자와 버전이 일치하면 다시 열 수 있는 방식은 불러오기 정책의 후보다.

## 형식 식별, 버전과 불러오기

- 확장자는 파일 선택에 쓰고, 파일 내부 식별자와 문서 형식 버전으로 읽을 수 있는 파일인지 판단하는 방안을 제안한다. 앱 배포 버전과 파일 형식 버전은 별도로 관리한다. 이전 형식을 계속 읽기로 했다면 버전별 변환을 거쳐 현재 객체를 복원한다. 읽을 수 없는 새 버전은 변경을 적용하기 전에 알린다. [Excalidraw 저장 소스, dd8296a](https://github.com/excalidraw/excalidraw/blob/dd8296af1802d4920a645591e0de88b9272745fa/packages/excalidraw/data/json.ts)
- JSON Schema 2020-12는 필수 필드, 자료형과 숫자의 상한 및 하한을 검사할 수 있다. 이미지 참조가 ZIP 안에 실제로 존재하는지, 메모가 존재하는 이미지에 붙는지, 메모가 이미지 가장자리에 닿고 이미지를 가리지 않는지는 별도로 확인해야 한다. [JSON Schema Validation 2020-12, 2022-06 문서](https://json-schema.org/draft/2020-12/json-schema-validation)
- 불러오기 전에 파일 구조, 이미지 참조와 디코딩 가능 여부를 확인하고 검사가 끝난 뒤 작업을 연다는 방안을 제안한다. ZIP을 택하면 중복 항목, 허용된 디렉터리 밖을 가리키는 이름, 항목 개수와 압축을 푼 뒤의 총량도 확인한다. 압축 파일 크기만으로 풀린 크기를 판단할 수 없으므로 실제로 읽는 양도 제한해야 한다. [PKWARE ZIP APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)

## 선택에 필요한 확인

- 예상하는 이미지 수와 용량을 기준으로 대상 기기에서 두 후보의 파일 크기, 저장과 불러오기 시간, 최대 메모리 사용량을 비교한다. 수치는 아직 측정하지 않았다.
- 다른 기기에서 파일을 열었을 때 원본 이미지의 바이트, 이미지와 메모의 위치 및 부착 관계가 유지되는지 확인한다. 손상된 파일이나 이미지가 빠진 파일을 열 때 현재 작업이 보존되는지도 확인한다.
- 형식을 확정하기 전에 읽을 이전 버전과 허용할 이미지 종류 및 작업량을 정한다. 이미지와 객체의 편집 상태를 복원하는 데 필요한 정보는 저장 대상이다. 확대율, 화면 위치와 실행 취소 이력까지 옮길지는 별도 선택이다.
