import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (to: string, otp: string) => {
  await transporter.sendMail({
    from: `"YourApp" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
  });
};
