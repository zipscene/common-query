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
	 * Determines whether the operator expression matches the given value.
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
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

}

module.exports = ExprOperator;
