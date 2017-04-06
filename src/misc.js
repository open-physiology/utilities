////////////////////////////////////////////////////////////////////////////////
// Schema Data Types                                                          //
////////////////////////////////////////////////////////////////////////////////

import {
	isUndefined,
	trim,
	isString,
	isArray,
	isNumber,
	isFunction,
	isSet,
	isWeakSet,
	entries
} from 'lodash-bound';

import rearg from 'rearg';

import {defineProperty} from 'bound-native-methods';

// TODO: make sure we don't need to import this anymore: filter;

import _zip from 'lodash/zip';

import assert from 'power-assert';


////////////////////////////////////////////////////////////////////////////////

export const arrayContainsValue = (array, value) => array.includes(value);

export const simpleSpaced = (str) => {
	return str.replace(/\s+/mg, ' ');
};

export const humanMsg = (strings, ...vals) => {
	let result = strings[0];
	for (let [val, str] of _zip(vals, strings.slice(1))) {
		result += val + simpleSpaced(str);
	}
	return result::trim();
};

export function mapOptionalArray(val, fn) {
	if (val::isUndefined()) { return [] }
	let isArr = val::isArray();
	val = (isArr ? val : [val]).map(fn);
	return isArr ? val : val[0];
}

export function wrapInArray(val) {
	if (val::isUndefined()) { return [] }
	if (val::isArray() || val::isSet() || val::isWeakSet()) { return [...val] }
	return [val];
}

export function normalizeToRange(val) {
	if (val.class === 'Number') { val = {min: val.value, max: val.value} }
	if (!val.min::isNumber())   { val.min = -Infinity }
	if (!val.max::isNumber())   { val.max =  Infinity }
	return { min: val.min, max: val.max };
}

export function setDefault(obj, key, val) {
	if (obj[key]::isUndefined()) {
		obj[key] = val;
	}
}

export const match = (val, {autoInvoke = true} = {}) => (map) => {
	let result = ( (val in map) ? map[val] : map.default );
	if (autoInvoke && result::isFunction()) { result = result() }
	return result;
};

export const sw = match; // backwards compatibility

export function definePropertyByValue(key, value, options = {}) {
	this::defineProperty(key, { ...options, value });
}

export function definePropertiesByValue(obj, options = {}) {
	for (let [key, value] of obj::entries()) {
		this::definePropertyByValue(key, value, options);
	}
}

export function callOrReturn(context) {
	return this::isFunction() ? context::this() : this;
}

// n - number
// s - string
// b - boolean
// f - function
// O - any Object
// a - Array
// d - Date
// r - RegExp
// o - other Object (object which isn't Array, Date or RegExp)
export const args = (...pattern) => (target, key, descriptor) => {
	return {
		...descriptor,
		value: rearg.expand(...pattern, descriptor.value)
	};
};

export const withoutMod = (...modifiers) => (event) =>
	modifiers.every(m => !event[`${m}Key`]);

export const withMod = (...modifiers) => (event) =>
	modifiers.every(m => event[`${m}Key`]);

export function stopPropagation(event) {
	if (!event) { event = this } // allow :: binding or using first argument
	event.preventDefault();
	event.stopPropagation();
}

export function which(keyCode) {
	return this.filter(event => event.which === keyCode);
}

export function repeat(count, str) {
	if (!str) { str = this } // allow :: binding
	let result = '';
	for (let i = 0; i < count; ++i) { result += str }
	return result;
}
