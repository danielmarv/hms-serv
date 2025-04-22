import nodemailer from "nodemailer"

// Check if the transporter is properly configured before sending email
export const sendEmail = async (options) => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // Define email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    }

    // Send email
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error("Email sending error:", error)
    return false
  }
}
