const { Resend } = require('resend')
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = {
  sendMail: ({ to, subject, html }) =>
    resend.emails.send({
      from: 'Moda Magica <onboarding@resend.dev>',
      to,
      subject,
      html,
    })
}