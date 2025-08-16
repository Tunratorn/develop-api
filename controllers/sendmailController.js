module.exports.sendmail = (req, res) => {
  

    res.status(200).json({
        success: true,
        message: 'Email sent successfully',
    });
};