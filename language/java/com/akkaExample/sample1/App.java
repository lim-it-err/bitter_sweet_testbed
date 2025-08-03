// 1. 필수 Akka 라이브러리 import
import akka.actor.AbstractActor;
import akka.actor.ActorRef;
import akka.actor.ActorSystem;
import akka.actor.Props;

// 2. 메시지 클래스 정의 (불변 클래스로 만드는 것이 일반적)
public class Greet {
    public final String name;
    public Greet(String name) {
        this.name = name;
    }
}

public class Shutdown {}

// 3. Actor 클래스 정의
public class Greeter extends AbstractActor {

    // 메시지 처리 정의
    @Override
    public Receive createReceive() {
        return receiveBuilder()
                .match(Greet.class, greet -> {
                    System.out.println("Hello, " + greet.name + "!");
                })
                .match(Shutdown.class, msg -> {
                    System.out.println("Shutting down...");
                    getContext().getSystem().terminate();
                })
                .build();
    }
}

// 4. Main 함수에서 ActorSystem 실행
public class Main {
    public static void main(String[] args) {
        // ActorSystem 생성
        ActorSystem system = ActorSystem.create("MyActorSystem");

        // Greeter Actor 생성
        ActorRef greeter = system.actorOf(Props.create(Greeter.class), "greeter");

        // 메시지 전송 (비동기)
        greeter.tell(new Greet("Alice"), ActorRef.noSender());
        greeter.tell(new Greet("Bob"), ActorRef.noSender());
        greeter.tell(new Shutdown(), ActorRef.noSender());
    }
}
