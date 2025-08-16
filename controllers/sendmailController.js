const nodemailer = require('nodemailer');

module.exports.sendmail = (req, res) => {
    const { name, email, phone, message } = req.body;

    // Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });


    // สร้าง HTML message
    const htmlMessage = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2 style="color: #004080; margin-bottom: 20px;">ข้อความติดต่อจาก Resume Page</h2>

        <p><strong>ชื่อ:</strong> ${name}</p>
        <p><strong>อีเมล:</strong> ${email}</p>
        <p><strong>เบอร์โทร:</strong> ${phone}</p>
        <p><strong>ข้อความ:</strong></p>
        <p style="padding: 10px; background-color: #f1f1f1; border-radius: 5px;">${message}</p>

        <div style="font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
        &copy; 2025 Resume Page By Nodejs App
        </div>
    </div>
    </div>
    `;

    // Send email
    transporter.sendMail({
        from: 'Resume Page By Nodejs App',
        to: 'tunratorn@gmail.com',
        subject: 'Contact Form Resume Page',
        html: htmlMessage
    }, (error, info) => {
        if (error) {
            // ส่ง response แค่ครั้งเดียวเมื่อเกิด error
            return res.status(500).json({
                success: false,
                message: 'Error sending email',
                error: error.message
            });
        }

        // ส่ง response แค่ครั้งเดียวเมื่อส่งเมลสำเร็จ
        return res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            info: info.response
        });
    });
};
