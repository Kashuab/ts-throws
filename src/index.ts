type ErrorClass = new (...args: any[]) => {};

export function throws<
  Args extends any[],
  Return,
  const E extends { [key in string]: ErrorClass }
>(
  fn: (...args: Args) => Return,
  errors: E
): (...args: Args) => CatchEnforcer<E, Return> {
  return (...args: Args) => createCatchEnforcer(fn, args, errors, true);
}

type UnwrapPromise<T extends Promise<unknown>> = T extends Promise<infer V> ? V : never;

type CatchEnforcer<
  E extends Record<string, ErrorClass>,
  T
> = {
  [K in keyof E as `catch${Capitalize<string & K>}`]: <const _E extends E[K]>(
    cb: (e: InstanceType<_E>) => void
  ) => Omit<E, K> extends Record<string, never>
    ? T extends Promise<unknown> ? Promise<UnwrapPromise<T> | undefined> : undefined
    : CatchEnforcer<Omit<E, K>, T>;
};

type Catcher<E extends ErrorClass> = {
  errorClass: E;
  cb: (e: InstanceType<E>) => void;
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
  const E extends { [key in string]: ErrorClass }
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
      cb: (error: InstanceType<_E>) => void
    ) => {
      const state = fn[cachedEnforcer];
      if (!state) throw new Error('[ts-throws] Expected function to have enforcer state, please open an issue');

      const catchers = state.catchers;
      const errorClass = errors[errorName];

      if (catchers.some(({ errorClass: e }) => e === errorClass)) {
        console.error('[ts-throws] Error already handled:', errorClass);
        throw new Error(`[ts-throws] Duplicate error catch functions are not allowed`);
      }

      catchers.push({ errorClass, cb });

      if (catchers.length === errorNames.length) {
        // should attempt to return original function value
        // Dunno why TS doesn't like returning the original function value here
        try {
          const returnValue = fn(...args);

          if (returnValue instanceof Promise) {
            return returnValue
              .catch(err => {
                return handleThrownError(err, state.catchers);
              })
          }

          return returnValue;
        } catch (err) {
          // TODO: String error matchers
          if (!err || typeof err !== 'object') throw err;
          return handleThrownError(err, state.catchers);
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

function handleThrownError(err: object, catchers: Catcher<any>[]) {
  const catcher = catchers.find(c => err instanceof c.errorClass);

  if (catcher) {
    // We tested err instance above
    catcher.cb(err);
  } else {
    throw err;
  }

  // If we catch an error, return undefined for the original value
  return undefined;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}