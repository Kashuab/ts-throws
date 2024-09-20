import { describe, expect, it, vi } from 'vitest';
import {throws, throwsUnsafe} from '../index.js';

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

    const length = getStringLength.try('hello')
    .catch({
      StringEmptyError: err => {
        caught = true;
        return 3;
      }
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

    const length = await getStringLength.try('asdf')
    .catch({ StringEmptyError: err => {} });

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
      length = await getStringLength.try('')
      .catch({
        StringEmptyError: err => {
          caught = true;
        }
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
      await getStringLength.try('asdf')
        .catch({
          StringEmptyError: err => {
            // shouldn't hit this error
            throw new Error("Expected BadStringError to be caught");
          },
          BadStringError: err => {
            caught = true;
          }
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

  it('handles errors in return value', () => {
    let caught = false;

    const fn = throws(() => {
      return new StringEmptyError();
    }, { StringEmptyError })

    fn.try()
    .catch({
      StringEmptyError: err => {
        caught = true;
      }
    });

    expect(caught).toBe(true);
  });

  it('works with multiple errors', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError, StringEmptyError2, StringEmptyError3 })

    const length = getStringLength.try('hello')
    .catch({
      StringEmptyError: err => {
        caught = true;
      },
      StringEmptyError2: err => {
        caught = true;
      },
      StringEmptyError3: err => {
        caught = true;
      }
    })

    expect(length).toBe(5);
    expect(caught).toBe(false);
  });

  it('can match errors based on string', () => {
    const fn = throws(() => {
      throw new Error('message test')
    }, { SomeError: 'message test' });

    let caught = false;

    fn.try()
    .catch({
      SomeError: err => {
        caught = true;
      }
    });

    class CustomError extends Error {
      name = "hello"
    }

    const fn2 = throws(() => {
      throw new CustomError()
    }, { CustomError: 'hello' });

    caught = false;

    fn2.try()
    .catch({
      CustomError: err => {
        caught = true;
      }
    })

    expect(caught).toBe(true);
  })

  it('can match errors based on regex', () => {
    const fn = throws(() => {
      throw new Error('message test')
    }, { SomeError: /test/ });

    let caught = false;

    fn.try()
    .catch({
      SomeError: err => {
        caught = true;
      }
    })

    class CustomError extends Error {
      name = "hello"
    }

    const fn2 = throws(() => {
      throw new CustomError()
    }, { CustomError: /ello/ });

    caught = false;

    fn2.try()
    .catch({
      CustomError: err => {
        caught = true;
      }
    })

    expect(caught).toBe(true);
  })

  it('can chain catches in any order', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError, StringEmptyError2, StringEmptyError3 })

    const length = getStringLength.try('hello')
    .catch({
      StringEmptyError2: err => {
        caught = true;
      },
      StringEmptyError: err => {
        caught = true;
      },
      StringEmptyError3: err => {
        caught = true;
      },
    })

    expect(length).toBe(5);
    expect(caught).toBe(false);
  })

  it('can fire catcher for error', () => {
    let caught = false;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength.try(' ')
    .catch({
      StringEmptyError: err => {
        caught = true;
      },
    })

    expect(length).toBeUndefined();
    expect(caught).toBe(true);
    expect(fn.mock.lastCall).toBeDefined();
  })

  it('returns the correct error instance', () => {
    let error: Error | null = null;

    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength.try(' ')
    .catch({
      StringEmptyError: err => {
        error = err;
      }
    })

    expect(length).toBeUndefined();
    expect(error).toBeInstanceOf(StringEmptyError);
    expect(fn.mock.lastCall).toBeDefined();
  })

  it('doesnt call function unless errors are caught', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength.try('hello');

    expect(typeof length.catch).toBe('function');
    expect(fn.mock.lastCall).toBeUndefined();
  });

  it('allows for direct invocations', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throws(fn, { StringEmptyError })

    const length = getStringLength('hello');

    expect(length).toBe(5);
  });

  it('narrows down error return types', () => {
    class SomeError {
      someProp = 'nope'
    }

    const uh = (str: string) => {
      if (str === 'bonk') {
        return new SomeError();
      }

      return 3;
    }

    const fn = throws(uh, { SomeError });
    const returnVal = fn('beep');

    // returnVal.someProp
  })
});

describe('throwsUnsafe', () => {
  it('does not allow direct invocations', () => {
    const fn = createGetStringLengthFunction();
    const getStringLength = throwsUnsafe(fn, { StringEmptyError })

    // @ts-expect-error
    expect(() => getStringLength()).toThrow(TypeError);
  })
})