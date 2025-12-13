interface Bills {
	[key: number]: number;
}

interface RemovalCombination {
	[key: number]: number;
}

interface StackStats {
	index: number;
	value: number;
	billCount: number;
	distribution: Bills;
}

interface BodyInput {
	"5": number;
	"10": number;
	"20": number;
	"50": number;
	"100": number;
	selectedAmount?: number;
	selectedCombination?: number[];
}

function memoize<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new Map();
	return function (...args: any[]) {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key);
		}
		const result = fn.apply(this, args);
		cache.set(key, result);
		return result;
	} as T;
}

function extractBillsFromBody(body: BodyInput): [Bills, number] {
	const keysToExtract = ["5", "10", "20", "50", "100"];
	const obj = Object.fromEntries(
		Object.entries(body).filter(([key]) => keysToExtract.includes(key)),
	);
	const bills: Bills = {};
	for (const [k, v] of Object.entries(obj)) {
		bills[parseInt(k, 10)] = v;
	}
	const total = Object.entries(bills).reduce(
		(sum, [denom, count]) => sum + parseInt(denom, 10) * count,
		0,
	);

	return [bills, total];
}

function convertBillingInputToDict(body: any): {
	bills: Bills;
	totalValue: number;
} {
	const denominations: { [key: string]: number } = {
		fives: 5,
		tens: 10,
		twenties: 20,
		fifties: 50,
		hundreds: 100,
	};
	const bills: Bills = {};
	let totalValue = 0;

	for (const [k, v] of Object.entries(body)) {
		if (denominations[k] !== undefined) {
			const denom = denominations[k];
			bills[denom] = v as number;
			totalValue += (v as number) * denom;
		}
	}

	return { bills, totalValue };
}

function canRemoveAmount(bills: Bills, targetAmount: number): boolean {
	const denominations = [100, 50, 20, 10, 5];

	const canReachAmount = memoize(
		(
			remainingAmount: number,
			denomIndex: number,
			billsState: number[],
		): boolean => {
			if (remainingAmount === 0) {
				return true;
			}
			if (remainingAmount < 0 || denomIndex >= denominations.length) {
				return false;
			}

			const denom = denominations[denomIndex];
			const maxAvailable = billsState[denomIndex];

			if (maxAvailable === 0) {
				return canReachAmount(remainingAmount, denomIndex + 1, billsState);
			}

			const maxCount = Math.min(
				maxAvailable,
				Math.floor(remainingAmount / denom),
			);
			for (let count = maxCount; count >= 0; count--) {
				const newRemaining = remainingAmount - count * denom;
				const newBillsState = [...billsState];
				newBillsState[denomIndex] = maxAvailable - count;

				if (canReachAmount(newRemaining, denomIndex + 1, newBillsState)) {
					return true;
				}
			}

			return false;
		},
	);

	const billsState = denominations.map((denom) => bills[denom] || 0);
	return canReachAmount(targetAmount, 0, billsState);
}

function findSubtractionOptions(totalValue: number, bills: Bills): number[] {
	const remainder = totalValue % 3;
	let neededRemainder = remainder;
	let shouldSearch = remainder !== 0;

	if (!shouldSearch) {
		// If remainder is 0, check if bills can be evenly distributed
		// If not, search for subtraction options to make it distributable
		shouldSearch = !canAchievePerfectDistribution(bills, 0);
	}

	if (!shouldSearch) {
		return [];
	}

	if (remainder === 0) {
		neededRemainder = 0;
	}
	const possibleAmounts: number[] = [];

	const cacheSize = Math.min(100, totalValue);
	for (let amount = 1; amount <= cacheSize; amount++) {
		if (neededRemainder === 0) {
			// When divisible by 3 but not distributable, try all amounts
			possibleAmounts.push(amount);
		} else if (amount % 3 === neededRemainder) {
			possibleAmounts.push(amount);
		}
	}

	const validAmounts: number[] = [];
	for (const amount of possibleAmounts) {
		if (amount > totalValue) {
			continue;
		}
		if (
			canRemoveAmount(bills, amount) &&
			canAchievePerfectDistribution(bills, amount)
		) {
			validAmounts.push(amount);
		}
		if (validAmounts.length >= 5) {
			break;
		}
	}

	if (validAmounts.length < 5) {
		for (let amount = cacheSize + 1; amount < totalValue; amount++) {
			if (
				canRemoveAmount(bills, amount) &&
				canAchievePerfectDistribution(bills, amount)
			) {
				validAmounts.push(amount);
				if (validAmounts.length >= 5) {
					break;
				}
			}
		}
	}

	return validAmounts.sort((a, b) => a - b);
}

