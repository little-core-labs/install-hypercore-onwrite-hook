install-hypercore-onwrite-hook
==============================

> Install a write hook onto a Hypercore instance.

## Installation

```sh
$ npm install install-hypercore-onwrite-hook --save
```

## Usage

```js
// Install `hook(index, data, peer, done)` onto the hypercore instance
install(core, hook, (err) => {
})

// Uninstall `hook(index, data, peer, done)` from the hypercore instance
uninstall(core, hook, (err) => {
})
```

## Example

```js
const { install } = require('install-hypercore-onwrite-hook')
const replicate = require('hypercore-replicate')
const hypercore = require('hypercore')
const xsalsa20 = require('xsalsa20-encoding')
const crypto = require('crypto')
const ram = require('random-access-memory')

const key = crypto.randomBytes(32)
const nonce = crypto.randomBytes(24)
const origin = hypercore(ram, { valueEncoding: xsalsa20(nonce, key) })

function hook(index, data, peer, done) {
  const feed = this
  if (peer && data) {
    // We use the feed's public key as a nonce if one is not given
    const xor = xsalsa20(nonce, key)
    xor.encode(data, data)
  }
  return done(null)
}

origin.ready(() => {
  // edge feed without encryption key to replicate to reader
  const edge = hypercore(ram, origin.key)
  // reader feed with xsalsa20 hook installed after edge replication
  // to decrypt data before writing to storage
  const reader = hypercore(ram, origin.key)

  origin.append(Buffer.from('hello'), () => {
    origin.head((err, head) => {
      console.log('origin: %s', head) // should be plaintext (hello)
    })
  })

  replicate(origin, edge, () => {
    edge.head((err, head) => {
      console.log('  edge: %s', head) // should be ciphertext (garbage)
    })

    // install the hook
    install(reader, hook, () => {
      // replicate edge into reader after hoook is installed
      replicate(edge, reader, () => {
        reader.head((err, head) => {
          console.log('reader: %s', head) // should be plaintext (hello)
        })
      })
    })
  })
})
```

## API

### `install(core, hook[, oninstall])

Installs a Hypercore write hook function `hook(index, data, peer, done)`
on to the Hypercore instance `core` calling `oninstall(err)` if given with
an optional error, if one occurred.

```js
function xor(index, data, peer, done) {
  const feed = this
  if (peer && data) {
    const xor = xsalsa20(nonce, key)
    xor.encode(data, data)
  }
  return done(null)
}

install(core, xor, (err) => {
  // handle error
})
```

### `uninstall(core[, hook[, onuninstall]])

Uninstalls a Hypercore write hook function `hook(index, data, peer, done)`
from a given Hypercore instance `core` calling `onuninstall(err)` if given with
an optional error, if one occurred.

```js
uninstall(core, hook, (err) => {
  // handle error
})
```

## License

MIT
