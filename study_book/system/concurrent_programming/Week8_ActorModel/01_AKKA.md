메시지 패턴: tell, receive, context.system.terminate()

상태 공유 금지 / 비동기 메시지 기반 처리

스케줄링 정책:
- Run-to-completion
- Time-sliced (Erlang)
- Priority-based
- Mailbox-aware

악성 Actor 감지:
- Mailbox 길이 
- 처리시간 추적
- reduction count

대응 전략:

- SupervisorStrategy
- Circuit Breaker
- Kill Switch
- Dead Letter Queue