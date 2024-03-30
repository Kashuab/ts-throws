# `ts-throws`

A tiny library that allows you to wrap functions with enforced error checking.

## Example

`yarn add ts-throws`

```ts
import { throws } from 'ts-throws';

class StringEmptyError {}
class NoAsdfError {}

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

## Async functions

It's plug-and-play:

```ts
import { throws } from 'ts-throws';

export class BadResponseError {}

const getResponse = throws(
  async () => {
    const response = await fetch('https://some-url.com');
    if (!response.ok) throw new BadResponseError();
    
    return str.length;
  },
  { BadResponseError }
);

const response = await getResponse()
  .catchBadResponseError(err => {
    // Received 400+ error
  });

if (!response) return;

console.log(response); // -> Response
```

Of course, if you don't catch the right errors you're still blocked from using the provided function.

## Usage without custom error classes

You can provide regular expressions or strings to match thrown errors.

```ts
const getStringLength = throws(
  (str: string) => {
    if (!str.trim()) throw new Error('String is empty');
    if (str === 'asdf') throw 'cannot be asdf';

    return str.length;
  },
  { StringEmptyError: /is empty/, NoAsdfError: 'cannot be asdf' }
);

getStringLength(' ')
  .catchStringEmptyError(err => {
    // Note: `err` is going to be `unknown` in both of these cases.
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// -> Logs "String is empty"

getStringLength('asdf')
  .catchStringEmptyError(err => {
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// -> Logs "No asdf error"
```

When a string or regex is provided as the matcher, `ts-throws` will check the following:

- `error.name`
- `error.message`
- The entire error if it's a string

String matcher checks use `.include`, they are not converted to a `RegExp` before testing.

## Pitfalls

- `class CustomError extends Error {}`

  Extending `Error` causes a significant performance hit (~80%). If you don't need things like `Error.stack`, you probably
  don't need to extend it anyway.
