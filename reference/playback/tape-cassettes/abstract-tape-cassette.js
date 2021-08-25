/**
 * Abstract Tape-Cassette class - the small plastic box that contains the tape which has the recordings.
 * This class is the abstract implementation of a cassette, which contains all the shared functionality between cassettes.
 */

class AbstractTapeCassette {
  constructor(method, type) {
    this.method = method;
    this.type = type;
    this.customer = 'test-customer';
    this.playbackDirPath = 'root';
    this.latestRecordedIds = [];
  }

  getMethod() {
    return this.method;
  }

  getType() {
    return this.type;
  }

  saveRecording(recordingKey) {
    this.latestRecordedIds.push(recordingKey);
  }

  getLatestRecordedIds() {
    return this.latestRecordedIds;
  }

  setCustomer(customer) {
    this.customer = customer;
  }

  _getRecordingsPath() {
    return `${this.playbackDirPath}/${this.customer}/full`;
  }

  _getRecordingsMetaDataPath() {
    return `${this.playbackDirPath}/${this.customer}/metadata`;
  }

  _getRecordingsDirPathForWorker() {
    return `${this._getRecordingsPath()}/${this.getMethod()}`;
  }

  _getRecordingsMetaDirPathForWorker() {
    return `${this._getRecordingsMetaDataPath()}/${this.getMethod()}`;
  }

  _getFileFullPath(recordingKey) {
    return `${this._getRecordingsDirPathForWorker()}/${recordingKey}${AbstractTapeCassette.getPlayBackFileSuffix()}`;
  }

  _getFileMetaFullPath(recordingKey) {
    return `${this._getRecordingsMetaDirPathForWorker()}/${recordingKey}${AbstractTapeCassette.getPlayBackFileSuffix()}`;
  }

  // eslint-disable-next-line class-methods-use-this
  async getMetaData(recordingKey) {
    // eslint-disable-next-line no-console
    console.log(
      'getMetaData abstract cassette - please implement the method in the cassette you use'
    );
  }

  // eslint-disable-next-line class-methods-use-this
  async getAllRecordingIds(recordingKey) {
    // eslint-disable-next-line no-console
    console.log(
      'getAllRecordingIds abstract cassette - please implement the method in the cassette you use'
    );
  }

  // eslint-disable-next-line class-methods-use-this
  async getRecordingsByFilter(recordingKey) {
    // eslint-disable-next-line no-console
    console.log(
      'getRecordingsByFilter abstract cassette - please implement the method in the cassette you use'
    );
  }

  static getPlayBackFileSuffix() {
    return '.json';
  }

  static stringifyObjectAndReplaceValues(data, replacer) {
    return JSON.stringify(data, replacer);
  }
}

module.exports = AbstractTapeCassette;
