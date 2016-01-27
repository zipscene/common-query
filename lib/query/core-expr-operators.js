let ExprOperator = require('./expr-operator');
let ObjectMatchError = require('../object-match-error');
let Query = require('./query');
let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');
let objtools = require('zs-objtools');
let regexpQuote = require('regexp-quote');

class ExprOperatorExists extends ExprOperator {

	constructor(name) {
		super(name || '$exists');
	}

	matches(value, operatorValue) {
		if (operatorValue) {
			return value !== undefined;
		} else {
			return value === undefined;
		}
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		parent[parentKey] = !!operatorValue;
	}

	validate(operatorValue) {
		if (!_.isBoolean(operatorValue)) throw new QueryValidationError('Value of $exists must be boolean');
	}

}
exports.ExprOperatorExists = ExprOperatorExists;

class ExprOperatorNot extends ExprOperator {

	constructor(name) {
		super(name || '$not');
	}

	matches(value, operatorValue, operator, expr, options, query) {
		return !query._operatorExpressionMatches(value, operatorValue, options);
	}

	validate(operatorValue) {
		if (!_.isPlainObject(operatorValue)) throw new QueryValidationError('Argument of $not must be an expression');
	}

	traverse(operatorValue, field, operator, expr, query, handlers) {
		query._traverseOperatorExpression(operatorValue, field, handlers);
	}

}
exports.ExprOperatorNot = ExprOperatorNot;

class ExprOperatorElemMatch extends ExprOperator {

	constructor(name) {
		super(name || '$elemMatch');
		// Flag to tell the traverser to ignore the base field name as a queried field.  This
		// is set because more specific queried fields are set as part of the subqueries.
		this.ignoreQueriedField = true;
		// Flag to tell the traverser that children of this operator traverse through queries
		// that operate on a different logical context.  This is used, for example, when transforming
		// field names, because the fields of the subcomponents of an array shouldn't have their
		// names transformed (they're in a different logical context).
		this.newQueryContext = true;
	}

	matches(value, operatorValue, operator, expr, options, query) {
		if (!Array.isArray(value)) return false;
		return _.some(value, elem => query._matchSubquery(operatorValue, elem, options) );
	}

	validate(operatorValue) {
		if (!_.isPlainObject(operatorValue)) {
			throw new QueryValidationError('Argument of $elemMatch must be an expression');
		}
	}

	traverse(operatorValue, field, operator, expr, query, handlers) {
		// The placeholder 'array index' field is represented by a $
		query._traverseSubquery(operatorValue, handlers, field + '.$');
	}

}
exports.ExprOperatorElemMatch = ExprOperatorElemMatch;

class ExprOperatorIn extends ExprOperator {

	constructor(name) {
		super(name || '$in');
	}

	matchesValue(value, operatorValue) {
		return _.some(operatorValue, elem => objtools.deepEquals(value, elem) );
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		if (_.isArray(operatorValue)) {
			for (let key in operatorValue) {
				parent[parentKey][key] = Query._normalizeValue(field, operatorValue[key], options);
			}
		} else {
			this.validate(operatorValue, operator, expr, query);
		}
	}

	validate(operatorValue) {
		if (!_.isArray(operatorValue)) throw new QueryValidationError(`Argument to ${this.getName()} must be array`);
	}

}
exports.ExprOperatorIn = ExprOperatorIn;

class ExprOperatorNin extends ExprOperatorIn {

	constructor(name) {
		super(name || '$nin');
	}

	matchesValue(value, operatorValue) {
		return !super.matchesValue(value, operatorValue);
	}

}
exports.ExprOperatorNin = ExprOperatorNin;

class ExprOperatorAll extends ExprOperatorIn {

	constructor(name) {
		super(name || '$all');
	}

