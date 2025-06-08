# 7. Reader Writer Lock

### 전제
- Writer가 Exclusively하게 작동하면 실제로는 Race Condition이 발생하지 않음

### 설명
- 동 시간대 Writer lock은 1개만 존재
- Reader와 Writer는 각각의 구분되어 있음
- Reader와 Writer는 같은 시각에 락 획득 불가

## 7.1. 스핀락 기반 RW 락
```c
void rwlock_write_acquire(bool *lock, volatile int *rnt, int *wcnt){
  _sync_fetch_and_add(wcnt, 1);
  while (*rcnt);
  spinlock_acquire(lock)
}
```
- atomic하지 않은데 이 코드는 어떻게 설명해야 할까?
  - rcnt가 0이 될때까지 대기한다.
  - spinlock_acquire 하는 순간, rcnt가 만약 1이 된다면?
  - 
