const _ = require('lodash');
const aws = require('aws-sdk');
const AbstractTapeCassette = require('./abstract-tape-cassette');
const utils = require('../../../apps/frontend/controllers/util');

/**
 * S3 Tape-Cassette class - the small plastic box that contains the tape which has the recordings.
 * This class is the S3 implementation of a cassette
 */

const PLAYBACK_BUCKET = process.env.PLAYBACK_RECORDING_BUCKET || 'optibus-archive';

const saveFileToS3 = async (path, fileContent) => {
  const params = {
    Bucket: PLAYBACK_BUCKET,
    Key: path,
    Body: fileContent
  };
  const s3 = new aws.S3({ region: 'eu-west-1' });
  const putObjectPromise = await s3.putObject(params).promise();
  return putObjectPromise;
};

const getFile = async path => {
  const s3Params = {
    Bucket: PLAYBACK_BUCKET,
    Key: path
  };
  const s3 = new aws.S3({ httpOptions: { timeout: 240000 } });
  await utils.s3ObjectExists(s3, s3Params);
  const data = await s3.getObject(s3Params).promise();
  const content = JSON.parse(data.Body.toString());
  return content;
};

const getKey = item => {
  const tokens = item.Key.split('/');
  const nameWithSuffix = _.last(tokens);
  const suffixLength = AbstractTapeCassette.getPlayBackFileSuffix().length;
  const key = nameWithSuffix.slice(0, -suffixLength);
  return key;
};

const getAllRecordingIds = async function getAllRecordingIds(dirName) {
  const s3Params = {
    Bucket: PLAYBACK_BUCKET,
    Prefix: dirName
  };
  const s3 = new aws.S3({ httpOptions: { timeout: 240000 } });
  const listOfObjects = await s3.listObjectsV2(s3Params).promise();
  return _.map(listOfObjects.Contents, getKey);
};

const getRecordingsByFilter = async function getRecordingsByFilter(dirName, filter) {
  const s3Params = {
    Bucket: PLAYBACK_BUCKET,
    Prefix: dirName
  };
  const s3 = new aws.S3({ httpOptions: { timeout: 240000 } });
  const getData = async ContinuationToken => {
    const listOfObjects = await s3
      .listObjectsV2(_.assign({ ContinuationToken }, s3Params))
      .promise();
    let partialList = _(listOfObjects.Contents)
      .filter(filter)
      .sortBy('LastModified')
      .map(getKey)
      .value();
    if (listOfObjects.IsTruncated) {
      const moreData = await getData(listOfObjects.NextContinuationToken);
      partialList = partialList.concat(moreData);
    }
    return partialList;
  };
  const list = await getData();
  return list;
};

class S3TapeCassette extends AbstractTapeCassette {
  constructor(method) {
    super(method, 's3');
    this.playbackDirPath = 'tape_recorder_recordings_js';
    this.savingPromises = [];
  }

  static UNDEFINED_REPLACER = '^_--undefined--_^';

  async saveRecording(recordingKey, recording) {
    // Save metadata
    const fullMetaFilePath = this._getFileMetaFullPath(recordingKey);
    const stringedMetaData = JSON.stringify(recording.getMetaData());
    this.savingPromises.push(saveFileToS3(fullMetaFilePath, stringedMetaData)); // No await here, for async saving

    // Save data
    const fileFullPath = this._getFileFullPath(recordingKey);
    const stringedData = this.stringifyObjectAndReplaceUndefined(recording.getData());
    this.savingPromises.push(saveFileToS3(fileFullPath, stringedData)); // No await here, for async saving
    Promise.all(this.savingPromises).then(results => {
      this.savingPromises = []; // Clear the array
    });
    super.saveRecording(recordingKey);
  }

  // eslint-disable-next-line class-methods-use-this
  stringifyObjectAndReplaceUndefined(data) {
    const replacer = (key, value) => {
      // Replace undefined with special field, because when signifying an undefined it gets omitted
      return value === undefined ? S3TapeCassette.UNDEFINED_REPLACER : value;
    };
    return AbstractTapeCassette.stringifyObjectAndReplaceValues(data, replacer);
  }

  async getRecordingByKey(recordingKey) {
    await Promise.all(this.savingPromises); // Wait till all savings are done.
    const fileFullPath = this._getFileFullPath(recordingKey);
    const fileContent = await getFile(fileFullPath);
    return fileContent;
  }

  async getMetaData(recordingKey) {
    await Promise.all(this.savingPromises); // Wait till all savings are done.
    const fullMetaFilePath = this._getFileMetaFullPath(recordingKey);
    const fileContent = await getFile(fullMetaFilePath);
    return fileContent;
  }

  async getAllRecordingIds(externalDir) {
    await Promise.all(this.savingPromises); // Wait till all savings are done.
    const dir = externalDir || this._getRecordingsDirPathForWorker();
    return getAllRecordingIds(dir);
  }

  async getRecordingsByFilter(filterFn, externalDir) {
    await Promise.all(this.savingPromises); // Wait till all savings are done.
    const dir = externalDir || this._getRecordingsDirPathForWorker();
    return getRecordingsByFilter(dir, filterFn);
  }
}

module.exports = S3TapeCassette;
