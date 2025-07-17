import * as crypto from "node:crypto";
import * as jwt from "jsonwebtoken";

/**
 * Function to create a consent manager token
 *
 * @see https://docs.transcend.io/docs/consent/reference/managed-consent-database
 * @param userId - User ID
 * @param base64EncryptionKey - Encryption key
 * @param base64SigningKey - Signing key
 * @returns Token
 */
export function createConsentToken(
  userId: string,
  base64EncryptionKey: string,
  base64SigningKey: string
): string {
  // Read on for where to find these keys
  const signingKey = Buffer.from(base64SigningKey, "base64");
  const encryptionKey = Buffer.from(base64EncryptionKey, "base64");

  // NIST's AES-KWP implementation { aes 48 } - see https://tools.ietf.org/html/rfc5649
  const encryptionAlgorithm = "id-aes256-wrap-pad";
  // Initial Value for AES-KWP integrity check - see https://tools.ietf.org/html/rfc5649#section-3
  const iv = Buffer.from("A65959A6", "hex");
  // Set up encryption algorithm
  const cipher = crypto.createCipheriv(encryptionAlgorithm, encryptionKey, iv);

  // Encrypt the userId and base64-encode the result
  const encryptedIdentifier = Buffer.concat([
    cipher.update(userId),
    cipher.final(),
  ]).toString("base64");

  // Create the JWT content - jwt.sign will add a 'iat' (issued at) field to the payload
  // If you wanted to add something manually, consider
  // const issued: Date = new Date();
  // const isoDate = issued.toISOString();
  const jwtPayload = {
    encryptedIdentifier,
  };

  // Create a JSON web token and HMAC it with SHA-384
  const consentToken = jwt.sign(jwtPayload, signingKey, {
    algorithm: "HS384",
  });

  return consentToken;
}
