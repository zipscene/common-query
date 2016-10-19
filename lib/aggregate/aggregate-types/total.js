const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');

/**
 * TotalAggregateType matches against aggregates with the 'total' field:
 * ```
 * {
 *   "total": true
 * }
 * ```
 * This aggregate type returns across the whole database, or in groupings.
 * See README.md for more details usage.
 *
 * @class TotalAggregateType
 * @constructor
 * @extends AggregateType
 */
class TotalAggregateType extends AggregateType {

	constructor() {
		super('total');
	}

	/**
	 * Returns whether or not this AggregateType is duck-type matches the given aggregate data.
	 *
	 * @method isType
	 * @param {Object} aggregate - The aggregate data to check against.
	 * @return {Boolean} Wether or not the AggregateType matches the aggregate.
	 */
	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !!aggregate.total;
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
		// Normalize total to be a boolean
		if (!aggregate.total) {
			delete aggregate.total;
		} else {
			aggregate.total = true;
		}
	}

	/**
	 * Validates that the aggregate is correct.  It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} aggregate - The aggregate to validate.
	 * @return {Boolean} - true
	 */
	validate(aggregate) {
		if (aggregate.total !== true) {
			throw new AggregateValidationError('total field must be true');
		}
		return true;
	}

}

module.exports = exports = TotalAggregateType;
