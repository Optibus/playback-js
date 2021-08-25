/* eslint-disable global-require,no-console */
// eslint-disable-next-line node/no-extraneous-require,import/no-extraneous-dependencies
require('coffeescript/register');
const program = require('commander');
const inquirer = require('inquirer');
const _ = require('lodash');
const comperators = require('./comperators');
const { printError, color, symbols } = require('./my-diff');

const oldWrite = process.stdout.write;
process.stdout.write = (...args) => {
  try {
    JSON.parse(args[0]);
  } catch (err) {
    return oldWrite.call(process.stdout, ...args);
  }
};

// workers:
const methods = {
  ConvertDatasetToTimeplan: require('../../tasks/convert-ds-to-timeplan'),
  FilterCreateLines: require('../../tasks/filter-create-lines'),
  ApplyDsFilter: require('../../tasks/apply-ds-filter')
};

program
  .version('0.0.1')
  .option('--customer [value]', "enter customer name, use 'any' for all customers")
  .option('--method [value]', 'choose method')
  // .option('--start_date [value]', 'specify start date (defaults 7 days back)')
  // .option('--end_date [value]', 'specify end date (defaults now)')
  // .option('--limit [value]', 'limit number of runs')
  .option('--recording_key [value]', 'run once with specified key')
  .option('--skip_recorded_errors [value]', 'skip recorded errors')
  .parse(process.argv);

const programArgs = program.opts();

const questions = [
  {
    type: 'input',
    name: 'customer',
    message: 'Enter customer',
    default: 'any'
  },
  {
    type: 'list',
    name: 'method',
    message: 'Choose available method',
    choices: [
      { name: 'Filter create lines', value: 'FilterCreateLines' },
      { name: 'Convert dataset to timeplan', value: 'ConvertDatasetToTimeplan' },
      { name: 'Apply Dataset Filter', value: 'ApplyDsFilter' }
    ]
  },
  {
    type: 'input',
    name: 'recording_key',
    message: 'Enter recording key'
  },
  {
    type: 'list',
    name: 'skip_recorded_errors',
    message: 'skip recorded errors',
    choices: [
      { name: true, value: true },
      { name: false, value: false }
    ]
  }
].filter(question => !programArgs[question.name]);

const appendLog = msg => process.stdout.write(msg);
let indents = 0;
const createIndent = () => {
  let str = '';
  for (let i = 0; i < indents; i++) {
    str += '    ';
  }
  return str;
};
const runRecroding = async (worker, key, method) => {
  const recording = await worker.getRecordingByKey(key);
  const { input, output } = recording;
  const result = await worker.playbackByInput(input);
  const compareFn = comperators(method);
  compareFn(output, result);
};

const runAndLog = async (worker, key, method, i = 0) => {
  let error;
  const meta = await worker.getMetaData(key);
  if (meta.error && programArgs.skip_recorded_errors) {
    return;
  }
  let user, time, customer;
  let str = `${createIndent()}${i + 1})`;
  if (meta.timestamp) {
    time = new Date(meta.timestamp);
    str += ` ${time},`;
  }
  if (meta.user) {
    user = meta.user.split('@')[0];
    str += ` ${user},`;
  }

  if (meta.customer) {
    customer = meta.customer;
    str += ` ${customer},`;
  }
  str += ` ${key}: `;
  appendLog(str);
  try {
    await runRecroding(worker, key, method);
    appendLog(color('green', symbols.ok));
  } catch (err) {
    const status = meta.error ? 'pending' : 'fail';
    appendLog(color(status, symbols.err));
    error = printError(err, i) || err;
    error.index = i + 1;
    error.title = key;
  }
  appendLog('\n');
  return error;
};

const printAllErrors = errors => {
  errors.forEach(error => {
    const { fmt, msg, stack, index, title } = error;
    console.log(fmt, index, title, msg, stack);
  });
};

const getListOfKeysByCustomer = async worker => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 604800000);
  const list = await worker.getRecordingsByFilter(item => {
    return item.Size > 10 && now > item.LastModified && weekAgo < item.LastModified;
  });
  return list;
};

const runOnlist = async (worker, list, method) => {
  const errors = [];
  indents++;
  for (let i = 0; i < list.length; i++) {
    const error = await runAndLog(worker, list[i], method, i);
    if (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    printAllErrors(errors);
  }
  indents--;
};

const runListOnCustomer = async (worker, customer, method) => {
  worker
    .getTapeRecorder()
    .getCassette()
    .setCustomer(customer);
  const list = await getListOfKeysByCustomer(worker);
  if (list.length) {
    console.log(`${createIndent()}found ${list.length} records of ${customer}:`);
    await runOnlist(worker, list, method);
  } else {
    console.log(`No records found for customer: ${customer}`);
  }
};

const runOnAllCustomers = async (worker, method) => {
  const path = worker.getTapeRecorder().getCassette().playbackDirPath;
  const list = [];
  await worker.getRecordingsByFilter(a => {
    list.push(a);
    return a;
  }, path);
  const listByCustomer = _.groupBy(list, item => item.Key.split('/')[1]);
  const customers = _.keys(listByCustomer);
  console.log(`${createIndent()}found ${customers.length} customers`);
  indents++;
  for (let i = 0; i < customers.length; i++) {
    await runListOnCustomer(worker, customers[i], method);
  }
  indents--;
};

inquirer.prompt(questions).then(async answers => {
  const finalAnswers = Object.assign({}, programArgs, answers);
  const { customer, method } = finalAnswers;
  const Method = methods[method];
  const lowerCaseMethodStr = _.camelCase(method);
  const decoratedMethod = new Method(lowerCaseMethodStr, {}, 'S3');

  if (finalAnswers.recording_key) {
    decoratedMethod
      .getTapeRecorder()
      .getCassette()
      .setCustomer(customer);
    const error = await runAndLog(decoratedMethod, finalAnswers.recording_key, method);
    if (error) {
      printAllErrors([error]);
    }
  } else if (finalAnswers.customer === 'any') {
    await runOnAllCustomers(decoratedMethod, method);
  } else {
    await runListOnCustomer(decoratedMethod, customer, method);
  }
  console.log('Finished running program');
  process.exit(0);
});
