const _ = require('lodash');

class AggregateType {

	constructor(name) {
		this._name = name;
	}

	getName() {
		return this._name;
	}

	isType(aggregate) {
		return _.isPlainObject(aggregate);
	}

	normalize(/*aggregate, options = {}*/) {
		// There is nothing to normalize
	}

	validate(/*aggregate*/) {
		// There is nothing to validate
	}

}
module.exports = exports = AggregateType;
