const { expect } = require('chai');
const { createUpdate, UpdateValidationError } = require('../../lib/index');
const { createSchema } = require('zs-common-schema');

describe('Core Update Operators', function() {
	function expectInvalid(updateData) {
		expect(() => {
			let update = createUpdate(updateData, { skipValidate: true });
			update.validate();
		}).to.throw(UpdateValidationError);
	}

	describe('$set', function() {
		it('sets fields to scalar or complex values', function() {
			const update = { $set: { abc: 321, 'arr.1': 1 } };
			const result = createUpdate(update).apply({ abc: 123, arr: [ 1, null, '1' ] });
			const expected= { abc: 321, arr: [ 1, 1, '1' ] };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object', function() {
			expectInvalid({ $set: 123 });
			expectInvalid({ $set: [ 123 ] });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				foo: '16'
			}, {
				schema: createSchema({ foo: Number })
			});
			expect(update.getData()).to.deep.equal({
				$set: { foo: 16 }
			});

			const update2 = createUpdate({
				$set: {
					foo: 32,
					'bar.2.baz': '123'
				}
			}, {
				schema: createSchema({
					foo: String,
					bar: [ { baz: Number } ]
				})
			});
			expect(update2.getData()).to.deep.equal({
				$set: {
					foo: '32',
					'bar.2.baz': 123
				}
			});
		});
	});

	describe('$unset', function() {
		it('deletes fields from a record', function() {
			const update = { $unset: { foo: true } };
			const result = createUpdate(update).apply({ foo: 'bar' });
			const expected = {};
			expect(result).to.deep.equal(expected);
		});

		it('takes an object', function() {
			expectInvalid({ $unset: '321' });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$unset: {
					foo: '16',
					bar: '',
					'baz.qux': false
				}
			});
			expect(update.getData()).to.deep.equal({
				$unset: {
					foo: true,
					bar: true,
					'baz.qux': true
				}
			});
		});
	});

	describe('$inc', function() {
		it('increases the values of a number by its argument', function() {
			const update = { $inc: {
				one: 0, eightpointfive: 1.3, thirteen: -8, 'primes.1': 4
			} };
			const result = createUpdate(update).apply({
				one: 1,
				eightpointfive: 8.5,
				thirteen: 13,
				primes: [ 2, 3, 5, 7, 11 ]
			});
			const expected = {
				one: 1,
				eightpointfive: 9.8,
				thirteen: 5,
				primes: [ 2, 7, 5, 7, 11 ]
			};
			expect(result).to.deep.equal(expected);
		});

		it('takes an object w/ number values', function() {
			expectInvalid({ $inc: '123aa' });
			expectInvalid({ $inc: { value: '1234aaa' } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$inc: { foo: '4' }
			});
			expect(update.getData()).to.deep.equal({
				$inc: { foo: 4 }
			});

			const update2 = createUpdate({
				$inc: { foo: '4' }
			}, {
				schema: createSchema({ foo: Number })
			});
			expect(update2.getData()).to.deep.equal({
				$inc: { foo: 4 }
			});
		});
	});

	describe('$mul', function() {
		it('multiplies the value of a number by its argument', function() {
			const update = { $mul: {
				one: 0, thirteen: -3, 'primes.1': 10
			} };
			const result = createUpdate(update).apply({
				one: 1,
				eightpointfive: 8.5,
				thirteen: 13,
				primes: [ 2, 3, 5, 7, 11 ]
			});
			const expected = {
				one: 0,
				eightpointfive: 8.5,
				thirteen: -39,
				primes: [ 2, 30, 5, 7, 11 ]
			};
			expect(result).to.deep.equal(expected);
		});

		it('takes an object w/ number values', function() {
			expectInvalid({ $mul: '123aa' });
			expectInvalid({ $mul: { value: '1234aaa' } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$mul: { foo: '8' }
			});
			expect(update.getData()).to.deep.equal({
				$mul: { foo: 8 }
			});

			const update2 = createUpdate({
				$mul: { foo: '8' }
			}, {
				schema: createSchema({ foo: Number })
			});
			expect(update2.getData()).to.deep.equal({
				$mul: { foo: 8 }
			});
		});
	});

	describe('$min', function() {
		it('updates if update value is less than current value', function() {
			const update = { $min: { zero: -2, five: 6 } };
			const result = createUpdate(update).apply({ zero: 0, five: 5 });
			const expected = { zero: -2, five: 5 };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object w/ number values', function() {
			expectInvalid({ $min: 123 });
			expectInvalid({ $min: { value: '1234aaa' } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$min: { foo: '4' }
			});
			expect(update.getData()).to.deep.equal({
				$min: { foo: 4 }
			});

			const update2 = createUpdate({
				$min: { foo: '4' }
			}, {
				schema: createSchema({ foo: Number })
			});
			expect(update2.getData()).to.deep.equal({
				$min: { foo: 4 }
			});
		});
	});

	describe('$max', function() {
		it('updates if update value is greater than current value', function() {
			const update = { $max: { minusten: -14, twenty: 44 } };
			const result = createUpdate(update).apply({ minusten: -10, twenty: 20 });
			const expected = { minusten: -10, twenty: 44 };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object w/ number values', function() {
			expectInvalid({ $max: 123 });
			expectInvalid({ $max: { value: '1234aaa' } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$max: { foo: '128' }
			});
			expect(update.getData()).to.deep.equal({
				$max: { foo: 128 }
			});

			const update2 = createUpdate({
				$max: { foo: '128' }
			}, {
				schema: createSchema({ foo: Number })
			});
			expect(update2.getData()).to.deep.equal({
				$max: { foo: 128 }
			});
		});
	});

	describe('$rename', function() {
		it('renames stuff', function() {
			const update = { $rename: { hi: 'hello', sup: 'wassup' } };
			const result = createUpdate(update).apply({ hi: 'hi', bye: 'bye' });
			const expected = { hello: 'hi', bye: 'bye' };
			expect(result).to.deep.equal(expected);
		});

		it('$rename to identical name', function() {
			const update = { $rename: { hi: 'hi', bye: 'goodbye' } };
			const result = createUpdate(update).apply({ hi: 'hi', bye: 'bye' });
			const expected = { hi: 'hi', goodbye: 'bye' };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object ', function() {
			expectInvalid({ $rename: { oldName: { new: 'name' } } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$rename: { foo: 128 }
			}, {
				schema: createSchema({ foo: String })
			});
			expect(update.getData()).to.deep.equal({
				$rename: { foo: '128' }
			});
		});
	});

	describe('$addToSet', function() {
		it('scalar $addToSet', function() {
			const update = createUpdate({
				$addToSet: { 'nested.set': 'f' }
			});
			const result = update.apply({ nested: { set: [ 'a', 'b', 'c', 'd', 'e' ] } });
			const expected = { nested: { set: [ 'a', 'b', 'c', 'd', 'e', 'f' ] } };
			expect(result).to.deep.equal(expected);
		});

		it('adds multiple values w/ $each', function() {
			const update = createUpdate({
				$addToSet: {
					set: { $each: [ 6, 3, 1, 7 ] }
				}
			});
			const result = update.apply({ set: [ 1, 2, 3, 4, 5 ] });
			const expected = { set: [ 1, 2, 3, 4, 5, 6, 7 ] };
			expect(result).to.deep.equal(expected);
		});

		it('adds mixed scalar values', function() {
			const update = createUpdate({ $addToSet: {
				set: { $each: [ true, false, 2, '2', 'gareth' ] }
			} });
			const result = update.apply({ set: [ 1, 14, '1', 2, false, 'gareth' ] });
			const expected = { set: [ 1, 14, '1', 2, false, 'gareth', true, '2' ] };
			expect(result).to.deep.equal(expected);
		});

		it('adds complex values', function() {
			const update = createUpdate({ $addToSet: {
				set: { $each: [
					{ happy: 'happy', joy: 'joy' },
					{ unhappy: 'unhappy' },
					[ 1, 2, 3 ],
					[ 3, 2, 1, 0 ],
					new Date(2014, 5, 5).toISOString(),
					new Date(2015, 5, 5).toISOString()
				] }
			} });
			const result = update.apply({ set: [
				true,
				{ happy: 'happy', joy: 'joy' },
				{ unhappy: 'unhappy', grief: 'grief' },
				[ 1, 2, 3 ],
				[ 3, 2, 1 ],
				new Date(2014, 5, 5).toISOString()
			] });
			const expected = { set: [
				true,
				{ happy: 'happy', joy: 'joy' },
				{ unhappy: 'unhappy', grief: 'grief' },
				[ 1, 2, 3 ],
				[ 3, 2, 1 ],
				new Date(2014, 5, 5).toISOString(),
				{ unhappy: 'unhappy' },
				[ 3, 2, 1, 0 ],
				new Date(2015, 5, 5).toISOString()
			] };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object', function() {
			expectInvalid({ $addToSet: 'doggy' });
		});

		it('takes an array w/ $each', function() {
			expectInvalid({ $addToSet: { theseones: {
				$each: { 'thisone': 'yes', 'thatone': 'yes' }
			} } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$addToSet: { set: '4' }
			}, {
				schema: createSchema({ set: [ Number ] })
			});
			expect(update.getData()).to.deep.equal({
				$addToSet: { set: 4 }
			});

			const update2 = createUpdate({
				$addToSet: {
					set: { $each: [ 1, 3, 3, 7 ] }
				}
			}, {
				schema: createSchema({ set: [ String ] })
			});
			expect(update2.getData()).to.deep.equal({
				$addToSet: {
					set: { $each: [ '1', '3', '3', '7' ] }
				}
			});
		});
	});

	describe('$push', function() {
		it('pushes a scalar or complex value onto an array', function() {
			const update = { $push: { set: 'gareth' } };
			const result = createUpdate(update).apply({
				set: [ 1, 14, '1', 2, false, 'gareth' ]
			});
			const expected = {
				set: [ 1, 14, '1', 2, false, 'gareth', 'gareth' ]
			};
			expect(result).to.deep.equal(expected);
		});

		it('pushes multiple values with $each', function() {
			const update = { $push: {
				set: { $each: [ true, false, 2, '2', 'gareth' ] }
			} };
			const result = createUpdate(update).apply({
				set: [ 1, 14, '1', 2, false, 'gareth' ]
			});
			const expected = {
				set: [ 1, 14, '1', 2, false, 'gareth', true, false, 2, '2', 'gareth' ]
			};
			expect(result).to.deep.equal(expected);
		});

		it('treats fields as paths', function() {
			const update = { $push: { 'nested.set': 'appendectomy' } };
			const result = createUpdate(update).apply({
				nested: { set: [ true, 'waifu', 976 ] }
			});
			const expected = {
				nested: { set: [ true, 'waifu', 976, 'appendectomy' ] }
			};
			expect(result).to.deep.equal(expected);
		});
		it('takes an object', function() {

			expectInvalid({ $push: 'this thing' });
		});

		it('takes an array w/ $each', function() {
			expectInvalid({ $push: { theseones: {
				$each: { 'thisone': 'yes', 'thatone': 'yes' }
			} } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$push: { set: '4' }
			}, {
				schema: createSchema({ set: Number })
			});
			expect(update.getData()).to.deep.equal({
				$push: { set: 4 }
			});

			const update2 = createUpdate({
				$push: { set: { $each: [ '2', '4' ] } }
			}, {
				schema: createSchema({ set: [ Number ] })
			});
			expect(update2.getData()).to.deep.equal({
				$push: { set: { $each: [ 2, 4 ] } }
			});
		});
	});

	describe('$pop', function() {
		it('pops a value from the head of an array with 1', function() {
			const update = { $pop: { set: 1 } };
			const result = createUpdate(update).apply({ set: [ 1, 14, '1', 2, false, 'gareth' ] });
			const expected = { set: [ 1, 14, '1', 2, false ] };
			expect(result).to.deep.equal(expected);
		});

		it('pops a value from the tail of an array with -1', function() {
			const update = { $pop: { 'nested.set': -1 } };
			const result = createUpdate(update).apply({ nested: { set: [ true, 'waifu', 976 ] } });
			const expected = { nested: { set: [ 'waifu', 976 ] } };
			expect(result).to.deep.equal(expected);
		});

		it('takes an object w/ values 1 or -1', function() {
			expectInvalid({ $pop: 'this thing as well' });
			expectInvalid({ $pop: { 'a.cool.array': 0 } });
		});

		it('normalizes queries', function() {
			const update = createUpdate({
				$pop: { set: '-1' }
			}, {
				schema: createSchema({ set: Number })
			});
			expect(update.getData()).to.deep.equal({
				$pop: { set: -1 }
			});
		});
	});
});
