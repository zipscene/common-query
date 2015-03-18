let Update = require('./update');
let _ = require('lodash');

/**
 * This class is responsible for creating Update objects
 * that encapsulate and execute update.  This class also maintains the set of
 * operators that can be used in updates, and provides methods for registering new
 * operators.
 *
 * @class UpdateFactory
 * @constructor
 */
class UpdateFactory {

	constructor() {
		// Map from update operator name (eg. "$inc") to update operator object
		this._updateOperators = {};

		// Load operators
		this._loadUpdateOperators(require('./core-update-operators'));
	}

	_loadUpdateOperators(constructors) {
		for (let Constructor of _.values(constructors)) {
			let operator = new Constructor();
			this.registerUpdateOperator(operator.getName(), operator);
		}
	}

	/**
	 * Creates an update object given an update specification data.
	 *
	 * @method createUpdate
	 * @param {Object} updateData - The raw update
	 * @param {Boolean} allowFullReplace - By default, updates without any operators are assumed
	 * to set each of the fields they specify.  This is in-line with the mongoose default behavior
	 * and can prevent costly mistakes.  If allowFullReplace is set to true, an update without
	 * update operators is considered to replace the entire object.  This is the default mongodb
	 * behavior.
	 * @return {Update}
	 */
	createQuery(updateData, allowFullReplace) {
		return new Update(updateData, allowFullReplace, this);
	}

	/**
	 * Registers a new, custom update operator.
	 *
	 * @method registerUpdateOperator
	 * @param {String} name - Update operator name, eg, "$and"
	 * @param {UpdateOperator} updateOperator
	 */
	registerUpdateOperator(name, updateOperator) {
		this._updateOperators[name] = updateOperator;
	}

	/**
	 * Fetches an update operator object by name.
	 *
	 * @method getUpdateOperator
	 * @param {String} name - Update operator name, including the $
	 * @return {UpdateOperator} - UpdateOperator object, or undefined
	 */
	getUpdateOperator(name) {
		return this._updateOperators[name];
	}

}

module.exports = UpdateFactory;
