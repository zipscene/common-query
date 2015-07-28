const { expect } = require('chai');
const { createUpdate, Update, UpdateValidationError, defaultUpdateFactory } = require('../lib/index');
const { createSchema } = require('zs-common-schema');

describe('Update', function() {
	describe('constructor', function() {
		it('skips validation with the skipValidate option', function() {
			const updateData = { '$mega': 'invalid', '$dude': 'like are you even trying' };
			const options = { skipValidate: true };
			const wrappedNoSkip = () => new Update(updateData, defaultUpdateFactory);
			expect(wrappedNoSkip).to.throw(UpdateValidationError);
			const wrappedSkip = () => new Update(updateData, defaultUpdateFactory, options);
			expect(wrappedSkip).to.not.throw(Error);
		});
	});

	describe('#apply()', function() {
		// Used by the shouldSkip testers
		function shouldSkipTester(shouldSkipParam) {
			const options = { skipFields: shouldSkipParam };
			const update = new Update({
				$set: { purdue: 'great', uk: 'amazing' },
				$inc: { purdueAwesomeness: 10000, ukAwesomeness: 1000000 },
				$addToSet: { 'adjectives.purdue': 'swell', 'adjectives.uk': 'coolio' }
			}, defaultUpdateFactory, options);
			const obj = {
				purdueAwesomeness: 0,
				ukAwesomeness: 0,
				adjectives: {
					purdue: [ 'cool', 'ballin', 'tubular' ],
					uk: [ 'dumb', 'stupid', 'horrible' ]
				}
			};
			const result = update.apply(obj, options);
			const expected = {
				purdue: 'great',
				purdueAwesomeness: 10000,
				ukAwesomeness: 0,
				adjectives: {
					purdue: [ 'cool', 'ballin', 'tubular', 'swell' ],
					uk: [ 'dumb', 'stupid', 'horrible' ]
				}
			};
			expect(result).to.deep.equal(expected);
		}

		it('empty update does nothing', function() {
			const obj = { foo: 'bar', abc: 123, arr: [ 1, null, '1' ] };
			const newObj = createUpdate({}).apply(obj);
			expect(newObj).to.deep.equal(obj);
		});

		it('doesnt allow a full replace w/o the fullReplace option', function() {
			const obj = { hi: 'hi', bye: 'bye' };
			const update = new Update({ hi: 'hello' }, defaultUpdateFactory);
			const result = update.apply(obj);
			const expected = { hi: 'hello', bye: 'bye' };
			expect(result).to.deep.equal(expected);
		});

		it('performs a full replace if the update does not include operators', function() {
			const obj = { hi: 'hi', bye: 'bye' };
			const options = { allowFullReplace: true };
			const update = new Update({ hi: 'hello' }, defaultUpdateFactory, options);
			const result = update.apply(obj);
			const expected = { hi: 'hello' };
			expect(result).to.deep.equal(expected);
		});

		it('shouldSkip as array', function() {
			const shouldSkipParam = [ 'uk', 'ukAwesomeness', 'adjectives.uk' ];
			shouldSkipTester(shouldSkipParam);
		});

		it('shouldSkip as map', function() {
			const shouldSkipParam = { uk: true, ukAwesomeness: true, 'adjectives.uk': true };
			shouldSkipTester(shouldSkipParam);
		});

		it('shouldSkip as function', function() {
			const shouldSkipParam = (fieldName) => fieldName.indexOf('uk') !== -1;
			shouldSkipTester(shouldSkipParam);
		});
	});

	describe('#normalize()', function() {
		it('wraps operationless updates in $set', function() {
			// `createQuery` calls `query.normalize`
			const update = createUpdate({
				foo: 1024
			});

			const expected = {
				$set: {
					foo: 1024
				}
			};

			expect(update.getData()).to.deep.equal(expected);
		});
	});

	describe('#validate()', function() {
		function expectInvalid(updateData) {
			expect(() => createUpdate(updateData)).to.throw(UpdateValidationError);
		}

		it('complex update validates correctly', function() {
			const updateData = {
				$set: { bob: 1, alice: 2, alexander: { three: 3, four: 4 } },
				$unset: { rachel: true },
				$inc: { frank: -1, forrest: 777 },
				$mul: { thomas: -8 },
				$rename: { 'evan.kappa': 'evan.frankerz' },
				$min: { apples: 12341234 },
				$addToSet: { peopleArr: { name: 'Doug', favoriteColor: 'periwinkle' } },
				$push: { foodArr: { $each: [ 'rice', 'cookies', 'pancakes' ] } },
				$pop: { balloon: 1 }
			};
			createUpdate(updateData);  // Will validate in constructor
		});

		it('can call validate() explicitly', function() {
			const update = createUpdate({ $set: { a: 1 }, $unset: { b: true } });
			expect(update.validate()).to.equal(true);
		});

		it('mixed properties and operators', function() {
			expectInvalid({ $set: { a: 1 }, $unset: { b: 2 }, c: 3 });
		});

		it('invalid operator', function() {
			expectInvalid({ $set: { a: 'b' }, $ultraset: { c: 'd' } });
		});
	});
});
