// FIX: Add reference to jest-dom types to make matchers like .toBeInTheDocument available to TypeScript
/// <reference types="@testing-library/jest-dom" />

// FIX: Add imports for Vitest globals to resolve TypeScript errors.
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { type RawFuelEntry } from '../domain/types';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App Integration Test', () => {
	let originalFetch: typeof fetch;
	const mockEntries: RawFuelEntry[] = [];
	beforeEach(() => {
		originalFetch = global.fetch;
		// Mock global fetch avant chaque test, avec une réponse vide par défaut
		global.fetch = vi.fn((url, options) => {
			if (!options || options.method === 'GET') {
				// Simule la récupération de la liste
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockEntries),
				} as Response);
			}
			if (options.method === 'POST') {
				// Simule l'ajout d'une entrée
				const newEntry = JSON.parse(options.body as string);
				newEntry.id = Date.now().toString(); // Génère un id fictif
				mockEntries.push(newEntry);
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(newEntry),
				} as Response);
			}
			if (options.method === 'DELETE') {
				// Suppression simulée selon l'id dans l'url
				const idMatch = (url as string).match(/\/([^\/]+)$/); // extrait l'id à la fin de l'url
				if (idMatch) {
					const idToDelete = idMatch[1];
					const index = mockEntries.findIndex((entry) => entry.id === idToDelete);
					if (index !== -1) {
						mockEntries.splice(index, 1);
						return Promise.resolve({ ok: true } as Response);
					} else {
						return Promise.resolve({ ok: false } as Response);
					}
				}
				return Promise.resolve({ ok: false } as Response);
			}

			// Par défaut, fail
			return Promise.resolve({ ok: false } as Response);
		});
	});
	afterEach(() => {
		// Restaure la fonction fetch originale pour éviter les interférences
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});
	test('full user flow: adding entries, seeing stats update, and deleting an entry', async () => {
		const user = userEvent.setup();
		render(<App />);

		// 1. Initial State: Verify the app loads with no data
		expect(screen.getByText(/Fuel Tracker Pro/i)).toBeInTheDocument();
		expect(screen.getByText(/No fill-ups recorded/i)).toBeInTheDocument();

		const statsCards = screen.getAllByTestId('stat-card');

		expect(within(statsCards[0]).getByText('0.00')).toBeInTheDocument(); // Avg Consumption
		expect(within(statsCards[1]).getByText('0.00')).toBeInTheDocument(); // Total Cost
		expect(within(statsCards[2]).getByText('0')).toBeInTheDocument(); // Total Distance

		// 2. Add the first fuel entry
		await user.clear(screen.getByLabelText(/Date/i));
		await user.type(screen.getByLabelText(/Date/i), '2023-01-01');
		await user.type(screen.getByLabelText(/Total Liters/i), '40');
		await user.type(screen.getByLabelText(/Total Price/i), '80');
		await user.type(screen.getByLabelText(/Total Mileage/i), '10000');
		await user.click(screen.getByRole('button', { name: /Record Fill-up/i }));

		// 3. Verify the first entry is in the history and stats are updated
		await waitFor(() => {
			// Wait for the "No fill-ups recorded" message to disappear, confirming UI update.
			expect(screen.queryByText(/No fill-ups recorded/i)).not.toBeInTheDocument();
		});
		const historyList = screen.getByRole('list', { name: /history-list/i });
		await waitFor(() => {
			expect(within(historyList).getByText(/January 1, 2023/i)).toBeInTheDocument();
			expect(within(historyList).getByText(/10,000/i)).toBeInTheDocument();
		});

		// Stats update (only total cost changes with one entry)
		expect(within(statsCards[1]).getByText('80.00')).toBeInTheDocument(); // 80.00

		// 4. Add the second fuel entry
		await user.clear(screen.getByLabelText(/Date/i));
		await user.type(screen.getByLabelText(/Date/i), '2023-10-27');
		await user.type(screen.getByLabelText(/Total Liters/i), '35');
		await user.type(screen.getByLabelText(/Total Price/i), '60');
		await user.type(screen.getByLabelText(/Total Mileage/i), '12000');
		await user.click(screen.getByRole('button', { name: /Record Fill-up/i }));

		// 5. Verify both entries are present and stats are fully calculated
		await waitFor(() => {
			expect(within(historyList).getByText(/October 27, 2023/i)).toBeInTheDocument();
		});
		expect(within(historyList).getAllByRole('listitem')).toHaveLength(2);
		await waitFor(() => {
			// Check calculated stats
			expect(within(statsCards[0]).queryByText('3.75')).toBeInTheDocument();
			expect(within(statsCards[1]).queryByText('140.00')).toBeInTheDocument();
			expect(within(statsCards[2]).queryByText('2,000')).toBeInTheDocument();
		});
		// 6. Delete the first entry
		const historyItems = within(historyList).getAllByRole('listitem');
		const firstEntryDeleteButton = within(historyItems[1]).getByRole('button', { name: /Delete entry/i });
		await user.click(firstEntryDeleteButton);

		// 7. Verify the entry is gone and stats are recalculated
		await waitFor(() => {
			expect(within(historyList).queryByText(/January 1, 2023/i)).not.toBeInTheDocument();
			expect(within(historyList).getAllByRole('listitem')).toHaveLength(1);
		});

		// Stats should reset as there's only one entry left
		expect(within(statsCards[0]).getByText('0.00')).toBeInTheDocument();
		expect(within(statsCards[1]).getByText('60.00')).toBeInTheDocument(); // Cost of remaining entry
		expect(within(statsCards[2]).getByText('0')).toBeInTheDocument();
	});

	test('should show an error for duplicate odometer entry', async () => {
		const user = userEvent.setup();
		render(<App />);

		// Add an entry
		await user.type(screen.getByLabelText(/Total Mileage/i), '15000');
		await user.type(screen.getByLabelText(/Total Liters/i), '50');
		await user.type(screen.getByLabelText(/Total Price/i), '90');
		await user.click(screen.getByRole('button', { name: /Record Fill-up/i }));

		// Wait for the first entry to be visible in the history.
		// findBy... is a concise way to wait for an element to appear.
		await screen.findByText(/15,000/);

		// Try to add another entry with the same odometer
		// The form is cleared after submission, so we need to fill in the other fields again.
		await user.type(screen.getByLabelText(/Total Mileage/i), '15000');
		await user.type(screen.getByLabelText(/Total Liters/i), '30');
		await user.type(screen.getByLabelText(/Total Price/i), '60');
		await user.click(screen.getByRole('button', { name: /Record Fill-up/i }));

		expect(screen.getByText(/A reading with this mileage \(15000 km\) already exists\./i)).toBeInTheDocument();
	});
});
