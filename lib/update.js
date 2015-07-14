let objtools = require('zs-objtools');
let EventEmitter = require('events').EventEmitter;
let XError = require('xerror');
let UpdateValidationError = require('./update-validation-error');
let _ = require('lodash');

/**
 * Class that contains a mongo-style update operation and operations that can be performed
 * using the update.
 *
 * This class should not be directly instantiated.  Instead, use UpdateFactory.createUpdate().
 *
 * @class Update
 * @constructor
 * @throws {XError} - If update is invalid
 * @param {Object} updateData - Plain object containing the update spec.
 * @param {QueryFactory} updateFactory - UpdateFactory that created this update.
 * @param {Object} [options]
 * @param {Object} [options.skipValidate] - If set, the update will not be validated during construction. You can
 *   still call validate() later. Note that calling apply() with an invalid update results in undefined behavior.
 * @param {Boolean} [options.allowFullReplace] - By default, updates without any operators are assumed
 * to set each of the fields they specify.  This is in-line with the mongoose default behavior
 * and can prevent costly mistakes.  If allowFullReplace is set to true, an update without
 * update operators is considered to replace the entire object.  This is the default mongodb
 * behavior.
 */
class Update extends EventEmitter {

	constructor(updateData, updateFactory, options = {}) {
		super();
		this._updateFactory = updateFactory;
		this._updateData = updateData;
		if (!options.allowFullReplace && !this.hasOperators()) {
			this._updateData = {
				$set: objtools.collapseToDotted(updateData)
			};
		}
		// Validate update now so it doesn't have to happen on every apply
		if (!options.skipValidate) {
			this.normalize(options);
			this.validate();
		}
	}

	/**
	 * Returns the update data this class encapsulates.
	 *
	 * @method getData
	 * @return {Object}
	 */
	getData() {
		return this._updateData;
	}

