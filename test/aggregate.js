const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');
const { createAggregate, AggregateValidationError } = require('../lib/index');

// These are a few insufficient tests as examples.

describe('Aggregate', function() {

	describe('Aggregate#normalize', function() {

		it('should normalize shorthand aggregates to full aggregates #1', function() {
			let shorthandAggregate = {
				type: 'group',
				groupBy: 'animalType',
				stats: 'shelterName'
			};
			let fullAggregate = {
				type: 'group',
				groupBy: [
					{
						field: 'animalType'
					}
				],
				stats: {
					shelterName: {
						count: true
					}
				}
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal(fullAggregate);
		});

		it('should normalize shorthand aggregates to full aggregates #2', function() {
			let shorthandAggregate = {
				type: 'stats',
				stats: 'animalType'
			};
			let fullAggregate = {
				type: 'stats',
				stats: {
					animalType: {
						count: true
					}
				}
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal(fullAggregate);
		});

		it('should normalize shorthand aggregates to full aggregates #3', function() {
			let shorthandAggregate = {
				type: 'stats',
				stats: 'animalType',
				total: true
			};
			let fullAggregate = {
				type: 'stats',
				stats: {
					animalType: {
						count: true
					}
				},
				total: true
			};
			let aggregate = createAggregate(shorthandAggregate);
			expect(aggregate.getData()).to.deep.equal(fullAggregate);
		});

		it('should fail to normalize invalid aggregates #1', function() {
			let invalidAggregate = {
				type: 'stats',
				stats: 'animalType',
				invalidFieldName: 'asdf'
			};
			expect( () => createAggregate(invalidAggregate) ).to.throw(
				AggregateValidationError,
				/Aggregate contains unrecognized property/
			);
		});

		it('should fail to normalize invalid aggregates #2', function() {
			let invalidAggregate = {
				type: 'group',
				groupBy: [
					{
						field: birthdate
					}
				],
				total: true
			};
			let schema = createSchema({
				birthdate: Date
			});
			expect( () => createAggregate(invalidAggregate, { schema: schema }) ).to.throw(
				AggregateValidationError,
				/Cannot group by discrete values of a date field/
			);
		});

	});

	describe('Aggregate#validate', function() {

		it('should fail to validate an unnormalized aggregate', function() {
			let shorthandAggregate = {
				type: 'group',
				groupBy: 'animalType',
				stats: 'shelterName'
			};
			let aggregate = createAggregate(shorthandAggregate, { skipValidate: true });
			expect( () => aggregate.validate(shorthandAggregate) ).to.throw(AggregateValidationError);
		});

	});

});
