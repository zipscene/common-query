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
		for (let dottedProp in operatorValue) {
			objtools.deletePath(obj, dottedProp);
		}
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let incAmount = operatorValue[dottedProp];
			let currentValue = objtools.getPath(obj, dottedProp);
			if (!_.isNumber(currentValue)) throw new UpdateValidationError('$inc can only apply to numbers');
			objtools.setPath(obj, dottedProp, currentValue+incAmount);
		}
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let mulAmount = operatorValue[dottedProp];
			let currentValue = objtools.getPath(obj, dottedProp);
			if (!_.isNumber(currentValue)) throw new UpdateValidationError('$mul can only apply to numbers');
			objtools.setPath(obj, dottedProp, currentValue*mulAmount);
		}
	}
}
exports.UpdateOperatorMul = UpdateOperatorMul;

class UpdateOperatorRename extends UpdateOperator {

	constructor(name) {
		super(name || '$rename');
	}

	apply(obj, shouldSkip, operatorValue) {
		for (let fromProp in operatorValue) {
			let toProp = operatorValue[fromProp];
			let value = objtools.getPath(obj, fromProp);
			if (value !== undefined) {
				objtools.setPath(obj, toProp, value);
			}
			objtools.deletePath(obj, fromProp);
		}
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let minValue = operatorValue[dottedProp];
			let currentValue = objtools.getPath(obj, dottedProp);
			if (!_.isNumber(currentValue)) throw new UpdateValidationError('$min can only apply to numbers');
			if (minValue < currentValue) {
				objtools.setPath(obj, dottedProp, minValue);
			}
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let maxValue = operatorValue[dottedProp];
			let currentValue = objtools.getPath(obj, dottedProp);
			if (!_.isNumber(currentValue)) throw new UpdateValidationError('$min can only apply to numbers');
			if (maxValue > currentValue) {
				objtools.setPath(obj, dottedProp, maxValue);
			}
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let value = operatorValue[dottedProp];
			let array = objtools.getPath(obj, dottedProp);
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let value = operatorValue[dottedProp];
			let array = objtools.getPath(obj, dottedProp);
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

	apply(obj, shouldSkip, operatorValue) {
		for (let dottedProp in operatorValue) {
			let value = operatorValue[dottedProp];
			let array = objtools.getPath(obj, dottedProp);
			if (!Array.isArray(array)) throw new UpdateValidationError('$pop can only apply to arrays');
			if (array.length === 0) continue;  // Do nothing if array is empty
			if (value === 1) {
				array = array.slice(0, -1);
			} else if (value === -1) {
				array = array.slice(1);
			}
			objtools.setPath(obj, dottedProp, array);
		}
	}
}
exports.UpdateOperatorPop = UpdateOperatorPop;