	/**
	 * Returns the update factory that created this update.
	 *
	 * @method getUpdateFactory
	 * @return {UpdateFactory}
	 */
	getUpdateFactory() {
		return this._updateFactory;
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
	 * Returns whether or not this update is a full replacement of the object.
	 *
	 * @method isFullReplace
	 * @throws {XError} - On invalid update
	 * @return {Boolean} - True if the update is a full replace
	 */
	isFullReplace() {
		return !this.hasOperators();
	}

	/**
	 * Returns a list of all operators used in the update.
	 *
	 * @method getOperators
	 * @throws {XError} - On invalid update
	 * @return {String[]} - List of operators, such as "$set"
	 */
	getOperators() {
		let operatorSet = {};
		for (let key in this._updateData) {
			if (key[0] === '$') {
				operatorSet[key] = true;
			}
		}
		return Object.keys(operatorSet);
	}

	/**
	 * Returns an array of fields that are modified by this update.
	 *
	 * @method getUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Object} [options]
	 * @param {Object|Function|String[]} options.skipFields - A list of fields not to include in the output.
	 * These can be specified as an array of strings, a set of strings (map from string to
	 * `true`), or a function(field) that returns a boolean (returning true indicates that
	 * the field should be skipped).
	 * @return {String[]} - List of dot-notation fields that are updated.
	 */
	getUpdatedFields(options = {}) {
		let update = this._updateData;
		let shouldAllow = Update._makeShouldAllowFn(options.skipFields);
		if (this.isFullReplace()) {
			return _.filter(Object.keys(update), shouldAllow);
		}
		let updateOperators = this._updateFactory._updateOperators;
		let fieldSet = {};
		for (let key in update) {
			if (key[0] !== '$') {
				throw new UpdateValidationError('Update cannot be a mix of operators and non-operators');
			}
			let updateOperator = updateOperators[key];
			if (!updateOperator) {
				throw new UpdateValidationError('Unrecognized updated operator: ' + key);
			}
			updateOperator.getUpdatedFields(fieldSet, update[key], key, this);
		}
		return _.filter(Object.keys(fieldSet), shouldAllow);
	}

	/**
	 * Transforms the name of each field to update according to a given function.  The transformFn
	 * may be passed either root-level fields, or dot-separated fields.  For example, if an update
	 * is { $set: { 'foo.bar': true } }, transformFn may be called with either 'foo' or 'foo.bar'.
	 *
	 * @method transformUpdatedFields
	 * @throws {XError} - On invalid update
	 * @param {Function} transformFn - function(field) that returns the transformed field name
	 */
	transformUpdatedFields(transformFn) {
		let update = this._updateData;
		if (this.isFullReplace()) {
			for (let key in update) {
				let newKey = transformFn(key);
				if (newKey !== key) {
					update[newKey] = update[key];
					delete update[key];
				}
			}
			return;
		}

		let updateOperators = this._updateFactory._updateOperators;
		for (let key in update) {
			if (key[0] !== '$') {
				throw new UpdateValidationError('Update cannot be a mix of operators and non-operators');
			}
			let updateOperator = updateOperators[key];
			if (!updateOperator) {
				throw new UpdateValidationError('Unrecognized updated operator: ' + key);
			}
			updateOperator.transformUpdatedFields(transformFn, update[key], key, this);
		}
	}

	/**
	 * Normalize this update and the values it contains.
	 * This currently does nothing unless a schema is provided.
	 *
	 * @method normalize
	 * @throws {UpdateValidationError} - If an update value cannot be normalized.
	 * @param {Object} [options]
	 * @param {Schema} options.schema - Schema the update is querying against.
	 */
	normalize(options = {}) {
		let updateOperators = this._updateFactory._updateOperators;
	}

	/**
	 * Validates the update.
	 *
	 * @method validate
	 * @throws {XError} - On invalid update
	 */
	validate() {
		let update = this._updateData;
		if (!this.isFullReplace()) {
			let updateOperators = this._updateFactory._updateOperators;
			for (let key in update) {
				if (key[0] !== '$') {
					throw new UpdateValidationError('Update cannot be a mix of operators and non-operators');
				}
				let updateOperator = updateOperators[key];
				if (!updateOperator) {
					throw new UpdateValidationError('Unrecognized updated operator: ' + key);
				}
				updateOperator.validate(update[key], key, this);
			}
		}
		return true;
	}

	/**
	 * Apply the update to an object.  Updates are made in-place insofar as is possible.
	 *
	 * As this function traverses the object, the `modifiedField` event is emitted on the Update object
	 * with the parameters (field, newValue, obj)
	 *
	 * @method apply
	 * @throws {XError} - On invalid update
	 * @param {Object} obj - Object to apply the update to.
	 * @param {Object} [options]
	 * @param {Object|Function|String[]} options.skipFields - Fields not to update.  Values of this
	 * are the same as values for the corresponding option in getUpdatedFields() .
	 * @return {Object} - The updated object.
	 */
	apply(obj, options = {}) {
		let update = this._updateData;
		if (this.isFullReplace()) {
			obj = objtools.syncObject(obj, this._updateData, {
				onField: Update._makeShouldAllowFn(options.skipFields)
			});
		} else {
			let updateOperators = this._updateFactory._updateOperators;
			let shouldSkip = Update._makeShouldSkipFn(options.skipFields);
			for (let key in update) {
				if (key[0] !== '$') {
					throw new UpdateValidationError('Update cannot be a mix of operators and non-operators');
				}
				let updateOperator = updateOperators[key];
				if (!updateOperator) {
					throw new UpdateValidationError('Unrecognized update operator: ' + key);
				}
				updateOperator.apply(obj, shouldSkip, update[key], key, this, options);
			}
		}
		return obj;
	}

	/**
	 * Returns a function that, when called, applies the update to an object and returns it.
	 *
	 * @method createUpdateFn
	 * @throws {XError} - On invalid update
	 * @param {Object} options - Same options as apply()
	 * @return {Function} - A function in the form function(obj) that returns the updated object.
	 */
	createUpdateFn(options) {
		return (obj => this.apply(obj, options));
	}

	/**
	 * Given the skipFields parameter given to several of the methods on this class,
	 * returns a `shouldSkip(field)` function which returns a boolean for a given field.
	 *
	 * The skipFields parameter can be an array of fields to skip, a set (ie, map to `true`)
	 * of fields to skip, a function in the form function(field) that returns whether or not
	 * to skip a field, or a falsy value (which skips nothing).
	 *
	 * @method _makeShouldSkipFn
	 * @static
	 * @private
	 * @param {Mixed} skipFields
	 * @return {Function} - function(field) -> Boolean
	 */
	static _makeShouldSkipFn(skipFields) {
		if (!skipFields) {
			// Not skipping any fields
			return function() {
				return false;
			};
		} else if (_.isFunction(skipFields)) {
			// Function is provided to test skipping fields
			return skipFields;
		} else {
			// TODO: Create an object mask for masking out the fields so parent and child fields
			// are correctly handled.
			let fieldSet;
			if (Array.isArray(skipFields)) {
				fieldSet = {};
				for (let field of skipFields) {
					fieldSet[field] = true;
				}
			} else if (_.isPlainObject(skipFields)) {
				fieldSet = skipFields;
			} else {
				throw new XError(XError.INVALID_ARGUMENT, 'Invalid value for skipFields');
			}
			return function(field) {
				return !!fieldSet[field];
			};
		}
	}

	/**
	 * Inverse of _makeShouldSkipFn
	 */
	static _makeShouldAllowFn(skipFields) {
		let shouldSkip = Update._makeShouldSkipFn(skipFields);
		return function(field) {
			return !shouldSkip(field);
		};
	}

}

module.exports = Update;
