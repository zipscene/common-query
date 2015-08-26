const _ = require('lodash');

const AggregateValidationError = require('../../aggregate-validation-error');

class GroupByType {

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

	isType(/*group*/) {
		return true;
	}

	_normalizeAndValidate(group) {
		if (!_.isPlainObject(group)) {
			throw new AggregateValidationError('groupBy entry must be an object');
		}

		// Try to find unrecognized fields
		let unrecognizedFields = {};
		for (let field in group) {
			unrecognizedFields[field] = true;
		}
		for (let field of this.getFields()) {
			unrecognizedFields[field] = false;
		}
		for (let field in unrecognizedFields) {
			if (unrecognizedFields[field]) {
				throw new AggregateValidationError(`groupBy entry contains an unrecognized field (${field})`);
			}
		}
	}

	normalize(group/*, options = {}*/) {
		this._normalizeAndValidate(group);
	}

	validate(group) {
		this._normalizeAndValidate(group);
		return true;
	}


	/**
	 * Returns a list of fields (in dot-separated notation) that the group accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(/*group, options = {}*/) {
		return [];
	}

}
module.exports = exports = GroupByType;
