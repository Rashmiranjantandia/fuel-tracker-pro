/**
 * Formatting utilities for Fuel Tracker Pro
 * These functions format numbers and values for display only
 * They do NOT modify backend calculations or data
 */

/**
 * Format liters to 1 decimal place
 * @param liters - The number of liters
 * @returns Formatted string e.g., "45.6"
 */
export function formatLiters(liters: number): string {
	return liters.toFixed(1);
}

/**
 * Format price per liter to 1 decimal place
 * @param price - The price per liter
 * @returns Formatted string e.g., "103.4"
 */
export function formatPricePerLiter(price: number): string {
	return price.toFixed(1);
}

/**
 * Format total cost with Indian number format
 * @param cost - The total cost
 * @returns Formatted string with ₹ and commas e.g., "₹4,715"
 */
export function formatTotalCost(cost: number): string {
	const rounded = Math.round(cost);
	const formatted = new Intl.NumberFormat('en-IN').format(rounded);
	return `₹${formatted}`;
}

/**
 * Convert L/100km to km/L
 * @param l100km - Fuel consumption in L/100km
 * @returns Fuel efficiency in km/L e.g., "14.4"
 */
export function kmPerLiter(l100km: number): string {
	if (l100km === 0 || !l100km) return '0';
	return (100 / l100km).toFixed(1);
}

/**
 * Format efficiency for secondary display
 * @param l100km - Fuel consumption in L/100km
 * @returns Formatted string e.g., "6.93"
 */
export function formatEfficiency(l100km: number): string {
	return l100km.toFixed(1);
}

/**
 * Format distance with comma separator (Indian format)
 * @param distance - Distance in kilometers
 * @returns Formatted string e.g., "66,770"
 */
export function formatDistance(distance: number): string {
	return distance.toLocaleString(undefined);
}
