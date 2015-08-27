const { expect } = require('chai');

const GroupByType = require('../../../lib/aggregate/aggregate-types/group-by/group-by-type');
const AggregateValidationError = require('../../../lib/aggregate/aggregate-validation-error');

describe('GroupByType', function() {
	let type = new GroupByType('test');

	describe('#getName', function() {

		it('should have the name "test"', function() {
			expect(type.getName()).to.equal('test');
		});

	});

	describe('#isType', function() {

		it('should match every group object given to it', function() {
			expect(type.isType({})).to.be.true;
		});

	});

	describe('#_normalizeAndValidate', function() {

		it('should pass normalization/validation for valid objects', function() {
			expect(type.validate({})).to.be.true;
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

	describe('#getQueriedFields', function() {

		it('should return an empty array', function() {
			expect(type.getQueriedFields({ groupBy: [ { field: 'foo' } ] })).to.deep.equal([]);
		});

	});

});
