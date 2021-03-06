// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/* eslint-disable spaced-comment */

const QueryValidationError = require('./query-validation-error');
const MissingQueryVarError = require('./missing-query-var-error');
const ObjectMatchError = require('../object-match-error');
const _ = require('lodash');
const objtools = require('objtools');

/**
 * Encapsulates a common query and provides methods for utilizing and manipulating it.
 * Common queries are mongo-like queries that are largely compatible with mongodb
 * queries.
 *
 * This class should not be instantiated directly.  Instead, use QueryFactory.
 *
 * @class Query
 * @constructor
 * @throws {XError} - If update is invalid
 * @param {Object|Query} queryData - Object containing the query.
 * @param {QueryFactory} queryFactory - QueryFactory that created this query.
 * @param {Object} [options]
 * @param {Object} [options.skipValidate] - If set, the query will not be validated or normalized during construction.
 *   You can still call validate() later. Note that calling matches() with an invalid query results in undefined
 *   behavior.
 * @param {String} [options.fieldPrefix] - If this is a subquery, the path to the parent field.
 * @param {String} [options.vars] - If this query contains $var statements, this is a map
 *   of $var values to their substitutions.
 */
class Query {

	constructor(queryData, queryFactory, options = {}) {
		if (typeof queryData.getData === 'function') queryData = objtools.deepCopy(queryData.getData());

		this._queryData = queryData;
		this._queryFactory = queryFactory;
		this._fieldPrefix = options.fieldPrefix;
		// Various properties set while matching an object, such as distance from a $near operator
		this._matchProperties = {};

		if (options.vars) this._substituteVars(options.vars);
		if (!options.skipValidate) {
			this.normalize(options);
		}
	}

	/**
	 * Gets the subschema of a CommonSchema schema that corresponds to a path in a query.
	 * This will handle query paths that match arrays.
	 * Without a schema, these matches can match multiple
	 * actual fields (handled in _expressionMatchesPath below).  A schema can be used to
	 * mostly resolve these issues.
	 *
	 * This has the following known caveats:
	 * 1. Directly nested arrays may not always be correctly handled in some cases.  This
	 * is due to greedily matching arrays as they are encountered.
	 * 2. Objects that have numeric keys may not always be handled as expected.  Numeric keys
	 * are expected to be defined indices into arrays when they can correspond to arrays in
	 * schemas.
	 *
	 * To make sure you don't run into these caveats, avoid directly nested arrays, and don't
	 * use numeric strings as object keys for non-arrays.
	 *
	 * @method _getQueryPathSubschema
	 * @static
	 * @throws {ObjectMatchError} - If the path doesn't correspond to a valid path in the schema.
	 * @throws {SchemaError}
	 * @param {Schema} schema - The CommonSchema instance on the schema.
	 * @param {String} path - The path to search for.
	 * @param {Object} options - The path to search for.
	 *   @param {Boolean} options.allowUnknownFields - Whether to allow fields not in the schema.
	 * @return {Array} - Returns [ subschema, resultPath ]
	 * where resultPath is the same as the input `path` parameter but with
	 * additional `$` keys added for implied arrays, and subschema is the subschema corresponding
	 * to the path.
	 */
	static getQueryPathSubschema(schema, path, options) {
		// Edge case with root path
		if (path === '') {
			return [ schema.getData(), '' ];
		}
		return Query._getQueryPathSubschemaHelper(schema.getData(), path.split('.'), 0, '', schema, options);
	}

	static _getQueryPathSubschemaHelper(subschema, pathArray, pathIdx, resultPath, schema, options = {}) {
		let pathComponent = pathArray[pathIdx];
		if (!subschema && !options.allowUnknownFields) {
			throw new ObjectMatchError('Field does not correspond to a field in the schema', { path: resultPath });
		} else if (pathIdx >= pathArray.length) {
			return [ subschema, resultPath ];
		} else if (subschema.type === 'array') {
			if (isNaN(pathComponent) && pathComponent !== '$') {
				// Implied array
				return Query._getQueryPathSubschemaHelper(
					subschema.elements,
					pathArray,
					pathIdx,
					(resultPath) ? `${resultPath}.$` : '$',
					schema,
					options
				);
			} else {
				// Explicit array index
				return Query._getQueryPathSubschemaHelper(
					subschema.elements,
					pathArray,
					pathIdx + 1,
					(resultPath) ? `${resultPath}.${pathComponent}` : pathComponent,
					schema,
					options
				);
			}
		} else {
			let fieldSubschema = schema
				.getSchemaType(subschema)
				.getFieldSubschema(subschema, pathComponent, schema);
			return Query._getQueryPathSubschemaHelper(
				fieldSubschema,
				pathArray,
				pathIdx + 1,
				(resultPath) ? `${resultPath}.${pathComponent}` : pathComponent,
				schema,
				options
			);
		}
	}

