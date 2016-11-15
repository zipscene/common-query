// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { expect } = require('chai');
const { createSchema } = require('common-schema');

const { RangeGroupByType } = require('../../../lib/aggregate/aggregate-types/group-by/group-by-types');
const AggregateValidationError = require('../../../lib/aggregate/aggregate-validation-error');

describe('RangeGroupByType', function() {
	let type = new RangeGroupByType();
	let schema = createSchema({
		foo: Number,
		bar: Date
	});
	let d1 = new Date('2015-01-01T05:00:00.000Z');
	let d2 = new Date('2015-02-01T05:00:00.000Z');

	describe('#getName', function() {

		it('should have the name "range"', function() {
			expect(type.getName()).to.equal('range');
		});

	});

	describe('#isType', function() {

		it('should return true when ranges is an array', function() {
			expect(type.isType({ ranges: [] })).to.be.true;
		});

		it('should return false when ranges is not an array', function() {
			expect(type.isType({ ranges: '' })).to.be.false;
			expect(type.isType({})).to.be.false;
		});

	});

	describe('#normalize', function() {

		it('should normalize shorthand numeric ranges #1', function() {
			let aggr = { field: 'foo', ranges: [ 1, 3, 5 ] };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'foo',
				ranges: [
					{ end: 1 },
					{ start: 1, end: 3 },
					{ start: 3, end: 5 },
					{ start: 5 }
				]
			});
		});

		it('should normalize shorthand numeric ranges #2', function() {
			let aggr = { field: 'foo', ranges: [ 0.5 ] };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'foo',
				ranges: [
					{ end: 0.5 },
					{ start: 0.5 }
				]
			});
		});

		it('should normalize shorthand numeric ranges #3', function() {
			let aggr = { field: 'foo', ranges: [ '1', 2, '3' ] };
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'foo',
				ranges: [
					{ end: 1 },
					{ start: 1, end: 2 },
					{ start: 2, end: 3 },
					{ start: 3 }
				]
			});
		});

		it('should normalize shorthand date ranges', function() {
			let aggr = {
				field: 'bar',
				ranges: [ d1, d2 ]
			};
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			});
		});

		it('should normalize shorthand date ranges', function() {
			let aggr = {
				field: 'bar',
				ranges: [ '2015-01-01T05:00:00.000Z', d2 ]
			};
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			});
		});

		it('should normalize numeric ranges', function() {
			let aggr = {
				field: 'foo',
				ranges: [
					{ start: '1' },
					{ start: 1, end: '2' },
					{ start: 1, end: 2, another: 'field' }
				]
			};
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'foo',
				ranges: [
					{ start: 1 },
					{ start: 1, end: 2 },
					{ start: 1, end: 2 }
				]
			});
		});

		it('should normalize date ranges', function() {
			let aggr = {
				field: 'bar',
				ranges: [
					{ start: '2015-01-01T05:00:00.000Z' },
					{ start: d1, end: '2015-02-01T05:00:00.000Z' },
					{ start: d1, end: d2, another: 'field' }
				]
			};
			type.normalize(aggr, { schema });
			expect(aggr).to.deep.equal({
				field: 'bar',
				ranges: [
					{ start: d1 },
					{ start: d1, end: d2 },
					{ start: d1, end: d2 }
				]
			});
		});

		it('should fail normalization if ranges isn\'t and array', function() {
			expect(() => type.normalize({ field: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.normalize({ field: 'foo', ranges: {} }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
		});

		it('should fail normalization if ranges is empty', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [] }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
		});

		it('should fail normalization if range entry doesn\'t have a start or end property', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ {} ] }, { schema }))
				.to.throw(AggregateValidationError, /range must contain at least a start or end property/);
		});

		it('should fail normalization if start and end types are different #1', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 1, end: new Date() } ] }, { schema }))
				.to.throw(AggregateValidationError, /range start and end types are different/);
		});

		it('should fail normalization if start and end types are different #2', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ 1, new Date() ] }, { schema }))
				.to.throw(AggregateValidationError, /range start and end types are different/);
		});

		it('should fail normalization if range entries are different types', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 1 }, { end: new Date() } ] }, { schema }))
				.to.throw(AggregateValidationError, /range entries must all be the same type/);
		});

		it('should fail normalization if start or end are invalid types', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: {} } ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 'faker' } ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
		});

		it('should fail normalization if shorthand entries are invalid types', function() {
			expect(() => type.normalize({ field: 'foo', ranges: [ 'faker' ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
		});

		it('should fail normalization if field and range types don\'t match', function() {
			expect(() => type.normalize({ field: 'bar', ranges: [ 1 ] }, { schema }))
				.to.throw(AggregateValidationError, /range type \(number\) does not match field type \(date\)/);
		});

	});

	describe('#validate', function() {

		it('should validate ranges', function() {
			let aggr = {
				field: 'foo',
				ranges: [
					{ end: 1 },
					{ start: 1, end: 2 },
					{ start: 2 }
				]
			};
			expect(type.validate(aggr)).to.be.true;
		});

		it('should validate ranges', function() {
			let d1 = new Date('2015-01-01T05:00:00.000Z');
			let d2 = new Date('2015-02-01T05:00:00.000Z');

			let aggr = {
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			};
			expect(type.validate(aggr)).to.be.true;
		});

		it('should fail normalization if ranges isn\'t and array', function() {
			expect(() => type.validate({ field: 'foo' }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.validate({ field: 'foo', ranges: {} }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
		});

		it('should fail normalization if ranges is empty', function() {
			expect(() => type.validate({ field: 'foo', ranges: [] }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
		});

		it('should fail validation if range entries aren\'t objects', function() {
			expect(() => type.validate({ field: 'foo', ranges: [ 1 ] }))
				.to.throw(AggregateValidationError, /range must be an object/);
		});

		it('should fail validation if range entries are missing both start and end fields', function() {
			expect(() => type.validate({ field: 'foo', ranges: [ {} ] }))
				.to.throw(AggregateValidationError, /range must contain at least a start or end property/);
		});

	});

});
