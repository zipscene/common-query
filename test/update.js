let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;
let Update = require('../lib/index').Update;
let defaultUpdateFactory = require('../lib/index').defaultUpdateFactory;
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

	it('$min, $max', function(done) {
		let obj = {
			minusten: -10,
			zero: 0,
			five: 5,
			twenty: 20
		};
		let update = {
			$min: {
				zero: -2,
				five: 6
			},
			$max: {
				minusten: -14,
				twenty: 44
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			minusten: -10,
			zero: -2,
			five: 5,
			twenty: 44
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('uniform scalar $addToSet', function(done) {
		let obj = {
			set: [ 1, 2, 3, 4, 5 ],
			nested: {
				set: [ 'a', 'b', 'c', 'd', 'e' ]
			}
		};
		let update = {
			$addToSet: {
				set: {
					$each: [ 6, 3, 1, 7 ]
				},
				'nested.set': 'f'
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			set: [ 1, 2, 3, 4, 5, 6, 7 ],
			nested: {
				set: [ 'a', 'b', 'c', 'd', 'e', 'f' ]
			}
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('mixed scalar $addToSet', function(done) {
		let obj = {
			set: [ 1, 14, '1', 2, false, 'gareth' ],
			nested: {
				set: [ true, 'waifu', 976 ]
			}
		};
		let update = {
			$addToSet: {
				set: {
					$each: [ true, false, 2, '2', 'gareth' ]
				},
				'nested.set': 'appendectomy'
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			set: [ 1, 14, '1', 2, false, 'gareth', true, '2' ],
			nested: {
				set: [ true, 'waifu', 976, 'appendectomy' ]
			}
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('complex $addToSet', function(done) {
		let obj = {
			set: [
				true,
				{
					happy: 'happy',
					joy: 'joy'
				},
				{
					unhappy: 'unhappy',
					grief: 'grief'
				},
				[ 1, 2, 3 ],
				[ 3, 2, 1 ],
				new Date(2014, 5, 5).toISOString()
			]
		};
		let update = {
			$addToSet: {
				set: {
					$each: [
						{
							happy: 'happy',
							joy: 'joy'
						},
						{
							unhappy: 'unhappy'
						},
						[ 1, 2, 3 ],
						[ 3, 2, 1, 0 ],
						new Date(2014, 5, 5).toISOString(),
						new Date(2015, 5, 5).toISOString()
					]
				}
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			set: [
				true,
				{
					happy: 'happy',
					joy: 'joy'
				},
				{
					unhappy: 'unhappy',
					grief: 'grief'
				},
				[ 1, 2, 3 ],
				[ 3, 2, 1 ],
				new Date(2014, 5, 5).toISOString(),
				{
					unhappy: 'unhappy'
				},
				[ 3, 2, 1, 0 ],
				new Date(2015, 5, 5).toISOString()
			]
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('$push', function(done) {
		let obj = {
			set: [ 1, 14, '1', 2, false, 'gareth' ],
			nested: {
				set: [ true, 'waifu', 976 ]
			}
		};
		let update = {
			$push: {
				set: {
					$each: [ true, false, 2, '2', 'gareth' ]
				},
				'nested.set': 'appendectomy'
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			set: [ 1, 14, '1', 2, false, 'gareth', true, false, 2, '2', 'gareth' ],
			nested: {
				set: [ true, 'waifu', 976, 'appendectomy' ]
			}
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('$pop', function(done) {
		let obj = {
			set: [ 1, 14, '1', 2, false, 'gareth' ],
			nested: {
				set: [ true, 'waifu', 976 ]
			}
		};
		let update = {
			$pop: {
				set: 1,
				'nested.set': -1
			}
		};
		let newObj = createUpdate(update).apply(obj);
		let expectedObj = {
			set: [ 1, 14, '1', 2, false ],
			nested: {
				set: [ 'waifu', 976 ]
			}
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('full replace 1', function(done) {
		let obj = {
			hi: 'hi',
			bye: 'bye'
		};
		let update = {
			hi: 'hello'
		};
		let newObj = new Update(update, false, defaultUpdateFactory).apply(obj);
		let expectedObj = {
			hi: 'hello',
			bye: 'bye'
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	it('full replace 2', function(done) {
		let obj = {
			hi: 'hi',
			bye: 'bye'
		};
		let update = {
			hi: 'hello'
		};
		let newObj = new Update(update, true, defaultUpdateFactory).apply(obj);
		let expectedObj = {
			hi: 'hello'
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	});

	// Used by the shouldSkip testers
	function shouldSkipTester(shouldSkipParam, done) {
		let obj = {
			purdueAwesomeness: 0,
			ukAwesomeness: 0,
			adjectives: {
				purdue: [ 'cool', 'ballin', 'tubular' ],
				uk: [ 'dumb', 'stupid', 'horrible' ]
			}
		};
		let update = {
			$set: {
				purdue: 'great',
				uk: 'amazing'
			},
			$inc: {
				purdueAwesomeness: 10000,
				ukAwesomeness: 1000000
			},
			$addToSet: {
				'adjectives.purdue': 'swell',
				'adjectives.uk': 'coolio'
			}
		};
		let newObj = new Update(update, true, defaultUpdateFactory).apply(obj, { skipFields: shouldSkipParam });
		let expectedObj = {
			purdue: 'great',
			purdueAwesomeness: 10000,
			ukAwesomeness: 0,
			adjectives: {
				purdue: [ 'cool', 'ballin', 'tubular', 'swell' ],
				uk: [ 'dumb', 'stupid', 'horrible' ]
			}
		};
		expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		done();
	}

	it('shouldSkip as array', function(done) {
		let shouldSkipParam = [ 'uk', 'ukAwesomeness', 'adjectives.uk' ];
		shouldSkipTester(shouldSkipParam, done);
	});

	it('shouldSkip as map', function(done) {
		let shouldSkipParam = {
			uk: true,
			ukAwesomeness: true,
			'adjectives.uk': true
		};
		shouldSkipTester(shouldSkipParam, done);
	});

	it('shouldSkip as function', function(done) {
		let shouldSkipParam = function(fieldName) {
			if (fieldName.indexOf('uk') === -1) return false;
			return true;
		};
		shouldSkipTester(shouldSkipParam, done);
	});

});
