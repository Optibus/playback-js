const _ = require('lodash');
const TapeRecorder = require('./playback/tape-recorders/tape-recorder');
const Recording = require('./playback/entities/recording');

const MemoryTapeCassette = require('./playback/tape-cassettes/memory-tape-cassette');
const S3TapeCassette = require('./playback/tape-cassettes/s3-tape-cassette');
// eslint-disable-next-line no-unused-vars
const FSTapeCassette = require('./playback/tape-cassettes/fs-tape-cassette');

const TapeCassetteFactory = (method, factoryType) => {
  switch (factoryType) {
    case 'S3':
      return new S3TapeCassette(method);
    case 'Memory':
      return new MemoryTapeCassette(method);
    case 'FS':
      return new FSTapeCassette(method);
    default:
      if (process.env.ENV === 'titus') {
        return new S3TapeCassette(method);
      }
  }
  return new MemoryTapeCassette(method);
};

const classDecorator = function classDecorator(classToDecorate) {
  return class WorkerDecorator extends classToDecorate {
    constructor(id, logger, factoryType) {
      super(id, logger);
      const cassette = TapeCassetteFactory(this.method, factoryType);
      this.tapeRecorder = new TapeRecorder(cassette);
      this.recording = new Recording(this.method);
    }

    async execute(smallParams) {
      let loggerContext = {};
      if (smallParams && smallParams.loggerContext) {
        loggerContext = smallParams.loggerContext;
      }
      const { customer = 'test-customer' } = loggerContext;
      this.getTapeRecorder()
        .getCassette()
        .setCustomer(customer);
      this.recording.addMetaData(loggerContext);
      return super.execute(smallParams);
    }

    async coreFunction(...args) {
      const input = args;
      let output = null;
      try {
        output = super.coreFunction(...args); // Extended class must have this function
      } catch (e) {
        e.recording_key = this.recording.getKey();
        this.recording.addMetaData({ error: true, exception: e });
        throw e;
      } finally {
        this.recording.setData({ input, output });
      }
      return output;
    }

    getTapeRecorder() {
      return this.tapeRecorder;
    }

    async saveRecording() {
      this.log(
        `Saving recording: [key: ${this.recording.getKey()}, method: ${this.recording.getMethod()}]`
      );
      await this.getTapeRecorder().saveRecording(this.recording); // Should be moved after returning the result, for performance
    }

    async playbackByRecordingId(recordingId) {
      const { input } = await this.getTapeRecorder().getRecordingByKey(recordingId);
      return this.playbackByInput(input);
    }

    async playbackByInput(input) {
      const result = await super.coreFunction(...input);
      // Convert undefined to the special field (UNDEFINED_REPLACER) so the key will not be omitted
      return JSON.parse(
        JSON.stringify(result, (k, v) => {
          return v === undefined ? S3TapeCassette.UNDEFINED_REPLACER : v;
        })
      );
    }

    async getLatestRecordedId() {
      const latestId = _.last(this.getTapeRecorder().getLatestRecordedIds());
      return latestId;
    }

    async getRecordingByKey(recordingKey) {
      return this.getTapeRecorder().getRecordingByKey(recordingKey);
    }

    async getMetaData(recordingKey) {
      return this.getTapeRecorder().getMetaData(recordingKey);
    }

    async getAllRecordingIds(...args) {
      return this.getTapeRecorder().getAllRecordingIds(...args);
    }

    async getRecordingsByFilter(...args) {
      return this.getTapeRecorder().getRecordingsByFilter(...args);
    }
  };
};

module.exports = classDecorator;
