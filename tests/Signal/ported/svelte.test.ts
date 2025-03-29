import { describe, it, assert, expect, vi } from 'vitest';
import { Signal } from '../../../src';
import { effect } from './effect';


describe('Ported - Svelte', () => {
    // Naming kind of weird at the moment because I dont know what to rename them to
    
    // Currently fails, effect currently only get and log the initial values, not subsequent updates to the state signal
    // https://github.com/sveltejs/svelte/blob/04257925d22d8ecef37f50330ac258c7f97dca0c/packages/svelte/tests/signals/test.ts#L54
    it('effect with state and derived in it', () => {
		const log: string[] = [];

		let count = new Signal.State(0);

		let double = new Signal.Computed(() => count.get() * 2);
        
        effect(() => {
            log.push(`${count.get()}:${double.get()}`)
        });
        
        count.set(1);
        count.set(2);

        assert.deepEqual(log, ['0:0', '1:2', '2:4']);
	});


    it('is computed from state', () => {
        
    })
});
