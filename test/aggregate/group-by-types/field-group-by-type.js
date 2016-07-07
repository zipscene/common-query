const { expect } = require('chai');
const { createSchema } = require('zs-common-schema');

const { FieldGroupByType } = require('../../../lib/aggregate/aggregate-types/group-by/group-by-types');
const AggregateValidationError = require('../../../lib/aggregate/aggregate-validation-error');

describe('FieldGroupByType', function() {
	let type = new FieldGroupByType();
	let numberType = new FieldGroupByType('number-type', [], [ 'number' ]);
	let schema = createSchema({
		foo: Number,
		bar: String,
		baz: Date,
		biz: [ Number ],
		blah: [ {
			meh: Number
		} ]
	});

	describe('#getName', function() {

		it('should have the name "field"', function() {
			expect(type.getName()).to.equal('field');
		});

	});

	describe('#isType', function() {

		it('should return true if the field property is a string', function() {
			expect(type.isType({ field: 'foo' })).to.be.true;
		});

		it('should return false if the field property isn\'t a string', function() {
			expect(type.isType({})).to.be.false;
			expect(type.isType({ field: true }));
		});

	});

	describe('#normalize', function() {

		it('should pass normalization for objects with a "field" property', function() {
			expect(() => type.normalize({ field: 'foo' }).to.not.throw(AggregateValidationError));
		});

		it('should fail normalization for objects without a "field" property', function() {
			expect(() => type.normalize({}))
				.to.throw(AggregateValidationError, /field property must be a string/);
		});

		it('should fail normalization for objects without a string "field" property', function() {
			expect(() => type.normalize({ field: 5 }))
				.to.throw(AggregateValidationError, /field property must be a string/);
		});

		it('should pass normalize with a schema and a valid fieldType', function() {
			expect(() => numberType.normalize({ field: 'foo' }, { schema }))
				.to.not.throw(AggregateValidationError);
		});

		it('should fail normalization wiht a schema if the field is not a valid type', function() {
			expect(() => numberType.normalize({ field: 'bar' }, { schema }))
				.to.throw(AggregateValidationError, /field type \(string\) does not match valid field types/);
		});

		it('should fail normalization with a schema if the field doesn\'t exist', function() {
			expect(() => numberType.normalize({ field: 'missing' }, { schema }))
				.to.throw(AggregateValidationError, /groupBy field path must exist in the schema/);
		});

		it('should pass normalize with a schema array field', function() {
			expect(() => numberType.normalize({ field: 'biz' }, { schema }))
				.to.not.throw(AggregateValidationError);
		});

		it('should pass normalize with a schema array field where the elements are objects', function() {
			expect(() => numberType.normalize({ field: 'blah.*.meh' }, { schema }))
				.to.not.throw(AggregateValidationError);
		});

		it('should pass normalize with a schema array field where the elements are objects', function() {
			expect(() => numberType.normalize({ field: 'blah.meh' }, { schema }))
				.to.not.throw(AggregateValidationError);
		});

	});

	describe('#validate', function() {

		it('should pass validatation for objects with a "field" property', function() {
			expect(type.validate({ field: 'foo' })).to.be.true;
		});

		it('should fail validatation for objects without a "field" property', function() {
			expect(() => type.validate({}))
				.to.throw(AggregateValidationError, /field property must be a string/);
			expect(() => type.validate({ field: 5 }))
				.to.throw(AggregateValidationError, /field property must be a string/);
		});

	});

	describe('#getQueriedFields', function() {

		it('should return an array with the string in the field property in it', function() {
			expect(type.getQueriedFields({ field: 'foo' }, { schema })).to.deep.equal([ 'foo' ]);
		});

		it('should fail if an invalid group-by field aggregate is given', function() {
			expect(() => type.getQueriedFields({ field: 1 }))
				.to.throw(AggregateValidationError, /entry must be an object with string field property/);
		});

	});

});
