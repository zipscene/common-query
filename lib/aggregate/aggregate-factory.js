let Aggregate = require('./aggregate');
let aggregateTypes = require('./aggregate-types');

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
		this._aggregateTypes = {};

		this._loadAggregateTypes(aggregateTypes);
	}

	_loadAggregateTypes(aggregateTypes) {
		for (let name in aggregateTypes) {
			let Constructor = aggregateTypes[name];
			let aggregateType = new Constructor();
			this.registerAggregateType(name, aggregateType);
		}
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
	createAggregate(aggregateData, options) {
		return new Aggregate(aggregateData, this, options);
	}

	registerAggregateType(name, aggregateType) {
		this._aggregateTypes[name] = aggregateType;
	}

	getAggregateType(name) {
		return this._aggregateTypes[name];
	}

}

module.exports = AggregateFactory;
