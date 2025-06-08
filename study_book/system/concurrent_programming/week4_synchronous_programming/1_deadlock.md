# 1. Deadlock

## 1.1. 식사하는 철학자
### 등장 주체
- 철학자 (Processor, Thread)
- 식사 (Action, Next State)
- 포크 (Resources, State Transition)

-> State Machine에서 상태 전이(State Transition)으로 간주 가능함.
-> 포크 모두가 도달하지 않는 상황을 Deadlock이라 함.
-> 초기 상태에서 도달 가능하며, 다음 상태로 이동하지 않는 경우를 Deadlock이라고 함
