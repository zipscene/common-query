const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');
const { createUpdate, Update, UpdateValidationError, defaultUpdateFactory } = require('../lib/index');

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

	describe('createFromDiff()', function() {
		it('creates diff for empty objects', function() {
			let fromValue = {};

			let toValue = {};

			let patch = Update.createFromDiff(fromValue, toValue);

			let expected = {};

			expect(patch).to.deep.equal(expected);
		});

		it('creates diff between two objects', function() {
			let fromValue = {
				same: 'foo',
				changed: 'foo',
				removed: false,
				addedElements: [ 1 ],
				removedElements: [ 1, 2, 3 ],
				changedElements: [ 2, 4, 7, 16 ],
				addedAndChangedElement: [ 2, 4, 7, 16 ],
				changedItem: [
					{ foo: 'foo' },
					{ foo: 'bar' }
				],
				child: {
					name: 'Bruce Wayne',
					numParents: 2,
					dad: {
						DOB: new Date(1965, 1, 1),
						isAlive: true
					},
					mom: {
						DOB: new Date(1950, 1, 1),
						isAlive: true
					}
				},
				boolToArray: 'I am a string.'
			};

			let toValue = {
				same: 'foo',
				changed: 'bar',
				added: true,
				addedElements: [ 1, 2, 3 ],
				removedElements: [ 1, 3 ],
				changedElements: [ 2, 4, 8, 16 ],
				addedAndChangedElement: [ 2, 4, 8, 10, 16 ],
				changedItem: [
					{ foo: 'foo' },
					{ foo: 'baz' }
				],
				child: {
					name: 'Batman',
					numParents: 0,
					dad: {
						DOB: new Date(1960, 1, 1),
						DOD: new Date(2000, 1, 1)
					},
					mom: {
						DOB: new Date(1950, 1, 1),
						DOD: new Date(2000, 1, 1),
						isAlive: false
					}
				},
				boolToArray: [ 'Now', 'I', 'am', 'an', 'Array' ]
			};

			let patch = Update.createFromDiff(fromValue, toValue);

			let expected = {
				$set: {
					changed: 'bar',
					added: true,
					'addedElements.1': 2,
					'addedElements.2': 3,
					'removedElements.1': 3,
					'changedElements.2': 8,
					'addedAndChangedElement.2': 8,
					'addedAndChangedElement.3': 10,
					'addedAndChangedElement.4': 16,
					'changedItem.1.foo': 'baz',
					'child.name': 'Batman',
					'child.numParents': 0,
					'child.dad.DOB': new Date(1960, 1, 1),
					'child.dad.DOD': new Date(2000, 1, 1),
					'child.mom.DOD': new Date(2000, 1, 1),
					'child.mom.isAlive': false,
					boolToArray: [ 'Now', 'I', 'am', 'an', 'Array' ]
				},
				$unset: {
					removed: true,
					'removedElements.2': true,
					'child.dad.isAlive': true
				},
				$push: {
					'removedElements': { $slice: 2 }
				}
			};

			expect(patch).to.deep.equal(expected);
		});

		it('replaces arrays entirely when desired', function() {
			let fromValue = {
				addedElements: [ 1 ],
				removedElements: [ 1, 2, 3 ],
				changedElements: [ 2, 4, 7, 16 ],
				addedAndChangedElement: [ 2, 4, 7, 16 ],
				changedItem: [
					{ foo: 'foo' },
					{ foo: 'bar' }
				]
			};

			let toValue = {
				addedElements: [ 1, 2, 3 ],
				removedElements: [ 1, 3 ],
				changedElements: [ 2, 4, 8, 16 ],
				addedAndChangedElement: [ 2, 4, 8, 10, 16 ],
				changedItem: [
					{ foo: 'foo' },
					{ foo: 'baz' }
				]
			};

			let patchReplacingNone = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: false
			});
			let patchReplacingAll = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: true
			});
			let patchReplacingEqual = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: 'EQUAL'
			});
			let patchReplacingDifferent = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: 'DIFFERENT'
			});
			let patchReplacingSmaller = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: 'SMALLER'
			});
			let patchReplacingLarger = Update.createFromDiff(fromValue, toValue, {
				replaceArrays: 'LARGER'
			});

			let expectedReplacingNone = {
				$set: {
					'addedElements.1': 2,
					'addedElements.2': 3,
					'removedElements.1': 3,
					'changedElements.2': 8,
					'addedAndChangedElement.2': 8,
					'addedAndChangedElement.3': 10,
					'addedAndChangedElement.4': 16,
					'changedItem.1.foo': 'baz'
				},
				$unset: {
					'removedElements.2': true
				},
				$push: {
					'removedElements': { $slice: 2 }
				}
			};

			let expectedReplacingAll = {
				$set: {
					addedElements: [ 1, 2, 3 ],
					removedElements: [ 1, 3 ],
					changedElements: [ 2, 4, 8, 16 ],
					addedAndChangedElement: [ 2, 4, 8, 10, 16 ],
					changedItem: [
						{ foo: 'foo' },
						{ foo: 'baz' }
					]
				}
			};

			let expectedReplacingEqual = {
				$set: {
					'addedElements.1': 2,
					'addedElements.2': 3,
					'removedElements.1': 3,
					changedElements: [ 2, 4, 8, 16 ],
					'addedAndChangedElement.2': 8,
					'addedAndChangedElement.3': 10,
					'addedAndChangedElement.4': 16,
					changedItem: [
						{ foo: 'foo' },
						{ foo: 'baz' }
					]
				},
				$unset: {
					'removedElements.2': true
				},
				$push: {
					'removedElements': { $slice: 2 }
				}
			};

			let expectedReplacingDifferent = {
				$set: {
					addedElements: [ 1, 2, 3 ],
					removedElements: [ 1, 3 ],
					'changedElements.2': 8,
					addedAndChangedElement: [ 2, 4, 8, 10, 16 ],
					'changedItem.1.foo': 'baz'
				}
			};

			let expectedReplacingSmaller = {
				$set: {
					'addedElements.1': 2,
					'addedElements.2': 3,
					removedElements: [ 1, 3 ],
					'changedElements.2': 8,
					'addedAndChangedElement.2': 8,
					'addedAndChangedElement.3': 10,
					'addedAndChangedElement.4': 16,
					'changedItem.1.foo': 'baz'
				}
			};

			let expectedReplacingLarger = {
				$set: {
					addedElements: [ 1, 2, 3 ],
					'removedElements.1': 3,
					'changedElements.2': 8,
					addedAndChangedElement: [ 2, 4, 8, 10, 16 ],
					'changedItem.1.foo': 'baz'
				},
				$unset: {
					'removedElements.2': true
				},
				$push: {
					'removedElements': { $slice: 2 }
				}
			};

			expect(patchReplacingNone).to.deep.equal(expectedReplacingNone);
			expect(patchReplacingAll).to.deep.equal(expectedReplacingAll);
			expect(patchReplacingEqual).to.deep.equal(expectedReplacingEqual);
			expect(patchReplacingDifferent).to.deep.equal(expectedReplacingDifferent);
			expect(patchReplacingSmaller).to.deep.equal(expectedReplacingSmaller);
			expect(patchReplacingLarger).to.deep.equal(expectedReplacingLarger);
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
					'dates': '1999-12-31',
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
					'dates': new Date('1999-12-31'),
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
