import { afterEach, describe, expect, test, vi } from 'vitest';
import { Signal } from '../../../src';

describe('Ported - Solid 2.0', () => {
  // Note: Have removed the createRoot() part of this and later tests because im unshor on how to do them

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
  };

  // Forces tasks to be run
  function flushPending() {
    for (const signal of watcher.getPending()) {
      signal.get();
    };

    expect(watcher.getPending()).toStrictEqual([]);
  };

  afterEach(() => watcher.unwatch(...Signal.subtle.introspectSources(watcher)));

  // CreateMemo() replaced with Computed signal
  // https://github.com/solidjs/solid/blob/9ca44cc427d02ccf06ac33b3629a361c4910ae2b/packages/solid/test/signals.spec.ts#L105
  test("Create and trigger a Memo", () => {
    const name = new Signal.State("John"),
      memo = new Signal.Computed(() => `Hello ${name.get()}`);
    expect(memo.get()).toBe("Hello John");
    name.set("Jake");
    expect(memo.get()).toBe("Hello Jake");
  });

  // https://github.com/solidjs/solid/blob/9ca44cc427d02ccf06ac33b3629a361c4910ae2b/packages/solid/test/signals.spec.ts#L114
  test("Create Signal and set equivalent value not trigger memo", () => {
    const name = new Signal.State("John", { equals: (a, b) => b.startsWith("J") }),
      memo = new Signal.Computed(() => `Hello ${name.get()}`);
    
    expect(name.get()).toBe("John");
    expect(memo.get()).toBe("Hello John");

    name.set("Jake");

    expect(name.get()).toBe("John");
    expect(memo.get()).toBe("Hello John");
  });

  // https://github.com/solidjs/solid/blob/9ca44cc427d02ccf06ac33b3629a361c4910ae2b/packages/solid/test/signals.spec.ts#L187
  test("Mute an effect", () => {
    let temp: string;
    const sign = new Signal.State("thoughts");
    let eff = effect(() => {        // Effect changed from original version to make use of the return of the effect unwatching the signal
      temp = `unpure ${sign.get()}`;
    });
    flushPending();                 // Could remove flushPending here and it would still be correct
    eff();
    expect(temp!).toBe("unpure thoughts");
    
    sign.set("mind");
    flushPending();
    expect(temp!).toBe("unpure thoughts");
  });
});
