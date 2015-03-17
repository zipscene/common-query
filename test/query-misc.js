var expect = require('chai').expect;
var createQuery = require('../lib/index').createQuery;

describe('Query getQueriedFields()', function() {

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

});

describe('Query transformQueriedFields()', function() {

	it('test1', function(done) {
		var query = createQuery({
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
		var query = createQuery({
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

describe('Query getExactMatches()', function() {

	it('trivial exact matches', function(done) {
		expect(createQuery({
			foo: 'bar',
			biz: 'baz'
		}).getExactMatches()).to.deep.equal({
			exactMatches: {
				foo: 'bar',
				biz: 'baz'
			},
			onlyExactMatches: true
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
			onlyExactMatches: true
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
			onlyExactMatches: false
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
			onlyExactMatches: false
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
			onlyExactMatches: false
		});
		done();
	});

	it('can never match', function(done) {
		expect(createQuery({
			foo: 'bar',
			$or: []
		}).getExactMatches()).to.deep.equal({
			exactMatches: {},
			onlyExactMatches: false
		});
		done();
	});

});

