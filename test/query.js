let expect = require('chai').expect;
let createQuery = require('../lib/index').createQuery;
let createSchema = require('zs-common-schema').createSchema;
let Query = require('../lib/index').Query;
let ObjectMatchError = require('../lib/index').ObjectMatchError;
let QueryValidationError = require('../lib/query-validation-error');

describe('Query', function() {

	describe('constructor', function() {
		it('test 1', function(done) {
			let queryData = {
				'really': 'invalid',
				'$super': 'invalid'
			};
			expect(() => createQuery(queryData)).to.throw(QueryValidationError);
			expect(() => createQuery(queryData, {
				skipValidate: true
			})).to.not.throw(Error);
			done();
		});
	});

	describe('#getExactMatches()', function() {
		const schema = createSchema({
			foo: String,
			bar: [ {
				baz: [ {
					qux: Number
				} ]
			} ]
		});

		it('trivial exact matches', function(done) {
			expect(createQuery({
				foo: 'bar',
				biz: 'baz'
			}).getExactMatches()).to.deep.equal({
				exactMatches: {
					foo: 'bar',
					biz: 'baz'
				},
				onlyExactMatches: true,
				exactFieldMatches: {
					foo: 'bar',
					biz: 'baz'
				},
				onlyExactFieldMatches: true
			});
			done();
		});
		it('nested exact matches', function(done) {
			expect(createQuery({
				foo: 'bar',
				biz: 'baz',
				$and: [
					{
						zip: 'zap'
					},
					{
						$and: [
							{
								qux: 'buz'
							}
						]
					}
				]
			}).getExactMatches()).to.deep.equal({
				exactMatches: {
					foo: 'bar',
					biz: 'baz',
					zip: 'zap',
					qux: 'buz'
				},
				onlyExactMatches: true,
				exactFieldMatches: {
					foo: 'bar',
					biz: 'baz',
					zip: 'zap',
					qux: 'buz'
				},
				onlyExactFieldMatches: true
			});
			done();
		});
		it('no exact matches', function(done) {
			expect(createQuery({
				foo: { $ne: 10 },
				$or: [
					{
						bar: 'baz'
					},
					{
						zip: 'zap'
					}
				]
			}).getExactMatches()).to.deep.equal({
				exactMatches: {},
				onlyExactMatches: false,
				exactFieldMatches: {},
				onlyExactFieldMatches: false
			});
			done();
		});
		it('single-clause or exact match', function(done) {
			expect(createQuery({
				foo: { $ne: 10 },
				$or: [
					{
						bar: 'baz'
					}
				]
			}).getExactMatches()).to.deep.equal({
				exactMatches: {
					bar: 'baz'
				},
				onlyExactMatches: false,
				exactFieldMatches: {
					bar: 'baz'
				},
				onlyExactFieldMatches: false
			});
			done();
		});
		it('conflicting match', function(done) {
			expect(createQuery({
				foo: 'bar',
				$and: [
					{
						zip: 'zap'
					},
					{
						zip: 'buz'
					}
				]
			}).getExactMatches()).to.deep.equal({
				exactMatches: {
					foo: 'bar'
				},
				onlyExactMatches: false,
				exactFieldMatches: {
					foo: 'bar'
				},
				onlyExactFieldMatches: false
			});
			done();
		});
		it('can never match', function(done) {
			expect(createQuery({
				foo: 'bar',
				$or: []
			}).getExactMatches()).to.deep.equal({
				exactMatches: {},
				onlyExactMatches: false,
				exactFieldMatches: {},
				onlyExactFieldMatches: false
			});
			done();
		});
		it('test1', function() {
			expect(createQuery({
				'bar.baz.4.qux': 123,
				foo: 'biz'
			}).getExactMatches({ schema }).exactMatches).to.deep.equal({
				'bar.$.baz.4.qux': 123,
				foo: 'biz'
			});
			expect(createQuery({
				'bar.baz.4.qux': 123,
				foo: 'biz'
			}).getExactMatches({ schema }).onlyExactMatches).to.equal(true);
		});
	});

	describe('#getOperators()', function() {
		it('test1', function(done) {
			expect(createQuery({
				foo: 1,
				bar: { $ne: 3 },
				$and: [
					{
						zip: { $in: [ 1, 2, 3 ] }
					},
					{
						zap: {
							$elemMatch: {
								baz: { $gt: 5 }
							}
						}
					}
				]
			}).getOperators().sort()).to.deep.equal([
				'$ne',
				'$and',
				'$in',
				'$elemMatch',
				'$gt'
			].sort());
			done();
		});
	});

	describe('#getQueriedFields()', function() {
		it('test1', function(done) {
			expect(createQuery({
				foo: 1,
				$and: [
					{
						bar: 1,
						zip: 1
					},
					{
						boz: 1
					}
				],
				$or: [
					{
						bip: 1
					},
					{
						zap: {
							$not: {
								$gt: 10
							}
						}
					}
				],
				qux: {
					$elemMatch: {
						buz: 1
					}
				},
				fuz: {
					foo: 1,
					bar: 1
				},
				nan: {
					$elemMatch: {
						nan: {
							$elemMatch: {
								nan: {
									$elemMatch: {
										nan: {
											$elemMatch: {
												batman: '!'
											}
										}
									}
								}
							}
						}
					}
				}
			}).getQueriedFields().sort()).to.deep.equal([
				'foo',
				'bar',
				'zip',
				'boz',
				'bip',
				'zap',
				'fuz',
				'qux.$.buz',
				'nan.$.nan.$.nan.$.nan.$.batman'
			].sort());
			done();
		});

		const schema = createSchema({
			foo: String,
			bar: [ {
				baz: [ {
					qux: Number
				} ]
			} ]
		});

		it('test1', function() {
			expect(createQuery({
				foo: 'abc',
				'bar.baz.qux': 3
			}).getQueriedFields({ schema: schema })).to.deep.equal([
				'foo',
				'bar.$.baz.$.qux'
			]);
		});
		it('test2', function() {
			expect(createQuery({
				foo: 'abc',
				'bar.baz': {
					$elemMatch: {
						qux: 3
					}
				}
			}).getQueriedFields({ schema: schema })).to.deep.equal([
				'foo',
				'bar.$.baz.$.qux'
			]);
		});
	});

	describe('#getQueryPathSubschema', function() {
		const schema = createSchema({
			foo: String,
			bar: [ {
				baz: [ {
					qux: Number
				} ]
			} ]
		});

		it('root path', function() {
			expect(Query.getQueryPathSubschema(schema, ''))
				.to.deep.equal([ schema.getData(), '' ]);
			expect(Query.getQueryPathSubschema(schema, 'foo'))
				.to.deep.equal([ schema.getData().properties.foo, 'foo' ]);
		});
		it('basic path', function() {
			expect(Query.getQueryPathSubschema(schema, 'foo'))
				.to.deep.equal([ schema.getData().properties.foo, 'foo' ]);
		});
		it('basic explicit array index', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.4'))
				.to.deep.equal([ schema.getData().properties.bar.elements, 'bar.4' ]);
		});
		it('basic implicit array index', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.baz'))
				.to.deep.equal([ schema.getData().properties.bar.elements.properties.baz, 'bar.$.baz' ]);
		});
		it('mixed array indices', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.8.baz.qux'))
				.to.deep.equal([
					{ type: 'number' },
					'bar.8.baz.$.qux'
				]);
		});
		it('invalid schema path', function() {
			expect( () => Query.getQueryPathSubschema(schema, 'bar.boop') )
				.to.throw(ObjectMatchError);
		});
	});

	describe('#matches()', function() {
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
		it('exact match nested arrays', function(done) {
			let query = createQuery({
				foo: 'bar'
			});
			expect(query.matches({
				foo: [ [ 1, 2, 'bar', 3 ] ]
			})).to.equal(true);
			done();
		});
		it('exact match within array', function(done) {
			let query = createQuery({
				'a.b.c': 'd'
			});
			expect(query.matches({
				a: [
					{ b: { e: 'f' } },
					{ b: { c: 'd' } }
				]
			})).to.equal(true);
			expect(query.matches({
				a: [
					{ b: { e: 'f' } },
					{ b: { c: 'e' } }
				]
			})).to.equal(false);
			done();
		});
		it('exact match within array to specified index', function(done) {
			let query = createQuery({
				'scott-pilgrim-aliases.1': 'naruto'
			});
			expect(query.matches({
				'scott-pilgrim-aliases': [ 'captain falcon', 'naruto' ]
			})).to.equal(true);
			expect(query.matches({
				'scott-pilgrim-aliases': [ 'naruto', 'captain falcon' ]
			})).to.equal(false);
			expect(query.matches({
				'scott-pilgrim-aliases': [ 'naruto' ]
			})).to.equal(false);
			done();
		});
		it('exact match within array with numeric key', function(done) {
			let query = createQuery({
				'array.1': 'hello'
			});
			expect(query.matches({
				array: [ 'hi', 'hello' ]
			})).to.equal(true);
			expect(query.matches({
				array: [
					{ 1: 'hello' },
					{ 1: 'hi' }
				]
			})).to.equal(true);
			done();
		});
		it('exact match to full array', function(done) {
			let query = createQuery({
				foo: [ 1, 2, 3 ]
			});
			expect(query.matches({
				foo: [ 1, 2, 3 ]
			})).to.equal(true);
			expect(query.matches({
				foo: [ 1, 2, 3, 4 ]
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
		it('match primitive with expression opreators', function(done) {
			let query1 = createQuery({
				$gt: 5,
				$lt: 10
			});
			expect(query1.matches(7)).to.equal(true);
			expect(query1.matches(2)).to.equal(false);
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
			expect(query1.matches({
				poly: {
					type: 'Polygon',
					coordinates: [ [
						[ -85.51316, 39.1052099 ],
						[ -85.5058322, 39.1053431 ],
						[ -85.5101237, 39.1004809 ],
						[ -85.51316, 39.1052099 ]
					] ]
				}
			})).to.equal(false);
			done();
		});
	});

	describe('#replaceArrayPlaceholderComponent', function() {
		it('test1', function() {
			expect(Query.replaceArrayPlaceholderComponent('$.foo.$.bar.$', '0'))
				.to.equal('0.foo.0.bar.0');
		});
	});

	describe('#substituteVars()', function() {
		it('test1', function(done) {
			let query = createQuery({
				foo: 'bar',
				$and: [
					{
						zip: { $var: 'var1' }
					},
					{
						$elemMatch: {
							zap: 'buz',
							baz: { $var: 'var2' }
						}
					},
					{
						$in: [
							1,
							2,
							{ $var: 'var3' }
						]
					}
				]
			}, {
				vars: {
					var1: 'zip1',
					var2: 'baz2',
					var3: 3
				}
			});
			expect(query.getData()).to.deep.equal({
				foo: 'bar',
				$and: [
					{
						zip: 'zip1'
					},
					{
						$elemMatch: {
							zap: 'buz',
							baz: 'baz2'
						}
					},
					{
						$in: [
							1,
							2,
							3
						]
					}
				]
			});
			done();
		});
	});

	describe('#transformQueriedFields()', function() {
		it('test1', function(done) {
			let query = createQuery({
				foo: 'bar'
			});
			query.transformQueriedFields(function(field) {
				return 'prefix' + field;
			});
			expect(query.getData()).to.deep.equal({
				prefixfoo: 'bar'
			});
			done();
		});
		it('test2', function(done) {
			let query = createQuery({
				foo: 1,
				$and: [
					{
						bar: 1,
						baz: 1
					},
					{
						qux: 1
					}
				],
				$nor: [
					{
						zip: {
							$elemMatch: {
								buz: 1
							}
						}
					}
				]
			});
			query.transformQueriedFields(function(field) {
				return 'prefix' + field;
			});
			expect(query.getData()).to.deep.equal({
				prefixfoo: 1,
				$and: [
					{
						prefixbar: 1,
						prefixbaz: 1
					},
					{
						prefixqux: 1
					}
				],
				$nor: [
					{
						prefixzip: {
							$elemMatch: {
								buz: 1
							}
						}
					}
				]
			});
			done();
		});
	});

	describe('#validate()', function() {
		function valid(query) {
			createQuery(query).validate();
		}

		function invalid(queryData) {
			expect(function() { createQuery(queryData); }).to.throw(QueryValidationError);
		}

		it('basic valid query and return value', function(done) {
			let query1 = createQuery({
				foo: 'bar',
				biz: 'baz'
			});
			let validateResult = query1.validate();
			expect(validateResult).to.equal(true);
			done();
		});
		it('$and, $or, $nor', function(done) {
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
			done();
		});
		it('$exists', function(done) {
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
			done();
		});
		it('$not', function(done) {
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
			done();
		});
		it('$elemMatch', function(done) {
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
			done();
		});
		it('$in, $nin', function(done) {
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
			done();
		});
	});
});
