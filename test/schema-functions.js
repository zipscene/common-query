let expect = require('chai').expect;
//let createQuery = require('../lib/index').createQuery;
let Query = require('../lib/index').Query;
let createSchema = require('zs-common-schema').createSchema;
let ObjectMatchError = require('../lib/index').ObjectMatchError;

describe('Schema Functions', function() {

	describe('getQueryPathSubschema', function() {

		const schema = createSchema({
			foo: String,
			bar: [ {
				baz: [ {
					qux: Number
				} ]
			} ]
		});

		it('root path', function() {
			expect(Query.getQueryPathSubschema(schema, ''))
				.to.deep.equal([ schema.getData(), '' ]);
			expect(Query.getQueryPathSubschema(schema, 'foo'))
				.to.deep.equal([ schema.getData().properties.foo, 'foo' ]);
		});

		it('basic path', function() {
			expect(Query.getQueryPathSubschema(schema, 'foo'))
				.to.deep.equal([ schema.getData().properties.foo, 'foo' ]);
		});

		it('basic explicit array index', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.4'))
				.to.deep.equal([ schema.getData().properties.bar.elements, 'bar.4' ]);
		});

		it('basic implicit array index', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.baz'))
				.to.deep.equal([ schema.getData().properties.bar.elements.properties.baz, 'bar.$.baz' ]);
		});

		it('mixed array indices', function() {
			expect(Query.getQueryPathSubschema(schema, 'bar.8.baz.qux'))
				.to.deep.equal([
					{ type: 'number' },
					'bar.8.baz.$.qux'
				]);
		});

		it('invalid schema path', function() {
			expect( () => Query.getQueryPathSubschema(schema, 'bar.boop') )
				.to.throw(ObjectMatchError);
		});

	});

});
