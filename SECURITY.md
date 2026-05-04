# Security Policy

Hysj takes security seriously. The entire purpose of this project is to protect user communications, and we treat vulnerabilities in our code as critical issues.

## Reporting Vulnerabilities

If you discover a security vulnerability, **do not open a public issue**. Instead, report it privately.

**Email:** security@hysj.app

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Affected component (e.g., crypto implementation, API endpoint, auth, key management)
- Potential impact assessment
- Suggested fix (if you have one)

### Response Timeline

| Stage                  | Timeframe       |
|------------------------|-----------------|
| Acknowledgment         | Within 48 hours |
| Initial assessment     | Within 7 days   |
| Fix developed          | Within 90 days  |
| Public disclosure      | After fix is released, or after 90 days (whichever comes first) |

## Scope

The following areas are in scope for security reports:

- **Cryptographic implementation** -- X3DH, Double Ratchet, XChaCha20-Poly1305, Sealed Sender, Onion Routing, ML-KEM-768
- **API endpoints** -- Authentication, authorization, input validation
- **Authentication system** -- JWT handling, Argon2id password hashing, TOTP 2FA
- **Key management** -- Pre-key distribution, identity key storage, session key ratcheting
- **WebSocket** -- Message delivery, connection handling
- **Redis message queue** -- TTL enforcement, message lifecycle

## Out of Scope

- Social engineering attacks against users or maintainers
- Denial of service (DoS/DDoS) attacks
- Vulnerabilities in third-party dependencies (report these upstream; let us know so we can update)
- Issues requiring physical access to a user's device
- Attacks that require the user to install a malicious app version

## Disclosure Policy

We follow a **coordinated disclosure** model:

1. Reporter submits the vulnerability privately.
2. We acknowledge receipt within 48 hours.
3. We work on a fix within the 90-day window.
4. We coordinate with the reporter on a disclosure date.
5. The fix is released and the vulnerability is publicly disclosed.

If we are unresponsive for more than 14 days, the reporter may disclose the vulnerability at their discretion.

## Recognition

We maintain a hall of fame for security researchers who responsibly disclose vulnerabilities. If you report a valid vulnerability, we will credit you (with your permission) in our security acknowledgments.

Thank you for helping keep Hysj and its users safe.
