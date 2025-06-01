# 5. 조건 변수

## 정의/설명
- 특정 조건이 만족될 때까지 기다렸다가 다시 실행되는 동기화 수단


### Producer-Consumer
- 프로그래밍 모델
- 생산자와 소비자로 나누어 접근 주체 명확히 함.

```c
// 소비자
lock(mutex)
while (buffer_is_empty())
wait(cond, mutex);   // 조건 변수 기다림
consume();
unlock(mutex);

// 생산자
lock(mutex)
produce();
signal(cond);           // 조건 만족됨을 알림
unlock(mutex)
```

- `signal`을 통해 대기중인 스레드 하나만을 대상으로 알림 수행
- `broadcast`는 모든 스레드게에 알림.
