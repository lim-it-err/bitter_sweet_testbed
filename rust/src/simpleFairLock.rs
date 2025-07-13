use std::cell::UnsafeCell;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::{fence, AtomicBool, AtomicUsize, Ordering};

pub const NUM_LOCK: usize = 8;

// 비트 마스크 수?
const MASK : usize = NUM_LOCK - 1;

pub struct FairLock<T>{
    waiting : Vec<AtomicBool>,
    lock: AtomicBool,
    turn: AtomicUsize,
    data : UnsafeCell<T>,
}

pub struct FairLockGuard<'a, T>{
    fair_lock: &'a FairLock<T>,
    idx: usize,
}