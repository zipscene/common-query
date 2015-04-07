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
	 * @method getName
	 * @return {String}
	 */
	getName() {
		return this._name;
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
	 * @param {Object} options
	 * @param {Query} query
	 * @return {Boolean} - Whether or not the value matches the query operator
	 */
	matches(value, operatorValue, operator, options, query) {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

}

module.exports = QueryOperator;
