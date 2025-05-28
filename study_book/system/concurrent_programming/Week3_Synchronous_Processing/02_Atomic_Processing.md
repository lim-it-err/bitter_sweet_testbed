# Atomic 처리

## 1. Atomic 처리란?
- 더 이상 나눌 수 없는 처리 단위
- 처리 도중 실패하면 처리 전 상태로 완전 복원

## 2. Compare and Swap (CAS)

### 2.1 의미
- 동기 처리 기능의 데이터 구조를 구현하기 위해 이용되는 처리 방식
- 동기 처리 기능: Semaphore, lock-free, wait-free 등

```c
bool compare_and_swap(int *p, int val, int newVal){
    if (*p != val) return false;
    *p = newVal;
    return true;
}
```

- 위 코드는 atomic하지 않음
  - `if` 문에 의해 `*p = newVal`이 조건적으로 실행되므로, 동시 접근 시 race condition 발생 가능

- C 언어에서는 이를 atomic하게 처리하기 위해 내장 함수 또는 어셈블리를 사용할 수 있음
- 이는 하드웨어 명령어(`cmpxchg`)로 구현됨

---

### 2.2 구현체

#### Assembly

```asm
; void compare_and_swap(int *ptr, int expected, int new)
; 결과는 AL에 저장됨 (1: 성공, 0: 실패)

section .text
global compare_and_swap
compare_and_swap:
    ; 입력 인자:
    ; rdi = ptr
    ; esi = expected
    ; edx = new

    mov eax, esi            ; EAX ← expected
    lock cmpxchg [rdi], edx ; [rdi] == EAX이면 [rdi] ← edx
    sete al                 ; AL ← ZF == 1이면 1, 아니면 0
    ret
```

#### C (GCC/Clang 인라인 어셈블리)

```c
#include <stdbool.h>

bool compare_and_swap(int *ptr, int expected, int newVal) {
    unsigned char result;
    __asm__ __volatile__(
        "lock cmpxchg %2, %1;\n"
        "sete %0;\n"
        : "=q" (result), "+m" (*ptr), "+a" (expected)
        : "r" (newVal)
        : "memory"
    );
    return result;
}
```

#### Rust (nightly, `asm!` 사용)

```rust
#![feature(asm)]

use std::arch::asm;

pub fn compare_and_swap(ptr: &mut i32, expected: i32, new_val: i32) -> bool {
    let mut result: u8;

    unsafe {
        asm!(
            "lock cmpxchg [{ptr}], {new_val}",
            "sete {result}",
            ptr = in(reg) ptr,
            new_val = in(reg) new_val,
            inout("eax") expected => _,
            result = out(reg_byte) result,
            options(nostack, preserves_flags)
        );
    }

    result != 0
}
```

- 모두 하드웨어 수준에서 CAS 명령을 직접 사용하여 구현됨

---

### 2.3 실제 예시 (Linux Kernel)

```c
static void svm_vcpu_free(struct kvm_vcpu *vcpu)
{
    struct vcpu_svm *svm = to_svm(vcpu);

    /*
     * The vmcb page can be recycled, causing a false negative in
     * svm_vcpu_load(). So, ensure that no logical CPU has this
     * vmcb page recorded as its current vmcb.
     */
    svm_clear_current_vmcb(svm->vmcb);

    svm_leave_nested(vcpu);
    svm_free_nested(svm);

    sev_free_vcpu(vcpu);

    __free_page(__sme_pa_to_page(svm->vmcb01.pa));
    __free_pages(virt_to_page(svm->msrpm), get_order(MSRPM_SIZE));
}

static void svm_clear_current_vmcb(struct vmcb *vmcb)
{
    int i;

    for_each_online_cpu(i)
        cmpxchg(per_cpu_ptr(&svm_data.current_vmcb, i), vmcb, NULL);
}
```

#### 설명

1. `svm_vcpu_free(struct kvm_vcpu *vcpu)`
  - 가상 CPU(vCPU)가 해제될 때 호출되어 내부 리소스를 정리

2. `svm_clear_current_vmcb(svm->vmcb)`
  - vCPU가 사용하던 VMCB가 다른 CPU의 per-CPU 캐시에 남아 있지 않도록 `cmpxchg`를 통해 제거

#### 왜 CAS를 사용하는가?
- 멀티코어 환경에서 다른 CPU가 동시에 같은 VMCB를 참조할 수 있기 때문
- 단순한 `if (*ptr == old) *ptr = new` 식의 비교 후 대입은 race condition을 유발할 수 있음
- 따라서 atomic한 비교-교체 연산인 CAS가 필수

#### 결론
이 `cmpxchg`는 다음을 구현한다:

> "CPU별로 현재 활성 VMCB가 우리가 지우려는 것과 같으면, 원자적으로 NULL로 바꿔라."

이를 통해:
- race condition 없이 안전한 cleanup이 가능
- 멀티 CPU 환경에서 VMCB 재사용으로 인한 오작동 방지
