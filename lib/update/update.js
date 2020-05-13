// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const objtools = require('objtools');
const { EventEmitter } = require('events');
const XError = require('xerror');
const UpdateValidationError = require('./update-validation-error');
const _ = require('lodash');
const commonQuery = require('../index');

/**
 * Class that contains a mongo-style update operation and operations that can be performed
 * using the update.
 *
 * This class should not be directly instantiated.  Instead, use UpdateFactory.createUpdate().
 *
 * @class Update
 * @constructor
 * @throws {XError} - If update is invalid
 * @param {Object|Update} updateData - Object containing the update spec.
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

		if (typeof updateData.getData === 'function') updateData = objtools.deepCopy(updateData.getData());

		this._updateFactory = updateFactory;
		this._updateData = updateData;

		if (!options.allowFullReplace && !this.hasOperators() && Object.keys(this._updateData).length > 0) {
			this._updateData = {
				$set: objtools.collapseToDotted(updateData)
			};
		}
		// Normalize/validate update now so it doesn't have to happen on every apply
		if (!options.skipValidate) {
			this.normalize(options);
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
				throw new UpdateValidationError(`Unrecognized updated operator: ${key}`);
			}
			updateOperator.getUpdatedFields(fieldSet, update[key], key, this);
		}
		return _.filter(Object.keys(fieldSet), shouldAllow);
	}

	/**
	 * Transforms the name of each field to update according to a given function.
	 *
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
				throw new UpdateValidationError(`Unrecognized updated operator: ${key}`);
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
	 * @param {Object} [options] - Options consumed by Schema#normalize
	 *   @param {Schema} options.schema - Schema the update is querying against.
	 */
	normalize(options = {}) {
		let update = this._updateData;

		if (this.isFullReplace()) {
			if (options.schema) options.schema.normalize(update, options);
		} else {
			let updateOperators = this._updateFactory._updateOperators;
			for (let operator in update) {
				if (operator[0] !== '$') {
					throw new UpdateValidationError('Update cannot be a mix of operators and non-operators');
				}
				let updateOperator = updateOperators[operator];
				if (!updateOperator) {
					throw new UpdateValidationError(`Unrecognized updated operator: ${operator}`);
				}
				updateOperator.normalize(update[operator], operator, update, options);
			}
		}
	}

	/**
	 * Normalize a value at one place in an update.
	 *
	 * @method _normalizeValue
	 * @throws {UpdateValidationError} - An error if the field is invalid according to the schema.
	 * @param {String} field - Path to the field, as in the update.
	 * @param {Mixed} value - Value to normalize.
	 * @param {Object} options - This can contain the below options in addition to all options
	 *   accepted by Schema#normalize .
	 *   @param {Schema} options.schema - Schema to normalize against
	 * @return {Mixed} - Normalized value.
	 */
	static _normalizeValue(field, value, options = {}) {
		if (options.schema && value !== null && value !== undefined) {
			let subschema = options.schema._createSubschema(options.schema.getSubschemaData(field));

			let result;
			try {
				result = subschema.normalize(value, options);
			} catch (ex) {
				throw new UpdateValidationError(`Invalid value at update path: ${field}`, ex);
			}
			return result;
		} else {
			return value;
		}
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
					throw new UpdateValidationError(`Unrecognized update operator: ${key}`);
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
					throw new UpdateValidationError(`Unrecognized update operator: ${key}`);
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
		return (obj) => this.apply(obj, options);
	}

	/**
	 * Adds another update to this update such that the result of the update would be the same as
	 * if the updates were applied in sequence.
	 *
	 * @methods composeUpdate
	 * @param {Update|Object} update
	 * @param {Object} [options]
	 * @param {Boolean} [options.allowFullReplace]
	 * @return {Update} - Returns `this` for chaining
	 */
	composeUpdate(update, options = {}) {
		if (typeof update.getData !== 'function') {
			update = new Update(update, this._updateFactory, options);
		}

		const updateOperators = this._updateFactory._updateOperators;
		let updateData = update.getData();
		let currentUpdate = this.getData();
		for (let operator in updateData) {
			let updateOperator = updateOperators[operator];
			let opValue = updateData[operator];
			let currentOpValue = currentUpdate[operator];
			let mergedOperators = updateOperator.compose(currentOpValue, opValue, this.getData());
			if (mergedOperators !== null) {
				this._updateData[operator] = mergedOperators;
			} else if (this._updateData[operator]) {
				delete this._updateData[operator];
			}
		}
		return this;
	}

	/**
	 * Static method to compose a variable number of updates into one.
	 *
	 * @method compose
	 * @static
	 * @param {...{Update|Object}[]} - Variable number of updates to combine.  Can also be
	 *   an array of updates.
	 * @return {Update}
	 */
	static compose(...updates) {
		// Determine an update factory to use.
		let factory;
		for (let update of updates) {
			if (factory) break;
			if (Array.isArray(update)) {
				for (let subupdate of update) {
					if (factory) break;
					if (typeof subupdate.apply === 'function') {
						factory = subupdate._updateFactory;
					}
				}
			} else {
				if (typeof update.apply === 'function') {
					factory = update._updateFactory;
				}
			}
		}
		if (!factory) factory = commonQuery.defaultUpdateFactory;
		let ret = factory.createUpdate({});
		for (let update of updates) {
			if (Array.isArray(update)) {
				for (let subupdate of update) {
					if (!ret) ret = new Update({}, subupdate._updateFactory);
					ret.composeUpdate(subupdate);
				}
			} else {
				if (!ret) ret = new Update({}, update._updateFactory);
				ret.composeUpdate(update);
			}
		}
		return ret;
	}

	/**
	 * Create an update from the recursive diff of two objects
	 *
	 * @method createFromDiff
	 * @static
	 * @param {Object} from
	 * @param {Object} to
	 * @return {Object} An update query to patch `from` to `to`
	 * @since v1.3.0
	 */
	static createFromDiff(from, to) {
		let patch = {};
		Update._buildUpdateFromDiff(from, to, patch);
		return patch;
	}

	/**
	 * Recursively build an update from comparing two values
	 *
	 * @method _buildUpdateFromDiff
	 * @static
	 * @private
	 * @param {Object|Array} from
	 * @param {Object|Array} to
	 * @since v1.3.0
	 */
	static _buildUpdateFromDiff(from, to, patch, initialPath = '') {
		// Parameter sanity checks
		if (to === null || to === undefined) to = Array.isArray(from) ? [] : {};
		if (from === null || from === undefined) from = Array.isArray(to) ? [] : {};
		if (typeof from !== 'object' || typeof to !== 'object' || (!initialPath && Array.isArray(to))) {
			throw new Error('Invalid parameter types for _buildUpdateFromDiff');
		}

		if (Array.isArray(from) !== Array.isArray(to)) {
			// If array-ness has changed, need to do a full replacement
			if (!initialPath) throw new Error('_buildUpdateFromDiff root path cannot be array');
			ensureObject(patch, '$set');
			patch.$set[initialPath] = to;
		} else if (Array.isArray(to)) {
			// If syncing arrays, there are a few cases to worry about.
			// 1) New array is longer than old array, so new elements need to be pushed - handled with $push
			// 2) New array is shorter than old array, so needs to be truncated - also handled with $push
			// 3) One or more existing elements in the array are changed - can be handled with $set
			// 4) New array is different length (longer or shorter), AND also some elements have changed - cannot do this at the same time as push, so in this case, need to replace the entire array
			let arrayLengthChanged = from.length !== to.length;
			let minArrayLen = Math.min(from.length, to.length);
			let elementsChanged = !objtools.deepEquals((from.length === minArrayLen) ? from : from.slice(0, minArrayLen), (to.length === minArrayLen) ? to : to.slice(0, minArrayLen));
			if (arrayLengthChanged && elementsChanged) {
				// Need to replace entire array
				ensureObject(patch, '$set');
				patch.$set[initialPath] = to;
			} else if (elementsChanged) {
				// Sync each element
				for (let idx = 0; idx < to.length; idx++) {
					syncValues(from[idx], to[idx], initialPath ? (initialPath + '.' + idx) : ('' + idx));
				}
			} else if (arrayLengthChanged) {
				if (to.length > from.length) {
					// Need to push new elements
					ensureObject(patch, '$push');
					patch.$push[initialPath] = {
						$each: to.slice(from.length)
					};
				} else {
					// Need to truncate array
					ensureObject(patch, '$push');
					patch.$push[initialPath] = {
						$each: [],
						$slice: to.length
					};
				}
			} // else no sync needed
		} else {
			// Syncing objects (not arrays)
			// Check for removed properties
			for (let key in from) {
				if (to[key] === undefined) {
					ensureObject(patch, '$unset');
					let keyPath = initialPath ? (initialPath + '.' + key) : key;
					patch.$unset[keyPath] = true;
				}
			}
			// Sync each key
			for (let key in to) {
				syncValues(from[key], to[key], initialPath ? (initialPath + '.' + key) : key);
			}
		}

		function syncValues(fromVal, toVal, path) {
			if (typeof fromVal === 'object' && typeof toVal === 'object' && fromVal && toVal) {
				Update._buildUpdateFromDiff(fromVal, toVal, patch, path);
			} else if (toVal === undefined) {
				ensureObject(patch, '$unset');
				patch.$unset[path] = true;
			} else if (!objtools.deepEquals(fromVal, toVal)) {
				ensureObject(patch, '$set');
				patch.$set[path] = toVal;
			}
		}
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
		} else if (typeof skipFields === 'function') {
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
			} else if (objtools.isPlainObject(skipFields)) {
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

/**
 * Ensure that a value is an object
 *
 * @method ensureObject
 * @param {Object} value
 * @param {String} key - the key of the value to check and set
 * @return {Boolean} - Whether the item was already an object
 * @since v1.3.0
 */
function ensureObject(value, key) {
	let wasObject = (value[key] && typeof value[key] === 'object');
	if (!wasObject) value[key] = {};
	return wasObject;
}
