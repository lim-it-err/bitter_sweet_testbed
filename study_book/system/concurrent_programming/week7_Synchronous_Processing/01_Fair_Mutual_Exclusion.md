# 1 약한 공평성을 보장하는 락

아래 챕터에서는 3개의 락을 공부한다.
- 약한 공평성을 보장하는 기본적인 스핀락
- 순서를 명확히 보장하는 티켓 락(Ticket Lock)
- 고확장성과 캐시 효율성을 갖춘 MCS 락(Mellor-Crummey and Scott Lock)

이 때, 각각의 챕터에서는 `lock()`, `unlock()`을 구현한다.

들어가기 전에, fence(), Memory Barrier를 먼저 검토해보자

>>> fence()란?
>>> fence()는 CPU가 메모리 접근 순서를 강제로 보장하게 만드는 명령어 수준의 장치입니다.
>>> 즉, fence() 이전의 메모리 연산이 모두 완료된 후에만 그 다음 명령이 실행됩니다.

- 현대 CPU는 성능 향상을 위해 Out-of-Order Execution (OooE), Write Buffering, Speculative Execution 등을 사용합니다. 
- 이로 인해 프로그램이 작성한 순서와 실제 메모리 연산 순서가 다를 수 있습니다.




## 1.1 약한 공평성을 보장하는 락
- 특징 : 락을 우선적으로 획득할 수 있는 스레드를 지정한다.
- Array에서 waiting과 lock, turn 상태를 저장한다.


## 1.2 티켓락
- 변경점
  - 락 획득에서 경합을 줄이기 위한 방법


## 1.3 MCS Lock
- 목표 : O(1) handoff (제어권을 넘기는 것)
  - 각 코어별로 락을 관리할 수 있는가?
- 문제
  - 모든 스레드가 같은 메모리 주소를 polling 함
    - 캐시 invalidation 폭발
  - 코어가 많아질경우 처리량 급격히 저하

- 아이디어
  - 각 스레드는 자신만의 Q Node를 생성
  - 락에는 tail 포인터만 존재. 연결 리스트의 끝만을 가리킴
  - 락 획득 시 자신의 Q Node를 원자적으로 tail 에 연결
  - 이전 스레드의 Q Node에 자신의 Q Node를 Next로 설정, 그 Node를 스핀
  - 락 해제
    - 다음 Q Node가 없다면 CAS로 tail을 null로
    - 다음 Q Node가 있다면 해당 노드의 Locked값을 true로 세팅
    - 현재 락 보유자는 myQNode.next 가 null인지 확인함 
    - null이면 누군가 아직 붙지 않은 것 → “wait” 상태로 돌면서 next가 채워지기를 기다림 
    - next가 생기면 → next.locked = false 해줌 → handoff 완료
  - 