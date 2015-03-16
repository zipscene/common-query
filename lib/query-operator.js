/*eslint no-unused-vars:0*/

let XError = require('xerror');
let QueryValidationError = require('./query-validation-error');

/**
 * Represents a single query-level operator.  A query operator is an operator inside a
 * common query that is present as a key on the query level.  Examples of such operators
 * include "$and" and "$or".
 *
 * This class should not be directly instantiated.  Instead, it should be subclassed and
 * have its relevant methods overridden.
 *
 * @class QueryOperator
 * @constructor
 * @param {String} name - Operator name, such as "$and"
 */
class QueryOperator {

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
	 * Determines the fields that are accessed by subcomponents of a query operator.
	 * The default implementation of this is to treat the operator value as an array,
	 * and each element in the array as a subquery.  This implementation works for
	 * compound query operators such as $and, $or .
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} fieldSet - A set (ie, a mapping from strings to true) of all
	 * fields accessed by the query.  This function should add relevant values to
	 * the set.
	 * @param {Mixed} operatorValue - The value associated with the operator key.  For
	 * example, in the case of a $and operator, the operatorValue would be the array of
	 * subqueries.
	 * @param {String} operator - The string key of the operator, such as "$and".
	 * @param {Query} query - The Query object containing the query this operator is
	 * present on.
	 */
	getQueriedFields(fieldSet, operatorValue, operator, query) {
	}

	/**
	 * Transforms the field names of each queried fields according to the given transform
	 * function.  The default implementation is suitable for query operators such as $and
	 * and $or.  This function should transform fields in-place.
	 *
	 * @method transformQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Function} transformFn - Function to transform field names.  It should
	 * return the transformed field name.
	 * @param {String} transformFn.fieldName - Name of field to transform.
	 * @param {Mixed} operatorValue - Value of the query operator.
	 * @param {String} operator - Operator key, such as "$and".
	 * @param {Query} query - The root Query object.
	 */
	transformQueriedFields(transformFn, operatorValue, operator, query) {
	}

	/**
	 * Determines a set of exactly matched fields inside of a query operator.  An exact
	 * match is a field which may only match a single non-null scalar value.  Any such
	 * fields should be added to the exactMatches object, which is a mapping from field
	 * names to their exact match value.  If there is a conflict, or a field which will
	 * never match any values (such as: `{ $and [ { foo: 'bar' }, { foo: 'baz' } ] }` )
	 * you may set the field to null.
	 *
	 * @method getExactMatches
	 * @throws {XError} - Validation error
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Query} query
	 * @return {Boolean} This function should return true iff the components of the query
	 * operator may be entirely represented by exact matches.  Otherwise, it should return
	 * false (but the exactly matched fields should still be added to exactMatches).
	 */
	getExactMatches(exactMatches, operatorValue, operator, query) {

	}

	/**
	 * Should add all operators used as subcomponents of this query operator to the set
	 * operatorSet.
	 *
	 * @method getOperators
	 * @throws {XError} - Validation error
	 * @param {Object} operatorSet - A mapping from string operator keys such as "$and" to
	 * boolean `true` .
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Query} query
	 */
	getOperators(operatorSet, operatorValue, operator, query) {

	}

	/**
	 * Called when traversing the query tree.  This should traverse down any additional
	 * paths and call handlers on relevant values.  If this operator does not encapsulate
	 * any other queries or operators, there's no need to fill in this function.
	 *
	 * The default implementation for query operators is to treat it as an array of
	 * subqueries, which is suitable for $and, $or .
	 *
	 * @method traverse
	 * @throws {XError} - Validation error
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Query} query
	 * @param {Object} handlers - Handlers for the traversing, as passed to Query.traverse
	 */
	traverse(operatorValue, operator, query, handlers) {
		if (Array.isArray(operatorValue)) {
			for (let subquery of operatorValue) {
				query._traverseSubquery(subquery, handlers);
			}
		}
	}

	/**
	 * Should validate the query operator.  Throw an exception if the query is invalid.  This
	 * does not need to recursively call validate on subcomponents if traverse() will visit
	 * those subcomponents.
	 *
	 * @method validate
	 * @throws {XError} - Validation error
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Query} query
	 */
	validate(operatorValue, operator, query) {
		// Default operation is to validate query operators like $and, $or, $nor
		if (!Array.isArray(operatorValue)) {
			throw new QueryValidationError('Argument to ' + operator + ' must be an array');
		}
	}

	/**
	 * Determined whether a query operator matches a value.  The value in this case is the
	 * value the whole query is matched against, because query operators apply on a whole-query
	 * basis.
	 *
	 * @method matches
	 * @throws {XError} - Validation error
	 * @param {Mixed} value - Value to match against.
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Query} query
	 * @return {Boolean} - Whether or not the value matches the query operator
	 */
	matches(value, operatorValue, operator, query) {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

}

module.exports = QueryOperator;
