'use strict'

const extractPath = require('../extract-path')
const after = require('after')
const registry = require('../registry')

module.exports = function findProgIds () {
  // We could read HKCR, which is composed of HKLM\Software\Classes and
  // HKCU\Software\Classes, but that hive is only refreshed on restart.
  const next = this.plan(2)

  queryHive(this, 'HKCU', next)
  queryHive(this, 'HKLM', next)
}

function queryHive (self, hive, done) {
  const classes = 'Software\\Classes'

  registry.values(hive, `${classes}\\.html\\OpenWithProgids`, (err, values) => {
    if (err) return done(err.notFound ? null : err)

    const progids = Object.keys(values).filter(isChromeHTML)
    const next = after(progids.length, done)

    progids.forEach(function (id) {
      const key = `${classes}\\${id}\\shell\\open\\command`

      registry.value(hive, key, (err, bin) => {
        if (err) return next(err.notFound ? null : err)

        const channel = id.startsWith('ChromeSSHTM.') ? 'canary' : {
          'ChromeHTML': null, // Ambiguous, in some cases this can be canary
          'ChromeBHTML': 'beta',
          'ChromeDHTML': 'dev'
        }[id]

        const metadata = {
          channel: channel !== undefined ? channel : 'canary'
        }

        self.found(extractPath(bin), metadata, key, next)
      })
    })
  })
}

function isChromeHTML (id) {
  return id === 'ChromeHTML' ||
    id === 'ChromeBHTML' ||
    id === 'ChromeDHTML' ||
    id.slice(0, 12) === 'ChromeSSHTM.'
}
