// Export classes
exports.QueryFactory = require('./query-factory');
exports.Query = require('./query');
exports.QueryOperator = require('./query-operator');
exports.ExprOperator = require('./expr-operator');
exports.UpdateFactory = require('./update-factory');
exports.Update = require('./update');
exports.UpdateOperator = require('./update-operator');

exports.coreQueryOperators = require('./core-query-operators');
exports.coreExprOperators = require('./core-expr-operators');
exports.corUpdateOperators = require('./core-update-operators');

exports.QueryValidationError = require('./query-validation-error');

// Export default query factory and helpers
let QueryFactory = require('./query-factory');
let defaultQueryFactory = new QueryFactory();
exports.defaultQueryFactory = defaultQueryFactory;
function defaultCreateQuery(queryData) {
	return defaultQueryFactory.createQuery(queryData);
}
exports.createQuery = defaultCreateQuery;

// Ditto for updates
let UpdateFactory = require('./update-factory');
let defaultUpdateFactory = new UpdateFactory();
exports.defaultUpdateFactory = defaultUpdateFactory;
function defaultCreateUpdate(updateData) {
	return defaultUpdateFactory.createUpdate(updateData);
}
exports.createUpdate = defaultCreateUpdate;
