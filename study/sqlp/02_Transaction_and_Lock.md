# 트랜잭션과 Lock

## 1. 개요

### Oracle의 특성
- Oracle은 **데이터 읽기 시 Lock을 사용하지 않음**
- 대신 **Undo를 활용한 읽기 일관성**을 제공
- 반면 DB2, SQL Server, Sybase 등은 **Lock 기반 일관성**을 사용

### Lock의 역할
- 동시성 제어가 핵심 목적
- Lock은 내부 메타데이터 보호, 스키마 변경, 시스템 자원 관리, 트랜잭션 복구 등 다양한 용도로 사용됨

---

## 2. 트랜잭션 동시성 제어

### ACID 원칙

| 요소     | 설명 |
|----------|------|
| 원자성 (Atomicity) | All-or-nothing 처리 |
| 일관성 (Consistency) | 트랜잭션 전후 상태가 항상 제약조건을 만족해야 함 |
| 고립성 (Isolation) | 트랜잭션 간 간섭 없이 수행 |
| 지속성 (Durability) | 커밋된 데이터는 영구적으로 보존됨 |

> Consistency는 단순한 DB 제약조건을 넘어서 **애플리케이션의 논리적 일관성**까지 포괄할 수 있음

---

## 3. 읽기 일관성 수준

### Statement-Level vs Transaction-Level
- **Statement-Level**: 단일 SQL 문 실행 동안의 일관성 보장
- **Transaction-Level**: 트랜잭션 전체 동안 동일한 스냅샷 유지, **고립화 수준 필요**

### 고립화 수준과 특성

| 수준 | 설명 |
|------|------|
| Read Uncommitted | 커밋되지 않은 데이터를 읽음 (Dirty Read) |
| Read Committed | 커밋된 데이터만 읽음 (대부분 DBMS 기본값) |
| Repeatable Read | 이미 읽은 데이터는 트랜잭션 종료까지 변경 불가 |
| Serializable | 다른 트랜잭션이 삽입도 못함, 가장 강력한 고립 수준 |

---

## 4. 비유적 설명: 버스 시나리오

- **Dirty Read**: 승객이 이미 다른 버스에 탔다면?
- **Non-repeatable Read**: 승객 수가 바뀌었다면?
- **Phantom Read**: 새로운 승객이 추가되었다면?

---

## 5. Oracle의 특징

- 높은 고립화 수준에서도 Lock을 사용하지 않음 → 동시성 저하 없음

---

## 6. 동시성 제어 방식

### 비관적 vs 낙관적

| 구분 | 비관적 동시성 제어 | 낙관적 동시성 제어 |
|------|---------------------|---------------------|
| 전제 | 충돌 가능성 있음 | 충돌 가능성 낮음 |
| 방식 | 사전 Lock | 후속 검증 |
| 구현 | `SELECT ... FOR UPDATE` | 버전 체크, 수정 전 재조회 등 |

---

## 7. 구현 사례

### 일련번호 채번
- Sequence 사용 불가능 시 Max+1 방식
- 충돌 방지를 위해 **채번 테이블 + 자율 트랜잭션 함수** 활용

```sql
CREATE OR REPLACE FUNCTION get_next_seq RETURN NUMBER IS
  PRAGMA AUTONOMOUS_TRANSACTION;
  next_val NUMBER;
BEGIN
  SELECT seq_value + 1 INTO next_val FROM sequence_table FOR UPDATE;
  UPDATE sequence_table SET seq_value = next_val;
  COMMIT;
  RETURN next_val;
END;
```

---

## 8. Lock 종류 (Oracle)

### 주요 Lock

- DML Lock: Table Lock, Row Lock
- DDL Lock
- Latch: 가벼운 구조 보호
- Library Cache Lock/Pin
- Buffer Lock

### Enqueue Lock
- TX, TM 등 구체적인 리소스에 대해 직렬화된 접근 보장

---

## 9. TX Lock과 Row Lock

- Row Lock만으로는 Undo 블록 추적 불가 → TX Lock 필요
- TX Lock은 충돌 감지 및 대기 관리에도 활용됨

---

## 10. 트랜잭션 길이와 문제점

### 너무 길 경우
- Undo 공간 고갈
- Undo 경합
- 시스템 성능 저하

### 너무 짧을 경우
- Snapshot Too Old 오류
- 로그 버퍼 플러시 과도 → 성능 저하

---

## 11. 결론

- Lock은 단순 동시성 제어 이상의 복합적인 역할 수행
- DBMS의 특성과 애플리케이션 아키텍처(N-Tier 등)에 따라 적절한 동시성 제어 전략이 필요함
