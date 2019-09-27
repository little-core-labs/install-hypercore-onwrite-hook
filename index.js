const batcher = require('atomic-batcher')
const assert = require('assert')

function install(core, hook, oninstall) {
  assert(null !== core && 'object' === typeof core,
    'Expecting a Hypercore instance.')

  assert('function' === typeof hook,
    'Expecting a write hook to be a function.')

  if ('function' !== typeof oninstall) {
    oninstall = (err) => void err
  }

  ready(core, onready)

  function onready() {
    try {
      delete core._batch
      delete core._onwrite
      core._onwrite = hook
      core._batch = batcher(work)
      process.nextTick(oninstall, null)
    } catch (err) {
      oninstall(err)
    }
  }

  function work(values, done) {
    if (!core._merkle) {
      core._reloadMerkleStateBeforeAppend(work, values, done)
    } else {
      core._appendHook(values, done)
    }
  }
}

function uninstall(core, hook, onuninstall) {
  assert(null !== core && 'object' === typeof core,
    'Expecting a Hypercore instance.')

  if ('function' === typeof hook && 'function' !== typeof onuninstall) {
    if (hook !== core._onwrite) {
      onuninstall = hook
      hook = null
    }
  }

  if ('function' !== typeof onuninstall) {
    onuninstall = (err) => void err
  }

  ready(core, onready)

  function onready() {
    try {
      if (!hook || hook === core._onwrite) {
        delete core._batch
        delete core._onwrite
        core._batch = batcher(work)
      }
      process.nextTick(onuninstall, null)
    } catch (err) {
      onuninstall(err)
    }
  }

  function work(values, done) {
    if (!core._merkle) {
      core._reloadMerkleStateBeforeAppend(work, values, done)
    } else {
      core._append(values, done)
    }
  }
}

function hasNanoGaurd(core) {
  return (
    null !== core.ifAvailable &&
    'object' === typeof core.ifAvailable &&
    'function' === typeof core.ifAvailable.ready
  )
}

function ready(core, onready) {
  core.ready(() => {
    if (hasNanoGaurd(core)) {
      core.ifAvailable.ready(onready)
    } else {
      onready()
    }
  })
}

module.exports = {
  install,
  uninstall
}