	/**
	 * Normalize a value at one place in a query.
	 *
	 * @method _normalizeValue
	 * @throws {QueryValidationError} - An error if the field is invalid according to the schema.
	 * @param {String} field - Path to the field, as in the query.
	 * @param {Mixed} value - Value to normalize.
	 * @param {Object} options - This can contain the below options in addition to all options
	 *   accepted by Schema#normalize .
	 *   @param {Schema} options.schema - Schema to normalize against
	 * @return {Mixed} - Normalized value.
	 */
	static _normalizeValue(field, value, options = {}) {
		if (options.schema && value !== null && value !== undefined) {
			let subschemaData, fullPath;
			let queryPathOptions = { allowUnknownFields: options.allowUnknownFields };
			try {
				[ subschemaData, fullPath ] = Query.getQueryPathSubschema(options.schema, field, queryPathOptions);
			} catch (err) {
				throw new QueryValidationError(`Invalid query at field ${field}`, { field }, err);
			}

			if (subschemaData && subschemaData.type === 'array') {
				subschemaData = subschemaData.elements;
			}
			let subschema = options.schema._createSubschema(subschemaData);
			let result;
			try {
				result = subschema.normalize(value, options);
			} catch (ex) {
				throw new QueryValidationError(`Invalid value at query path: ${fullPath}`, ex);
			}
			return result;
		} else {
			return value;
		}
	}

	/**
	 * Replaces the '$' array placeholder component with a given replacement value.
	 *
	 * @method replaceArrayPlaceholderComponent
	 * @static
	 * @param {String} path - Path to a field (ex, 'foo.$.bar')
	 * @param {String} replacement - Replacement toke (ex, '_')
	 * @return {String} - Replaced path (ex, 'foo._.bar')
	 */
	static replaceArrayPlaceholderComponent(path, replacement) {
		return _(path.split('.'))
			.map((component) => (component === '$') ? replacement : component)
			.join('.');
	}

