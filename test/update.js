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

	it('$inc', function(done) {
		let obj = {
			one: 1,
			eightpointfive: 8.5,
			thirteen: 13,
			primes: [ 2, 3, 5, 7, 11 ]
		};
		let update = {
			$inc: {
				one: 0,
				eightpointfive: 1.3,
				thirteen: -8,
				'primes.1': 4
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			one: 1,
			eightpointfive: 9.8,
			thirteen: 5,
			primes: [ 2, 7, 5, 7, 11 ]
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('$mul', function(done) {
		let obj = {
			one: 1,
			eightpointfive: 8.5,
			thirteen: 13,
			primes: [ 2, 3, 5, 7, 11 ]
		};
		let update = {
			$mul: {
				one: 0,
				thirteen: -3,
				'primes.1': 10
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			one: 0,
			eightpointfive: 8.5,
			thirteen: -39,
			primes: [ 2, 30, 5, 7, 11 ]
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('$rename', function(done) {
		let obj = {
			hi: 'hi',
			bye: 'bye'
		};
		let update = {
			$rename: {
				hi: 'hello',
				sup: 'wassup'
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			hello: 'hi',
			bye: 'bye'
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

});
