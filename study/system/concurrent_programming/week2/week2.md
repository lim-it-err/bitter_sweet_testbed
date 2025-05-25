# Programming Basics
## 2.3~ Introduction to Rust
### 탄생 배경
- Rust는 2006년 Mozilla 직원 Graydon Hoare 의 개인 프로젝트로 시작되었습니다. [ 16 ]
- Hoare는 아파트 건물의 엘리베이터가 고장나서 좌절한 후 이 프로젝트를 시작했습니다.
  - 메모리 충돌로 인한 고장이었다고 함.
- 호어는 '놀라울 정도로 강인한 균류'의 이름을 따 이 언어를 'Rust'라고 칭함

### A. Type System
* Keyword on Rust Homepage
- Performance 
  - blazingly fast 
  - memory-efficient: with no runtime or garbage collector
  - power performance-critical services, 
  - run on embedded devices, 
  - integrate with other languages.

- Reliability
  - rich type system and ownership model
  - memory-safety and thread-safety 
  - eliminate many classes of bugs at compile-time.

- Productivity
  - great documentation, 
  - a friendly compiler with useful error messages, and top-notch tooling 
  - an integrated package manager and build tool, 
  - smart multi-editor support with auto-completion and type inspections, 
  - an auto-formatter

:  “C만큼 빠르고, Java만큼 친절하며, Haskell만큼 똑똑한 언어”를 목표로 삼는다.



### B. Example
#### Hello World
```
fn main() {
println!("Hello, world!");
}
```

#### Ping pong
```
use std::thread;
use std::sync::mpsc;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        for i in 0..5 {
            println!("Ping {}", i);
            tx.send(()).unwrap();
            thread::sleep(Duration::from_millis(500));
        }
    });

    for _ in 0..5 {
        rx.recv().unwrap();
        println!("Pong");
    }

    handle.join().unwrap();
}

```
- mpsc::channel()은 한 방향 메시지 채널입니다.
  - Multi-producer, single-consumer FIFO queue communication primitives.
- tx.send() → 송신, rx.recv() → 수신
- move는 클로저가 외부 소유권을 가져오도록 합니다.
  - Rust에서 ||는 "무명 함수(익명 함수, 클로저, closure)"의 매개변수 리스트를 정의하는 문법입니다.
- thread::spawn으로 새로운 스레드 생성
- 0..5는 0 이상 5 미만,  0..=5는 0 이상 5 이하

#### Types
```
fn main() {
  let x: i32 = 42;  // immutable
  let mut y = 13;   // mutable
  y = y + 1;

  let z = 3.14; // f64 by default

  println!("x: {}, y: {}, z: {}", x, y, z);
  }
```
- let 키워드로 변수 선언 
- mut를 붙여야 변경 가능 
- 기본 정수형: i32, 부동소수형: f64 

#### Match (Switch)
```
fn main() {
  let number = 3;
    match number {
    1 => println!("One"),
    2 | 3 => println!("Two or Three"),
    4..=10 => println!("Between 4 and 10"),
    _ => println!("Something else"),
  }
}
```
* C의 switch는 문제가 많다는데, Rust는?
* 
| 항목                   | C의 `switch`   | Rust의 `match`                      |
| -------------------- | ------------- | ---------------------------------- |
| fallthrough          | 기본 동작 (실수 잦음) | ❌ 없음, 반드시 한 case만 실행               |
| exhaustiveness (완전성) | 없음            | ✅ 모든 경우를 반드시 처리해야 함                |
| pattern matching     | ❌ 정수만 가능      | ✅ enum, tuple, struct, guard 모두 가능 |
| 타입 안정성               | ❌ 없음          | ✅ 타입 체크 강제                         |
| 표현식 가능성              | ❌ 없음          | ✅ `match`는 표현식 (값 반환 가능)           |



