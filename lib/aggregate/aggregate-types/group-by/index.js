// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const _ = require('lodash');
const objtools = require('objtools');

const AggregateType = require('../../aggregate-type');
const AggregateValidationError = require('../../aggregate-validation-error');
const GroupByType = require('./group-by-type');
const groupByTypes = require('./group-by-types');

/**
 * GroupByAggregateType matches against aggregates with the 'groupBy' field:
 * ```
 * {
 *   "groupBy": [ {
 *     "field": "foo",
 *     "ranges": [ 1, 2, 3 ]
 *   } ]
 * }
 * ```
 * This aggregate type groups values under keys, specified by the "groupBy" array.
 * See README.md for more details on shorthand and useage.
 *
 * @class GroupByAggregateType
 * @constructor
 * @extends AggregateType
 */
class GroupByAggregateType extends AggregateType {

	constructor() {
		super('group-by', [ 'groupBy' ]);

		this._groupByTypes = [];
		this._groupByTypesMap = {};
		this._loadGroupByTypes();
	}

	/**
	 * Create and register core GroupByTypes
	 *
	 * @method _loadGroupByTypes
	 * @private
	 */
	_loadGroupByTypes() {
		for (let name in groupByTypes) {
			let Constructor = groupByTypes[name];
			let groupByType = new Constructor();
			this.registerGroupByType(name, groupByType);
		}
	}

	/**
	 * Register a GroupByType under the given name.
	 *
	 * @method registerGroupByType
	 * @param {String} name - The name to register the GroupByType under.
	 * @param {GroupByType} groupByType - The GroupByType to register.
	 */
	registerGroupByType(name, groupByType) {
		if (this._groupByTypesMap[name]) {
			this.unregisterGroupByType(name);
		}
		this._groupByTypesMap[name] = groupByType;
		this._groupByTypes.push(groupByType);
	}

	/**
	 * Unregister a GroupByType under the given name.
	 *
	 * @method unregisterGroupByType
	 * @param {String} - The name to unregister the GroupByType under.
	 */
	unregisterGroupByType(name) {
		// Remove the element with the same name form the array to preserve priority
		for (let i = 0, len = this._groupByTypes.length; i < len; ++i) {
			let type = this._groupByTypes[i];
			if (type.getName() === name) {
				this._groupByTypes.splice(i, 1);
				break;
			}
		}
		this._groupByTypesMap[name] = undefined;
	}

	/**
	 * Get GroupByType by name.
	 *
	 * @method getGroupByType
	 * @param {String} name - name to get GroupByType by.
	 * @return {GroupByType} The GroupByType under the name.
	 */
	getGroupByType(name) {
		return this._goupByTypesMap[name];
	}

	/**
	 * Returns whether or not this AggregateType is duck-type matches the given aggregate data.
	 *
	 * @method isType
	 * @param {Object} aggregate - The aggregate data to check against.
	 * @return {Boolean} Wether or not the AggregateType matches the aggregate.
	 */
	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !objtools.isEmpty(aggregate.groupBy);
	}

	/**
	 * Finds GroupByType that duck-type matches with the given Group entry.
	 *
	 * @method findGroupByType
	 * @throws {AggregateValidationError} if no matching GroupByTypes are found.
	 * @param {Object} group - Group entry to match against.
	 * @return {GroupByType} The last matching GroupByType.
	 */
	findGroupByType(group) {
		let foundGroupByType;
		if (objtools.isPlainObject(group)) {
			for (let groupByType of this._groupByTypes) {
				if (groupByType.isType(group)) {
					foundGroupByType = groupByType;
				}
			}
		}
		if (!foundGroupByType) {
			throw new AggregateValidationError('could not find a groupBy type matching a grouping');
		}
		return foundGroupByType;
	}

	/**
	 * Normalize the aggregate and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If an aggregate value cannot be normalized.
	 * @param {Object} aggregate - The aggregate to noramlize.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);

		let groupBy = aggregate.groupBy;
		// Normalize into an array
		if (objtools.isPlainObject(groupBy) || typeof groupBy === 'string') {
			groupBy = [ groupBy ];
		}
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be either string, plain object, or array');
		}

		// Normalize each entry of the `groupBy` array
		for (let i = 0, len = groupBy.length; i < len; ++i) {
			let group = groupBy[i];
			if (typeof group === 'string') {
				group = { field: group };
			}
			let groupByType = this.findGroupByType(group);
			groupByType.normalize(group, options);
			groupBy[i] = group;
		}
		aggregate.groupBy = groupBy;
	}

	/**
	 * Validates that the aggregate is correct.  It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} aggregate - The aggregate to validate.
	 * @return {Boolean} - true
	 */
	validate(aggregate) {
		super.validate(aggregate);
		let groupBy = aggregate.groupBy;
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be an array of group objects');
		}
		for (let group of groupBy) {
			let groupByType = this.findGroupByType(group);
			groupByType.validate(group);
		}
		return true;
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the aggregate accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} aggregate - The aggregate to get the queried fields form.
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(aggregate, options = {}) {
		let groupBy = aggregate.groupBy;
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be an array of group objects');
		}
		let fields = [];
		for (let group of groupBy) {
			let groupByType = this.findGroupByType(group);
			let groupFields = groupByType.getQueriedFields(group, options);
			fields.push(...groupFields);
		}
		return fields;
	}

}

module.exports = exports = GroupByAggregateType;

// Reexport GroupByTypes
GroupByAggregateType.GroupByType = GroupByType;
GroupByAggregateType.coreAggregateGroupByTypes = groupByTypes;
