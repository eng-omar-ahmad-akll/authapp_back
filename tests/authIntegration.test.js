/**
 * @file Auth & Middleware Integration Tests
 * @description Verifies authorization flow, password strength validation, and MongoDB ObjectId validation.
 * 
 * @author 3akl
 */

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

describe("Auth & Middleware Integration Tests", () => {

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("1. Should fail registration if password is weak (authValidation)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({
                first_name: "Omar",
                last_name: "Akl",
                email: "test@example.com",
                password: "123"
            });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.status).toEqual("fail");
    });

    test("2. Should reject request with invalid ObjectId (validateObjectId)", async () => {
        const res = await request(app)
            .get("/blogs/invalid-id-123");

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toContain("Invalid Mongo ObjectId");
    });

    test("3. Should block access to protected routes without JWT (verifyJWT)", async () => {
        const res = await request(app)
            .post("/blogs")
            .send({ title: "Valid Title", content: "Valid Content text here..." });

        expect(res.statusCode).toEqual(401);
    });
});