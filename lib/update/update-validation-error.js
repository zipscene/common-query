// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');

XError.registerErrorCode('update_validation_error', {
	message: 'Invalid update spec',
	http: 400
});

/**
 * Class representing an update validation error.
 *
 * @class UpdateValidationError
 * @extends XError
 * @constructor
 * @param {String} reason - String reason for the validation error
 * @param {Object} [data] - Additional data about the validation error
 */
class UpdateValidationError extends XError {

	constructor(reason, data) {
		super(XError.UPDATE_VALIDATION_ERROR, `Invalid update: ${reason}`, data);
	}

}

module.exports = UpdateValidationError;
