let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;
let UpdateValidationError = require('../lib/update-validation-error');

describe('Update skipValidate', function() {

	it('test 1', function(done) {
		let updateData = {
			'$mega': 'invalid',
			'$dude': 'like are you even trying'
		};
		expect(() => createUpdate(updateData)).to.throw(UpdateValidationError);
		expect(() => createUpdate(updateData, {
			skipValidate: true
		})).to.not.throw(Error);
		done();
	});

});
