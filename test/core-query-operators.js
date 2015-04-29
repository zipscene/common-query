let expect = require('chai').expect;
let createQuery = require('../lib/index').createQuery;
let QueryValidationError = require('../lib/query-validation-error');

describe('Query Operators', function() {
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
});
