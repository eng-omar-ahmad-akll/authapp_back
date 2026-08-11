const sendEmail = require("../config/sendEmail");

// عمل Mock لمكتبة Nodemailer أو الخدمة المستخدمة
jest.mock("../config/sendEmail", () => jest.fn().mockResolvedValue(true));

describe("Email Service Unit Test", () => {
    test("Should call sendEmail function successfully", async () => {
        const result = await sendEmail({
            email: "test@example.com",
            subject: "Test Subject",
            message: "Test Message"
        });

        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
    });
});