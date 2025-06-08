# 동기 처리 1 (하드웨어 메커니즘, Rust와 C의 동기 처리 기법, 알고리즘)
## 1. Race Condition
### Race Condition
  - 예상치 않는 이상이나 상태
  - 여러 프로세스가 동시에 공유하는 자원에 접근했을 때

### Critical Section
  - Race condition을 일으키는 프로그램 코드 부분

## 2. (추가) Lock Prefix와 작동 원리
### 의미
- Lock Prefix는 특정한 Opcode와만 동작한다(15가지)
  - 원자성을 보장할 수 있는 Opcode에만 동작
  - 내부적으로 파이프라인 병렬 처리가 걸려있지 않는 경우
  - 즉, RMW(read-modify-write) 연산인경우
- 원자적으로 실행되어야 하며, 다른 코어/CPU가 이 메모리에 조작하지 않도록 함




| TAS                 | CAS                        |
| ------------------- | -------------------------- |
| 단순 락 획득             | 값 비교 후 교체                  |
| 예: Spinlock 구현      | 예: Concurrent Stack, Queue |
| 표현력 낮음              | 표현력 높음 (ABA 문제 등도 고려 가능)   |
| 고정된 목적 (mutex-like) | 범용 동기화 원자 연산               |

즉, TAS는 저수준의 단순한 “진입권 요청”에 적합한 도구이고,
CAS는 조건부 상태 변화가 필요한 복합한 비동기 프로그래밍에서 사용되는 도구

TAS와 CAS는 단순한 구현 차이가 아니라,
서로 다른 "동시성 모델"을 위한 원자 연산 도구입니다.

TAS는 "내가 들어갈 수 있나?"만 보는 primitive한 락 도구

CAS는 "값이 변하지 않았을 때만 바꾸자"는 표현력 있는 조건부 연산

그래서 운영체제 책, CPU 설계 문서, 동시성 프로그래밍 이론에서 이 둘은 별도로 정의되고 교육됩니다.

## 3. 각 장과의 상관관계
```
동시성 처리 (Concurrency)
│
├── 1. 상호 배제 (Mutual Exclusion)
│   ├── Mutex (뮤텍스, POSIX pthread_mutex, Java synchronized)
│   ├── Binary Semaphore (1개의 리소스 → 뮤텍스처럼 사용)
│   ├── Spinlock (짧은 대기 시간에 유리, busy-wait 기반)
│   └── Atomic Operations
│       ├── Test-And-Set (TAS)
│       ├── Compare-And-Swap (CAS)
│       └── Load-Link/Store-Conditional (LL/SC, e.g., ARM, RISC-V)
│
├── 2. 상태 기반 조건 동기화 (Condition Synchronization)
│   ├── Condition Variable (wait/signal, POSIX 조건 변수, Java `wait()/notify()`)
│   ├── Counting Semaphore (N개의 리소스를 보호, 예: 세마포어 5 → 5개까지 동시에 허용)
│   ├── Futex (Linux fast userspace mutex - 커널 진입 최소화)
│   └── Monitor (Java의 객체 모니터, `synchronized`에서 내부 사용)
│
├── 3. 그룹 동기화 (Collective Synchronization)
│   ├── Barrier
│   │   ├── Static Barrier (고정된 스레드 수)
│   │   └── Dynamic Barrier (조정 가능한 참가자 수)
│   └── Latch / Countdown Latch (특정 수만큼 이벤트가 완료되면 해제)
│
├── 4. Readers–Writer Locks (읽기-쓰기 락)
│   ├── Shared Lock (여러 읽기 허용)
│   └── Exclusive Lock (쓰기 시 단독 접근)
│   ※ POSIX `pthread_rwlock`, Java `ReentrantReadWriteLock`
│
├── 5. 생산자-소비자 모델 (Producer–Consumer)
│   ├── Bounded Buffer / Circular Queue
│   ├── BlockingQueue (Java), Channel (Rust, Go)
│   └── Pipe (UNIX), Message Queue (SysV, POSIX, ZeroMQ, etc.)
│
└── 6. 고수준 동시성 추상화 (Modern Abstractions)
├── Task-based Concurrency (async/await, coroutine)
├── Executor / Thread Pool (Java `ExecutorService`, Rust `tokio`, Python `concurrent.futures`)
├── Actor Model (Akka, Erlang, Rust `actix`)
├── Transactional Memory (STM: Software Transactional Memory)
└── Data Parallelism (OpenMP, CUDA, Rayon)
```