let ExprOperator = require('./expr-operator');
let QueryValidationError = require('./query-validation-error');
let _ = require('lodash');
let objtools = require('zs-objtools');
let geolib = require('geolib');

// Validates the argument is a valid loc ([long, lat])
function validateGeojsonCoords(loc) {
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
function validateGeojsonPolygon(polygon) {
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
function geojsonPolygonToGeolib(polygon) {
	validateGeojsonPolygon(polygon);
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
	if (!Array.isArray(value)) throw new QueryValidationError('Coordinates must be array');
	if (value.length === 0) {
		// Assume it's a zero-length array of coordinates
		return true;
	} else if (Array.isArray(value[0])) {
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

	matches(value, operatorValue, operator, expr, query) {
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
				if (this._checkDistance(operatorValueGeolibCoords, coords, minDistance, maxDistance, query)) {
					doesItMatch = true;
					// don't break here, because if there's a shorter distance
					// in the array, we want to set that as the match property
				}
			}
			return doesItMatch;
		} else {
			return this._checkDistance(operatorValueGeolibCoords, value, minDistance, maxDistance, query);
		}
	}

	_checkDistance(geolibCoords, geojsonCoords, minDistance, maxDistance, query) {
		let geolibCoords2 = geojsonCoordsToGeolib(geojsonCoords);
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

}
exports.ExprOperatorNear = ExprOperatorNear;

/*
class ExprOperatorIntersects extends ExprOperator {

	constructor(name) {
		super(name || '$geoIntersects');
	}

	matches(value, operatorValue, operator, expr, query) {
	}

}
exports.ExprOperatorIntersects = ExprOperatorIntersects;
*/
