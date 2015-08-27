const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');
const { createAggregate, AggregateValidationError } = require('../../lib/index');

describe('Aggregate', function() {

	describe('Aggregate#normalize', function() {

		it('should normalize shorthand aggregates to full aggregates #1', function() {
			let shorthandAggregate = {
				groupBy: 'animalType',
				stats: 'shelterName'
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal({
				groupBy: [ { field: 'animalType' } ],
				stats: {
					shelterName: { count: true }
				}
			});
		});

		it('should normalize shorthand aggregates to full aggregates #2', function() {
			let shorthandAggregate = {
				stats: 'animalType'
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal({
				stats: {
					animalType: { count: true }
				}
			});
		});

		it('should normalize shorthand aggregates to full aggregates #3', function() {
			let shorthandAggregate = {
				stats: 'animalType',
				total: true
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal({
				stats: {
					animalType: { count: true }
				},
				total: true
			});
		});

		it('should fail to normalize invalid aggregates #1', function() {
			let invalidAggregate = {
				stats: 'animalType',
				invalidFieldName: 'asdf'
			};
			expect(() => createAggregate(invalidAggregate))
				.to.throw(AggregateValidationError, /aggregate contains unrecognized field \(invalidFieldName\)/);
		});

		it('should fail to normalize invalid aggregates #2', function() {
			let invalidAggregate = {
				groupBy: [ { field: 'birthdate' } ],
				total: true
			};
			let schema = createSchema({
				birthdate: Date
			});
			expect(() => createAggregate(invalidAggregate, { schema: schema }))
				.to.throw(AggregateValidationError, /field type \(date\) does not match valid field types/);
		});

	});

	describe('Aggregate#validate', function() {

		it('should fail to validate an unnormalized aggregate', function() {
			let shorthandAggregate = {
				groupBy: 'animalType',
				stats: 'shelterName'
			};
			let aggregate = createAggregate(shorthandAggregate, { skipValidate: true });
			expect( () => aggregate.validate(shorthandAggregate) ).to.throw(AggregateValidationError);
		});

	});

	describe('Aggregate#getQueriedFields', function() {

		it('should get queried fields for normalized aggregates', function() {
			let aggregate = createAggregate({ groupBy: 'animalType', stats: 'shelterName' });
			let schema = createSchema({ animalType: String, shelterName: String });
			expect(aggregate.getQueriedFields({ schema })).to.deep.equal([ 'animalType', 'shelterName' ]);
		});

		it('should fail to get queried fields for invalid aggregates', function() {
			let aggregate = createAggregate({ groupBy: 'animalType', stats: 'shelterName' }, { skipValidate: true });
			let schema = createSchema({ animalType: String, shelterName: String });
			expect(() => aggregate.getQueriedFields({ schema })).to.throw(AggregateValidationError);
		});

	});

});