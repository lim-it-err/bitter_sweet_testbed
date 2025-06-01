# 뮤텍스

## 정의/설명

- Mutual Execution의 약어
- 크리티컬 세션을 실행할 수 있는 프로세스를 최대 1개로 제한

```c
retry:
if (!lock)  lock = true;
else        goto retry;
lock = false;
```

### Test and Set으로의 변환
기존 코드는 `if(!lock)`과, `lock=true`간의 원자성을 보장하지 못함

- 변형된 코드
```c
if (!test_and_set(&lock))   ;
else                        goto retry;
tas_release(&lock);
```

## 3.1. Spinlock

- 락을 얻을 수 있을 때까지 루프를 반복
- 리소스가 비는 것을 기다리며 락을 획득하는 방법.

```c

volatile int tas_lock = 0;

void lock_tas() {
while (__sync_lock_test_and_set(&tas_lock, 1)) {
// Busy-wait
}
}

void unlock_tas() {
__sync_lock_release(&tas_lock); // sets it to 0
}

void critical_section() {
lock_tas();
// critical section
unlock_tas();
}
```

- 매번 TAS를 시도하는 것은 리소스에 부하가 듦
  - Write의 속도는 Read 속도의 1/10
```c
volatile int ttas_lock = 0;

void lock_ttas() {
while (1) {
while (ttas_lock);  // 1st test (read only, fast)
if (__sync_lock_test_and_set(&ttas_lock, 1) == 0) {
return;         // success
}
// Else, retry
}
}

void unlock_ttas() {
__sync_lock_release(&ttas_lock); // sets it to 0
}

void critical_section() {
lock_ttas();
// critical section
unlock_ttas();
}
```

