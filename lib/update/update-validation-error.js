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
