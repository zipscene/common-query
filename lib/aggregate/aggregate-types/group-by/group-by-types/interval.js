const _ = require('lodash');
const moment = require('moment');

const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

class IntervalGroupByType extends FieldGroupByType {

	constructor() {
		super('interval', [ 'number', 'date' ]);
	}

	isType(group) {
		let type = typeof group.interval;
		return type === 'string' || type === 'number';
	}

	_validateAndNormalize(group, modify = false) {
		// Validate interval
		let intervalType = typeof group.interval;
		if (intervalType === 'string' && !isNaN(group.interval)) {
			if (modify) {
				group.interval = parseFloat(group.interval);
			}
			intervalType = 'number';
		} else if (intervalType === 'string' && moment.duration(group.interval).isValid()) {
			intervalType = 'date';
		}
		if (intervalType !== 'number' && intervalType !== 'date') {
			throw new AggregateValidationError('groupBy interval must be a number or valid ISO 8601 time duration');
		}
		// Validate base (if it exists)
		if (group.base !== null && group.base !== undefined) {
			let baseType = typeof group.base;
			if (baseType === 'string' && isNaN(group.base) || _.isDate(group.base)) {
				if (modify) {
					group.base = new Date(group.base);
				}
				baseType = 'date';
			}
			if (intervalType !== baseType) {
				let msg = `groupBy interval type (${intervalType}) and base type (${baseType}) must match`;
				throw new AggregateValidationError(msg);
			}
		}
		return intervalType;
	}

	normalize(group, options = {}) {
		super.normalize(group, options);
		let intervalType = this._validateAndNormalize(group, true);

		if (options.schema) {
			let fieldType = this._getGroupFieldType(group, options.schema);
			if (intervalType !== fieldType) {
				throw new AggregateValidationError('groupBy interval and field types must match');
			}
		}
	}

	validate(group) {
		super.validate(group);
		this._validateAndNormalize(group);
	}

}
module.exports = exports = IntervalGroupByType;
