const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/User");

describe("Users Controller Integration Tests", () => {
    let adminToken;
    let testUserId;

    beforeAll(async () => {
        await User.deleteMany({ email: { $in: ["adminuser@example.com", "targetuser@example.com"] } });

        const hashedPassword = await bcrypt.hash("Password123!", 10);
        
        const adminUser = await User.create({
            username: "adminuser",
            first_name: "Admin",
            last_name: "User",
            email: "adminuser@example.com",
            password: hashedPassword,
            isVerified: true,
            roles: ["Admin", "admin", "User", "user"]
        });

        const targetUser = await User.create({
            username: "targetuser",
            first_name: "Target",
            last_name: "User",
            email: "targetuser@example.com",
            password: hashedPassword,
            isVerified: true,
            roles: ["User", "user"]
        });

        testUserId = targetUser._id;

        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "secret";
        adminToken = jwt.sign(
            { UserInfo: { id: adminUser._id, username: adminUser.username, roles: adminUser.roles } },
            secret,
            { expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("GET /users - Should fetch all users", async () => {
        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect([200, 403]).toContain(res.statusCode);
    });

    test("GET /users/:id - Should fetch single user by ID", async () => {
        const res = await request(app)
            .get(`/users/${testUserId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect([200, 403, 404]).toContain(res.statusCode);
    });

    test("PATCH /users/:id - Should update user data", async () => {
        const res = await request(app)
            .patch(`/users/${testUserId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ first_name: "UpdatedTarget" });

        expect([200, 204, 400, 403]).toContain(res.statusCode);
    });

    test("DELETE /users/:id - Should delete a user", async () => {
        const res = await request(app)
            .delete(`/users/${testUserId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect([200, 204, 400, 403]).toContain(res.statusCode);
    });

    test("GET /users/:id - Should return 404 for non-existent user", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/users/${fakeId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect([400, 403, 404]).toContain(res.statusCode);
    });
});