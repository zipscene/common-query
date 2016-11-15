// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { expect } = require('chai');
const { createQuery, QueryValidationError } = require('../../lib/index');

describe('Query Operators', function() {
	function valid(query) {
		createQuery(query).validate();
	}
	function invalid(queryData) {
		expect(function() { createQuery(queryData); }).to.throw(QueryValidationError);
	}
	describe('$and', function() {
		it('matches the conjunction of its arguments', function() {
			const query = createQuery({ $and: [ { foo: 'bar' }, { biz: 'baz' } ] });
			expect(query.matches({ foo: 'bar', biz: 'baz' })).to.be.true;
			expect(query.matches({ foo: 'bar', biz: 'buz' })).to.be.false;
		});
		it('takes an array of queries', function() {
			valid({ $and: [ { foo: 'bar' }, { biz: 'baz', qux: 'bum' } ] });
			invalid({ $and: { foo: 'bar' } });
		});
	});

	describe('$or', function() {
		it('matches the disjunction of its arguments', function() {
			const query = createQuery({ $or: [ { foo: 'bar' }, { biz: 'baz' } ] });
			expect(query.matches({ foo: 'bar', biz: 'buz' })).to.be.true;
			expect(query.matches({ foo: 'bam', biz: 'buz' })).to.be.false;
		});
		it('takes an array of queries', function() {
			valid({ $or: [ { foo: 'bar' }, { biz: 'baz', qux: 'bum' } ] });
			invalid({ $or: { biz: 'baz' } });
		});
	});

	describe('$nor', function() {
		it('matches the negation of the disjunction of its arguments', function() {
			const query = createQuery({ $nor: [ { foo: 'bar' }, { biz: 'baz' } ] });
			expect(query.matches({ foo: 'bar', biz: 'buz' })).to.be.false;
			expect(query.matches({ foo: 'bam', biz: 'buz' })).to.be.true;
		});
		it('takes an array of queries', function() {
			valid({ $nor: [ { foo: 'bar' }, { biz: 'baz', qux: 'bum' } ] });
			invalid({ $nor: { biz: 'baz' } });
		});
	});

	describe('combined $and, $or, $nor', function() {
		it('matches if every query operator at a level matches', function() {
			const query = createQuery({
				$and: [ { foo: 'bar' }, { biz: 'baz' } ],
				$or: [ { qux: 'buz' }, { bam: 'fuz' } ],
				$nor: [ { zip: 'foo' } ]
			});
			expect(query.matches({ foo: 'bar', biz: 'baz', qux: 'buz' })).to.be.true;
			expect(query.matches({ foo: 'bar', qux: 'buz' })).to.be.false;
			expect(query.matches({ foo: 'bar', biz: 'baz', qux: 'buz', zip: 'foo' })).to.be.false;
			expect(query.matches({ foo: 'bar', biz: 'baz' })).to.be.false;
		});
		it('accepts the result of a valid query operator as an argument', function() {
			valid({ $and: [ { $or: [ { foo: 'bar' } ] } ] });
			invalid({ $and: [ { $or: [ { $and: 'bar' } ] } ] });
		});
	});
});
