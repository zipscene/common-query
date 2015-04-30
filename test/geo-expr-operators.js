let { expect } = require('chai');
let { createQuery } = require('../lib/index');

describe('Expression Operators', function() {
	describe('$near', function() {
		it('$near', function() {
			let query1 = createQuery({
				loc: {
					$near: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ] // 602 Main St 45202
						},
						$maxDistance: 10000
					}
				}
			});
			expect(query1.matches({
				loc: [ -84.5087746, 39.0972566 ]
			})).to.equal(true);
			expect(query1.getMatchProperty('distance')).to.be.above(500);
			expect(query1.getMatchProperty('distance')).to.be.below(800);
			expect(query1.matches({
				loc: [ -84.168767, 39.1413997 ]
			})).to.equal(false);
			expect(query1.getMatchProperty('distance')).to.exist;
			expect(query1.getMatchProperty('distance')).to.be.above(10000);
			expect(query1.matches({
				loc: [ [ -84.5087746, 39.0972566 ], [ -84.168767, 39.1413997 ] ]
			})).to.equal(true);
			expect(query1.getMatchProperty('distance')).to.be.above(500);
			expect(query1.getMatchProperty('distance')).to.be.below(800);
			expect(query1.matches({
				loc: {
					type: 'Point',
					coordinates: [ -84.5087746, 39.0972566 ]
				}
			})).to.equal(true);
			expect(query1.matches({
				loc: [
					{
						type: 'Point',
						coordinates: [ -84.5087746, 39.0972566 ]
					},
					{
						type: 'Point',
						coordinates: [ -84.168767, 39.1413997 ]
					}
				]
			})).to.equal(true);
		});
		it.skip('validates properly', function() {
		});
	});

	describe('$geoIntersects', function() {
		it('$geoIntersects', function() {
			let query1 = createQuery({
				poly: {
					$geoIntersects: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ] // 602 Main St 45202
						}
					}
				}
			});
			expect(query1.matches({
				poly: {
					type: 'Polygon',
					coordinates: [ [
						[ -84.51316, 39.1052099 ],
						[ -84.5058322, 39.1053431 ],
						[ -84.5101237, 39.1004809 ],
						[ -84.51316, 39.1052099 ]
					] ]
				}
			})).to.equal(true);
			expect(query1.matches({
				poly: {
					type: 'Polygon',
					coordinates: [ [
						[ -85.51316, 39.1052099 ],
						[ -85.5058322, 39.1053431 ],
						[ -85.5101237, 39.1004809 ],
						[ -85.51316, 39.1052099 ]
					] ]
				}
			})).to.equal(false);
		});
		it.skip('validates properly', function() {
		});
	});
});
