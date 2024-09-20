type ErrorClass = new (...args: any[]) => {};
type ErrorMatcher = ErrorClass | string | RegExp;

export function throws<
  Args extends any[],
  Return,
  const E extends { [key in string]: ErrorMatcher },
>(
  fn: (...args: Args) => Return,
  errors: E
): ((...args: Args) => Return) & { try: (...args: Args) => CatchEnforcer<E, Return> } {
  return Object.assign(fn, throwsUnsafe(fn, errors)) as any; // TODO: Type
}

export function throwsUnsafe<
  Args extends any[],
  Return,
  const E extends { [key in string]: ErrorMatcher },
  Fn extends (...args: Args) => Return
>(
  fn: Fn,
  errors: E
) {
  return { try: (...args: Args) => createCatchEnforcer(fn, args, errors) };
}

type UnwrapPromise<T extends Promise<unknown>> = T extends Promise<infer V> ? V : never;

type Catchers<E extends Record<string, ErrorMatcher>> = {
  [key in keyof E]: (e: E[key] extends ErrorClass ? InstanceType<E[key]> : unknown) => void
}

type CatchFn<E extends Record<string, ErrorMatcher>, T> =
  (catchers: Catchers<E>) =>
    T extends Promise<unknown>
      ? Promise<UnwrapPromise<T>>
      : T

type CatchEnforcer<E extends Record<string, ErrorMatcher>, T> = {
  catch: CatchFn<E, T>
}

function createCatchEnforcer<
  A extends any[],
  T,
  const E extends { [key in string]: ErrorMatcher },
>(
  fn: (...args: A) => T,
  args: A,
  errors: E,
): CatchEnforcer<E, T> {
  return {
    catch: ((catchers: Catchers<E>) => {
      try {
        const returnValue = fn(...args);

        if (returnValue instanceof Promise) {
          return returnValue
          .then(value => {
            const [caught, _value] = invokeMatchedErrorCatcher(value, errors, catchers);
            if (caught) return _value;

            return value;
          })
          .catch(err => {
            const [caught, _value] = invokeMatchedErrorCatcher(err, errors, catchers);
            if (caught) return _value;

            throw err;
          })
        }

        const [caught, value] = invokeMatchedErrorCatcher(returnValue, errors, catchers);
        if (caught) return value;

        return returnValue;
      } catch (err) {
        if (!err) throw err;

        const [caught, value] = invokeMatchedErrorCatcher(err, errors, catchers);
        if (caught) return value;

        throw err;
      }
      // This is lazy but given the return type conditionals I'm not sure how to do this correctly
    }) as CatchFn<E, T>
  }
}

/**
 * Returns `true` if it matched an error and called the catcher callback.
 */
function invokeMatchedErrorCatcher<E extends Record<string, ErrorMatcher>>(
  err: any,
  errors: E,
  catchers: Catchers<E>
): [boolean, any] {
  for (const name in catchers) {
    const errorMatcher = errors[name];
    if (!errorMatcher) return [false, undefined];

    const matches = (() => {
      if (typeof errorMatcher === 'function') {
        return err instanceof errorMatcher;
      }

      const matcher = errorMatcher instanceof RegExp ? errorMatcher : {
        test: (str: string) => str.includes(errorMatcher as string)
      };

      if (typeof err === 'string') {
        return matcher.test(err);
      }

      if (typeof err === 'object') {
        if ('name' in err && typeof err.name === 'string') {
          const nameMatches = matcher.test(err.name);

          if (nameMatches) return true;
        }

        if ('message' in err && typeof err.message === 'string') {
          const messageMatches = matcher.test(err.message);

          if (messageMatches) return true;
        }
      }

      return false;
    })();

    if (matches) {
      return [true, catchers[name](err)];
    }
  }

  return [false, undefined];
}