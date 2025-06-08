# 4. Recursive Lock

## 정의
- 락을 획득한 상태에서 프로세스가 그 락을 해제하기 전에 그 락을 획득
- 단, 데드락 상태에 빠지면 안됨

## 구현 방법
- 소유자 정보와, 재귀 횟수를 계산


``` c
    if (!locked) {
        locked = true;
        owner = current_thread();
        recursion_count = 1;
        } 
    else if (owner == current_thread()) {
        recursion_count++;
        } 
    else {
        block_current_thread();
    }
```
> 각 소유자별로, recursion depth를 계산 후 0이 되면 return