import wu from 'wu';

import {Observable} from 'rxjs';

function hybrid(ld, name) {
	return function (...args) {
		if (this instanceof Observable) {
			return this[name](...args);
		} else if (typeof this.next === 'function') {
			return wu(this)[name](...args);
		} else if (this instanceof Set) {
			return new Set([...this]::ld(...args));
		} else {
			return this::ld(...args);
		}
	};
}

import { filter as ld_filter, map as ld_map} from 'lodash-bound';
export const filter = hybrid(ld_filter, 'filter');
export const map    = hybrid(ld_map, 'map');
