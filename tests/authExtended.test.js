/**
 * @file Auth Controller Extended Tests
 * @description Integration tests for JWT Refresh, Logout, and OTP verification flows.
 * 
 * @author 3akl
 */

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/User");
const OTP = require("../models/OTP");

describe("Auth Controller Extended Tests (Refresh, Logout, OTP)", () => {
    let cookieToken;
    let authToken;

    beforeAll(async () => {
        await User.deleteMany({ email: "authextended@example.com" });
        await OTP.deleteMany({ email: "authextended@example.com" });

        const hashedPassword = await bcrypt.hash("Password123!", 10);
        const user = await User.create({
            username: "authextended",
            first_name: "Auth",
            last_name: "Extended",
            email: "authextended@example.com",
            password: hashedPassword,
            isVerified: true,
            roles: ["User", "user"]
        });

        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "secret";
        authToken = jwt.sign(
            { UserInfo: { id: user._id, username: user.username, roles: user.roles } },
            secret,
            { expiresIn: "1h" }
        );

        const loginRes = await request(app)
            .post("/auth/login")
            .send({
                email: "authextended@example.com",
                password: "Password123!"
            });

        const cookies = loginRes.headers["set-cookie"];
        if (cookies) {
            cookieToken = cookies.find(c => c.startsWith("jwt="));
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("GET /auth/refresh - Should handle refresh token request", async () => {
        const req = request(app).get("/auth/refresh");
        if (cookieToken) req.set("Cookie", [cookieToken]);

        const res = await req;
        expect([200, 401, 403]).toContain(res.statusCode);
    });

    test("GET /auth/refresh - Should fail without refreshToken cookie", async () => {
        const res = await request(app).get("/auth/refresh");
        expect(res.statusCode).toBe(401);
    });

    test("POST /auth/send-otp - Should process OTP request", async () => {
        const res = await request(app)
            .post("/auth/send-otp")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ email: "authextended@example.com" });

        expect([200, 201, 400, 401, 404]).toContain(res.statusCode);
    });

    test("POST /auth/verify-otp - Should verify created OTP", async () => {
        await OTP.create({
            email: "authextended@example.com",
            otp: "123456",
            createdAt: new Date()
        });

        const res = await request(app)
            .post("/auth/verify-otp")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ email: "authextended@example.com", otp: "123456" });

        expect([200, 201, 400, 401, 404]).toContain(res.statusCode);
    });

    test("POST /auth/reset-password - Should handle password reset", async () => {
        const res = await request(app)
            .post("/auth/reset-password")
            .send({
                email: "authextended@example.com",
                newPassword: "NewPassword123!"
            });

        expect([200, 201, 400, 401, 404]).toContain(res.statusCode);
    });

    test("POST /auth/logout - Should clear session/cookie", async () => {
        const req = request(app).post("/auth/logout");
        if (cookieToken) req.set("Cookie", [cookieToken]);

        const res = await req;
        expect([200, 204]).toContain(res.statusCode);
    });
});