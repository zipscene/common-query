// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const QueryOperator = require('./query-operator');
const _ = require('lodash');

class QueryOperatorAnd extends QueryOperator {

	constructor(name) {
		super(name || '$and');
	}

	matches(value, operatorValue, operator, options, query) {
		return _.every(operatorValue, (subquery) => query._matchSubquery(subquery, value, options));
	}

}
exports.QueryOperatorAnd = QueryOperatorAnd;

class QueryOperatorOr extends QueryOperator {

	constructor(name) {
		super(name || '$or');
	}

	matches(value, operatorValue, operator, options, query) {
		return _.some(operatorValue, (subquery) => query._matchSubquery(subquery, value, options));
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
