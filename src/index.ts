type ErrorClass = new (...args: any[]) => Error;

export function throws<A, T, const E extends ErrorClass[]>(
  fn: (...args: A[]) => T,
  ...errors: E
): (...args: A[]) => CatchEnforcer<E, T> {
  return (...args: A[]) => createCatchEnforcer(fn, args, [], errors);
}

type ShiftTuple<T extends any[]> = T extends [T[0], ...infer R] ? R : never;

type CatchEnforcer<E extends ErrorClass[], T> = {
  catch: <const _E extends E[number]>(
    e: _E,
    cb: (e: InstanceType<_E>) => void
  ) => ShiftTuple<E> extends []
    ? T | undefined
    : CatchEnforcer<ShiftTuple<E>, T>;
};

type Catcher<E extends ErrorClass> = {
  errorClass: E;
  cb: (e: InstanceType<E>) => void;
};

function createCatchEnforcer<A, T, const E extends ErrorClass[]>(
  fn: (...args: A[]) => T,
  args: A[],
  catchers: Catcher<E[number]>[],
  errors: E
): CatchEnforcer<E, T> {
  return {
    catch: <const _E extends E[number]>(
      errorClass: _E,
      cb: (error: InstanceType<_E>) => void
    ) => {
      if (!errors.find(_errorClass => _errorClass === errorClass)) {
        console.error('Provided error class:', errorClass);
        console.error('Catchable error classes:', errors);
        throw new Error(`Error not catchable`);
      }

      const remainingErrors = errors.filter(
        e => e !== errorClass
      ) as ShiftTuple<E>;

      catchers.push({ errorClass, cb });

      if (remainingErrors.length === 0) {
        // should attempt to return original function value
        // Dunno why TS doesn't like returning the original function value here
        try {
          return fn(...args) as any;
        } catch (err) {
          const catcher = catchers.find(c => err instanceof c.errorClass);

          if (catcher) {
            // We tested err instance above
            catcher.cb(err as InstanceType<E[number]>);
          } else {
            throw err;
          }

          // If we catch an error, return undefined for the original value
          return undefined;
        }
      } else {
        return createCatchEnforcer<A, T, ShiftTuple<E>>(
          fn,
          args,
          catchers,
          errors.filter(e => e !== errorClass) as ShiftTuple<E>
        );
      }
    }
  };
}
