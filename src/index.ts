type ErrorClass = new (...args: any[]) => {};
type ErrorMatcher = ErrorClass | string | RegExp;

export function throws<
  Args extends any[],
  Return,
  const E extends { [key in string]: ErrorMatcher }
>(
  fn: (...args: Args) => Return,
  errors: E
): (...args: Args) => CatchEnforcer<E, Return> {
  return (...args: Args) => createCatchEnforcer(fn, args, errors, true);
}

type UnwrapPromise<T extends Promise<unknown>> = T extends Promise<infer V> ? V : never;

type CatchEnforcer<
  E extends Record<string, ErrorMatcher>,
  T
> = {
  [K in keyof E as `catch${Capitalize<string & K>}`]: <const _E extends E[K]>(
    cb: (e: _E extends ErrorClass ? InstanceType<_E> : unknown) => void
  ) => Omit<E, K> extends Record<string, never>
    ? T extends Promise<unknown> ? Promise<UnwrapPromise<T> | undefined> : undefined
    : CatchEnforcer<Omit<E, K>, T>;
};

type Catcher<E extends ErrorMatcher> = {
  errorMatcher: E;
  cb: (e: E extends ErrorClass ? InstanceType<E> : unknown) => void;
};

type CachedEnforcerState = {
  enforcer: CatchEnforcer<any, any>;
  catchers: Catcher<any>[]
}

type FnWithState<F extends (...args: any[]) => any> = F & { [cachedEnforcer]?: CachedEnforcerState }

const cachedEnforcer = Symbol('cachedEnforcer');

function createCatchEnforcer<
  A extends any[],
  T,
  const E extends { [key in string]: ErrorMatcher }
>(
  fn: FnWithState<(...args: A) => T>,
  args: A,
  errors: E,
  firstRun = false
): CatchEnforcer<E, T> {
  const cached = fn[cachedEnforcer];

  if (firstRun && cached?.enforcer) {
    cached.catchers = [];
    return cached.enforcer;
  }

  const errorNames = Object.keys(errors);

  const enforcer = errorNames.reduce((catchObj, errorName: keyof E & string) => {
    const catchKey = `catch${capitalize(errorName)}` as keyof CatchEnforcer<E, T>;

    catchObj[catchKey] = (<const _E extends E[typeof errorName]>(
      cb: (error: _E extends ErrorClass ? InstanceType<_E> : unknown) => void
    ) => {
      const state = fn[cachedEnforcer];
      if (!state) throw new Error('[ts-throws] Expected function to have enforcer state, please open an issue');

      const catchers = state.catchers;
      const errorMatcher = errors[errorName];

      if (catchers.some(({ errorMatcher: e }) => e === errorMatcher)) {
        console.error('[ts-throws] Error already handled:', errorMatcher);
        throw new Error(`[ts-throws] Duplicate error catch functions are not allowed`);
      }

      catchers.push({ errorMatcher, cb });

      if (catchers.length === errorNames.length) {
        // should attempt to return original function value
        // Dunno why TS doesn't like returning the original function value here
        try {
          const returnValue = fn(...args);

          if (returnValue instanceof Promise) {
            return returnValue
              .then(value => {
                const caught = invokeMatchedErrorCatcher(value, state.catchers);
                if (caught) return undefined;

                return value;
              })
              .catch(err => {
                const caught = invokeMatchedErrorCatcher(err, state.catchers);
                if (caught) return undefined;

                throw err;
              })
          }

          const caught = invokeMatchedErrorCatcher(returnValue, state.catchers);
          if (caught) return undefined;

          return returnValue;
        } catch (err) {
          if (!err) throw err;

          const caught = invokeMatchedErrorCatcher(err, state.catchers);
          if (caught) return undefined;

          throw err;
        }
      } else {
        return catchObj;
      }

      // Not ideal but considering the dynamic nature here I'm not sure
      // of an alternative.
    }) as CatchEnforcer<E, T>[keyof CatchEnforcer<E, T>];

    return catchObj;
  }, {} as CatchEnforcer<E, T>);

  if (firstRun) fn[cachedEnforcer] = { enforcer, catchers: [] }

  return enforcer;
}

/**
 * Returns `true` if it matched an error and called the catcher callback.
 */
function invokeMatchedErrorCatcher(err: any, catchers: Catcher<ErrorMatcher>[]) {
  const catcher = catchers.find(c => {
    if (typeof c.errorMatcher === 'function') {
      return err instanceof c.errorMatcher;
    }

    const matcher = c.errorMatcher instanceof RegExp ? c.errorMatcher : {
      test: (str: string) => str.includes(c.errorMatcher as string)
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
  });

  if (catcher) {
    // We tested err instance above
    catcher.cb(err);
    return true;
  } else {
    return false;
  }
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}