# 2. Implementing Cooperative Green Thread
## 2.2 Context

![img.png](img.png)

## 🔧 `set_context()`의 역할: Caller vs Callee

유저 수준의 스레드나 코루틴에서 컨텍스트를 저장할 때는 보통 `set_context()`와 같은 함수가 사용됩니다.

| 구분 | 동작 방식 |
|------|------------|
| **Caller (`set_context()`를 호출하는 쪽)** | 레지스터 상태가 **스택에 저장되지 않고 회피됨** |
| **Callee (`set_context()` 자체)** | 레지스터 상태를 **힙에 할당된 영역에 저장**하여, 나중에 복원 가능하도록 함 |

이러한 구분은 **일시적인 스택 프레임 저장**과 **지속적인 힙 기반 저장**을 명확히 나누는 목적이 있습니다.

## 컨텍스트 스위칭 - Caller

```
caller() {
...
switch_context(&prev_ctx, &next_ctx);
...
}
```
```
switch_context(prev, next) {
    if (set_context(prev) == 0) {
        jump_to(next); // longjmp or equivalent
    }
}
```

| 단계 | 함수                           | Caller의 역할 | Callee의 역할           |
| -- | ---------------------------- | ---------- | -------------------- |
| ①  | `switch_context(prev, next)` | 전환 요청      | -                    |
| ②  | `set_context(prev)`          | 저장 요청 호출   | 레지스터/스택을 **힙에 저장**   |
| ③  | `jump_to(next)`              | -          | **컨텍스트 복원 후** return |
| ④  | `set_context()` 복귀           | -          | return 값 ≠ 0 → 흐름 계속 |

---

## 6.2.3. 스레드 생성, 파기, 스케줄링

---
## 정리
`set_context()`는 호출자와 피호출자의 역할을 분리함으로써,  
안전하고 효율적인 사용자 수준의 컨텍스트 전환을 가능하게 만듭니다.