	/**
	 * Helper function to determine if a given expression is an operator expression in the
	 * form { $gt: 12, $lt: 15 } or is an exact match.
	 *
	 * @method isOperatorExpression
	 * @static
	 * @param {Mixed} expr
	 * @throws {XError} - Throws if expression is a mix of operators and non-operators
	 * @return {Boolean} - True if expression contains operators
	 */
	static isOperatorExpression(expr) {
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

	/**
	 * Helper function to determines if the expression is a variable substitution expression
	 * (for substituting a scalar value) in the form of { $var: "VARNAME" }
	 *
	 * @method isVarExpression
	 * @static
	 * @param {Mixed} expr
	 * @return {Boolean} True if expression is a variable subsitution expression
	 */
	static isVarExpression(expr) {
		return !!(
			expr &&
			objtools.isPlainObject(expr) &&
			Object.keys(expr).length === 1 &&
			typeof expr.$var === 'string'
		);
	}

	/**
	 * Normalize this query and the values it contains.
	 * This currently does nothing unless a schema is provided.
	 *
	 * @method normalize
	 * @throws {QueryValidationError} - If a query value cannot be normalized.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(options = {}) {
		let queryOperators = this._queryFactory._queryOperators;
		let exprOperators = this._queryFactory._exprOperators;

		this._traverse({
			queryOperator(exprValue, operator, query, parent, parentKey) {
				let queryOperator = queryOperators[operator];

				if (!queryOperator) {
					throw new QueryValidationError(`Unrecognized query operator: ${operator}`);
				}

				queryOperator.normalize(exprValue, operator, options, query, parent, parentKey);
				queryOperator.validate(parent[parentKey], operator, query);
			},
			/* eslint-disable max-params */
			exprOperator(exprValue, field, operator, expr, query, parent, parentKey) {
				/* eslint-enable max-params */
				let exprOperator = exprOperators[operator];

				if (!exprOperator) {
					throw new QueryValidationError(`Unrecognized expression operator: ${operator}`);
				}

				exprOperator.normalize(exprValue, field, operator, expr, options, query, parent, parentKey);
			},
			exactMatch(value, field, parent, parentKey) {
				parent[parentKey] = Query._normalizeValue(field, value, options);
			}
		});
	}

	/**
	 * Condense the query, removing unnecessary ANDs, ORs, and NORs.
	 *
	 * @method condense
	 */
	condense() {
		function traverse(value, operator, parent, parentKey, grandParent) {
			// replace contradictions
			if (isContradiction(parent)) {
				for (let key in parent) { delete parent[key]; }
				parent.$nor = [ {} ];
				return;
			}

			// replace tautologies
			if (isTautology(parent)) {
				for (let key in parent) { delete parent[key]; }
				return;
			}

			// strip contradictions from disjunctions
			if ((operator === '$or' || operator === '$nor') && _.some(value, isContradiction)) {
				let newValue = [];
				for (let elem of value) {
					if (!isContradiction(elem)) newValue.push(elem);
				}
				parent[operator] = newValue;
			}

			// strip tautologies from conjunctions
			if (operator === '$and' && _.some(value, isTautology)) {
				let newValue = [];
				for (let elem of value) {
					if (!isTautology(elem)) newValue.push(elem);
				}
				parent[operator] = newValue;
			}

			if (value && typeof value === 'object') {
				for (let key in value) {
					traverse(value[key], key, value, operator, parent);
				}
			}

			if (typeof operator !== 'string' || operator[0] !== '$') return;

			let combinedKeys = [];
			let combinedClauses = [];

			// Delete empty clauses
			if (_.includes([ '$and', '$nor' ], operator) && value.length === 0) {
				delete parent[operator];
				if (objtools.isEmptyObject(parent)) {
					if (_.isArray(grandParent)) _.pullAt(grandParent, parentKey);
					if (objtools.isPlainObject(grandParent)) delete grandParent[parentKey];
				}
			}

			// Combine single-element clauses
			if (_.includes([ '$and', '$or' ], operator) && value.length === 1) {
				let clause = parent[operator][0];

				// Handle nested $and clauses
				if (operator === '$and' && _.size(_.keys(clause)) === 1 && clause.$and) {
					parent.$and = clause.$and;
					if (parent.$and.length > 1) return;
					clause = parent.$and[0];
				}

				for (let key in clause) {
					if (parent[key]) {
						combinedKeys.push(key);
						combinedClauses.push({ [key]: parent[key] });
						delete parent[key];
					}

					if (_.includes(combinedKeys, key)) {
						combinedClauses.push({ [key]: clause[key] });
						continue;
					}

					parent[key] = clause[key];
				}

				delete parent[operator];
				if (objtools.isEmptyObject(parent)) {
					if (_.isArray(grandParent)) _.pullAt(grandParent, parentKey);
					if (objtools.isPlainObject(grandParent)) delete grandParent[parentKey];
				}
			}

			if (combinedClauses.length) {
				if (!_.isArray(parent.$and)) parent.$and = [];
				parent.$and = parent.$and.concat(combinedClauses);
			}
		}

		traverse(this.getData());
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
	 * Set a match property during a match.
	 *
	 * @method setMatchProperty
	 * @protected
	 * @param {String} name
	 * @param {Mixed} value
	 */
	setMatchProperty(name, value) {
		this._matchProperties[name] = value;
	}

	/**
	 * Gets a match property.  A match property is a value that is generated
	 * during the matching process that pertains to the document being matched.  An example
	 * is the 'distance' property generated by $near, and is useful for sorting by distance.
	 * Returned properties always pertain to the most recent match performed.
	 *
	 * @method getMatchProperty
	 * @param {String} name - Name of match property to fetch
	 * @return {Mixed}
	 */
	getMatchProperty(name) {
		return this._matchProperties[name];
	}

	/**
	 * Merges the match properties of otherQuery with the match properties of this query,
	 * overwriting any properties that conflict.
	 *
	 * @method _mergeMatchProperties
	 * @private
	 * @param {Query} otherQuery
	 */
	_mergeMatchProperties(otherQuery) {
		for (let key in otherQuery._matchProperties) {
			this._matchProperties[key] = otherQuery._matchProperties[key];
		}
	}

	/**
	 * Validates that the encapsulated query is correct.
	 *
	 * @method validate
	 * @throws {XError} - Validation error
	 * @return {Boolean} - true
	 */
	validate() {
		this._traverse({
			queryOperator(exprValue, operator, query) {
				this.validate(exprValue, operator, query);
			},
			exprOperator(exprValue, field, operator, expr, query) {
				this.validate(exprValue, operator, expr, query);
			}
		});
		return true;
	}

	/**
	 * Checks whether a query expression on a path matches a value.  This takes into account
	 * arrays in the value to match against.  For example, the query
	 * `{ 'foo.bar': 3 }` matches the object `{ foo: [ { bar: 3 } ] }`.  The query
	 * `{ 'foo.0.bar': 3 }` also matches the same object.
	 *
	 * @method _expressionMatchesPath
	 * @private
	 * @param {Mixed} matchValue - The value to match against (usually an object).
	 * @param {Mixed} exprValue - The operand to the query expression.
	 * @param {String[]} pathArray - The path the query expression is operating on, expressed as
	 * an array of string path components.
	 * @param {Object} options
	 * @param {Number} pathComponentStartIdx - The current path component to evaluate.  Only used
	 * internally when called recursively.
	 * @return {Boolean} - Whether or not the expression matches.
	 */
	_expressionMatchesPath(matchValue, exprValue, pathArray, options = {}, pathComponentStartIdx = 0) {
		// The current parent to check against
		let currentParent = matchValue;
		// Iterate through each of the path components, checking if any parents are arrays
		for (let parentIdx = pathComponentStartIdx; parentIdx <= pathArray.length; parentIdx++) {
			if (Array.isArray(currentParent)) {
				// This parent object is an array
				// First, check if any of of the array components match the remaining path
				for (let elem of currentParent) {
					// This is inside a try/catch because, in some cases (such as a $near match
					// [ long, lat ]) arrays are misinterpreted here and result in exceptions.
					// These types of exceptions are treated as non-matches here.
					try {
						if (this._expressionMatchesPath(elem, exprValue, pathArray, options, parentIdx)) {
							return true;
						}
					} catch (ex) {
						if (!(ex instanceof ObjectMatchError)) {
							throw ex;
						}
					}
				}
			}
			// Update the current parent
			if (!objtools.isScalar(currentParent) && parentIdx < pathArray.length) {
				// The parent object is an object
				currentParent = currentParent[pathArray[parentIdx]];
			} else if (parentIdx < pathArray.length) {
				currentParent = undefined;
				break;
			}
		}
		// This is inside a try/catch because, in some cases (such as a $all match)
		// arrays are misinterpreted here and result in an ObjectMatchError exception.
		// These types of exceptions are treated as non-matches here.
		try {
			// currentParent is now the exact value the path points to
			if (this._expressionValueMatches(currentParent, exprValue, options)) {
				return true;
			}
		} catch (ex) {
			if (!(ex instanceof ObjectMatchError)) {
				throw ex;
			}
		}
		return false;
	}

	/**
	 * Returns whether or not the query matches a given value.
	 *
	 * @method matches
	 * @throws {XError} - Validation error
	 * @param {Object} value - The value to match against
	 * @param {Object} [options] - Currently unused, but is passed through to each of the relevant
	 *   match methods, in case it's needed by user-defined matches.
	 * @return {Boolean} - Whether or not the query matches
	 */
	matches(value, options = {}) {
		this._matchProperties = {};
		let query = this._queryData;
		let queryOperators = this._queryFactory._queryOperators;
		let exprOperators = this._queryFactory._exprOperators;
		if (!objtools.isPlainObject(query)) throw new QueryValidationError('Query must be a plain object');

		for (let key in query) {
			let exprValue = query[key];
			if (exprValue === undefined) continue;
			if (key[0] === '$') {
				// This key is a query operator or expression operator
				let queryOperator = queryOperators[key];
				if (queryOperator) {
					if (!queryOperator.matches(value, exprValue, key, options, this)) {
						return false;
					}
				} else {
					let exprOperator = exprOperators[key];
					if (exprOperator) {
						if (!exprOperator.matches(value, exprValue, key, query, options, this)) {
							return false;
						}
					} else {
						throw new QueryValidationError(`Unrecognized query operator: ${key}`);
					}
				}
			} else {
				// This key is a field name
				if (!this._expressionMatchesPath(value, exprValue, key.split('.'), options)) {
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
	_expressionValueMatches(fieldValue, exprValue, options = {}) {
		if (Query.isOperatorExpression(exprValue)) {
			// Query expression is a set of expression operators
			return this._operatorExpressionMatches(fieldValue, exprValue, options);
		} else {
			// Query expression is an exact match
			if (exprValue === null && fieldValue === undefined) {
				// as per mongodb behavior
				return true;
			}
			if (Array.isArray(fieldValue)) {
				if (_.some(fieldValue, (elem) => objtools.deepEquals(elem, exprValue))) return true;
			}
			return objtools.deepEquals(fieldValue, exprValue);
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
	_operatorExpressionMatches(fieldValue, exprValue, options = {}) {
		let exprOperators = this._queryFactory._exprOperators;
		for (let exprOperatorKey in exprValue) {
			let operatorValue = exprValue[exprOperatorKey];
			if (operatorValue === undefined) continue;
			let exprOperator = exprOperators[exprOperatorKey];
			if (!exprOperator) {
				throw new QueryValidationError(`Unrecognized expression operator: ${exprOperator}`);
			}
			if (!exprOperator.matches(fieldValue, operatorValue, exprOperatorKey, exprValue, options, this)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Executes a match of a subquery in the context of this query.
	 *
	 * @method _matchSubquery
	 * @private
	 * @param {Mixed} subqueryData - Data to create subquery with
	 * @param {Mixed} value - Value to match against
	 * @param {Object} options
	 * @return {Boolean} - Does it match?
	 */
	_matchSubquery(subqueryData, value, options = {}) {
		let subquery = this._queryFactory.createQuery(subqueryData);
		let doesItMatch = subquery.matches(value, options);
		this._mergeMatchProperties(subquery);
		return doesItMatch;
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
	createMatchingFn(options = {}) {
		return (value) => this.matches(value, options);
	}

	/**
	 * Internal function to traverse a query tree.
	 *
	 * @method _traverse
	 * @private
	 * @param {Object} handlers - Set of handler functions for query entities.  Each of these
	 * is called with a 'this' pointer of the relevant operator.  Any of these functions can
	 * return a boolean 'false' to prevent recursive traversal into the respective entity.
	 *   @param {Function} [handlers.queryOperator=_.noop] - Called for each query operator
	 *     @param {Mixed} handlers.queryOperator.exprValue - Value of the query operator key
	 *     @param {String} handlers.queryOperator.operator - String name of the operator
	 *     @param {Query} handlers.queryOperator.query - This query
	 *     @param {Object} handlers.queryOperator.parent - The object containing the query operator
	 *     @param {String} handlers.queryOperator.parentKey - The key on the parent
	 *   @param {Function} [handlers.exprOperator=_.noop] - Called for each expression operator
	 *     @param {Mixed} handlers.exprOperator.exprValue - Value of the expression operator key
	 *     @param {String} handlers.exprOperator.field - Field expr operator applied to, or null (if at root)
	 *     @param {String} handlers.exprOperator.operator - String name of the operator
	 *     @param {Object} handlers.exprOperator.expr - The containing expression of the expression operator
	 *     @param {Query} handlers.exprOperator.query - This query
	 *     @param {Object} handlers.exprOperator.parent - The object containing this expression operator
	 *     @param {String} handlers.exprOperator.parentKey - The key on the parent
	 *   @param {Function} [handlers.exactMatch=_.noop] - Function called for each exact match (called without a 'this')
	 *     @param {Mixed} handlers.exactMatch.value - Exact match value
	 *     @param {String} handlers.exactMatch.field - Exact match field
	 *     @param {Object} handlers.exactMatch.parent
	 *     @param {String} handlers.exactMatch.parentKey
	 *   @param {Function} [handlers.query=_.noop] - Function that is called for the main query and any subqueries
	 *     @param {Query} handlers.query.query - Query object for query or subquery
	 */
	_traverse(handlers) {
		if (typeof handlers.queryOperator !== 'function') handlers.queryOperator = _.noop;
		if (typeof handlers.exprOperator !== 'function') handlers.exprOperator = _.noop;
		if (typeof handlers.exactMatch !== 'function') handlers.exactMatch = _.noop;
		if (typeof handlers.query !== 'function') handlers.query = _.noop;

		let query = this._queryData;
		let queryOperators = this._queryFactory._queryOperators;
		let exprOperators = this._queryFactory._exprOperators;
		let traverseRet = handlers.query(this);
		if (traverseRet === false) return;
		if (!objtools.isPlainObject(query)) throw new QueryValidationError('Query must be a plain object');
		for (let key in query) {
			let exprValue = query[key];
			if (exprValue === undefined) continue;
			if (key[0] === '$') {
				// This key is a query operator or expression operator
				let queryOperator = queryOperators[key];
				if (queryOperator) {
					let fieldWithPrefix = this._fieldPrefix ? `${this._fieldPrefix}.${key}` : key;
					let traverseRet = handlers.queryOperator.call(
						queryOperator,
						exprValue,
						fieldWithPrefix,
						this,
						query,
						key
					);
					if (traverseRet !== false) {
						queryOperator.traverse(exprValue, fieldWithPrefix, this, handlers);
					}
				} else {
					let exprOperator = exprOperators[key];
					if (exprOperator) {
						let traverseRet = handlers.exprOperator.call(
							exprOperator,
							exprValue,
							null,
							key,
							query,
							this,
							query,
							key
						);
						if (traverseRet !== false) {
							exprOperator.traverse(exprValue, null, key, query, this, handlers);
						}
					} else {
						throw new QueryValidationError(`Unrecognized query operator: ${key}`);
					}
				}
			} else {
				// This key is a field name
				let fieldWithPrefix = this._fieldPrefix ? `${this._fieldPrefix}.${key}` : key;
				this._traverseExpressionValue(exprValue, fieldWithPrefix, query, key, handlers);
			}
		}
	}

	_traverseExpressionValue(exprValue, field, parent, parentKey, handlers) {
		if (Query.isOperatorExpression(exprValue)) {
			// Query expression is a set of expression operators
			this._traverseOperatorExpression(exprValue, field, handlers);
		} else {
			// It's an exact match
			handlers.exactMatch.call(null, exprValue, field, parent, parentKey);
		}
	}

	_traverseOperatorExpression(exprValue, field, handlers) {
		let exprOperators = this._queryFactory._exprOperators;
		for (let exprOperatorKey in exprValue) {
			let operatorValue = exprValue[exprOperatorKey];
			if (operatorValue === undefined) continue;
			let exprOperator = exprOperators[exprOperatorKey];
			if (!exprOperator) {
				throw new QueryValidationError(`Unrecognized expression operator: ${exprOperatorKey}`);
			}
			let traverseRet = handlers.exprOperator.call(
				exprOperator,
				operatorValue,
				field,
				exprOperatorKey,
				exprValue,
				this,
				exprValue,
				exprOperatorKey
			);
			if (traverseRet !== false) {
				exprOperator.traverse(operatorValue, field, exprOperatorKey, exprValue, this, handlers);
			}
		}
	}

	_traverseSubquery(subqueryData, handlers, fieldPrefix) {
		let subquery = this._queryFactory.createQuery(subqueryData);
		subquery._fieldPrefix = fieldPrefix || this._fieldPrefix;
		subquery._traverse(handlers);
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the query accesses.
	 *
	 * If a schema is given, queried arrays are also recognized, and the returned paths
	 * include '$' components to represent wildcard array indices.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 * @param {Schema} options.schema - Schema the query is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(options = {}) {
		let fieldSet = {};
		let exprOperators = this._queryFactory._exprOperators;
		this._traverse({
			exprOperator(exprValue, field, operator/*, expr, query*/) {
				if (options.schema) {
					field = Query.getQueryPathSubschema(options.schema, field)[1];
				}
				let exprOperator = exprOperators[operator];
				if (!exprOperator.ignoreQueriedField && field !== null && field !== undefined) {
					fieldSet[field] = true;
				}
			},
			exactMatch(value, field) {
				if (options.schema) {
					field = Query.getQueryPathSubschema(options.schema, field)[1];
				}
				if (field !== null && field !== undefined) {
					fieldSet[field] = true;
				}
			}
		});
		return _.keys(fieldSet);
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
		let queryOperators = this._queryFactory._queryOperators;
		let exprOperators = this._queryFactory._exprOperators;
		this._traverse({
			queryOperator(exprValue, operator/*, query*/) {
				let queryOperator = queryOperators[operator];
				if (queryOperator.newQueryContext) {
					return false;
				}
			},
			exprOperator(exprValue, field, operator/*, expr, query*/) {
				let exprOperator = exprOperators[operator];
				if (exprOperator.newQueryContext) {
					return false;
				}
			},
			query(query) {
				query = query.getData();
				let transformMap = {};
				for (let key in query) {
					if (key[0] !== '$') {
						let newKey = transformFn(key);
						if (newKey !== key) {
							transformMap[key] = newKey;
						}
					}
				}
				for (let key in transformMap) {
					query[transformMap[key]] = query[key];
					delete query[key];
				}
			}
		});
	}

	/**
	 * Returns information on exactly matched fields in the query.  Exactly matched fields
	 * are fields that must match a single, exact, scalar, non-null value for the query
	 * to match.  This function also returns a boolean that indicates whether there are
	 * any fields in the query that are not exact matches.
	 *
	 * If the query can never match (ie, { $or: [] } ), an empty object is returned for
	 * exactMatches and onlyExactMatches is set to false.
	 *
	 * @method getExactMatches
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 * @param {Schema} options.schema - Schema to evaluate against
	 * @return {Object} - Object with several properties:
	 *   - exactMatches - An object mapping key key paths that exactly match values to the values
	 *     that exactly match.  If a schema was provided, these key paths may contain '$'
	 *     placeholder components representing wildcard array keys.
	 *   - onlyExactMatches - A boolean that's true if every part of the query is represented by
	 *     an exact match.
	 *   - exactFieldMatches - An object that's a subset of exactMatches, containing all exact
	 *     matches that do not contain wildcard/implicit array keys.
	 *   - onlyExactFieldMatches - True if every match in the query is in exactFieldMatches.
	 */
	getExactMatches(options = {}) {
		let hasNonExactMatches = false;
		let hasImplicitArrayMatches = false;
		let canNeverMatch = false;
		let exactMatches = {};
		let exactFieldMatches = {};
		let conflictingMatches = [];

		// Canonicalize key based on schema, if relevant
		function transformKey(key) {
			if (options.schema) {
				return Query.getQueryPathSubschema(options.schema, key)[1];
			} else {
				return key;
			}
		}

		function addQueryExactMatches(query) {
			for (let key in query) {
				if (key === '$and') {
					// Recursively traverse nested $and queries
					if (!Array.isArray(query[key])) throw new QueryValidationError('Operand to $and must be array');
					for (let subquery of query[key]) {
						addQueryExactMatches(subquery);
					}
				} else if (key === '$or') {
					// A $or can only be an unconditional exact match if it only has a single subquery
					if (!Array.isArray(query[key])) throw new QueryValidationError('Operand to $or must be array');
					if (query[key].length === 0) {
						canNeverMatch = true;
					} else if (query[key].length === 1) {
						addQueryExactMatches(query[key][0]);
					} else {
						hasNonExactMatches = true;
					}
				} else if (key[0] === '$') {
					// Any other query operator ($or or $nor) counts as a non-exact match
					hasNonExactMatches = true;
				} else if (Query.isOperatorExpression(query[key])) {
					// Operators in the value indicate a non-exact match
					hasNonExactMatches = true;
				} else {
					// The value is an exact match
					let transformedKey = transformKey(key);
					if (
						exactMatches[transformedKey] !== undefined &&
						!objtools.deepEquals(exactMatches[transformedKey], query[key])
					) {
						// Conflicting exact matches for the same field; the query will only match if the
						// field in the document is an array with both values.  We don't handle that here,
						// so handle it as a non-exact match.
						hasNonExactMatches = true;
						conflictingMatches.push(transformedKey);
					} else {
						exactMatches[transformedKey] = query[key];
						if (transformedKey === key) {
							// There are no implicit arrays in the match
							exactFieldMatches[key] = query[key];
						} else {
							hasImplicitArrayMatches = true;
						}
					}
				}
			}
		}

		addQueryExactMatches(this._queryData);

		for (let conflictingMatch of conflictingMatches) {
			delete exactMatches[conflictingMatch];
			delete exactFieldMatches[conflictingMatch];
		}

		if (canNeverMatch) {
			return {
				exactMatches: {},
				exactFieldMatches: {},
				onlyExactMatches: false,
				onlyExactFieldMatches: false
			};
		} else {
			return {
				exactMatches,
				exactFieldMatches,
				onlyExactMatches: !hasNonExactMatches,
				onlyExactFieldMatches: !hasNonExactMatches && !hasImplicitArrayMatches
			};
		}
	}

	/**
	 * Returns a list of all operators used in the query.
	 *
	 * @method getOperators
	 * @throws {XError} - Validation error
	 * @return {String[]} - Array of all operators, such as `[ "$and", "$in" ]`
	 */
	getOperators() {
		let operatorSet = {};
		this._traverse({
			queryOperator(exprValue, operator) {
				operatorSet[operator] = true;
			},
			exprOperator(exprValue, field, operator) {
				operatorSet[operator] = true;
			}
		});
		return Object.keys(operatorSet);
	}

	/**
	 * Substitutes $var expressions in the query with their corresponding values
	 * given as the parameter.  Substitution is done in-place.
	 *
	 * @method substituteVars
	 * @private
	 * @throws {XError} - Validation error, or missing var error
	 * @param {Object} vars - Mapping from variable names to values
	 * @param {Boolean} ignoreMissing - If set to true, exceptions are not thrown if
	 * a missing var name is encountered.
	 */
	_substituteVars(vars, ignoreMissing) {

		function subst(obj) {
			if (Query.isVarExpression(obj)) {
				let varName = obj.$var;
				let varValue = objtools.getPath(vars, varName);
				if (varValue === undefined) {
					if (ignoreMissing) {
						return null;
					} else {
						throw new MissingQueryVarError(varName);
					}
				} else {
					return varValue;
				}
			} else if (Array.isArray(obj)) {
				return _.map(obj, subst);
			} else if (objtools.isPlainObject(obj)) {
				for (let key in obj) {
					obj[key] = subst(obj[key]);
				}
				return obj;
			} else {
				return obj;
			}
		}

		this._queryData = subst(this._queryData);
	}

}

module.exports = Query;

// helper functions used by #condense()
function isContradiction(obj) {
	return (
		// sanity check
		obj && typeof obj === 'object' && (
			// has empty $or
			(obj.$or !== undefined && obj.$or.length === 0) ||
			// has $nor w/ tautology
			(obj.$nor !== undefined && _.some(obj.$nor, isTautology)) ||
			// has $and w/ contradiction
			(obj.$and !== undefined && _.some(obj.$and, isContradiction))
		)
	);
}

function isTautology(obj) {
	return (
		// sanity check
		obj && typeof obj === 'object' && (
			// base tautology
			_.size(obj) === 0 ||
			// complex tautologies
			(_.every(obj, isLogicalExpressionOperator) && (
				// $or w/ tautology
				(obj.$or === undefined || _.some(obj.$or, isTautology)) &&
				// $and w/ all tautologies
				(obj.$and === undefined || _.every(obj.$and, isTautology)) &&
				// $nor w/ all contradictions
				(obj.$nor === undefined || _.every(obj.$nor, isContradiction))
			))
		)
	);
}

function isLogicalExpressionOperator(value, key) {
	return (key === '$and' || key === '$nor' || key === '$or');
}
