const _ = require('lodash');
const objtools = require('zs-objtools');

const AggregateType = require('../aggregate-type');
const AggregateValidationError = require('../aggregate-validation-error');

const Query = require('../../query/query');

/**
 * Valid stats types, which can be in a "stats field mask"
 *
 * @property STATS_TYPES
 * @for StatsAggregateType
 * @static
 * @type String[]
 */
const STATS_TYPES = [
	'count',
	'avg',
	'min',
	'max',
	'sum',
	'stddev'
];

/**
 * StatsAggregateType matches against aggregates with the 'stats' field:
 * ```
 * {
 *   "stats": {
 *     "foo": {
 *       "count": true
 *     }
 *   }
 * }
 * ```
 * This aggregate type returns statistics on a field across a whole collection (or a subset
 * matched by a query).
 * See README.md for more details on shorthand and useage.
 *
 * @class StatsAggregateType
 * @constructor
 * @extends AggregateType
 */
class StatsAggregateType extends AggregateType {

	constructor() {
		super('stats');
	}

	/**
	 * Returns whether or not this AggregateType is duck-type matches the given aggregate data.
	 *
	 * @method isType
	 * @param {Object} aggregate - The aggregate data to check against.
	 * @return {Boolean} Wether or not the AggregateType matches the aggregate.
	 */
	isType(aggregate) {
		if (!super.isType(aggregate)) return false;
		return !objtools.isEmpty(aggregate.stats);
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

		let stats = aggregate.stats;
		if (!objtools.isPlainObject(stats) && typeof stats !== 'string') {
			throw new AggregateValidationError('stats aggregate must be a field mask or string');
		}
		if (typeof stats === 'string') {
			// Just one stats field
			aggregate.stats = { [`${stats}`]: { count: true } };
		} else {
			// Validate all fields in the stats aggregate
			for (let path in stats) {
				let mask = stats[path];
				if (!objtools.isPlainObject(mask)) {
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
				if (objtools.isEmpty(mask)) {
					delete stats[path];
				}
			}
		}

		if (options.schema) {
			// Validate fields against the schema
			for (let path in aggregate.stats) {
				// let subschema = options.schema.getSubschemaData(path);
				let [ subschema ] = Query.getQueryPathSubschema(options.schema, path);
				if (!subschema) {
					throw new AggregateValidationError(`stats aggregate field (${path}) does not exist in the schema`);
				}
			}
		}
	}

	/**
	 * Validates that the aggregate is correct. It should be strictly validated.
	 *
	 * @method validate
	 * @throws {AggregateValidationError} - Validation error
	 * @param {Object} aggregate - The aggregate to validate.
	 * @return {Boolean} - true
	 */
	validate(aggregate) {
		super.validate(aggregate);
		let stats = aggregate.stats;
		if (!objtools.isPlainObject(stats)) {
			throw new AggregateValidationError('stats aggregate must be a mapping from fields to field mask');
		}
		for (let path in stats) {
			let mask = stats[path];
			if (!objtools.isPlainObject(mask)) {
				throw new AggregateValidationError('stats aggregate properties must be stats type masks');
			}
			if (objtools.isEmpty(mask)) {
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
	 * @param {Object} aggregate - The aggregate to get the queried fields form.
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(aggregate/*, options = {}*/) {
		let stats = aggregate.stats;
		if (!objtools.isPlainObject(stats)) {
			throw new AggregateValidationError('stats aggregate must be a mapping from fields to field mask');
		}
		return Object.keys(stats);
	}


}

module.exports = exports = StatsAggregateType;

StatsAggregateType.STATS_TYPES = STATS_TYPES;
