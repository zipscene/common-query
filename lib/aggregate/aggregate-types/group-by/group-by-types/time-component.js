const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

const VALID_COMPONENTS = [
	'year',
	'month',
	'week',
	'day',
	'hour',
	'minute',
	'second'
];

class TimeComponentGroupByType extends FieldGroupByType {

	constructor() {
		super('time-component', [ 'timeComponent', 'timeComponentCount' ], [ 'date' ]);
	}

	isType(group) {
		return typeof group.timeComponent === 'string' && VALID_COMPONENTS.indexOf(group.timeComponent) >= 0;
	}

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

	validate(group) {
		super.validate(group);
		if (typeof group.timeComponent === 'string' && VALID_COMPONENTS.indexOf(group.timeComponent) < 0) {
			throw new AggregateValidationError(`groupBy time component must be one of: ${VALID_COMPONENTS}`);
		}
		if (typeof group.timeComponentCount !== 'number' || group.timeComponentCount <= 0) {
			throw new AggregateValidationError('groupBy time component count must be a number > 0');
		}
	}
}
module.exports = exports = TimeComponentGroupByType;
