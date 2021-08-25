const { assert } = require('chai');
const _ = require('lodash');

const defaultRemovals = obj =>
  _.omit(
    obj,
    'loggerContext',
    'projectId',
    'redisKey',
    'euclidResultKey',
    'jobId',
    'transitTo',
    'id',
    'folderId'
  );

module.exports = method => {
  switch (method) {
    case 'ConvertDatasetToTimeplan': {
      return (a, b) => {
        const clean = entity => {
          return entity
            .map(rt => _.pick(rt, 'directions'))
            .map(tb => ({
              directions: tb.directions.map(direction => {
                if (direction && direction.trips) {
                  return {
                    trips: direction.trips.map(t => _.omit(t, 'pattern'))
                  };
                }
                if (direction && direction.patterns) {
                  return {
                    patterns: direction.patterns.map(p => _.omit(p, 'pattern', 'id'))
                  };
                }
                return direction;
              })
            }));
        };
        ['tpTimetables', 'tpRunningTimes', 'tpRoutes'].forEach(entity => {
          const out = clean(a[entity]);
          const res = clean(b[entity]);
          assert.deepEqual(out, res);
        });
        return true;
      };
    }
    default: {
      // console.log('no comperator found, using default');
      return (a, b) => {
        assert.deepEqual(defaultRemovals(a), defaultRemovals(b));
        return true;
      };
    }
  }
};
