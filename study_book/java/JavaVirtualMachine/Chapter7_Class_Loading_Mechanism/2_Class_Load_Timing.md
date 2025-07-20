# 2. 클래스 로딩 시점
### 로딩 -> 검증 -> 준비 -> 해석 -> 초기화 -> 사용 -> 언로딩

- 능동 참조 : 타입 초기화를 촉발하는 경우, 6가지 방법이 존재한다.
  - 바이트코드 명령어 (new, getstatic ...)이 등장함에도 초기화가 일어나지 않은 경우
  - Class나 java.lang.reflect 등 리플렉션 메서드를 사용할 때 초기화가 일어나지 않은 경우
    - Reflection method 
    - | 리플렉션 메서드                                   | 설명               |
      | ------------------------------------------ | ---------------- |
      | `Class.forName(String name)`               | 클래스 로딩           |
      | `clazz.getDeclaredFields()`                | 모든 필드 조회         |
      | `clazz.getMethods()`                       | public 메서드 조회    |
      | `clazz.getConstructor(...)`                | 생성자 조회           |
      | `method.invoke(obj, args...)`              | 메서드 동적 실행        |
      | `field.setAccessible(true)`                | private 필드 접근 허용 |
      | `field.get(obj)` / `field.set(obj, value)` | 필드 읽기/쓰기         |

  - 클래스를 초기화할 때 상위 클래스가 초기화 되어 있지 않은 경우
  - ...

- 수동 참조 : 타입 초기화를 촉발하지 않는 그 외의 모든 참조 방식

TBD
