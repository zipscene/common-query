let expect = require('chai').expect;
let createQuery = require('../lib/index').createQuery;
let QueryValidationError = require('../lib/query-validation-error');

describe('Expression Operators', function() {
	function valid(query) {
		createQuery(query).validate();
	}
	function invalid(queryData) {
		expect(function() { createQuery(queryData); }).to.throw(QueryValidationError);
	}

	describe('$and', function() {
		it('$and', function() {
			let query1 = createQuery({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz',
						qux: 'bum'
					}
				],
				$nor: [
					{
						zip: 'zap'
					}
				]
			});
			invalid({
				$and: [
					{
						foo: 'bar'
					}
				],
				$or: {
					biz: 'baz'
				}
			});
			valid({
				$and: [
					{
						$or: [
							{
								foo: 'bar'
							}
						]
					}
				]
			});
			invalid({
				$and: [
					{
						$or: [
							{
								$and: 'bar'
							}
						]
					}
				]
			});
		});
	});

	describe('$or', function() {
		it('$or', function() {
			let query1 = createQuery({
				$or: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bam',
				biz: 'buz'
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz',
						qux: 'bum'
					}
				],
				$nor: [
					{
						zip: 'zap'
					}
				]
			});
			invalid({
				$and: [
					{
						foo: 'bar'
					}
				],
				$or: {
					biz: 'baz'
				}
			});
			valid({
				$and: [
					{
						$or: [
							{
								foo: 'bar'
							}
						]
					}
				]
			});
			invalid({
				$and: [
					{
						$or: [
							{
								$and: 'bar'
							}
						]
					}
				]
			});
		});
	});

	describe('$nor', function() {
		it('$nor', function() {
			let query1 = createQuery({
				$nor: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bam',
				biz: 'buz'
			})).to.equal(true);
		});
		it('validates properly', function() {
			valid({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz',
						qux: 'bum'
					}
				],
				$nor: [
					{
						zip: 'zap'
					}
				]
			});
			invalid({
				$and: [
					{
						foo: 'bar'
					}
				],
				$or: {
					biz: 'baz'
				}
			});
			valid({
				$and: [
					{
						$or: [
							{
								foo: 'bar'
							}
						]
					}
				]
			});
			invalid({
				$and: [
					{
						$or: [
							{
								$and: 'bar'
							}
						]
					}
				]
			});
		});
	});

	describe('combined $and, $or, $nor', function() {
		it('combined $and, $or, $nor', function() {
			let query1 = createQuery({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				],
				$or: [
					{
						qux: 'buz'
					},
					{
						bam: 'fuz'
					}
				],
				$nor: [
					{
						zip: 'foo'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar',
				qux: 'buz'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz',
				zip: 'foo'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz'
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$exists', function() {
		it('$exists', function() {
			let query1 = createQuery({
				foo: { $exists: true },
				bar: { $exists: false }
			});
			expect(query1.matches({
				foo: 'fuz'
			})).to.equal(true);
			expect(query1.matches({
				foo: null
			})).to.equal(true);
			expect(query1.matches({
				foo: undefined
			})).to.equal(false);
			expect(query1.matches({
				foo: 'fuz',
				bar: 'biz'
			})).to.equal(false);
			expect(query1.matches({
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				foo: {
					$exists: true
				}
			});
			invalid({
				foo: {
					$exists: 3
				}
			});
		});
	});

	describe('$not', function() {
		it('$not', function() {
			let query1 = createQuery({
				foo: { $not: { $exists: true } },
				bar: { $not: { $exists: false } }
			});
			expect(query1.matches({
				bar: 123
			})).to.equal(true);
			expect(query1.matches({
				bar: 123,
				foo: 123
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				foo: {
					$not: {
						$exists: true
					}
				}
			});
			invalid({
				foo: {
					$not: {
						$exists: 'zip'
					}
				}
			});
		});
	});

	describe('$elemMatch', function() {
		it('$elemMatch', function() {
			let query1 = createQuery({
				foo: {
					$elemMatch: {
						bar: 'baz',
						zip: 'buz'
					}
				}
			});
			expect(query1.matches({
				foo: [
					1,
					{
						bar: 'baz',
						zip: 'buz'
					}
				]
			})).to.equal(true);
			expect(query1.matches({
				foo: [
					1,
					{
						bar: 'baz',
						zip: 'bip'
					}
				]
			})).to.equal(false);
			let query2 = createQuery({
				foo: {
					$elemMatch: {
						$exists: true
					}
				}
			});
			expect(query2.matches({
				foo: [
					undefined,
					undefined,
					2
				]
			})).to.equal(true);
			expect(query2.matches({
				foo: [
					undefined,
					undefined,
					undefined
				]
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				foo: {
					$elemMatch: {
						bar: {
							$elemMatch: {
								biz: 'bam'
							}
						}
					}
				}
			});
			invalid({
				foo: {
					$elemMatch: {
						bar: {
							$elemMatch: 'zip'
						}
					}
				}
			});
		});
	});

	describe('$in', function() {
		it('$in', function() {
			let query1 = createQuery({
				foo: {
					$in: [ 1, 2, 3 ]
				}
			});
			expect(query1.matches({
				foo: 2
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 3, 4, 5 ]
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 4, 5, 6 ]
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(false);
		});
		it('validates properly', function() {
			valid({
				foo: { $in: [ 1, 2, 3 ] },
				bar: { $nin: [ 1, 2, 3 ] }
			});
			invalid({
				foo: { $in: 'zip' }
			});
			invalid({
				foo: { $nin: 'zip' }
			});
		});
	});

	describe('$nin', function() {
		it('$nin', function() {
			let query1 = createQuery({
				foo: {
					$nin: [ 1, 2, 3 ]
				}
			});
			expect(query1.matches({
				foo: 2
			})).to.equal(false);
			expect(query1.matches({
				foo: [ 3, 4, 5 ]
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 4, 5, 6 ]
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(true);
		});
		it('validates properly', function() {
			valid({
				foo: { $in: [ 1, 2, 3 ] },
				bar: { $nin: [ 1, 2, 3 ] }
			});
			invalid({
				foo: { $in: 'zip' }
			});
			invalid({
				foo: { $nin: 'zip' }
			});
		});
	});

	describe('$text', function() {
		it('$text', function() {
			let query1 = createQuery({
				foo: {
					$text: 'zip zup'
				}
			});
			expect(query1.matches({
				foo: 'zip van zup'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'zip bar'
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$wildcard', function() {
		it('$wildcard', function() {
			let query1 = createQuery({
				foo: {
					$wildcard: 'zip*zup?'
				}
			});
			expect(query1.matches({
				foo: 'zipasdzupa'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'zipzup'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'zipzupas'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'zizup'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'azipzup'
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$regex', function() {
		it('$regex', function() {
			let query1 = createQuery({
				foo: {
					$regex: '^zip.*zup.?$',
					$options: 'i'
				}
			});
			expect(query1.matches({
				foo: 'zipasdzupa'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'zipzup'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'zipzupas'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'zizup'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'azipzup'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'ZIPZUP'
			})).to.equal(true);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$gt, $gte, $lt, $lte', function() {
		it('$gt, $gte, $lt, $lte', function() {
			let query1 = createQuery({
				foo: { $gt: 10, $lt: 20 },
				bar: { $gte: 11, $lte: 19 }
			});
			expect(query1.matches({
				foo: 15,
				bar: 15
			})).to.equal(true);
			expect(query1.matches({
				foo: 11,
				bar: 11
			})).to.equal(true);
			expect(query1.matches({
				foo: 19,
				bar: 19
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 100, 19, 0 ],
				bar: 19
			})).to.equal(true);
			expect(query1.matches({
				foo: 11,
				bar: 20
			})).to.equal(false);
			expect(query1.matches({
				foo: 10,
				bar: 11
			})).to.equal(false);
			let query2 = createQuery({
				foo: {
					$gte: new Date('2012-01-01T00:00:00Z'),
					$lte: new Date('2013-01-01T00:00:00Z')
				}
			});
			expect(query2.matches({
				foo: new Date('2012-01-20T00:00:00Z')
			})).to.equal(true);
			expect(query2.matches({
				foo: new Date('2011-01-20T00:00:00Z')
			})).to.equal(false);
			let query3 = createQuery({
				foo: {
					$gt: 'cat',
					$lt: 'dog'
				}
			});
			expect(query3.matches({
				foo: 'cuttlefish'
			})).to.equal(true);
			expect(query3.matches({
				foo: 'elephant'
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$ne', function() {
		it('$ne', function() {
			let query1 = createQuery({
				foo: { $ne: 'bar' }
			});
			expect(query1.matches({
				foo: 'baz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});
});
