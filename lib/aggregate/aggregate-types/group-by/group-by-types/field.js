const AggregateValidationError = require('../../../aggregate-validation-error');
const GroupByType = require('../group-by-type');

class FieldGroupByType extends GroupByType {

	constructor(name = 'field', fields = [], fieldTypes = [ 'number', 'string', 'boolean' ]) {
		fields.push('field'); // Add field here so subtypes don't have to duplicate
		super(name, fields);

		// Fields to validate against
		this._fieldTypes = fieldTypes;
	}

	isType(group) {
		return typeof group === 'object' && typeof group.field === 'string';
	}

	_getGroupFieldType(group, schema) {
		let subschema = schema.getSubschemaData(group.field);
		if (!subschema) {
			throw new AggregateValidationError('groupBy field path must exist in the schema');
		}
		let subschemaType = schema.getSchemaType(subschema);
		return subschemaType.getName();
	}

	normalize(group, options = {}) {
		super.normalize(group, options);
		if (typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry\'s field property must be a string');
		}
		if (this._fieldTypes && options.schema) {
			// Validate schema path to ensure the field type is in the list of valid types
			let fieldType = this._getGroupFieldType(group, options.schema);
			if (this._fieldTypes.indexOf(fieldType) < 0) {
				let msg = `groupBy field type (${fieldType}) does not match valid field types (${this.fieldTypes})`;
				throw new AggregateValidationError(msg);
			}
		}
	}

	validate(group) {
		super.validate(group);
		if (typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry\'s field property must be a string');
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
	getQueriedFields(group/*, options = {}*/) {
		if (typeof group !== 'object' || typeof group.field !== 'string') {
			throw new AggregateValidationError('groupBy entry must be an object with string field property');
		}
		return [ group.field ];
	}

}
module.exports = exports = FieldGroupByType;
