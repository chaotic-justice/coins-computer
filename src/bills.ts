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
	"5": t.Number(),
	"10": t.Number(),
	"20": t.Number(),
	"50": t.Number(),
	"100": t.Number(),
});

export const bills = new Elysia({ prefix: "/bills" })
	.onTransform(function log({ body, params, path, request: { method } }) {
		console.log(`${method} ${path}`, {
			body,
			params,
		});
	})
	.post(
		"/perfect",
		({ body, status }) => {
			const [bills, total] = extractBillsFromBody(body);
			const stacks = splitBillsEvenly(bills);
			const subtracted_amount = 0;
			const stats = displayResults({ ...bills }, stacks, subtracted_amount);
			return stats;
		},
		{
			body: BillsBase,
		},
	)
	.post(
		"/imperfect-i",
		({ body, status }) => {
			const [bills, total] = extractBillsFromBody(body);
			const optionDetails = selectSubtractionAmountI(total, bills);
			console.log("optionDetails", optionDetails);
			// const options_dict = {}
			// for i, (amount, combination, description) in enumerate(option_details, 1):
			//   options_dict[i] = {'amount': amount, 'combination': combination, 'description': description}
			return optionDetails;
		},
		{
			body: t.Object({
				...BillsBase.properties,
				totalValue: t.Number(),
			}),
		},
	)
	.post(
		"/imperfect-ii",
		({ body, status }) => {
			const [bills, total] = extractBillsFromBody(body);
			const selectedAmount = body.selectedAmount;
			const selectedCombination = body.selectedCombination;
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
				selectedAmount: t.Number(),
				selectedCombination: t.Array(t.Number()),
			}),
		},
	);
