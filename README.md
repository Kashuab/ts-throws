# `ts-throws`

A tiny library that allows you to wrap functions with documented error checking. Optionally, you can force consumers
of a given function to handle errors.

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
)
```

`throws` adds a `try` function which will force you to catch the provided errors. It will also allow direct invocations
by calling the function normally. This avoids breaking changes, and allows developers to opt-in when desired.
It dynamically generates catch* methods based on the object of errors you provide. The error names will be
automatically capitalized.

```ts
let length = getStringLength.try(' ')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is undefined, logged 'String is empty'

length = getStringLength.try('asdf')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is undefined, logged 'String cannot be asdf'

length = getStringLength.try(' ')
  .catchStringEmptyError(err => console.error('String is empty'))

// Only one error caught, length is:
// { catchNoAsdfError: (err: NoAsdfError) => void) => number | undefined }
// Function logic not invoked until last error is handled with `.catch`

length = getStringLength.try('hello world')
  .catchStringEmptyError(err => console.error('String is empty'))
  .catchNoAsdfError(err => console.error('String cannot be asdf'));

// length is 11

// Example direct invocation:
length = getStringLength('hello world');
// length is 11
```

## `throwsUnsafe`

If you don't want to allow direct invocations, you can force consumers to handle errors properly via `throwsUnsafe`:

```ts
import { throwsUnsafe } from 'ts-throws';

class StringEmptyError {}
class NoAsdfError {}

const getStringLength = throwsUnsafe(
  (str: string) => {
    if (!str.trim()) throw new StringEmptyError();
    if (str === 'asdf') throw new NoAsdfError();

    return str.length;
  },
  { StringEmptyError, NoAsdfError }
)

// Cannot directly call getStringLength
getStringLength('bing bong'); // TypeError

// You have to call .try
getStringLength
  .try('bing bong')
  .catchStringEmptyError(() => { /* ... */ })
  .catchNoAsdfError(() => { /* ... */ })
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

const response = await getResponse.try()
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

getStringLength.try(' ')
  .catchStringEmptyError(err => {
    // Note: `err` is going to be `unknown` in both of these cases.
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// -> Logs "String is empty"

getStringLength.try('asdf')
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

## Functions that return errors instead of throwing

`ts-throws` handles this by trying to match the return value against each provided error. In fact, this method is
encouraged over `throw`ing if possible. Handling returned errors is ~2x faster than thrown errors.

```ts
const getStringLength = throws(
  (str: string) => {
    if (!str.trim()) return new Error('String is empty');
    if (str === 'asdf') return 'cannot be asdf';

    return str.length;
  },
  { StringEmptyError: /is empty/, NoAsdfError: 'cannot be asdf' }
);

getStringLength.try(' ')
  .catchStringEmptyError(err => {
    // Note: `err` is going to be `unknown` in both of these cases.
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// -> Logs "String is empty"

getStringLength.try('asdf')
  .catchStringEmptyError(err => {
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// -> Logs "No asdf error"

const length = getStringLength.try('hello')
  .catchStringEmptyError(err => {
    console.error('String is empty')
  })
  .catchNoAsdfError(err => {
    console.error('No asdf error')
  });

// `length` is 5
```

Of course, this works with custom error classes as well.

## Pitfalls

- `class CustomError extends Error {}`

  Extending `Error` causes a significant performance hit (~80%). If you don't need things like `Error.stack`, you probably
  don't need to extend it anyway.
