var expect = require('chai').expect;
var createQuery = require('../lib/index').createQuery;

describe('Query validate()', function() {

	function valid(query) {
		createQuery(query).validate();
	}

	function invalid(query) {
		let invalidFlag = false;
		query = createQuery(query);
		try {
			query.validate();
		} catch (ex) {
			invalidFlag = true;
		}
		if (!invalidFlag) {
			throw new Error('Expected query to be invalid');
		}
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

});
