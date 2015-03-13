/**
 * Class that traverses a common query and calls a method for each node
 * in the query.  To use this class, extend it, and override the relevant
 * methods.  This approach is used instead of an EventEmitter for efficiency.
 *
 * @class QueryParser
 * @constructor
 */
class QueryParser {

	constructor() {
	}

	/**
	 * Initiates the query parsing process and triggers calling the
	 * relevant functions.
	 *
	 * @method parseQuery
	 * @param {Object} query - The query to parse
	 */
	parseQuery(query) {
		this._handleQuery(query);
	}

	/**
	 * Handles parsing a query node.  This is called immediately upon calling
	 * parseQuery(), and for each query node inside the query (such as subqueries
	 * in $and, $or clauses.
	 *
	 * @method _handleQuery
	 * @param {Object} query - The query node
	 */
	_handleQuery(query) {
		for (let key in query) {
			if (key[0] === '$') {
				this._handleQueryOperator(key, query[key], query);
			} else {

			}
		}
	}

	_handleQueryOperator(operator, value, parentQuery) {

	}

}

module.exports = QueryParser;
