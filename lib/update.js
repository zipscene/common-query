var objtools = require('objtools');
var getPath = objtools.getPath;
var setPath = objtools.setPath;
var deletePath = objtools.deletePath;
var ZSError = require('zs-error');
var $ = require('zs-jq-stub');

function getUpdatedFields(objType, update) {
	if(!update || typeof update != 'object') return [];
	if(updateHasOperators(update)) {
		var fieldSet = {};
		for(var operator in update) {
			var opParam = update[operator];
			if(opParam && typeof opParam == 'object') {
				for(var field in opParam) {
					fieldSet[field] = true;
				}
			}
		}
		return Object.keys(fieldSet);
	} else {
		return Object.keys(update);
	}
}
exports.getUpdatedFields = getUpdatedFields;

function transformUpdatedFields(objType, update, transform) {
	if(!update || typeof update != 'object') return update;
	if(updateHasOperators(update)) {
		update = $.extend(true, {}, update);
		for(var operator in update) {
			var opParam = update[operator];
			if(opParam && typeof opParam == 'object') {
				for(var okey in opParam) {
					opParam[transform(okey)] = opParam[okey];
				}
			}
		}
		return update;
	} else {
		var newUpdate = {};
		for(var key in update) {
			newUpdate[transform(key)] = update[key];
		}
		return newUpdate;
	}
}
exports.transformUpdatedFields = transformUpdatedFields;

