export const YAHOO_MAIL_URL = "https://mail.yahoo.com/";
export const YAHOO_MAIL_LOGIN_URL =
  "https://login.yahoo.com/?.src=ym&done=https%3A%2F%2Fmail.yahoo.com%2F";

export function yahooComposeUrl({
  to,
  subject,
  body,
}: {
  to?: string;
  subject?: string;
  body?: string;
}) {
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query
    ? `https://compose.mail.yahoo.com/?${query}`
    : "https://compose.mail.yahoo.com/";
}
