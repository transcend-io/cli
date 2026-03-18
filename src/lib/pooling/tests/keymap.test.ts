import { describe, it, expect } from 'vitest';
import { keymap } from '../keymap';
import type * as readline from 'node:readline';

/**
 * Minimal builder for readline.Key-like objects used by keymap.
 *
 * Only fields that keymap reads are provided (name, ctrl, shift, sequence).
 *
 * @param p - Partial Key fields to set
 * @returns A readline.Key-like object
 */
function K(
  p: Partial<Pick<readline.Key, 'name' | 'ctrl' | 'shift' | 'sequence'>> = {},
): readline.Key {
  return {
    name: undefined,
    ctrl: false,
    shift: false,
    sequence: undefined,
    ...p,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as readline.Key;
}

describe('keymap', () => {
  it('CTRL+C is mapped regardless of mode', () => {
    expect(keymap('', K({ ctrl: true, name: 'c' }), 'dashboard')).toEqual({
      type: 'CTRL_C',
    });
    expect(keymap('', K({ ctrl: true, name: 'c' }), 'attached')).toEqual({
      type: 'CTRL_C',
    });
  });

  describe('dashboard mode', () => {
    it('ATTACH when pressing a digit 0-9 (id = digit)', () => {
      expect(keymap('', K({ name: '1' }), 'dashboard')).toEqual({
        type: 'ATTACH',
        id: 1,
      });
      expect(keymap('', K({ name: '0' }), 'dashboard')).toEqual({
        type: 'ATTACH',
        id: 0,
      });
      expect(keymap('', K({ name: '9' }), 'dashboard')).toEqual({
        type: 'ATTACH',
        id: 9,
      });
    });

    it('CYCLE +1 on Tab (no Shift)', () => {
      expect(keymap('', K({ name: 'tab', shift: false }), 'dashboard')).toEqual(
        { type: 'CYCLE', delta: +1 },
      );
    });

    it('CYCLE -1 on Shift+Tab', () => {
      expect(keymap('', K({ name: 'tab', shift: true }), 'dashboard')).toEqual({
        type: 'CYCLE',
        delta: -1,
      });
    });

    it('QUIT on "q"', () => {
      expect(keymap('', K({ name: 'q' }), 'dashboard')).toEqual({
        type: 'QUIT',
      });
    });

    it('returns null for other keys', () => {
      expect(keymap('', K({ name: 'x' }), 'dashboard')).toBeNull();
      expect(keymap('', K({}), 'dashboard')).toBeNull();
    });
  });

  describe('attached mode', () => {
    it('DETACH on Escape', () => {
      expect(keymap('', K({ name: 'escape' }), 'attached')).toEqual({
        type: 'DETACH',
      });
    });

    it('DETACH on Ctrl+]', () => {
      expect(keymap('', K({ ctrl: true, name: ']' }), 'attached')).toEqual({
        type: 'DETACH',
      });
    });

    it('CTRL_D on Ctrl+D', () => {
      expect(keymap('', K({ ctrl: true, name: 'd' }), 'attached')).toEqual({
        type: 'CTRL_D',
      });
    });

    it('FORWARD uses key.sequence when provided', () => {
      expect(
        keymap('', K({ sequence: '\u001b[A', name: undefined }), 'attached'),
      ).toEqual({
        type: 'FORWARD',
        sequence: '\u001b[A',
      });
    });

    it('FORWARD falls back to str when sequence is undefined', () => {
      expect(
        keymap(
          'typed',
          K({ sequence: undefined, name: undefined }),
          'attached',
        ),
      ).toEqual({
        type: 'FORWARD',
        sequence: 'typed',
      });
    });

    it('returns null when neither sequence nor str are provided', () => {
      expect(
        keymap('', K({ sequence: undefined, name: undefined }), 'attached'),
      ).toBeNull();
    });
  });
});
