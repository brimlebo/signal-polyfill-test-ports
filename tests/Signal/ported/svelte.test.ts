import { describe, test, assert, expect, vi, afterEach } from 'vitest';
import { Signal } from '../../../src';


describe('Ported - Svelte', () => {
    // Naming kind of weird at the moment because I dont know what to rename them to

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

    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L54
    test('effect with state and derived (computed) in it', () => {
		const log: string[] = [];

		let count = new Signal.State(0);

		let double = new Signal.Computed(() => count.get() * 2);
        
        effect(() => {
            log.push(`${count.get()}:${double.get()}`)
        });
        
        count.set(1);

        flushPending();

        count.set(2);

        flushPending();

        assert.deepEqual(log, ['0:0', '1:2', '2:4']);
	});

    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L72
    test('multiple effects with state and computed in it #1', () => {
        const log: string[] = [];

        let count = new Signal.State(0);
        let double = new Signal.Computed(() => count.get() * 2);

        effect(() => {
            log.push(`A:${count.get()}:${double.get()}`);
        });
        effect(() => {
            log.push(`B:${double.get()}`);
        });

        count.set(1);

        flushPending();

        count.set(2);

        flushPending();

        assert.deepEqual(log, ['A:0:0', 'B:0', 'A:1:2', 'B:2', 'A:2:4', 'B:4']);
    });

    // Checks that the order of effects holds even when one has a dependency that is "earlier" in the graph than another
    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L93
    test('multiple effects with state and computed in it #2', () => {
        const log: string[] = [];

        let count = new Signal.State(0);
        let double = new Signal.Computed(() => count.get() * 2);

        effect(() => {
            log.push(`A:${double.get()}`);
        });
        effect(() => {
            log.push(`B:${count.get()}:${double.get()}`);
        });

        count.set(1);

        flushPending();

        count.set(2);

        flushPending();

        assert.deepEqual(log, ['A:0', 'B:0:0', 'A:2', 'B:1:2', 'A:4', 'B:2:4']);
    });

    // Test of batched changes, if value of count rapidly switches from and to its "original" value effect is not run as double may not have changed yet
    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L151
    test('state reset', () => {
		const log: number[] = [];

		let count = new Signal.State(0);
		let double = new Signal.Computed(() => count.get() * 2);

		effect(() => {
			log.push(double.get());
		});

        flushPending();
        log.length = 0;

        count.set(1);
        count.set(0);

        flushPending();

        assert.deepEqual(log, []);

        count.set(1);
        double.get();       // Forces double to update, and sets a pending request for the effect
        count.set(0);

        flushPending();

        assert.deepEqual(log, [0]);
	});

    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L386
    let no_deps = new Signal.Computed(() => {
        return [];
    });

    test('two effects with an unowned computed that has no dependencies', () => {
        const log: Array<Array<any>> = [];

        effect(() => {
            log.push(no_deps.get());
        });

        effect(() => {
            log.push(no_deps.get());
        });

        flushPending();
        assert.deepEqual(log, [[], []]);
    });

    // Likley does not work as expected, updates of signals are in order rather than rerunning effect?
    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L531
    test('schedules rerun when writing to signal before reading it from derived', () => {
		let log: any[] = [];

		const value = new Signal.State(1);
		const double = new Signal.Computed(() => value.get() * 2);

		effect(() => {
			value.set(10);
			log.push(double.get());
		});

        flushPending();
        assert.deepEqual(log, [20]);
	});

    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L756
    test('deriveds update upon reconnection #1', () => {
		let a = new Signal.State(false);
		let b = new Signal.State(false);

		let c = new Signal.Computed(() => a.get());
		let d = new Signal.Computed(() => c.get());

		let last: Record<string, boolean | null> = {};

		effect(() => {
			last = {
				a: a.get(),
				b: b.get(),
				c: c.get(),
				d: a.get() || b.get() ? d.get() : null
			};
		});

        assert.deepEqual(last, { a: false, b: false, c: false, d: null });

        a.set(true)
        b.set(true)
        flushPending();
        assert.deepEqual(last, { a: true, b: true, c: true, d: true });

        a.set(false)
        b.set(false)
        flushPending();
        assert.deepEqual(last, { a: false, b: false, c: false, d: null });

        a.set(true)
        b.set(true)
        flushPending();
        assert.deepEqual(last, { a: true, b: true, c: true, d: true });

        a.set(false)
        b.set(false)
        flushPending();
        assert.deepEqual(last, { a: false, b: false, c: false, d: null });

        b.set(true)
        flushPending();
        assert.deepEqual(last, { a: false, b: true, c: false, d: false });
	});

    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L981
    test('deriveds do not depend on state they own', () => {
        let s: Signal.State<unknown>;

        const d = new Signal.Computed(() => {
            s = new Signal.State(0);
            return s.get();
        });

        assert.equal(d.get(), 0);

        s!.set(1);
        assert.equal(d.get(), 0);
	});

});
