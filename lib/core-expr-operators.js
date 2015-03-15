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
		return new RegExp(operatorValue.replace(' ', '.+'), 'i').test(value);
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

// abstract class for $gt, $gte, $lt, $lte
class ExprOperatorRanges extends ExprOperator {

	constructor(name) {
		super(name);
	}

	matchesValue(value, operatorValue) {
		// Convert dates to numbers
		if (_.isDate(value)) {
			value = value.getTime();
		}
		if (_.isDate(operatorValue)) {
			operatorValue = operatorValue.getTime();
		}
		// If either value is a string, convert both to strings
		if (_.isString(value) || _.isString(operatorValue)) {
			value = '' + value;
			operatorValue = '' + operatorValue;
		}
		// Make sure values are scalar
		if (!objtools.isScalar(operatorValue)) {
			throw new QueryValidationError('Arguments to arithmetic comparisons must be scalar');
		}
		if (!objtools.isScalar(value)) {
			return false;
		}
		return this._checkRange(value, operatorValue);
	}

	/*eslint-disable */
	_checkRange(value, operatorValue) {
	}
	/*eslint-enable */

}

class ExprOperatorGt extends ExprOperatorRanges {

	constructor(name) {
		super(name || '$gt');
	}

	_checkRange(a, b) {
		return a > b;
	}

}
exports.ExprOperatorGt = ExprOperatorGt;

class ExprOperatorGte extends ExprOperatorRanges {

	constructor(name) {
		super(name || '$gte');
	}

	_checkRange(a, b) {
		return a >= b;
	}

}
exports.ExprOperatorGte = ExprOperatorGte;

class ExprOperatorLt extends ExprOperatorRanges {

	constructor(name) {
		super(name || '$lt');
	}

	_checkRange(a, b) {
		return a < b;
	}

}
exports.ExprOperatorLt = ExprOperatorLt;

class ExprOperatorLte extends ExprOperatorRanges {

	constructor(name) {
		super(name || '$lte');
	}

	_checkRange(a, b) {
		return a <= b;
	}

}
exports.ExprOperatorLte = ExprOperatorLte;

