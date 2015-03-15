let ExprOperator = require('./expr-operator');
let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');
let objtools = require('zs-objtools');
let regexpQuote = require('regexp-quote');

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

class ExprOperatorElemMatch extends ExprOperator {

	constructor(name) {
		super(name || '$elemMatch');
	}

	matches(value, operatorValue, operator, expr, query) {
		if (!Array.isArray(value)) return false;
		return _.some(value, elem => query._queryFactory.createQuery(operatorValue).matches(elem) );
	}

}
exports.ExprOperatorElemMatch = ExprOperatorElemMatch;

class ExprOperatorIn extends ExprOperator {

	constructor(name) {
		super(name || '$in');
	}

	matchesValue(value, operatorValue) {
		if (!Array.isArray(operatorValue)) throw new QueryValidationError('Argument to $in must be array');
		return _.some(operatorValue, elem => objtools.deepEquals(value, elem) );
	}

}
exports.ExprOperatorIn = ExprOperatorIn;

class ExprOperatorText extends ExprOperator {

	constructor(name) {
		super(name || '$text');
	}

	matchesValue(value, operatorValue) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $text must be string');
		if (!_.isString(value)) return false;
		return new RegExp(operatorValue.replace(' ', '.+')).test(value);
	}

}
exports.ExprOperatorText = ExprOperatorText;

class ExprOperatorWildcard extends ExprOperator {

	constructor(name) {
		super(name || '$wildcard');
	}

	matchesValue(value, operatorValue, operator, expr) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $wildcard must be string');
		if (!_.isString(value)) return false;
		return ExprOperatorWildcard.makeWildcardRegex(operatorValue, expr.$options || undefined).test(value);
	}

	static makeWildcardRegex(str, options) {
		let ret = '^';
		let c;
		for (let i = 0; i < str.length; i++) {
			c = str[i];
			if (c === '*') {
				ret += '.*';
			} else if (c === '?') {
				ret += '.?';
			} else {
				ret += regexpQuote(c);
			}
		}
		return new RegExp(ret + '$', options);
	}

}
exports.ExprOperatorWildcard = ExprOperatorWildcard;

class ExprOperatorRegex extends ExprOperator {

	constructor(name) {
		super(name || '$regex');
	}

	matchesValue(value, operatorValue, operator, expr) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $regex must be string');
		if (!_.isString(value)) return false;
		return new RegExp(operatorValue, expr.$options || undefined).test(value);
	}

}
exports.ExprOperatorRegex = ExprOperatorRegex;

class ExprOperatorOptions extends ExprOperator {

	constructor(name) {
		super(name || '$options');
	}

	matches() {
		// placeholder, not a real match
		return true;
	}

}
exports.ExprOperatorOptions = ExprOperatorOptions;

