const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');

class TotalAggregateType extends AggregateType {

	constructor(name) {
		super(name);
	}

	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !!aggregate.total;
	}

	normalize(aggregate/*, options = {}*/) {
		// Normalize total to be a boolean
		aggregate.total = !!aggregate.total;
	}

	validate(aggregate) {
		if (typeof aggregate.total !== 'boolean') {
			throw new AggregateValidationError('total field must be a boolean');
		}
	}

}
module.exports = exports = TotalAggregateType;
