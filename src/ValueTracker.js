import {includes, isArray ,set, entries, isFunction, defaults} from 'lodash-bound';

import {isBoolean as _isBoolean} from 'lodash';

import assert from 'power-assert';

import {args, humanMsg} from './misc';

import {Observable, Subject, BehaviorSubject} from 'rxjs';

const $$events             = Symbol('$$events');
const $$properties         = Symbol('$$properties');
const $$settableProperties = Symbol('$$settableProperties');
const $$initialize         = Symbol('$$initialize');
const $$takeUntil          = Symbol('$$takeUntil');
const $$filterBy           = Symbol('$$filterBy');
const $$currentValues      = Symbol('$$currentValues');

/**
 * Use this as a subclass (or just mix it in) to provide support for
 * events and observable properties through Kefir.js.
 *
 * @export
 * @class ValueTracker
 */
export class ValueTracker {

	[$$initialize]() {
		if (this[$$events]) { return }
		this[$$events]             = {};
		this[$$properties]         = {};
		this[$$settableProperties] = {};
		this[$$currentValues]      = {};

		/* add the events and properties added with ES7 annotations */
		for (let [key, options] of (this.constructor[$$events] || {})::entries()) {
			this.newEvent(key, options);
		}
		for (let [key, options] of (this.constructor[$$properties] || {})::entries()) {
			this.newProperty(key, options);
		}
	}
	
	constructor() {
		this[$$takeUntil] = Observable.never();
		this[$$filterBy]  = (()=>true);
	}
	
	setValueTrackerOptions({ takeUntil = Observable.never(), filterBy = (()=>true) }) {
		this[$$takeUntil] = takeUntil;
		this[$$filterBy]  = filterBy;
		this[$$initialize]();
	}
	
	/**
	 * Declares a new event stream for this object.
	 *
	 * @public
	 * @method
	 * @param  {String} name - the name of the event, used to trigger or subscribe to it
	 * @return {Subject} - the created event stream
	 */
	newEvent(name, {} = {}) {
		this[$$initialize]();

		/* is the event name already taken? */
		assert(!this[$$events][name],
			`There is already an event '${name}' on this object.`);
		assert(!this[$$properties][name],
			`There is already a property '${name}' on this object.`);
		
		this[$$events][name] = new Subject()
			.takeUntil(this[$$takeUntil])
			.filter(this[$$filterBy] );
		
		return this[$$events][name];
	}

	/**
	 * This method defines a new property on this object.
	 *
	 * @public
	 * @method
	 * @param  {String}                 name                          - the name of the new property
	 * @param  {*}                     [source]                       - the sole source of values for this property
	 * @param  {Boolean}               [readonly=!!source]            - whether the value can be manually set
	 * @param  {Boolean}               [allowSynchronousAccess=true]  - allow property to be accessed synchronously through a field this[name]
	 * @param  {Boolean}               [deriveEventStream=true]       - expose an event-stream based on changes to this property
	 * @param  {Boolean}               [allowCacheInvalidation=false] - allow values to be repeated by invalidating the stream cache
	 * @param  {function(*,*):Boolean} [isEqual]                      - a predicate function by which to test for duplicate values
	 * @param  {function(*):Boolean}   [isValid]                      - a predicate function to validate a given value
	 * @param  {function(*):*}         [transform]                    - a function to transform any input value
	 * @param  {*}                     [initial]                      - the initial value of this property
	 *
	 * @return {Observable} - the property associated with the given name
	 */
	newProperty(name, {
		source                 = null,
		readonly               = !!source,
		allowSynchronousAccess = true, // TODO: change the default to false
		deriveEventStream      = true, // TODO: change the default to false
		allowCacheInvalidation = false,
		isEqual                = (a,b) => (a===b),
		isValid                = ()=>true,
		transform              = v=>v,
		initial
	} = {}) {
		this[$$initialize]();

		/* is the property name already taken? */
		assert(!this[$$events][name],
			`There is already an event '${name}' on this object.`);
		assert(!this[$$properties][name],
			`There is already a property '${name}' on this object.`);
		
		/* are source and readonly / initial in agreement? */
		assert(!source || readonly,
			`The property '${name}' cannot both have a source and not be readonly.`);
		assert(!source || !initial,
			`The property '${name}' cannot have both a source and a custom initial value.`);
		assert(!source || !allowCacheInvalidation,
			`The property '${name}' cannot both have a source and allow cache invalidation.`);

		/* if isValid is an array, check for inclusion */
		if (isValid::isArray()) { isValid = isValid::includes }
		
		let result;
		
		if (source) { /* return an Observable derived from a given source */
			
			if (source instanceof Observable) {
				result = source;
			} else if (source::isArray()) {
				result = this.p(...source);
			} else {
				result = this.p(source);
			}
			
		} else { /* return a BehaviorSubject */
			
			/* if initial is a function, call it to get the initial value */
			if (initial::isFunction()) { initial = this::initial() }
			
			/* define the bus which manages the property */
			result = new BehaviorSubject(initial);
			
		}
		
		/* refinements */
		if (isValid)   { result = result.filter(this::isValid)   }
		if (transform) { result = result.map   (this::transform) }
		result = result.distinctUntilChanged(isEqual && this::isEqual);
		if (allowCacheInvalidation) {
			const invalidCache = Symbol();
			result = result.filter(v => v !== invalidCache);
			result.invalidateCache = () => {
				result.next(invalidCache);
			};
		}
		
		/* store property stream in object */
		this[$$settableProperties][name] = result;
		this[$$properties][name] = (!!source || !readonly) ? result : result.asObservable();
		
		/* keep track of current value */
		if (allowSynchronousAccess) {
			this[$$properties][name].subscribe((v) => {
				this[$$currentValues][name] = v;
			});
		}
		
		/* create event version of the property */
		if (deriveEventStream) {
			this[$$events][name] = (!!source ? result : result.asObservable())
				.skip(1); // skip 'current value' on subscribe
		}
			
		/* return property */
		return result;
	}

