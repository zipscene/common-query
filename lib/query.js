var ZSError = require('zs-error');
var regexp_quote = require('regexp-quote');
var doc_utils = require('objtools');
var getPath = doc_utils.getPath;
var setPath = doc_utils.setPath;
var deepEquals = doc_utils.deepEquals;
var extend = require('extend');

var textMatches = function(value, query) {
	return new RegExp(query.replace(' ', '.+')).test(value);
};

function Query(query) {
	this.query = query;
}
module.exports = Query;

/**
 * Returns a list of fields that are taken into account for a given common query.
 *
 * @return Array List of fields
 */
Query.prototype.getFields = function() {
	function getQueryFields(query) {
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
						var subFields = getQueryFields(query[key].$elemMatch);
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
	return getQueryFields(this.query);
};

/**
 * For each field referenced in the query, execute a given transform function to transform the field name.
 */
Query.prototype.transformFields = function(transform) {
	var query = extend(true, {}, this.query);
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
	this.query = helper(query);
};

/**
 * Returns an object containing a map from field names to values, for each exact match the query
 * contains.  The returned query will always match a superset of objects that the original query
 * will match.
 */
Query.prototype.getExactMatches = function() {
	var query = this.query;
	if(!query || typeof query != 'object') return {};
	var obj = {};
	for(var key in query) {
		if(typeof query[key] != 'object' && query[key] !== null && query[key] !== undefined && key[0] != '$') {
			setPath(obj, key, query[key]);
		}
	}
	return obj;
};

// Returns true iff the query contains only exact value matches and no operators
Query.prototype.isTrivial = function() {
	var query = this.query;
	if(!query || typeof query != 'object') return false;
	for(var key in query) {
		if(!(typeof query[key] != 'object' && query[key] !== null && query[key] !== undefined && key[0] != '$')) {
			return false;
		}
	}
	return true;
};

// Returns true iff the given query is a basic query AND matches against all of, and only, the array of fields given
Query.prototype.matchesExactFieldSet = function(fields) {
	var query = this.query;
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
};

function getOperators(query) {
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

/**
 * Returns a list of operators that are used in a common query.
 *
 * @param objType string The type of object (ie, model name)
 * @param query object The common query
 * @return Array list of used operators
 */
Query.prototype.getOperators = function() {
	return getOperators(this.query);
};

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
Query.isOperatorExpr = isOperatorExpr;

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
Query.prototype.substituteVars = function(vars, ignoreMissing) {
	var query = this.query;
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
	if(missingVars.length) throw new ZSError(ZSError.INVALID_QUERY, 'Missing query variables: ' + missingVars.join(', '), { missingVars: missingVars });
	this.query = res;
};

Query.prototype.toObject = function() {
	return this.query;
};

/**
 * Combine this query with another query such that the result query will match the intersection of
 * the two queries.  Returns a new instance of Query .
 */
Query.prototype.combineAnd = function(otherQuery) {
	var query1 = this.query;
	var query2 = otherQuery;
	var result = {};
	var key;
	function addClause(key, val) {
		if(val === undefined) return;
		if(result[key] === undefined) {
			result[key] = val;
		} else if(result[key] !== val) {
			if(Array.isArray(result.$and) && key === '$and' && Array.isArray(val)) {
				// The key is $and and both are arrays
				result.$and = result.$and.concat(val);
			} else if(key === '$and') {
				// This is a malformed query, but try to handle it anyway
				if(result.$and !== undefined && !Array.isArray(result.$and)) result.$and = [result.$and];
				if(!Array.isArray(val)) val = [val];
				result.$and = result.$and.concat(val);
			} else {
				// Need to add both qualifications to an and clause
				if(result.$and && !Array.isArray(result.$and)) result.$and = [result.$and];
				if(!result.$and) result.$and = [];
				var clause = {};
				clause[key] = val;
				result.$and.push(clause);
			}
		}

	}
	for(key in query1) addClause(key, query1[key]);
	for(key in query2) addClause(key, query2[key]);
	return new Query(result);
};

/**
 * Ensures that a common query is valid.
 *
 * @param objType string Object type (ie. model name)
 * @param query object The query
 * @param allowedOperators Array Optional list of operators that are allowed.  Defaults to all supported operators.
 * @param extraOperators Array Optional list of allowed operators in addition to the default ones
 * @return mixed Returns boolean true if valid.  Throws an instance of of ZSError if not valid.
 */
Query.prototype.validate = function(allowedOperators, extraOperators, allowVar) {
	var query = this.query;
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
			if(getOperators(val).length) {
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
		throw errors[0];
	}
	return true;
};

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
Query.makeWildcardRegex = makeWildcardRegex;

function queryMatches(query, obj, options) {
	if(!options) options = {};
	// Validate the query
	if(!options.skipValidate) {
		this.validate();
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
					var r = queryMatches(operatorVal, el, { skipValidate: true });
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
	if(errors.length) throw errors[0];
	return !!matches;
}

/**
 * Determines whether a common query matches an object.
 *
 * @param objType string Object type (ie, model name)
 * @param query object Common query
 * @param obj object Object to match against
 * @return mixed Boolean true/false or throws an instance of ZSError
 */
Query.prototype.matches = function(obj, options) {
	return queryMatches(this.query, obj, options);
};
