const { expect } = require('chai');
const { createQuery } = require('../../lib/index');
const { createSchema } = require('zs-common-schema');

describe('Core Expression Operators', function() {
	describe('$exists', function() {
		it('$exists', function() {
			const query = createQuery({ foo: { $exists: true }, bar: { $exists: false } });
			expect(query.matches({ foo: 'fuz' })).to.be.true;
			expect(query.matches({ foo: null })).to.be.true;
			expect(query.matches({ foo: undefined })).to.be.false;
			expect(query.matches({ foo: 'fuz', bar: 'biz' })).to.be.false;
			expect(query.matches({ })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $exists: 1 },
				bar: { $exists: 0 }
			});
			expect(query.getData()).to.deep.equal({
				foo: { $exists: true },
				bar: { $exists: false }
			});

			const query2 = createQuery({
				foo: { $exists: 1 },
				bar: { $exists: 0 }
			}, {
				schema: createSchema({
					foo: Number,
					bar: Date
				})
			});
			expect(query2.getData()).to.deep.equal({
				foo: { $exists: true },
				bar: { $exists: false }
			});
		});
	});

	describe('$not', function() {
		it('negates an expression', function() {
			const query = createQuery({ foo: { $not: { $exists: true } }, bar: { $not: { $exists: false } } });
			expect(query.matches({ bar: 123 })).to.be.true;
			expect(query.matches({ bar: 123, foo: 123 })).to.be.false;
		});
	});

	describe('$elemMatch', function() {
		it('$elemMatch', function() {
			const query = createQuery({ foo: { $elemMatch: { bar: 'baz', zip: 'buz' } } });
			expect(query.matches({ foo: [ 1, { bar: 'baz', zip: 'buz' } ] })).to.be.true;
			expect(query.matches({ foo: [ 1, { bar: 'baz', zip: 'bip' } ] })).to.be.false;
			const query2 = createQuery({ foo: { $elemMatch: { $exists: true } } });
			expect(query2.matches({ foo: [ undefined, undefined, 2 ] })).to.be.true;
			expect(query2.matches({ foo: [ undefined, undefined, undefined ] })).to.be.false;
		});
	});

	describe('$in', function() {
		it('$in', function() {
			const query = createQuery({ foo: { $in: [ 1, 2, 3 ] } });
			expect(query.matches({ foo: 2 })).to.be.true;
			expect(query.matches({ foo: [ 3, 4, 5 ] })).to.be.true;
			expect(query.matches({ foo: [ 4, 5, 6 ] })).to.be.false;
			expect(query.matches({ foo: 'bar' })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $in: [ '0', '1', '2' ] },
				bar: { $in: [ '0', '1', '2' ] }
			}, {
				schema: createSchema({
					foo: Number,
					bar: String
				})
			});
			expect(query.getData()).to.deep.equal({
				foo: { $in: [ 0, 1, 2 ] },
				bar: { $in: [ '0', '1', '2' ] }
			});
		});
	});

	describe('$nin', function() {
		it('$nin', function() {
			const query = createQuery({ foo: { $nin: [ 1, 2, 3 ] } });
			expect(query.matches({ foo: 2 })).to.be.false;
			expect(query.matches({ foo: [ 3, 4, 5 ] })).to.be.true;
			expect(query.matches({ foo: [ 4, 5, 6 ] })).to.be.true;
			expect(query.matches({ foo: 'bar' })).to.be.true;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $nin: [ 'true', 'false', 'true' ] },
				bar: { $nin: [ 'true', 'false', 'true' ] }
			}, {
				schema: createSchema({
					foo: Boolean,
					bar: String
				})
			});
			expect(query.getData()).to.deep.equal({
				foo: { $nin: [ true, false, true ] },
				bar: { $nin: [ 'true', 'false', 'true' ] }
			});
		});
	});

	describe('$all', function() {
		it('$all', function() {
			const query = createQuery({ foo: { $all: [ 1, 2, 3 ] } });
			// expect(query.matches({ foo: [ 1, 2, 3 ] })).to.be.true;
			// expect(query.matches({ foo: [ 1, 2, 3, 4, 5 ] })).to.be.true;
			expect(query.matches({ foo: [ 1, 2 ] })).to.be.false;
			expect(query.matches({ foo: 'bar' })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $all: [ '0', '1', '2' ] },
				bar: { $all: [ '0', 1, '2' ] }
			}, {
				schema: createSchema({
					foo: Number,
					bar: String
				})
			});
			expect(query.getData()).to.deep.equal({
				foo: { $all: [ 0, 1, 2 ] },
				bar: { $all: [ '0', '1', '2' ] }
			});
		});
	});

	describe('$text', function() {
		it('$text', function() {
			const query = createQuery({ foo: { $text: 'zip zup' } });
			expect(query.matches({ foo: 'zip van zup' })).to.be.true;
			expect(query.matches({ foo: 'zip bar' })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({ foo: { $text: [ 'zip', 'zup' ] } });
			expect(query.getData()).to.deep.equal({
				foo: { $text: 'zip,zup' }
			});

			const query2 = createQuery({ foo: { $text: true } });
			expect(query2.getData()).to.deep.equal({
				foo: { $text: 'true' }
			});

			const query3 = createQuery({
				foo: { $text: 1024 }
			}, {
				schema: createSchema({ foo: Date })
			});
			expect(query3.getData()).to.deep.equal({
				foo: { $text: '1024' }
			});
		});
	});

	describe('$wildcard', function() {
		it('$wildcard', function() {
			const query = createQuery({ foo: { $wildcard: 'zip*zup?' } });
			expect(query.matches({ foo: 'zipasdzupa' })).to.be.true;
			expect(query.matches({ foo: 'zipzup' })).to.be.true;
			expect(query.matches({ foo: 'zipzupas' })).to.be.false;
			expect(query.matches({ foo: 'zizup' })).to.be.false;
			expect(query.matches({ foo: 'azipzup' })).to.be.false;
		});

		it('takes an "$options" operator', function() {
		});

		it('normalizes queries', function() {
			const query = createQuery({ foo: { $wildcard: [ 'zip', 'zup' ] } });
			expect(query.getData()).to.deep.equal({
				foo: { $wildcard: 'zip,zup' }
			});

			const query2 = createQuery({ foo: { $wildcard: true } });
			expect(query2.getData()).to.deep.equal({
				foo: { $wildcard: 'true' }
			});

			const query3 = createQuery({
				foo: { $wildcard: 1024 }
			}, {
				schema: createSchema({ foo: Boolean })
			});
			expect(query3.getData()).to.deep.equal({
				foo: { $wildcard: '1024' }
			});
		});
	});

	describe('$regex', function() {
		it('$regex', function() {
			const query = createQuery({ foo: { $regex: '^zip.*zup.?$', $options: 'i' } });
			expect(query.matches({ foo: 'zipasdzupa' })).to.be.true;
			expect(query.matches({ foo: 'zipzup' })).to.be.true;
			expect(query.matches({ foo: 'zipzupas' })).to.be.false;
			expect(query.matches({ foo: 'zizup' })).to.be.false;
			expect(query.matches({ foo: 'azipzup' })).to.be.false;
			expect(query.matches({ foo: 'ZIPZUP' })).to.be.true;
		});

		it('takes an "$options" operator', function() {
		});

		it('normalizes queries', function() {
			const query = createQuery({ foo: { $regex: /foo/ } });
			expect(query.getData()).to.deep.equal({
				foo: { $regex: 'foo' }
			});

			const query2 = createQuery({ foo: { $regex: true } });
			expect(query2.getData()).to.deep.equal({
				foo: { $regex: 'true' }
			});

			const query3 = createQuery({
				foo: { $regex: 1024 }
			}, {
				schema: createSchema({ foo: String })
			});
			expect(query3.getData()).to.deep.equal({
				foo: { $regex: '1024' }
			});
		});
	});

	describe('$gt, $gte, $lt, $lte', function() {
		const query = createQuery({ foo: { $gt: 10, $lt: 20 }, bar: { $gte: 11, $lte: 19 } });
		it('$gt, $gte, $lt, $lte', function() {
			expect(query.matches({ foo: 15, bar: 15 })).to.be.true;
			expect(query.matches({ foo: 11, bar: 11 })).to.be.true;
			expect(query.matches({ foo: 19, bar: 19 })).to.be.true;
			expect(query.matches({ foo: [ 100, 19, 0 ], bar: 19 })).to.be.true;
			expect(query.matches({ foo: 11, bar: 20 })).to.be.false;
			expect(query.matches({ foo: 10, bar: 11 })).to.be.false;
			const query2 = createQuery({ foo: {
				$gte: new Date('2012-01-01T00:00:00Z'),
				$lte: new Date('2013-01-01T00:00:00Z')
			} });
			expect(query2.matches({ foo: new Date('2012-01-20T00:00:00Z') })).to.be.true;
			expect(query2.matches({ foo: new Date('2011-01-20T00:00:00Z') })).to.be.false;
			const query3 = createQuery({ foo: { $gt: 'cat', $lt: 'dog' } });
			expect(query3.matches({ foo: 'cuttlefish' })).to.be.true;
			expect(query3.matches({ foo: 'elephant' })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $gt: 32 },
				bar: { $gte: '64' },
				baz: { $lt: new Date('2010-10-20T00:00:00Z') },
				qux: { $lte: '3' }
			});

			expect(query.getData()).to.deep.equal({
				foo: { $gt: 32 },
				bar: { $gte: '64' },
				baz: { $lt: new Date('2010-10-20T00:00:00Z') },
				qux: { $lte: '3' }
			});

			const query2 = createQuery({
				foo: { $gt: 32 },
				bar: { $gte: '64' },
				baz: { $lt: '2010-10-20T00:00:00Z' },
				qux: { $lte: '3' }
			}, {
				schema: createSchema({
					foo: String,
					bar: Number,
					baz: Date,
					qux: Number
				})
			});

			expect(query2.getData()).to.deep.equal({
				foo: { $gt: '32' },
				bar: { $gte: 64 },
				baz: { $lt: new Date('2010-10-20T00:00:00Z') },
				qux: { $lte: 3 }
			});
		});
	});

	describe('$ne', function() {
		it('$ne', function() {
			const query = createQuery({ foo: { $ne: 'bar' } });
			expect(query.matches({ foo: 'baz' })).to.be.true;
			expect(query.matches({ foo: 'bar' })).to.be.false;
		});

		it('normalizes queries', function() {
			const query = createQuery({
				foo: { $ne: '0' }
			}, {
				schema: createSchema({ foo: Number })
			});

			expect(query.getData()).to.deep.equal({
				foo: { $ne: 0 }
			});
		});
	});
});
