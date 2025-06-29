# 4. Async Library
## Tokio 와 Multithread 실행 예시
### Tokio vs 일반 스레드
- 스레드 생성은 비쌈 (단위 시간 당 커넥션 도착 수 유지 필요)
- Tokio 같은 라이브러리 : 미리 생성해 둔 스레드를 이용해 태스크 실행

이런 실행 모델을 스레드 풀이라 함. (Tokio: CPU Core 수만큼)

### Sleep을 쓰지 말 것
- Async에서 Sleep은 워크 스레드를 점유할 뿐.
- Tokio에서는 Executor에 의해 태스크가 워크 스레드에서 대피

### Lock과 Await
- Mutex 락을 얻은 상태에서 await를 수행하면 데드락 발생 가능
- await 전에 락을 해제하거나, sync 락을 사용하지 말 것

### 채널 주의
- channel은 스레드를 블록할 가능성이 있음.
- 이에, Tokio에서는 아래와 같은 채널을 이용 가능함
  - mpsc
  - oneshot
  - broadcast
  - watch

### Blocking
- 전용 블로킹을 수행해야 함
  - `spawn_blocking`