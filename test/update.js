let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;
let objtools = require('zs-objtools');

describe('Update apply()', function() {
	it('empty update does nothing', function(done) {
		let obj = {
			foo: 'bar',
			abc: 123,
			arr: [ 1, null, '1' ]
		};
		let newObj = createUpdate({}).apply(obj);
		expect(objtools.deepEquals(obj, newObj)).to.equal(true);
		done();
	});

	it('$set, $unset', function(done) {
		let obj = {
			foo: 'bar',
			abc: 123,
			arr: [ 1, null, '1' ]
		};
		let update = {
			$set: {
				abc: 321,
				'arr.1': 1
			},
			$unset: {
				foo: true
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			abc: 321,
			arr: [ 1, 1, '1' ]
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});
});
