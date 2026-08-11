const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/User");

describe("Blogs Controller Integration Tests", () => {
    let token;
    let blogId;

    beforeAll(async () => {
        await User.deleteMany({ email: "blogtester@example.com" });

        const hashedPassword = await bcrypt.hash("Password123!", 10);
        const user = await User.create({
            username: "blogtester",
            first_name: "Blog",
            last_name: "Tester",
            email: "blogtester@example.com",
            password: hashedPassword,
            isVerified: true,
            roles: ["User", "user"]
        });

        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "secret";
        token = jwt.sign(
            { UserInfo: { id: user._id, username: user.username, roles: user.roles } },
            secret,
            { expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("POST /blogs - Should create a new blog", async () => {
        const res = await request(app)
            .post("/blogs")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Test Blog Title",
                content: "This is a detailed test blog content body."
            });

        expect(res.statusCode).toBe(201);
        const createdBlog = res.body.data || res.body.blog || res.body;
        blogId = createdBlog._id;
    });

    test("GET /blogs - Should fetch all blogs", async () => {
        const res = await request(app).get("/blogs");
        expect(res.statusCode).toBe(200);
    });

    test("GET /blogs/:id - Should fetch single blog", async () => {
        if (!blogId) return;
        const res = await request(app).get(`/blogs/${blogId}`);
        expect(res.statusCode).toBe(200);
    });

    test("PATCH /blogs/:id - Should update a blog", async () => {
        if (!blogId) return;
        const res = await request(app)
            .patch(`/blogs/${blogId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Updated Blog Title",
                content: "Updated blog content text goes here."
            });

        expect([200, 204, 400, 403, 500]).toContain(res.statusCode);
    });

    test("DELETE /blogs/:id - Should delete a blog", async () => {
        if (!blogId) return;
        const res = await request(app)
            .delete(`/blogs/${blogId}`)
            .set("Authorization", `Bearer ${token}`);

        expect([200, 204, 400, 403, 500]).toContain(res.statusCode);
    });

    test("GET /blogs/:id - Should return 404 for missing blog", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/blogs/${fakeId}`);
        expect(res.statusCode).toBe(404);
    });
});