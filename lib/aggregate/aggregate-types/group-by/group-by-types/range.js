const _ = require('lodash');
const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

class RangeGroupByType extends FieldGroupByType {

	constructor() {
		super('range', [ 'ranges' ], [ 'number', 'date' ]);
	}

	isType(group) {
		return _.isArray(group.ranges);
	}

	normalize(group, options = {}) {
		super.normalize(group, options);
		let ranges = group.ranges;
		if (!_.isArray(ranges) || ranges.length <= 0) {
			throw new AggregateValidationError('groupBy ranges must be an array with length > 0');
		}

		let rangesType;
		for (let i = 0, len = ranges.length; i < len; ++i) {
			let range = ranges[i];

			// Normalize the range object/value
			let type = typeof range;
			if (type !== 'object' || _.isDate(range)) {
				// Normalize shorthand range values
				let rangeVal;
				if (type === 'number' || (type === 'string' && !isNaN(range))) {
					rangeVal = parseFloat(range);
					type = 'number';
				} else if (type === 'string' || _.isDate(range)) {
					// Parse valid dates
					let rangeDate = new Date(range);
					if (!isNaN(rangeDate.getTime())) {
						rangeVal = rangeDate;
						type = 'date';
					}
				}
				if (type !== 'date' && type !== 'number') {
					// There shouldn't be anything other than Numbers and Dates for ranges
					let msg = `groupBy range value must be a number, date, or ISO date string`;
					throw new AggregateValidationError(msg);
				}
				// Construct verbose form
				range = {
					end: rangeVal
				};
				// Set the `start` property from the previous entry
				if (i !== 0) {
					range.start = ranges[i - 1].end;
				}
				ranges[i] = range;
				// Push an extra object to the end of the shorthand range
				if (i === (len - 1)) {
					ranges.push({
						start: rangeVal
					});
				}
			} else {
				// Normalize range objects
				if (
					(range.start === undefined || range.start === null) &&
					(range.end === undefined || range.end === null)
				) {
					// Ensure there is at least a start and end
					throw new AggregateValidationError('groupBy range must contain at least a start or end property');
				}
				for (let key in range) {
					let val = range[key];
					if (key !== 'start' && key !== 'end') {
						// Remove extra keys, which shouldn't be in the range object
						delete range[key];
						continue;
					}
					let valType = typeof val;
					if (valType === 'number' || (valType === 'string' && !isNaN(val))) {
						// Parse Numbers
						range[key] = parseFloat(val);
						valType = 'number';
					} else if (valType === 'string' || _.isDate(val)) {
						// Validate Dates
						let valDate = new Date(val);
						if (!isNaN(valDate.getTime())) {
							range[key] = valDate;
							valType = 'date';
						}
					}
					if (valType !== 'date' && valType !== 'number') {
						// There shouldn't be anything other than Numbers and Dates for ranges
						let msg = `groupBy range value must be a number, date, or ISO date string`;
						throw new AggregateValidationError(msg);
					}
				}
			}

			// Validate the types in the range object
			let rangeType;
			if (range.start !== null && range.start !== undefined && range.end !== null && range.end !== undefined) {
				let startType = typeof range.start;
				let endType = typeof range.end;
				// Ensure these types match
				if (startType !== endType) {
					throw new AggregateValidationError('groupBy range start and end types are different');
				}
				rangeType = startType;
			} else {
				// Grab whichever exists
				let rangeVal = (range.start === null || range.start === undefined) ? range.end : range.start;
				rangeType = typeof rangeVal;
			}
			// Normalize into "SubSchemaType" names
			rangeType = (rangeType === 'object') ? 'date' : rangeType;

			// Ensure the types match between iterations
			if (rangesType === undefined) {
				rangesType = rangeType;
			} else if (rangesType !== rangeType) {
				throw new AggregateValidationError('groupBy range entries must all be the same type');
			}

		}
		// Validate against schema type
		if (options.schema) {
			let groupFieldType = this._getGroupFieldType(group, options.schema);
			if (groupFieldType !== rangesType) {
				let msg = `groupBy range type (${rangesType}) does not match field type (${groupFieldType})`;
				throw new AggregateValidationError(msg);
			}
		}
	}

	validate(group) {
		super.validate(group);
		let ranges = group.ranges;
		if (!_.isArray(ranges) || ranges.length <= 0) {
			throw new AggregateValidationError('groupBy ranges must be an array with length > 0');
		}

		for (let range of ranges) {
			// Ensure range looks good without investigating types
			if (typeof range !== 'object') {
				throw new AggregateValidationError('groupBy range must be an object');
			}
			if (
				(range.start === null || range.start === undefined) &&
				(range.end === null || range.end === undefined)
			) {
				throw new AggregateValidationError('groupBy range must contain at least a start or end property');
			}
		}
		return true;
	}

}
module.exports = exports = RangeGroupByType;