#### Generics
```
fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
  let mut max = list[0];
    for &item in list.iter() {
    if item > max {
    max = item;
    }
  }
  max
}

fn main() {
  let nums = vec![10, 20, 30];
  println!("Largest: {}", largest(&nums));
}
```
- T: PartialOrd + Copy는 T가 비교 가능하고 복사 가능해야 함
  - 수학에서의 "부분 순서(partial order)" 개념
  - PartialOrd는 모든 값이 비교 가능하지 않아도 허용됩니다.
  - NaN은 f64에서 자기 자신과도 같지 않기 때문에 Ord를 구현할 수 없음.
  - 대신 PartialOrd만 구현
- &[T]는 T 타입의 슬라이스
- 여기서 max는, return max의 의미일까?
  - 맞다.

* expression에 의한 함수값의 리턴
  - `return max;` 과, `max` 모두 max를 리턴하라는 의미이다.
  - Rust에서는 ;로 끝나는 것을 `statement`라 한다.
  - ;가 없는 것은 `expression`이라고 한다. Rust는 expression 중심의 언어이다.

reference : https://wikidocs.net/265704

### Closure
> 힙에서의 자유 변수를 캡처하여 이를 함수에 적용.
```c
fn main() {
    let add_one = |x: i32| x + 1;
    println!("{}", add_one(5)); // 6
}

```
```c
fn main() {
let mut count = 0;

    let mut increment = || { //closure 자체도 Mutual 로 정의해야 됨.
        count += 1;
        println!("Count: {}", count);
    };

    increment(); // Count: 1
    increment(); // Count: 2
}
```
``` c
fn main() {
let s = String::from("Rust");

    let print = move || {
        println!("Captured: {}", s);
    };

    print(); // OK
    // println!("{}", s); // ❌ 오류: s의 소유권이 move됨
}
```
```c
use std::thread;

fn main() {
let s = String::from("hello");

    let closure = move || {
        println!("{}", s);
    };

    let handle1 = thread::spawn(closure);
    let handle2 = thread::spawn(closure); // 💥 error here!

    handle1.join().unwrap();
    handle2.join().unwrap();
}
```


* function pointer와 closure 의 관계 (function pointer가 더 유리한 경우)
* | 상황                  | function pointer (`fn`) 사용 이유 |
  | ------------------- | ----------------------------- |
  | 성능이 중요한 루프/콜백       | 정적 디스패치, 더 빠름                 |
  | FFI 연동 (C와 연결)      | 클로저는 안됨, `fn`은 가능             |
  | 외부 캡처 없는 고정 동작      | 클로저보다 가볍고 명확                  |
  | 컴파일 제한 필요           | 캡처 방지, 더 안전한 API 설계           |
  | 복잡한 trait bound 피하기 | 타입 지정 간단함                     |

### 소유권
| 언어             | 소유권 모델 완성도 | 설명                       |
| -------------- | ---------- | ------------------------ |
| **Rust**       | ✅ 완전 구현    | 소유권 + 빌림 + 수명 → 안전성 보장   |
| C++            | ⚠️ 부분 구현   | 스마트 포인터로 흉내, 컴파일러 강제는 없음 |
| Swift          | ⚠️ 점진적 도입  | move-only 타입은 연구 중       |
| Pony           | ✅ 완전 구현    | 세밀한 권한 제어, 채택률 낮음        |
| Cyclone        | ✅ 연구용 구현   | Rust의 사상적 기반             |
| Haskell/ML     | ❌ 없음       | 불변성과 참조 투명성으로 해결         |
| Java/C#/Python | ❌ 없음       | GC 기반, 참조 중심 모델          |

- C는 개발자가 수동으로 소유권을 관리해야 함 (malloc/free)
- C++11 이후에는 std::unique_ptr, std::shared_ptr 등으로 소유권 모델을 도입함

