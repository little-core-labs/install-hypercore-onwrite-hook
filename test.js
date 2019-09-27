const { uninstall, install } = require('./')
const replicate = require('hypercore-replicate')
const hypercore = require('hypercore')
const xsalsa20 = require('xsalsa20-encoding')
const assert = require('assert')
const test = require('tape')
const ram = require('random-access-memory')

const key = Buffer.from('d14d94f94125a3bfc7021a733e5771153d7182eaaf9c099dbe6a0ae0c22fbda1', 'hex')
const nonce = Buffer.from('4a137a1313114105c6246e163ac441eda9c91958d0a4c1b7', 'hex')
const codec = xsalsa20(nonce, key)

const plaintext = Buffer.from('cb497763a4fd635516d70a4d5a8f32c2', 'hex')
const ciphertext = codec.encode(plaintext)

function hook(index, data, peer, done) {
  const feed = this
  if (peer && data) {
    xsalsa20(nonce, key).encode(data, data)
    done(null)
  }
}

test('install(core, hook, done)', (t) => {
  const origin = hypercore(ram, { valueEncoding: codec })
  t.plan(4)

  origin.ready(() => {
    const reader = hypercore(ram, origin.key)
    const edge = hypercore(ram, origin.key)

    origin.append(plaintext, () => {
      origin.head((err, head) => {
        t.assert(0 === Buffer.compare(head, plaintext))
      })
    })

    replicate(origin, edge, () => {
      edge.head((err, head) => {
        t.assert(0 === Buffer.compare(head, ciphertext))
      })

      install(reader, hook, () => {
        t.assert(reader._onwrite === hook)
        replicate(edge, reader, () => {
          reader.head((err, head) => {
            t.assert(0 === Buffer.compare(head, plaintext))
            t.end()
          })
        })
      })
    })
  })
})

test('uninstall(core[, hook[, done]])', (t) => {
  const core = hypercore(ram)
  const nothook = {}
  t.plan(5)
  install(core, hook, (err) => {
    t.assert(core._onwrite === hook)
    uninstall(core, nothook, (err) => {
      t.assert(core._onwrite === hook)
      uninstall(core, hook, (err) => {
        t.assert(core._onwrite !== hook)
        install(core, hook, (err) => {
          t.assert(core._onwrite === hook)
          uninstall(core, (err) => {
            t.assert(core._onwrite !== hook)
            t.end()
          })
        })
      })
    })
  })
})
