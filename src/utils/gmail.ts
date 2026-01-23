export const getHeader = (payload: any, name: string) => {
  return payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
};

export const extractSubject = (msgRes: any) => {
  return getHeader(msgRes.data.payload, "Subject");
};

export const extractSenderName = (msgRes: any) => {
  const fromValue = getHeader(msgRes.data.payload, "From");
  // Regex to separate "John Doe <john@example.com>" into "John Doe"
  // If only "john@example.com" exists, it returns that.
  const nameMatch = fromValue.match(/^([^<]+)/);
  return nameMatch ? nameMatch[1].trim().replace(/"/g, "") : fromValue;
};

export const extractSenderEmail = (msgRes: any) => {
  const fromValue = getHeader(msgRes.data.payload, "From");
  // Regex to extract just the "email@address.com" part
  const emailMatch = fromValue.match(/<([^>]+)>/) || fromValue.match(/([^\s]+@[^\s]+)/);
  return emailMatch ? emailMatch[1] : fromValue;
};