	matches(value, operatorValue/*, operator, expr, options, query*/) {
		// Ensure every value in `operatorValue` is contained in `value`
		if (!_.isArray(value)) {
			throw new ObjectMatchError('$all can only be used on array fields');
		}
		for (let opVal of operatorValue) {
			let found = false;
			for (let val of value) {
				if (objtools.deepEquals(opVal, val)) {
					found = true;
					break;
				}
			}
			if (!found) {
				return false;
			}
		}
		return true;
	}

}
exports.ExprOperatorAll = ExprOperatorAll;

class ExprOperatorSize extends ExprOperator {
	constructor(name) {
		super(name || '$size');
	}

	matches(value, operatorValue) {
		if (!_.isArray(value)) return false;
		return value.length === operatorValue;
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		if (_.isString(operatorValue)) operatorValue = parseInt(operatorValue, 10);
		if (_.isNumber(operatorValue) && ~~operatorValue !== operatorValue) operatorValue = Math.floor(operatorValue);
		this.validate(operatorValue);
		parent[parentKey] = operatorValue;
	}

	validate(operatorValue) {
		if (!operatorValue || !_.isNumber(operatorValue) || isNaN(operatorValue)) {
			throw new QueryValidationError(`Argument to ${this.getName()} must be number`);
		}
		if (~~operatorValue !== operatorValue) {
			throw new QueryValidationError(`Argument to ${this.getName()} must be integer`);
		}
	}
}

exports.ExprOperatorSize = ExprOperatorSize;

class ExprOperatorText extends ExprOperator {

	constructor(name) {
		super(name || '$text');
	}

	matchesValue(value, operatorValue) {
		if (!_.isString(value)) return false;
		return new RegExp(operatorValue.replace(' ', '.+'), 'i').test(value);
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		if (!_.isString(operatorValue)) {
			parent[parentKey] = ''+operatorValue;
		}
	}

	validate(operatorValue) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $text must be string');
	}

}
exports.ExprOperatorText = ExprOperatorText;

class ExprOperatorWildcard extends ExprOperator {

	constructor(name) {
		super(name || '$wildcard');
	}

	matchesValue(value, operatorValue, operator, expr) {
		if (!_.isString(value)) return false;
		return ExprOperatorWildcard.makeWildcardRegex(operatorValue, expr.$options || undefined).test(value);
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		if (!_.isString(operatorValue)) {
			parent[parentKey] = ''+operatorValue;
		}
	}

	validate(operatorValue) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $wildcard must be string');
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
		if (!_.isString(value)) return false;
		return new RegExp(operatorValue, expr.$options || undefined).test(value);
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		if (_.isString(operatorValue)) return;

		if (_.isRegExp(operatorValue)) {
			parent[parentKey] = (''+operatorValue).slice(1, -1);
		} else {
			parent[parentKey] = ''+operatorValue;
		}
	}

	validate(operatorValue) {
		if (!_.isString(operatorValue)) throw new QueryValidationError('Argument to $regex must be string');
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
		// Convert dates to strings
		if (_.isDate(value)) {
			value = value.toISOString();
		}
		if (_.isDate(operatorValue)) {
			operatorValue = operatorValue.toISOString();
		}
		// If either value is a string, convert both to strings
		if (_.isString(value) || _.isString(operatorValue)) {
			value = '' + value;
			operatorValue = '' + operatorValue;
		}
		// Make sure values are scalar
		if (!objtools.isScalar(value)) {
			return false;
		}
		return this._checkRange(value, operatorValue);
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		parent[parentKey] = Query._normalizeValue(field, operatorValue, options);
	}

	validate(operatorValue) {
		if (!objtools.isScalar(operatorValue)) {
			throw new QueryValidationError('Arguments to arithmetic comparisons must be scalar');
		}
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

class ExprOperatorNe extends ExprOperator {

	constructor(name) {
		super(name || '$ne');
	}

	matchesValue(value, operatorValue) {
		return !objtools.deepEquals(value, operatorValue);
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		parent[parentKey] = Query._normalizeValue(field, operatorValue, options);
	}

}
exports.ExprOperatorNe = ExprOperatorNe;
