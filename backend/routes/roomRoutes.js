const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/lodge/:lodgeId', async (req, res) => {
  try {
    const rooms = await Room.find({ lodgeId: req.params.lodgeId, isActive: true });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/:id', async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      res.json(room);
    } catch(err) {
        res.status(500).json({ message: 'Server Error' })
    }
})

const upload = require('../config/cloudinary');
const roomUploadFields = [
    { name: 'interiorPhotos', maxCount: 5 },
    { name: 'exteriorPhotos', maxCount: 5 }
];

router.put('/:id', protect, admin, upload.fields(roomUploadFields), async (req, res) => {
    try {
        let updateData = { ...req.body };

        // Handle existing images logic
        const processExisting = (field) => {
            if (!req.body[field]) return [];
            let existing = Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]];
            return existing.map(img => {
                try { return JSON.parse(img); } catch(e) { return img; }
            });
        };

        let interiorPhotos = processExisting('existingInterior');
        let exteriorPhotos = processExisting('existingExterior');

        if (req.files && req.files.interiorPhotos) {
            const newInt = req.files.interiorPhotos.map(file => ({ 
                url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`, 
                publicId: file.filename 
            }));
            interiorPhotos = [...interiorPhotos, ...newInt];
        }
        if (req.files && req.files.exteriorPhotos) {
            const newExt = req.files.exteriorPhotos.map(file => ({ 
                url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`, 
                publicId: file.filename 
            }));
            exteriorPhotos = [...exteriorPhotos, ...newExt];
        }

        updateData.interiorPhotos = interiorPhotos;
        updateData.exteriorPhotos = exteriorPhotos;

        const room = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(room);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/', protect, admin, upload.fields(roomUploadFields), async (req, res) => {
  console.log('[DEBUG] Incoming Room Data:', req.body);
  try {
    const { lodgeId, type, price, rentCycle, maxGuests, description, amenities } = req.body;

    // 1. Validate required fields
    if (!lodgeId || !type || !price || !maxGuests) {
      return res.status(400).json({ 
        message: 'Missing required fields: lodgeId, type, price, and maxGuests are mandatory.' 
      });
    }

    // 2. Validate lodgeId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(lodgeId)) {
      return res.status(400).json({ message: 'Invalid lodgeId format (must be a valid MongoDB ObjectId).' });
    }

    let interiorPhotos = [];
    let exteriorPhotos = [];

    if (req.files) {
        if (req.files.interiorPhotos) {
            interiorPhotos = req.files.interiorPhotos.map(file => ({ 
                url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`, 
                publicId: file.filename 
            }));
        }
        if (req.files.exteriorPhotos) {
            exteriorPhotos = req.files.exteriorPhotos.map(file => ({ 
                url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`, 
                publicId: file.filename 
            }));
        }
    }

    // 3. Create room
    const room = await Room.create({
      lodgeId, 
      type, 
      price: parseFloat(price), 
      rentCycle: rentCycle || 'monthly', 
      maxGuests: parseInt(maxGuests), 
      description: description || '', 
      amenities: amenities || [],
      interiorPhotos,
      exteriorPhotos
    });

    console.log('[SUCCESS] Room Saved:', room._id);
    res.status(201).json(room);
  } catch (err) {
    console.error('[ERROR] Room Creation Failed:', err);
    res.status(500).json({ 
      message: 'Failed to save room to database', 
      error: err.message 
    });
  }
});

module.exports = router;
