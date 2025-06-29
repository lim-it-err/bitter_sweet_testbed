# 2. Coroutine and Scheduling

## 2.1. Coroutine
- 정의: 중단과 재개가 가능한 함수를 총칭
- 컨텍스트를 유지하는 경량 유지 단위
- 비선형적 흐름 구조

- 대칭 코루틴
  - 함수명을 명시적으로 지정하여 중단과 재개를 수행
- 비대칭 코루틴
  - 파이썬에서는 제너레이터로 불림
  - 파이썬에서는 async/await으로 스케줄링 가능하도록 수정된 특수한 비대칭 코루틴을 코루틴이라 부름(무슨뜻?)

- 다른 방식으로 Coroutine을 표현하는 방법
  - 상태를 기다리는 함수로 구현 (Rust)

자바에서는?

## 2. Scheduling
Futures가 처음에 poll을 하여 일을 완성할 수 없는 경우가 일반적임.
Future가 더 진전될 준비가 되면 polling을 유도함, 이는 Waker의 업무임
Executor에게 해당 task가 깨어나야 한다고 하는 wake() 메소드를 제공

그러므로, 위의 3개(Executor, Waker, Task)는 아래와 같은 인터페이스를 가지고 있어야 함
- Executor
  - `run()`: 큐에서 Task를 꺼내고 poll을 호출함
  - `get_spawner()`: 외부에서 Task를 등록할 수 있도록 Spawner를 생성
  - 내부에 `Queue<Task>` 존재

- Waker
  - `future: Mutex<Future>`: 실제 실행될 비동기 작업
  - `poll(ctx: &mut Context)`: 현재 상태에 따라 Ready 또는 Pending 반환
  - `wake()`에 의해 다시 실행 큐에 등록됨

- Task
  - `wake()`: 해당 Task를 다시 Executor 큐에 enqueue함
  - 내부적으로 `Arc<Wake>` 구현체를 통해 동작하며, `Task::sender.send(task.clone())` 같은 형태로 큐에 push

