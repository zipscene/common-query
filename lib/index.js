// Export classes
exports.QueryFactory = require('./query-factory');
exports.Query = require('./query');
exports.QueryOperator = require('./query-operator');
exports.ExprOperator = require('./expr-operator');
exports.coreQueryOperators = require('./core-query-operators');
exports.coreExprOperators = require('./core-expr-operators');
exports.QueryValidationError = require('./query-validation-error');

// Export default query factory and helpers
let QueryFactory = require('./query-factory');
let defaultQueryFactory = new QueryFactory();
exports.defaultQueryFactory = defaultQueryFactory;
function defaultCreateQuery(queryData) {
	return defaultQueryFactory.createQuery(queryData);
}
exports.createQuery = defaultCreateQuery;

