/* eslint-disable spaced-comment */

const objtools = require('zs-objtools');

const AggregateValidationError = require('../../aggregate-validation-error');

/**
 * GroupByType duck-type matches against group entries in the "groupBy" array.
 * NOTE: this class should not be instantiated directly.
 * It should instead be subclassed with proper noramlize/validate functionality.
 *
 * See README.md for more details on different GroupByTypes.
 *
 * @class GroupByType
 * @constructor
 */
class GroupByType {

	constructor(name, fields) {
		this._name = name;
		this._fields = fields || [ name ];
	}

	/**
	 * Get the name of this GroupByType
	 *
	 * @method getName
	 * @return {String}
	 */
	getName() {
		return this._name;
	}

	/**
	 * Get the list of valid fields for group objects matching this GroupByType.
	 *
	 * @method getFields
	 * @return {String[]}
	 */
	getFields() {
		return this._fields;
	}

	/**
	 * Returns whether or not this GroupByType is duck-type matches the given group data.
	 *
	 * @method isType
	 * @param {Object} group - The group data to check against.
	 * @return {Boolean} Wether or not the GroupByType matches the group.
	 */
	isType(/*group*/) {
		return true;
	}

	/**
	 * Helper method to validate the given group.
	 *
	 * @method _normalizeAndValidate
	 * @private
	 * @throws {AggregateValidationError} - If group is invalid or has unrecognized fields
	 * @param {Object} - the group data to normalize/validate
	 */
	_normalizeAndValidate(group) {
		if (!objtools.isPlainObject(group)) {
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
		unrecognizedFields.only = false;
		for (let field in unrecognizedFields) {
			if (unrecognizedFields[field]) {
				throw new AggregateValidationError(`groupBy entry contains an unrecognized field (${field})`);
			}
		}
		if (group.only) {
			if (!Array.isArray(group.only)) {
				throw new AggregateValidationError('groupBy.only must be an array');
			}
			for (let onlyValue of group.only) {
				if (!objtools.isScalar(onlyValue)) {
					throw new AggregateValidationError('groupBy.only must contain only scalars');
				}
			}
		}
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
	normalize(group/*, options = {}*/) {
		this._normalizeAndValidate(group);
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
		this._normalizeAndValidate(group);
		return true;
	}

	/**
	 * Returns a list of fields (in dot-separated notation) that the group accesses.
	 *
	 * @method getQueriedFields
	 * @throws {XError} - Validation error
	 * @param {Object} group - The group entry to get the queried fields form.
	 * @param {Object} [options]
	 *   @param {Schema} options.schema - Schema the aggregate is evaluated against
	 * @return {String[]} - Array of fields
	 */
	getQueriedFields(/*group, options = {}*/) {
		return [];
	}

}

module.exports = exports = GroupByType;
