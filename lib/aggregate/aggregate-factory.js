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

	/**
	 * Create and register core AggregateTypes.
	 *
	 * @method _loadAggregateTypes
	 * @private
	 * @param {AggregateType[]} aggregateTypes - The AggregateTypes to load.
	 */
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
	 * @param {Object} aggregateData - The raw aggregate.
	 * @param {Object} [options] - Options to pass to the aggregate constructor.
	 *   @param {Object} [options.skipValidate]
	 * @return {Aggregate}
	 */
	createAggregate(aggregateData, options) {
		return new Aggregate(aggregateData, this, options);
	}

	/**
	 * Register an AggregateType with the given name.
	 *
	 * @method registerAggregateType
	 * @param {String} name - The name to register the AggregateType under.
	 * @param {AggregateType} aggregateType - The AggregateType to register.
	 */
	registerAggregateType(name, aggregateType) {
		this._aggregateTypes[name] = aggregateType;
	}

	/**
	 * Get the AggregateType registered under the given name.
	 *
	 * @method getAggregateType
	 * @param {String} name - The name to look up for the AggregateType.
	 * @return {AggregateType} The AggregateType registerd under the name.
	 */
	getAggregateType(name) {
		return this._aggregateTypes[name];
	}

}

module.exports = AggregateFactory;
