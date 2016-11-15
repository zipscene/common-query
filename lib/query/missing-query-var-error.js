// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');

XError.registerErrorCode('missing_query_var', {
	message: 'Missing query variable',
	http: 500
});

/**
 * Class representing an error when a query variable is missing.
 *
 * @class MissingQueryVarError
 * @extends XError
 * @constructor
 * @param {String} varName - Name of the missing variable
 */
class MissingQueryVarError extends XError {

	constructor(varName) {
		super(XError.MISSING_QUERY_VAR, `Missing query variable: ${varName}`);
	}

}

module.exports = MissingQueryVarError;
