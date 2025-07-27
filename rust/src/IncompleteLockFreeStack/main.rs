use std::ptr::null_mut;
use std::sync::atomic::{AtomicPtr, Ordering};

struct Node<T>{
    next: AtomicPtr<Node<T>>,
    data: T,
}

pub struct StackBad<T>{
    head: AtomicPtr<Node<T>>,
}

impl<T> StackBad<T>{
    pub fn new()-> Self{
        StackBad{
            head: AtomicPtr::new(null_mut()),
        }
    }

    pub fn push(&self, v: T){
        let node = Box::new(Node{
            next: AtomicPtr::new(null_mut()),
            // push에서 이것을 쓰는 이유는,
            // 새로운 노드를 만들때,
            // next를 아무것도 가리키지 않기 때문
            data: v,
        });
        let ptr = Box::into_raw(node);
        unsafe{
            loop {
                let head = self.head.load(Ordering::Relaxed);
                (*ptr).next.store(head, Ordering::Relaxed);

                if let Ok(_) = self.head.compare_exchange_weak(
                    head, ptr, Ordering::Release, Ordering::Relaxed
                ){
                    break;
                }
            }
        }
    }
    pub 


}