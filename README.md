# `ts-throws`

A tiny library that allows you to wrap functions with enforced error checking.

## Example

`yarn add ts-throws`

```ts
import { throws } from 'ts-throws';

class StringEmptyError extends Error {}
class NoAsdfError extends Error {}

const getStringLength = throws(
  (str: string) => {
    if (!str.trim()) throw new StringEmptyError();
    if (str === 'asdf') throw new NoAsdfError();
    
    return str.length;
  },
  StringEmptyError,
  NoAsdfError
);

let length = getStringLength(' ')
  .catch(StringEmptyError, err => console.error('String is empty'))
  .catch(NoAsdfError, err => console.error('String cannot be asdf'));

// length is undefined, logged 'String is empty'

length = getStringLength('asdf')
  .catch(StringEmptyError, err => console.error('String is empty'))
  .catch(NoAsdfError, err => console.error('String cannot be asdf'));

// length is undefined, logged 'String cannot be asdf'

length = getStringLength(' ')
  .catch(StringEmptyError, err => console.error('String is empty'))

// Only one error caught, length is { catch: (errorClass: NoAsdfError, cb: (err: NoAsdfError) => void) => number | undefined }
// Function logic not invoked until last error is handled with `.catch`

length = getStringLength('hello world')
  .catch(StringEmptyError, err => console.error('String is empty'))
  .catch(NoAsdfError, err => console.error('String cannot be asdf'));

// length is 11
```

## TODO

- Support async functions
- Idea: Allow catch any with `.catch(Error, ...)` or `.catchAny(err => ...)`
- Tests