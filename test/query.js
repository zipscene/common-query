let expect = require('chai').expect;
let createQuery = require('../lib/index').createQuery;
let createSchema = require('zs-common-schema').createSchema;
let Query = require('../lib/index').Query;
let ObjectMatchError = require('../lib/index').ObjectMatchError;
let QueryValidationError = require('../lib/query-validation-error');

describe('Query', function() {
	describe('constructor', function() {
		it('skips validation with the skipValidate option', function() {
			const queryData = { 'really': 'invalid', '$super': 'invalid' };
			const options = { skipValidate: true };
			expect(() => createQuery(queryData)).to.throw(QueryValidationError);
			expect(() => createQuery(queryData, options)).to.not.throw(Error);
		});
		it('substitutes $vars with the vars option', function() {
			const options = { vars: { var1: 'zip1', var2: 'baz2', var3: 3 } };
			const query = createQuery({
				foo: 'bar',
				$and: [
					{ zip: { $var: 'var1' } },
					{ $elemMatch: { zap: 'buz', baz: { $var: 'var2' } } },
					{ $in: [ 1, 2, { $var: 'var3' } ] }
				]
			}, options);
			const expected = {
				foo: 'bar',
				$and: [
					{ zip: 'zip1' },
					{ $elemMatch: { zap: 'buz', baz: 'baz2' } },
					{ $in: [ 1, 2, 3 ] }
				]
			};
			expect(query.getData()).to.deep.equal(expected);
		});
	});

	describe('getQueryPathSubschema()', function() {
		const schema = createSchema({
			foo: String,
			bar: [ { baz: [ { qux: Number } ] } ]
		});
		it('root path', function() {
			let expected = [ schema.getData(), '' ];
			expect(Query.getQueryPathSubschema(schema, '')).to.deep.equal(expected);

			expected = [ schema.getData().properties.foo, 'foo' ];
			expect(Query.getQueryPathSubschema(schema, 'foo')).to.deep.equal(expected);
		});
		it('basic path', function() {
			const expected = [ schema.getData().properties.foo, 'foo' ];
			expect(Query.getQueryPathSubschema(schema, 'foo')).to.deep.equal(expected);
		});
		it('basic explicit array index', function() {
			const expected = [ schema.getData().properties.bar.elements, 'bar.4' ];
			expect(Query.getQueryPathSubschema(schema, 'bar.4')).to.deep.equal(expected);
		});
		it('basic implicit array index', function() {
			const expected = [ schema.getData().properties.bar.elements.properties.baz, 'bar.$.baz' ];
			expect(Query.getQueryPathSubschema(schema, 'bar.baz')).to.deep.equal(expected);
		});
		it('mixed array indices', function() {
			const expected = [ { type: 'number' }, 'bar.8.baz.$.qux' ];
			expect(Query.getQueryPathSubschema(schema, 'bar.8.baz.qux')).to.deep.equal(expected);
		});
		it('invalid schema path', function() {
			const wrapped = () => Query.getQueryPathSubschema(schema, 'bar.boop');
			expect(wrapped).to.throw(ObjectMatchError);
		});
	});

	describe('replaceArrayPlaceholderComponent()', function() {
		it('replaces array wildcards w/ a new string', function() {
			const expected = '0.foo.0.bar.0';
			expect(Query.replaceArrayPlaceholderComponent('$.foo.$.bar.$', '0')).to.equal(expected);
		});
	});

	describe('#getExactMatches()', function() {
		const schema = createSchema({
			foo: String,
			bar: [ { baz: [ { qux: Number } ] } ]
		});
		it('trivial exact matches', function() {
			const query = createQuery({ foo: 'bar', biz: 'baz' });
			const expected = {
				exactMatches: { foo: 'bar', biz: 'baz' },
				onlyExactMatches: true,
				exactFieldMatches: { foo: 'bar', biz: 'baz' },
				onlyExactFieldMatches: true
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('nested exact matches', function() {
			const query = createQuery({
				foo: 'bar',
				biz: 'baz',
				$and: [ { zip: 'zap' }, { $and: [ { qux: 'buz' } ] } ]
			});
			const expected = {
				exactMatches: { foo: 'bar', biz: 'baz', zip: 'zap', qux: 'buz' },
				onlyExactMatches: true,
				exactFieldMatches: { foo: 'bar', biz: 'baz', zip: 'zap', qux: 'buz' },
				onlyExactFieldMatches: true
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('no exact matches', function() {
			const query = createQuery({
				foo: { $ne: 10 },
				$or: [ { bar: 'baz' }, { zip: 'zap' } ]
			});
			const expected = {
				exactMatches: {},
				onlyExactMatches: false,
				exactFieldMatches: {},
				onlyExactFieldMatches: false
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('single-clause or exact match', function() {
			const query = createQuery({ foo: { $ne: 10 }, $or: [ { bar: 'baz' } ] });
			const expected = {
				exactMatches: { bar: 'baz' },
				onlyExactMatches: false,
				exactFieldMatches: { bar: 'baz' },
				onlyExactFieldMatches: false
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('conflicting match', function() {
			const query = createQuery({ foo: 'bar', $and: [ { zip: 'zap' }, { zip: 'buz' } ] });
			const expected = {
				exactMatches: { foo: 'bar' },
				onlyExactMatches: false,
				exactFieldMatches: { foo: 'bar' },
				onlyExactFieldMatches: false
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('can never match', function() {
			const query = createQuery({ foo: 'bar', $or: [] });
			const expected = {
				exactMatches: {},
				onlyExactMatches: false,
				exactFieldMatches: {},
				onlyExactFieldMatches: false
			};
			expect(query.getExactMatches()).to.deep.equal(expected);
		});
		it('takes a zs-common-schema schema', function() {
			const query = createQuery({ 'bar.baz.4.qux': 123, foo: 'biz' });
			const expected = { 'bar.$.baz.4.qux': 123, foo: 'biz' };
			expect(query.getExactMatches({ schema }).exactMatches).to.deep.equal(expected);
			expect(query.getExactMatches({ schema }).onlyExactMatches).to.equal(true);
		});
	});

	describe('#getOperators()', function() {
		it('collects the operators in a query, recursively', function() {
			const query = createQuery({
				foo: 1,
				bar: { $ne: 3 },
				$and: [
					{ zip: { $in: [ 1, 2, 3 ] } },
					{ zap: { $elemMatch: { baz: { $gt: 5 } } } }
				]
			});
			const expected = [ '$ne', '$and', '$in', '$elemMatch', '$gt' ];
			expect(query.getOperators().sort()).to.deep.equal(expected.sort());
		});
	});

	describe('#getQueriedFields()', function() {
		const schema = createSchema({
			foo: String,
			bar: [ { baz: [ { qux: Number } ] } ]
		});
		it('collects dotted paths to fields accessed by a query', function() {
			const query = createQuery({
				foo: 1,
				$and: [ { bar: 1, zip: 1 }, { boz: 1 } ],
				$or: [ { bip: 1 }, { zap: { $not: { $gt: 10 } } } ],
				qux: { $elemMatch: { buz: 1 } },
				fuz: { foo: 1, bar: 1 },
				nan: { $elemMatch: { nan: { $elemMatch: { nan: { $elemMatch: { nan: {
					$elemMatch: { batman: '!' }
				} } } } } } }
			});
			const expected = [
				'foo', 'bar', 'zip', 'boz', 'bip', 'zap', 'fuz', 'qux.$.buz', 'nan.$.nan.$.nan.$.nan.$.batman'
			];
			expect(query.getQueriedFields().sort()).to.deep.equal(expected.sort());
		});
		it('handles dotted paths as query fields', function() {
			const query = createQuery({ foo: 'abc', 'bar.baz.qux': 3 });
			const expected = [ 'foo', 'bar.$.baz.$.qux' ];
			expect(query.getQueriedFields({ schema: schema })).to.deep.equal(expected);
		});
		it('expands implied array indices', function() {
			const query = createQuery({ foo: 'abc', 'bar.baz': { $elemMatch: { qux: 3 } } });
			const expected = [ 'foo', 'bar.$.baz.$.qux' ];
			expect(query.getQueriedFields({ schema: schema })).to.deep.equal(expected);
		});
	});

	describe('#matches()', function() {
		it('basic exact match', function() {
			const query = createQuery({ foo: 'bar', biz: 'baz' });
			expect(query.matches({ foo: 'bar', biz: 'baz', qux: 'buz' })).to.equal(true);
			expect(query.matches({ foo: 'bar' })).to.equal(false);
			expect(query.matches({ foo: 'bar', biz: 'bam', qux: 'buz' })).to.equal(false);
		});
		it('full object exact match', function() {
			const query = createQuery({ foo: { bar: 'biz', baz: 'buz' } });
			expect(query.matches({
				foo: { bar: 'biz', baz: 'buz' },
				zip: 'fuz'
			})).to.equal(true);
			expect(query.matches({
				foo: { bar: 'biz', baz: 'buz', qux: 'bam' },
				zip: 'fuz'
			})).to.equal(false);
		});
		it('exact match to array', function() {
			const query = createQuery({ foo: 'bar' });
			expect(query.matches({ foo: [ 1, 2, 'bar', 3 ] })).to.equal(true);
			expect(query.matches({ foo: [ 1, 2, 3 ] })).to.equal(false);
		});
		it('exact match nested arrays', function() {
			const query = createQuery({ foo: 'bar' });
			expect(query.matches({ foo: [ [ 1, 2, 'bar', 3 ] ] })).to.equal(true);
		});
		it('exact match within array', function() {
			const query = createQuery({ 'a.b.c': 'd' });
			expect(query.matches({ a: [ { b: { e: 'f' } }, { b: { c: 'd' } } ] })).to.equal(true);
			expect(query.matches({ a: [ { b: { e: 'f' } }, { b: { c: 'e' } } ] })).to.equal(false);
		});
		it('exact match within array to specified index', function() {
			const query = createQuery({ 'scott-pilgrim-aliases.1': 'naruto' });
			expect(query.matches({ 'scott-pilgrim-aliases': [ 'captain falcon', 'naruto' ] })).to.equal(true);
			expect(query.matches({ 'scott-pilgrim-aliases': [ 'naruto', 'captain falcon' ] })).to.equal(false);
			expect(query.matches({ 'scott-pilgrim-aliases': [ 'naruto' ] })).to.equal(false);
		});
		it('exact match within array with numeric key', function() {
			const query = createQuery({ 'array.1': 'hello' });
			expect(query.matches({ array: [ 'hi', 'hello' ] })).to.equal(true);
			expect(query.matches({ array: [ { 1: 'hello' }, { 1: 'hi' } ] })).to.equal(true);
		});
		it('exact match to full array', function() {
			const query = createQuery({ foo: [ 1, 2, 3 ] });
			expect(query.matches({ foo: [ 1, 2, 3 ] })).to.equal(true);
			expect(query.matches({ foo: [ 1, 2, 3, 4 ] })).to.equal(false);
		});
		it('ignore match to undefined', function() {
			const query = createQuery({ foo: undefined, bar: 'zip' });
			expect(query.matches({ bar: 'zip', foo: 'bam' })).to.equal(true);
			expect(query.matches({ bar: 'zip' })).to.equal(true);
		});
		it('null matches null or nonexistent', function() {
			const query = createQuery({ foo: 123, bar: null });
			expect(query.matches({ foo: 123, bar: null })).to.equal(true);
			expect(query.matches({ foo: 123, bar: undefined })).to.equal(true);
			expect(query.matches({ foo: 123 })).to.equal(true);
			expect(query.matches({ foo: 123, bar: 123 })).to.equal(false);
		});
		it('case sensitive', function() {
			const query = createQuery({ foo: 'bar' });
			expect(query.matches({ foo: 'Bar' })).to.equal(false);
		});
		it('match primitive with expression opreators', function() {
			const query = createQuery({ $gt: 5, $lt: 10 });
			expect(query.matches(7)).to.equal(true);
			expect(query.matches(2)).to.equal(false);
		});
	});

	describe('#transformQueriedFields()', function() {
		it('shallowly transforms the fields of a query', function() {
			let query = createQuery({ foo: 'bar' });
			const expected = { prefixfoo: 'bar' };
			query.transformQueriedFields((field) => 'prefix' + field );
			expect(query.getData()).to.deep.equal(expected);
		});
		it('transforms the fields of query-operator arguments', function() {
			let query = createQuery({
				foo: 1,
				$and: [ { bar: 1, baz: 1 }, { qux: 1 } ],
				$nor: [ { zip: { $elemMatch: { buz: 1 } } } ]
			});
			const expected = {
				prefixfoo: 1,
				$and: [ { prefixbar: 1, prefixbaz: 1 }, { prefixqux: 1 } ],
				$nor: [ { prefixzip: { $elemMatch: { buz: 1 } } } ]
			};
			query.transformQueriedFields((field) => 'prefix' + field );
			expect(query.getData()).to.deep.equal(expected);
		});
	});

	describe('#validate()', function() {
		it('basic valid query and return value', function() {
			const query = createQuery({ foo: 'bar', biz: 'baz' });
			let validateResult = query.validate();
			expect(validateResult).to.be.true;
		});
	});
});
