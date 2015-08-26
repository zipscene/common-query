const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const StatsAggregateType = require('../../lib/aggregate/aggregate-types/stats');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');

describe('AggregateType - Stats', function() {

	describe('Stats', function() {
		let stats = new StatsAggregateType();
		let schema = createSchema({
			foo: Number,
			bar: String
		});

		it('should have the name "stats"', function() {
			expect(stats.getName()).to.equal('stats');
		});

		it('should match aggregates that have a non-empty stats field', function() {
			expect(stats.isType({ stats: 'foo' })).to.be.true;
			expect(stats.isType({ stats: { foo: {} } })).to.be.true;
			expect(stats.isType({ stats: { foo: { count: true } } })).to.be.true;
			expect(stats.isType({})).to.be.false;
			expect(stats.isType({ stats: {} })).to.be.false;
			expect(stats.isType({ stats: '' })).to.be.false;
		});

		it('should normalize stats aggregates', function() {
			let aggrA = { stats: 'foo' };
			stats.normalize(aggrA, { schema });
			expect(aggrA).to.deep.equal({ stats: { foo: { count: true } } });

			let aggrB = { stats: { foo: { count: 1, avg: 'hi' } } };
			stats.normalize(aggrB, { schema });
			expect(aggrB).to.deep.equal({ stats: { foo: { count: true, avg: true } } });
		});

		it('should fail to normalize invalid stats aggregates', function() {
			expect(() => stats.normalize({ stats: { foo: { bar: true } } }))
				.to.throw(AggregateValidationError, /stats type field \(bar\) is not valid/);
			expect(() => stats.normalize({ stats: { foo: { avg: 0 } } }))
				.to.throw(AggregateValidationError, /stats type mask contains a non-truthy value/);
			expect(() => stats.normalize({ stats: 1 }))
				.to.throw(AggregateValidationError, /stats aggregate must be a field mask or string/);
			expect(() => stats.normalize({ stats: { foo: 1 } }))
				.to.throw(AggregateValidationError, /stats aggregate properties must be stats type masks/);
			expect(() => stats.normalize({ stats: 'baz' }, { schema }))
				.to.throw(AggregateValidationError, /stats aggregate field \(baz\) does not exist in the schema/);
			expect(() => stats.normalize({ stats: { baz: { count: true } } }, { schema }))
				.to.throw(AggregateValidationError, /stats aggregate field \(baz\) does not exist in the schema/);
		});

		it('should validate stats aggregates', function() {
			expect(() => stats.validate({ stats: { foo: { count: true } } }))
				.to.not.throw(AggregateValidationError);
			expect(() => stats.validate({ stats: { foo: { count: false } } }))
				.to.throw(AggregateValidationError, /stats type mask contains a non-true value/);
			expect(() => stats.validate({ stats: { foo: { count: 'faker' } } }))
				.to.throw(AggregateValidationError, /stats type mask contains a non-true value/);
			expect(() => stats.validate({ stats: { foo: 'faker' } }))
				.to.throw(AggregateValidationError, /stats aggregate properties must be stats type masks/);
			expect(() => stats.validate({ stats: 'faker' }))
				.to.throw(AggregateValidationError, /stats aggregate must be a mapping from fields to field mask/);
			expect(() => stats.validate({ stats: { foo: {} } }))
				.to.throw(AggregateValidationError, /stats type mask \(foo\) is empty/);
			expect(() => stats.validate({ stats: { foo: { faker: true } } }))
				.to.throw(AggregateValidationError, /stats type field \(faker\) is not valid/);
		});

		it('should get queried fields', function() {
			expect(stats.getQueriedFields({ stats: { foo: { count: true } } }, { schema }))
				.to.deep.equals([ 'foo' ]);
			expect(() => stats.getQueriedFields({ stats: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /stats aggregate must be a mapping from fields to field mask/);
		});

	});

});