### 최종 예시
``` c
// Rc: 참조 카운팅 스마트 포인터 (다수 소유 가능)
// RefCell: 런타임 시점에서 내부 가변성(mutable)을 제공
use std::rc::Rc;
use std::cell::RefCell;

// ---------- Trait: Runnable ----------
// 공통 실행 인터페이스를 위한 트레잇 정의
trait Runnable {
fn run(&self); // 실행 메서드 정의 (구현체에 따라 동작)
}

// ---------- Struct: CommandRunner ----------
// 실행 가능한 명령들을 저장하고 실행할 수 있는 구조체
struct CommandRunner<'a> {
history: RefCell<Vec<&'a str>>, // 실행된 명령의 이름 기록 (내부 가변성 필요)
commands: Vec<Box<dyn Runnable + 'a>>, // 실행 가능한 명령들의 리스트 (trait 객체로 저장)
}

impl<'a> CommandRunner<'a> {
// 새로운 CommandRunner 인스턴스 생성
fn new() -> Self {
CommandRunner {
history: RefCell::new(vec![]), // 빈 기록 벡터 생성
commands: vec![],              // 빈 명령 리스트 생성
}
}

    // 명령 추가 메서드: 이름과 Runnable 객체를 추가
    fn add_command<T>(&mut self, label: &'a str, cmd: T)
    where
        T: Runnable + 'a, // 트레잇 객체로 저장 가능해야 함
    {
        self.commands.push(Box::new(cmd));       // 명령을 박스로 감싸고 저장
        self.history.borrow_mut().push(label);   // 이름도 기록에 추가 (mutable borrow)
    }

    // 저장된 모든 명령 실행
    fn run_all(&self) {
        for cmd in &self.commands {
            cmd.run(); // 각 명령 실행
        }
    }

    // 실행된 명령들의 이름 출력
    fn print_history(&self) {
        println!("Commands executed:");
        for h in self.history.borrow().iter() {
            println!("- {}", h); // 기록된 명령 이름 출력
        }
    }
}

// ---------- Function pointer example ----------
// 간단한 함수 정의 (명령으로 실행 가능)
fn say_hello() {
println!("Hello from function pointer!");
}

// 함수 포인터를 감싸는 구조체
struct FnCommand(fn()); // 함수 포인터 타입 저장

// FnCommand에 Runnable 트레잇 구현
impl Runnable for FnCommand {
fn run(&self) {
(self.0)(); // 저장된 함수 포인터 실행
}
}

// ---------- Closure example ----------
// 클로저를 감싸는 구조체 정의
struct ClosureCommand<F>
where
F: Fn(), // 인자로 아무것도 받지 않고 반환도 없는 클로저 타입
{
action: F, // 클로저 저장
}

// Runnable 트레잇을 ClosureCommand에 구현
impl<F> Runnable for ClosureCommand<F>
where
F: Fn(), // Fn 트레잇을 구현한 클로저만 가능
{
fn run(&self) {
(self.action)(); // 저장된 클로저 실행
}
}

// ---------- Main ----------
// 프로그램 진입점
fn main() {
let name = String::from("Rustacean"); // 이름 문자열
let count = Rc::new(RefCell::new(0)); // 실행 횟수를 추적할 Rc + RefCell

    let mut runner = CommandRunner::new(); // 명령 실행기 생성

    // 함수 포인터 기반 명령 추가
    runner.add_command("hello", FnCommand(say_hello));

    // 클로저 명령 생성 (name과 count를 move로 캡처)
    let name_closure = ClosureCommand {
        action: {
            let name = name.clone();          // name 복사
            let count = Rc::clone(&count);    // count의 참조 카운터 증가
            move || {
                *count.borrow_mut() += 1;     // count 증가
                println!("Hi {}, you ran this {} time(s)", name, count.borrow());
            }
        },
    };

    // 클로저 명령 추가
    runner.add_command("greet", name_closure);

    // 모든 명령 실행
    runner.run_all();

    // 실행 기록 출력
    runner.print_history();
}
```