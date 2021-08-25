const _ = require('lodash');
const shortId = require('shortid');

/**
 * Simple Recording class - represents a simple recording.
 */
class Recording {
  constructor(method) {
    this.id = shortId();
    this.method = method;
    this.data = {};
    this.metadata = { method, timestamp: new Date().getTime() };
  }

  getKey() {
    return this.id;
  }

  getMethod() {
    return this.method;
  }

  setData(data) {
    this.data = data;
  }

  addData(data) {
    this.data = _.assign(this.data, data);
  }

  getData() {
    return this.data;
  }

  addMetaData(metadata) {
    this.metadata = _.assign(this.metadata, metadata);
  }

  getMetaData() {
    return this.metadata;
  }
}

module.exports = Recording;
