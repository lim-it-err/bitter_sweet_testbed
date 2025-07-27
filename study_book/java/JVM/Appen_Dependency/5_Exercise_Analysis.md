3. JAR 파일, 모듈, 경로: 로딩 우선순위 실험 (10분)
   목표: 같은 클래스/같은 JAR이 여러 위치에 있을 때 어떤 것이 선택되는가?

classpath vs module-path 비교 (Java 8 vs Java 9+)

JAR 병합(Fat Jar) 시 클래스 충돌 실험

디렉토리 구조와 우선순위 실험 (target/classes, lib/, etc.)

🔬 실험 중심 구성: “A.class가 어디서 로드되었는가?”

4. Build Tool이 하는 일: Maven/Gradle 비교 (10분)
   목표: 개발자가 ‘명시한’ 의존성과 ‘도구가 처리하는’ 의존성 간 차이를 이해한다.

Maven: pom.xml, Scope, transitive resolution

Gradle: implementation, api, runtimeOnly, configuration caching

IDE vs Build Tool의 역할 차이

⚠️ 현상 분석: Gradle 의존성 트리에서 예상하지 못한 의존성이 포함된 이유

5. 의도되지 않은 동작 사례 분석 (10분)
   목표: 의존성이 "잘못 관리되었을 때" 발생하는 문제를 역추적한다.

NoClassDefFoundError, ClassCastException, IllegalAccessError

Runtime에만 필요한 jar를 compile 시 누락한 경우

API/impl 분리 구조에서 impl이 빠진 경우

⚠️ 실제 코드 + 로그 분석을 통해 원인 추적하기

6. 의존성 충돌 해결 전략 (10분)
   목표: Transitive dependency 충돌 해결법과 우회 전략을 체계화한다.

Maven의 dependencyManagement, exclusion

Gradle의 resolutionStrategy

dependency-lock, BOM, shadowJar의 사용과 주의사항

🔧 현상 분석: 버전 충돌 시 어떤 버전이 선택되는가? 왜 그랬는가?

7. 현대 JVM 환경에서의 의존성 철학 (5분)
   목표: 변화하는 환경에서의 의존성 관리 방향성을 제시한다.

JPMS(Java Platform Module System)의 이상과 현실

Spring Boot, Quarkus 등에서의 의존성 처리 방식

SCA(Software Composition Analysis): Snyk, OWASP Dependency Check

🔭 의문 제기: “모든 의존성은 명시돼야만 하는가?”