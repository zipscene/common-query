let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;

describe('Update validate()', function() {

	function expectInvalid(updateData) {
		let invalidFlag = false;
		try {
			createUpdate(updateData);
		} catch (ex) {
			invalidFlag = true;
		}
		if (!invalidFlag) {
			throw new Error('Expected query to be invalid');
		}
	}

	it('complex update validates correctly', function(done) {
		let updateData = {
			$set: {
				bob: 1,
				alice: 2,
				alexander: {
					three: 3,
					four: 4
				}
			},
			$unset: {
				rachel: true
			},
			$inc: {
				frank: -1,
				forrest: 777
			},
			$mul: {
				thomas: -8
			},
			$rename: {
				'evan.kappa': 'evan.frankerz'
			},
			$min: {
				apples: 12341234
			},
			$addToSet: {
				peopleArr: { name: 'Doug', favoriteColor: 'periwinkle' }
			},
			$push: {
				foodArr: {
					$each: [ 'rice', 'cookies', 'pancakes' ]
				}
			},
			$pop: {
				balloon: 1
			}
		};
		createUpdate(updateData);  // Will validate in constructor
		done();
	});

	it('can call validate() explicitly', function(done) {
		let updateData = {
			$set: {
				a: 1
			},
			$unset: {
				b: true
			}
		};
		let update = createUpdate(updateData);
		expect(update.validate()).to.equal(true);
		done();
	});

	it('mixed properties and operators', function(done) {
		let updateData = {
			$set: {
				a: 1
			},
			$unset: {
				b: 2
			},
			c: 3
		};
		expectInvalid(updateData);
		done();
	});

});