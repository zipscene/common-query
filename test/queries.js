var expect = require('chai').expect;
var createQuery = require('../lib/index').createQuery;

describe('Query', function() {

	describe('matches()', function() {

		it('basic exact match', function(done) {
			let query1 = createQuery({
				foo: 'bar',
				biz: 'baz'
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'bam',
				qux: 'buz'
			})).to.equal(false);
			done();
		});

		it('full object exact match', function(done) {
			let query1 = createQuery({
				foo: {
					bar: 'biz',
					baz: 'buz'
				}
			});
			expect(query1.matches({
				foo: {
					bar: 'biz',
					baz: 'buz'
				},
				zip: 'fuz'
			})).to.equal(true);
			expect(query1.matches({
				foo: {
					bar: 'biz',
					baz: 'buz',
					qux: 'bam'
				},
				zip: 'fuz'
			})).to.equal(false);
			done();
		});

		it('exact match to array', function(done) {
			let query1 = createQuery({
				foo: 'bar'
			});
			expect(query1.matches({
				foo: [ 1, 2, 'bar', 3 ]
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 1, 2, 3 ]
			})).to.equal(false);
			done();
		});

		it('ignore match to undefined', function(done) {
			let query1 = createQuery({
				foo: undefined,
				bar: 'zip'
			});
			expect(query1.matches({
				bar: 'zip',
				foo: 'bam'
			})).to.equal(true);
			expect(query1.matches({
				bar: 'zip'
			})).to.equal(true);
			done();
		});

		it('null matches null or nonexistent', function(done) {
			let query1 = createQuery({
				foo: 123,
				bar: null
			});
			expect(query1.matches({
				foo: 123,
				bar: null
			})).to.equal(true);
			expect(query1.matches({
				foo: 123,
				bar: undefined
			})).to.equal(true);
			expect(query1.matches({
				foo: 123
			})).to.equal(true);
			expect(query1.matches({
				foo: 123,
				bar: 123
			})).to.equal(false);
			done();
		});

		it('case sensitive', function(done) {
			let query1 = createQuery({
				foo: 'bar'
			});
			expect(query1.matches({
				foo: 'Bar'
			})).to.equal(false);
			done();
		});

		it('$and', function(done) {
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
			done();
		});

		it('$or', function(done) {
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
			done();
		});

		it('$nor', function(done) {
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
			done();
		});

		it('combined $and, $or, $nor', function(done) {
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
			done();
		});

		it('$exists', function(done) {
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
			done();
		});

		it('$not', function(done) {
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
			done();
		});

		it('$elemMatch', function(done) {
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
			done();
		});

		it('$in', function(done) {
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
			done();
		});

		it('$nin', function(done) {
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
			done();
		});

		it('$text', function(done) {
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
			done();
		});

		it('$wildcard', function(done) {
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
			done();
		});

		it('$regex', function(done) {
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
			done();
		});

		it('$gt, $gte, $lt, $lte', function(done) {
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
			done();
		});

		it('$ne', function(done) {
			let query1 = createQuery({
				foo: { $ne: 'bar' }
			});
			expect(query1.matches({
				foo: 'baz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(false);
			done();
		});

		it('$near', function(done) {
			let query1 = createQuery({
				loc: {
					$near: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ] // 602 Main St 45202
						},
						$maxDistance: 10000
					}
				}
			});
			expect(query1.matches({
				loc: [ -84.5087746, 39.0972566 ]
			})).to.equal(true);
			expect(query1.getMatchProperty('distance')).to.be.above(500);
			expect(query1.getMatchProperty('distance')).to.be.below(800);
			expect(query1.matches({
				loc: [ -84.168767, 39.1413997 ]
			})).to.equal(false);
			expect(query1.getMatchProperty('distance')).to.exist;
			expect(query1.getMatchProperty('distance')).to.be.above(10000);
			expect(query1.matches({
				loc: [ [ -84.5087746, 39.0972566 ], [ -84.168767, 39.1413997 ] ]
			})).to.equal(true);
			expect(query1.getMatchProperty('distance')).to.be.above(500);
			expect(query1.getMatchProperty('distance')).to.be.below(800);
			expect(query1.matches({
				loc: {
					type: 'Point',
					coordinates: [ -84.5087746, 39.0972566 ]
				}
			})).to.equal(true);
			expect(query1.matches({
				loc: [
					{
						type: 'Point',
						coordinates: [ -84.5087746, 39.0972566 ]
					},
					{
						type: 'Point',
						coordinates: [ -84.168767, 39.1413997 ]
					}
				]
			})).to.equal(true);
			done();
		});

		it('$geoIntersects', function(done) {
			let query1 = createQuery({
				poly: {
					$geoIntersects: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ] // 602 Main St 45202
						}
					}
				}
			});
			expect(query1.matches({
				poly: {
					type: 'Polygon',
					coordinates: [ [
						[ -84.51316, 39.1052099 ],
						[ -84.5058322, 39.1053431 ],
						[ -84.5101237, 39.1004809 ],
						[ -84.51316, 39.1052099 ]
					] ]
				}
			})).to.equal(true);
			done();
		});

	});

});


