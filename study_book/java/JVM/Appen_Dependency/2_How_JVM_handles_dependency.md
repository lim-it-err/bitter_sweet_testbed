# JVM 내부 구조로 보는 의존성 처리 방식
   목표: 클래스가 어떻게 로드되고 의존성이 해결되는지를 구조적으로 분석한다.

## 2.1 Class 파일은 어떻게 실행되는가?
JVM은 .class 파일을 실행하려면 먼저 ClassLoader를 통해 메모리로 로드해야 함

로딩은 3단계:
- Loading – .class 파일을 읽어 메모리에 적재
- Linking – 검증, 준비(static field 초기화), symbol resolution 
- Initialization – static initializer 실행

필요한 클래스가 존재하지 않거나 충돌이 나면 ClassNotFoundException, NoClassDefFoundError 등이 발생

## 2.2 ClassLoader 구조와 Delegation 모델 (Bootstrap → Platform → App → Custom)
| ClassLoader            | 설명            | 클래스 로딩 경로                     |
| ---------------------- | ------------- | ----------------------------- |
| **Bootstrap**          | JVM 내부 기본 클래스 | `rt.jar`, `java.base`         |
| **Platform/Extension** | 확장된 JDK 기능    | `lib/ext/`, `modules`         |
| **Application**        | 사용자 코드와 라이브러리 | `classpath`, `lib/`           |
| **Custom**             | 프레임워크용        | OSGi, Web Container, Spring 등 |


Class.forName(), loadClass()의 의미와 작동 원리

같은 클래스 이름이 충돌할 경우 → Shadowing, masking

💥 실제 사례: 두 개의 다른 버전의 라이브러리 충돌 (예: log4j 1.x vs 2.x)
