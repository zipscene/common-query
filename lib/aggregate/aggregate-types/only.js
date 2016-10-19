/* eslint-disable spaced-comment */

const objtools = require('zs-objtools');
const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');
const Query = require('../../query/query');

/**
 * OnlyAggregateType matches against aggregates with the 'only' field:
 * ```
 * {
 *   "only": [ "foo", "bar" ]
 * }
 * ```
 * This aggregate type restricts aggregation buckets to the specified fields
 * See README.md for more details on shorthand and usage.
 *
 * @class OnlyAggregateType
 * @constructor
 * @extends AggregateType
 */
class OnlyAggregateType extends AggregateType {

	constructor() {
		super('only');
	}

	/**
	 * Returns whether or not this AggregateType is duck-type matches the given aggregate data.
	 *
	 * @method isType
	 * @param {Object} aggregate - The aggregate data to check against.
	 * @return {Boolean} Whether or not the AggregateType matches the aggregate.
	 */
	isType(aggregate) {
		if (!super.isType(aggregate)) return false;
		return !objtools.isEmpty(aggregate.only);
	}

	/**
	 * Normalize the aggregate and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If an aggregate value cannot be normalized.
	 * @param {Object} aggregate - The aggregate to normalize.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);

		let only = aggregate.only;
		if (!Array.isArray(only) && typeof only !== 'string') {
			throw new AggregateValidationError('only field must be an array or a string.');
		}

		if (typeof only === 'string') {
			// Just one only field
			aggregate.only = [ only ];
			only = aggregate.only;
		}

		// Validate all values in the only field
		for (let path of only) {
			if (typeof path !== 'string') {
				throw new AggregateValidationError('only field arrays must only contain strings.');
			}
		}

		if (options.schema) {
			// Validate fields against the schema
			for (let path of aggregate.only) {
				let [ subschema ] = Query.getQueryPathSubschema(options.schema, path);
				if (!subschema) {
					throw new AggregateValidationError(`only field (${path}) does not exist in the schema.`);
				}
			}
		}
	}

	/**
	 * Validates that the aggregate is correct. It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} aggregate - The aggregate to validate.
	 * @return {Boolean} - true
	 */
	validate(aggregate) {
		super.validate(aggregate);
		let only = aggregate.only;

		if (!Array.isArray(only)) throw new AggregateValidationError('only field must be an array.');
		if (!only.length) throw new AggregateValidationError('only field must not be empty.');

		for (let path of only) {
			if (typeof path !== 'string') {
				throw new AggregateValidationError('only field properties must be strings.');
			}
		}
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
	getQueriedFields(aggregate, options = {}) {
		this.normalize(aggregate, options);
		return aggregate.only;
	}

}

module.exports = OnlyAggregateType;
