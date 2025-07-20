use std::sync::atomic::Ordering;

const STRIPE_SIZE: usize = 8;

const MEM_SIZE: usize = 512;

pub struct Memory{
    mem : Vec<u8>,
    lock_ver: Vec<AtomicU64>,
    global_clock: AtomicU64,

    shift_size: u32, //XXX : 주소 -> 스트라이프 이동량
}

impl Memory{
    pub fn new()-> Self{
        let mem = [0].repeat(MEM_SIZE);
        let shift = STRIPE_SIZE.trailing_zeros();

        let mut lock_ver = Vec::new(); // XXX : 비관적 락을 쓰네
        for _ in 0..MEM_SIZE >> shift{
            lock_ver.push(AtomicU64::new(0));
        }

        Memory{
            mem, lock_ver, global_clock: AtomicU64::new(0),shift_size: shift
        }
    }
    fn inc_global_clock(&mut self)-> u64{
        // XXX : 이 연산은 AcqRel, 즉 Acquire + Release 메모리 오더링을 가짐
        // Write 이전 연산들은 fetch_add 이전에 실행되어야 하고,
        // fetch_add 이후 읽는 연산들은 fetch_add 이후에 실행되어야 함
        self.global_clock.fetch_add(1,Ordering::AcqRel)
    }
    fn get_addr_ver(&self, addr: usize) -> u64{
        let idx = addr >> self.shift_size;
        let n = self.lock_ver[idx].load(Ordering::Relaxed);
        // Relaxed	값만 정확하면 되는 경우 (카운터 등)
        // Acquire	읽기 동기화	이전 write들이 이후 읽기에 보이도록 보장
        // Release	쓰기 동기화	이전 write들이 다른 스레드에 보이도록 보장
        // AcqRel	읽기 + 쓰기 동기화
    }
    //XXX: 대상 주서의 버전이 rv 이하로 락 되어 있는지 확인
    fn test_not_modify(&self, addr:usize, rv:u64) -> bool{
        let idx = addr >> self.shift_size; // XXX : 주소 -> Stripe
        let n = self.lock_ver[idx].load(Ordering::Relaxed);
        n<=rv
    }


}