function canAchievePerfectDistribution(
	originalBills: Bills,
	subtractionAmount: number,
): boolean {
	const bills = { ...originalBills };
	const remainingBills = removeBillsToReachAmountTest(bills, subtractionAmount);

	let remainingValue = 0;
	for (const [denom, count] of Object.entries(remainingBills)) {
		remainingValue += parseInt(denom, 10) * count;
	}

	if (remainingValue % 3 !== 0) {
		return false;
	}

	const targetPerStack = Math.floor(remainingValue / 3);
	const allBills: number[] = [];

	for (const [denomination, count] of Object.entries(remainingBills)) {
		const denom = parseInt(denomination, 10);
		allBills.push(...Array(count).fill(denom));
	}

	allBills.sort((a, b) => b - a);
	return canDistributePerfectly(allBills, targetPerStack, 3);
}

function canDistributePerfectly(
	bills: number[],
	target: number,
	numStacks: number,
): boolean {
	const total = bills.reduce((sum, bill) => sum + bill, 0);
	if (total !== target * numStacks) {
		return false;
	}

	const stacks = Array(numStacks).fill(0);
	bills.sort((a, b) => b - a);

	const backtrack = (index: number): boolean => {
		if (index === bills.length) {
			return stacks.every((stack) => stack === target);
		}

		const bill = bills[index];
		for (let i = 0; i < numStacks; i++) {
			if (stacks[i] + bill <= target) {
				stacks[i] += bill;
				if (backtrack(index + 1)) {
					return true;
				}
				stacks[i] -= bill;

				if (stacks[i] === 0) {
					break;
				}
			}
		}
		return false;
	};

	return backtrack(0);
}

function removeBillsToReachAmountTest(
	bills: Bills,
	targetAmount: number,
): Bills {
	const billsCopy = { ...bills };
	const combination = getRemovalCombination(billsCopy, targetAmount);

	if (combination !== null) {
		for (const [denom, count] of Object.entries(combination)) {
			const denomInt = parseInt(denom, 10);
			billsCopy[denomInt] -= count;
		}
	}

	return billsCopy;
}

function getRemovalCombination(
	bills: Bills,
	targetAmount: number,
): RemovalCombination | null {
	const denominations = [100, 50, 20, 10, 5];
	const memo = new Map<string, RemovalCombination | null>();

	const findCombination = (
		remainingAmount: number,
		denomIndex: number,
		billsRemaining: number[],
	): RemovalCombination | null => {
		if (remainingAmount === 0) {
			return {};
		}
		if (remainingAmount < 0 || denomIndex >= denominations.length) {
			return null;
		}

		const key = JSON.stringify([remainingAmount, denomIndex, billsRemaining]);
		if (memo.has(key)) {
			return memo.get(key)!;
		}

		const denom = denominations[denomIndex];
		const maxAvailable = billsRemaining[denomIndex];
		const maxCount = Math.min(
			maxAvailable,
			Math.floor(remainingAmount / denom),
		);

		for (let count = maxCount; count >= 0; count--) {
			const newRemaining = remainingAmount - count * denom;
			const newBillsRemaining = [...billsRemaining];
			newBillsRemaining[denomIndex] = maxAvailable - count;

			const result = findCombination(
				newRemaining,
				denomIndex + 1,
				newBillsRemaining,
			);
			if (result !== null) {
				const combination = { ...result };
				if (count > 0) {
					combination[denom] = count;
				}
				memo.set(key, combination);
				return combination;
			}
		}

		memo.set(key, null);
		return null;
	};

	const billsList = denominations.map((denom) => bills[denom] || 0);
	return findCombination(targetAmount, 0, billsList);
}

function describeRemovalCombination(
	combination: RemovalCombination | null,
): string {
	if (!combination || Object.keys(combination).length === 0) {
		return "No bills need to be removed";
	}

	const billsDesc: string[] = [];
	let totalRemoved = 0;
	const denominations = [100, 50, 20, 10, 5];

	for (const denom of denominations) {
		if (combination[denom] > 0) {
			const count = combination[denom];
			totalRemoved += denom * count;
			const billWord = count === 1 ? "bill" : "bills";
			billsDesc.push(`${count} $${denom} ${billWord}`);
		}
	}

	if (billsDesc.length > 0) {
		return `Remove ${billsDesc.join(", ")} (total: $${totalRemoved})`;
	} else {
		return "No bills will be removed";
	}
}

function selectSubtractionAmountI(
	totalValue: number,
	bills: Bills,
): Array<{
	newTotal: number;
	amountSubtracted: number;
	combination: RemovalCombination | null;
	description: string;
}> {
	const subtractionOptions = findSubtractionOptions(totalValue, bills);

	if (subtractionOptions.length === 0) {
		return [];
	}

	const optionDetails: Array<{
		newTotal: number;
		amountSubtracted: number;
		combination: RemovalCombination | null;
		description: string;
	}> = [];
	for (const amountSubtracted of subtractionOptions) {
		const newTotal = totalValue - amountSubtracted;
		const combination = getRemovalCombination(bills, amountSubtracted);
		const description = describeRemovalCombination(combination);
		optionDetails.push({
			newTotal,
			amountSubtracted,
			combination,
			description,
		});
	}

	return optionDetails;
}

