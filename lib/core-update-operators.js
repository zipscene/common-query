let UpdateOperator = require('./update-operator');
let UpdateValidationError = require('./update-validation-error');
let objtools = require('zs-objtools');
let _ = require('lodash');

class UpdateOperatorSet extends UpdateOperator {

	constructor(name) {
		super(name || '$set');
	}

	apply(obj, shouldSkip, operatorValue) {
		if (!_.isPlainObject(operatorValue)) {
			throw new UpdateValidationError('Value of $set must be an object');
		}
		for (let dottedProp in operatorValue) {
			let toSet = operatorValue[dottedProp];
			objtools.setPath(obj, dottedProp, toSet);
		}
	}
}
exports.UpdateOperatorSet = UpdateOperatorSet;

class UpdateOperatorUnset extends UpdateOperator {

	constructor(name) {
		super(name || '$unset');
	}

	apply(obj, shouldSkip, operatorValue) {
		if (!_.isPlainObject(operatorValue)) {
			throw new UpdateValidationError('Value of $unset must be an object');
		}
		for (let dottedProp in operatorValue) {
			objtools.deletePath(obj, dottedProp);
		}
	}
}
exports.UpdateOperatorUnset = UpdateOperatorUnset;