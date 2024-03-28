import {describe, it} from "vitest";
import {throws} from "../index.js";

class StringEmptyError extends Error {}
class StringEmptyError2 extends Error {}
class StringEmptyError3 extends Error {}
class StringEmptyError4 extends Error {}
class StringEmptyError5 extends Error {}

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

describe('performance', () => {
  it('works in an ideal scenario', async () => {
    const getStrLenThrower = makeThrower();
    const getStrLenReturner = makeReturner();
    const getStrLenWrappedThrower = makeWrappedThrower();

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


    console.log('Thrower runs per second', throwerRuns);
    console.log('Returner runs per second', returnerRuns);
    console.log('ts-throws wrapped runs per second', wrappedThrowerRuns);
  });
})