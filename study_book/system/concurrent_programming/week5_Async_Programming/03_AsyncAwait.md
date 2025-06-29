# 3. Async / Await
## 3.1  Future와 Async/Await
### Future의 정의
> 미래의 언젠가의 시점에서 값이 결정되는 것을 나타내는 데이터 타입
- 해당 기능을 규정한 trait(Interface)

### 암시적 Future vs 명시적 Future
- 암시적 Future
  - 일반적인 타입과 동일하게 기술됨
- 명시적 Future
  - 프로그래머 기술 필요
  - Async / Await
  - Callback
    - 가독성이 낮아짐. 콜백 지옥 가능

## 3.2. IO 다중화(Multiplexing)와 asaync/await
- Multiplexing
  - 하나의 자원을 여러 작업을 공유하면서 동시에 처리할 수 있도록 처리하는 기술
  - 한 개의 통로로 여러 개의 데이터 흐름을 겹쳐 보냄.
- IO Selector
  - Task 정보를 받아 감시, 이벤트 발생하면 wake()
  - 기존 Blocking 함수를 NonBlocking화 해야 함(i.e. TcpListener)
- 다중화
### 다양한 Future 구현
