export const OPERATOR_ROLES = ["Administrator", "Operator"] as const;

export type OperatorRole = (typeof OPERATOR_ROLES)[number];

export type OperatorSource = "env" | "file";

export type PublicOperator = {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
};

export type ListedOperator = PublicOperator & {
  source: OperatorSource;
  createdAt: string | null;
};

export type SessionOperator = PublicOperator;

export function isOperatorRole(value: string): value is OperatorRole {
  return (OPERATOR_ROLES as readonly string[]).includes(value);
}
