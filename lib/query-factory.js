let Query = require('./query');
let _ = require('lodash');

/**
 * Main entry point for common query.  This class is responsible for creating Query objects
 * that encapsulate and execute common queries.  This class also maintains the set of
 * operators that can be used in queries, and provides methods for registering new
 * operators.
 *
 * @class QueryFactory
 * @constructor
 */
class QueryFactory {

	constructor() {
		// Map from query operator name (eg. "$and") to query operator object
		this._queryOperators = {};
		// Map from expression operator name (eg. "$neq") to expression operator object
		this._exprOperators = {};

		// Load operators
		this._loadQueryOperators(require('./core-query-operators'));
		this._loadExprOperators(require('./core-expr-operators'));
		this._loadExprOperators(require('./geo-expr-operators'));
	}

	_loadQueryOperators(constructors) {
		for (let Constructor of _.values(constructors)) {
			let operator = new Constructor();
			this.registerQueryOperator(operator.getName(), operator);
		}
	}

	_loadExprOperators(constructors) {
		for (let Constructor of _.values(constructors)) {
			let operator = new Constructor();
			this.registerExprOperator(operator.getName(), operator);
		}
	}

	/**
	 * Creates a query object given a query specification (ie, the raw query).
	 *
	 * @method createQuery
	 * @param {Object} queryData - The raw query
	 * @param {Object} [options] - Options to pass to the query constructor
	 * @param {Object} [options.skipValidate] - If set, the query will not be validated during construction. You can
	 *   still call validate() later. Note that calling matches() with an invalid query results in undefined behavior.
	 * @param {String} [options.fieldPrefix] - If this is a subquery, the path to the parent field.
	 * @param {String} [options.vars] - If this query contains $var statements, this is a map
	 *   of $var values to their substitutions.
	 * @return {Query}
	 */
	createQuery(queryData, options) {
		return new Query(queryData, this, options);
	}

	/**
	 * Registers a new, custom query operator.
	 *
	 * @method registerQueryOperator
	 * @param {String} name - Query operator name, eg, "$and"
	 * @param {QueryOperator} queryOperator
	 */
	registerQueryOperator(name, queryOperator) {
		this._queryOperators[name] = queryOperator;
	}

	/**
	 * Fetches a query operator object by name.
	 *
	 * @method getQueryOperator
	 * @param {String} name - Query operator name, including the $
	 * @return {QueryOperator} - QueryOperator object, or undefined
	 */
	getQueryOperator(name) {
		return this._queryOperators[name];
	}

	/**
	 * Registers a new, custom expression operator.
	 *
	 * @method registerExprOperator
	 * @param {String} name - Expression operator name, including the $
	 * @param {ExprOperator} exprOperator
	 */
	registerExprOperator(name, exprOperator) {
		this._exprOperators[name] = exprOperator;
	}

	/**
	 * Fetches an expression operator object by name.
	 *
	 * @method getExprOperator
	 * @param {String} name - Expression operator name, including the $
	 * @return {ExprOperator} - ExprOperator object, or undefined
	 */
	getExprOperator(name) {
		return this._exprOperators[name];
	}

}

module.exports = QueryFactory;
