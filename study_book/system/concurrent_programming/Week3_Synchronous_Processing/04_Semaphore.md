# 4. 뮤텍스

## 정의/설명

- 크리티컬 세션을 실행할 수 있는 프로세스를 최대 N개로 제한

```c
if (!semaphore_acquire(&cnt))   ;
else                        goto retry;
semaphore_release(&cnt);
```

### 4.1. LL/SC를 이용한 구현

