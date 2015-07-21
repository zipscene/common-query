/*eslint no-unused-vars:0*/
let UpdateValidationError = require('./update-validation-error');
let _ = require('lodash');

/**
 * This is the base class for update operators.  Subclass it to create custom update operators.
 *
 * @class UpdateOperator
 * @constructor
 * @param {String} name - Operator name, such as "$inc"
 */
class UpdateOperator {

	constructor(name) {
		this._name = name;
	}

	/**
	 * Returns the operator name.
	 *
	 * @method getName
	 * @return {String}
	 */
	getName() {
		return this._name;
	}

	/**
	 * Should add all fields touched by this operator to the fieldSet.
	 *
	 * @method getUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Object} fieldSet - Map from field names (dot-separated) to boolean true.  Modify
	 * this by adding additional fields.
	 * @param {Mixed} operatorValue - The value of the operator key.
	 * @param {String} operator - The string name of the operator.
	 * @param {Update} update - The Update object calling this method.
	 */
	getUpdatedFields(fieldSet, operatorValue, operator, update) {
		// This should work for most operators
		for (let dottedProp in operatorValue) {
			fieldSet[dottedProp] = true;
		}
	}

	/**
	 * Should transform all field names by calling transformFn on each field name.  Field names
	 * should be transformed in-place.
	 *
	 * @method transformUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Function} transformFn - Function to call to transform names.  Returns the new name.
	 * @param {String} transformFn.field - Input (original) field name.
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 */
	transformUpdatedFields(transformFn, operatorValue, operator, update) {

	}

	/**
	 * Normalizes operatorValue in-place.
	 * Reference update[key] to set the value if necessary.
	 * Calls #validate when done
	 *
	 * @method normalize
	 * @param {Mixed} operatorValue
	 * @param {String} field
	 * @param {Update} update
	 * @param {Object} options
	 */
	normalize(operatorValue, field, update, options) {
		this.validate(operatorValue, field, update);
	}

	/**
	 * Validate that the operator is valid.
	 *
	 * @method validate
	 * @throws {XError} - On invalid update
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 */
	validate(operatorValue, operator, update) {
		if (!_.isPlainObject(operatorValue)) {
			throw new UpdateValidationError('Value of ' + operator + ' must be an object');
		}
	}

	/**
	 * Apply the update to an object.  Updates should be performed in-place.  For each field to be
	 * updated, call shouldSkip() first to make sure the field isn't being skipped.
	 * You may assume that the input to this function has been validated.
	 *
	 * @method apply
	 * @throws {XError} - On invalid update
	 * @param {Object} obj - The object to update
	 * @param {Function} shouldSkip - Call this with each field name to check if you should skip
	 * updating the field.
	 * @param {String} shouldSkip.field - Field name.
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 * @param {Object} options - Options passed to Update.apply()
	 */
	apply(obj, shouldSkip, operatorValue, operator, update, options) {
		// This strategy should work for most, if not all, update operators; specifically, those that are formed
		// by mapping dotted keys to update parameters. This will iterate over each key, checking shouldSkip along
		// the way, and call _applyToField(obj, field, fieldParams, operator, update, options) for each
		// included field. Subclasses should override _applyToField, or if more complicated logic is required,
		// you may override _apply directly.
		for (let dottedProp in operatorValue) {
			if (shouldSkip(dottedProp)) continue;
			this._applyToField(obj, dottedProp, operatorValue[dottedProp], operator, update, options);
		}
	}

	_applyToField(obj, field, fieldParams, operator, update, options) {

	}

}

module.exports = UpdateOperator;
