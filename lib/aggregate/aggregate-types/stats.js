const _ = require('lodash');

const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');

const STATS_TYPES = [
	'count',
	'avg',
	'min',
	'max'
];

class StatsAggregateType extends AggregateType {

	constructor() {
		super('stats');
	}

	isType(aggregate) {
		if (!super.isType(aggregate)) { return false; }
		return !_.isEmpty(aggregate.stats);
	}

	normalize(aggregate, options = {}) {
		super.normalize(aggregate, options);

		let stats = aggregate.stats;
		if (!_.isPlainObject(stats) && typeof stats !== 'string') {
			throw new AggregateValidationError('stats aggregate must be a field mask or string');
		}
		if (typeof stats === 'string') {
			// Just one stats field
			aggregate.stats = { [`${stats}`]: { count: true } };
		} else {
			// Validate all fields in the stats aggregate
			for (let path in stats) {
				let mask = stats[path];
				if (!_.isPlainObject(mask)) {
					throw new AggregateValidationError('stats aggregate properties must be stats type masks');
				}
				for (let statsType in mask) {
					if (STATS_TYPES.indexOf(statsType) < 0) {
						throw new AggregateValidationError(`stats type field (${statsType}) is not valid`);
					}
					if (!mask[statsType]) {
						throw new AggregateValidationError('stats type mask contains a non-truthy value');
					}
					mask[statsType] = true;
				}
				if (_.isEmpty(mask)) {
					delete stats[path];
				}
			}
		}

		if (options.schema) {
			// Validate fields against the schema
			for (let path in aggregate.stats) {
				let subschema = options.schema.getSubschemaData(path);
				if (!subschema) {
					throw new AggregateValidationError(`stats aggregate field (${path}) does not exist in the schema`);
				}
			}
		}
	}

	validate(aggregate) {
		super.validate(aggregate);
		let stats = aggregate.stats;
		if (!_.isPlainObject(stats)) {
			throw new AggregateValidationError('stats aggregate must be a mapping from fields to field mask');
		}
		for (let path in stats) {
			let mask = stats[path];
			if (!_.isPlainObject(mask)) {
				throw new AggregateValidationError('stats aggregate properties must be stats type masks');
			}
			if (_.isEmpty(mask)) {
				throw new AggregateValidationError(`stats type mask (${path}) is empty`);
			}
			for (let statsType in mask) {
				if (mask[statsType] !== true) {
					throw new AggregateValidationError('stats type mask contains a non-true value');
				}
				if (STATS_TYPES.indexOf(statsType) < 0) {
					throw new AggregateValidationError(`stats type field (${statsType}) is not valid`);
				}
			}
		}
		return true;
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
	getQueriedFields(aggregate/*, options = {}*/) {
		let stats = aggregate.stats;
		if (!_.isPlainObject(stats)) {
			throw new AggregateValidationError('stats aggregate must be a mapping from fields to field mask');
		}
		return Object.keys(stats);
	}


}
module.exports = exports = StatsAggregateType;

StatsAggregateType.STATS_TYPES = STATS_TYPES;
