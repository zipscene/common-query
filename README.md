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
- `$all`
- `$size`
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

## Aggregates

Unimodel aggregates are specified in a common format that has no analog (that I know of)
in existing systems.  The best way to understand them is by example.  Examples in this
section use documents representing pets at animal shelters:

```js
{
	animalType: 'dog',
	animalSubtype: 'Yorkshire Terrier',
	age: 4,
	weight: 14.2,
	shelterLocation: 'Clifton',
	dateFound: '2013-03-20T04:13:23Z',
	name: 'Ruff'
}
```

### Collection-Wide Statistics

This aggregate type returns statistics on a field across a whole collection (or a subset
matched by a query).

```js
{
	// Perform statistics on a field
	stats: {
		age: {
			count: true,
			avg: true,
			max: true
		}
	},
	// Return the total number of documents the aggregate is executed across
	total: true
}
```

A result set for this aggregate would look something like:

```js
{
	// There are 400 animals matched by the query
	total: 400,
	stats: {
		age: {
			// Of those, 329 have non-null 'age' fields
			count: 329,
			// The average age of animals in 5.2382
			avg: 5.2382,
			// The maximum age of animals is 19.2
			max: 19.2
		}
	}
}
```

The different types of stats you can ask for are:

- count - The number of documents that contain a non-null value for the field.
- avg - The average value of the field.
- min - The minimum value of the field.
- max - The maximum value of the field.
- sum - The sum of values of the field.
- stddev - The standard deviation of values of the field.

Not all model types need support all of these types of stats, and model types may add
additional stats if they are supported.

The stats object is a mapping between field paths and the statistics to perform.
You can also supply more than one stats field in the aggregate:

```js
{
	stats: {
		age: {
			max: true
		},
		dateFound: {
			min: true
		}
	}
}
```

Results might look like this:

```js
{
	stats: {
		age: {
			max: 19.2
		},
		dateFound: {
			min: '2015-04-12T07:22:09Z'
		}
	}
}
```

For convenience, `stats` can be a single string.  In this case, the string is treated as
a field name, and the `count` stat is executed on it:

```js
{
	stats: 'animalType'
}
```

is converted to:

```js
{
	stats: {
		animalType: {
			count: true
		}
	}
}
```

### Group by Discrete Values of Field

This type of aggregate will return statistics grouped by discrete values of a field.

```js
{
	// The field to group by is 'animalType'
	groupBy: [ {
		field: 'animalType'
	} ],
	// Perform statistics within each group on the 'age' field
	stats: {
		age: {
			avg: true
		}
	},
	// Return the total number of documents in each group
	total: true
}
```

Results look like:

```js
[
	{
		// The value of the groupBy field (see below for why this is an array)
		key: [ 'cat' ],
		// Requested statistics for this grouping
		stats: {
			age: {
				// Average age of cats
				avg: 7.2
			}
		},
		// There are 18 cats in the database (note that this is outside the field stats blocks)
		total: 18
	},
	{
		key: [ 'dog' ],
		stats: {
			age: {
				avg: 6.4
			}
		},
		total: 12
	},
	{
		key: [ 'bird' ],
		stats: {
			age: {
				avg: 2.1
			}
		},
		total: 4
	}
]
```

As a shorthand, you can specify the `groupBy` field as a single object:

```js
{
	groupBy: {
		field: 'animalType'
	}
}
```

or as a string:

```js
{
	groupBy: 'animalType'
}
```

Both shorthand forms are converted to:

```js
{
	groupBy: [ {
		field: 'animalType'
	} ]
}
```

You can also leave off `stats` to get only totals:

```js
{
	groupBy: [ { field: 'animalType' } ],
	total: true
}
```

May yield:

```js
[
	{
		key: [ 'cat' ],
		total: 18
	},
	{
		key: [ 'dog' ],
		total: 12
	},
	{
		key: [ 'bird' ],
		total: 4
	}
]
```

#### Arrays

If the `groupBy` `field` is an array, each of the array's elements is treated as a separate
entry.  This means that, in this case, the counts and totals in the aggregate result won't
equal the total number of documents (documents can be counted multiple times if the array
has multiple elements).


### Group by Ranges of a Field Value

