// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');

XError.registerErrorCode('object_match_error', {
	message: 'Invalid object type for query',
	http: 400
});

/**
 * Class representing an error in an object when matching against it.  This is different
 * from a QueryValidationError in that an ObjectMatchError represents an error or
 * incompatible type in the object being matched against.  For example, trying to do a
 * $near match on a field that isn't a coordinate pair.
 *
 * @class ObjectMatchError
 * @extends XError
 * @constructor
 * @param {String} reason - String reason for the error
 * @param {Object} [data] - Additional data about the error
 */
class ObjectMatchError extends XError {

	constructor(reason, data) {
		super(XError.OBJECT_MATCH_ERROR, `Error matching object: ${reason}`, data);
	}

}

module.exports = ObjectMatchError;
