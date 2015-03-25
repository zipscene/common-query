let expect = require('chai').expect;
let createUpdate = require('../lib/index').createUpdate;
let UpdateValidationError = require('../lib/update-validation-error');

describe('Update validate()', function() {

	function expectInvalid(updateData) {
		expect(function() { createUpdate(updateData); }).to.throw(UpdateValidationError);
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

	it('invalid operator', function(done) {
		expectInvalid({
			$set: {
				a: 'b'
			},
			$ultraset: {
				c: 'd'
			}
		});
		done();
	});

	it('$set, $unset', function(done) {
		expectInvalid({
			$set: 123
		});
		expectInvalid({
			$unset: '321'
		});
		done();
	});

	it('$inc, $mul', function(done) {
		expectInvalid({
			$inc: '123aa'
		});
		expectInvalid({
			$mul: {
				value: '1234aaa'
			}
		});
		done();
	});

	it('$rename', function(done) {
		expectInvalid({
			$rename: {
				oldName: {
					new: 'name'
				}
			}
		});
		done();
	});

	it('$min, $max', function(done) {
		expectInvalid({
			$min: 123
		});
		expectInvalid({
			$max: {
				value: '1234aaa'
			}
		});
		done();
	});

	it('$addToSet', function(done) {
		expectInvalid({
			$addToSet: 'doggy'
		});
		expectInvalid({
			$addToSet: {
				theseones: {
					$each: {
						'thisone': 'yes',
						'thatone': 'yes'
					}
				}
			}
		});
		done();
	});

	it('$push, $pop', function(done) {
		expectInvalid({
			$push: 'this thing'
		});
		expectInvalid({
			$pop: 'this thing as well'
		});
		expectInvalid({
			$pop: {
				'a.cool.array': 0
			}
		});
		done();
	});

});
