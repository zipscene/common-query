const _ = require('lodash');

class AggregateType {

	constructor(name, fields) {
		this._name = name;
		this._fields = fields || [ name ];
	}

	getName() {
		return this._name;
	}

	getFields() {
		return this._fields;
	}

	isType(aggregate) {
		return _.isPlainObject(aggregate);
	}

	normalize(/*aggregate, options = {}*/) {
		// There is nothing to normalize
	}

	validate(/*aggregate*/) {
		// There is nothing to validate
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
	getQueriedFields(/*aggregate, options = {}*/) {
		return [];
	}

}
module.exports = exports = AggregateType;
