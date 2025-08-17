import type * as readline from 'node:readline';

/**
 * Map a key press to an action in the interactive dashboard.
 */
export type Action =
  | {
      /** Indicates attaching to a session by id. */
      type: 'ATTACH';
      /** The id of the session to attach to. */
      id: number;
    }
  | {
      /** Indicates cycling through sessions. */
      type: 'CYCLE';
      /** The direction to cycle: +1 for next, -1 for previous. */
      delta: number;
    }
  | {
      /** Indicates detaching from the current session. */
      type: 'DETACH';
    }
  | {
      /** Indicates the Ctrl+C key combination was pressed. */
      type: 'CTRL_C';
    }
  | {
      /** Indicates the Ctrl+D key combination was pressed. */
      type: 'CTRL_D';
    }
  | {
      /** Indicates quitting the dashboard. */
      type: 'QUIT';
    }
  | {
      /** Forwards an unhandled key sequence. */
      type: 'FORWARD';
      /** The key sequence to forward. */
      sequence: string;
    };

/**
 * Map a key press to an action in the interactive dashboard.
 *
 * @param str - The string representation of the key press.
 * @param key - The key object containing details about the key press.
 * @param mode - The current mode of the dashboard, either 'dashboard' or 'attached'.
 * @returns An Action object representing the mapped action, or null if no action is mapped.
 */
export function keymap(
  str: string,
  key: readline.Key,
  mode: 'dashboard' | 'attached',
): Action | null {
  if (key.ctrl && key.name === 'c') return { type: 'CTRL_C' };

  if (mode === 'dashboard') {
    if (key.name && /^[0-9]$/.test(key.name)) {
      return { type: 'ATTACH', id: Number(key.name) };
    }
    if (key.name === 'tab' && !key.shift) return { type: 'CYCLE', delta: +1 };
    if (key.name === 'tab' && key.shift) return { type: 'CYCLE', delta: -1 };
    if (key.name === 'q') return { type: 'QUIT' };
    return null;
  }

  // attached
  if (key.name === 'escape' || (key.ctrl && key.name === ']')) {
    return { type: 'DETACH' };
  }
  if (key.ctrl && key.name === 'd') return { type: 'CTRL_D' };

  const sequence = key.sequence ?? str ?? '';
  return sequence ? { type: 'FORWARD', sequence } : null;
}
