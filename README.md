# zs-common-query

A javascript implementation of the MongoDB-style query and update syntax. It also has some useful methods built on top,
and provides an extensible framework for adding new query and update operators.

## Basic usage

```javascript
let commonQuery = require('zs-common-query');
let createQuery = commonQuery.createQuery;
let createUpdate = commonQuery.createUpdate;

let obj = { foo: 'bar', abc: 3 };

let query = createQuery({
	$and: [ {
		foo: 'bar'
	}, {
		abc: {
			$in: [ 1, 2, 3 ]
		}
	} ]
});
console.log(query.matches(obj));  // true

let update = createUpdate({
	$set: {
		foo: 'baz'
	},
	$inc: {
		abc: 2
	}
});
let newObj = update.apply(obj);
console.log(newObj);  // { foo: 'baz', abc: 5 }
console.log(query.matches(newObj));  // false
```

Note that createQuery(), createUpdate, query.matches(), and query.apply() can all throw errors if the query/update
data object is invalid, or if the query/update is applied to an invalid object.

## Supported operators

The following mongo query operators are supported by default:

- `$and`
- `$or`
- `$nor`
- `$exists`
- `$not`
- `$elemMatch`
- `$in`
- `$nin`
- `$text`
- `$regex`
- `$gt`
- `$gte`
- `$lt`
- `$lte`
- `$ne`

