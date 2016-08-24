let XError = require('xerror');

XError.registerErrorCode('compose_update_error', {
	message: 'Invalid composition',
	http: 400
});

/**
 * Class representing an update validation error.
 *
 * @class ComposeUpdateError
 * @extends XError
 * @constructor
 * @param {String} reason - String reason for the validation error
 * @param {Object} [data] - Additional data about the validation error
 */
class ComposeUpdateError extends XError {

	constructor(reason, data) {
		super(XError.INVALID_COMPOSITION, 'Invalid composition: ' + reason, data);
	}

}

module.exports = ComposeUpdateError;
