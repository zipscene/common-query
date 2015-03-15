var expect = require('chai').expect;
var createQuery = require('../lib/index').createQuery;

describe('Query matches()', function() {

	it('basic valid query', function(done) {
		let query1 = createQuery({
			foo: 'bar',
			biz: 'baz'
		});
		let validateResult = query1.validate();
		expect(validateResult).to.equal(true);
		done();
	});

});
