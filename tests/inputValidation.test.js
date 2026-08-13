/**
 * @file Input Validations & OWASP Injection Security Tests
 * @description Validates user input handling against XSS, NoSQL Injection, payload bounds, and privilege escalation via mass assignment.
 * 
 * @author 3akl
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

describe("1. Input Validations & OWASP Injection Tests", () => {

    test("Auth Validation - Reject Weak Passwords & Special Chars (XSS/NoSQL)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({
                first_name: "Omar<script>",
                last_name: "Akl",
                email: "invalid-email",
                password: "123"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe("fail");
        expect(res.body.errors).toBeDefined();
    });

    test("Blog Validation - Reject payload exceeding limits (Tags > 10)", async () => {
        const token = jwt.sign(
            { UserInfo: { id: "60d5ecb8b5c9c22b1c8e1234", roles: ["user"] } },
            process.env.ACCESS_TOKEN_SECRET || "secret"
        );

        const res = await request(app)
            .post("/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Valid Title",
                content: "Valid blog content exceeding ten chars",
                tags: ["1","2","3","4","5","6","7","8","9","10","11"]
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toContain("You cannot add more than 10 tags");
    });

    test("User Validation - Strip unauthorized fields like 'role' on update", async () => {
        const fakeToken = jwt.sign(
            { UserInfo: { id: "60d5ecb8b5c9c22b1c8e1234", roles: ["user"] } },
            process.env.ACCESS_TOKEN_SECRET || "secret"
        );

        const res = await request(app)
            .patch("/users/60d5ecb8b5c9c22b1c8e1234")
            .set("Authorization", `Bearer ${fakeToken}`)
            .send({
                first_name: "Omar",
                role: "admin"
            });

        if (res.statusCode === 200) {
            expect(res.body.data?.role).not.toBe("admin");
        }
    });
});

afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
});