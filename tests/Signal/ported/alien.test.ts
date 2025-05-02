import {describe, expect, test} from 'vitest';
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
    expect(times).toBe(1)
  });



})

