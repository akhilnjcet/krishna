const ChatbotContactSetting = require('../models/ChatbotContactSetting');

// Get Chatbot Contact Settings (Public / Customer / Staff / Admin)
exports.getContactSettings = async (req, res) => {
  try {
    let settings = await ChatbotContactSetting.findOne();
    if (!settings) {
      settings = await ChatbotContactSetting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chatbot contact settings', error: error.message });
  }
};

// Save Chatbot Contact Settings (Admin Only)
exports.saveContactSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    const {
      companyName,
      contactPerson,
      primaryPhone,
      secondaryPhone,
      whatsappNumber,
      email,
      website,
      businessHours
    } = req.body;

    // Phone Format Validation (if provided)
    const phoneRegex = /^\+?[0-9\s\-]{8,18}$/;
    if (primaryPhone && !phoneRegex.test(primaryPhone.trim())) {
      return res.status(400).json({ message: 'Invalid Primary Phone Number format. Must contain 8-15 digits with optional country code (+91).' });
    }

    if (secondaryPhone && secondaryPhone.trim() && !phoneRegex.test(secondaryPhone.trim())) {
      return res.status(400).json({ message: 'Invalid Secondary Phone Number format.' });
    }

    if (whatsappNumber && !phoneRegex.test(whatsappNumber.trim())) {
      return res.status(400).json({ message: 'Invalid WhatsApp Number format.' });
    }

    // Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid Email Address format.' });
    }

    let settings = await ChatbotContactSetting.findOne();
    if (!settings) {
      settings = new ChatbotContactSetting({});
    }

    if (companyName !== undefined) settings.companyName = companyName.trim();
    if (contactPerson !== undefined) settings.contactPerson = contactPerson.trim();
    if (primaryPhone !== undefined) settings.primaryPhone = primaryPhone.trim();
    if (secondaryPhone !== undefined) settings.secondaryPhone = secondaryPhone.trim();
    if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber.trim();
    if (email !== undefined) settings.email = email.trim();
    if (website !== undefined) settings.website = website.trim();
    if (businessHours !== undefined) settings.businessHours = businessHours.trim();

    settings.updatedBy = req.user._id || req.user.id;
    settings.updatedAt = new Date();

    await settings.save();

    res.json({ message: 'Chatbot contact settings updated successfully.', settings });
  } catch (error) {
    console.error('Error saving chatbot contact settings:', error);
    res.status(500).json({ message: 'Failed to save contact settings', error: error.message });
  }
};