This will group by ranges of a numeric or date field.

```js
{
	groupBy: [ {
		// Numeric/date field to group by
		field: 'age',
		ranges: [
			// First group (group 0) is animals less than 1 year old
			{ end: 1 },
			// Second group (group 1) is animals 1-3 years old
			{ start: 1, end: 3 },
			// Third group (group 2) is animals 3-9 years old
			{ start: 3, end: 9 },
			// Fourth group (group 3) is animals more than 9 years old
			{ start: 9 }
		]
	} ],
	// Give total matching for each group
	// Note that you can also supply stats here as well
	total: true
}
```

Results look like this:

```js
[
	{
		// This is the entry for group number 0
		// These indices correspond to the indices in the given ranges array
		key: [ 0 ],
		// There are 5 animals in this range (less than 1 year old)
		total: 5
	},
	{
		key: [ 1 ],
		total: 8
	},
	{
		key: [ 2 ],
		total: 14
	},
	{
		key [ 3 ],
		total: 7
	}
]
```

These ranges can also be dates if applied to a date field:

```js
{
	groupBy: [ {
		field: 'dateFound',
		ranges: [
			{ end: '2010-01-01T00:00:00Z' },
			{ start: '2010-01-01T00:00:00Z', end: '2013-01-01T00:00:00Z' },
			{ start: '2013-01-01T00:00:00Z' }
		]
	} ],
	total: true
}
```

For convenience, a continuous series of non-overlapping ranges can be specified as:

```js
{
	groupBy: [ {
		field: 'age',
		ranges: [ 1, 3, 9 ]
	} ],
	total: true
}
```

Will be converted to:

```js
{
	groupBy: [ {
		field: 'age',
		ranges: [
			{ end: 1 },
			{ start: 1, end: 3 },
			{ start: 3, end: 9 },
			{ start: 9 }
		]
	} ],
	total: true
}
```

The output of this is:

```js
[
	{
		// This key corresponds to the range ENDING at index 0 (ie, all animals less than 1 year old)
		key: [ 0 ],
		// There are 5 animals in this range (less than 1 year old)
		total: 5
	},
	{
		// Range from 1-3 years
		key: [ 1 ],
		total: 8
	},
	{
		// Range from 3-9 years
		key: [ 2 ],
		total: 14
	},
	{
		// One more result entry than entries in the array
		// This is for animals more than 9 years old
		key [ 3 ],
		total: 7
	}
]
```

Strings found in start/end properties will also attempt to be parsed into number/date values.
For example:

```js
{
	groupBy: [ {
		field: 'age',
		ranges: [ '3', 5 ]
	} ],
	total: true
}
```

will be converted to:

```js
{
	groupBy: [ {
		field: 'age',
		ranges: [
			{ end: 3 },
			{ start: 3, end: 5 },
			{ start: 5 }
		]
	} ],
	total: true
}
```

and:

```js
{
	groupBy: [ {
		field: 'dateFound',
		ranges: [ '2015-01-01T05:00:00.000Z', new Date(2015, 1, 1, 0, 0, 0) ]
	} ],
	total: true
}
```

will be converted to:

```js
{
	groupBy: [ {
		field: 'age',
		ranges: [
			{ end: new Date('2015-01-01T00:00:00.000Z') },
			{ start: new Date('2015-01-01T00:00:00.000Z'), end: new Date('2015-02-01T00:00:00.000Z') },
			{ start: new Date('2015-02-01T00:00:00.000Z') }
		]
	} ],
	total: true
}
```

### Group by Fixed Sized Intervals

This will group continuous values across fixed intervals.

```js
{
	groupBy: [ {
		// Segment the numeric field 'age'
		field: 'age',
		// Each interval is of length 3
		interval: 3,
		// By default, intervals start at 0 (ie, -3, 0, 3, 6, 9, etc)
		// This supplies a different offset
		// When set to 1, the intervals become -2, 1, 4, 7, etc
		base: 1
	} ],
	total: true
}
```

Results look like this:

```js
[
	{
		// The key here is the start value of the interval
		// Ie, this entry is for the interval -2 through 1
		key: [ -2 ],
		total: 5
	},
	{
		// This is for the interval 1 through 4
		key: [ 1 ],
		total: 4
	},
	{
		key: [ 4 ],
		total: 8
	},
	...
]
```

