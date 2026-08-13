/**
 * @file Rate Limiting & Global Error Handling Security Tests
 * @description Tests anti-brute-force rate limiting defenses and prevents stack trace leakage in production.
 * 
 * @author 3akl
 */

const request = require("supertest");
const app = require("../server");

describe("4. Security Limits & Global Error Handler Tests", () => {

    test("loginLimiter - Block IP after exceeding maximum login attempts", async () => {
        const loginPayload = { email: "test@example.com", password: "WrongPassword123!" };

        for (let i = 0; i < 5; i++) {
            await request(app).post("/auth/login").send(loginPayload);
        }

        const blockedResponse = await request(app).post("/auth/login").send(loginPayload);

        expect(blockedResponse.statusCode).toBe(429);
        expect(blockedResponse.body.message).toContain("Too many login attempts");
    });

    test("globalErrorHandler - Prevent leaking stack trace in production", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const res = await request(app).get("/blogs/non-existing-route-trigger-error");

        expect(res.body.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
    });
});

afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
});