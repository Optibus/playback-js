/* global describe it */
const { assert } = require('chai');
const _ = require('lodash');
const workerDecorator = require('../../js-worker/worker-decorator');
const FilterCreateLines = require('../../js-worker/tasks/filter-create-lines');

// Like the base-worker class.
class BaseWorker {
  constructor(id, logger) {
    this.id = id;
    this.logger = logger;
    this.log = () => {};
  }
}

class MyWorker extends BaseWorker {
  constructor(id, logger) {
    super(id, logger);
    this.method = 'myWorker';
  }

  async execute(smallParams) {
    const res = await this.coreFunction(smallParams, 4, 5, 6);
    return res;
  }

  // eslint-disable-next-line class-methods-use-this
  coreFunction(...args) {
    return args[2]; // 5
  }
}

const DecoratedWorker = workerDecorator(MyWorker);

describe('test basic usage of a worker and a decorated worker', () => {
  it('should get same result, should return 5 for both workers', async () => {
    const myWorker = new MyWorker('myWorkerId', 'myWorkerLogger');
    const myWorkerResult = await myWorker.execute({ someParam: null });
    assert.equal(myWorkerResult, 5);

    const myDecoratedWorker = new DecoratedWorker('myDecoratedWorkerId', 'myDecoratedWorkerLogger');
    const myDecoratedWorkerResult = await myDecoratedWorker.execute({ someParam: null });
    assert.equal(myDecoratedWorkerResult, 5);
  });

  it('should use cassette and tapeRecorder', async () => {
    const myDecoratedWorker = new DecoratedWorker('myDecoratedWorkerId', 'myDecoratedWorkerLogger');
    const decoratedResult = await myDecoratedWorker.execute({});
    await myDecoratedWorker.saveRecording(); // The saveRecording is done in the flushRecords function in the handle-tasks.js, we need to save it here so we can test it.
    assert.equal(decoratedResult, 5);

    const lastRecordedId = await myDecoratedWorker.getLatestRecordedId();
    const recordedResult = await myDecoratedWorker.playbackByRecordingId(lastRecordedId);
    assert.equal(recordedResult, 5);
  });

  it('should read something from the file system and compare the result', async () => {
    const decoratedFilterCreateLines = new FilterCreateLines('filterCreateLinesId', {});
    if (
      decoratedFilterCreateLines
        .getTapeRecorder()
        .getCassette()
        .getType() !== 'memory'
    ) {
      const recordingIdsArr = await decoratedFilterCreateLines.getAllRecordingIds();
      const firstRecordingKey = _.head(recordingIdsArr);
      const recording = await decoratedFilterCreateLines.getRecordingByKey(firstRecordingKey);
      const { input, output } = recording;
      const result = await decoratedFilterCreateLines.playbackByInput(input);
      assert.deepEqual(output, result);
    }
  }).timeout(20000);

  it.skip('run a FilterCreateLines recording by customer and key', async () => {
    const customer = 'qa6-e';
    const recordingKey = 'NmZD8by6c';
    const decoratedFilterCreateLines = new FilterCreateLines('filterCreateLinesId', {});
    decoratedFilterCreateLines
      .getTapeRecorder()
      .getCassette()
      .setCustomer(customer);
    const recording = await decoratedFilterCreateLines.getRecordingByKey(recordingKey);
    const { input, output } = recording;
    const result = await decoratedFilterCreateLines.playbackByInput(input);
    assert.deepEqual(output, result);
  }); // .timeout(20000);
});
