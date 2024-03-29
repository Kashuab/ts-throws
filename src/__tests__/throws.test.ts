import { describe, expect, it, vi } from 'vitest';
import { throws } from '../index.js';

class BadStringError extends Error {}
class StringEmptyError extends Error {}
class StringEmptyError2 extends Error {}
class StringEmptyError3 extends Error {}

const createGetStringLengthFunction = () => vi.fn((str: string) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) throw new StringEmptyError();

  return trimmed.length;
});

describe('throws', () => {
  it('works in an ideal scenario', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength('hello')
      .catchStringEmptyError(err => {
        caught = true;
      });

    expect(length).toBe(5);
    expect(caught).toBe(false);
  });

  it('works with async functions', async () => {
    const getStringLength = throws(async (str: string) => {
      const trimmed = str.trim();
      if (trimmed.length === 0) throw new StringEmptyError();

      return trimmed.length;
    }, { StringEmptyError })

    const length = await getStringLength('asdf')
      .catchStringEmptyError(err => {});

    expect(length).toBe(4)
  });

  it('catches errors from async functions', async () => {
    const getStringLength = throws(async (str: string) => {
      const trimmed = str.trim();
      if (trimmed.length === 0) throw new StringEmptyError();

      return trimmed.length;
    }, { StringEmptyError })

    let caught = false;
    let length: number | undefined;

    try {
      // This is verbose and unnecessary, you can await getStringLength directly
      // Though this ensures that it doesn't return undefined
      length = await getStringLength('')
        .catchStringEmptyError(err => {
          caught = true;
        })
    } catch (err) {
      // expect().not.toThrow doesn't seem to work with async functions
      console.error(err);
      throw new Error('Async function wrapped in throws should not throw a specified error');
    }

    expect(length).toBeUndefined();
    expect(caught).toBe(true);
  });

  it('handles complicated async functions', async () => {
    const getStringLength = throws((str: string) => {
      const trimmed = str.trim();

      // Throws error before returning Promise
      if (trimmed.length === 0) throw new StringEmptyError();

      return new Promise<number>(resolve => {
        if (trimmed === 'asdf') throw new BadStringError();
        resolve(trimmed.length);
      });
    }, { StringEmptyError, BadStringError })

    let caught = false;
    let length: number | undefined;

    try {
      await getStringLength('asdf')
        .catchStringEmptyError(err => {
          // shouldn't hit this error
          throw new Error("Expected BadStringError to be caught");
        })
        .catchBadStringError(err => {
          caught = true;
        })
        .then(len => {
          length = len
        });
    } catch (err) {
      // expect().not.toThrow doesn't seem to work with async functions
      console.error(err);
      throw new Error('Async function wrapped in throws should not throw a specified error');
    }

    expect(length).toBeUndefined();
    expect(caught).toBe(true);
  })

  it('works with multiple errors', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError, StringEmptyError2, StringEmptyError3 })

    const length = getStringLength('hello')
      .catchStringEmptyError(err => {
        caught = true;
      })
      .catchStringEmptyError2(err => {
        caught = true;
      })
      .catchStringEmptyError3(err => {
        caught = true;
      })

    expect(length).toBe(5);
    expect(caught).toBe(false);
  });

  it('can chain catches in any order', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError, StringEmptyError2, StringEmptyError3 })

    const length = getStringLength('hello')
      .catchStringEmptyError2(err => {
        caught = true;
      })
      .catchStringEmptyError(err => {
        caught = true;
      })
      .catchStringEmptyError3(err => {
        caught = true;
      })

    expect(length).toBe(5);
    expect(caught).toBe(false);
  })

  it('can fire catcher for error', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength(' ')
      .catchStringEmptyError(err => {
        caught = true;
      });

    expect(length).toBeUndefined();
    expect(caught).toBe(true);
    expect(fn.mock.lastCall).toBeDefined();
  })

  it('returns the correct error instance', () => {
    let error: Error | null = null;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength(' ')
      .catchStringEmptyError(err => {
        error = err;
      });

    expect(length).toBeUndefined();
    expect(error).toBeInstanceOf(StringEmptyError);
    expect(fn.mock.lastCall).toBeDefined();
  })

  it('doesnt call function unless errors are caught', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength('hello');

    expect(typeof length.catchStringEmptyError).toBe('function');
    expect(fn.mock.lastCall).toBeUndefined();
  });

  it('throws error if duplicate error handler is present', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError, StringEmptyError2 })

    expect(() => {
      getStringLength('hello')
        .catchStringEmptyError(() => {})
        // @ts-expect-error
        .catchStringEmptyError(() => {})
    }).toThrow()
  });

  it('reports TS error when uncatchable error is used', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    expect(() => {
      getStringLength('hello')
        // @ts-expect-error
        .catchSomeOtherError(() => {})
    }).toThrow()
  });
})