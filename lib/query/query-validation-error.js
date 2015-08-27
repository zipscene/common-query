let XError = require('xerror');

XError.registerErrorCode('query_validation_error', {
	message: 'Invalid query',
	http: 400
});

/**
 * Class representing a query validation error.
 *
 * @class QueryValidationError
 * @extends XError
 * @constructor
 * @param {String} reason - String reason for the validation error
 * @param {Object} [data] - Additional data about the validation error
 * @param {Error} [cause] - The error instance that triggered this error
 */
class QueryValidationError extends XError {

	constructor(reason, data, cause) {
		super(XError.QUERY_VALIDATION_ERROR, 'Invalid query: ' + reason, data, cause);
	}

}

module.exports = QueryValidationError;
