var objtools = require('objtools');
var getPath = objtools.getPath;
var setPath = objtools.setPath;
var deletePath = objtools.deletePath;
var ZSError = require('zs-error');
var extend = require('extend');

function getUpdatedFields(objType, doc, update, options) {
	if(!options) options = {};
	if(!update || typeof update != 'object') return [];

	var i;
	var internalFieldSet = {};
	if(Array.isArray(options.internalFields)) for(i = 0; i < options.internalFields.length; i++) internalFieldSet[options.internalFields[i]] = true;
	else if(typeof options.internalFields == 'object' && options.internalFields) internalFieldSet = options.internalFields;

	function isInternalField(field) {
		if(internalFieldSet[field]) return true;
		if(typeof options.internalFields == 'function' && options.internalFields(field)) return true;
		return false;
	}

	var fieldSet = {};

	if(!updateHasOperators(update)) {
		if(options.allowFullReplace) {

			// Need to replace the entire document with the new document, but do it in-place as much as possible (in the case we're updating a mongoose doc or something)
			function compareObject(toObj, fromObj, path) {
				var key, keyPath, toVal, fromVal;
				for(key in fromObj) {
					if(!fromObj.hasOwnProperty(key)) continue;
					toVal = toObj[key];
					fromVal = fromObj[key];
					keyPath = path ? (path + '.' + key) : key;
					if(typeof toVal != 'object' || !toVal || Array.isArray(toVal) || typeof fromVal != 'object' || !fromVal || Array.isArray(fromVal)) {
						// We're replacing a blank field or a field that isn't an object, or replacing it with a non-object, so just set the value
						if(!objtools.scalarEquals(fromVal, toVal)) {
							fieldSet[keyPath] = true;
						}
					} else {
						// Both are objects, so recurse
						compareObject(toVal, fromVal, keyPath);
					}
				}
				for(key in toObj) {
					if(!toObj.hasOwnProperty(key)) continue;
					// Look for keys in toObj that don't exist in fromObj (for deletion)
					keyPath = path ? (path + '.' + key) : key;
					if(fromObj[key] === undefined && !isInternalField(keyPath)) {
						fieldSet[keyPath] = true;
					}
				}
			}
			compareObject(doc, update, '');
			return Object.keys(fieldSet);

		} else {
			update = {
				$set: update
			};
		}
	}


	for(var operator in update) {
		if(!update.hasOwnProperty(operator)) continue;
		var opParam = update[operator];
		if(opParam && typeof opParam == 'object') {
			for(var field in opParam) {
				if(!opParam.hasOwnProperty(field)) continue;
				fieldSet[field] = true;
			}
		}
	}
	return Object.keys(fieldSet);
}
exports.getUpdatedFields = getUpdatedFields;

