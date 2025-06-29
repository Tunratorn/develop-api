module.exports.getDataUser = (req, res) => {
    // Example: Fetch user data from database or service
    // Replace this with your actual data fetching logic
    const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com'
    };

    res.status(200).json({
        success: true,
        data: userData
    });
};