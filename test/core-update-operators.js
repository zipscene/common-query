let { expect } = require('chai');
let { createUpdate, UpdateValidationError } = require('../lib/index');
let objtools = require('zs-objtools');

describe('Core Update Operators', function() {
	function expectInvalid(updateData) {
		expect(function() { createUpdate(updateData); }).to.throw(UpdateValidationError);
	}

	describe('$set', function() {
		it('sets fields to scalar or complex values', function() {
			let obj = {
				abc: 123,
				arr: [ 1, null, '1' ]
			};
			let update = {
				$set: {
					abc: 321,
					'arr.1': 1
				}
			};
			let newObj = createUpdate(update).apply(obj);
			let expectedObj = {
				abc: 321,
				arr: [ 1, 1, '1' ]
			};
			expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		});
		it('validates properly', function() {
			expectInvalid({
				$set: 123
			});
		});
	});

	describe('$unset', function() {
		it('deletes fields from a record', function() {
			let obj = {
				foo: 'bar'
			};
			let update = {
				$unset: {
					foo: true
				}
			};
			let newObj = createUpdate(update).apply(obj);
			let expectedObj = { };
			expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		});
		it('validates properly', function() {
			expectInvalid({
				$unset: '321'
			});
		});
	});

	describe('$inc', function() {
		it('increases the values of a number by its argument', function() {
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
		});
		it('validates properly', function() {
			expectInvalid({
				$inc: '123aa'
			});
		});
	});

	describe('$mul', function() {
		it('multiplies the value of a number by its argument', function() {
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
		});
		it('validates properly', function() {
			expectInvalid({
				$mul: {
					value: '1234aaa'
				}
			});
		});
	});

	describe('$rename', function() {
		it('renames stuff', function() {
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
		});
		it('$rename to identical name', function() {
			let obj = {
				hi: 'hi',
				bye: 'bye'
			};
			let update = {
				$rename: {
					hi: 'hi',
					bye: 'goodbye'
				}
			};
			let newObj = createUpdate(update).apply(obj);
			let expectedObj = {
				hi: 'hi',
				goodbye: 'bye'
			};
			expect(objtools.deepEquals(newObj, expectedObj)).to.equal(true);
		});
		it('validates properly', function() {
			expectInvalid({
				$rename: {
					oldName: {
						new: 'name'
					}
				}
			});
		});
	});

	describe('$min, $max', function() {
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
		it('validates properly', function() {
			expectInvalid({
				$min: 123
			});
			expectInvalid({
				$max: {
					value: '1234aaa'
				}
			});
		});
	});

	describe('$addToSet', function() {
		it('uniform scalar $addToSet', function() {
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
		});

		it('mixed scalar $addToSet', function() {
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
		});
		it('complex $addToSet', function() {
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
		});
		it('validates properly', function() {
			expectInvalid({
				$addToSet: 'doggy'
			});
			expectInvalid({
				$addToSet: {
					theseones: {
						$each: {
							'thisone': 'yes',
							'thatone': 'yes'
						}
					}
				}
			});
		});
	});

	describe('$push', function() {
		it('pushes a unique scalar or complex value onto an array', function() {
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
		});
		it('validates properly', function() {
			expectInvalid({
				$push: 'this thing'
			});
		});
	});

	describe('$pop', function() {
		it('pops a value from the head or tail of an array based on its argument', function() {
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
		});
		it('validates properly', function() {
			expectInvalid({
				$pop: 'this thing as well'
			});
			expectInvalid({
				$pop: {
					'a.cool.array': 0
				}
			});
		});
	});
});
