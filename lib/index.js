var ZSError = require('zs-error');
var $ = require('zs-jq-stub');
var regexp_quote = require('regexp-quote');
var doc_utils = require('objtools');
var getPath = doc_utils.getPath;
var deepEquals = doc_utils.deepEquals;
// Note: text-index is optional.  If set to null, it will fall-back to a simple (and not
// as good) regex-based approach.
//var textIndex = require('./text-index');

var textMatches = function(value, query) {
	return new RegExp(query.replace(' ', '.+')).test(value);
};

exports.setTextMatchFunc = function(f) {
	textMatches = f;
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
	query = $.extend(true, {}, query);
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
function queryMatches(objType, query, obj, skipValidate) {
	// Validate the query
	if(!skipValidate) {
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
			return textMatches(keyVal, operatorVal);
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
