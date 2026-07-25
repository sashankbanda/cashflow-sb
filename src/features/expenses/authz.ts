/**
 * Pure authorization decisions for expenses, split out so the rules are
 * unit-testable without a database. The service layer resolves the inputs
 * (creator? payer? group owner?) and calls these.
 */

export interface ModifyContext {
  isCreator: boolean;
  isPayer: boolean;
  isOwner: boolean;
}

/** Only the creator, a payer, or the group owner may edit/delete an expense. */
export function canModifyExpense(context: ModifyContext): boolean {
  return context.isCreator || context.isPayer || context.isOwner;
}
