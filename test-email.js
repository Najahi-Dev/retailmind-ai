const nodemailer = require("nodemailer");

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: "74.125.130.109",
      port: 465,
      secure: true,
      tls: {
        servername: "smtp.gmail.com",
        rejectUnauthorized: false
      },
      auth: {
        user: "ahmednajahi2003@gmail.com",
        pass: "bsqnwukndzijqueq",
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      logger: true,
      debug: true
    });

    const info = await transporter.sendMail({
      from: '"RetailMind AI" <ahmednajahi2003@gmail.com>',
      to: "ahmednajahi2003@gmail.com",
      subject: "Test Email from RetailMind AI",
      text: "This is a test email.",
    });

    console.log("Success! Message ID:", info.messageId);
  } catch (error) {
    console.error("Failed to send email. ERROR DETAILS:");
    console.error(error);
  }
}

testEmail();
