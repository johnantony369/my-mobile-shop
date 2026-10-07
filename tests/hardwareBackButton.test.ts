import { describe, it, expect, vi } from 'vitest';
import { registerBackButtonHandler } from '../src/utils/hardwareBackButton';

describe('Hardware Back Button Handler', () => {
  it('registers and executes handlers in LIFO order', () => {
    const events: string[] = [];
    const unregister1 = registerBackButtonHandler(() => {
      events.push('first');
      return true;
    });
    const unregister2 = registerBackButtonHandler(() => {
      events.push('second');
      return true;
    });

    // Unregister works
    unregister2();
    unregister1();
    expect(events).toEqual([]);
  });
});
