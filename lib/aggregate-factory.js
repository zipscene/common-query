let Aggregate = require('./aggregate');
let _ = require('lodash');

/**
 * This class is responsible for creating Aggregate objects.  Right now, it should be
 * a simple wrapper, just to be consistent with QueryFactory and UpdateFactory.  In
 * the future, aggregates may be modular, with this factory controlling configuration
 * and operators.
 *
 * @class AggregateFactory
 * @constructor
 */
class AggregateFactory {

	constructor() {
	}

	/**
	 * Creates an Aggregate given the aggregate data.
	 *
	 * @method createAggregate
	 * @param {Object} aggregateData - The raw aggregate
	 * @param {Object} [options] - Options to pass to the aggregate constructor
	 * @param {Object} [options.skipValidate]
	 * @return {Aggregate}
	 */
	createQuery(aggregateData, options) {
		return new Aggregate(aggregateData, this, options);
	}

}

module.exports = AggregateFactory;
