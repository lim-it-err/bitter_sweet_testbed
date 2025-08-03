출처
https://velog.io/@wansook0316/Actor-Model

## Actor Model 의 정의
- Actor Model은 병렬/분산 환경에서 상태와 계산을 캡슐화하여, 메시지 기반으로 상호작용하는 비동기 계산 모델입니다.
Actor: 계산 단위. 자신만의 상태(state)를 가짐
Message: 외부에서 Actor로 보내는 정보

## 특징
### 컨셉
- 모든 메시지는 비동기
- 상태는 절대 공유하지 않음 (shared-nothing)
- 동시성과 분산 시스템에 매우 적합

### Actor의 권한
- 자신의 상태를 변경
- 다른 Actor에게 메시지 전송
- 새로운 Actor 생성

#### 참고: Actor는 자기 스케줄을 관리하지 않는다. (ChatGPT)
```
“Actor는 자기 스케줄을 스스로 관리한다” → 부분적으로 맞음.

대부분의 구현체에서는 Actor가 자신이 처리할 타이밍을 정하지 않고,
**런타임 (예: Akka의 dispatcher, Erlang의 scheduler)**가 Actor 큐를 가져다 실행시켜요.

즉, 스케줄링은 Actor 자신이 하는 게 아니라 시스템이 한다는 점이 더 정확해요.

Actor는 "언제 처리하느냐"에 대해 응답을 미룰 수 있지만,
"언제 실행되느냐"에 대한 최종 결정권은 Actor Runtime이 가짐.

따라서 정확히 표현하면:
Actor는 비동기 메시지를 수신하면, 그 메시지를 처리할 권한은 있지만, 실행 시점은 시스템 스케줄러에 위임된다.
```

#### 참고 2: Actor의 자원 독점 문제
```
메시지 무한 루프, 내부 큐 폭주, sleep 없이 반복 처리하는 Actor
→ Run-to-completion을 고집하는 Actor는 시스템 스케줄러의 타 Actor 실행을 지연시킬 수 있어요.

해결 방법:
mailbox size 제한
backpressure 처리
fair scheduling
actor timeout 설정
```

