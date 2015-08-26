// Import internal modules
let aggregate = require('./aggregate');

// Export classes
exports.QueryFactory = require('./query-factory');
exports.Query = require('./query');
exports.QueryOperator = require('./query-operator');
exports.ExprOperator = require('./expr-operator');
exports.UpdateFactory = require('./update-factory');
exports.Update = require('./update');
exports.UpdateOperator = require('./update-operator');
exports.aggregate = aggregate;
exports.Aggregate = aggregate.Aggregate;
exports.AggregateFactory = aggregate.AggregateFactory;

// Reexport extendable subtypes
exports.coreQueryOperators = require('./core-query-operators');
exports.coreExprOperators = require('./core-expr-operators');
exports.coreUpdateOperators = require('./core-update-operators');
exports.coreAggregateTypes = aggregate.coreAggregateTypes;
exports.coreAggregateGroupByTypes = aggregate.coreAggregateGroupByTypes;

// Reexport errors types
exports.QueryValidationError = require('./query-validation-error');
exports.UpdateValidationError = require('./update-validation-error');
exports.AggregateValidationError = aggregate.AggregateValidationError;

// Export default query factory and helpers
let QueryFactory = require('./query-factory');
let defaultQueryFactory = new QueryFactory();
exports.defaultQueryFactory = defaultQueryFactory;
function defaultCreateQuery(queryData, options) {
	return defaultQueryFactory.createQuery(queryData, options);
}
exports.createQuery = defaultCreateQuery;

// Ditto for updates
let UpdateFactory = require('./update-factory');
let defaultUpdateFactory = new UpdateFactory();
exports.defaultUpdateFactory = defaultUpdateFactory;
function defaultCreateUpdate(updateData, options) {
	return defaultUpdateFactory.createUpdate(updateData, options);
}
exports.createUpdate = defaultCreateUpdate;

// Export default aggregate factory and helper creator
let defaultAggregateFactory = new aggregate.AggregateFactory();
exports.defaultAggregateFactory = defaultAggregateFactory;
function defaultCreateAggregate(aggregateData, options) {
	return defaultAggregateFactory.createAggregate(aggregateData, options);
}
exports.createAggregate = defaultCreateAggregate;
