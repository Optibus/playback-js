/**
 * Cassette class - the big box that contains the buttons and can has a cassette to record on and play from.
 */

class TapeRecorder {
  constructor(cassette) {
    this.cassette = cassette;
  }

  getCassette() {
    return this.cassette;
  }

  async saveRecording(recording) {
    await this.getCassette().saveRecording(recording.getKey(), recording);
  }

  async getRecordingByKey(recordingKey) {
    return this.getCassette().getRecordingByKey(recordingKey);
  }

  async getMetaData(recordingKey) {
    return this.getCassette().getMetaData(recordingKey);
  }

  async getAllRecordingIds(...args) {
    return this.getCassette().getAllRecordingIds(...args);
  }

  async getRecordingsByFilter(...args) {
    return this.getCassette().getRecordingsByFilter(...args);
  }

  getLatestRecordedIds() {
    return this.getCassette().getLatestRecordedIds();
  }
}

module.exports = TapeRecorder;