function transformUpdatedFields(objType, update, transform) {
	if(!update || typeof update != 'object') return update;
	if(updateHasOperators(update)) {
		update = extend(true, {}, update);
		for(var operator in update) {
			if(!update.hasOwnProperty(operator)) continue;
			var opParam = update[operator];
			if(opParam && typeof opParam == 'object') {
				for(var okey in opParam) {
					if(!opParam.hasOwnProperty(okey)) continue;
					opParam[transform(okey)] = opParam[okey];
				}
			}
		}
		return update;
	} else {
		var newUpdate = {};
		for(var key in update) {
			if(!update.hasOwnProperty(key)) continue;
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
		if(!update.hasOwnProperty(operator)) continue;
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
		if(!update.hasOwnProperty(key)) continue;
		if(key[0] == '$') hasOperator = true;
	}
	return hasOperator;
}
exports.updateHasOperators = updateHasOperators;

// options:
// - allowFullReplace - If true, use the mongo of replacing the entire document if no operators are present
// - modifiedCallback - function called for each modified path in the document: function(field, newValue), called with this=doc
// - internalFields - Array of internal fields that cannot be modified (or map from field name to true).  This can also be a function
// in the form function(fieldName) which returns true if the field is an internal field.
function applyUpdate(objType, doc, update, options) {
	var field, fieldVal, paramVal, i, eachVals;
	if(!options) options = {};

	if(!update || typeof update != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Update must be object');
	if(!doc || typeof doc != 'object') return new ZSError(ZSError.INTERNAL_ERROR, 'Document must be object');

	var internalFieldSet = {};
	if(Array.isArray(options.internalFields)) for(i = 0; i < options.internalFields.length; i++) internalFieldSet[options.internalFields[i]] = true;
	else if(typeof options.internalFields == 'object' && options.internalFields) internalFieldSet = options.internalFields;

	function isInternalField(field) {
		if(internalFieldSet[field]) return true;
		if(typeof options.internalFields == 'function' && options.internalFields(field)) return true;
		return false;
	}

	function setField(field, value) {
		if(isInternalField(field)) return;
		setPath(doc, field, value);
		if(options.modifiedCallback) {
			options.modifiedCallback.call(doc, field, value);
		}
	}

	function getField(field) {
		return getPath(doc, field);
	}

	function deleteField(field) {
		if(isInternalField(field)) return;
		deletePath(doc, field);
		if(options.modifiedCallback) {
			options.modifiedCallback.call(doc, field, undefined);
		}
	}

	// If the update contains no operators, assume it's a $set
	if(!updateHasOperators(update)) {
		if(options.allowFullReplace) {

			// Need to replace the entire document with the new document, but do it in-place as much as possible (in the case we're updating a mongoose doc or something)
			function syncObject(toObj, fromObj, path) {
				var key, keyPath, toVal, fromVal;
				for(key in fromObj) {
					if(!fromObj.hasOwnProperty(key)) continue;
					toVal = toObj[key];
					fromVal = fromObj[key];
					keyPath = path ? (path + '.' + key) : key;
					if(isInternalField(keyPath)) continue;
					if(typeof toVal != 'object' || !toVal || Array.isArray(toVal) || typeof fromVal != 'object' || !fromVal || Array.isArray(fromVal)) {
						// We're replacing a blank field or a field that isn't an object, or replacing it with a non-object, so just set the value
						if(!objtools.scalarEquals(fromVal, toVal)) {
							toObj[key] = fromVal;
							if(options.modifiedCallback) options.modifiedCallback.call(doc, keyPath, fromVal);
						}
					} else {
						// Both are objects, so recurse
						syncObject(toVal, fromVal, keyPath);
					}
				}
				for(key in toObj) {
					if(!toObj.hasOwnProperty(key)) continue;
					keyPath = path ? (path + '.' + key) : key;
					if(isInternalField(keyPath)) continue;
					// Look for keys in toObj that don't exist in fromObj (for deletion)
					if(fromObj[key] === undefined) {
						delete toObj[key];
						if(options.modifiedCallback) options.modifiedCallback.call(doc, keyPath, undefined);
					}
				}
			}
			syncObject(doc, update, '');
			return doc;

		} else {
			update = {
				$set: update
			};
		}
	}

	// Handle each update operator
	for(var operator in update) {
		if(!update.hasOwnProperty(operator)) continue;

		// Make sure the operator is actually an operator
		if(operator[0] != '$') return new ZSError(ZSError.INVALID_QUERY, 'Update cannot contain mix of operators and non-operators');
		var opParams = update[operator];

		// Handle the operator
		switch(operator) {

			case '$inc':
				// Handle increment operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $inc must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$inc values must be numbers');
					if(fieldVal === null || fieldVal === undefined) fieldVal = opParams[field];
					else if(typeof fieldVal == 'number') fieldVal += paramVal;
					else return new ZSError(ZSError.INVALID_QUERY, '$inc can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					setField(field, fieldVal);
				}
				break;

			case '$mul':
				// Handle multiply operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $mul must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$mul values must be numbers');
					if(fieldVal === null || fieldVal === undefined) fieldVal = 0;
					else if(typeof fieldVal == 'number') fieldVal *= paramVal;
					else return new ZSError(ZSError.INVALID_QUERY, '$mul can only operate on numeric fields (field ' + field + ') is of type ' + (typeof fieldVal));
					setField(field, fieldVal);
				}
				break;

			case '$rename':
				// Handle rename operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $rename must be object');
				var renameOldValues = {};
				// loop twice to perform the operation correctly in the instance of, ie, swapping two fields
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'string' || paramVal[0] == '$') return new ZSError(ZSError.INVALID_QUERY, '$rename values must be valid field names');
					renameOldValues[field] = fieldVal;
					deleteField(field);
				}
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					setField(opParams[field], renameOldValues[field]);
				}
				break;

			case '$set':
				// Handle set fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $set must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					paramVal = opParams[field];
					setField(field, paramVal);
				}
				break;

			case '$unset':
				// Handle unset fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $unset must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					deleteField(field);
				}
				break;

			case '$min':
				// Handle minimum value operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $min must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$min values must be numbers');
					if(fieldVal === null || fieldVal === undefined) {
						setField(field, paramVal);
					} else if(typeof fieldVal == 'number') {
						if(paramVal < fieldVal) {
							setField(field, paramVal);
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
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'number') return new ZSError(ZSError.INVALID_QUERY, '$max values must be numbers');
					if(fieldVal === null || fieldVal === undefined) {
						setField(field, paramVal);
					} else if(typeof fieldVal == 'number') {
						if(paramVal > fieldVal) {
							setField(field, paramVal);
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
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					paramVal = opParams[field];
					if(paramVal === true || (paramVal && typeof paramVal == 'object' && Object.keys(paramVal).length == 1 && (paramVal.$type === 'timestamp' || paramVal.$type === 'date'))) {
						setField(field, new Date());
					} else {
						return new ZSError(ZSError.INVALID_QUERY, 'Invalid $currentDate parameter value');
					}
				}
				break;

			case '$addToSet':
				// Handle add to set array operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $addToSet must be object');
				for(field in opParams) {
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(paramVal && typeof paramVal == 'object' && paramVal.$each) {
						eachVals = paramVal.$each;
						if(!Array.isArray(eachVals)) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $each must be array');
						if(fieldVal === null || fieldVal === undefined) {
							fieldVal = [];
							setField(field, fieldVal);
						}
						if(!Array.isArray(fieldVal)) return new ZSError(ZSError.INVALID_QUERY, '$addToSet can only operate on array fields');
						for(i = 0; i < eachVals.length; i++) {
							if(!objtools.isScalar(eachVals[i])) return new ZSError(ZSError.INVALID_QUERY, '$addToSet values must be scalar');
							if(fieldVal.indexOf(eachVals[i]) == -1) fieldVal.push(eachVals[i]);
						}
					} else if(!objtools.isScalar(paramVal)) {
						return new ZSError(ZSError.INVALID_QUERY, '$addToSet values must be scalar');
					} else if(fieldVal === null || fieldVal === undefined) {
						setField(field, [paramVal]);
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
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(paramVal !== -1 && paramVal !== 1) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $pop must be 1 or -1');
					if(fieldVal === null || fieldVal === undefined) {
						setField(field, []);
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
					if(!opParams.hasOwnProperty(field)) continue;
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(paramVal && typeof paramVal == 'object' && paramVal.$each) {
						eachVals = paramVal.$each;
						if(!Array.isArray(eachVals)) return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $each must be array');
						if(fieldVal === null || fieldVal === undefined) {
							fieldVal = [];
							setField(field, fieldVal);
						}
						if(!Array.isArray(fieldVal)) return new ZSError(ZSError.INVALID_QUERY, '$push can only operate on array fields');
						for(i = 0; i < eachVals.length; i++) {
							fieldVal.push(eachVals[i]);
						}
					} else if(fieldVal === null || fieldVal === undefined) {
						setField(field, [paramVal]);
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
