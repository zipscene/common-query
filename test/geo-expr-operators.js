const { expect } = require('chai');
const { createQuery } = require('../lib/index');

describe('Geo-Expression Operators', function() {
	const zipsceneHQ = { type: 'Point', coordinates: [ -84.5099628, 39.1031535 ] }; // 602 Main St 45202

	describe('$near', function() {
		const maxDistance = 10000;
		const query = createQuery({ loc: {
			$near: { $geometry: zipsceneHQ, $maxDistance: maxDistance }
		} });

		it('matches iff a coordinate pair is within $maxDistance of $geometry', function() {
			expect(query.matches({ loc: [ -84.5087746, 39.0972566 ] })).to.be.true;
			expect(query.matches({ loc: [ -84.168767, 39.1413997 ] })).to.be.false;
		});
		it('handles GeoJSON', function() {
			const doc = { loc: { type: 'Point', coordinates: [ -84.5087746, 39.0972566 ] } };
			expect(query.matches(doc)).to.be.true;
		});
		it('sets the distance to the coordinates', function() {
			expect(query.matches({ loc: [ -84.5087746, 39.0972566 ] })).to.be.true;
			expect(query.getMatchProperty('distance')).to.exist;
			expect(query.getMatchProperty('distance')).to.be.below(maxDistance);
		});
		it('sets the distance even if it doesnt match', function() {
			expect(query.matches({ loc: [ -84.168767, 39.1413997 ] })).to.be.false;
			expect(query.getMatchProperty('distance')).to.exist;
			expect(query.getMatchProperty('distance')).to.be.above(maxDistance);
		});
		it('handles arrays like a normal mongo query', function() {
			const doc1 = { loc: [ [ -84.5087746, 39.0972566 ], [ -84.168767, 39.1413997 ] ] };
			const doc2 = { loc: [
				{ type: 'Point', coordinates: [ -84.5087746, 39.0972566 ] },
				{ type: 'Point', coordinates: [ -84.168767, 39.1413997 ] }
			] };
			expect(query.matches(doc1)).to.be.true;
			expect(query.getMatchProperty('distance')).to.be.below(maxDistance);
			expect(query.matches(doc2)).to.be.true;
			expect(query.getMatchProperty('distance')).to.be.below(maxDistance);
		});

		it('normalizes $maxDistance and $minDistance', function() {
			const query = createQuery({
				loc: {
					$near: {
						$geometry: zipsceneHQ,
						$maxDistance: '10000',
						$minDistance: '0'
					}
				}
			});
			expect(query.getData()).to.deep.equal({
				loc: {
					$near: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ]
						},
						$maxDistance: 10000,
						$minDistance: 0
					}
				}
			});
		});

		it('normalizes coordinates', function() {
			const zipsceneHQ = { type: 'Point', coordinates: [ '-84.5099628', '39.1031535' ] }; // 602 Main St 45202
			const query = createQuery({ loc: { $near: { $geometry: zipsceneHQ } } });
			expect(query.getData()).to.deep.equal({
				loc: {
					$near: {
						$geometry: {
							type: 'Point',
							coordinates: [ -84.5099628, 39.1031535 ]
						}
					}
				}
			});
		});
	});

	describe('$geoIntersects', function() {
		const query = createQuery({ poly: { $geoIntersects: { $geometry: zipsceneHQ } } });
		it('$geoIntersects', function() {
			expect(query.matches({ poly: { type: 'Polygon', coordinates: [ [
				[ -84.51316, 39.1052099 ],
				[ -84.5058322, 39.1053431 ],
				[ -84.5101237, 39.1004809 ],
				[ -84.51316, 39.1052099 ]
			] ] } })).to.be.true;
		});
		it('$geoIntersects', function() {
			expect(query.matches({ poly: {
				type: 'Polygon', coordinates: [ [
					[ -85.51316, 39.1052099 ],
					[ -85.5058322, 39.1053431 ],
					[ -85.5101237, 39.1004809 ],
					[ -85.51316, 39.1052099 ]
				] ]
			} })).to.be.false;
		});
	});
});
