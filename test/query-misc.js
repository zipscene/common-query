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
