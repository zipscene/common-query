/** common-query.js - v0.0.14 - Mon, 22 Sep 2014 14:36:52 GMT */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),(o.ZS||(o.ZS={})).commonQuery=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var ZSError = _dereq_('zs-error');
var regexp_quote = _dereq_('regexp-quote');
var doc_utils = _dereq_('objtools');
var getPath = doc_utils.getPath;
var setPath = doc_utils.setPath;
var deepEquals = doc_utils.deepEquals;
var extend = _dereq_('extend');

var textMatches = function(value, query) {
	return new RegExp(query.replace(' ', '.+')).test(value);
};

/**
 * Returns a list of fields that are taken into account for a given common query.
 *
 * @param objType string The type of object (ie, model name)
 * @param query object The common query
 * @return Array List of fields
 */
function getQueriedFields(objType, query) {
	var fieldSet = {};
	function helper(query) {
		if(!query || typeof query != 'object' || Array.isArray(query)) return;
		Object.keys(query).forEach(function(key) {
			if((key == '$and' || key == '$or' || key == '$nor') && Array.isArray(query[key])) {
				query[key].forEach(function(queryExp) {
					helper(queryExp);
				});
			} else if(key[0] != '$') {
				fieldSet[key] = true;
				if(typeof query[key] == 'object' && query[key] && query[key].$elemMatch) {
					var subFields = getQueriedFields(null, query[key].$elemMatch);
					if(Array.isArray(subFields)) {
						subFields.forEach(function(f) {
							fieldSet[key + '.' + f] = true;
						});
					}
				}
			}
		});
	}
	helper(query);
	return Object.keys(fieldSet);
}
exports.getQueriedFields = getQueriedFields;

function transformQueriedFields(objType, query, transform) {
	query = extend(true, {}, query);
	function helper(query) {
		if(!query || typeof query != 'object' || Array.isArray(query)) return query;
		var ret = {};
		Object.keys(query).forEach(function(key) {
			if((key == '$and' || key == '$or' || key == '$nor') && Array.isArray(query[key])) {
				ret[key] = query[key].map(function(q) {
					return helper(q);
				});
			} else if(key.toLowerCase() == '$elemmatch') {
				ret[key] = query[key];
			} else if(key[0] == '$') {
				ret[key] = helper(query[key]);
			} else {
				ret[transform(key)] = helper(query[key]);
				// NOTE: Subfields of the $elemMatch operator are NOT transformed.  This function is used for
				// stuff like adding a prefix to fields.  Since subfields of $elemMatch are relative, no prefix
				// needs to be added.
			}
		});
		return ret;
	}
	return helper(query);
}
exports.transformQueriedFields = transformQueriedFields;

// Tries to convert a query to the most general object that it will match
// This does NOT take into account any operators
function queryToObject(query) {
	if(!query || typeof query != 'object') return {};
	var obj = {};
	for(var key in query) {
		if(typeof query[key] != 'object' && query[key] !== null && query[key] !== undefined && key[0] != '$') {
			setPath(obj, key, query[key]);
		}
	}
	return obj;
}
exports.queryToObject = queryToObject;

// Returns true iff the query contains only exact value matches and no operators
function isBasicQuery(query) {
	if(!query || typeof query != 'object') return false;
	for(var key in query) {
		if(!(typeof query[key] != 'object' && query[key] !== null && query[key] !== undefined && key[0] != '$')) {
			return false;
		}
	}
	return true;
}
exports.isBasicQuery = isBasicQuery;

// Returns true iff the given query is a basic query AND matches all of, and only, the array of fields given
function queryMatchesExactFieldSet(query, fields) {
	if(!query || typeof query != 'object') return false;
	var fieldSet = {};
	for(var i = 0; i < fields.length; i++) fieldSet[fields[i]] = true;
	if(Object.keys(fieldSet).length != Object.keys(query).length) return false;
	for(var key in query) {
		if(typeof query[key] != 'object' && query[key] !== null && query[key] !== undefined && key[0] != '$') {
			if(!fieldSet[key]) {
				return false;
			}
		} else {
			return false;
		}
	}
	return true;
}
exports.queryMatchesExactFieldSet = queryMatchesExactFieldSet;

/**
 * Returns a list of operators that are used in a common query.
 *
 * @param objType string The type of object (ie, model name)
 * @param query object The common query
 * @return Array list of used operators
 */
function getOperators(objType, query) {
	var opSet = {};
	function helper(query) {
		if(!query || typeof query != 'object') return;
		Object.keys(query).forEach(function(key) {
			if(key[0] == '$') {
				opSet[key] = true;
			}
			helper(query[key]);
		});
	}
	helper(query);
	return Object.keys(opSet);
}
exports.getOperators = getOperators;

