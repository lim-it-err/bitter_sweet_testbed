# 1. Introduction
### 목표 : 클래스 파일을 로드하는 방법과 그 정보를 가상 머신 안에서 활용하는 방법
#### 메모리로 읽기 -> 검증 -> 변환 -> 초기화 -> 자바 타입 생성

- 다른 언어는 컴파일 시 링크까지 진행이 되나, Java는 프로그램 실행 중에 클래스 로딩, 링킹, 초기화가 모두 이루어짐
- AOT 컴파일에 제약이 생기고 클래스 로딩을 거치느라 실행 성능이 떨어짐. 
  - AOT 컴파일(Ahead-Of-Time Compilation)은 프로그램을 실행하기 전에 미리 컴파일하여 기계어 코드로 변환하는 방식. 
  - JIT(Just-In-Time) 컴파일과 대비되는 개념.
  - 제공 가능 이유 : 런타임에 이루어지는 동적 로딩과 동적 링킹
    - 인터페이스 중심으로 작성해두면 실제 구현 클래스를 결정하는 일은 실행시까지 미룰 수 있음.
    - C언어는 컴파일 시점에 모든 것이 정해져야 함.
> 인터페이스를 기준으로 코드를 짜면, 런타임에 어떤 구현 객체가 들어오더라도, 그 객체에 맞는 함수(메서드)가 자동으로 설정됨.
    
```
interface Animal {
    void speak();
}

class Dog implements Animal {
    public void speak() {
        System.out.println("Woof!");
    }
}

class Cat implements Animal {
    public void speak() {
        System.out.println("Meow!");
    }
}

```
```
public void makeItSpeak(Animal animal) {
animal.speak(); // Dog든 Cat이든 speak() 호출 가능!
}
```

