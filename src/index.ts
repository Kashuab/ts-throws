type ErrorClass = new (...args: any[]) => Error;

export function throws<
  Args,
  Return,
  const E extends { [key in string]: ErrorClass }
>(
  fn: (...args: Args[]) => Return,
  errors: E
): (...args: Args[]) => CatchEnforcer<E, Return> {
  return (...args: Args[]) => createCatchEnforcer(fn, args, [], errors);
}

type CatchEnforcer<
  E extends Record<string, ErrorClass>,
  T
> = {
  [K in keyof E as `catch${Capitalize<string & K>}`]: <const _E extends E[K]>(
    cb: (e: InstanceType<_E>) => void
  ) => Omit<E, K> extends Record<string, never>
    ? T | undefined
    : CatchEnforcer<Omit<E, K>, T>;
};

type Catcher<E extends ErrorClass> = {
  errorClass: E;
  cb: (e: InstanceType<E>) => void;
};

function createCatchEnforcer<
  A,
  T,
  const E extends { [key in string]: ErrorClass }
>(
  fn: (...args: A[]) => T,
  args: A[],
  catchers: Catcher<E[string]>[],
  errors: E
): CatchEnforcer<E, T> {
  const keys = Object.keys(errors);

  return keys.reduce((catchObj, errorName: keyof E & string) => {
    const catchKey = `catch${capitalize(errorName)}` as keyof CatchEnforcer<E, T>;

    catchObj[catchKey] = (<const _E extends E[typeof errorName]>(
      cb: (error: InstanceType<_E>) => void
    ) => {
      const errorClass = errors[errorName];
      const remainingErrors = deletePropertyFromObject(errors, errorName as string);

      catchers.push({ errorClass, cb });

      if (Object.keys(remainingErrors).length === 0) {
        // should attempt to return original function value
        // Dunno why TS doesn't like returning the original function value here
        try {
          return fn(...args);
        } catch (err) {
          const catcher = catchers.find(c => err instanceof c.errorClass);

          if (catcher) {
            // We tested err instance above
            catcher.cb(err as InstanceType<E[string]>);
          } else {
            throw err;
          }

          // If we catch an error, return undefined for the original value
          return undefined;
        }
      } else {
        return createCatchEnforcer<A, T, Omit<E, typeof errorName>>(
          fn,
          args,
          catchers,
          remainingErrors
        );
      }

      // Not ideal but considering the dynamic nature here I'm not sure
      // of an alternative.
    }) as CatchEnforcer<E, T>[keyof CatchEnforcer<E, T>];

    return catchObj;
  }, {} as CatchEnforcer<E, T>);
}


function deletePropertyFromObject<
  T extends Record<string, unknown>,
  K extends keyof T
>(obj: T, key: K): T {
  const { [key]: _, ...rest } = obj;

  return rest as T;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}