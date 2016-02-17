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
 * @param {Object|Aggregate} aggregateData - Object containing the aggregate.
 * @param {AggregateFactory} aggregateFactory - AggregateFactory that created this aggregate.
 * @param {Object} [options]
 * @param {Object} [options.skipValidate] - If set, the aggregate will not be validated or
 *   normalized during construction.  You can still call validate() later.
 */
class Aggregate {

	constructor(aggregateData, aggregateFactory, options = {}) {
		if (_.isFunction(aggregateData.getData)) aggregateData = aggregateData.getData();

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
		let aggregate = this._aggregateData;
		let types = this.findAggregateTypes();
		for (let type of types) {
			type.normalize(aggregate, options);
		}
	}

	/**
	 * Find the AggregateTypes associated with the encapsulated aggregateData.
	 *
	 * @method findAggregateTypes
	 * @throws {AggregateValidationError} - If something is invalid in the aggregateData or no AggregateType is matched.
	 * @param {Boolean} [validateProperties=true] - If true, also verify there are no invalid properties.
	 * @return {AggregateType[]} The AggregateTypes that match the encapsulated aggregateData.
	 */
	findAggregateTypes(validateProperties = true) {
		let aggregate = this._aggregateData;

		// Find valid aggregate types
		if (!_.isPlainObject(aggregate)) {
			throw new AggregateValidationError('aggregate must be a plain JavaScript object');
		}
		let types = [];
		for (let name in this._aggregateFactory._aggregateTypes) {
			let aggregateType = this._aggregateFactory._aggregateTypes[name];
			if (aggregateType.isType(aggregate)) {
				types.push(aggregateType);
			}
		}
		if (types.length <= 0) {
			let msg = 'aggregate must match at least one aggreagte type (groupBy, stats, total)';
			throw new AggregateValidationError(msg);
		}

		if (validateProperties) {
			// Ensure the aggregate doesn't have any extra properties
			let invalidFieldMap = {};
			for (let field in aggregate) {
				invalidFieldMap[field] = true;
			}
			for (let type of types) {
				for (let field of type.getFields()) {
					invalidFieldMap[field] = false;
				}
			}
			for (let field in invalidFieldMap) {
				if (invalidFieldMap[field]) {
					throw new AggregateValidationError(`aggregate contains unrecognized field (${field})`);
				}
			}
		}

		// Return the validated types
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
		let aggregate = this._aggregateData;
		let types = this.findAggregateTypes();
		for (let type of types) {
			type.validate(aggregate);
		}
		return true;
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the aggregate accesses.
	 * This expects the encapsulated aggregate to be correct, or else a validation error is thrown.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(options = {}) {
		let aggregate = this._aggregateData;
		let types = this.findAggregateTypes(false);
		let fieldSet = {};
		// Combine queried fields from each of the matched aggregate types
		for (let type of types) {
			let fields = type.getQueriedFields(aggregate, options);
			for (let field of fields) {
				fieldSet[field] = true;
			}
		}
		return Object.keys(fieldSet);
	}

}

module.exports = Aggregate;
