const _ = require('lodash');

const AggregateType = require('../../aggregate-type');
const AggregateValidationError = require('../../aggregate-validation-error');
const groupByTypes = require('./group-by-types').coreTypes;

class GroupByAggregateType extends AggregateType {

	constructor() {
		super('group-by');

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
		for (let groupByType of this._groupByTypes) {
			if (groupByType.isType(group)) {
				foundGroupByType = groupByType;
			}
		}
		if (!foundGroupByType) {
			throw new AggregateValidationError('Could not find a groupBy type matching a grouping');
		}
		return foundGroupByType;
	}

	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);
		let groupBy = aggregate.groupBy;
		if (typeof groupBy) {
			aggregate.groupBy = [ {
				field: groupBy
			} ];
			return;
		}

		if (_.isPlainObject(groupBy)) {
			groupBy = [ groupBy ];
		}
		if (!_.isArray(groupBy)) {
			throw new AggregateValidationError('groupBy field must be either string, plain object, or array');
		}

		// Normalize each entry of the `groupBy` array
		for (let group of groupBy) {
			let groupByType = this._findGroupByType(group);
			groupByType.normalize(group, options);
		}
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

}
module.exports = exports = GroupByAggregateType;
