const diff = require('diff');
const utils = require('./utils');

function sameType(a, b) {
  a = Object.prototype.toString.call(a);
  b = Object.prototype.toString.call(b);
  // eslint-disable-next-line eqeqeq
  return a == b;
}
const colors = {
  pass: 90,
  fail: 31,
  'bright pass': 92,
  'bright fail': 91,
  'bright yellow': 93,
  pending: 36,
  suite: 0,
  'error title': 0,
  'error message': 31,
  'error stack': 90,
  checkmark: 32,
  fast: 90,
  medium: 33,
  slow: 31,
  green: 32,
  light: 90,
  'diff gutter': 90,
  'diff added': 32,
  'diff removed': 31
};

function color(type, str) {
  return `\u001b[${colors[type]}m${str}\u001b[0m`;
}

const symbols = {
  ok: '✓',
  err: '✖',
  dot: '․'
};

function escapeInvisibles(line) {
  return line
    .replace(/\t/g, '<tab>')
    .replace(/\r/g, '<CR>')
    .replace(/\n/g, '<LF>\n');
}

function colorLines(name, str) {
  return str
    .split('\n')
    .map(_str => color(name, _str))
    .join('\n');
}

function unifiedDiff(err, escape) {
  const indent = '      ';
  function cleanUp(line) {
    if (escape) {
      line = escapeInvisibles(line);
    }
    if (line[0] === '+') return indent + colorLines('diff added', line);
    if (line[0] === '-') return indent + colorLines('diff removed', line);
    // eslint-disable-next-line no-useless-escape
    if (line.match(/\@\@/)) return null;
    if (line.match(/\\ No newline/)) return null;
    return indent + line;
  }
  function notBlank(line) {
    return line != null;
  }
  const msg = diff.createPatch('string', err.actual, err.expected);
  const lines = msg.split('\n').splice(4);
  return `\n      ${colorLines('diff added', '+ expected')} ${colorLines(
    'diff removed',
    '- actual'
  )}\n\n${lines
    .map(cleanUp)
    .filter(notBlank)
    .join('\n')}`;
}

module.exports = {
  printError(err) {
    const { actual, expected, message, stack } = err;
    let msg = '';
    if (err.showDiff !== false && sameType(actual, expected) && expected !== undefined) {
      const escape = false;
      const newError = {};
      if (!(utils.isString(actual) && utils.isString(expected))) {
        newError.actual = utils.stringify(actual);
        newError.expected = utils.stringify(expected);
      }

      const fmt = color('error title', '  %s) %s:\n%s') + color('error stack', '\n%s\n');
      const match = message.match(/^([^:]+): expected/);
      msg = `\n      ${color('error message', match ? match[1] : msg)}`;

      msg += unifiedDiff(newError, escape);
      return { fmt, msg, stack };
    }
  },
  symbols,
  color
};
