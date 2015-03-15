var XError = require('xerror');

/**
 * This class represents an expression operator inside of a common query.  An expression
 * operator is an operator inside the context of a field that performs matching on the
 * field.
 *
 * @class ExprOperator
 * @constructor
 * @param {String} name - Operator name, such as "$ne"
 */
class ExprOperator {

	constructor(name) {
		this._name = name;
	}

	/**
	 * Returns the operator name.
	 *
	 * @return {String}
	 */
	getName() {
		return this._name;
	}

	/**
	 * If this expression operator can only match one exact value, this should return
	 * that value.  If the expression operator can never match, this should return
	 * null.  Otherwise, return undefined.
	 *
	 * @method getExactMatch
	 * @throws {XError} - Validation error
	 * @param {Mixed} operatorValue - The value associated with the operator key.
	 * @param {String} operator - The operator key string (ie, "$ne").
	 * @param {Object} expr - The expression object this expression operator is contained in.
	 * @param {Query} query - The parent query of this expression.
	 */
	getExactMatch(operatorValue, operator, expr, query) {
		return undefined;
	}

	/**
	 * Should add all operators used as subcomponents of this expression operator to the set
	 * operatorSet.
	 *
	 * @method getOperators
	 * @throws {XError} - Validation error
	 * @param {Object} operatorSet - A mapping from string operator keys such as "$and" to
	 * boolean `true` .
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Object} expr
	 * @param {Query} query
	 */
	getOperators(operatorSet, operatorValue, operator, expr, query) {

	}

	/**
	 * Validates the operator value.
	 *
	 * @method validate
	 * @throws {XError} - Validation error
	 * @param {Mixed} operatorValue - The value associated with the operator key.
	 * @param {String} operator - The operator key string (ie, "$ne").
	 * @param {Object} expr - The expression object this expression operator is contained in.
	 * @param {Query} query - The parent query of this expression.
	 */
	validate(operatorValue, operator, expr, query) {
		return undefined;
	}

	/**
	 * Determines whether the operator expression matches the given value.  The default
	 * implementation of this is suitable for most types of operators: If the matched value
	 * is an array, it calls matchesValue for each element in the array to see if any of
	 * them match.  This is the desired behavior in most cases.  Exceptions for operators
	 * such as $exists or $elemMatch which expect to operate on the value as a whole,
	 * instead of decomposing arrays into elements.
	 *
	 * @method matches
	 * @throws {XError} - Validation error
	 * @param {Mixed} value - Value corresponding to the value in the object being matched.
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Object} expr
	 * @param {Query} query
	 * @return {Boolean} - Whether or not the query matches the value.
	 */
	matches(value, operatorValue, operator, expr, query) {
		if (Array.isArray(value)) {
			for (let element of value) {
				if (this.matchesValue(element, operatorValue, operator, expr, query)) {
					return true;
				}
			}
		} else {
			return this.matchesValue(value, operatorValue, operator, expr, query);
		}
	}

	/**
	 * In the default behavior of matches(), this is called for each element in arrays on the
	 * object being matched, or, if it isn't an array, is called with the single value.
	 * Override this instead of matches() if implementing an operator which acts on individual
	 * values.
	 *
	 * @method matchesValue
	 * @throws {XError} - Validation error
	 * @param {Mixed} value - Value corresponding to the value in the object being matched or
	 * a single element in the array.
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Object} expr
	 * @param {Query} query
	 * @return {Boolean} - Whether or not the query matches the value.
	 */
	matchesValue(value, operatorValue, operator, expr, query) {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

}

module.exports = ExprOperator;