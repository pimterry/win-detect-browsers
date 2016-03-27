var Finder = require('./lib/finder')
  , xtend = require('xtend')
  , debug = require('debug')('win-detect-browsers')
  , path = require('path')
  , regStream = require('./lib/reg-stream')
  , merge = require('merge-stream')
  , concat = require('concat-stream')
  , unique = require('unique-stream')
  , through2 = require('through2')

var defaults = {
  lucky: false,
  browsers: require('./lib/browsers')
}

module.exports = function (names, opts, cb) {
  if (typeof names == 'string') names = [names]
  else if (!Array.isArray(names)) cb = opts, opts = names, names = null

  if (typeof opts == 'function') cb = opts, opts = xtend(defaults)
  else opts = xtend(defaults, opts)

  var browsers = opts.browsers
    , reg = regStream()

  if (!names || !names.length)
    names = Object.keys(browsers)

  var stream = merge(names.map(function (name) {
    return new Finder(name, browsers[name], reg, opts)
  })).pipe(unique(function (b) {
    return b.path.toLowerCase()
  }))

  stream.on('end', reg.end.bind(reg))

  if (cb) {
    var finished = 0
    var wrapped = function (err, browsers) {
      if (finished++) return
      cb(err, browsers)
    }

    stream.once('error', wrapped)
    stream.pipe(concat(wrapped.bind(null, null)))
  }

  return stream;
}
