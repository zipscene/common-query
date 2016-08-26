/*eslint no-unused-vars:0*/

const UpdateValidationError = require('./update-validation-error');
const Update = require('./update');
const _ = require('lodash');
const objtools = require('zs-objtools');

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
	 *
	 * @method normalize
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 * @param {Object} options
	 */
	normalize(operatorValue, operator, update, options) {
		this.validate(operatorValue, operator, update);
	}

	/**
	 * Normalizes `Object` operators.
	 * Expects a mapping from operators to fields.
	 *
	 * @method _normalizeObject
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 * @param {Object} options
	 * @since v1.3.0
	 */
	_normalizeObject(operatorValue, operator, update, options) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				update[operator][key] = Update._normalizeValue(key, operatorValue[key], options);
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	/**
	 * Normalizes `Object` operators that contain `Array`s.
	 * Expects a mapping from operators to fields.
	 *
	 * @method _normalizeObjectWithArrays
	 * @param {Mixed} operatorValue
	 * @param {String} operator
	 * @param {Update} update
	 * @param {Object} options
	 * @since v1.3.0
	 */
	_normalizeObjectWithArrays(operatorValue, operator, update, options) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				if (objtools.isPlainObject(operatorValue[key]) && _.isArray(operatorValue[key].$each)) {
					update[operator][key].$each = Update._normalizeValue(key, operatorValue[key].$each, options);
				} else {
					update[operator][key] = Update._normalizeValue(`${key}.$`, operatorValue[key], options);
				}
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
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
		if (!objtools.isPlainObject(operatorValue)) {
			throw new UpdateValidationError(`Value of \`${operator}\` must be an object`);
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

	/**
	 * This is called when composing two update expressions (ie, combining/adding them together).
	 * This function should return the appropriate operator value of composing the two.  It may
	 * modify operatorValue in place but not composeOperatorValue.
	 *
	 * @method compose
	 * @param {Mixed} operatorValue
	 * @param {Mixed} composeOperatorValue - The operator value to compose with operatorValue
	 * @param {Object} updateData - The data at the root of the "recipient" update
	 * @return {Mixed} - The result of the compose
	 */
	compose(operatorValue = {}, composeOperatorValue, updateData) {
		// Sanity checks
		if (composeOperatorValue === null || composeOperatorValue === undefined) {
			return operatorValue;
		}

		if (typeof composeOperatorValue === 'object') {
			for (let key in composeOperatorValue) {
				this._composeUpdateValue(key, operatorValue, composeOperatorValue, updateData);
			}
			return !objtools.isEmptyObject(operatorValue) ? operatorValue : null;
		}

		throw new UpdateValidationError('Could not combine update expressions');
	}

	/**
	 * This is called when combining two update exporession fields together, this function is
	 * overwritten by serveral of the update operators.
	 *
	 * @method _composeUpdateValue
	 * @private
	 * @param {String} key - the field key to the data we are merging together
	 * @param {Mixed} operatorValue
	 * @param {Mixed} composeOperatorValue - The operator value to compose with operatorValue
	 * @param {Object} updateData - The data at the root of the "recipient" update
	 * @return {Mixed} - The result sets the proper key to the operator
	 */
	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		operatorValue[key] = composeOperatorValue[key];
	}

	_applyToField(obj, field, fieldParams, operator, update, options) {

	}

}


module.exports = UpdateOperator;