See the MongoDB docs [here](http://docs.mongodb.org/manual/reference/operator/query) for documentation
on these operators.

The following extra operators are included:

- `$wildcard`: A simplified version of `$regex`, supporting glob-like expressions using the operators `*` and `?`.
- `$var`: See the detailed query documentation below. (Not really an operator)

The following mongo update operators are supported by default:

- `$set`
- `$unset`
- `$inc`
- `$mul`
- `$rename`
- `$min`
- `$max`
- `$addToSet`
- `$push`
- `$pop`

See the MongoDB docs [here](http://docs.mongodb.org/manual/reference/operator/update) for documentation
on these operators.

## Query

createQuery() takes an optional options object as the second argument - see the docs directory for
a complete list.

A query with variable parameters can be specified using the 'fake' `$var` operator. Example:

```javascript
let queryData = {
	name: 'Henrietta Wilkinson',
	age: 21,
	favoriteColor: { $var: 'color' }
};
let query = createQuery(queryData, {
	vars: {
		color: 'green'
	}
});
console.log(query.matches({
	age: 21,
	favoriteColor: 'green'
}));  // true
```

During query construction, the `$var` objects are replaced with the value specified by the vars option. Note that
any missing `$var` substitution will result in an invalid query.

The query object also includes some additional functionality:

```javascript
// Get the plain object that represents this query
query.getData();

// Get the query factory used to generate this query (see below)
query.getQueryFactory();

/* Get a generated function to match a query. This may be more efficient than query.matches(), and should
   be used if a query is to be used many times. */
let func = query.createMatchFn();
func(objectToMatch);  // true

/* Normalize a query, optionally to a provided schema. Validates the query as well.
   This is done by default in the constructor; pass the skipValidate option to opt out of
   this behavior. */
query.normalize();

query.normalize({
	schema: createSchema({
		foo: String,
		bar: [ { baz: [ { qux: Number } ] } ]
	})
});

/* Ensure that a query is valid; will throw an error if the query is invalid. This is done by default
   in the constructor; pass the skipValidate option to opt out of this behavior. Note that calling
   matches() on an invalid query results in undefined behavior. */
query.validate();  // throws QueryValidationError

// Get a list of fields that a query will access during matching
query.getQueriedFields();  // [ 'field1', 'field2', 'field3' ]

// Get a list of fields that a query matches exactly. These are fields that must match a single scalar value.
// See the code documentation for details.
query.getExactMatches();  // { exactMatches: [ 'field1', 'field2' ], onlyExactMatches: false }

// Get a list of operators used by this query
query.getOperators();  // [ '$and', '$gt', '$regex' ]
```

## Update

createUpdate() takes an optional options object as the second argument. Some options are:

- allowFullReplace: By default, if an update has no operators, it will be automatically wrapped in a `$set`
  operation, and updated only the stated fields. If you set allowFullReplace, this will not occur, and such
  an update will replace the entire object (as is the default MongoDB behavior).

See the docs directory for a complete list.

On top of apply(), the update object also includes some additional functionality:

```javascript
// Get the plain object that represents this update
update.getData();

// Get the update factory used to generate this update (see below)
update.getUpdateFactory();

/* Get a generated function to apply an update. This may be more efficient than update.apply(),
   and should be used if a query is to be used many times. */
let func = update.createUpdateFn();
func(objectToUpdate);  // true

/* Normalize an update, optionally to a provided schema. Validates the update as well.
   This is done by default in the constructor; pass the skipValidate option to opt out of
   this behavior. */
update.normalize();

update.normalize({
	schema: createSchema({
		foo: String,
		bar: [ { baz: [ { qux: Number } ] } ]
	})
});

/* Ensure that an update is valid; will throw an error if the update is invalid. This is done by default
   in the constructor; pass the skipValidate option to opt out of this behavior. Note that calling
   apply() on an invalid update results in undefined behavior. */
update.validate();  // throws UpdateValidationError

// Get a list of fields that will be updated
update.getUpdatedFields();  // [ 'field1', 'field2', 'field3' ]

// Get a list of operators used by this update
update.getOperators();  // [ '$set', '$inc', '$addToSet' ]

// Whether or not the field contains update operators
update.hasOperators();  // true

// Whether the update has no operators, and will thus be a full object replacement
// (this is the inverse of update.hasOperators())
update.isFullReplace();  // false
```

In addition to the instance methods, there are also some notable static methods on the `Update` class.

```javascript
// Create an update from the recursive diff of two objects
// See the method's documentation for accepted options
Update.createFromDiff({
	foo: 'bar',
	baz: true,
	plork: [ { asdf: true }, { aoeu: true } ]
}, {
	foo: 'boar',
	boom: 4,
	plork: [ { aoeu: true, asdf: false } ]
});

// Results in:
{
        "$set": {
                "foo": "boar",
                "boom": 4,
                "plork.0.aoeu": true,
                "plork.0.asdf": false
        },
        "$unset": {
                "baz": true,
                "plork.1": true
        },
        "$push": {
                "plork": {
                        "$slice": 1
                }
        }
}
```

## Query and update factories

Each query and update is created from an QueryFactory or UpdateFactory, respectively. The createQuery() and
createUpdate() functions are shorthand for getting these entities from a default factory. A more complete,
equivalent way to create a query or update would be:

```javascript
let queryFactory = new commonQuery.QueryFactory();
let query = queryFactory.createQuery(/* queryData */, /* options */);

let updateFactory = new commonQuery.UpdateFactory();
let update = updateFactory.createUpdate(/* updateData */, /* options */);
```

Each factory will load the default set of operators when it is instantiated. Additional custom operators can be
added by subclassing QueryOperator or ExprOperator for queries, or UpdateOperator for updates, and registering them
to the query factory. An example follows:

```javascript
class HorseUpdateOperator extends commonQuery.ExprOperator {

	constructor(name) {
		super(name || '$horse');
	}

	matchesValue(value) {
		return ([ 'horse', 'foal', 'colt', 'pony' ].indexOf(value) !== -1);
	}

}

let queryFactory = new commonQuery.QueryFactory();
queryFactory.registerExprOperator('$horse', new HorseUpdateOperator());

let query = queryFactory.createQuery({
	name: {
		$in: [ 'Shirley', 'Emma', 'Carly Rae Jepsen' ]
	},
	favoriteAnimal: {
		$horse: true
	}
});
console.log(query.matches({
	name: 'Emma',
	favoriteAnimal: 'pony'
}));  // true
```

See the docs directory for full documentation on creating and registering custom operators.
