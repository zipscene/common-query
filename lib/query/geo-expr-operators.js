let ExprOperator = require('./expr-operator');
let Query = require('./query');
let QueryValidationError = require('./query-validation-error');
let ObjectMatchError = require('../object-match-error');
let _ = require('lodash');
let geolib = require('geolib');

// Attempts to normalize the coordinates
function normalizeGeojsonCoords(loc) {
	if (Array.isArray(loc)) {
		if (!_.isNumber(loc[0]) && _.isNumber(+loc[0])) loc[0] = +loc[0];
		if (!_.isNumber(loc[1]) && _.isNumber(+loc[1])) loc[1] = +loc[1];
	}
}

// Validates the argument is a valid loc ([long, lat])
function validateGeojsonCoords(loc) {
	normalizeGeojsonCoords(loc);

	if (
		!Array.isArray(loc) ||
		loc.length !== 2 ||
		!_.isNumber(loc[0]) ||
		!_.isNumber(loc[1])
	) {
		throw new QueryValidationError('Geo point must be in format [longitude, latitude]');
	}
}

// Transform [long, lat] coords into the format accepted by geolib
function geojsonCoordsToGeolib(loc) {
	validateGeojsonCoords(loc);
	return {
		longitude: loc[0],
		latitude: loc[1]
	};
}

// Validates if argument is a valid GeoJSON polygon
function validateGeojsonPolygonCoords(polygon) {
	if (!Array.isArray(polygon) || polygon.length === 0) {
		throw new QueryValidationError('Polygon must be array of components');
	}
	for (let innerPolygon of polygon) {
		if (!Array.isArray(innerPolygon) || innerPolygon.length === 0) {
			throw new QueryValidationError('Inner polygon must be array of points');
		}
		_.forEach(innerPolygon, validateGeojsonCoords);
	}
}

// Ditto transformLoc for polygons. Actually will return an array of polygons;
// the first is the outermost polygon, and the inner ones are holes.
function geojsonPolygonCoordsToGeolib(polygon) {
	validateGeojsonPolygonCoords(polygon);
	return _.map(polygon, innerPolygon => {
		return _.map(innerPolygon, geojsonCoordsToGeolib);
	});
}

// Given the operator value for an operation that takes a point, returns the [long, lat]
function getGeojsonPointCoords(point) {
	let geoObj = point && point.$geometry;
	if (!geoObj) throw new QueryValidationError('Point must have $geometry key');
	if (geoObj.type !== 'Point') throw new QueryValidationError('Type of geo object must be \'Point\'');
	validateGeojsonCoords(geoObj.coordinates);
	return geoObj.coordinates;
}

// Objects may contain either a single coordinates [long, lat] or an array of coordinates
// [ [ long, lat ], [ long, lat] ] .  This tries to detect which it is.  It does not
// completely validate the value, but does perform very limited validation.
function isGeojsonCoordinateArray(value) {
	if (!Array.isArray(value)) {
		// Must be a single GeoJSON-style point ( { type: 'Point', coordinates: [...] } )
		return false;
	} else if (value.length === 0) {
		// Assume it's a zero-length array of coordinates
		return true;
	} else if (Array.isArray(value[0])) {
		// Array of bare coordinates [ [ long, lat ], [ long, lat ] ]
		return true;
	} else if (_.isPlainObject(value[0])) {
		// Array of geojson-style points [ { type: 'Point', coordinates: [...] } ]
		return true;
	} else {
		// single coordinate
		return false;
	}
}

class ExprOperatorNear extends ExprOperator {

	constructor(name) {
		super(name || '$near');
	}

	matches(value, operatorValue, operator, expr, options, query) {
		if (!operatorValue) throw new QueryValidationError('$near must have value');
		let operatorValueCoords = getGeojsonPointCoords(operatorValue);
		let operatorValueGeolibCoords = geojsonCoordsToGeolib(operatorValueCoords);
		let minDistance = 0;
		let maxDistance;
		if (operatorValue.$minDistance !== undefined) {
			if (!_.isNumber(operatorValue.$minDistance)) {
				throw new QueryValidationError('$minDistance must be a number');
			}
			minDistance = operatorValue.$minDistance;
		}
		if (operatorValue.$maxDistance !== undefined) {
			if (!_.isNumber(operatorValue.$maxDistance)) {
				throw new QueryValidationError('$maxDistance must be a number');
			}
			maxDistance = operatorValue.$maxDistance;
		}
		if (isGeojsonCoordinateArray(value)) {
			let doesItMatch = false;
			for (let coords of value) {
				if (this._checkDistance(operatorValueGeolibCoords, coords, minDistance, maxDistance, options, query)) {
					doesItMatch = true;
					// don't break here, because if there's a shorter distance
					// in the array, we want to set that as the match property
				}
			}
			return doesItMatch;
		} else {
			return this._checkDistance(operatorValueGeolibCoords, value, minDistance, maxDistance, options, query);
		}
	}

