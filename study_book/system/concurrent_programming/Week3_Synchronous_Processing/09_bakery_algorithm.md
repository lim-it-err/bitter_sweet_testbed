# 9. Bakery Algorithm

## 배경
- CPU 에서 Atomic 연산을 처리 하지 않는 경우
  - e.g) 

## 설명
1. 접수 후 번호가 담긴 티켓을 받는다
2. 다른 대기중인 사람들이 가진 티켓보다 자신의 번호가 작은 경우

## 전제
1. 중앙화된 제어가 아님.
> "Our algorithm provides a new, simple solution to the mutual exclusion problem. Since it does not depend upon any form of central control, it is less sensitive to component failure than previous solutions."
https://lamport.azurewebsites.net/pubs/bakery.pdf

## 설명

### 어디서 Atomic을 보장받는가?
- 접수 후 번호가 티켓을 받을 때는 Atomic을 보장받지 않는다
  - 분산되어 있는 컴퓨터가 각각의 번호를 중복하여 보낼 수 있다.
- 이후 대기를 하며 같은 번호 상 비교할때, Atomic을 보장한다.
```
for (j = 0; j < N; j++) {
  while (choosing[j]);   // 상대방이 티켓을 고르는 중이면 대기

  while (number[j] != 0 && (
  number[j] < number[i] ||
  (number[j] == number[i] && j < i)
  ));
  }
```






