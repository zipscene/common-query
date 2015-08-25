const AggregateValidationError = require('../../aggregate-validation-error');

class GroupByType {

	constructor() {
	}

	isType(/*group*/) {
		return true;
	}

	normalize(group/*, options = {}*/) {
		if (!_.isPlainObject(group)) {
			throw new AggregateValidationError('groupBy entry must be an object');
		}
	}

	validate() {
		//TODO: validate that the field exists in the schema
	}

}
module.exports = exports = GroupByType;
