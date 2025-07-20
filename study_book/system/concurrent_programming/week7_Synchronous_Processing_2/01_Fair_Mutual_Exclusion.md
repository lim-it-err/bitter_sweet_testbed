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
- 특징
  - ticket 획득 시 스핀을 수행하지 않음
  - 다른 스레드와의 컨텐션을 줄임.
    ✅ 1. Ticket Lock 개요
    Ticket Lock은 Spin Lock의 일종으로, **공정한 순서 보장(FIFO)**을 제공합니다.

핵심 아이디어는 대기자가 번호표(ticket)를 뽑고, 번호가 호출될 때까지 기다리는 것입니다. (Costco나 정육점 대기표 같은 개념)

✅ 2. Ticket Lock의 구조
Ticket Lock은 두 개의 공유 변수를 사용합니다:

변수 이름	역할
next_ticket	다음으로 배정할 번호 (티켓 발급기)
now_serving	현재 락을 잡은 티켓 번호 (서비스 중)

Acquire (lock 획득)
my_ticket = fetch_and_increment(next_ticket)
→ 자신의 ticket 번호를 얻음 (예: 34).

while (now_serving != my_ticket) {}
→ 자신의 번호가 호출될 때까지 계속 읽기만(read) 하며 대기.

Release (lock 해제)
now_serving += 1
→ 다음 번호를 가진 스레드에게 락을 넘김.

✅ 3. 왜 Ticket Lock은 더 좋은가?
📌 1. Read-Only Spin
now_serving 변수만 계속 읽기(read) 때문에, bus traffic 감소.

이전에 본 일반적인 Spin Lock은 test_and_set 같은 연산을 계속 쓰기(write) 하므로 cache invalidation이 빈번하게 발생함.

📌 2. 캐시 친화적(Cache-Friendly)
CPU는 now_serving을 **공유 모드(Shared Mode)**로 캐시에 저장.

락이 해제되기 전까지는 로컬 캐시에서만 읽음 → 메시지 없음.

락 해제 시, 모든 CPU의 캐시가 invalidation 되고 다시 읽으면서 bus traffic이 한 번 발생함.

✅ 4. 성능 문제: Scalability 한계
Ticket Lock은 순서를 보장하지만, 다음과 같은 문제가 있습니다:

❗ 문제: 핸드오프 비용 증가
락을 해제하면 모든 대기 CPU는 now_serving을 다시 읽기 위해 bus에 메시지를 날림 (Read-for-Ownership 또는 Find 메시지).

CPU가 많을수록 → 락 하나 해제에 드는 총 비용이 O(n), 심지어 n명이 동시에 다시 읽기 때문에 **O(n²)**으로 증가할 수 있음.

예시:
1명이 락을 해제하면 → 10개의 CPU가 동시에 다시 읽기 시도 → 총 10개의 Find 메시지 전파

✅ 5. 성능 측정 (Measurement)
✔ 락이 자기 캐시에 남아있을 때 (Uncontended)
비용: 40 cycles ≈ 40 ns

✔ 락을 다른 CPU가 마지막으로 사용했을 때
비용: 100 cycles

✔ 수십 개의 코어가 대기 중일 때
비용: 수천 cycles
→ 각 CPU의 읽기 시도와 캐시 무효화가 누적되어 성능 저하

✅ 6. 성능 그래프 예시
락을 걸고 있는 코드의 Critical Section이 전체의 **7%**일 때:

이론적으로 최대 1 / 0.07 ≈ 14배 속도 향상이 가능함.

하지만 실제로는 9개 코어부터 속도 향상 정체.

이유: 핸드오프 시간도 직렬화 구간에 포함되기 때문.

총 직렬 시간 = Critical Section + Handoff Time

✅ 요약
장점	단점
✅ 공정성 (FIFO) 보장	❌ 대기자 수 증가 시 성능 저하
✅ Read-only Spin으로 bus traffic 감소	❌ 락 해제 시 모든 CPU가 동시에 읽어 O(n²) 문제 발생
✅ 간단한 구현	❌ 대규모 시스템에선 확장성 부족

🔜 다음 개선 방향: MCS Lock
위 문제점(O(n²))을 해결하기 위해 → MCS Lock이 도입됩니다.

각 스레드가 자신의 노드를 가지며, 다음 대기자를 직접 지정하여 O(1) 시간에 핸드오프 가능



## 1.3 MCS Lock
- 목표 : O(1) handoff (제어권을 넘기는 것)
  - 각 코어별로 락을 관리할 수 있는가?
- 문제
  - 모든 스레드가 같은 메모리 주소를 polling 함
    - 캐시 invalidation 폭발
  - 코어가 많아질경우 처리량 급격히 저하

- 아이디어
  - 각 스레드는 자신만의 Q Node를 생성
    - 락 획득 중인 스레드(CAS)는 큐에 넣고,
    - load & spin 은 공유 변수를 통해 시행하면서 접근 point를 분리
  - 락에는 tail 포인터만 존재. 연결 리스트의 끝만을 가리킴
  - 락 획득 시 자신의 Q Node를 원자적으로 tail 에 연결
  - 이전 스레드의 Q Node에 자신의 Q Node를 Next로 설정, 그 Node를 스핀
  - 락 해제
    - 다음 Q Node가 없다면 CAS로 tail을 null로
    - 다음 Q Node가 있다면 해당 노드의 Locked값을 true로 세팅
    - 현재 락 보유자는 myQNode.next 가 null인지 확인함 
    - null이면 누군가 아직 붙지 않은 것 → “wait” 상태로 돌면서 next가 채워지기를 기다림 
    - next가 생기면 → next.locked = false 해줌 → handoff 완료
