# IndexedDB 실행 도구

이 모듈은 IndexedDB 연결, request가 반환한 값과 transaction 완료를 Promise로 연결하고 upgrade 차단 및 version 변경을 호출자에게 전달한다. 쓰기 성공은 개별 request가 아니라 transaction의 `complete`로 판정한다.

개인 메모 object store 이름, 자료 스키마, migration 내용과 사용자 안내는 이 모듈의 책임이 아니다. 호출자는 저장할 자료를 transaction을 열기 전에 검증하고, transaction이 열린 동안 네트워크나 Worker 작업을 기다리지 않는다.