// Determines whether an expression contains entirely operators or not
function isOperatorExpr(expr) {
	if(typeof expr == 'object' && !Array.isArray(expr) && expr) {
		if(!Object.keys(expr).length) return false;
		if(Object.keys(expr).every(function(key) {
			return key[0] == '$';
		})) {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}
exports.isOperatorExpr = isOperatorExpr;

// Determines if the expression is a variable substitution expression (for substituting a scalar value)
// in the form of { $var: "VARNAME" }
function isVarExpression(expr) {
	if(!expr || typeof expr != 'object') return false;
	if(Object.keys(expr).length != 1) return false;
	if(!expr.$var || typeof expr.$var != 'string') return false;
	return true;
}

/**
 * Performs substitution on $var expressions in a query.  Modifies the given object.
 *
 * @param query object The input query with $var expressions
 * @param vars object Map from variable names to values
 * @return mixed query, or instance of ZSError
 */
function substituteVars(query, vars, ignoreMissing) {
	var missingVars = [];
	function subst(obj) {
		if(isVarExpression(obj)) {
			var varName = obj.$var;
			if(vars[varName] === undefined) {
				if(ignoreMissing) {
					return null;
				} else {
					missingVars.push(varName);
				}
			} else {
				return vars[varName];
			}
		} else if(typeof obj == 'object') {
			Object.keys(obj).forEach(function(key) {
				obj[key] = subst(obj[key]);
			});
			return obj;
		} else {
			return obj;
		}
	}
	var res = subst(query);
	if(missingVars.length) return new ZSError(ZSError.INVALID_QUERY, 'Missing query variables: ' + missingVars.join(', '), { missingVars: missingVars });
	return res;
}
exports.substituteVars = substituteVars;

/**
 * Ensures that a common query is valid.
 *
 * @param objType string Object type (ie. model name)
 * @param query object The query
 * @param allowedOperators Array Optional list of operators that are allowed.  Defaults to all supported operators.
 * @param extraOperators Array Optional list of allowed operators in addition to the default ones
 * @return mixed Returns boolean true if valid.  Returns an instance of of ZSError if not valid.
 */
function validateQuery(objType, query, allowedOperators, extraOperators, allowVar) {
	if(!allowedOperators) allowedOperators = [ '$and', '$or', '$nor', '$exists', '$in', '$not', '$text', '$wildcard', '$regex', '$gt', '$gte', '$lt', '$lte', '$ne', '$elemMatch', '$options' ];
	if(extraOperators) allowedOperators = allowedOperators.concat(extraOperators);
	var allowedOpSet = {};
	allowedOperators.forEach(function(op) {
		allowedOpSet[op] = true;
	});

	var errors = [];

	function validatePlainValue(val) {
		if(val === null) return;
		if(typeof val == 'object' && (!allowVar || !isVarExpression(val))) {
			if(getOperators(null, val).length) {
				errors.push(new ZSError(ZSError.INVALID_QUERY, 'Plain value object may not contain operators', { value: val }));
			}
		} else {
			validateScalarExpressionValue(val);
		}
	}

	function validateScalarValue(val) {
		return typeof val == 'string' || typeof val == 'number' || typeof val == 'boolean';
	}

	function validateScalarExpressionValue(val) {
		if(allowVar && isVarExpression(val)) return true;
		return validateScalarValue(val);
	}

	function validateScalarArrayValue(val) {
		if(!Array.isArray(val)) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Value must be array: ' + val)); return; }
		val.forEach(function(v) {
			validateScalarValue(v);
		});
	}

	function validateBooleanValue(val) {
		if(typeof val != 'boolean') errors.push(new ZSError(ZSError.INVALID_QUERY, 'Value must be boolean: ' + val));
	}

	function validateStrValue(val) {
		if(typeof val != 'string') errors.push(new ZSError(ZSError.INVALID_QUERY, 'Value must be string: ' + val));
	}

	function validateOperatorExpr(expr, isInsideNot) {
		function validateOperator(op, val) {
			if(!allowedOpSet[op]) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Invalid or disallowed operator expression: ' + op)); return; }
			if(op == '$gt' || op == '$gte' || op == '$lt' || op == '$lte' || op == '$ne') {
				validateScalarExpressionValue(val);
			} else if(op == '$in' || op == '$nin') {
				validateScalarArrayValue(val);
			} else if(op == '$not') {
				if(isInsideNot) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Nested $not expressions disallowed')); return; }
				validateOperatorExpr(val, true);
			} else if(op == '$exists') {
				validateBooleanValue(val);
			} else if(op == '$regex' || op == '$wildcard' || op == '$text') {
				validateStrValue(val);
				// $regex, $wildcard, and $text cannot be used in the same operator expression because they can overwrite each other in mongo queries
				if(!!expr.$regex + !!expr.$wildcard + !!expr.$text > 1) {
					errors.push(new ZSError(ZSError.INVALID_QUERY, '$regex, $wildcard, and $text cannot be used together in the same operator expression'));
				}
			} else if(op == '$elemMatch') {
				validateQueryExpr(val);
			} else if(op == '$options') {
				validateStrValue(val);
				// Make sure $options operator is only used when appropriate
				if(!expr.$regex && !expr.$wildcard) {
					errors.push(new ZSError(ZSError.INVALID_QUERY, '$options operator is only valid with $regex or $wildcard'));
				}
			} else {
				errors.push(new ZSError(ZSError.INVALID_QUERY, 'Unknown or invalid expression operator: ' + op));
			}
		}
		if(!expr || typeof expr != 'object' || Array.isArray(expr) || !Object.keys(expr).length) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Operator expression must be object')); return; }
		Object.keys(expr).forEach(function(key) {
			validateOperator(key, expr[key]);
		});
	}

	function validateOperatorExprOrValue(expr) {
		if(isOperatorExpr(expr)) {
			validateOperatorExpr(expr);
		} else {
			validatePlainValue(expr);
		}
	}

	function validateQueryExpr(query) {
		if(!query || typeof query != 'object') { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Query must be object', { query: query })); return; }
		Object.keys(query).forEach(function(key) {
			var value = query[key];
			if(!key) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Field name may not be blank', { query: query })); return; }
			if(key[0] == '$') {
				if(!allowedOpSet[key]) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Invalid or disallowed operator: ' + key)); return; }
				if(key == '$and' || key == '$or' || key == '$nor') {
					if(!Array.isArray(value) || !value.length) { errors.push(new ZSError(ZSError.INVALID_QUERY, 'Value of $and or $or must be an array with at least one element', { query: query })); return; }
					value.forEach(function(queryExpr) {
						validateQueryExpr(queryExpr);
					});
				} else if(key == '$child' || key == '$parent') {
					if(typeof value != 'object' || !value) {
						errors.push(new ZSError(ZSError.INVALID_QUERY, 'Invalid $child/$parent operator value', { query: query }));
						return;
					}
					Object.keys(value).forEach(function(childType) {
						validateQueryExpr(value[childType]);
					});
				} else {
					errors.push(new ZSError(ZSError.INVALID_QUERY, 'Operator ' + key + ' cannot be used as a query-level operator', { query: query }));
					return;
				}
			} else {
				validateOperatorExprOrValue(value);
			}
		});
	}

	validateQueryExpr(query);
	if(errors.length) {
		return errors[0];
	}
	return true;
}
exports.validateQuery = validateQuery;

function makeWildcardRegex(str) {
	var ret = '^';
	var c;
	for(var i = 0; i < str.length; i++) {
		c = str[i];
		if(c == '*') ret += '.*';
		else if(c == '?') ret += '.?';
		else ret += regexp_quote(c);
	}
	return ret + '$';
}
exports.makeWildcardRegex = makeWildcardRegex;

/**
 * Determines whether a common query matches an object.
 *
 * @param objType string Object type (ie, model name)
 * @param query object Common query
 * @param obj object Object to match against
 * @return mixed Boolean true/false or an instance of ZSError
 */
function queryMatches(objType, query, obj, options) {
	if(!options) options = {};
	// Validate the query
	if(!options.skipValidate) {
		var validateError = validateQuery(objType, query);
		if(validateError !== true) return validateError;
	}

	var errors = [];

	// Whether or not an operator matches, AFTER arrays in the object being matched against are reduced to single calls for each value
	function matchValueOperator(key, keyVal, operator, operatorVal, operatorExpr) {
		if(operator == '$in') {
			if(!Array.isArray(operatorVal)) {
				errors.push(new ZSError(ZSError.INTERNAL_ERROR, 'Invalid query after validation - expected array for $in'));
				return false;
			}
			return operatorVal.some(function(v) {
				return deepEquals(v, keyVal);
			});
		} else if(operator == '$text') {
			return (options.textMatches || textMatches)(keyVal, operatorVal);
		} else if(operator == '$wildcard') {
			return new RegExp(makeWildcardRegex(operatorVal), operatorExpr.$options).test(keyVal);
		} else if(operator == '$regex') {
			return new RegExp(operatorVal, operatorExpr.$options).test(keyVal);
		} else if(operator == '$gt') {
			return keyVal > operatorVal;
		} else if(operator == '$gte') {
			return keyVal >= operatorVal;
		} else if(operator == '$lt') {
			return keyVal < operatorVal;
		} else if(operator == '$lte') {
			return keyVal <= operatorVal;
		} else if(operator == '$ne') {
			return !deepEquals(keyVal, operatorVal);
		} else if(operator == '$options') {
			return true;
		} else {
			errors.push(new ZSError(ZSError.INTERNAL_ERROR, 'Unknown operator expr operator after validation: ' + operator));
			return false;
		}
	}

	// Whether or not an operator matches before reducing arrays in the object being matched against
	function matchOperator(key, keyVal, operator, operatorVal, operatorExpr) {
		if(operator == '$exists') {
			if(operatorVal) {
				return keyVal !== undefined;
			} else {
				return keyVal === undefined;
			}
		} else if(operator == '$not') {
			return !Object.keys(operatorVal).every(function(exprKey) {
				return matchOperator(key, keyVal, exprKey, operatorVal[exprKey], operatorVal);
			});
		} else if(operator == '$elemMatch') {
			//console.log(key, keyVal, operator, operatorVal, operatorExpr);
			if(Array.isArray(keyVal)) {
				return keyVal.some(function(el) {
					var r = queryMatches(null, operatorVal, el, true);
					if(r instanceof ZSError) {
						errors.push(r);
						return false;
					} else {
						return r;
					}
				});
			} else {
				return false;
			}
		} else {
			if(Array.isArray(keyVal)) {
				return keyVal.some(function(v) {
					return matchValueOperator(key, v, operator, operatorVal, operatorExpr);
				});
			} else {
				return matchValueOperator(key, keyVal, operator, operatorVal, operatorExpr);
			}
		}
	}

	function matchOperatorExprOrValue(key, expr) {
		var keyValue = getPath(obj, key);
		if(isOperatorExpr(expr)) {
			return Object.keys(expr).every(function(exprKey) {
				return matchOperator(key, keyValue, exprKey, expr[exprKey], expr);
			});
		} else {
			if(keyValue === undefined) return false;
			if(Array.isArray(keyValue)) {
				return keyValue.some(function(v) {
					return deepEquals(v, expr);
				});
			} else {
				return deepEquals(keyValue, expr);
			}
		}
	}

	function matchQuery(query) {
		return Object.keys(query).every(function(key) {
			var value = query[key];
			if(key[0] == '$') {
				// Handle query-level logical operators
				if(key == '$and') {
					return value.every(matchQuery);
				} else if(key == '$or') {
					return value.some(matchQuery);
				} else if(key == '$nor') {
					return !value.some(matchQuery);
				} else {
					errors.push(new ZSError(ZSError.INTERNAL_ERROR, 'Query processing failed after validation - got unknown query level operator: ' + key));
					return false;
				}
			} else {
				// Handle a simple match
				return matchOperatorExprOrValue(key, value);
			}
		});
	}

	var matches = matchQuery(query);
	if(errors.length) return errors[0];
	return !!matches;
}
exports.queryMatches = queryMatches;

},{"extend":"extend","objtools":"objtools","regexp-quote":3,"zs-error":"zs-error"}],2:[function(_dereq_,module,exports){
var objtools = _dereq_('objtools');
var getPath = objtools.getPath;
var setPath = objtools.setPath;
var deletePath = objtools.deletePath;
var ZSError = _dereq_('zs-error');
var extend = _dereq_('extend');

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
		var opParam = update[operator];
		if(opParam && typeof opParam == 'object') {
			for(var field in opParam) {
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
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					fieldVal = getField(field);
					paramVal = opParams[field];
					if(typeof paramVal != 'string' || paramVal[0] == '$') return new ZSError(ZSError.INVALID_QUERY, '$rename values must be valid field names');
					renameOldValues[field] = fieldVal;
					deleteField(field);
				}
				for(field in opParams) {
					setField(opParams[field], renameOldValues[field]);
				}
				break;

			case '$set':
				// Handle set fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $set must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					paramVal = opParams[field];
					setField(field, paramVal);
				}
				break;

			case '$unset':
				// Handle unset fields operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $unset must be object');
				for(field in opParams) {
					if(field[0] == '$') return new ZSError(ZSError.INVALID_QUERY, 'Invalid field name ' + field);
					deleteField(field);
				}
				break;

			case '$min':
				// Handle minimum value operator
				if(!opParams || typeof opParams != 'object') return new ZSError(ZSError.INVALID_QUERY, 'Parameter to $min must be object');
				for(field in opParams) {
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

},{"extend":"extend","objtools":"objtools","zs-error":"zs-error"}],3:[function(_dereq_,module,exports){
module.exports = function (string) {
  return string.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")
}

},{}],"common-query":[function(_dereq_,module,exports){
var query = _dereq_('./query');
var update = _dereq_('./update');

var key;
for(key in query) exports[key] = query[key];
for(key in update) exports[key] = update[key];

},{"./query":1,"./update":2}]},{},[])("common-query")
});