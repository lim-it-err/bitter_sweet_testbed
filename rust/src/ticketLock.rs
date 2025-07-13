use std::cell::UnsafeCell;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::{fence, AtomicUsize, AutomicUsize, Ordering};

pub struct TicketLock<T>{
    ticket: AtomicUsize,
    turn: AtomicUsize,
    data: UnsafeCell<T>,
}

pub struct TicketLockGuard<'a, T>{
    ticket_lock : &'a TicketLock<T>,
}

impl<T> TicketLock<T>{
    pub fn new(v: T) -> Self{
        TicketLock{
            ticket: AtomicUsize::new(0),
            turn: AtomicUsize::new(0),
            data: UnsafeCell::new(v),
        }
    }

    pub fn lock(&self) -> TicketLockGuard<T>{
        let t = self.ticket.fetch_add(1, Ordering::Relaxed);
        //Ordering Relaxed와 Acquire의 차이는?
        while self.turn.load(Ordering::Relaxed) != t {}
        fence(Ordering::Acquire);

        TicketLockGuard{ticket_lock: self};
    }
}

impl <'a, T> Drop for TicketLockGuard<'a, T>{
    fn drop(&mut self){
        self.ticket_lock.turn.fetch_sub(1, Ordering::Release);
    }
}