let expect = require('chai').expect;
let { QueryValidationError, defaultQueryFactory: queryFactory } = require('../../lib/index');

describe('QueryFactory', function() {
	describe('#createQuery()', function() {
		it('handles the skipValidate option', function() {
			let queryData = { really: 'invalid', $super: 'invalid' };
			expect(() => queryFactory.createQuery(queryData)).to.throw(QueryValidationError);
			expect(() => queryFactory.createQuery(queryData, { skipValidate: true })).to.not.throw(Error);
		});
		it('substitues vars', function() {
			let rawQuery = { foo: 'bar', $and: [
				{ zip: { $var: 'var1' } },
				{ $elemMatch: { zap: 'buz', baz: { $var: 'var2' } } },
				{ $in: [ 1, 2, { $var: 'var3' } ] }
			] };
			const vars = { vars: { var1: 'zip1', var2: 'baz2', var3: 3 } };
			expect(queryFactory.createQuery(rawQuery, vars).getData()).to.deep.equal({
				foo: 'bar',
				$and: [
					{ zip: 'zip1' },
					{ $elemMatch: { zap: 'buz', baz: 'baz2' } },
					{ $in: [ 1, 2, 3 ] }
				]
			});
		});
	});

	describe.skip('#registerQueryOperator', function() { });

	describe.skip('#getQueryOperator', function() { });

	describe.skip('#registerExprOperator', function() { });

	describe.skip('#getExprOperator', function() { });

	describe.skip('#registerQueryOperator', function() { });
});
