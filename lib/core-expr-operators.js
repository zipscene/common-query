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

class ExprOperatorNot extends ExprOperator {

	constructor(name) {
		super(name || '$not');
	}

	matches(value, operatorValue, operator, expr, query) {
		return !query._operatorExpressionMatches(value, operatorValue);
	}

}
exports.ExprOperatorNot = ExprOperatorNot;

/*
class ExprOperatorElemMatch extends ExprOperator {

	constructor(name) {
		super(name || '$elemMatch');
	}

	matches(value, operatorValue, operator, expr, query) {
		if (!Array.isArray(value)) return false;
		return _.some(value, elem => )
	}

}
*/