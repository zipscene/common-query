var expect = require('chai').expect;
var createQuery = require('../lib/index').createQuery;

describe('Query', function() {

	describe('matches()', function() {

		it('basic exact match', function(done) {
			let query1 = createQuery({
				foo: 'bar',
				biz: 'baz'
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'bam',
				qux: 'buz'
			})).to.equal(false);
			done();
		});

		it('full object exact match', function(done) {
			let query1 = createQuery({
				foo: {
					bar: 'biz',
					baz: 'buz'
				}
			});
			expect(query1.matches({
				foo: {
					bar: 'biz',
					baz: 'buz'
				},
				zip: 'fuz'
			})).to.equal(true);
			expect(query1.matches({
				foo: {
					bar: 'biz',
					baz: 'buz',
					qux: 'bam'
				},
				zip: 'fuz'
			})).to.equal(false);
			done();
		});

		it('$and', function(done) {
			let query1 = createQuery({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(false);
			done();
		});

		it('$or', function(done) {
			let query1 = createQuery({
				$or: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bam',
				biz: 'buz'
			})).to.equal(false);
			done();
		});

		it('$nor', function(done) {
			let query1 = createQuery({
				$nor: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'buz'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bam',
				biz: 'buz'
			})).to.equal(true);
			done();
		});

		it('combined $and, $or, $nor', function(done) {
			let query1 = createQuery({
				$and: [
					{
						foo: 'bar'
					},
					{
						biz: 'baz'
					}
				],
				$or: [
					{
						qux: 'buz'
					},
					{
						bam: 'fuz'
					}
				],
				$nor: [
					{
						zip: 'foo'
					}
				]
			});
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz'
			})).to.equal(true);
			expect(query1.matches({
				foo: 'bar',
				qux: 'buz'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz',
				qux: 'buz',
				zip: 'foo'
			})).to.equal(false);
			expect(query1.matches({
				foo: 'bar',
				biz: 'baz'
			})).to.equal(false);
			done();
		});

	});

});


