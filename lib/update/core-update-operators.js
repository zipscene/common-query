const Update = require('./update');
const UpdateOperator = require('./update-operator');
const UpdateValidationError = require('./update-validation-error');
const ComposeUpdateError = require('./compose-update-error');
const ObjectMatchError = require('../object-match-error');
const objtools = require('zs-objtools');
const _ = require('lodash');

class UpdateOperatorSet extends UpdateOperator {

	constructor(name) {
		super(name || '$set');
	}

	normalize(operatorValue, operator, update, options) {
		this._normalizeObject(operatorValue, operator, update, options);
	}

	_applyToField(obj, field, fieldParams) {
		objtools.setPath(obj, field, fieldParams);
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (updateData.$unset && updateData.$unset[key]) delete updateData.$unset[key];
		if (objtools.isEmptyObject(updateData.$unset)) delete updateData.$unset;
		operatorValue[key] = composeOperatorValue[key];
	}

}
exports.UpdateOperatorSet = UpdateOperatorSet;

class UpdateOperatorUnset extends UpdateOperator {

	constructor(name) {
		super(name || '$unset');
	}

	normalize(operatorValue, operator, update/*, options*/) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				update[operator][key] = true;
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	_applyToField(obj, field) {
		objtools.deletePath(obj, field);
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (updateData.$set && updateData.$set[key]) delete updateData.$set[key];
		if (objtools.isEmptyObject(updateData.$set)) delete updateData.$set;
		operatorValue[key] = composeOperatorValue[key];
	}

}
exports.UpdateOperatorUnset = UpdateOperatorUnset;

class UpdateOperatorInc extends UpdateOperator {

	constructor(name) {
		super(name || '$inc');
	}

	normalize(operatorValue, operator, update/*, options*/) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				let numericValue = +operatorValue[key];
				if (!isNaN(numericValue)) update[operator][key] = numericValue;
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (typeof operatorValue[dottedProp] !== 'number') {
				throw new UpdateValidationError('Value of $inc must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, incAmount) {
		let currentValue = objtools.getPath(obj, field);
		if (typeof currentValue !== 'number') throw new ObjectMatchError('$inc can only apply to numbers');
		objtools.setPath(obj, field, currentValue + incAmount);
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue) {
		if (!operatorValue[key]) {
			operatorValue[key] = composeOperatorValue[key];
		} else {
			let sum = operatorValue[key] + composeOperatorValue[key];
			// handle case for a 0;
			if (sum) {
				operatorValue[key] = sum;
			} else {
				delete operatorValue[key];
			}
		}
	}
}

exports.UpdateOperatorInc = UpdateOperatorInc;

class UpdateOperatorMul extends UpdateOperator {

	constructor(name) {
		super(name || '$mul');
	}

	normalize(operatorValue, operator, update/*, options*/) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				let numericValue = +operatorValue[key];
				if (!isNaN(numericValue)) update[operator][key] = numericValue;
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (typeof operatorValue[dottedProp] !== 'number') {
				throw new UpdateValidationError('Value of $mul must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, mulAmount) {
		let currentValue = objtools.getPath(obj, field);
		if (typeof currentValue !== 'number') throw new ObjectMatchError('$mul can only apply to numbers');
		objtools.setPath(obj, field, currentValue * mulAmount);
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue) {
		if (!operatorValue[key]) {
			operatorValue[key] = composeOperatorValue[key];
		} else {
			operatorValue[key] *= composeOperatorValue[key];
		}
	}

}
exports.UpdateOperatorMul = UpdateOperatorMul;

class UpdateOperatorMin extends UpdateOperator {

	constructor(name) {
		super(name || '$min');
	}

	normalize(operatorValue, operator, update/*, options*/) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				let numericValue = +operatorValue[key];
				if (!isNaN(numericValue)) update[operator][key] = numericValue;
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (typeof operatorValue[dottedProp] !== 'number') {
				throw new UpdateValidationError('Value of $min must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, minValue) {
		let currentValue = objtools.getPath(obj, field);
		if (typeof currentValue !== 'number') throw new ObjectMatchError('$min can only apply to numbers');
		if (minValue < currentValue) {
			objtools.setPath(obj, field, minValue);
		}
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (operatorValue[key] === undefined || operatorValue[key] > composeOperatorValue[key]) {
			operatorValue[key] = composeOperatorValue[key];
		}
	}

}
exports.UpdateOperatorMin = UpdateOperatorMin;

class UpdateOperatorMax extends UpdateOperator {

	constructor(name) {
		super(name || '$max');
	}

	normalize(operatorValue, operator, update/*, options*/) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				let numericValue = +operatorValue[key];
				if (!isNaN(numericValue)) update[operator][key] = numericValue;
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (typeof operatorValue[dottedProp] !== 'number') {
				throw new UpdateValidationError('Value of $max must map dotted properties to numbers');
			}
		}
	}

	_applyToField(obj, field, maxValue) {
		let currentValue = objtools.getPath(obj, field);
		if (typeof currentValue !== 'number') throw new ObjectMatchError('$max can only apply to numbers');
		if (maxValue > currentValue) {
			objtools.setPath(obj, field, maxValue);
		}
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (operatorValue[key] === undefined || operatorValue[key] < composeOperatorValue[key]) {
			operatorValue[key] = composeOperatorValue[key];
		}
	}
}
exports.UpdateOperatorMax = UpdateOperatorMax;

class UpdateOperatorRename extends UpdateOperator {

	constructor(name) {
		super(name || '$rename');
	}

	normalize(operatorValue, operator, update, options) {
		this._normalizeObject(operatorValue, operator, update, options);
	}

