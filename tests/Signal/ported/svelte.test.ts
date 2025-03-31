import { describe, test, it, assert, expect, vi, afterEach } from 'vitest';
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

    // Currently fails, effect currently only get and log the initial values, not subsequent updates to the state signal
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
});
