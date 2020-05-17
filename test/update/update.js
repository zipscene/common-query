// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { expect } = require('chai');
const { createSchema } = require('common-schema');
const {
	createUpdate,
	Update,
	UpdateValidationError,
	defaultUpdateFactory,
	ComposeUpdateError
} = require('../../lib/index');

describe('Update', function() {
	describe('constructor', function() {
		it('skips validation with the skipValidate option', function() {
			const updateData = { $mega: 'invalid', $dude: 'like are you even trying' };
			expect(() => new Update(updateData, defaultUpdateFactory))
				.to.throw(UpdateValidationError);
			expect(() => new Update(updateData, defaultUpdateFactory, { skipValidate: true }))
				.to.not.throw(Error);
		});
	});

	describe('#transformUpdatedFields', function() {
		it('should update the keys on full replace', function() {
			let fromValue = {
				foo: 1,
				bar: 10
			};
			let toValue = {
				$set: {
					foo1: 1,
					bar1: 10
				}
			};
			let update = createUpdate(fromValue);
			let func = function(key) {
				return `${key}1`;
			};
			update.transformUpdatedFields(func);
			expect(update.getData()).to.deep.equal(toValue);
		});
		it('should update the keys', function() {
			let fromValue = {
				$inc: { foo: 1, bar: 2 },
				$max: { bar: 10 },
				$push: { batz: { $each: [ 1, 2, 3 ] } },
				$set: { 'a.thing': 2 }
			};
			let toValue = {
				$inc: { bar: 1, foo: 2 },
				$max: { foo: 10 },
				$push: { batz1: { $each: [ 1, 2, 3 ] } },
				$set: { 'a.thing1': 2 }
			};
			let update = createUpdate(fromValue);
			let func = function(key) {
				if (key === 'foo') return 'bar';
				if (key === 'bar') return 'foo';
				return `${key}1`;
			};
			update.transformUpdatedFields(func);
			expect(update.getData()).to.deep.equal(toValue);
		});
	});

	describe('createFromDiff()', function() {
		it('creates diff for empty objects', function() {
			let fromValue = {};
			let toValue = {};
			let patch = Update.createFromDiff(fromValue, toValue);
			let expected = {};
			expect(patch).to.deep.equal(expected);
		});

		it('change array to object', function() {
			let from = {
				a: [ 1, 2 ]
			};
			let to = {
				a: { foo: 1 }
			};
			let expected = {
				$set: {
					a: { foo: 1 }
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});

		it('pushes new array elements', function() {
			let from = {
				a: [ 1, 2 ]
			};
			let to = {
				a: [ 1, 2, 3 ]
			};
			let expected = {
				$push: {
					a: {
						$each: [ 3 ]
					}
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});
		
		it('truncates array', function() {
			let from = {
				a: [ 1, 2 ]
			};
			let to = {
				a: [ 1 ]
			};
			let expected = {
				$push: {
					a: {
						$each: [],
						$slice: 1
					}
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});

		it('changes array', function() {
			let from = {
				a: [ 1, 2 ]
			};
			let to = {
				a: [ 3, 2 ]
			};
			let expected = {
				$set: {
					'a.0': 3
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});
		
		it('replaces array on changed length + contents', function() {
			let from = {
				a: [ 1, 2, 3 ]
			};
			let to = {
				a: [ 1, 20, 3, 4 ]
			};
			let expected = {
				$set: {
					a: [ 1, 20, 3, 4 ]
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});

		it('updates dates', function() {
			let date1 = new Date('2020-01-01T00:00:00Z');
			let date2 = new Date('2020-01-02T00:00:00Z');
			let from = {
				a: date1
			};
			let to = {
				a: date2
			};
			let expected = {
				$set: {
					a: date2
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});

		it('recursively sets objects', function() {
			let from = {
				a: {
					b: {
						c: 5,
						d: 6
					}
				}
			};
			let to = {
				a: {
					b: {
						c: 6
					}
				}
			};
			let expected = {
				$set: {
					'a.b.c': 6
				},
				$unset: {
					'a.b.d': true
				}
			};
			expect(Update.createFromDiff(from, to)).to.deep.equal(expected);
		});

		it('replace scalar with object and vice versa', function() {
			let fromValue = {
				id: 'asdf',
				arr: [
					{
						arrId: 'abc',
						stuff: true
					},
					{
						hello: true
					}
				]
			};
			let toValue = {
				id: 'asdf',
				arr: [
					{
						arrId: '123',
						stuff: {
							more: 'stuff'
						}
					},
					650
				]
			};
			let expectedUpdate = {
				$set: {
					'arr.0.arrId': '123',
					'arr.0.stuff': { more: 'stuff' },
					'arr.1': 650
				}
			};
			expect(Update.createFromDiff(fromValue, toValue)).to.deep.equal(expectedUpdate);
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

		it('normalizes updates', function() {
			const update = createUpdate({
				$set: { jake: 'Jake!' },
				$unset: { alice: 'Do it. Do it! COME ON, DO IT NOW!!!' },
				$inc: { sam: '32.32', 'bob.age': -1 },
				$mul: { mark: '32.32', 'jimmy.age': 16 },
				$rename: { frankerz: 'kappa' },
				$min: { apples: 12341234 },
				$addToSet: { 'adjectives.purdue': 'swell', 'adjectives.uc': 'coolio' },
				$push: {
					foodArr: { $each: [ 'rice', 'cookies', 'pancakes' ] }
				},
				$pop: { balloon: 1 }
			});

			const expected = {
				$set: { jake: 'Jake!' },
				$unset: { alice: true },
				$inc: { sam: 32.32, 'bob.age': -1 },
				$mul: { mark: 32.32, 'jimmy.age': 16 },
				$rename: { frankerz: 'kappa' },
				$min: { apples: 12341234 },
				$addToSet: { 'adjectives.purdue': 'swell', 'adjectives.uc': 'coolio' },
				$push: {
					foodArr: { $each: [ 'rice', 'cookies', 'pancakes' ] }
				},
				$pop: { balloon: 1 }
			};

			expect(update.getData()).to.deep.equal(expected);

			const updateWithSchema = createUpdate({
				$set: { jake: 'Jake!' },
				$unset: { alice: 'Do it. Do it! COME ON, DO IT NOW!!!' },
				$inc: { sam: '32.32', 'bob.age': -1 },
				$mul: { mark: '32.32', 'jimmy.age': 16 },
				$rename: { frankerz: 'kappa' },
				$min: { apples: 12341234 },
				$addToSet: {
					dates: '1999-12-31',
					'adjectives.uc': 'dapper',
					'adjectives.purdue': {
						$each: [ 'silly', 'jerks' ]
					}
				},
				$push: {
					foodArr: { $each: [ 'rice', 'cookies', 'pancakes' ] }
				},
				$pop: { balloon: 1 }
			}, {
				schema: createSchema({
					jake: String,
					alice: String,
					sam: Number,
					bob: {
						age: Number
					},
					mark: Number,
					jimmy: {
						age: Number
					},
					frankerz: String,
					apples: Number,
					dates: [ Date ],
					adjectives: {
						uc: [ String ],
						purdue: [ String ]
					},
					foodArr: [ String ],
					balloon: Number
				})
			});

			const expectedWithSchema = {
				$set: { jake: 'Jake!' },
				$unset: { alice: true },
				$inc: { sam: 32.32, 'bob.age': -1 },
				$mul: { mark: 32.32, 'jimmy.age': 16 },
				$rename: { frankerz: 'kappa' },
				$min: { apples: 12341234 },
				$addToSet: {
					dates: new Date('1999-12-31'),
					'adjectives.uc': 'dapper',
					'adjectives.purdue': {
						$each: [ 'silly', 'jerks' ]
					}
				},
				$push: {
					foodArr: { $each: [ 'rice', 'cookies', 'pancakes' ] }
				},
				$pop: { balloon: 1 }
			};

			expect(updateWithSchema.getData()).to.deep.equal(expectedWithSchema);

			const serializeUpdate = createUpdate({
				$inc: { age: 1 },
				$set: {
					address: {
						street: '123 Fake Str.',
						city: 'Cincinnati'
					}
				}
			}, {
				schema: createSchema({
					age: Number,
					address: {
						type: 'mixed',
						serializeMixed: true
					}
				}),
				serialize: true
			});

			const expectedSerialized = {
				$inc: { age: 1 },
				$set: {
					address: '{"street":"123 Fake Str.","city":"Cincinnati"}'
				}
			};
			expect(serializeUpdate.getData()).to.deep.equal(expectedSerialized);
		});
	});

	describe('#validate()', function() {
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
			const update = createUpdate(updateData, { skipValidate: true });
			expect(update.validate()).to.be.true;
		});

		it('validates full updates to true', function() {
			const update = createUpdate({ a: 3 }, { skipValidate: true });
			expect(update.validate()).to.be.true;
		});

		it('mixed properties and operators', function() {
			const update = createUpdate({ $set: { a: 1 }, $unset: { b: 2 }, c: 3 }, { skipValidate: true });
			expect(() => update.validate())
				.to.throw(UpdateValidationError, /Update cannot be a mix of operators and non-operators/);
		});

		it('should fail validation on unrecognized operators', function() {
			const update = createUpdate({ $set: { a: 'b' }, $ultraset: { c: 'd' } }, { skipValidate: true });
			expect(() => update.validate())
				.to.throw(UpdateValidationError, /Unrecognized update operator: \$ultraset/);
		});
	});

	describe('#composeUpdate()', function() {

		it('should be a direct copy on an empty update', function() {
			let update = createUpdate({});
			update.composeUpdate({ $set: { foo: 1 } });
			expect(update.getData()).to.deep.equal({
				$set: { foo: 1 }
			});

			update.composeUpdate({});
			expect(update.getData()).to.deep.equal({
				$set: { foo: 1 }
			});
		});

		it('should throw an error if a $pop attribute is both -1 and 1', function() {
			let updateData = {
				$pop: { bob: 1 }
			};
			let newUpdate = {
				$pop: { bob: -1 }
			};
			let update = createUpdate(updateData);
			expect(() => {
				update.composeUpdate(newUpdate);
			}).to.throw(ComposeUpdateError, /Invalid composition: \$pop cannot handle -1 and 1 on bob/);
		});

		it('should throw an error if a push and pop is called on the same field', function() {
			let updateData = {
				$push: { bob: 1 }
			};
			let newUpdate = {
				$pop: { bob: -1 }
			};
			let update = createUpdate(updateData);
			expect(() => {
				update.composeUpdate(newUpdate);
			}).to.throw(ComposeUpdateError, /Invalid composition: Cannot have a key that is both a \$push and a \$pop/);
		});

		it('should handle sets and unsets properly', function() {
			let updateData = {
				$set: { bob: 1, alice: 5, dog: 'puppy' },
				$unset: { tom: true }
			};
			let update = createUpdate(updateData);
			update.composeUpdate({
				$set: { bob: 2, tom: 5 },
				$unset: { alice: true, cat: true }
			});
			expect(update.getData()).to.deep.equal({
				$set: { bob: 2, tom: 5, dog: 'puppy' },
				$unset: { alice: true, cat: true }
			});
		});

		it('should a field on $inc when it is equal to 0', function() {
			let updateData = { $inc: { total: 10 } };
			let update = createUpdate(updateData);
			update.composeUpdate({
				$inc: { total: -10 }
			});
			expect(update.getData()).to.deep.equal({});
		});

		it('should add $inc fields together and remove any that are 0 and multiple $mul fields together', function() {
			let updateData = {
				$inc: { total: 10, count: -5 },
				$mul: { time: 5, counter: 5 }
			};
			let update = createUpdate(updateData);
			update.composeUpdate({
				$inc: { total: 2, count: 5, steps: 6 },
				$mul: { time: 2 }
			});
			expect(update.getData()).to.deep.equal({
				$inc: { total: 12, steps: 6 },
				$mul: { time: 10, counter: 5 }
			});
		});

		it('should map $rename ops properly', function() {
			let updateData = {
				$rename: { unicorn: 'magicalCreatures', fruit: 'FRUIT' }
			};
			let update = createUpdate(updateData);
			update.composeUpdate({
				$rename: {
					unicorn: 'fantasyHorses',
					veggies: 'vegatables'
				}
			});
			expect(update.getData()).to.deep.equal({
				$rename: {
					unicorn: 'fantasyHorses',
					fruit: 'FRUIT',
					veggies: 'vegatables'
				}
			});
		});

		it('should combine $addToSet with and without lists', function() {
			let updateData = {
				$addToSet: {
					horse: 'unicorn',
					fruit: { $each: [ 'peaches', 'apples' ] },
					veggies: 'carrots'
				}
			};
			let update = createUpdate(updateData);
			update.composeUpdate({
				$addToSet: {
					horse: 'mustange',
					fruit: 'watermelon',
					veggies: { $each: [ 'brocolli', 'potatoes' ] },
					color: 'blue'
				}
			});
			expect(update.getData()).to.deep.equal({
				$addToSet: {
					horse: { $each: [ 'unicorn', 'mustange' ] },
					fruit: { $each: [ 'peaches', 'apples', 'watermelon' ] },
					veggies: { $each: [ 'carrots', 'brocolli', 'potatoes' ] },
					color: 'blue'
				}
			});
		});

		it('should handle combining lists for $push, and handle $pop properly', function() {
			let updateData = {
				$push: {
					horse: 'unicorn',
					fruit: { $each: [ 'peaches', 'apples' ] },
					veggies: 'carrots'
				},
				$pop: { frank: true }
			};
			let update = createUpdate(updateData);
			update.composeUpdate({
				$push: {
					horse: 'mustange',
					fruit: 'watermelon',
					veggies: { $each: [ 'brocolli', 'potatoes' ] },
					color: 'blue'
				},
				$pop: { tim: true }
			});
			expect(update.getData()).to.deep.equal({
				$push: {
					horse: { $each: [ 'unicorn', 'mustange' ] },
					fruit: { $each: [ 'peaches', 'apples', 'watermelon' ] },
					veggies: { $each: [ 'carrots', 'brocolli', 'potatoes' ] },
					color: 'blue'
				},
				$pop: { frank: true, tim: true }
			});
		});

		it('should not have any update operators that are undefined after composition', function() {
			let updateData = {
				$set: { bob: 1, alice: 5 }
			};
			let newUpdate = {
				$unset: { bob: true, alice: true },
				$set: { boo: 30 }
			};
			let update = createUpdate(updateData);
			update.composeUpdate(newUpdate);
			expect(update.getData()).to.deep.equal({
				$unset: { bob: true, alice: true },
				$set: { boo: 30 }
			});
		});

		it('::compose()', function() {
			let update1 = {
				$inc: { foo: 1 }
			};
			let update2 = {
				$inc: { foo: 2, bar: -1 },
				$set: { zip: 'zip', zap: 'zap' }
			};
			let update3 = {
				$unset: { zap: 1 }
			};
			let expected = {
				$inc: { foo: 3, bar: -1 },
				$set: { zip: 'zip' },
				$unset: { zap: true }
			};
			let actual = Update.compose(update1, update2, update3).getData();
			expect(actual).to.deep.equal(expected);
		});

		it('compose with 1 argument', function() {
			let update = {
				$inc: {
					foo: -1,
					bar: -1
				}
			};
			let composed = Update.compose(update).getData();
			expect(composed).to.deep.equal(update);
		});
	});
});
