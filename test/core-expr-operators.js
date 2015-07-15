let { expect } = require('chai');
let { createQuery } = require('../lib/index');

describe('Core Expression Operators', function() {
	describe('$exists', function() {
		it('$exists', function() {
			let query1 = createQuery({ foo: { $exists: true }, bar: { $exists: false } });
			expect(query1.matches({ foo: 'fuz' })).to.be.true;
			expect(query1.matches({ foo: null })).to.be.true;
			expect(query1.matches({ foo: undefined })).to.be.false;
			expect(query1.matches({ foo: 'fuz', bar: 'biz' })).to.be.false;
			expect(query1.matches({ })).to.be.false;
		});

		it('normalizes queries to booleans', function() {
			let query1 = createQuery({ foo: { $exists: 1 }, bar: { $exists: 0 } });
			expect(query1.matches({ foo: 'fuz' })).to.be.true;
			expect(query1.matches({ foo: undefined })).to.be.false;
		});
	});

	describe('$not', function() {
		it('negates an expression', function() {
			let query1 = createQuery({ foo: { $not: { $exists: true } }, bar: { $not: { $exists: false } } });
			expect(query1.matches({ bar: 123 })).to.be.true;
			expect(query1.matches({ bar: 123, foo: 123 })).to.be.false;
		});
	});

	describe('$elemMatch', function() {
		it('$elemMatch', function() {
			let query1 = createQuery({ foo: { $elemMatch: { bar: 'baz', zip: 'buz' } } });
			expect(query1.matches({ foo: [ 1, { bar: 'baz', zip: 'buz' } ] })).to.be.true;
			expect(query1.matches({ foo: [ 1, { bar: 'baz', zip: 'bip' } ] })).to.be.false;
			let query2 = createQuery({ foo: { $elemMatch: { $exists: true } } });
			expect(query2.matches({ foo: [ undefined, undefined, 2 ] })).to.be.true;
			expect(query2.matches({ foo: [ undefined, undefined, undefined ] })).to.be.false;
		});
	});

	describe('$in', function() {
		it('$in', function() {
			let query1 = createQuery({ foo: { $in: [ 1, 2, 3 ] } });
			expect(query1.matches({ foo: 2 })).to.be.true;
			expect(query1.matches({ foo: [ 3, 4, 5 ] })).to.be.true;
			expect(query1.matches({ foo: [ 4, 5, 6 ] })).to.be.false;
			expect(query1.matches({ foo: 'bar' })).to.be.false;
		});
	});

	describe('$nin', function() {
		it('$nin', function() {
			let query1 = createQuery({ foo: { $nin: [ 1, 2, 3 ] } });
			expect(query1.matches({ foo: 2 })).to.be.false;
			expect(query1.matches({ foo: [ 3, 4, 5 ] })).to.be.true;
			expect(query1.matches({ foo: [ 4, 5, 6 ] })).to.be.true;
			expect(query1.matches({ foo: 'bar' })).to.be.true;
		});
	});

	describe('$text', function() {
		it('$text', function() {
			let query1 = createQuery({ foo: { $text: 'zip zup' } });
			expect(query1.matches({ foo: 'zip van zup' })).to.be.true;
			expect(query1.matches({ foo: 'zip bar' })).to.be.false;
		});

		it('normalizes queries to text', function() {
			let query1 = createQuery({ foo: { $text: [ 'zip', 'zup' ] } });
			expect(query1.matches({ foo: 'zip,zup' })).to.be.true;
			expect(query1.matches({ foo: 'zip bar' })).to.be.false;

			let query2 = createQuery({ foo: { $text: true } });
			expect(query2.matches({ foo: 'true' })).to.be.true;
			expect(query2.matches({ foo: 'false' })).to.be.false;
		});
	});

	describe('$wildcard', function() {
		it('$wildcard', function() {
			let query1 = createQuery({ foo: { $wildcard: 'zip*zup?' } });
			expect(query1.matches({ foo: 'zipasdzupa' })).to.be.true;
			expect(query1.matches({ foo: 'zipzup' })).to.be.true;
			expect(query1.matches({ foo: 'zipzupas' })).to.be.false;
			expect(query1.matches({ foo: 'zizup' })).to.be.false;
			expect(query1.matches({ foo: 'azipzup' })).to.be.false;
		});

		it('takes an "$options" operator', function() {
		});

		it('normalizes queries to text', function() {
			let query1 = createQuery({ foo: { $text: [ 'zip', 'zup' ] } });
			expect(query1.matches({ foo: 'zip,zup' })).to.be.true;
			expect(query1.matches({ foo: 'zip bar' })).to.be.false;

			let query2 = createQuery({ foo: { $text: true } });
			expect(query2.matches({ foo: 'true' })).to.be.true;
			expect(query2.matches({ foo: 'false' })).to.be.false;
		});
	});

	describe('$regex', function() {
		it('$regex', function() {
			let query1 = createQuery({ foo: { $regex: '^zip.*zup.?$', $options: 'i' } });
			expect(query1.matches({ foo: 'zipasdzupa' })).to.be.true;
			expect(query1.matches({ foo: 'zipzup' })).to.be.true;
			expect(query1.matches({ foo: 'zipzupas' })).to.be.false;
			expect(query1.matches({ foo: 'zizup' })).to.be.false;
			expect(query1.matches({ foo: 'azipzup' })).to.be.false;
			expect(query1.matches({ foo: 'ZIPZUP' })).to.be.true;
		});

		it('takes an "$options" operator', function() {
		});

		it('normalizes queries to text', function() {
			let query1 = createQuery({ foo: { $text: [ 'zip', 'zup' ] } });
			expect(query1.matches({ foo: 'zip,zup' })).to.be.true;
			expect(query1.matches({ foo: 'zip bar' })).to.be.false;

			let query2 = createQuery({ foo: { $text: true } });
			expect(query2.matches({ foo: 'true' })).to.be.true;
			expect(query2.matches({ foo: 'false' })).to.be.false;
		});
	});

	describe('$gt, $gte, $lt, $lte', function() {
		let query1 = createQuery({ foo: { $gt: 10, $lt: 20 }, bar: { $gte: 11, $lte: 19 } });
		it('$gt, $gte, $lt, $lte', function() {
			expect(query1.matches({ foo: 15, bar: 15 })).to.be.true;
			expect(query1.matches({ foo: 11, bar: 11 })).to.be.true;
			expect(query1.matches({ foo: 19, bar: 19 })).to.be.true;
			expect(query1.matches({ foo: [ 100, 19, 0 ], bar: 19 })).to.be.true;
			expect(query1.matches({ foo: 11, bar: 20 })).to.be.false;
			expect(query1.matches({ foo: 10, bar: 11 })).to.be.false;
			let query2 = createQuery({ foo: {
				$gte: new Date('2012-01-01T00:00:00Z'),
				$lte: new Date('2013-01-01T00:00:00Z')
			} });
			expect(query2.matches({ foo: new Date('2012-01-20T00:00:00Z') })).to.be.true;
			expect(query2.matches({ foo: new Date('2011-01-20T00:00:00Z') })).to.be.false;
			let query3 = createQuery({ foo: { $gt: 'cat', $lt: 'dog' } });
			expect(query3.matches({ foo: 'cuttlefish' })).to.be.true;
			expect(query3.matches({ foo: 'elephant' })).to.be.false;
		});
	});

	describe('$ne', function() {
		it('$ne', function() {
			let query1 = createQuery({ foo: { $ne: 'bar' } });
			expect(query1.matches({ foo: 'baz' })).to.be.true;
			expect(query1.matches({ foo: 'bar' })).to.be.false;
		});
	});
});
