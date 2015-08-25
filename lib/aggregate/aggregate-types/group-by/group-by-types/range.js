const _ = require('lodash');
const AggregateValidationError = require('../../../aggregate-validation-error');
const FieldGroupByType = require('./field');

class RangeGroupByType extends FieldGroupByType {

	constructor() {
		super('range', [ 'number', 'date' ]);
	}

	isType(group) {
		return _.isArray(group.ranges);
	}

	normalize(group, options = {}) {
		super.normalize(group, options);
		let ranges = group.ranges;
		let rangesType;
		for (let i = 0, len = ranges.length; i < len; ++i) {
			let range = ranges[i];

			// Normalize the range object/value
			let type = typeof range;
			if (type !== 'object') {
				// Normalize shorthand range values
				let rangeVal;
				if (type === 'number' || !isNaN(range)) {
					rangeVal = parseFloat(range);
				} else if (type === 'string' || _.isDate(range)) {
					// Parse valid dates
					rangeVal = new Date(type);
					if (isNaN(rangeVal.getTime())) {
						let msg = 'groupBy range value must be a number or a valid date string';
						throw new AggregateValidationError(msg);
					}
				} else {
					throw new AggregateValidationError(`groupBy range value has invalid type: ${type}`);
				}
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
				for (let key of range) {
					let val = range[key];
					if (key !== 'start' || key !== 'end' || val === null || val === undefined) {
						delete range[key];
						continue;
					}
					let valType = typeof val;
					if (valType === 'number' || !isNaN(val)) {
						range[key] = parseFloat(val);
					} else if (valType === 'string' || _.isDate(val)) {
						range[key] = new Date(val);
						if (isNaN(range[key].getTime())) {
							let msg = 'groupBy range value must be a number or a valid date string';
							throw new AggregateValidationError(msg);
						}
					} else {
						throw new AggregateValidationError(`groupBy range value has invalid type: ${valType}`);
					}
				}
			}

			// Validate the types in the range object
			let rangeType;
			if ((range.start === null || range.start !== undefined) && range.end) {
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

			// Validate against schema type
			if (options.schema) {
				let subschema = options.schema.getSubschemaData(group.field);
				let subschemaType = options.schema.getSubschemaType(subschema);
				let subschemaTypeName = subschemaType.getName();
				let matches = (subschemaTypeName === rangeType);
				if (!matches) {
					let msg = `groupBy range type (${rangeType}) does not match field type (${subschemaTypeName})`;
					throw new AggregateValidationError(msg);
				}
			}

			// Ensure the types match between iterations
			if (rangesType === undefined) {
				rangesType = rangeType;
			} else if (rangesType !== rangeType) {
				throw new AggregateValidationError('groupBy ranges must follow the same form and type');
			}
		}
	}

	validate(group) {
		super.validate(group);
		let ranges = group.ranges;
		if (!_.isArray(ranges) || ranges.length <= 0) {
			throw new AggregateValidationError('groupBy ranges must be and array with length > 0');
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
	}

}
module.exports = exports = RangeGroupByType;
