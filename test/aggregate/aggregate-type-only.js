const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const OnlyAggregateType = require('../../lib/aggregate/aggregate-types/only');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');
const ObjectMatchError = require('../../lib/object-match-error');

describe('OnlyAggregateType', function() {
	let only = new OnlyAggregateType();
	let schema = createSchema({
		foo: Number,
		bar: String
	});

	describe('#getName', function() {
		it('should have the name "only"', function() {
			expect(only.getName()).to.equal('only');
		});
	});

	describe('#isType', function() {
		it('should return true for valid only field', function() {
			expect(only.isType({ only: [ 'foo' ] })).to.be.true;
			expect(only.isType({ only: [ 'foo', 'bar' ] })).to.be.true;
		});

		it('should return true for shorthand only field', function() {
			expect(only.isType({ only: 'foo' })).to.be.true;
		});

		it('should return false for invalid only field', function() {
			expect(only.isType({})).to.be.false;
			expect(only.isType({ only: [] })).to.be.false;
			expect(only.isType({ only: '' })).to.be.false;
		});
	});

	describe('#normalize', function() {
		it('should normalize only fields', function() {
			let aggr = { only: [ 'foo' ] };
			only.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ only: [ 'foo' ] });
		});

		it('should normalize only fields', function() {
			let aggr = { only: [ 'foo', 'bar' ] };
			only.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ only: [ 'foo', 'bar' ] });
		});

		it('should normalize shorthand only fields', function() {
			let aggr = { only: 'foo' };
			only.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ only: [ 'foo' ] });
		});

		it('should fail to normalize if only field has non-string properties', function() {
			expect(() => only.normalize({ only: [ { foo: 'bar' } ] }))
				.to.throw(AggregateValidationError, 'only field arrays must only contain strings');
		});

		it('should fail to normalize if only property is not a string or array', function() {
			expect(() => only.normalize({ only: 1 }))
				.to.throw(AggregateValidationError, 'only field must be an array or a string');
		});

		it('should fail to normalize if field doesn\'t exist in the schema', function() {
			expect(() => only.normalize({ only: 'baz' }, { schema }))
				.to.throw(ObjectMatchError, 'Field does not correspond to a field in the schema');
		});
	});

	describe('#validate', function() {
		it('should validate only field with one value', function() {
			expect(only.validate({ only: [ 'foo' ] })).to.be.true;
		});

		it('should validate only field with multiple values', function() {
			expect(only.validate({ only: [ 'foo', 'bar' ] })).to.be.true;
		});

		it('should fail to validate non-string values', function() {
			expect(() => only.validate({ only: [ { foo: 1 } ] }))
				.to.throw(AggregateValidationError, 'only field properties must be strings.');
		});

		it('should fail to validate non-string shorthand values', function() {
			expect(() => only.validate({ only: { foo: 1 } }))
				.to.throw(AggregateValidationError, 'only field must be an array.');
		});

		it('should fail to validate if only field is empty', function() {
			expect(() => only.validate({ only: [] }))
				.to.throw(AggregateValidationError, 'only field must not be empty.');
		});
	});

	describe('#getQueriedFields', function() {
		it('should get queried fields for valid aggregates', function() {
			expect(only.getQueriedFields({ only: [ 'foo' ] }, { schema })).to.deep.equals([ 'foo' ]);
		});

		it('should get queried fields for valid aggregates with multiple values', function() {
			expect(only.getQueriedFields({ only: [ 'foo', 'bar' ] }, { schema })).to.deep.equals([ 'foo', 'bar' ]);
		});

		it('should get queried fields for valid aggregates using shorthand', function() {
			expect(only.getQueriedFields({ only: 'foo' }, { schema })).to.deep.equals([ 'foo' ]);
		});

		it('should fail to get queried fields for invalid aggregates', function() {
			expect(() => only.getQueriedFields({ only: [ { foo: 1 } ] }, { schema }))
				.to.throw(AggregateValidationError);
		});
	});
});
