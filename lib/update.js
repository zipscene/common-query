let objtools = require('zs-objtools');
let EventEmitter = require('events').EventEmitter;

/**
 * Class that contains a mongo-style update operation and operations that can be performed
 * using the update.
 *
 * @class Update
 * @constructor
 * @param {Object} updateData - Plain object containing the update spec.
 * @param {Boolean} allowFullReplace - By default, updates without any operators are assumed
 * to set each of the fields they specify.  This is in-line with the mongoose default behavior
 * and can prevent costly mistakes.  If allowFullReplace is set to true, an update without
 * update operators is considered to replace the entire object.  This is the default mongodb
 * behavior.
 */
class Update extends EventEmitter {

	constructor(updateData, allowFullReplace) {
		this._updateData = updateData;
		if (!allowFullReplace && !this.hasOperators) {
			this._updateData = {
				$set: objtools.collapseToDotted(updateData);
			};
		}
	}

	/**
	 * Checks if this update contains any update operators.
	 *
	 * @method hasOperators
	 * @throws {XError} - On invalid update
	 * @return {Boolean} - True if the update contains any operators.
	 */
	hasOperators() {
		for (let key in this._updateData) {
			if (key[0] === '$') {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns a list of all operators used in the update.
	 *
	 * @method getOperators
	 * @throws {XError} - On invalid update
	 * @return {String[]} - List of operators, such as "$set"
	 */
	getOperators() {

	}

	/**
	 * Returns an array of fields that are modified by this update.
	 *
	 * @method getUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Object|null} obj - The object to compare against.  Only fields that are
	 * changed from the given object are listed.  If null, all fields potentially touched
	 * by the update are listed.
	 * @param {Object} [options]
	 * @param {Object|Function|String[]} options.skipFields - A list of fields not to include in the output.
	 * These can be specified as an array of strings, a set of strings (map from string to
	 * `true`), or a function(field) that returns a boolean (returning true indicates that
	 * the field should be skipped).
	 * @return {String[]} - List of dot-notation fields that are updated.
	 */
	getUpdatedFields(obj, options) {

	}

	/**
	 * Transforms the name of each field to update according to a given function.
	 *
	 * @method transformUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Function} transformFn - function(field) that returns the transformed field name
	 */
	transformUpdatedFields(transformFn) {

	}

	/**
	 * Validates the update.
	 *
	 * @method validate
	 * @throws {XError} - On invalid update
	 */
	validate() {

	}

	/**
	 * Apply the update to an object.  Updates are made in-place insofar as is possible.
	 *
	 * As this function traverses the object, the `modifiedField` event is emitted on the Update object
	 * with the parameters (field, newValue, obj)
	 *
	 * @method apply
	 * @param {Object} obj - Object to apply the update to.
	 * @param {Object} [options]
	 * @param {Object|Function|String[]} options.skipFields - Fields not to update.  Values of this
	 * are the same as values for the corresponding option in getUpdatedFields() .
	 * @return {Object} - The updated object.
	 */
	apply(obj, options) {

	}

}

module.exports = Update;