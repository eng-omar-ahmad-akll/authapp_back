# 🛡️ Hardened Production-Grade Node.js REST API

> A high-performance, secure, and production-ready Express.js Backend API engineered with **OWASP Top 10 mitigation**, **Zero-Trust Input Sanitization**, **Role-Based Access Control (RBAC)**, and **Enterprise-Grade Authentication Architecture**.

---

## 🎯 Architecture & Security Highlights

* **Zero-Trust File Upload Pipeline:** Multi-layer validation enforcing MIME-type whitelisting, payload size bounds, and **Deep Magic Bytes Inspection** (`file-type`) to eliminate RCE, Polyglot payloads, and Unrestricted File Upload vulnerabilities.
* **Composite Rate Limiting Engine:** Advanced IP + Normalized Email key generation preventing IP Spoofing, Proxy Collisions, and Targeted Brute-Force attacks on sensitive endpoints (`/auth/login`, `/auth/otp`).
* **Hardened Authentication Architecture:** JWT Access Tokens with **Refresh Token Rotation**, In-Memory Synchronous Revocation Blacklist, and **TOTP-based Two-Factor Authentication (2FA)** via `speakeasy`.
* **Atomic Race-Condition Protection:** State-managed OTP reset flow preventing parallel reuse attacks using atomic MongoDB update semantics.
* **Granular Authorization Layer:** Dynamic Middleware-based RBAC combined with Resource Ownership Resolvers to strictly enforce Least Privilege.

---

## 🛡️ Applied Standards & OWASP Top 10 Mitigation Matrix

| Security Threat / Standard | Mitigation Implementation in Architecture |
| :--- | :--- |
| **A01: Broken Access Control** | Enforced via `verifyJWT`, `verifyRoles`, and functional ownership resolvers (`verifyOwnershipOrAdmin`, `verifyBlogOwnership`). |
| **A02: Cryptographic Failures** | Refresh Tokens served via `HttpOnly`, `Secure`, `SameSite=None` cookies. Password hashing with `bcrypt` (Salt Factor 10-12). |
| **A03: Injection (NoSQL & ReDoS)** | Sanitized with `express-mongo-sanitize` and strict Joi Schemas leveraging ReDoS-safe RegExp patterns. |
| **A04: Insecure Design** | Rate-limiting layered across API, Auth, and OTP tiers. Lockout mechanisms for repeated failed logins. |
| **A05: Security Misconfiguration** | Strict `Helmet` policy enforcing CSP, HSTS (`31536000`s), Frameguard, and X-Content-Type-Options. |
| **A08: Software & Data Integrity** | Memory Storage upload buffer + Magic Bytes structural check before any persistence or cloud upload. |
| **Memory & Performance Integrity** | Self-cleaning In-Memory LRU-like Maps with defined `MAX_SIZE` bounds to eliminate Node.js Event Loop Memory Leaks. |

---

## 🏗️ Technical Stack

* **Runtime:** Node.js (v18+ LTS) / Express.js
* **Database:** MongoDB / Mongoose ODM
* **Security & Auth:** `jsonwebtoken`, `bcrypt`, `speakeasy`, `helmet`, `express-rate-limit`, `express-mongo-sanitize`
* **Validation:** Joi (Schema Validation with `{ stripUnknown: true }`)
* **File Upload & Storage:** Multer (Memory Storage), `file-type` (Magic Bytes), Cloudinary API

---

## 🔐 Core Security Modules Explained

### 1. File Upload & Deep Inspection
Unlike traditional file upload handlers relying strictly on `file.mimetype` (which can be easily spoofed via Request Headers), this project utilizes a dual-barrier validation:

```text
[ Incoming Request ]
        │
        ▼
[ Multer MIME Filter ]  ---> (Rejects basic non-image headers)
        │
        ▼
[ Memory Storage Buffer ]
        │
        ▼
[ Magic Bytes Inspector ] ---> Reads raw binary signatures via file-type
        │
        ▼
[ Cloudinary Stream ]
