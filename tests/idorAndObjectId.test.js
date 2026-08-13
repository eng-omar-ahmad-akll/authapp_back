/**
 * @file Resource Ownership & ID Validation Security Tests
 * @description Tests OWASP A01: IDOR (Insecure Direct Object Reference) and Parameter Tampering vulnerabilities.
 * 
 * @author 3akl
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

describe("3. Resource Ownership & ID Validation (IDOR Tests)", () => {

    test("validateObjectId - Reject Invalid Mongo ObjectIds immediately", async () => {
        const res = await request(app).get("/blogs/123-invalid-id");
        
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain("Invalid Mongo ObjectId format");
    });

    test("verifyBlogOwnership - Prevent modifying another user's blog", async () => {
        const user1Token = jwt.sign(
            { UserInfo: { id: "60d5ecb8b5c9c22b1c8e1111", roles: ["user"] } },
            process.env.ACCESS_TOKEN_SECRET || "secret",
            { expiresIn: "1h" }
        );

        const res = await request(app)
            .patch("/blogs/60d5ecb8b5c9c22b1c8e9999") 
            .set("Authorization", `Bearer ${user1Token}`)
            .send({ title: "Hacked Title" });

        expect([403, 404]).toContain(res.statusCode);
    });
});

afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
});