These can also be applied to dates.  In this case, the interval should be supplied as an
ISO 8601 time Duration.  For example, an interval of 'P3H15M' is an interval of 15 minutes.

```js
{
	groupBy: [ {
		field: 'dateFound',
		interval: 'P8H',
		// The default base when using time intervals is not defined.
		// Override bases are specified as an ISO8601 timestamp.
		base: '2010-01-01T00:00:00Z'
	} ],
	total: true
}
```

Results in:

```js
[
	{
		// Result keys are ISO timestamps
		key: [ '2010-01-01T00:00:00Z' ],
		total: 2
	},
	{
		key: [ '2010-01-01T08:00:00Z' ],
		total: 1
	},
	...
]
```

As a convenience, you string values from base and interval will be converted to proper number/date values.
For instance:

```js
{
	groupBy: [ {
		field: 'age',
		interval: '3',
		base: '1'
	} ],
	total: true
}
```

will be converted to:

```js
{
	groupBy: [ {
		field: 'age',
		interval: 3,
		base: 1
	} ],
	total: true
}
```

### Group by Time Components

Usually, when you want to group by (for example) month, you don't actually want to use a time
interval of 30 days because these won't align with month boundaries.  This grouping type allows
you to group by time components.

```js
{
	groupBy: [ {
		// Field to group by
		field: 'dateFound',
		// Time component to group into
		timeComponent: 'year',
		// The number of time components in each group (optional)
		timeComponentCount: 1
	} ],
	total: true
}
```

The output looks like:

```js
[
	{
		key: [ '2012-01-01T00:00:00Z' ],
		total: 4
	},
	{
		key: [ '2013-01-01T00:00:00Z' ],
		total: 7
	},
	{
		key: [ '2014-01-01T00:00:00Z' ],
		total: 5
	},
	...
]
```

Each of the result keys is an ISO8601 timestamp corresponding to the start of the range
represented by that time component.

The `timeComponent` field can be one of the following:

- `year`
- `month`
- `week`
- `day`
- `hour`
- `minute`
- `second`

The `timeComponentCount` field is optional, and can be used to create longer intervals.

```js
{
	type: 'group',
	groupBy: [ {
		field: 'dateFound',
		timeComponent: 'day',
		timeComponentCount: 2
	} ],
	total: true
}
```

Can result in:

```js
[
	{
		key: [ '2012-01-01T00:00:00Z' ],
		total: 1
	},
	{
		key: [ '2012-01-03T00:00:00Z' ],
		total: 2
	},
	{
		key: [ '2012-01-05T00:00:00Z' ],
		total: 2
	},
	...
]
```

Note that this does NOT represent a duration.  The last interval in the range of a time
component may be cut short (for example, in months with 31 days, the last interval in
the above example would be only a single day instead of 2 days).

The "base" value for a time component is always the first valid point in time for that component.
For `year`, the base point in time used is year 1.

### Grouping By Multiple Fields

The `groupBy` parameter in it's most verbose form is an array of goruping specifiers.
When multiple specifiers are present, a powerset of the results will be producsed.
For example:

```js
{
	groupBy: [
		{
			field: 'animalType'
		},
		{
			field: 'age',
			interval: 4
		}
	],
	total: true
}
```

This groups by age (in intervals of 4) and animalType.  The results for this look like:

```js
[
	{
		key: [ 'dog', 0 ],
		total: 2
	},
	{
		key: [ 'dog', 4 ],
		total: 3
	},
	{
		key: [ 'dog', 8 ],
		total: 2
	},
	{
		key: [ 'cat', 0 ],
		total: 5
	},
	{
		key: [ 'cat', 4 ],
		total: 3
	},
	...
]
```

### Restrict aggregation buckets to a subset of keys

You may specify a whitelist of keys to include in the result for each groupBy entry:

```js
{
	groupBy: {
		field: 'animalType',
		only: [ 'cat', 'dog' ]
	},
	total: true
}
```

May yield:

```js
[
	{
		key: [ 'cat' ],
		total: 18
	},
	{
		key: [ 'dog' ],
		total: 12
	}
]
```
