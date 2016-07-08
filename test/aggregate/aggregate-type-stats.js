const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const StatsAggregateType = require('../../lib/aggregate/aggregate-types/stats');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');
const ObjectMatchError = require('../../lib/object-match-error');

describe('StatsAggregateType', function() {
	let stats = new StatsAggregateType();
	let schema = createSchema({
		foo: Number,
		bar: String
	});

	describe('#getName', function() {

		it('should have the name "stats"', function() {
			expect(stats.getName()).to.equal('stats');
		});

	});

	describe('#isType', function() {

		it('should return true for valid stats aggregates', function() {
			expect(stats.isType({ stats: { foo: {} } })).to.be.true;
			expect(stats.isType({ stats: { foo: { count: true } } })).to.be.true;
		});

		it('should return true for shorthand stats aggregates', function() {
			expect(stats.isType({ stats: 'foo' })).to.be.true;
		});

		it('should return false for invalid stats aggregates', function() {
			expect(stats.isType({})).to.be.false;
			expect(stats.isType({ stats: {} })).to.be.false;
			expect(stats.isType({ stats: '' })).to.be.false;
		});

	});

	describe('#normalize', function() {

		it('should normalize stats aggregates', function() {
			let aggr = { stats: { foo: { count: 1, avg: 'hi' } } };
			stats.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ stats: { foo: { count: true, avg: true } } });
		});

		it('should normalize stats aggregates', function() {
			let aggr = { stats: { foo: { sum: 1, avg: 'hi' } } };
			stats.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ stats: { foo: { sum: true, avg: true } } });
		});

		it('should normalize shorthand stats aggergates', function() {
			let aggr = { stats: 'foo' };
			stats.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ stats: { foo: { count: true } } });
		});

		it('should fail to normalize if stats field mask entry is not valid', function() {
			expect(() => stats.normalize({ stats: { foo: { bar: true } } }))
				.to.throw(AggregateValidationError, /stats type field \(bar\) is not valid/);
		});

		it('should fail to normalize if stats field mask contains non-truthy value', function() {
			expect(() => stats.normalize({ stats: { foo: { avg: 0 } } }))
				.to.throw(AggregateValidationError, /stats type mask contains a non-truthy value/);
		});

		it('should fail to normalize if stats property is not a string or object', function() {
			expect(() => stats.normalize({ stats: 1 }))
				.to.throw(AggregateValidationError, /stats aggregate must be a field mask or string/);
		});

		it('should fail to normalize if properties in stats object aren\'t field masks', function() {
			expect(() => stats.normalize({ stats: { foo: 1 } }))
				.to.throw(AggregateValidationError, /stats aggregate properties must be stats type masks/);
		});

		it('should fail to normalize if field doesn\' exist in the schema', function() {
			expect(() => stats.normalize({ stats: 'baz' }, { schema }))
				.to.throw(ObjectMatchError, /Field does not correspond to a field in the schema/);
		});

	});

	describe('#validate', function() {

		it('should validate stats "count" aggregates', function() {
			expect(stats.validate({ stats: { foo: { count: true } } })).to.be.true;
		});

		it('should validate stats "sum" aggregates', function() {
			expect(stats.validate({ stats: { foo: { sum: true } } })).to.be.true;
		});

		it('should validate stats "stddev" aggregates', function() {
			expect(stats.validate({ stats: { foo: { stddev: true } } })).to.be.true;
		});

		it('should fail to validate non-true values in field mask', function() {
			expect(() => stats.validate({ stats: { foo: { count: 'truthy' } } }))
				.to.throw(AggregateValidationError, /stats type mask contains a non-true value/);
		});

		it('should fail to validate if stats fields don\'t map to a field mask', function() {
			expect(() => stats.validate({ stats: { foo: 'faker' } }))
				.to.throw(AggregateValidationError, /stats aggregate properties must be stats type masks/);
		});

		it('should fail to validate if stats object isn\'t an object', function() {
			expect(() => stats.validate({ stats: 'faker' }))
				.to.throw(AggregateValidationError, /stats aggregate must be a mapping from fields to field mask/);
		});

		it('should fail to validate if stats field mask is empty', function() {
			expect(() => stats.validate({ stats: { foo: {} } }))
				.to.throw(AggregateValidationError, /stats type mask \(foo\) is empty/);
		});

		it('should fail to validate if stats field mask entry is not valid', function() {
			expect(() => stats.validate({ stats: { foo: { faker: true } } }))
				.to.throw(AggregateValidationError, /stats type field \(faker\) is not valid/);
		});

	});


	describe('#getQueriedFields', function() {

		it('should get queried fields for valid aggregates', function() {
			expect(stats.getQueriedFields({ stats: { foo: { count: true } } }, { schema }))
				.to.deep.equals([ 'foo' ]);
		});

		it('should fail to get queried fields for invalid aggregates', function() {
			expect(() => stats.getQueriedFields({ stats: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /stats aggregate must be a mapping from fields to field mask/);
		});

	});

});
