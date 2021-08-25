/**
 * Tape-Cassette class - the small plastic box that contains the tape which has the recordings.
 * This class is the file system implementation of a cassette
 */

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const AbstractTapeCassette = require('./abstract-tape-cassette');

const fsPromises = fs.promises;

const getAllRecordings = async function getAllRecordings(dirPath) {
  const recordingsIds = [];
  const listOfFiles = await fsPromises.readdir(dirPath);
  listOfFiles.forEach(fileName => {
    if (fileName.endsWith(AbstractTapeCassette.getPlayBackFileSuffix())) {
      fileName = _.head(fileName.split('.'));
      recordingsIds.push(fileName);
    }
  });
  return recordingsIds;
};

const ensureDirectoryExistence = filePath => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

const saveFile = async function saveFile(filePath, stringedContent) {
  const options = { encoding: 'utf-8', flag: 'w' };
  try {
    ensureDirectoryExistence(filePath);
    await fsPromises.writeFile(filePath, stringedContent, options);
  } catch (err) {
    throw new Error(err);
  }
};

const readJSONFile = async function readJSONFile(filePath) {
  const fileContent = await fsPromises.readFile(filePath, 'utf-8');
  return JSON.parse(fileContent);
};

/**
 * ############## The main class ##############
 */
class FileSystemTapeCassette extends AbstractTapeCassette {
  constructor(method) {
    super(method, 'fs');
    this.playbackDirPath = '/Users/odaysayed/desktop/playback';
  }

  async saveRecording(recordingKey, recording) {
    const fullFilePath = this._getFileFullPath(recordingKey);
    const stringedData = AbstractTapeCassette.stringifyObjectAndReplaceValues(recording.getData());
    await saveFile(fullFilePath, stringedData);
    super.saveRecording(recordingKey); // Save it in memory

    // Save metadata
    const fullMetaFilePath = this._getFileMetaFullPath(recordingKey);
    const stringedMetaData = JSON.stringify(recording.getMetaData());
    await saveFile(fullMetaFilePath, stringedMetaData);
  }

  async getRecordingByKey(recordingKey) {
    let fileContent = null;
    try {
      fileContent = await readJSONFile(this._getFileFullPath(recordingKey));
    } catch (e) {
      throw new Error('recording file was not found');
    }
    return fileContent;
  }

  async getAllRecordingIds() {
    const allRecordings = await getAllRecordings(this._getRecordingsDirPathForWorker());
    return allRecordings;
  }
}

module.exports = FileSystemTapeCassette;
