/* eslint-disable spaced-comment */

const AggregateValidationError = require('../../../aggregate-validation-error');
const GroupByType = require('../group-by-type');
const Query = require('../../../../query/query');

/**
 * FieldGroupByType matches against the "field" field in a Group entry.
 * This aggregate groups Number, String, and Boolean schema fields into discrete values.
 * For more details, see README.md
 *
 * @class FieldGroupByType
 * @constructor
 * @extends GroupByType
 */
class FieldGroupByType extends GroupByType {

	constructor(name = 'field', fields = [], fieldTypes = [ 'number', 'string', 'boolean' ]) {
		fields.push('field'); // Add field here so subtypes don't have to duplicate
		super(name, fields);

		// Fields to validate against
		this._fieldTypes = fieldTypes;
	}

	/**
	 * Get the list of valid fields for group objects matching this GroupByType.
	 *
	 * @method getFields
	 * @return {String[]}
	 */
	isType(group) {
		return typeof group === 'object' && typeof group.field === 'string';
	}

	/**
	 * Helper function to get the groupBy field from the schema.
	 *
	 * @method _getGroupFieldType
	 * @private
	 * @throw {AggregateValidationError} - If the path doesn't exist in the schema.
	 * @param {Object} group - The gorup to get field path out of.
	 * @param {Schema} schema - The schema to get the field's subschema from.
	 * @return {String} The subschema's type name.
	 */
	_getGroupFieldType(group, schema) {
		let [ subschema ] = Query.getQueryPathSubschema(schema, group.field);
		if (!subschema) {
			throw new AggregateValidationError('groupBy field path must exist in the schema');
		}
		let subschemaType = schema.getSchemaType(subschema);
		if (subschemaType.getName() === 'array') {
			return schema.getSchemaType(subschema.elements).getName();
		}
		return subschemaType.getName();
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
		if (typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry\'s field property must be a string');
		}
		if (this._fieldTypes && options.schema) {
			// Validate schema path to ensure the field type is in the list of valid types
			let fieldType = this._getGroupFieldType(group, options.schema);
			if (this._fieldTypes.indexOf(fieldType) < 0) {
				let msg = `groupBy field type (${fieldType}) does not match valid field types (${this._fieldTypes})`;
				throw new AggregateValidationError(msg);
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
		if (typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry\'s field property must be a string');
		}
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
	getQueriedFields(group/*, options = {}*/) {
		if (typeof group !== 'object' || typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry must be an object with string field property');
		}
		return [ group.field ];
	}

}

module.exports = exports = FieldGroupByType;
