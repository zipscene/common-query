let QueryOperator = require('./query-operator');
let _ = require('lodash');

class QueryOperatorAnd extends QueryOperator {

	constructor(name) {
		super(name || '$and');
	}

	matches(value, operatorValue, operator, options, query) {
		return _.every(operatorValue, subquery => query._matchSubquery(subquery, value, options) );
	}

}
exports.QueryOperatorAnd = QueryOperatorAnd;

class QueryOperatorOr extends QueryOperator {

	constructor(name) {
		super(name || '$or');
	}

	matches(value, operatorValue, operator, options, query) {
		return _.some(operatorValue, subquery => query._matchSubquery(subquery, value, options) );
	}

}
exports.QueryOperatorOr = QueryOperatorOr;

class QueryOperatorNor extends QueryOperatorOr {

	constructor(name) {
		super(name || '$nor');
	}

	matches(value, operatorValue, operator, options, query) {
		return !super.matches(value, operatorValue, operator, options, query);
	}

}
exports.QueryOperatorNor = QueryOperatorNor;
