import { describe, test, assert, expect, vi, afterEach } from 'vitest';
import { Signal } from '../../../src';


describe('other stuff', () => {

    // 1. thing for Turku guys
    // Mostly just a simple check that a signal can hold and update even when used as value of another signal or the like.
    // "The first case is when signal value is a signal itself. The intention is to check what could go wrong in that configuration. 
    // I don't have a particular case in mind, but the idea is to show that nothing will go wrong if one decides to write programs that way."
    test('Signal in a signal in a signal or in a new signal', () => {
        const a = new Signal.State(0);
        const b = new Signal.State(a);

        const c = new Signal.Computed(() => a);
        const d = new Signal.Computed(() => c);

        const e = new Signal.Computed(() => new Signal.Computed(() => a));  // Same as c
        const f = new Signal.Computed(() => e.get().get().get() + 1);

        expect(b.get().get()).toBe(0);
        expect(d.get().get().get()).toBe(0);
        expect(e.get().get().get()).toBe(0);
        expect(f.get()).toBe(1);

        a.set(5)

        expect(b.get().get()).toBe(5);
        expect(d.get().get().get()).toBe(5);
        expect(e.get().get().get()).toBe(5);
        expect(f.get()).toBe(6);

        a.set(324567894362)

        expect(b.get().get()).toBe(324567894362);
        expect(d.get().get().get()).toBe(324567894362);
        expect(e.get().get().get()).toBe(324567894362);
        expect(f.get()).toBe(324567894363);
    });


    // Test for 2. for Turku guys
    // Unsure if implemented correctly.
    // Currently seems like the system just assumes the purity of the signal rather than enforce it? No warning on doing a .set(...) inside a computed signal?
    // "The second case is to try and make a dependency between signals without introducing a computed signal, thus breaking the signal algorithm invariant. 
    // I think that the simplest test would be to capture a state-signal-modifying lambda in computed signal lambda which depends on the modified state itself"
    test('allows mutation inside(?) computed via captured lambda', () => {
        const a = new Signal.State(0);

        let updater;
        const b = new Signal.Computed(() => {
            updater = () => {
                a.set(a.get() + 1);
            };
            return a.get()
        });

        expect(b.get()).toBe(0);

        updater();

        expect(a.get()).toBe(1);
        expect(b.get()).toBe(1);
    });

    // Just a small test to check that it throws a an error on cycles in computeds
    // Could be moved into cycles tests if Daniel wans more?
    // Box with an open lid
    // A  F
    // |  |
    // B->E
    // |  |
    // C<-D
    test('cycle', () => {
        let a = new Signal.Computed(() => b.get() + 1)
        let b = new Signal.Computed(() => c.get() + 1)
        let c = new Signal.Computed(() => d.get() + 1)
        let d = new Signal.Computed(() => e.get() + 1)
        let e = new Signal.Computed(() => f.get() + b.get() + 1)
        let f = new Signal.Computed(() => 0)

        expect(() => a.get()).toThrow()
    });

});
