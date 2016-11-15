// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

// Import internal modules
let query = require('./query');
let update = require('./update');
let aggregate = require('./aggregate');

// Reexport Query classes
exports.query = query;
exports.Query = query.Query;
exports.QueryFactory = query.QueryFactory;
exports.QueryValidationError = query.QueryValidationError;
exports.QueryOperator = query.QueryOperator;
exports.ExprOperator = query.ExprOperator;
exports.coreQueryOperators = query.coreQueryOperators;
exports.coreExprOperators = query.coreExprOperators;

// Reexport Update classes
exports.update = update;
exports.Update = update.Update;
exports.UpdateFactory = update.UpdateFactory;
exports.UpdateValidationError = update.UpdateValidationError;
exports.UpdateOperator = update.UpdateOperator;
exports.coreUpdateOperators = update.coreUpdateOperators;

// Reexprot Aggregate classes
exports.aggregate = aggregate;
exports.Aggregate = aggregate.Aggregate;
exports.AggregateFactory = aggregate.AggregateFactory;
exports.AggregateValidationError = aggregate.AggregateValidationError;
exports.coreAggregateTypes = aggregate.coreAggregateTypes;
exports.coreAggregateGroupByTypes = aggregate.coreAggregateGroupByTypes;

// Export default query factory and helpers
let defaultQueryFactory = new query.QueryFactory();
exports.defaultQueryFactory = defaultQueryFactory;
function defaultCreateQuery(queryData, options) {
	return defaultQueryFactory.createQuery(queryData, options);
}
exports.createQuery = defaultCreateQuery;

// Export default update factory and helpers
let defaultUpdateFactory = new update.UpdateFactory();
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
