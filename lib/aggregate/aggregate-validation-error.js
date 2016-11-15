// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');

XError.registerErrorCode('aggregate_validation_error', {
	message: 'Invalid aggregate',
	http: 400
});

/**
 * Class representing an error validating an aggregate.
 *
 * @class AggregateValidationError
 * @extends XError
 * @constructor
 * @param {String} reason - String reason for the validation error
 * @param {Object} [data] - Additional data about the validation error
 * @param {Error} [cause] - The error instance that triggered this error
 */
class AggregateValidationError extends XError {

	constructor(reason, data, cause) {
		super(XError.AGGREGATE_VALIDATION_ERROR, `Invalid aggregate: ${reason}`, data, cause);
	}

}

module.exports = AggregateValidationError;
