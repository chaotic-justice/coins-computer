import Elysia, { t } from "elysia";
import {
	type Bills,
	calculateStackStats,
	extractBillsFromBody,
	selectSubtractionAmountI,
	selectSubtractionAmountII,
	splitBillsEvenly,
	type SubtractionStackStats,
} from "./methods";

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
	/*
    {"5": 6,
    "10": 6,
    "20": 4,
    "50": 0,
    "100": 1} */
	.post("/imperfect", ({ body, status }) => {
		const [bills, total] = extractBillsFromBody(body);
		const optionDetails = selectSubtractionAmountI(total, bills);

		const res = optionDetails.reduce((acc: SubtractionStackStats[], option) => {
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
			const stackStats = calculateStackStats(stacks);
			acc = acc.concat({
				...option,
				stackStats,
			});
			return acc;
		}, []);

		return res;
	});
