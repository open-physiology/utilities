/**
 * Predicate function to filter events by which key modifiers are not pressed.
 */
export const withoutMod = (...modifiers) => (event) =>
	modifiers.every(m => !event[`${m}Key`]);

/**
 * Predicate function to filter events by which key modifiers are pressed.
 */
export const withMod = (...modifiers) => (event) =>
	modifiers.every(m => event[`${m}Key`]);

/**
 * Predicate function to filter events by the key-code of the key that was pressed.
 */
export const withKeyCode = (keyCode) => (event) =>
	event.which === keyCode;

export function which(keyCode) {
	return this.filter(withKeyCode(keyCode));
}

export function stopPropagation(event) {
	if (!event) { event = this } // allow :: binding or using first argument
	event.preventDefault();
	event.stopPropagation();
}
