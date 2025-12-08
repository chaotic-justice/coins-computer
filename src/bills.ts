import Elysia, { t } from "elysia";
import {
	displayResults,
	extractBillsFromBody,
	selectSubtractionAmountI,
	selectSubtractionAmountII,
	splitBillsEvenly,
} from "./methods";

// status 422 for invalid index

const BillsBase = t.Object({
	"5": t.Number({ minimum: 0 }),
	"10": t.Number({ minimum: 0 }),
	"20": t.Number({ minimum: 0 }),
	"50": t.Number({ minimum: 0 }),
	"100": t.Number({ minimum: 0 }),
});

export const bills = new Elysia({ prefix: "/bills" })
	.onTransform(function log({ body, params, path, request: { method } }) {
		console.log(`${method} ${path}`, {
			body,
			params,
		});
	})
	.post(
		"/imperfect-ii",
		({ body, status }) => {
			const [bills, total] = extractBillsFromBody(body);
			const selectedAmount = body.amount;
			const selectedCombination = body.combination;
			if (selectedAmount === 0) {
				return status(400, "selected_amount must be greater than 0");
			}
			const {
				remainingBills: billsAfterRemoval,
				selectedAmount: subtractedAmount,
			} = selectSubtractionAmountII(selectedAmount, selectedCombination, bills);
			const stacks = splitBillsEvenly(billsAfterRemoval);
			const stats = displayResults(billsAfterRemoval, stacks, subtractedAmount);
			return stats;
		},
		{
			body: t.Object({
				...BillsBase.properties,
				amount: t.Number(),
				combination: t.Record(t.String(), t.Number()),
			}),
		},
	)
	.guard({
		body: BillsBase,
	})
	.post("/perfect", ({ body, status }) => {
		const [bills, total] = extractBillsFromBody(body);
		const stacks = splitBillsEvenly(bills);
		const subtracted_amount = 0;
		const stats = displayResults({ ...bills }, stacks, subtracted_amount);
		return stats;
	})
	.post("/imperfect-i", ({ body, status }) => {
		const [bills, total] = extractBillsFromBody(body);
		const optionDetails = selectSubtractionAmountI(total, bills);
		return optionDetails;
	});
