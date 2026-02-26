const supabase = require('../databases/config');

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

module.exports.getRegister_travel = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('registrations_travel')
            .select('created_at, full_name, nickname, tel, gender_type');

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

exports.debugSuperbase = async (req, res) => {
  const { data, error } = await supabase
    .from('registrations_travel')
    .select('*');

  console.log("DATA:", data);
  console.log("ERROR:", error);

  res.json({ data, error });
};

exports.add_registrations_travel = async (req, res) => {
  const { data, error } = await supabase
    .from('registrations_travel')
    .insert({
        full_name: req.body.full_name,
        nickname: req.body.nickname,
        tel: req.body.tel,
        gender_type: req.body.gender_type
    })
    .select('*');

  console.log("DATA:", data);
  console.log("ERROR:", error);

  res.json({ data, error });
};