	/**
	 * Retrieve an event stream by name. If the name of a property is given, a stream
	 * based on changes to that property is returned.
	 *
	 * @public
	 * @method
	 * @param  {String}  name - the name of the event stream to retrieve
	 * @return {Observable} - the event stream associated with the given name
	 */
	e(name) {
		this[$$initialize]();
		
		let head = name, sep, tail;
		const match = name.match(/^(.+?)(\??\.)(.+)$/);
		if (match) {
			[,head,sep,tail] = match;
			let loose = (sep === '?.');
			return this.p(head).switchMap((obj) => {
				if (!obj) {
					if (loose) { return Observable.of(null) }
					else       { return Observable.never()  }
				}
				assert(obj.p::isFunction(), humanMsg`
					The '${head}' property did not return
					a ValueTracker-based object,
					so it cannot be chained.
				`); // TODO: allow simple property chaining (even if not observables)
				return obj.e(tail);
			});
		} else {
			// assert(this[$$events][name], humanMsg`No event '${name}' exists.`);
			return this[$$events][name] || Observable.never();
		}
	}
	
	hasProperty(name) {
		return !!this[$$properties] && !!this[$$properties][name];
	}
	
	/**
	 * Retrieve a property (or multiple properties combined) by name.
	 *
	 * @public
	 * @method
	 * @param  {String?}   name                - the name of the property to retrieve (choose name or deps)
	 * @param  {Array?}    deps                - a list of active dependencies for a derived property
	 * @param  {Array?}    optionalPassiveDeps - an optional list of passive dependencies for a derived property
	 * @param  {Function?} optionalTransformer - an optional function to map the dependencies to a new value for the derived property
	 * @return {BehaviorSubject | Observable}  - the property associated with the given name or an observable of combined properties
	 */
	@args('s?a?a?f?') p(name, deps, optionalPassiveDeps = [], optionalTransformer = (...a)=>a) {
		this[$$initialize]();
		if (deps) {
			return Observable.combineLatest(...deps               .map(::this.p))
				.withLatestFrom(...optionalPassiveDeps.map(::this.p),
				(active, ...passive) => optionalTransformer(...active, ...passive));
		} else if (name) {
			let head = name, sep, tail;
			const match = name.match(/^(.+?)(\??\.)(.+)$/);
			if (match) {
				[,head,sep,tail] = match;
				let loose = (sep === '?.');
				return this.p(head).switchMap((obj) => {
					if (!obj) {
						if (loose) { return Observable.of(null) }
						else       { return Observable.never()  }
					}
					assert(obj.p::isFunction(), humanMsg`
						The '${head}' property did not return
						a ValueTracker-based object,
						so it cannot be chained.
					`); // TODO: allow simple property chaining (even if not observables)
					return obj.p(tail);
				});
			} else {
				assert(this[$$properties][name], humanMsg`No property '${name}' exists.`);
				return this[$$properties][name];
			}
			
			// const [head, ...tail] = name.split('.');
			// if (tail.length > 0) {
			// 	return this.p(head).switchMap((obj) => {
			// 		if (!obj) { return Observable.never() }
			// 		assert(obj.p::isFunction(), humanMsg`
			// 			The '${head}' property did not return
			// 			a ValueTracker-based object,
			// 			so it cannot be chained.
			// 		`);
			// 		return obj.p(tail.join('.'));
			// 	});
			// } else {
			// 	assert(this[$$properties][head], humanMsg`No property '${name}' exists.`);
			// 	return this[$$properties][head];
			// }
		}
	}
	
	/**
	 * Retrieve multiple properties by name in an object, possibly transformed.
	 *
	 * @public
	 * @method
	 * @param  {Object}    activeDeps          - a list of active dependencies for a derived property
	 * @param  {Object?}   optionalPassiveDeps - an optional list of passive dependencies for a derived property
	 * @param  {Function?} optionalTransformer - an optional function to map the dependencies to a new value for the derived property
	 * @return {Observable} - an observable of combined properties
	 */
	pObj(activeDeps, optionalPassiveDeps = [], optionalTransformer = (obj=>obj)) {
		this[$$initialize]();
		const bothList = activeDeps.concat(optionalPassiveDeps);
		return this.p(activeDeps, optionalPassiveDeps, (...vals) => optionalTransformer(Object.assign({}, ...vals.map((v, i)=>({ [bothList[i]]: v })))));
	}
	
	/**
	 * Retrieve a property by name. This returns as a Subject
	 * regardless of 'readonly' option, only to be used by
	 * the 'owner' of the property.
	 *
	 * @public
	 * @method
	 * @param  {String} name     - the name of the property to retrieve
	 * @return {BehaviorSubject} - the property associated with the given name
	 */
	pSubject(name) {
		this[$$initialize]();
		return this[$$settableProperties][name];
	}

}

export default ValueTracker;

export const property = (options = {}) => (target, key) => {
	options::defaults({ allowSynchronousAccess: true });
	target::set(['constructor', $$properties, key], options);
	return {
		...(options.allowSynchronousAccess && { get()      { return this[$$currentValues][key] } }),
		...(!options.readonly              && { set(value) { this.p(key).next(value)           } })
	};
};

export const event = (options = {}) => (target, key) => {
	let match = key.match(/^(\w+)Event$/);
	assert(match, "@event() decorators require a name that ends in 'Event'.");
	let name = match[1];
	target::set(['constructor', $$events, name], options);
	return { get() { return this.e(name) } };
};

export const flag = ({ initial }) => property({ isValid: _isBoolean, initial });