	_checkDistance(geolibCoords, geojsonCoords, minDistance, maxDistance, options, query) {
		// geojsonCoords can be either [ long, lat ] or { type: 'Point', coordinates: [ long, lat ] }
		if (!Array.isArray(geojsonCoords)) {
			if (geojsonCoords.type !== 'Point') {
				throw new ObjectMatchError('Object field doesn\'t look like a point');
			}
			geojsonCoords = geojsonCoords.coordinates;
		}
		let geolibCoords2;
		try {
			geolibCoords2 = geojsonCoordsToGeolib(geojsonCoords);
		} catch (ex) {
			// This is a mismatch in the object, not an error in the query
			throw new ObjectMatchError(ex.message);
		}
		let distanceMeters = geolib.getDistance(geolibCoords, geolibCoords2);
		let curMinDistance = query.getMatchProperty('distance');
		if (curMinDistance === undefined || distanceMeters < curMinDistance) {
			query.setMatchProperty('distance', distanceMeters);
		}
		if (minDistance !== undefined && distanceMeters < minDistance) {
			return false;
		}
		if (maxDistance !== undefined && distanceMeters > maxDistance) {
			return false;
		}
		return true;
	}

	normalize(operatorValue, field, operator, expr, options, query, parent, parentKey) {
		// Normalize numeric strings into numbers
		if (_.isObject(operatorValue)) {
			let min = +operatorValue.$minDistance;
			if (!_.isNaN(min)) {
				operatorValue.$minDistance = min;
			}

			let max = +operatorValue.$maxDistance;
			if (!_.isNaN(max)) {
				operatorValue.$maxDistance = max;
			}
		}

		// Ensure the field is a geopoint field
		if (options.schema) {
			let subschemaData, fullPath;
			try {
				let queryPathOptions = { allowUnknownFields: options.allowUnknownFields };
				[ subschemaData, fullPath ] = Query.getQueryPathSubschema(options.schema, field, queryPathOptions);
			} catch (ex) {
				throw new QueryValidationError('Invalid query at field ' + field, { field }, ex);
			}
			if (subschemaData && subschemaData.type === 'array') {
				subschemaData = subschemaData.elements;
			}
			let subschema = options.schema._createSubschema(subschemaData);
			if (subschema.getData().type !== 'geopoint') {
				throw new QueryValidationError('$near can only be used on a geopoint type', { field });
			}
		}

		this.validate(operatorValue, operator, expr, query);
	}

	validate(operatorValue) {
		if (!operatorValue) throw new QueryValidationError('$near must have value');
		let operatorValueCoords = getGeojsonPointCoords(operatorValue);
		geojsonCoordsToGeolib(operatorValueCoords);
		if (operatorValue.$minDistance !== undefined) {
			if (!_.isNumber(operatorValue.$minDistance) || _.isNaN(operatorValue.$maxDistance)) {
				throw new QueryValidationError('$minDistance must be a number');
			}
		}
		if (operatorValue.$maxDistance !== undefined) {
			if (!_.isNumber(operatorValue.$maxDistance) || _.isNaN(operatorValue.$maxDistance)) {
				throw new QueryValidationError('$maxDistance must be a number');
			}
		}
	}

}
exports.ExprOperatorNear = ExprOperatorNear;


class ExprOperatorIntersects extends ExprOperator {

	constructor(name) {
		super(name || '$geoIntersects');
	}

	matchesValue(value, operatorValue) {
		let operatorValueCoords = getGeojsonPointCoords(operatorValue);
		let operatorValueGeolibCoords = geojsonCoordsToGeolib(operatorValueCoords);
		if (!_.isPlainObject(value) || value.type !== 'Polygon' || !Array.isArray(value.coordinates)) {
			throw new ObjectMatchError('Tried to do a $geoIntersects match against a non-polygon');
		}
		let geolibPolygons;
		try {
			geolibPolygons = geojsonPolygonCoordsToGeolib(value.coordinates);
		} catch (ex) {
			throw new ObjectMatchError('Tried to do a $geoIntersects match against a non-polygon: ' + ex.message);
		}
		let outerPolygon = geolibPolygons[0];
		let innerPolygons = geolibPolygons.slice(1);
		// First check to see if it is inside the first polygon, then outside all the other ones (the holes)
		try {
			if (!geolib.isPointInside(operatorValueGeolibCoords, outerPolygon)) return false;
			for (let hole of innerPolygons) {
				if (geolib.isPointInside(operatorValueGeolibCoords, hole)) return false;
			}
		} catch (ex) {
			throw new ObjectMatchError('Error matching object polygon', ex);
		}
		return true;
	}

	validate(operatorValue) {
		let operatorValueCoords = getGeojsonPointCoords(operatorValue);
		geojsonCoordsToGeolib(operatorValueCoords);
	}

}
exports.ExprOperatorIntersects = ExprOperatorIntersects;

