import { describe, test, assert, expect, vi, afterEach } from 'vitest';
import { Signal } from '../../../src';


describe('other stuff', () => {

    // Test for 2. for Kirill?
    // Unsure if implemented correctly
    // "The second case is to try and make a dependency between signals without introducing a computed signal, thus breaking the signal algorithm invariant. 
    // I think that simplest test would be to capture a state-signal-modifying lambda in computed signal lambda which depends on the modified state itself"
    test('should not allow mutation inside computed via captured lambda', () => {
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

});
