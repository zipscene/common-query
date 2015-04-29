let expect = require('chai').expect;
let createQuery = require('../lib/index').createQuery;
let createSchema = require('zs-common-schema').createSchema;
let Query = require('../lib/index').Query;
let ObjectMatchError = require('../lib/index').ObjectMatchError;
let QueryValidationError = require('../lib/query-validation-error');

describe('Query', function() {

	describe('constructor', function() {
		it('test 1', function() {
			let queryData = {
				'really': 'invalid',
				'$super': 'invalid'
			};
			expect(() => createQuery(queryData)).to.throw(QueryValidationError);
			expect(() => createQuery(queryData, {
				skipValidate: true
			})).to.not.throw(Error);
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

		it('trivial exact matches', function() {
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
		});
		it('nested exact matches', function() {
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
		});
		it('no exact matches', function() {
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
		});
		it('single-clause or exact match', function() {
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
		});
		it('conflicting match', function() {
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
		});
		it('can never match', function() {
			expect(createQuery({
				foo: 'bar',
				$or: []
			}).getExactMatches()).to.deep.equal({
				exactMatches: {},
				onlyExactMatches: false,
				exactFieldMatches: {},
				onlyExactFieldMatches: false
			});
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
		it('test1', function() {
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
		});
	});

	describe('#getQueriedFields()', function() {
		it('test1', function() {
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
		it('basic exact match', function() {
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
		});
		it('full object exact match', function() {
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
		});
		it('exact match to array', function() {
			let query1 = createQuery({
				foo: 'bar'
			});
			expect(query1.matches({
				foo: [ 1, 2, 'bar', 3 ]
			})).to.equal(true);
			expect(query1.matches({
				foo: [ 1, 2, 3 ]
			})).to.equal(false);
		});
		it('exact match nested arrays', function() {
			let query = createQuery({
				foo: 'bar'
			});
			expect(query.matches({
				foo: [ [ 1, 2, 'bar', 3 ] ]
			})).to.equal(true);
		});
		it('exact match within array', function() {
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
		});
		it('exact match within array to specified index', function() {
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
		});
		it('exact match within array with numeric key', function() {
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
		});
		it('exact match to full array', function() {
			let query = createQuery({
				foo: [ 1, 2, 3 ]
			});
			expect(query.matches({
				foo: [ 1, 2, 3 ]
			})).to.equal(true);
			expect(query.matches({
				foo: [ 1, 2, 3, 4 ]
			})).to.equal(false);
		});
		it('ignore match to undefined', function() {
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
		});
		it('null matches null or nonexistent', function() {
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
		});
		it('case sensitive', function() {
			let query1 = createQuery({
				foo: 'bar'
			});
			expect(query1.matches({
				foo: 'Bar'
			})).to.equal(false);
		});
		it('match primitive with expression opreators', function() {
			let query1 = createQuery({
				$gt: 5,
				$lt: 10
			});
			expect(query1.matches(7)).to.equal(true);
			expect(query1.matches(2)).to.equal(false);
		});
	});

	describe('#replaceArrayPlaceholderComponent', function() {
		it('test1', function() {
			expect(Query.replaceArrayPlaceholderComponent('$.foo.$.bar.$', '0'))
				.to.equal('0.foo.0.bar.0');
		});
	});

	describe('#substituteVars()', function() {
		it('test1', function() {
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
		});
	});

	describe('#transformQueriedFields()', function() {
		it('test1', function() {
			let query = createQuery({
				foo: 'bar'
			});
			query.transformQueriedFields(function(field) {
				return 'prefix' + field;
			});
			expect(query.getData()).to.deep.equal({
				prefixfoo: 'bar'
			});
		});
		it('test2', function() {
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
		});
	});

	describe('#validate()', function() {
		it('basic valid query and return value', function() {
			let query1 = createQuery({
				foo: 'bar',
				biz: 'baz'
			});
			let validateResult = query1.validate();
			expect(validateResult).to.equal(true);
		});
	});
});
