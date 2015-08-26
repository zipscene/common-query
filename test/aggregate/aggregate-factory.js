const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const {
	AggregateValidationError,
	defaultAggregateFactory: aggregateFactory
} = require('../../lib/index');

describe('AggregateFactory', function() {

	describe('#createAggregate()', function() {

		it('handles the skipValidate option', function() {
			let aggregateData = { 'really': 'invalid' };
			expect(() => aggregateFactory.createAggregate(aggregateData))
				.to.throw(AggregateValidationError);
			expect(() => aggregateFactory.createAggregate(aggregateData, { skipValidate: true }))
				.to.not.throw(Error);
		});

		it('should normalize aggregate data', function() {
			let schema = createSchema({
				foo: String
			});
			expect(aggregateFactory.createAggregate({ groupBy: 'foo' }, { schema }).getData())
				.to.deep.equal({ groupBy: [ { field: 'foo' } ] });
		});

	});

	describe.skip('#registerAggregateType', function() { });

	describe.skip('#getAggregateType', function() { });

});
