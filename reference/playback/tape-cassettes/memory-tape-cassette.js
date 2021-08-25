const AbstractTapeCassette = require('./abstract-tape-cassette');
/**
 * Tape-Cassette class - the small plastic box that contains the tape which has the recordings.
 * This class is the in-memory implementation of a cassette
 */
class MemoryTapeCassette extends AbstractTapeCassette {
  constructor(method) {
    super(method, 'memory');
    this.store = {};
  }

  saveRecording(recordingKey, recording) {
    this.store[recordingKey] = recording.getData();
    super.saveRecording(recordingKey);
  }

  getRecordingByKey(recordingKey) {
    return this.store[recordingKey];
  }
}

module.exports = MemoryTapeCassette;
