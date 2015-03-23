let UpdateOperator = require('./update-operator');
let UpdateValidationError = require('./update-validation-error');
let objtools = require('zs-objtools');
let _ = require('lodash');

class UpdateOperatorSet extends UpdateOperator {

	constructor(name) {
		super(name || '$set');
	}

	_applyToField(obj, field, fieldParams) {
		objtools.setPath(obj, field, fieldParams);
	}
}
exports.UpdateOperatorSet = UpdateOperatorSet;

class UpdateOperatorUnset extends UpdateOperator {

	constructor(name) {
		super(name || '$unset');
	}

	_applyToField(obj, field) {
		objtools.deletePath(obj, field);
	}
}
exports.UpdateOperatorUnset = UpdateOperatorUnset;

class UpdateOperatorInc extends UpdateOperator {

	constructor(name) {
		super(name || '$inc');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (!_.isNumber(operatorValue[dottedProp])) {
				throw new UpdateValidationError('Value of $inc must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, incAmount) {
		let currentValue = objtools.getPath(obj, field);
		if (!_.isNumber(currentValue)) throw new UpdateValidationError('$inc can only apply to numbers');
		objtools.setPath(obj, field, currentValue+incAmount);
	}
}
exports.UpdateOperatorInc = UpdateOperatorInc;

class UpdateOperatorMul extends UpdateOperator {

	constructor(name) {
		super(name || '$mul');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (!_.isNumber(operatorValue[dottedProp])) {
				throw new UpdateValidationError('Value of $mul must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, mulAmount) {
		let currentValue = objtools.getPath(obj, field);
		if (!_.isNumber(currentValue)) throw new UpdateValidationError('$mul can only apply to numbers');
		objtools.setPath(obj, field, currentValue*mulAmount);
	}
}
exports.UpdateOperatorMul = UpdateOperatorMul;

class UpdateOperatorRename extends UpdateOperator {

	constructor(name) {
		super(name || '$rename');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (!_.isString(operatorValue[dottedProp])) {
				throw new UpdateValidationError(
					'Value of $rename must map dotted properties to new dotted properties (strings)'
				);
			}
		}
	}

	_applyToField(obj, field, toProp) {
		let value = objtools.getPath(obj, field);
		if (value !== undefined) {
			objtools.setPath(obj, toProp, value);
		}
		objtools.deletePath(obj, field);
	}
}
exports.UpdateOperatorRename = UpdateOperatorRename;

class UpdateOperatorMin extends UpdateOperator {

	constructor(name) {
		super(name || '$min');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (!_.isNumber(operatorValue[dottedProp])) {
				throw new UpdateValidationError('Value of $min must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, minValue) {
		let currentValue = objtools.getPath(obj, field);
		if (!_.isNumber(currentValue)) throw new UpdateValidationError('$min can only apply to numbers');
		if (minValue < currentValue) {
			objtools.setPath(obj, field, minValue);
		}
	}
}
exports.UpdateOperatorMin = UpdateOperatorMin;

class UpdateOperatorMax extends UpdateOperator {

	constructor(name) {
		super(name || '$max');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (!_.isNumber(operatorValue[dottedProp])) {
				throw new UpdateValidationError('Value of $max must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, maxValue) {
		let currentValue = objtools.getPath(obj, field);
		if (!_.isNumber(currentValue)) throw new UpdateValidationError('$min can only apply to numbers');
		if (maxValue > currentValue) {
			objtools.setPath(obj, field, maxValue);
		}
	}
}
exports.UpdateOperatorMax = UpdateOperatorMax;

class UpdateOperatorAddToSet extends UpdateOperator {

	constructor(name) {
		super(name || '$addToSet');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			let propValue = operatorValue[dottedProp];
			if (propValue && propValue.$each) {
				if (!Array.isArray(propValue.$each)) {
					throw new UpdateValidationError('Value of $each must be an array');
				}
			}
		}
	}

	_applyToField(obj, field, value) {
		let array = objtools.getPath(obj, field);
		let toPush;
		if (!Array.isArray(array)) throw new UpdateValidationError('$addToSet can only apply to arrays');
		if (!value || !value.$each) {
			// Just one value
			toPush = [ value ];
		} else {
			// $each is an array of value to push
			toPush = value.$each;
		}
		// Check each element individually
		for (let newElem of toPush) {
			let isUnique = true;
			for (let existingElem of array) {
				if (objtools.deepEquals(newElem, existingElem)) {
					isUnique = false;
					break;
				}
			}
			if (isUnique) {
				array.push(newElem);
			}
		}
	}
}
exports.UpdateOperatorAddToSet = UpdateOperatorAddToSet;

class UpdateOperatorPush extends UpdateOperator {

	constructor(name) {
		super(name || '$push');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			let propValue = operatorValue[dottedProp];
			if (propValue && propValue.$each) {
				if (!Array.isArray(propValue.$each)) {
					throw new UpdateValidationError('Value of $each must be an array');
				}
			}
		}
	}

	_applyToField(obj, field, value) {
		let array = objtools.getPath(obj, field);
		let toPush;
		if (!Array.isArray(array)) throw new UpdateValidationError('$push can only apply to arrays');
		if (!value || !value.$each) {
			// Just one value
			toPush = [ value ];
		} else {
			// $each is an array of value to push
			toPush = value.$each;
		}
		// Push everything
		array.push.apply(array, toPush);
	}
}
exports.UpdateOperatorPush = UpdateOperatorPush;

class UpdateOperatorPop extends UpdateOperator {

	constructor(name) {
		super(name || '$pop');
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			let propValue = operatorValue[dottedProp];
			if (propValue !== -1 && propValue !== 1) {
				throw new UpdateValidationError('Property values of $pop must be 1 or -1');
			}
		}
	}

	_applyToField(obj, field, value) {
		let array = objtools.getPath(obj, field);
		if (!Array.isArray(array)) throw new UpdateValidationError('$pop can only apply to arrays');
		if (array.length === 0) return;  // Do nothing if array is empty
		if (value === 1) {
			array = array.slice(0, -1);
		} else if (value === -1) {
			array = array.slice(1);
		}
		objtools.setPath(obj, field, array);
	}
}
exports.UpdateOperatorPop = UpdateOperatorPop;
