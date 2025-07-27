3. JAR 파일, 모듈, 경로: 로딩 우선순위 실험 (10분)
>목표: 동일한 클래스 또는 동일한 이름의 JAR이 여러 위치에 존재할 때,</br>
> JVM은 어떤 것을 먼저 로드하는가? </br>
> 의도된 동작과 의도되지 않은 동작을 구분할 수 있도록 한다.

## 3.1. JVM이 클래스를 찾는 대상들
| 위치                                         | 설명                         |
| ------------------------------------------ | -------------------------- |
| `-classpath` 또는 `CLASSPATH` 환경 변수          | Java 8까지 기본                |
| `-module-path`                             | Java 9 이상에서 모듈 시스템에 필요한 경로 |
| `lib/`, `target/classes/`                  | IDE나 빌드 도구가 자동으로 포함        |
| JAR 내부의 `BOOT-INF/classes`, `BOOT-INF/lib` | Spring Boot 등 Fat Jar 구조   |
| Java Agent JAR (`-javaagent`)              | 런타임 중 코드 변조 목적             |


- Classpath의 순서가 곧 우선순위 
- 모듈 시스템은 이를 명시적으로 통제하려는 시도 

- https://docs.oracle.com/javase/8/docs/technotes/tools/windows/classpath.html?utm_source=chatgpt.com
- https://docs.oracle.com/javase/8/docs/technotes/tools/findingclasses.html
- https://en.wikipedia.org/wiki/Java_class_loader?utm_source=chatgpt.com