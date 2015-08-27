const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const { IntervalGroupByType } = require('../../../lib/aggregate/aggregate-types/group-by/group-by-types');
const AggregateValidationError = require('../../../lib/aggregate/aggregate-validation-error');

describe('IntervalGroupByType', function() {
	let type = new IntervalGroupByType();
	let schema = createSchema({
		foo: Number,
		bar: Date
	});

	describe('#getName', function() {

		it('should have the name "interval"', function() {
			expect(type.getName()).to.equal('interval');
		});

	});

	describe('#isType', function() {

		it('should return true for numeric intervals', function() {
			expect(type.isType({ interval: 8 })).to.be.true;
		});

		it('should return true for duration intervals', function() {
			expect(type.isType({ interval: 'P8H' })).to.be.true;
		});

		it('should return false for non-number and non-string intervals', function() {
			expect(type.isType({ interval: new Date() })).to.be.false;
		});

	});

	describe('#normalize', function() {

		it('should normalize valid numeric intervals', function() {
			let aggr = { field: 'foo', interval: 8 };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'foo', interval: 8 });
		});

		it('should normalize string numeric intervals', function() {
			let aggr = { field: 'foo', interval: '8' };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'foo', interval: 8 });
		});

		it('should normalize valid numeric intervals with base', function() {
			let aggr = { field: 'foo', interval: 8, base: 5 };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'foo', interval: 8, base: 5 });
		});

		it('should normalize valid numeric intervals with string base', function() {
			let aggr = { field: 'foo', interval: 8, base: '5' };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'foo', interval: 8, base: 5 });
		});

		it('should normalize duration intervals', function() {
			let durationA = { field: 'bar', interval: 'PT8H' };
			type.normalize(durationA, { schema });
			expect(durationA).to.deep.equal({ field: 'bar', interval: 'PT8H' });
		});

		it('should normalize duration intervals with base', function() {
			let durationB = { field: 'bar', interval: 'PT8H', base: new Date('2015-01-01T05:00:00.000Z') };
			type.normalize(durationB, { schema });
			expect(durationB)
				.to.deep.equal({ field: 'bar', interval: 'PT8H', base: new Date('2015-01-01T05:00:00.000Z') });
		});

		it('should normalize duration intervals with string base', function() {
			let durationC = { field: 'bar', interval: 'PT8H', base: '2015-01-01T05:00:00.000Z' };
			type.normalize(durationC, { schema });
			expect(durationC)
				.to.deep.equal({ field: 'bar', interval: 'PT8H', base: new Date('2015-01-01T05:00:00.000Z') });

		});

		it('should fail normalization for invalid interval types', function() {
			expect(() => type.normalize({ field: 'foo', interval: {} }, { schema }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);
		});

		it('should fail normalization for mixed interval types #1', function() {
			expect(() => type.normalize({ field: 'foo', interval: 8, base: new Date() }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(date\) must match/);
		});

		it('should fail normalization for mixed interval types #2', function() {
			expect(() => type.normalize({ field: 'bar', interval: 'PT8H', base: 5 }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(date\) and base type \(number\) must match/);
		});

		it('should fail normalization for non-parseable base strings', function() {
			expect(() => type.normalize({ field: 'foo', interval: 8, base: 'fail' }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(string\) must match/);
		});

		it('should fail normalization for invalid base types', function() {
			expect(() => type.normalize({ field: 'foo', interval: 8, base: {} }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(object\) must match/);
		});

		it('should fail normalization for mixed field and interval types', function() {
			expect(() => type.normalize({ field: 'bar', interval: 8, base: 5 }, { schema }))
				.to.throw(AggregateValidationError, /interval and field types must match/);
		});

		it('should fail validation for invalid duration bases', function() {
			expect(() => type.normalize({ field: 'bar', interval: 'PT8H', base: new Date('fail') }, { schema }))
				.to.throw(AggregateValidationError, /interval duration base must be a valid date/);
		});

	});

	describe('#validate', function() {

		it('should validate numeric intervals', function() {
			let aggr = { field: 'foo', interval: 8 };
			expect(type.validate(aggr)).to.be.true;
		});

		it('should validate numeric intervals with base', function() {
			let aggr = { field: 'foo', interval: 8, base: 5 };
			expect(type.validate(aggr)).to.be.true;
		});

		it('should validate duration intervals', function() {
			let durationA = { field: 'bar', interval: 'PT8H' };
			expect(type.validate(durationA)).to.be.true;
		});

		it('should validate duration intervals with base', function() {
			let durationB = { field: 'bar', interval: 'PT8H', base: new Date(2015, 0, 1, 0, 0, 0) };
			expect(type.validate(durationB)).to.be.true;
		});

		it('should fail validation for mixed interval/base types #1', function() {
			expect(() => type.validate({ field: 'foo', interval: 8, base: new Date() }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(date\) must match/);
		});

		it('should fail validation for mixed interval/base types #2', function() {
			expect(() => type.validate({ field: 'bar', interval: 'PT8H', base: 5 }))
				.to.throw(AggregateValidationError, /interval type \(date\) and base type \(number\) must match/);
		});

		it('should fail validation for invalid non-parseable base strings', function() {
			expect(() => type.validate({ field: 'bar', interval: 'faker' }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);
		});

		it('should fail validation for invalid base types', function() {
			expect(() => type.validate({ field: 'foo', interval: 8, base: {} }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(object\) must match/);
		});

		it('should fail validation for invalid interval type', function() {
			expect(() => type.validate({ field: 'foo', interval: {} }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);
		});

		it('should fail validation for invalid duration bases', function() {
			expect(() => type.validate({ field: 'foo', interval: 8, base: new Date('fail') }))
				.to.throw(AggregateValidationError, /interval duration base must be a valid date/);
		});

	});

});

