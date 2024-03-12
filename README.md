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
  { StringEmptyError, NoAsdfError }
);

/*
  `throws` will force you to catch the provided errors.
  It dynamically generates catch* methods based on the object of errors
  you provide. The error names will be automatically capitalized.
*/

let length = getStringLength(' ')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is undefined, logged 'String is empty'

length = getStringLength('asdf')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is undefined, logged 'String cannot be asdf'

length = getStringLength(' ')
  .catchStringEmptyError(err => console.error('String is empty'))

// Only one error caught, length is:
// { catchNoAsdfError: (err: NoAsdfError) => void) => number | undefined }
// Function logic not invoked until last error is handled with `.catch`

length = getStringLength('hello world')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is 11
```

## TODO

- Support async functions