function selectSubtractionAmountII(
	selectedAmount: number,
	selectedCombination: RemovalCombination | null,
	bills: Bills,
): { remainingBills: Bills; selectedAmount: number } {
	const remainingBills = removeBillsToReachAmount(
		{ ...bills },
		selectedAmount,
		selectedCombination,
	);
	return { remainingBills, selectedAmount };
}

function removeBillsToReachAmount(
	bills: Bills,
	targetAmount: number,
	combination: RemovalCombination | null = null,
): Bills {
	const removedBills: Bills = { 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 };

	if (combination === null) {
		combination = getRemovalCombination(bills, targetAmount);
	}

	if (combination === null) {
		let currentAmount = 0;
		const denominations = [100, 50, 20, 10, 5];
		for (const denom of denominations) {
			while ((bills[denom] || 0) > 0 && currentAmount + denom <= targetAmount) {
				bills[denom] = (bills[denom] || 0) - 1;
				removedBills[denom] += 1;
				currentAmount += denom;
				if (currentAmount === targetAmount) {
					break;
				}
			}
			if (currentAmount === targetAmount) {
				break;
			}
		}
	} else {
		for (const [denom, count] of Object.entries(combination)) {
			const k = parseInt(denom, 10);
			bills[k] = (bills[k] || 0) - count;
			removedBills[k] += count;
		}
	}

	return bills;
}

function splitBillsEvenly(bills: Bills): Bills[] {
	const allBills: number[] = [];
	for (const [denomination, count] of Object.entries(bills)) {
		const denom = parseInt(denomination, 10);
		allBills.push(...Array(count).fill(denom));
	}

	allBills.sort((a, b) => b - a);

	const stacks: Bills[] = [
		{ 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 },
		{ 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 },
		{ 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 },
	];
	const stackValues = [0, 0, 0];
	const stackBillCounts = [0, 0, 0];

	for (const bill of allBills) {
		const minValue = Math.min(...stackValues);
		const candidateStacks = stackValues
			.map((val, idx) => (val === minValue ? idx : -1))
			.filter((idx) => idx !== -1);

		let targetStack: number;
		if (candidateStacks.length > 1) {
			const minBillCount = Math.min(
				...candidateStacks.map((i) => stackBillCounts[i]),
			);
			targetStack = candidateStacks.find(
				(i) => stackBillCounts[i] === minBillCount,
			)!;
		} else {
			targetStack = candidateStacks[0];
		}

		stacks[targetStack][bill] += 1;
		stackValues[targetStack] += bill;
		stackBillCounts[targetStack] += 1;
	}

	// const targetPerStack = Math.floor(totalValue / 3);
	return refineDistribution(stacks, stackValues);
}

function refineDistribution(stacks: Bills[], stackValues: number[]): Bills[] {
	const maxIterations = 100;
	for (let iter = 0; iter < maxIterations; iter++) {
		const maxValue = Math.max(...stackValues);
		const minValue = Math.min(...stackValues);
		const maxIdx = stackValues.indexOf(maxValue);
		const minIdx = stackValues.indexOf(minValue);

		if (maxValue - minValue <= 50) {
			break;
		}

		let moved = false;
		for (const denomination of [100, 50, 20, 10, 5]) {
			if (stacks[maxIdx][denomination] > 0) {
				if (
					stackValues[maxIdx] - denomination >=
					stackValues[minIdx] + denomination
				) {
					stacks[maxIdx][denomination] -= 1;
					stacks[minIdx][denomination] += 1;
					stackValues[maxIdx] -= denomination;
					stackValues[minIdx] += denomination;
					moved = true;
					break;
				}
			}
		}

		if (!moved) {
			break;
		}
	}

	return stacks;
}

function calculateStackStats(stacks: Bills[]): StackStats[] {
	const stats: StackStats[] = [];
	for (let i = 0; i < stacks.length; i++) {
		const stack = stacks[i];
		let totalValue = 0;
		let totalBills = 0;

		for (const [denom, count] of Object.entries(stack)) {
			totalValue += parseInt(denom, 10) * count;
			totalBills += count;
		}

		stats.push({
			index: i + 1,
			value: totalValue,
			billCount: totalBills,
			distribution: { ...stack },
		});
	}
	return stats;
}

export {
	convertBillingInputToDict,
	canRemoveAmount,
	findSubtractionOptions,
	canAchievePerfectDistribution,
	canDistributePerfectly,
	removeBillsToReachAmountTest,
	getRemovalCombination,
	describeRemovalCombination,
	selectSubtractionAmountI,
	selectSubtractionAmountII,
	removeBillsToReachAmount,
	splitBillsEvenly,
	refineDistribution,
	calculateStackStats,
	extractBillsFromBody,
};

export type { Bills, RemovalCombination, StackStats };
