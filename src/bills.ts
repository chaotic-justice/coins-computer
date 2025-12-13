import Elysia, { t } from "elysia";
import {
	Bills,
	calculateStackStats,
	extractBillsFromBody,
	RemovalCombination,
	selectSubtractionAmountI,
	selectSubtractionAmountII,
	splitBillsEvenly,
	StackStats,
} from "./methods";

// status 422 for invalid index

const BillsBase = t.Object({
	"5": t.Number({ minimum: 0 }),
	"10": t.Number({ minimum: 0 }),
	"20": t.Number({ minimum: 0 }),
	"50": t.Number({ minimum: 0 }),
	"100": t.Number({ minimum: 0 }),
});

export const bills = new Elysia({
	prefix: "/bills",
})
	.onTransform(function log({ body, params, path, request: { method } }) {
		console.log(`${method} ${path}`, {
			body,
			params,
		});
	})
	.post(
		"/imperfect-ii",
		({ body, status }) => {
			const [bills, _total] = extractBillsFromBody(body);
			const desiredTotal = body.newTotal;
			const selectedCombination = body.combination;
			if (desiredTotal === 0) {
				return status(400, "selected_amount must be greater than 0");
			}
			// TODO: delete this endpoint
			const { remainingBills: billsAfterRemoval } = selectSubtractionAmountII(
				desiredTotal,
				selectedCombination,
				bills,
			);
			const stacks = splitBillsEvenly(billsAfterRemoval);
			const stats = calculateStackStats(stacks);
			return stats;
		},
		{
			body: t.Object({
				...BillsBase.properties,
				newTotal: t.Number(),
				combination: t.Record(t.String(), t.Number()),
			}),
		},
	)
	.guard({
		body: BillsBase,
	})
	.post("/perfect", ({ body, status }) => {
		const [bills, _total] = extractBillsFromBody(body);
		const stacks = splitBillsEvenly(bills);
		const stats = calculateStackStats(stacks);
		return stats;
	})
	.post("/imperfect", ({ body, status }) => {
		const [bills, total] = extractBillsFromBody(body);
		const optionDetails = selectSubtractionAmountI(total, bills);

		const res = optionDetails.reduce(
			(
				acc: Array<{
					newTotal: number;
					amountSubtracted: number;
					combination: RemovalCombination | null;
					description: string;
					stats: StackStats[];
				}>,
				option,
			) => {
				const billsCopy: Bills = Object.fromEntries(
					Object.entries(bills).map(([denom, count]) => [denom, count]),
				);
				const { newTotal: desiredTotal, combination: selectedCombination } =
					option;
				const { remainingBills: billsAfterRemoval } = selectSubtractionAmountII(
					desiredTotal,
					selectedCombination,
					billsCopy,
				);
				const stacks = splitBillsEvenly(billsAfterRemoval);
				const stats = calculateStackStats(stacks);
				acc = acc.concat({
					...option,
					stats,
				});
				return acc;
			},
			[],
		);

		return res;
	});
