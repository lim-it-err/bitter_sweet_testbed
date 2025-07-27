
5. 의도되지 않은 동작 사례 분석 (10분)
   목표: 의존성이 "잘못 관리되었을 때" 발생하는 문제를 역추적한다.

NoClassDefFoundError, ClassCastException, IllegalAccessError

Runtime에만 필요한 jar를 compile 시 누락한 경우

API/impl 분리 구조에서 impl이 빠진 경우

⚠️ 실제 코드 + 로그 분석을 통해 원인 추적하기
