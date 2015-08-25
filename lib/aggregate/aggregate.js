let AggregateValidationError = require('./aggregate-validation-error');
let _ = require('lodash');

/**
 * Encapsulates a common-query aggregate and provides methods for utilizing and manipulating
 * those aggregates.  These aggregate objects are defined by the README.
 *
 * This class should not be instantiated directly.  Instead, use AggregateFactory.
 *
 * @class Aggregate
 * @constructor
 * @throws {XError} - If aggregate is invalid
 * @param {Object} aggregateData - Raw object containing the aggregate.
 * @param {AggregateFactory} aggregateFactory - AggregateFactory that created this aggregate.
 * @param {Object} [options]
 * @param {Object} [options.skipValidate] - If set, the aggregate will not be validated or
 *   normalized during construction.  You can still call validate() later.
 */
class Aggregate {

	constructor(aggregateData, aggregateFactory, options = {}) {
		this._aggregateData = aggregateData;
		this._aggregateFactory = aggregateFactory;
		if (!options.skipValidate) {
			this.normalize(options);
		}
	}

	/**
	 * Returns the aggregate data this class encapsulates.
	 *
	 * @method getData
	 * @return {Object}
	 */
	getData() {
		return this._aggregateData;
	}

	/**
	 * Returns the factory that created this.
	 *
	 * @method getAggregateFactory
	 * @return {AggregateFactory}
	 */
	getAggregateFactory() {
		return this._aggregateFactory;
	}

	/**
	 * Normalize this aggregate and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If an aggregate value cannot be normalized.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(options = {}) {
		// This function needs to normalize both the format of the aggregate specification
		// and the field values it matches against (if relevant).  It should also validate
		// to ensure (for example) the referenced fields exist and are of the appropriate
		// type (if a schema is given).
		// When normalizing the aggregate format, make sure to always normalize it to the
		// most verbose format allowed.  The aggregate specification allows several shorthand
		// formats which need to be condensed.
		let aggregate = this._aggregateData;
		let types = this._getAggregateTypes();
		for (let type of types) {
			type.normalize(aggregate, options);
		}
	}

	_getAggregateTypes() {
		let aggregate = this._aggregateData;
		if (!_.isPlainObject(aggregate)) {
			throw new AggregateValidationError('aggregateData must be a plain JavaScript object');
		}
		let types = [];
		for (let name in this._aggregateFactory._aggregateTypes) {
			let aggregateType = this._aggregateFactory._aggregateTypes[name];
			if (aggregateType.isType(aggregate)) {
				types.push(aggregateType);
			}
		}
		return types;
	}

	/**
	 * Validates that the encapsulated aggregate is correct.  It should be strictly validated.
	 *
	 * @method validate
	 * @throws {XError} - Validation error
	 * @return {Boolean} - true
	 */
	validate() {
		// Validate that the aggregate is in its full (verbose) form and that all data types
		// and fields are correct.  Throw exception on error, return true on success.
		let aggregate = this._aggregateData;
		let types = this._getAggregateTypes();
		for (let type of types) {
			type.validate(aggregate);
		}
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the aggregate accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 * @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(/*options = {}*/) {
		// Should return an array of field names that the aggregate accesses.  This should include
		// both fields used in the grouping and fields used in the stats.
		// if (this._aggregateData.groupBy) {
		// 	for (let group in this._aggregateData.groupBy) {


		// 	}
		// }
	}

}

module.exports = Aggregate;