	validate(operatorValue, operator, update) {
		super.validate(operatorValue, operator, update);
		for (let dottedProp in operatorValue) {
			if (typeof operatorValue[dottedProp] !== 'string') {
				throw new UpdateValidationError(
					'Value of $rename must map dotted properties to new dotted properties (strings)'
				);
			}
		}
	}

	_applyToField(obj, field, toProp) {
		let value = objtools.getPath(obj, field);
		objtools.deletePath(obj, field);
		if (value !== undefined) {
			objtools.setPath(obj, toProp, value);
		}
	}

}
exports.UpdateOperatorRename = UpdateOperatorRename;

class UpdateOperatorAddToSet extends UpdateOperator {

	constructor(name) {
		super(name || '$addToSet');
	}

	normalize(operatorValue, operator, update, options) {
		this._normalizeObjectWithArrays(operatorValue, operator, update, options);
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
		if (array === undefined) {
			array = [];
			objtools.setPath(obj, field, array);
		}
		let toPush;
		if (!Array.isArray(array)) throw new ObjectMatchError('$addToSet can only apply to arrays');
		if (!value || !value.$each) {
			// Just one value
			toPush = [ value ];
		} else {
			// $each is an array of value to push
			toPush = value.$each;
		}
		if (toPush.length === 0) return;  // Nothing to do

		// Two strategies here. Either build a set of existing elements to check against (for simple types),
		// or do full double traversal of both arrays (for complex types)
		let entityType;  // Will assign 1 for number, 2 for string, 0 for other
		let isSimple = true;
		let allElements = array.concat(toPush);
		for (let elem of allElements) {
			let elemType;
			if (typeof elem === 'number') {
				elemType = 1;
			} else if (typeof elem === 'string') {
				elemType = 2;
			} else {
				isSimple = false;
				break;
			}

			if (entityType === undefined) {
				entityType = elemType;
			} else if (entityType !== elemType) {
				isSimple = false;
				break;
			}
		}

		if (isSimple) {
			// Construct a set and use it to check for uniqueness
			let elemSet = {};
			for (let elem of array) {
				elemSet[elem] = true;
			}
			for (let newElem of toPush) {
				if (!elemSet[newElem]) {
					array.push(newElem);
					elemSet[newElem] = true;
				}
			}
		} else {
			// Need to do full iteration over everything
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

	_composeUpdateValue(key, operatorValue, composeOperatorValue) {
		let comOpValue = composeOperatorValue[key];
		if (operatorValue[key]) {
			let opValue = operatorValue[key].$each ? operatorValue[key].$each : [ operatorValue[key] ];
			let composeValue = comOpValue.$each ? comOpValue.$each : [ comOpValue ];
			operatorValue[key] = { $each: opValue.concat(composeValue) };
		} else {
			operatorValue[key] = composeOperatorValue[key];
		}
	}

}
exports.UpdateOperatorAddToSet = UpdateOperatorAddToSet;

class UpdateOperatorPush extends UpdateOperator {

	constructor(name) {
		super(name || '$push');
	}

	normalize(operatorValue, operator, update, options) {
		if (objtools.isPlainObject(operatorValue)) {
			for (let key in operatorValue) {
				if (objtools.isPlainObject(operatorValue[key]) && _.isArray(operatorValue[key].$each)) {
					update[operator][key].$each = Update._normalizeValue(key, operatorValue[key].$each, options);
				} else {
					update[operator][key] = Update._normalizeValue(key, operatorValue[key], options);
				}
			}
		} else {
			this.validate(operatorValue, operator, update);
		}
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
		if (!Array.isArray(array)) throw new ObjectMatchError('$push can only apply to arrays');
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

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (updateData.$pop && updateData.$pop[key]) {
			throw new ComposeUpdateError(`Cannot have a key that is both a $push and a $pop`, updateData);
		}
		let comOpValue = composeOperatorValue[key];
		if (operatorValue[key]) {
			let opValue = operatorValue[key].$each ? operatorValue[key].$each : [ operatorValue[key] ];
			let composeValue = comOpValue.$each ? comOpValue.$each : [ comOpValue ];
			operatorValue[key] = { $each: opValue.concat(composeValue) };
		} else {
			operatorValue[key] = composeOperatorValue[key];
		}
	}


}
exports.UpdateOperatorPush = UpdateOperatorPush;

class UpdateOperatorPop extends UpdateOperator {

	constructor(name) {
		super(name || '$pop');
	}

	normalize(operatorValue, operator, update, options) {
		this._normalizeObject(operatorValue, operator, update, options);
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
		if (!Array.isArray(array)) throw new ObjectMatchError('$pop can only apply to arrays');
		if (array.length === 0) return;  // Do nothing if array is empty
		if (value === 1) {
			array = array.slice(0, -1);
		} else if (value === -1) {
			array = array.slice(1);
		}
		objtools.setPath(obj, field, array);
	}

	_composeUpdateValue(key, operatorValue, composeOperatorValue, updateData) {
		if (updateData.$push && updateData.$push[key]) {
			throw new ComposeUpdateError(
				`Cannot have a key that is both a $push and a $pop`,
				updateData
			);
		}

		if (operatorValue[key] && composeOperatorValue[key] && composeOperatorValue[key] !== operatorValue[key]) {
			throw new ComposeUpdateError(
				`$pop cannot handle -1 and 1 on ${key}`,
				{ currentUpdate: operatorValue[key], update: composeOperatorValue[key] }
			);
		}
		operatorValue[key] = composeOperatorValue[key];
	}

}
exports.UpdateOperatorPop = UpdateOperatorPop;
