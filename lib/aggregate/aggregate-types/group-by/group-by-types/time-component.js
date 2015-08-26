const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

/**
 * Valid time component strings
 *
 * @property VALID_COMPONENTS
 * @for TimeComponentGroupByType
 * @static
 * @type String[]
 */
const VALID_COMPONENTS = [
	'year',
	'month',
	'week',
	'day',
	'hour',
	'minute',
	'second'
];

/**
 * TimeComponentGroupByType matches against "timeComponent" fields in a Group entry.
 * This aggregate groups Date schema fields by time components.
 * For more details, see README.md
 *
 * @class TimeComponentGroupByType
 * @constructor
 * @extends FieldGroupByType
 */
class TimeComponentGroupByType extends FieldGroupByType {

	constructor() {
		super('time-component', [ 'timeComponent', 'timeComponentCount' ], [ 'date' ]);
	}

	/**
	 * Returns whether or not this GroupByType is duck-type matches the given group data.
	 *
	 * @method isType
	 * @param {Object} group - The group data to check against.
	 * @return {Boolean} Wether or not the GroupByType matches the group.
	 */
	isType(group) {
		return typeof group.timeComponent === 'string' && VALID_COMPONENTS.indexOf(group.timeComponent) >= 0;
	}

	/**
	 * Normalize the group and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If group value cannot be normalized.
	 * @param {Object} group - The group to noramlize.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(group, options = {}) {
		super.normalize(group, options);

		if (typeof group.timeComponent === 'string' && VALID_COMPONENTS.indexOf(group.timeComponent) < 0) {
			throw new AggregateValidationError(`groupBy time component must be one of: ${VALID_COMPONENTS}`);
		}

		let count = group.timeComponentCount;
		if (count === undefined || count === null) {
			// Set to default
			count = 1;
		} else if (typeof count === 'string' && !isNaN(count)) {
			// Parse if string
			count = parseFloat(count);
		}
		if (typeof count !== 'number' || count <= 0) {
			throw new AggregateValidationError('groupBy time component count must be a number > 0');
		}
		group.timeComponentCount = count;
	}

	/**
	 * Validates that the group is correct. It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} group - The group to validate.
	 * @return {Boolean} - true
	 */
	validate(group) {
		super.validate(group);
		if (typeof group.timeComponent === 'string' && VALID_COMPONENTS.indexOf(group.timeComponent) < 0) {
			throw new AggregateValidationError(`groupBy time component must be one of: ${VALID_COMPONENTS}`);
		}
		if (typeof group.timeComponentCount !== 'number' || group.timeComponentCount <= 0) {
			throw new AggregateValidationError('groupBy time component count must be a number > 0');
		}
		return true;
	}
}

module.exports = exports = TimeComponentGroupByType;

TimeComponentGroupByType.VALID_COMPONENTS = VALID_COMPONENTS;
