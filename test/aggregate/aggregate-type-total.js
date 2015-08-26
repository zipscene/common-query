const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const TotalAggregateType = require('../../lib/aggregate/aggregate-types/total');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');

describe('AggregateType - Total', function() {

	describe('Total', function() {
		let total = new TotalAggregateType();
		let schema = createSchema({
			foo: String
		});

		it('should have the name "total"', function() {
			expect(total.getName()).to.equal('total');
		});

		it('should match aggregates that have a non-empty total field', function() {
			expect(total.isType({ total: true })).to.be.true;
			expect(total.isType({ total: 1 })).to.be.true;
			expect(total.isType({ total: '' })).to.be.false;
			expect(total.isType({})).to.be.false;
		});


		it('should normalize total aggregates', function() {
			let aggrA = { total: 1 };
			total.normalize(aggrA);
			expect(aggrA).to.deep.equal({ total: true });

			let aggrB = { total: true };
			total.normalize(aggrB);
			expect(aggrB).to.deep.equal({ total: true });

			let aggrC = { total: false };
			total.normalize(aggrC);
			expect(aggrC).to.deep.equal({});

			let aggrD = { total: '' };
			total.normalize(aggrD);
			expect(aggrD).to.deep.equal({});
		});

		it('should validate total aggregates', function() {
			expect(() => total.validate({ total: true }))
				.to.not.throw(AggregateValidationError);
			expect(() => total.validate({ total: false }))
				.to.throw(AggregateValidationError, /total field must be true/);
			expect(() => total.validate({ total: 1 }))
				.to.throw(AggregateValidationError, /total field must be true/);
			expect(() => total.validate({}))
				.to.throw(AggregateValidationError, /total field must be true/);
		});

		it('should get no queried fields', function() {
			expect(total.getQueriedFields({ total: true, groupBy: [ { field: 'foo' } ] }, { schema }))
				.to.deep.equals([]);
		});

	});
});
