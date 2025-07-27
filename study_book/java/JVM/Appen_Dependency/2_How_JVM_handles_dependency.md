2. JVM 내부 구조로 보는 의존성 처리 방식 (15분)
   목표: 클래스가 어떻게 로드되고 의존성이 해결되는지를 구조적으로 분석한다.

ClassLoader delegation model (Bootstrap → Platform → App → Custom)

Class.forName(), loadClass()의 의미와 작동 원리

같은 클래스 이름이 충돌할 경우 → Shadowing, masking

💥 실제 사례: 두 개의 다른 버전의 라이브러리 충돌 (예: log4j 1.x vs 2.x)
