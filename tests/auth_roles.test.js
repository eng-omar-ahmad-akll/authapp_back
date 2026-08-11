const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

describe("2. Authentication & Role Authorization Tests", () => {

    // OWASP A07: Missing/Malformed Token
    test("verifyJWT - Reject request without Authorization Header", async () => {
        const res = await request(app).get("/users");
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("Access Token Missing");
    });

    test("verifyJWT - Reject Invalid or Malformed Token Signature", async () => {
        const res = await request(app)
            .get("/users")
            .set("Authorization", "Bearer invalid.jwt.token");

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("Invalid Token");
    });

    test("verifyJWT - Reject Expired Tokens", async () => {
        const expiredToken = jwt.sign(
            { UserInfo: { id: "60d5ecb8b5c9c22b1c8e1234", roles: ["user"] } },
            process.env.ACCESS_TOKEN_SECRET || "secret",
            { expiresIn: "-1s" }
        );

        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("Token Expired");
    });

    // OWASP A01: Privilege Escalation (verifyRoles)
    test("verifyRoles - Forbid standard User from accessing Admin routes", async () => {
        const userToken = jwt.sign(
            { UserInfo: { id: "60d5ecb8b5c9c22b1c8e1234", roles: ["user"] } },
            process.env.ACCESS_TOKEN_SECRET || "secret",
            { expiresIn: "1h" }
        );

        const res = await request(app)
            .get("/users") // مسار خاص بالأدمن
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
    });
});

afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
});