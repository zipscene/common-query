const { expect } = require('chai');

const AggregateType = require('../../lib/aggregate/aggregate-type');
const AggregateValidationError = require('../../lib/aggregate/aggregate-validation-error');

describe('AggregateType', function() {
	let type = new AggregateType('test');

	describe('#getName', function() {

		it('should have the name "test"', function() {
			expect(type.getName()).to.equal('test');
		});

	});

	describe('#getFields', function() {

		it('should have fields set to [ "test" ]', function() {
			expect(type.getFields()).to.deep.equal([ 'test' ]);
		});

	});

	describe('#isType', function() {

		it('should return true for any plain object', function() {
			expect(type.isType({})).to.be.true;
		});

		it('should return true for any non-plain object', function() {
			expect(type.isType('faker')).to.be.false;
		});

	});

	describe('#normalize', function() {

		it('should always pass normalization', function() {
			expect(() => type.normalize({}, { schema: undefined })).to.not.throw(AggregateValidationError);
		});

	});

	describe('#validate', function() {

		it('should always pass validation', function() {
			expect(type.validate({})).to.be.true;
		});

	});

	describe('#getQueriedFields', function() {

		it('should return an empty array', function() {
			expect(type.getQueriedFields({ groupBy: [ { field: 'foo' } ] })).to.deep.equal([]);
		});

	});

});
