// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const _ = require('lodash');
const moment = require('moment');

const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

/**
 * IntervalGroupByType matches against "interval" fields in a Group entry.
 * This aggregate groups Number and Date schema fields into continuous intervals.
 * For more details, see README.md
 *
 * @class IntervalGroupByType
 * @constructor
 * @extends FieldGroupByType
 */
class IntervalGroupByType extends FieldGroupByType {

	constructor() {
		super('interval', [ 'interval', 'base' ], [ 'number', 'date' ]);
	}

	/**
	 * Returns whether or not this GroupByType is duck-type matches the given group data.
	 *
	 * @method isType
	 * @param {Object} group - The group data to check against.
	 * @return {Boolean} Wether or not the GroupByType matches the group.
	 */
	isType(group) {
		let type = typeof group.interval;
		return type === 'string' || type === 'number';
	}

	/**
	 * Normalize the group and the values it contains.
	 *
	 * @method normalize
	 * @throws {AggregateValidationError} - If group value cannot be normalized.
	 * @param {Object} group - The group to noramlize.
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the query is querying against.
	 */
	normalize(group, options = {}) {
		super.normalize(group, options);

		// Validate interval
		let intervalType = typeof group.interval;
		if (intervalType === 'string' && !isNaN(group.interval)) {
			group.interval = parseFloat(group.interval);
			intervalType = 'number';
		} else if (intervalType === 'string' && moment.duration(group.interval).toISOString() === group.interval) {
			intervalType = 'date';
		}
		if (intervalType !== 'number' && intervalType !== 'date') {
			throw new AggregateValidationError('groupBy interval must be a number or valid ISO 8601 time duration');
		}
		// Validate base (if it exists)
		if (group.base !== null && group.base !== undefined) {
			let baseType = typeof group.base;
			if (baseType === 'string' && !isNaN(group.base)) {
				group.base = parseFloat(group.base);
				baseType = 'number';
			} else if (baseType === 'string' || _.isDate(group.base)) {
				let dateBase = new Date(group.base);
				if (!isNaN(dateBase.getTime())) {
					group.base = dateBase;
					baseType = 'date';
				} else if (_.isDate(group.base)) {
					throw new AggregateValidationError('groupBy interval duration base must be a valid date');
				}
			}
			if (intervalType !== baseType) {
				let msg = `groupBy interval type (${intervalType}) and base type (${baseType}) must match`;
				throw new AggregateValidationError(msg);
			}
		}

		// Validate against the schema (if it exists)
		if (options.schema) {
			let fieldType = this._getGroupFieldType(group, options.schema);
			if (intervalType !== fieldType) {
				throw new AggregateValidationError('groupBy interval and field types must match');
			}
		}
	}

	/**
	 * Validates that the group is correct. It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} group - The group to validate.
	 * @return {Boolean} - true
	 */
	validate(group) {
		super.validate(group);

		// Validate interval
		let intervalType = typeof group.interval;
		if (intervalType === 'string' && moment.duration(group.interval).toISOString() === group.interval) {
			intervalType = 'date';
		}
		if (intervalType !== 'number' && intervalType !== 'date') {
			throw new AggregateValidationError('groupBy interval must be a number or valid ISO 8601 time duration');
		}
		// Validate base (if it exists)
		if (group.base !== null && group.base !== undefined) {
			let baseType = typeof group.base;
			if (_.isDate(group.base)) {
				if (isNaN(group.base.getTime())) {
					throw new AggregateValidationError('groupBy interval duration base must be a valid date');
				}
				baseType = 'date';
			}
			if (intervalType !== baseType) {
				let msg = `groupBy interval type (${intervalType}) and base type (${baseType}) must match`;
				throw new AggregateValidationError(msg);
			}
		}
		return true;
	}

}

module.exports = exports = IntervalGroupByType;
