const _ = require('lodash');

const AggregateType = require('../aggregate-type');

class StatsAggregateType extends AggregateType {

	constructor(name) {
		super(name);
	}

	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !_.isEmpty(aggregate.stats);
	}

	normalize(/*aggregate, options = {}*/) {
	}

	validate(/*aggregate*/) {
	}

}
module.exports = exports = StatsAggregateType;