function validateUpdate(objType, update, allowedOperators, extraOperators) {
	if(!update || typeof update != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Update must be object');

	if(!updateHasOperators(update)) return true;

	if(!allowedOperators) allowedOperators = [ '$inc', '$mul', '$rename', '$set', '$unset', '$min', '$max', '$currentDate', '$addToSet', '$pop', '$push' ];
	if(extraOperators) allowedOperators = allowedOperators.concat(extraOperators);
	var allowedOpSet = {};
	allowedOperators.forEach(function(op) {
		allowedOpSet[op] = true;
	});

	// half-assed update validation ... the main applyUpdate function will catch most things
	for(var operator in update) {
		if(!allowedOpSet[operator]) {
			return new ZSError(ZSError.INVALID_QUERY, 'Update contains invalid, disallowed, or unknown operator: ' + operator);
		}
	}
	return true;
}
exports.validateUpdate = validateUpdate;

function updateHasOperators(update) {
	var hasOperator = false;
	for(var key in update) {
		if(key[0] == '$') hasOperator = true;
	}
	return hasOperator;
}
exports.updateHasOperators = updateHasOperators;

function applyUpdate(objType, doc, update, options) {
	var field, fieldVal, paramVal, i, eachVals;
	if(!options) options = {};

	if(!update || typeof update != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Update must be object');
	if(!doc || typeof doc != 'object') return new ZSError(ZSError.INTERNAL_ERROR, 'Document must be object');

	// If the update contains no operators, assume it's a $set
	if(!updateHasOperators(update)) {
		if(options.allowFullReplace) {
			return update;	// replace whole document
		} else {
			update = {
				$set: update
			};
		}
	}

	// Handle each update operator
	for(var operator in update) {

		// Make sure the operator is actually an operator
		if(operator[0] != '$') return new ZSError(ZSError.INVALID_QUERY, 'Update cannot contain mix of operators and non-operators');
		var opParams = update[operator];

		// Handle the operator
		switch(operator) {

			case '$inc':
				// Handle increment operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $inc must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$inc values must be numbers');
					if(fieldVal === null || fieldVal === undefined) fieldVal = opParams[field];
					else if(typeof fieldVal == 'number') fieldVal += paramVal;
					else return new ZSError(ZSError.INVALID_QUERY, '$inc can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					setPath(doc, field, fieldVal);
				}
				break;

			case '$mul':
				// Handle multiply operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $mul must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$mul values must be numbers');
					if(fieldVal === null || fieldVal === undefined) fieldVal = 0;
					else if(typeof fieldVal == 'number') fieldVal *= paramVal;
					else return new ZSError(ZSError.INVALID_QUERY, '$mul can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					setPath(doc, field, fieldVal);
				}
				break;

			case '$rename':
				// Handle rename operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $rename must be object');
				var renameOldValues = {};
				// loop twice to perform the operation correctly in the instance of, ie, swapping two fields
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(typeof paramVal != 'string' || paramVal[0] == '$') return new ZSError(ZSError.INVALID_QUERY, '$rename values must be valid field names');
					renameOldValues[field] = fieldVal;
					deletePath(doc, field);
				}
				for(field in opParams) {
					setPath(doc, opParams[field], renameOldValues[field]);
				}
				break;

			case '$set':
				// Handle set fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $set must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					paramVal = opParams[field];
					setPath(doc, field, paramVal);
				}
				break;

			case '$unset':
				// Handle unset fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $unset must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					deletePath(doc, field);
				}
				break;

			case '$min':
				// Handle minimum value operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $min must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$min values must be numbers');
					if(fieldVal === null || fieldVal === undefined) {
						setPath(doc, field, paramVal);
					} else if(typeof fieldVal == 'number') {
						if(paramVal < fieldVal) {
							setPath(doc, field, paramVal);
						}
					} else {
						return new ZSError(ZSError.INVALID_QUERY, '$min can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					}
				}
				break;

			case '$max':
				// Handle maximum value operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $max must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$max values must be numbers');
					if(fieldVal === null || fieldVal === undefined) {
						setPath(doc, field, paramVal);
					} else if(typeof fieldVal == 'number') {
						if(paramVal > fieldVal) {
							setPath(doc, field, paramVal);
						}
					} else {
						return new ZSError(ZSError.INVALID_QUERY, '$max can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					}
				}
				break;

			case '$currentDate':
				// Handle current date operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $currentDate must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					paramVal = opParams[field];
					if(paramVal === true || (paramVal && typeof paramVal == 'object' && Object.keys(paramVal).length == 1 && (paramVal.$type === 'timestamp' || paramVal.$type === 'date'))) {
						setPath(doc, field, new Date());
					} else {
						return new ZSError(ZSError.INVALID_QUERY, 'Invalid $currentDate parameter value');
					}
				}
				break;

			case '$addToSet':
				// Handle add to set array operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $addToSet must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(paramVal && typeof paramVal == 'object' && paramVal.$each) {
						eachVals = paramVal.$each;
						if(!Array.isArray(eachVals)) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $each must be array');
						if(fieldVal === null || fieldVal === undefined) {
							fieldVal = [];
							setPath(doc, field, fieldVal);
						}
						if(!Array.isArray(fieldVal)) return new ZSError(ZSError.INVALID_QUERY, '$addToSet can only operate on array fields');
						for(i = 0; i < eachVals.length; i++) {
							if(!objtools.isScalar(eachVals[i])) return new ZSError(ZSError.INVALID_QUERY, '$addToSet values must be scalar');
							if(fieldVal.indexOf(eachVals[i]) == -1) fieldVal.push(eachVals[i]);
						}
					} else if(!objtools.isScalar(paramVal)) {
						return new ZSError(ZSError.INVALID_QUERY, '$addToSet values must be scalar');
					} else if(fieldVal === null || fieldVal === undefined) {
						setPath(doc, field, [paramVal]);
					} else if(!Array.isArray(fieldVal)) {
						return new ZSError(ZSError.INVALID_QUERY, '$addToSet can only operate on array fields');
					} else if(fieldVal.indexOf(paramVal) == -1) {
						fieldVal.push(paramVal);
					}
				}
				break;

			case '$pop':
				// Handle array pop operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $pop must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(paramVal !== -1 && paramVal !== 1) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $pop must be 1 or -1');
					if(fieldVal === null || fieldVal === undefined) {
						setPath(doc, field, []);
					} else if(!Array.isArray(fieldVal)) {
						return new ZSError(ZSError.INVALID_QUERY, 'Field for $pop must be array');
					} else if(paramVal === 1) {
						fieldVal.pop();
					} else {
						fieldVal.shift();
					}
				}
				break;

			case '$push':
				// Handle $push operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $push must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getPath(doc, field);
					paramVal = opParams[field];
					if(paramVal && typeof paramVal == 'object' && paramVal.$each) {
						eachVals = paramVal.$each;
						if(!Array.isArray(eachVals)) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $each must be array');
						if(fieldVal === null || fieldVal === undefined) {
							fieldVal = [];
							setPath(doc, field, fieldVal);
						}
						if(!Array.isArray(fieldVal)) return new ZSError(ZSError.INVALID_QUERY, '$push can only operate on array fields');
						for(i = 0; i < eachVals.length; i++) {
							fieldVal.push(eachVals[i]);
						}
					} else if(fieldVal === null || fieldVal === undefined) {
						setPath(doc, field, [paramVal]);
					} else if(!Array.isArray(fieldVal)) {
						return new ZSError(ZSError.INVALID_QUERY, '$push can only operate on array fields');
					} else {
						fieldVal.push(paramVal);
					}
				}
				break;

			default:
				return new ZSError(ZSError.INVALID_QUERY, 'Update contains invalid/unknown operator ' + operator);

		}
	}

	return doc;
}
exports.applyUpdate = applyUpdate;

