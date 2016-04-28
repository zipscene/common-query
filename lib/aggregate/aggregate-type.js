const _ = require('lodash');
const objtools = require('zs-objtools');

/**
 * Provides an interface for normalizing and validating "Aggregate Type"s.
 *
 * This class should not be instantiated directly.
 * Instead, it should be subclassed with proper functionality.
 *
 * @class AggregateType
 * @constructor
 * @param {String} name - The name of the AggregateType
 * @param {String[]} [fields=[name]] - The valid fields for this AggregateType.
 */
class AggregateType {

	constructor(name, fields) {
		this._name = name;
		this._fields = fields || [ name ];
	}

	/**
	 * Return the name of this AggregateType.
	 *
	 * @method getName
	 * @return {String}
	 */
	getName() {
		return this._name;
	}

	/**
	 * Return the valid fields for this AggregateType.
	 *
	 * @method getFields
	 * @return {String[]}
	 */
	getFields() {
		return this._fields;
	}

	/**
	 * Returns whether or not this AggregateType is duck-type matches the given aggregate data.
	 *
	 * @method isType
	 * @param {Object} aggregate - The aggregate data to check against.
	 * @return {Boolean} Wether or not the AggregateType matches the aggregate.
	 */
	isType(aggregate) {
		return objtools.isPlainObject(aggregate);
	}

	/**
	 * Normalize the aggregate and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If an aggregate value cannot be normalized.
	 * @param {Object} aggregate - The aggregate to noramlize.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(/*aggregate, options = {}*/) {
		// There is nothing to normalize
	}

	/**
	 * Validates that the aggregate is correct.  It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} aggregate - The aggregate to validate.
	 * @return {Boolean} - true
	 */
	validate(/*aggregate*/) {
		// There is nothing to validate
		return true;
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the aggregate accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} aggregate - The aggregate to get the queried fields form.
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(/*aggregate, options = {}*/) {
		return [];
	}

}

module.exports = exports = AggregateType;
