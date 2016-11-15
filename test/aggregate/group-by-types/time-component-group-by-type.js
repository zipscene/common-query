// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { expect } = require('chai');
const { createSchema } = require('common-schema');

const { TimeComponentGroupByType } = require('../../../lib/aggregate/aggregate-types/group-by/group-by-types');
const AggregateValidationError = require('../../../lib/aggregate/aggregate-validation-error');

describe('TimeComponentGroupByType', function() {
	let type = new TimeComponentGroupByType();
	let schema = createSchema({
		foo: Number,
		bar: Date
	});

	describe('#getName', function() {

		it('should have the name "time-component"', function() {
			expect(type.getName()).to.equal('time-component');
		});

	});

	describe('#isType', function() {

		it('should return true for valid time component group-by aggregates', function() {
			expect(type.isType({ timeComponent: 'year' })).to.be.true;
		});

		it('should return false for invalid time compoentn group-by aggregates', function() {
			expect(type.isType({ timeComponent: 1 })).to.be.false;
			expect(type.isType({})).to.be.false;
		});

	});

	describe('#normalize', function() {

		it('should normalize a valid time component wihtout a timeComponentCount', function() {
			let aggr = { field: 'bar', timeComponent: 'year' };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 1 });
		});

		it('should normalize a valid time component and timeComponentCount', function() {
			let aggr = { field: 'bar', timeComponent: 'year', timeComponentCount: 2 };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 2 });
		});

		it('should normalize the timeComponentCount', function() {
			let aggr = { field: 'bar', timeComponent: 'year', timeComponentCount: '2' };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 2 });
		});

		it('should fail to normalize for non-date fields', function() {
			expect(() => type.normalize({ field: 'foo', timeComponent: 'year' }, { schema }))
				.to.throw(AggregateValidationError, /field type \(number\) does not match valid field types/);
		});

		it('should fail to normalize for an invalid timeComponent field', function() {
			expect(() => type.normalize({ field: 'bar', timeComponent: 'faker' }, { schema }))
				.to.throw(AggregateValidationError, /time component must be one of: /);
		});

		it('should fail to normalize for an invalid timeComponentCount field', function() {
			expect(() => type.normalize(
				{ field: 'bar', timeComponent: 'year', timeComponentCount: 'faker' },
				{ schema }
			)).to.throw(AggregateValidationError, /time component count must be a number > 0/);
		});

	});

	describe('#validate', function() {

		it('should validate timeComponent and timeComponentCount', function() {
			expect(type.validate({ field: 'bar', timeComponent: 'year', timeComponentCount: 1 })).to.be.true;
		});

		it('should fail to validate for an invalid timeComponent field', function() {
			expect(() => type.validate({ field: 'bar', timeComponent: 'faker' }))
				.to.throw(AggregateValidationError, /time component must be one of: /);
		});

		it('should fail to validate for an invalid timeComponentCount field', function() {
			expect(() => type.validate({ field: 'bar', timeComponent: 'year', timeComponentCount: 'faker' }))
				.to.throw(AggregateValidationError, /time component count must be a number > 0/);
		});

	});

});
