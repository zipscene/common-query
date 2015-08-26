const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const GroupByAggregateType = require('../../lib/aggregate/aggregate-types/group-by');
const GroupByType = require('../../lib/aggregate/aggregate-types/group-by/group-by-type');
const {
	FieldGroupByType,
	RangeGroupByType,
	IntervalGroupByType,
	TimeComponentGroupByType
} = require('../../lib/aggregate/aggregate-types/group-by/group-by-types');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');

describe('AggregateType - GroupBy', function() {

	describe('GroupBy', function() {
		let groupBy = new GroupByAggregateType();
		let schema = createSchema({
			foo: Number,
			bar: Date
		});

		it('should have the name "group-by"', function() {
			expect(groupBy.getName()).to.equal('group-by');
		});

		it('should match aggregates that have a non-empty groupBy field', function() {
			expect(groupBy.isType({ groupBy: 'foo' })).to.be.true;
			expect(groupBy.isType({ groupBy: { field: 'foo' } })).to.be.true;
			expect(groupBy.isType({ groupBy: [ { field: 'foo' } ] })).to.be.true;
			expect(groupBy.isType({})).to.be.false;
			expect(groupBy.isType({ groupBy: '' })).to.be.false;
		});

		it('should have 4 core GroupByTypes registered', function() {
			expect(groupBy._groupByTypes).to.have.length(4);
		});

		it('should be able to register and unregister GroupByTypes', function() {
			let registeringGroupBy = new GroupByAggregateType();
			expect(registeringGroupBy._groupByTypes).to.have.length(4);
			registeringGroupBy.registerGroupByType('number-fields', new FieldGroupByType('number-fields'));
			expect(registeringGroupBy._groupByTypes).to.have.length(5);
			registeringGroupBy.unregisterGroupByType('number-fields');
			expect(registeringGroupBy._groupByTypes).to.have.length(4);
		});

		it('should normalize groupBy aggregates', function() {
			let aggrA = { groupBy: 'foo' };
			groupBy.normalize(aggrA, { schema });
			expect(aggrA).to.deep.equal({ groupBy: [ { field: 'foo' } ] });

			let aggrB = { groupBy: { field: 'foo' } };
			groupBy.normalize(aggrB, { schema });
			expect(aggrB).to.deep.equal({ groupBy: [ { field: 'foo' } ] });

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

		it('should fail to normalize invalid groupBy aggregates', function() {
			expect(() => groupBy.normalize({ groupBy: 1 }, { schema }))
				.to.throw(AggregateValidationError, /groupBy field must be either string, plain object, or array/);
			expect(() => groupBy.normalize({ groupBy: {} }, { schema }))
				.to.throw(AggregateValidationError, /could not find a groupBy type matching a grouping/);
		});

		it('should validate groupBy aggregates', function() {
			expect(() => groupBy.validate({ groupBy: [ { field: 'foo' } ] })).to.not.throw(AggregateValidationError);
			expect(() => groupBy.validate({ groupBy: 1 }, { schema }))
				.to.throw(AggregateValidationError, /field must be an array of group objects/);
			expect(() => groupBy.validate({ groupBy: [ {} ] }, { schema }))
				.to.throw(AggregateValidationError, /could not find a groupBy type matching a grouping/);
		});

		it('should get queried fields', function() {
			expect(groupBy.getQueriedFields({ groupBy: [ { field: 'foo' }, { field: 'bar' } ] }, { schema }))
				.to.deep.equal([ 'foo', 'bar' ]);
			expect(() => groupBy.getQueriedFields({ groupBy: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /field must be an array of group objects/);
		});

	});

	describe('GroupByType', function() {
		let type = new GroupByType('test');

		it('should have the name "test"', function() {
			expect(type.getName()).to.equal('test');
		});

		it('should match every group object given to it', function() {
			expect(type.isType({})).to.be.true;
		});

		it('should pass normalization/validation for valid objects', function() {
			expect(() => type.validate({})).to.not.throw(AggregateValidationError);
		});

		it('should fail normalizeation/validation for non-objects', function() {
			expect(() => type.validate('faker'))
				.to.throw(AggregateValidationError, /entry must be an object/);
		});

		it('should fail normalization/validation for objects with extra fields', function() {
			expect(() => type.validate({ field: 'faker' }))
				.to.throw(AggregateValidationError, /entry contains an unrecognized field \(field\)/);
		});

	});

	describe('FieldGroupByType', function() {
		let type = new FieldGroupByType();
		let numberType = new FieldGroupByType('number-type', [], [ 'number' ]);
		let schema = createSchema({
			foo: Number,
			bar: String,
			baz: Date
		});

		it('should have the name "field"', function() {
			expect(type.getName()).to.equal('field');
		});

		it('should match every group object given to it', function() {
			expect(type.isType({ field: 'foo' })).to.be.true;
			expect(type.isType({})).to.be.false;
		});

		it('should pass normalization for objects with a "field" property', function() {
			expect(() => type.normalize({ field: 'foo' }).to.not.throw(AggregateValidationError));
		});

		it('should fail normalization for objects without a "field" property', function() {
			expect(() => type.normalize({}))
				.to.throw(AggregateValidationError, /field property must be a string/);
			expect(() => type.normalize({ field: 5 }))
				.to.throw(AggregateValidationError, /field property must be a string/);
		});


		it('should pass validatation for objects with a "field" property', function() {
			expect(() => type.validate({ field: 'foo' }).to.not.throw(AggregateValidationError));
		});

		it('should fail validatation for objects without a "field" property', function() {
			expect(() => type.validate({}))
				.to.throw(AggregateValidationError, /field property must be a string/);
			expect(() => type.validate({ field: 5 }))
				.to.throw(AggregateValidationError, /field property must be a string/);
		});

		it('should pass normalize with a schema and a valid fieldType', function() {
			expect(() => numberType.normalize({ field: 'foo' }, { schema }))
				.to.not.throw(AggregateValidationError);
		});

		it('should fail normalization with a schema and an invalid fieldType', function() {
			expect(() => numberType.normalize({ field: 'bar' }, { schema }))
				.to.throw(AggregateValidationError, /does not match valid field types/);
			expect(() => numberType.normalize({ field: 'missing' }, { schema }))
				.to.throw(AggregateValidationError, /groupBy field path must exist in the schema/);
			expect(() => numberType.normalize({ field: 'baz' }, { schema }))
				.to.throw(AggregateValidationError, /field type \(date\) does not match valid field types/);
		});

	});

	describe('RangeGroupByType', function() {
		let type = new RangeGroupByType();
		let schema = createSchema({
			foo: Number,
			bar: Date
		});

		it('should have the name "range"', function() {
			expect(type.getName()).to.equal('range');
		});

		it('should match types when a ranges array property is provided', function() {
			expect(type.isType({ ranges: [] })).to.be.true;
			expect(type.isType({ ranges: '' })).to.be.false;
			expect(type.isType({})).to.be.false;
		});

		it('should normalize shorthand numeric ranges', function() {
			let numericA = { field: 'foo', ranges: [ 1, 3, 5 ] };
			type.normalize(numericA, { schema });
			expect(numericA).to.deep.equal({
				field: 'foo',
				ranges: [
					{ end: 1 },
					{ start: 1, end: 3 },
					{ start: 3, end: 5 },
					{ start: 5 }
				]
			});

			let numericB = { field: 'foo', ranges: [ 0.5 ] };
			type.normalize(numericB, { schema });
			expect(numericB).to.deep.equal({
				field: 'foo',
				ranges: [
					{ end: 0.5 },
					{ start: 0.5 }
				]
			});

			let numericC = { field: 'foo', ranges: [ '1', 2, '3' ] };
			type.normalize(numericC, { schema });
			expect(numericC).to.deep.equal({
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
			let d1 = new Date('2015-01-01T05:00:00.000Z');
			let d2 = new Date('2015-02-01T05:00:00.000Z');

			let dateA = {
				field: 'bar',
				ranges: [ d1, d2 ]
			};
			type.normalize(dateA, { schema });
			expect(dateA).to.deep.equal({
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			});

			let dateB = {
				field: 'bar',
				ranges: [ '2015-01-01T05:00:00.000Z', d2 ]
			};
			type.normalize(dateB, { schema });
			expect(dateB).to.deep.equal({
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			});
		});

		it('should normalize numeric ranges', function() {
			let numeric = {
				field: 'foo',
				ranges: [
					{ start: '1' },
					{ start: 1, end: '2' },
					{ start: 1, end: 2, another: 'field' }
				]
			};
			type.normalize(numeric, { schema });
			expect(numeric).to.deep.equal({
				field: 'foo',
				ranges: [
					{ start: 1 },
					{ start: 1, end: 2 },
					{ start: 1, end: 2 }
				]
			});
		});

		it('should normalize date ranges', function() {
			let d1 = new Date('2015-01-01T05:00:00.000Z');
			let d2 = new Date('2015-02-01T05:00:00.000Z');
			let date = {
				field: 'bar',
				ranges: [
					{ start: '2015-01-01T05:00:00.000Z' },
					{ start: d1, end: '2015-02-01T05:00:00.000Z' },
					{ start: d1, end: d2, another: 'field' }
				]
			};
			type.normalize(date, { schema });
			expect(date).to.deep.equal({
				field: 'bar',
				ranges: [
					{ start: d1 },
					{ start: d1, end: d2 },
					{ start: d1, end: d2 }
				]
			});
		});

		it('should fail normalization for invalid ranges', function() {
			expect(() => type.normalize({ field: 'foo' }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.normalize({ field: 'foo', ranges: {} }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.normalize({ field: 'foo', ranges: [] }, { schema }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.normalize({ field: 'foo', ranges: [ {} ] }, { schema }))
				.to.throw(AggregateValidationError, /range must contain at least a start or end property/);
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 1, end: new Date() } ] }, { schema }))
				.to.throw(AggregateValidationError, /range start and end types are different/);
			expect(() => type.normalize({ field: 'foo', ranges: [ 1, new Date() ] }, { schema }))
				.to.throw(AggregateValidationError, /range start and end types are different/);
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 1 }, { end: new Date() } ] }, { schema }))
				.to.throw(AggregateValidationError, /range entries must all be the same type/);
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: {} } ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
			expect(() => type.normalize({ field: 'foo', ranges: [ { start: 'faker' } ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
			expect(() => type.normalize({ field: 'foo', ranges: [ 'faker' ] }, { schema }))
				.to.throw(AggregateValidationError, /range value must be a number, date, or ISO date string/);
			expect(() => type.normalize({ field: 'bar', ranges: [ 1 ] }, { schema }))
				.to.throw(AggregateValidationError, /range type \(number\) does not match field type \(date\)/);
		});

		it('should validate ranges', function() {
			let d1 = new Date('2015-01-01T05:00:00.000Z');
			let d2 = new Date('2015-02-01T05:00:00.000Z');
			let numeric = {
				field: 'foo',
				ranges: [
					{ end: 1 },
					{ start: 1, end: 2 },
					{ start: 2 }
				]
			};
			expect(() => type.validate(numeric)).to.not.throw(AggregateValidationError);

			let date = {
				field: 'bar',
				ranges: [
					{ end: d1 },
					{ start: d1, end: d2 },
					{ start: d2 }
				]
			};
			expect(() => type.validate(date)).to.not.throw(AggregateValidationError);
		});

		it('should fail validation for invalid ranges', function() {
			expect(() => type.validate({ field: 'foo' }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.validate({ field: 'foo', ranges: {} }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.validate({ field: 'foo', ranges: [] }))
				.to.throw(AggregateValidationError, /ranges must be an array with length > 0/);
			expect(() => type.validate({ field: 'foo', ranges: [ 1 ] }))
				.to.throw(AggregateValidationError, /range must be an object/);
			expect(() => type.validate({ field: 'foo', ranges: [ {} ] }))
				.to.throw(AggregateValidationError, /range must contain at least a start or end property/);
		});

	});

	describe('IntervalGroupByType', function() {
		let type = new IntervalGroupByType();
		let schema = createSchema({
			foo: Number,
			bar: Date
		});

		it('should have the name "interval"', function() {
			expect(type.getName()).to.equal('interval');
		});

		it('should match types when group.interval is a string or number', function() {
			expect(type.isType({ interval: 'P8H' })).to.be.true;
			expect(type.isType({ interval: 8 })).to.be.true;
			expect(type.isType({})).to.be.false;
			expect(type.isType({ interval: new Date() })).to.be.false;
		});

		it('should normalize numeric intervals', function() {
			let numericA = { field: 'foo', interval: 8 };
			type.normalize(numericA, { schema });
			expect(numericA).to.deep.equal({ field: 'foo', interval: 8 });

			let numericB = { field: 'foo', interval: '8' };
			type.normalize(numericB, { schema });
			expect(numericB).to.deep.equal({ field: 'foo', interval: 8 });

			let numericC = { field: 'foo', interval: 8, base: 5 };
			type.normalize(numericC, { schema });
			expect(numericC).to.deep.equal({ field: 'foo', interval: 8, base: 5 });

			let numericD = { field: 'foo', interval: 8, base: '5' };
			type.normalize(numericD, { schema });
			expect(numericD).to.deep.equal({ field: 'foo', interval: 8, base: 5 });
		});

		it('should normalize duration intervals', function() {
			let durationA = { field: 'bar', interval: 'PT8H' };
			type.normalize(durationA, { schema });
			expect(durationA).to.deep.equal({ field: 'bar', interval: 'PT8H' });

			let durationB = { field: 'bar', interval: 'PT8H', base: new Date(2015, 0, 1, 0, 0, 0) };
			type.normalize(durationB, { schema });
			expect(durationB).to.deep.equal({ field: 'bar', interval: 'PT8H', base: new Date(2015, 0, 1, 0, 0, 0) });

			let durationC = { field: 'bar', interval: 'PT8H', base: '2015-01-01T05:00:00.000Z' };
			type.normalize(durationC, { schema });
			expect(durationC).to.deep.equal({ field: 'bar', interval: 'PT8H', base: new Date(2015, 0, 1, 0, 0, 0) });
		});

		it('should fail normalization for invalid intervals', function() {
			expect(() => type.normalize({ field: 'foo', interval: 8, base: new Date() }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(date\) must match/);

			expect(() => type.normalize({ field: 'foo', interval: {} }, { schema }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);

			expect(() => type.normalize({ field: 'bar', interval: 'PT8H', base: 5 }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(date\) and base type \(number\) must match/);

			expect(() => type.normalize({ field: 'foo', interval: 8, base: 'fail' }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(string\) must match/);

			expect(() => type.normalize({ field: 'foo', interval: 8, base: {} }, { schema }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(object\) must match/);

			expect(() => type.normalize({ field: 'bar', interval: 8, base: 5 }, { schema }))
				.to.throw(AggregateValidationError, /interval and field types must match/);
		});

		it('should validate numeric intervals', function() {
			let numericA = { field: 'foo', interval: 8 };
			expect(() => type.validate(numericA)).to.not.throw(AggregateValidationError);

			let numericB = { field: 'foo', interval: 8, base: 5 };
			expect(() => type.validate(numericB)).to.not.throw(AggregateValidationError);
		});

		it('should validate duration intervals', function() {
			let durationA = { field: 'bar', interval: 'PT8H' };
			expect(() => type.validate(durationA)).to.not.throw(AggregateValidationError);

			let durationB = { field: 'bar', interval: 'PT8H', base: new Date(2015, 0, 1, 0, 0, 0) };
			expect(() => type.validate(durationB)).to.not.throw(AggregateValidationError);
		});

		it('should fail validation for invalid intervals', function() {
			expect(() => type.validate({ field: 'foo', interval: 8, base: new Date() }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(date\) must match/);

			expect(() => type.validate({ field: 'bar', interval: 'PT8H', base: 5 }))
				.to.throw(AggregateValidationError, /interval type \(date\) and base type \(number\) must match/);

			expect(() => type.validate({ field: 'foo', interval: 8, base: {} }))
				.to.throw(AggregateValidationError, /interval type \(number\) and base type \(object\) must match/);

			expect(() => type.validate({ field: 'foo', interval: {} }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);

			expect(() => type.validate({ field: 'bar', interval: 'faker' }))
				.to.throw(AggregateValidationError, /interval must be a number or valid ISO 8601 time duration/);

			expect(() => type.validate({ field: 'foo', interval: 8, base: new Date('fail') }))
				.to.throw(AggregateValidationError, /interval duration base must be a valid date/);
		});

	});

	describe('TimeComponentGroupByType', function() {
		let type = new TimeComponentGroupByType();
		let schema = createSchema({
			foo: Number,
			bar: Date
		});

		it('should have the name "time-component"', function() {
			expect(type.getName()).to.equal('time-component');
		});

		it('should match when group.timeComponent is sest to a string', function() {
			expect(type.isType({ timeComponent: 'year' })).to.be.true;
			expect(type.isType({ timeComponent: 1 })).to.be.false;
			expect(type.isType({})).to.be.false;
		});

		it('should normalize timeComponent and timeComponentCount', function() {
			let timeComponentA = { field: 'bar', timeComponent: 'year' };
			type.normalize(timeComponentA, { schema });
			expect(timeComponentA).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 1 });
			let timeComponentB = { field: 'bar', timeComponent: 'year', timeComponentCount: 2 };
			type.normalize(timeComponentB, { schema });
			expect(timeComponentB).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 2 });
			let timeComponentC = { field: 'bar', timeComponent: 'year', timeComponentCount: '2' };
			type.normalize(timeComponentC, { schema });
			expect(timeComponentC).to.deep.equal({ field: 'bar', timeComponent: 'year', timeComponentCount: 2 });
		});

		it('should fail to normalize invalid timeComponent or timeComponentCount aggregates', function() {
			expect(() => type.normalize({ field: 'foo', timeComponent: 'year' }, { schema }))
				.to.throw(AggregateValidationError);
			expect(() => type.normalize({ field: 'bar', timeComponent: 'faker' }, { schema }))
				.to.throw(AggregateValidationError);
			expect(() => type.normalize(
				{ field: 'bar', timeComponent: 'year', timeComponentCount: 'faker' },
				{ schema }
			)).to.throw(AggregateValidationError);
		});

		it('should validate timeComponent and timeComponentCount', function() {
			expect(() => type.validate({ field: 'bar', timeComponent: 'year', timeComponentCount: 1 }))
				.to.not.throw(AggregateValidationError);
			expect(() => type.validate({ field: 'bar', timeComponent: 'faker' }))
				.to.throw(AggregateValidationError);
			expect(() => type.validate({ field: 'bar', timeComponent: 'year', timeComponentCount: 'faker' }))
				.to.throw(AggregateValidationError);
		});
	});

});
