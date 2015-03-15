let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');
let objtools = require('zs-objtools');

/**
 * Encapsulates a common query and provides methods for utilizing and manipulating it.
 * Common queries are mongo-like queries that are largely compatible with mongodb
 * queries.
 *
 * This class should not be instantiated directly.  Instead, use QueryFactory.
 *
 * @class Query
 * @constructor
 * @param {Object} queryData - Raw object containing the query.
 * @param {QueryFactory} queryFactory - QueryFactory that created this query.
 */
class Query {

	constructor(queryData, queryFactory) {
		this._queryData = queryData;
		this._queryFactory = queryFactory;
	}

	/**
	 * Returns the query data this class encapsulates.
	 *
	 * @method getData
	 * @return {Object}
	 */
	getData() {
		return this._queryData;
	}

	/**
	 * Returns the query factory that created this query.
	 *
	 * @method getQueryFactory
	 * @return {QueryFactory}
	 */
	getQueryFactory() {
		return this._queryFactory;
	}

	/**
	 * Returns whether or not the query matches a given value.
	 *
	 * @method matches
	 * @throws {XError} - Validation error
	 * @param {Object} value - The value to match against
	 * @return {Boolean} - Whether or not the query matches
	 */
	matches(value) {
		let query = this._queryData;
		let queryOperators = this._queryFactory._queryOperators;
		let exprOperators = this._queryFactory._exprOperators;
		if (!_.isPlainObject(query)) throw new QueryValidationError('Query must be a plain object');
		for (let key in query) {
			let exprValue = query[key];
			if (exprValue === undefined) continue;
			if (key[0] === '$') {
				// This key is a query operator or expression operator
				let queryOperator = queryOperators[key];
				if (queryOperator) {
					if (!queryOperator.matches(value, exprValue, key, this)) {
						return false;
					}
				} else {
					let exprOperator = exprOperators[key];
					if (exprOperator) {
						if (!exprOperator.matches(value, exprValue, key, query, this)) {
							return false;
						}
					} else {
						throw new QueryValidationError('Unrecognized query operator: ' + key);
					}
				}
			} else {
				// This key is a field name
				let fieldValue = objtools.getPath(value, key);
				if (!this._expressionValueMatches(fieldValue, exprValue)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Checks to see if an operator expression or value exact match matches a value.
	 *
	 * @method _expressionValueMatches
	 * @private
	 * @throws {XError} - Validation error
	 * @param {Mixed} fieldValue - Value to match against
	 * @param {Mixed} exprValue - Operator expression, or exact match value
	 * @return {Boolean} - Whether or not the operator expression matches the value
	 */
	_expressionValueMatches(fieldValue, exprValue) {
		if (isOperatorExpression(exprValue)) {
			// Query expression is a set of expression operators
			return this._operatorExpressionMatches(fieldValue, exprValue);
		} else {
			// Query expression is an exact match
			if (exprValue === null) {
				// as per mongodb behavior
				return fieldValue === null || fieldValue === undefined;
			} else if (!objtools.deepEquals(fieldValue, exprValue)) {
				return false;
			}
			return true;
		}
	}

	/**
	 * Checks to see if an operator expression matches a value.
	 *
	 * @method _operatorExpressionMatches
	 * @private
	 * @throws {XError} - Validation error
	 * @param {Mixed} fieldValue - Value to match against
	 * @param {Mixed} exprValue - Operator expression, or exact match value
	 * @return {Boolean} - Whether or not the operator expression matches the value
	 */
	_operatorExpressionMatches(fieldValue, exprValue) {
		let exprOperators = this._queryFactory._exprOperators;
		for (let exprOperatorKey in exprValue) {
			let operatorValue = exprValue[exprOperatorKey];
			if (operatorValue === undefined) continue;
			let exprOperator = exprOperators[exprOperatorKey];
			if (!exprOperator.matches(fieldValue, operatorValue, exprOperatorKey, exprValue, this)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Returns a function that takes a value as a parameter and matches the query
	 * against the given value.  Right now, there is no real difference between using
	 * this and just calling match() on each value, but in the future, this may return
	 * a precompiled function that is able to do much faster matching.
	 *
	 * @method createMatchingFn
	 * @return {Function} - Function in the form function(value) which returns a boolean.
	 */
	createMatchingFn() {
		return value => this.matches(value);
	}

	/**
	 * Validates that the encapsulated query is correct.
	 *
	 * @method validate
	 * @throws {XError} - Validation error
	 * @return {Boolean} - true
	 */
	validate() {

	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the query accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields() {

	}

	/**
	 * Adds queried fields to the given fieldSet.
	 *
	 * @method _getQueriedFields
	 * @private
	 * @throws {XError} - Validation error
	 * @param {Object} fieldSet - Map from string field name to boolean true.
	 */
	_getQueriedFields(fieldSet) {

	}

	/**
	 * Transforms queried fields according to a given transformation function.  Changes
	 * are made in-place.
	 *
	 * @method transformQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Function} transformFn - Function that takes a field name and returns a
	 * transformed field name.
	 * @param {String} transformFn.name - Field name
	 */
	transformQueriedFields(transformFn) {

	}

	/**
	 * Returns information on exactly matched fields in the query.  Exactly matched fields
	 * are fields that must match a single, exact, scalar, non-null value for the query
	 * to match.  This function also returns a boolean that indicates whether there are
	 * any fields in the query that are not exact matches.
	 *
	 * @method getExactMatches
	 * @throws {XError} - Validation error
	 * @return {Object} - Object in the form: `{ exactMatches: {...}, onlyExactMatches: true|false }`
	 */
	getExactMatches() {

	}

	/**
	 * Adds exact matches to the given map.
	 *
	 * @method _getExactMatches
	 * @private
	 * @throws {XError} - Validation error
	 * @param {Object} exactMatches - Map from fields to values.  Values may be null, indicating
	 * that the field has no valid matching value at that the query will never match.
	 * @return {Boolean} - True if only exactly matching fields are present in the query.
	 */
	_getExactMatches(exactMatches) {

	}

	/**
	 * Returns a list of all operators used in the query.
	 *
	 * @method getOperators
	 * @throws {XError} - Validation error
	 * @return {String[]} - Array of all operators, such as `[ "$and", "$in" ]`
	 */
	getOperators() {

	}

	/**
	 * Adds all used operators to the operatorSet.
	 *
	 * @method _getOperators
	 * @private
	 * @throws {XError} - Validation error
	 * @param {Object} operatorSet - Map from operator string to true
	 */
	_getOperators(operatorSet) {

	}

	/**
	 * Substitutes $var expressions in the query with their corresponding values
	 * given as the parameter.  Substitution is done in-place.
	 *
	 * @method substituteVars
	 * @throws {XError} - Validation error, or missing var error
	 * @param {Object} vars - Mapping from variable names to values
	 * @param {Boolean} ignoreMissing - If set to true, exceptions are not thrown if
	 * a missing var name is encountered.
	 */
	substituteVars(vars, ignoreMissing) {

	}

}

module.exports = Query;

/**
 * Helper function to determine if a given expression is an operator expression in the
 * form { $gt: 12, $lt: 15 } or is an exact match.
 *
 * @param {Mixed} expr
 * @throws {XError} - Throws if expression is a mix of operators and non-operators
 * @return {Boolean} - True if expression contains operators
 */
function isOperatorExpression(expr) {
	let hasOperators = false;
	let hasNonOperators = false;
	for (let key in expr) {
		if (key[0] === '$') {
			hasOperators = true;
		} else {
			hasNonOperators = true;
		}
	}
	if (hasOperators && hasNonOperators) {
		throw new QueryValidationError('Expressions may not contain a mix of operators and non-operators');
	}
	return hasOperators;
}
