let QueryOperator = require('./query-operator');
let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');

class QueryOperatorAnd extends QueryOperator {

	constructor(name) {
		super(name || '$and');
	}

	matches(value, operatorValue, operator, query) {
		if (!Array.isArray(operatorValue)) throw new QueryValidationError('Value of $and must be array');
		return _.every(operatorValue, subquery => query._matchSubquery(subquery, value) );
	}

}
exports.QueryOperatorAnd = QueryOperatorAnd;

class QueryOperatorOr extends QueryOperator {

	constructor(name) {
		super(name || '$or');
	}

	matches(value, operatorValue, operator, query) {
		if (!Array.isArray(operatorValue)) throw new QueryValidationError('Value of $or must be array');
		return _.some(operatorValue, subquery => query._matchSubquery(subquery, value) );
	}

}
exports.QueryOperatorOr = QueryOperatorOr;

class QueryOperatorNor extends QueryOperatorOr {

	constructor(name) {
		super(name || '$nor');
	}

	matches(value, operatorValue, operator, query) {
		return !super.matches(value, operatorValue, operator, query);
	}

}
exports.QueryOperatorNor = QueryOperatorNor;
