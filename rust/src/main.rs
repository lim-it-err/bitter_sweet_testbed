use futures::future::{BoxFuture, FutureExt};
use futures::task::{waker_ref, ArcWake};
use std::future::Future;
use std::pin::Pin;
use std::sync::mpsc::{sync_channel, Receiver, SyncSender };
use std::sync::{Arc, Mutex};
use std::task::{ Poll, Context };

struct Hello {
    state : StateHello,
}

enum StateHello{
    HELLO,
    WORLD,
    END
}

impl Hello {
    fn new() -> Self{
        Hello {
            state : StateHello::HELLO,
        }
    }
}

impl Future for Hello {
    type Output = ();

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output>{
        match(*self).state{
            StateHello::HELLO => {
                print!("Hello, ");
                (*self).state = StateHello::WORLD;
                Poll::Pending
            }
            StateHello::WORLD => {
                println!("World!");
                (*self).state = StateHello::END;
                Poll::Pending
            }
            StateHello::END => Poll::Ready(()),
        }
    }
}
struct Task{
    future: Mutex<BoxFuture<'static, ()>>,
    sender: SyncSender<Arc<Task>>,
}

impl ArcWake for Task {
    fn wake_by_ref(arc_self: &Arc<Self>) {
        let self0=arc_self.clone();
        arc_self.sender.send(self0).unwrap();
    }
}

struct Executor{
    sender: SyncSender<Arc<Task>>,
    receiver: Receiver<Arc<Task>>,
}

impl Executor{
    fn new() -> Self{
        let (sender, receiver) = sync_channel(1024);
        Executor{
            sender: sender.clone(),
            receiver,
        }
    }
    fn get_spawner(&self) -> Spawner {
        Spawner {
            sender: self.sender.clone(),
        }
    }

    fn run(&self) {
        while let Ok(task) = self.receiver.recv() { // 실행 Q에서 Task를 받아옴
            let mut future = task.future.lock().unwrap(); //해당 테스크를 잠금.
            let waker = waker_ref(&task); //waker가 해당 context를 읽음.
            let mut ctx = Context::from_waker(&*waker); // context를  불러옴
            let _ = future.as_mut().poll(&mut ctx); //poll
        }
    }
}

struct Spawner { // ❶
    sender: SyncSender<Arc<Task>>,
}

impl Spawner {
    fn spawn(&self, future: impl Future<Output = ()> + 'static + Send) {
        let future = future.boxed();
        let task = Arc::new(Task {
            future: Mutex::new(future),
            sender: self.sender.clone(),
        });

        // 실행 큐에 인큐
        self.sender.send(task).unwrap();
        print!("Spawner sent data into queue")
    }
}

fn main() {
    let executor = Executor::new();
    executor.get_spawner().spawn(Hello::new());
    executor.run();
}