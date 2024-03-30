import {describe, it} from "vitest";
import {throws} from "../index.js";

class StringEmptyError {}
class StringEmptyError2 {}
class StringEmptyError3 {}
class StringEmptyError4 {}
class StringEmptyError5 {}

const makeThrower = () => (str: string) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) throw new StringEmptyError();

  return trimmed.length;
};

const makeReturner = () => (str: string) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) return new StringEmptyError();

  return trimmed.length;
};

const makeWrappedThrower = () => throws((str: string) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) throw new StringEmptyError();

  return trimmed.length;
}, {
  StringEmptyError,
  StringEmptyError2,
  StringEmptyError3,
  StringEmptyError4,
  StringEmptyError5
});

const makeWrappedReturner = () => throws((str: string) => {
  const trimmed = str.trim();
  if (trimmed.length === 0) return new StringEmptyError();

  return trimmed.length;
}, {
  StringEmptyError,
  StringEmptyError2,
  StringEmptyError3,
  StringEmptyError4,
  StringEmptyError5
});

const makeSafeFn = () => (str: string) => {
  const trimmed = str.trim();
  return trimmed.length;
};

const makeWrappedSafeFn = () => throws((str: string) => {
  const trimmed = str.trim();
  return trimmed.length;
}, {
  StringEmptyError,
  StringEmptyError2,
  StringEmptyError3,
  StringEmptyError4,
  StringEmptyError5
});

describe('performance', () => {
  it('benchmarks with errors', async () => {
    const getStrLenThrower = makeThrower();
    const getStrLenReturner = makeReturner();
    const getStrLenWrappedThrower = makeWrappedThrower();
    const getStrLenWrappedReturner = makeWrappedReturner();

    const throwerRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        try {
          getStrLenThrower('');
        } catch (err) {
          if (err instanceof StringEmptyError) {
            state.runs++;
          }
        }

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    const returnerRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        const err = getStrLenReturner('');
        if (err instanceof StringEmptyError) {
          state.runs++;
        }

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    const wrappedThrowerRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        getStrLenWrappedThrower('')
          .catchStringEmptyError(err => {
            state.runs++;
          })
          .catchStringEmptyError2(() => {})
          .catchStringEmptyError3(() => {})
          .catchStringEmptyError4(() => {})
          .catchStringEmptyError5(() => {})

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    const wrappedReturnerRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        getStrLenWrappedReturner('')
          .catchStringEmptyError(err => {
            state.runs++;
          })
          .catchStringEmptyError2(() => {})
          .catchStringEmptyError3(() => {})
          .catchStringEmptyError4(() => {})
          .catchStringEmptyError5(() => {})

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    console.table([
      { type: 'thrower', ['Runs per second']: throwerRuns.toLocaleString() },
      { type: 'returner', ['Runs per second']: returnerRuns.toLocaleString() },
      { type: 'thrower with ts-throws', ['Runs per second']: wrappedThrowerRuns.toLocaleString() },
      { type: 'returner with ts-throws', ['Runs per second']: wrappedReturnerRuns.toLocaleString() },
    ])
  });

  /*
    Compares direct overhead when a function does not produce any errors.
  */
  it('benchmark without errors', () => {
    const safeFn = makeSafeFn();
    const wrappedSafeFn = makeWrappedSafeFn();

    const safeFnRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        safeFn('');
        state.runs++;

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    const wrappedSafeFnRuns = (() => {
      const state = { done: false, runs: 0 };
      const before = performance.now();

      while (!state.done) {
        wrappedSafeFn('')
          .catchStringEmptyError(() => {})
          .catchStringEmptyError2(() => {})
          .catchStringEmptyError3(() => {})
          .catchStringEmptyError4(() => {})
          .catchStringEmptyError5(() => {});

        state.runs++;

        const diff = performance.now() - before;
        if (diff >= 1000) state.done = true;
      }

      return state.runs;
    })();

    console.table([
      { type: 'safe', ['Runs per second']: safeFnRuns.toLocaleString() },
      { type: 'safe with ts-throws', ['Runs per second']: wrappedSafeFnRuns.toLocaleString() },
    ])
  })
})