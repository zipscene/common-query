let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;
let Update = require('../lib/index').Update;
let UpdateValidationError = require('../lib/index').UpdateValidationError;
let defaultUpdateFactory = require('../lib/index').defaultUpdateFactory;
let objtools = require('zs-objtools');

describe('Update', function() {
	describe('constructor', function() {
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

	describe('#apply()', function() {
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
			let newObj = new Update(update, defaultUpdateFactory).apply(obj, { skipFields: shouldSkipParam });
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
		it('full replace 1', function(done) {
			let obj = {
				hi: 'hi',
				bye: 'bye'
			};
			let update = {
				hi: 'hello'
			};
			let newObj = new Update(update, defaultUpdateFactory, {
				allowFullReplace: false
			}).apply(obj);
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
			let newObj = new Update(update, defaultUpdateFactory, {
				allowFullReplace: true
			}).apply(obj);
			let expectedObj = {
				hi: 'hello'
			};
			expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
			done();
		});
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

	describe('#validate()', function() {
		function expectInvalid(updateData) {
			expect(function() { createUpdate(updateData); }).to.throw(UpdateValidationError);
		}

		it('complex update validates correctly', function(done) {
			let updateData = {
				$set: {
					bob: 1,
					alice: 2,
					alexander: {
						three: 3,
						four: 4
					}
				},
				$unset: {
					rachel: true
				},
				$inc: {
					frank: -1,
					forrest: 777
				},
				$mul: {
					thomas: -8
				},
				$rename: {
					'evan.kappa': 'evan.frankerz'
				},
				$min: {
					apples: 12341234
				},
				$addToSet: {
					peopleArr: { name: 'Doug', favoriteColor: 'periwinkle' }
				},
				$push: {
					foodArr: {
						$each: [ 'rice', 'cookies', 'pancakes' ]
					}
				},
				$pop: {
					balloon: 1
				}
			};
			createUpdate(updateData);  // Will validate in constructor
			done();
		});
		it('can call validate() explicitly', function(done) {
			let updateData = {
				$set: {
					a: 1
				},
				$unset: {
					b: true
				}
			};
			let update = createUpdate(updateData);
			expect(update.validate()).to.equal(true);
			done();
		});
		it('mixed properties and operators', function(done) {
			let updateData = {
				$set: {
					a: 1
				},
				$unset: {
					b: 2
				},
				c: 3
			};
			expectInvalid(updateData);
			done();
		});
		it('invalid operator', function(done) {
			expectInvalid({
				$set: {
					a: 'b'
				},
				$ultraset: {
					c: 'd'
				}
			});
			done();
		});
	});
});
