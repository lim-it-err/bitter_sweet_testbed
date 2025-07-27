pub struct ReadTrans<'a>{
    read_ver : u64,
    is_abort : bool,
    mem : &'a Memory
}

impl <'a> ReadTrans<'a>{
    fn new(mem: &'a Memory) -> ReadTrans<'a>{
        ReadTrans{
            is_abort : false,
            read_ver : mem.global_clock.load(Ordering::Acquire),

            mem
        }
    }

    pub fn load(&mut self, addr : usize) -> Option<[u8; STRIPE_SIZE] > {
        if self.is_abort {
            return None;
        }

        assert_eq!(addr & (STRIPE_SIZE - 1), 0);

        if !self.mem.test_not_modify(addr, self.read_ver){
            self.is_abort = true;
            return None;
        }

        fence(Ordering::Acquire);

        let mut mem = [0; STRIPE_SIZE];
        for (dst, src) in mem.iter_mut().zip(self.mem.mem[addr..addr+STRIPE_SIZE].iter()) {
            *dst = *src;
        }


    }

}