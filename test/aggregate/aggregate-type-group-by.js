const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const GroupByAggregateType = require('../../lib/aggregate/aggregate-types/group-by');
const GroupByType = require('../../lib/aggregate/aggregate-types/group-by/group-by-type');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');

describe('GroupByAggregateType', function() {

	let groupBy = new GroupByAggregateType();
	let schema = createSchema({
		foo: Number,
		bar: Date
	});

	describe('#getName', function() {

		it('should have the name "group-by"', function() {
			expect(groupBy.getName()).to.equal('group-by');
		});

	});


	describe('#isType', function() {

		it('should return true for group-by aggreagtes', function() {
			expect(groupBy.isType({ groupBy: [ { field: 'foo' } ] })).to.be.true;
		});

		it('should return true for object shorthand group-by aggregates', function() {
			expect(groupBy.isType({ groupBy: { field: 'foo' } })).to.be.true;
		});

		it('should return true for string shorthand group-by aggregates', function() {
			expect(groupBy.isType({ groupBy: 'foo' })).to.be.true;
		});

		it('should return false for empty string shorthand group-by aggregates', function() {
			expect(groupBy.isType({ groupBy: '' })).to.be.false;
		});

		it('should return false for invalid group-by aggregates', function() {
			expect(groupBy.isType({})).to.be.false;
		});

	});

	describe('#registerGroupByType', function() {

		it('should register new GroupByTypes', function() {
			let registeringGroupBy = new GroupByAggregateType();
			let len = registeringGroupBy._groupByTypes.length;
			registeringGroupBy.registerGroupByType('number-fields', new GroupByType('number-fields'));
			expect(registeringGroupBy._groupByTypes).to.have.length(len + 1);
		});

	});

	describe('#unregisterGroupByType', function() {

		it('should unregister GroupByTypes', function() {
			let registeringGroupBy = new GroupByAggregateType();
			let len = registeringGroupBy._groupByTypes.length;
			registeringGroupBy.unregisterGroupByType(registeringGroupBy._groupByTypes[0].getName());
			expect(registeringGroupBy._groupByTypes).to.have.length(len - 1);
		});

	});


	describe('#normalize', function() {

		it('should normalize string shorthand group-by aggregates', function() {
			let aggrA = { groupBy: 'foo' };
			groupBy.normalize(aggrA, { schema });
			expect(aggrA).to.deep.equal({ groupBy: [ { field: 'foo' } ] });
		});

		it('should normalize object shorthand group-by aggregates', function() {
			let aggrB = { groupBy: { field: 'foo' } };
			groupBy.normalize(aggrB, { schema });
			expect(aggrB).to.deep.equal({ groupBy: [ { field: 'foo' } ] });
		});

		it('should normalize shorthand group-by aggregates inside group-by array', function() {
			let aggrC = { groupBy: [
				'foo',
				{ field: 'foo', ranges: [ 1, 2 ] },
				{ field: 'foo', interval: 5 },
				{ field: 'bar', timeComponent: 'year' }
			] };
			groupBy.normalize(aggrC, { schema });
			expect(aggrC).to.deep.equal({ groupBy: [
				{ field: 'foo' },
				{ field: 'foo', ranges: [ { end: 1 }, { start: 1, end: 2 }, { start: 2 } ] },
				{ field: 'foo', interval: 5 },
				{ field: 'bar', timeComponent: 'year', timeComponentCount: 1 }
			] });
		});

		it('should fail to normalize if groupBy property isn\'t a string, plain object, or array', function() {
			expect(() => groupBy.normalize({ groupBy: 1 }, { schema }))
				.to.throw(AggregateValidationError, /groupBy field must be either string, plain object, or array/);
		});

		it('should fail to normalize if groupBy property doesn\'t match any GroupByType', function() {
			expect(() => groupBy.normalize({ groupBy: {} }, { schema }))
				.to.throw(AggregateValidationError, /could not find a groupBy type matching a grouping/);
		});

	});

	describe('#validate', function() {

		it('should validate group-by aggregates', function() {
			expect(groupBy.validate({ groupBy: [ { field: 'foo' } ] })).to.be.true;
		});

		it('should fail to validate non-array groupBy properties', function() {
			expect(() => groupBy.validate({ groupBy: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /field must be an array of group objects/);
		});

		it('should fail to validate if groupBy entries don\'t match any GroupByType', function() {
			expect(() => groupBy.validate({ groupBy: [ {} ] }, { schema }))
				.to.throw(AggregateValidationError, /could not find a groupBy type matching a grouping/);
		});

	});

	describe('#getQueriedFields', function() {

		it('should get fields from group-by aggregate', function() {
			expect(groupBy.getQueriedFields({ groupBy: [ { field: 'foo' }, { field: 'bar' } ] }, { schema }))
				.to.deep.equal([ 'foo', 'bar' ]);
		});

		it('should fail to get fields from invalid group-by aggregates', function() {
			expect(() => groupBy.getQueriedFields({ groupBy: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /field must be an array of group objects/);
		});

	});

});
