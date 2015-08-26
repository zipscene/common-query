const _ = require('lodash');

const AggregateType = require('../../aggregate-type');
const AggregateValidationError = require('../../aggregate-validation-error');
const groupByTypes = require('./group-by-types');

class GroupByAggregateType extends AggregateType {

	constructor() {
		super('group-by', [ 'groupBy' ]);

		this._groupByTypes = [];
		this._groupByTypesMap = {};
		this._loadGroupByTypes();
	}

	_loadGroupByTypes() {
		for (let name in groupByTypes) {
			let Constructor = groupByTypes[name];
			let groupByType = new Constructor();
			this.registerGroupByType(name, groupByType);
		}
	}

	registerGroupByType(name, groupByType) {
		if (this._groupByTypesMap[name]) {
			this.unregisterGroupByType(name);
		}
		this._groupByTypesMap[name] = groupByType;
		this._groupByTypes.push(groupByType);
	}

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

	getGroupByType(name) {
		return this._goupByTypesMap[name];
	}

	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !_.isEmpty(aggregate.groupBy);
	}

	_findGroupByType(group) {
		let foundGroupByType;
		if (_.isPlainObject(group)) {
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

	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);

		let groupBy = aggregate.groupBy;
		// Normalize into an array
		if (_.isPlainObject(groupBy) || typeof groupBy === 'string') {
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
			} else {
				let groupByType = this._findGroupByType(group);
				groupByType.normalize(group, options);
			}
			groupBy[i] = group;
		}
		aggregate.groupBy = groupBy;
	}

	validate(aggregate) {
		super.validate(aggregate);
		let groupBy = aggregate.groupBy;
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be an array of group objects');
		}
		for (let group of groupBy) {
			let groupByType = this._findGroupByType(group);
			groupByType.validate(group);
		}
	}


	/**
	 * Returns a list of fields (in dot-separated notation) that the aggregate accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 * @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(aggregate, options = {}) {
		let groupBy = aggregate.groupBy;
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be an array of group objects');
		}
		let fields = [];
		for (let group of groupBy) {
			let groupByType = this._findGroupByType(group);
			let groupFields = groupByType.getQueriedFields(group, options);
			fields.push(...groupFields);
		}
		return fields;
	}

}
module.exports = exports = GroupByAggregateType;
