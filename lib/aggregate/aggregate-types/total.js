const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');

class TotalAggregateType extends AggregateType {

	constructor() {
		super('total');
	}

	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !!aggregate.total;
	}

	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);
		// Normalize total to be a boolean
		if (!aggregate.total) {
			delete aggregate.total;
		} else {
			aggregate.total = true;
		}
	}

	validate(aggregate) {
		if (aggregate.total !== true) {
			throw new AggregateValidationError('total field must be true');
		}
		return true;
	}

}
module.exports = exports = TotalAggregateType;
