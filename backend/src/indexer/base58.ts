const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 256;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let leading = 0;
  for (const byte of bytes) {
    if (byte !== 0) break;
    leading++;
  }

  let out = "1".repeat(leading);
  for (let i = digits.length - 1; i >= 0; i--) {
    out += ALPHABET[digits[i]];
  }
  return out;
}

export function decodeBase58(text: string): Uint8Array {
  if (text.length === 0) return new Uint8Array();

  const digits = [0];
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`invalid base58 character: ${char}`);
    let carry = value;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 58;
      digits[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leading = 0;
  for (const char of text) {
    if (char !== "1") break;
    leading++;
  }

  const out = new Uint8Array(leading + digits.length);
  for (let i = 0; i < digits.length; i++) {
    out[out.length - 1 - i] = digits[i];
  }
  return out;
}
