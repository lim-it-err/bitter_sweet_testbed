4. Build Tool이 하는 일: Maven/Gradle 비교 (10분)]()
>  목표: 개발자가 선언한 의존성을 빌드 도구가 어떻게 해석하고 처리하는지, 특히 Transitive Dependency 해결 원리를 중심으로 깊이 있게 분석한다.

# 4.1 Build Tool이 수행하는 핵심 역할
- 의존성 해석 (Dependency Resolution)
  - 직접 선언된 의존성 + 트랜지티브 의존성 포함 
  - 버전 충돌이 발생하면 규칙에 따라 우선순위 결정 
- Scope/Configuration 관리 
  - Maven: compile, provided, runtime, test 등 
  - Gradle: implementation, api, compileOnly, runtimeOnly
- 버전 고정 및 충돌 조정 
  - Maven dependencyManagement 
  - Gradle resolutionStrategy

## 4.2 Transitive Dependency 구조와 Resolution 로직
- 의존성 트리 (Dependency Tree)
  - DAG (Directed Acyclic Graph) 형태로 표현 
  - 중복된 라이브러리는 root와의 거리, 선언 명시 여부 등으로 우선순위 결정

- Maven vs Gradle 정책 비교
  | 항목    | Maven 방식                   | Gradle 방식                              |
  | ----- | -------------------------- | -------------------------------------- |
  | 우선순위  | dependencyManagement 우선 조정 | nearest-first (root에 가까운 것)            |
  | 버전 충돌 | 선언된 최상위 버전 → 하위의 버전 무시     | root에 가까운 경로 우선                        |
  | 제거 방식 | `<exclusions>` 태그 사용       | `resolutionStrategy.reject`, `force` 등 |

## 4.3 IDE vs CLI: 왜 Eclipse에서는 되는데 gradlew build는 실패할까?
IDE는 context-aware 방식으로 compile classpath만 설정 → runtime-only 누락되고도 빌드 성공

CLI는 빌드 스크립트 기반으로 정확히 Scope에 맞게 설정 → 누락된 경우 오류 발생

## 4.4 Maven Vs Gradle
```
com.example:app:1.0
├─ foo-core:2.0
│   └─ bar-utils:1.1
│       └─ commons-logging:1.0
└─ foo-utils:1.5
└─ commons-logging:1.2
```
- Maven은 dependencyManagement → commons‑logging: 1.2로 고정
- Gradle은 foo-utils 경로(1.5 루트 가까움)를 우선시

