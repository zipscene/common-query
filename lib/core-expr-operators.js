let ExprOperator = require('./expr-operator');
let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');

class ExprOperatorExists extends ExprOperator {

	constructor(name) {
		super(name || '$exists');
	}

	matches(value, operatorValue) {
		if (!_.isBoolean(operatorValue)) throw new QueryValidationError('Value of $exists must be boolean');
		if (operatorValue) {
			return value !== undefined;
		} else {
			return value === undefined;
		}
	}

}
exports.ExprOperatorExists = ExprOperatorExists;

