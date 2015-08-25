const AggregateValidationError = require('../../../aggregate-validation-error');
const GroupByType = require('../group-by-type');

class FieldGroupByType extends GroupByType {

	constructor(name = 'field', fieldTypes) {
		super(name);

		// Fields to validate against
		this.fieldTypes = fieldTypes;
	}

	isType(/*group*/) {
		return true;
	}

	_getGroupFieldType(group, schema) {
		let subschema = schema.getSubschemaData(group.field);
		let subschemaType = schema.getSubschemaType(subschema);
		return subschemaType.getName();
	}

	normalize(group, options = {}) {
		super.normalize(group, options);
		if (this.fieldTypes && options.schema) {
			// Validate schema path to ensure the field type is in the list of valid types
			let fieldType = this._getGroupFieldType(group, options.schema);
			if (this.fieldTypes.indexOf(fieldType) < 0) {
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
	}

}
module.exports = exports = FieldGroupByType;
