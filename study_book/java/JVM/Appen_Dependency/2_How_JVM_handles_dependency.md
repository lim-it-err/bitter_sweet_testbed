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

- Delegation Model (부모 위임)
  - 이벤트가 발생하면 해당 이벤트를 리스너(Listener) 객체에 위임(delegate) 하는 구조

>우리가 직접 만든 클래스 com.example.MyClass가 있고,</br>
>시스템 ClassLoader는 이 클래스를 모른다.</br>
>그래서 커스텀 ClassLoader가 직접 파일을 읽어 로딩해야 한다.
``` java
public class MyClassLoader extends ClassLoader {

    @Override
        public Class<?> loadClass(String name) throws ClassNotFoundException {
        // 1. 먼저 부모에게 위임
        try {
            return super.loadClass(name);
        } catch (ClassNotFoundException e) {
            // 2. 부모가 못 찾으면, 내가 직접 로딩 시도
            System.out.println("Parent couldn't find: " + name);
}

    // 3. 직접 로딩 (예시로 생략)
    byte[] classData = loadClassData(name); // class 파일 바이너리 읽기
    if (classData == null) {
        throw new ClassNotFoundException(name);
        }

    return defineClass(name, classData, 0, classData.length);
    }

private byte[] loadClassData(String className) {
    // 파일에서 class를 바이너리로 읽는 코드 생략
    return null;
    }
}

```

loadClass() 호출 시 → 먼저 부모에게 위임 → 부모가 없을 경우 자기 자신이 시도

목적: 핵심 Java API 클래스들을 보안상 상위 ClassLoader가 책임지도록
- 핵심 API 클래스 (예: java.lang.String, java.util.List)
- 반드시 JVM에서 제공하는 Bootstrap ClassLoader 가 로딩
- 이를 통해 사용자 정의 코드나 악의적인 코드가 java.lang.String 같은 클래스를 덮어쓰지 못하게 막습니다.

## 2.3 Class Shadowing: 중복 클래스 충돌
- 두 개의 JAR 파일이 동일한 FQN(예: com.example.A) 클래스를 포함하고 있을 때
- ClassLoader의 탐색 순서에 따라 먼저 발견된 클래스가 사용됨 
- 이는 명시적이지 않기 때문에 의도되지 않은 동작을 유발

-= 예시: SLF4J에서 slf4j-api.jar과 slf4j-simple.jar, logback.jar가 함께 있으면 충돌
### 2.3.1 Masking
| 항목    | 설명                                                                   |
| ----- | -------------------------------------------------------------------- |
| 정의    | **부모 ClassLoader가 로딩한 클래스**가 존재하지만, 하위 ClassLoader가 위임을 깨고 직접 클래스 로딩 |
| 결과    | 이름은 같지만 **Class 객체가 다름** (로더가 다르므로 완전히 다른 타입)                        |
| 사용 예시 | Tomcat, OSGi, Spring Boot → 하위 ClassLoader가 우선 로딩                    |
| 위험    | 같은 이름의 클래스인데 `instanceof`, `cast` 등이 실패함                             |


| 항목                | Shadowing               | Masking                                   |
| ----------------- | ----------------------- | ----------------------------------------- |
| 기본 delegation 따름? | ✅ 예                     | ❌ 아니오 (깨뜨림)                               |
| 의도적?              | 보통 ❌                    | 대부분 ✅                                     |
| 발생 빈도 (일반 앱)      | **매우 흔함** (하지만 대부분 무시됨) | **거의 없음** (특수 상황만 발생)                     |
| 발생 빈도 (프레임워크)     | 적음                      | **자주** (격리 필요할 때 사용)                      |
| 문제 발생 가능성         | 낮음                      | 높음 (`ClassCastException`, `LinkageError`) |

예시. PowerMock
- Java에서 final, private, static 메서드를 mocking할 수 없는데,
- PowerMock은 custom ClassLoader를 통해 Masking 구조로 클래스를 다시 정의하여 mocking 가능하게 만듭니다.
💥 실제 사례: 두 개의 다른 버전의 라이브러리 충돌 (예: log4j 1.x vs 2.x)
