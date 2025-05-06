import {afterEach, describe, expect, test, vi} from 'vitest';
import {Signal} from '../../../src'

describe('Ported - Alien', () => {

  //https://github.com/stackblitz/alien-signals/blob/master/tests/computed.spec.ts#L4
  test('Should correctly propagate changes through computed signals', () => {
    const src = new Signal.State(0);
    const c1 = new Signal.Computed(() => src.get() % 2);
    const c2 = new Signal.Computed(() => c1.get());
    const c3 = new Signal.Computed(() => c2.get());

    c3.get();
    src.set(1);
    c2.get();
    src.set(3);

    expect(c3.get()).toBe(1);

  });

  //https://github.com/stackblitz/alien-signals/blob/master/tests/computed.spec.ts#L18
  test('Should propagate updated source value through chained computations', () => {
    const src = new Signal.State(0);
    const a = new Signal.Computed(() => src.get());
    const b = new Signal.Computed(() => a.get() % 2);
    const c = new Signal.Computed(() => src.get());
    const d = new Signal.Computed(() => b.get() + c.get());

    expect(d.get()).toBe(0);
    src.set(2);
    expect(d.get()).toBe(2);
  });

  //https://github.com/stackblitz/alien-signals/blob/master/tests/computed.spec.ts#L30
  test('Should handle flags that are indirectly updated during checkDirty', () => {
    const a = new Signal.State(false);
    const b = new Signal.Computed(() => a.get());
    const c = new Signal.Computed(() => {
      b.get();
      return 0;
    });
    const d = new Signal.Computed(() => {
      c.get();
      return b.get();

    });

    expect(d.get()).toBe(false);
    a.set(true);
    expect(d.get()).toBe(true);


  });

  //https://github.com/stackblitz/alien-signals/blob/master/tests/computed.spec.ts#L47
  test('Should not update if the signal value is reverted', () => {
    let times = 0;

    const src = new Signal.State(0);
    const c1 = new Signal.Computed(() => {
      times++;
      return src.get();
    });
    c1.get();
    expect(times).toBe(1);
    src.set(1);
    src.set(0);
    c1.get();
    expect(times).toBe(1) // failing here, times == 2
  });

  // Effect implementation taken from watcher.test.ts
  type Destructor = () => void;
  const notifySpy = vi.fn();

  const watcher = new Signal.subtle.Watcher(() => {
    notifySpy();
  });

  function effect(cb: () => Destructor | void): () => void {
    let destructor: Destructor | void;
    const c = new Signal.Computed(() => (destructor = cb()));
    watcher.watch(c);
    c.get();
    return () => {
      destructor?.();
      watcher.unwatch(c);
    };
  }

  // Forces tasks to be run
  function flushPending() {
    for (const signal of watcher.getPending()) {
      signal.get();
    }

    expect(watcher.getPending()).toStrictEqual([]);
  }

  afterEach(() => watcher.unwatch(...Signal.subtle.introspectSources(watcher)));

  // https://github.com/stackblitz/alien-signals/blob/master/tests/effect.spec.ts#L4
  test('Should clear subscriptions when untracked by all subscribers', () => {
    let bRunTimes = 0;

    const a = new Signal.State(0);
    const b = new Signal.Computed(() => {
      bRunTimes++;
      return a.get() * 2;
      }
    );

    const stopEffect = effect(() => {
      b.get();
    });

    expect(bRunTimes).toBe(1);
    a.set(2);
    flushPending();
    expect(bRunTimes).toBe(2);
    stopEffect();
    a.set(3);
    flushPending();
    expect(bRunTimes).toBe(2);

  });

  // https://github.com/stackblitz/alien-signals/blob/614fa6bb6fa680033d6788272ebcfeef1e072b39/tests/effect.spec.ts#L24
  test('Should not run untracked inner effect', () => {
    const a = new Signal.State(3);
    const b = new Signal.Computed(() => a.get() > 0);

    effect(() => {
      if (b.get()) {
        effect(() => {
          if (a.get() == 0) {
            throw new Error('bad');
          }
        });
      }
    });

    a.set(2);
    flushPending();
    a.set(1);
    flushPending();
    a.set(0);
    flushPending(); // throwing bad, should not run inner effect

  });

  // https://github.com/stackblitz/alien-signals/blob/614fa6bb6fa680033d6788272ebcfeef1e072b39/tests/effect.spec.ts#L84
  test('Should trigger inner effects in sequence', () => {
    const a = new Signal.State(0);
    const b = new Signal.State(0);
    const c = new Signal.Computed(() => a.get() - b.get());
    const order: string[] = [];

    effect(() => {
      c.get();

      effect(() => {
        order.push('first inner');
        a.get();
      });

      effect(() => {
        order.push('last inner');
        a.get();
        b.get();
      });
    });

    order.length = 0;

    // from alien repo
    // startBatch();
    // b(1);
    // a(1);
    // endBatch();

    b.set(1);
    a.set(1);
    flushPending() // simulate batched update ?

    expect(order).toEqual(['first inner', 'last inner']);
  });

  // https://github.com/stackblitz/alien-signals/blob/614fa6bb6fa680033d6788272ebcfeef1e072b39/tests/effect.spec.ts#L183
  test('Should duplicate subscribers do not affect the notify order', () => {
    const src1 = new Signal.State(0);
    const src2 = new Signal.State(0);
    const order: string[] = [];

    effect(() => {
      order.push('a');
      watcher.unwatch(src2)
      const isOne = src2.get() === 1;
      watcher.watch(src2);
      if (isOne) {
        src1.get();

      }
      src2.get();
      src1.get();
    });
    effect(() => {
      order.push('b');
      src1.get();

    });
    flushPending();
    src2.set(1);
    flushPending();
    order.length = 0;
    src1.set(src1.get() + 1);
    flushPending();
    expect(order).toEqual(['a','b']);

  });

  // https://github.com/stackblitz/alien-signals/blob/614fa6bb6fa680033d6788272ebcfeef1e072b39/tests/effect.spec.ts#L211
  test('Should handle side effect with inner effects', () => {
    const a = new Signal.State(0);
    const b = new Signal.State(0);
    const order: string[] = [];

    effect(() => {
      effect(() => {
        a.get();
        order.push('a');
      });
      effect(() => {
        b.get();
        order.push('b');
      });
      expect(order).toEqual(['a','b']);

      order.length = 0;
      b.set(1);
      a.set(1);
      expect(order).toEqual(['b', 'a']);
    });

    flushPending();

  });

  // https://github.com/stackblitz/alien-signals/blob/614fa6bb6fa680033d6788272ebcfeef1e072b39/tests/effect.spec.ts#L234
  test('Should handle flags are indirectly updated during checkDirty', () => {
    const a = new Signal.State(false);
    const b = new Signal.Computed(() => a.get());
    const c = new Signal.Computed(() => {
      b.get();
      return 0;
    });
    const d = new Signal.Computed(() => {
      c.get();
      return b.get();
    });
    let triggers = 0;

    effect(() => {
      d.get();
      triggers++;
    });
    expect(triggers).toBe(1);
    a.set(true);
    flushPending()
    expect(triggers).toBe(2);

  });


});

