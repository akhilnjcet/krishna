const express = require('express');
const router = express.Router();
const Lodge = require('../models/Lodge');
const DriveLink = require('../models/DriveLink');
const { protect, admin } = require('../middleware/authMiddleware');
const { listarArquivosDaPasta, extrairFolderId } = require('../utils/driveHelper');
const lodgeController = require('../controllers/lodgeController');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

let cachedFallbackImages = null;
let lastFallbackFetchTime = 0;
const FALLBACK_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

const getFallbackImages = async () => {
    const now = Date.now();
    if (cachedFallbackImages && (now - lastFallbackFetchTime < FALLBACK_CACHE_TTL)) {
        return cachedFallbackImages;
    }
    try {
        const driveLink = await DriveLink.findOne().lean();
        if (!driveLink || !driveLink.link) {
            cachedFallbackImages = [];
            lastFallbackFetchTime = now;
            return [];
        }
        
        let files = [];
        const folderId = extrairFolderId(driveLink.link);
        if (folderId) {
            try {
                files = await listarArquivosDaPasta(folderId);
            } catch (err) {
                console.error('Failed to list folder files for lodge fallback:', err);
                files = [driveLink.link];
            }
        } else {
            files = [driveLink.link];
        }
        cachedFallbackImages = files.map(f => ({ url: f, publicId: 'drive_link' }));
        lastFallbackFetchTime = now;
        return cachedFallbackImages;
    } catch (err) {
        console.error('Error fetching lodge fallback images:', err);
        return cachedFallbackImages || [];
    }
};

router.get('/sync', protect, admin, lodgeController.getLodgeData);
router.post('/sync', protect, admin, lodgeController.syncLodgeData);

router.get('/', async (req, res) => {
  try {
    const lodges = await Lodge.find({}).lean();
    
    // Quick fallback check if no images exist
    const hasEmptyImages = lodges.some(l => !l.images || l.images.length === 0);
    const fallbackImages = hasEmptyImages ? await getFallbackImages() : [];

    const lodgesJSON = lodges.map(l => {
        if (!l.images || l.images.length === 0) {
            return { ...l, images: fallbackImages };
        }
        return l;
    });
    
    res.json(lodgesJSON);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lodge = await Lodge.findById(req.params.id);
    if (!lodge) return res.status(404).json({ message: 'Lodge not found' });
    
    let lodgeUpdated = false;
    const newImages = [];
    for (const img of lodge.images || []) {
        const folderId = extrairFolderId(img.url);
        if (folderId && img.url.includes('/folders/')) {
            try {
                const files = await listarArquivosDaPasta(folderId);
                files.forEach(f => newImages.push({ url: f, publicId: 'drive_link' }));
                lodgeUpdated = true;
            } catch (err) {
                console.error('Failed to auto-expand folder:', folderId, err);
                newImages.push(img);
            }
        } else {
            newImages.push(img);
        }
    }
    if (lodgeUpdated) {
        lodge.images = newImages;
        await lodge.save();
    }
    
    const lodgeObj = lodge.toJSON();
    if (!lodgeObj.images || lodgeObj.images.length === 0) {
        lodgeObj.images = await getFallbackImages();
    }
    
    res.json(lodgeObj);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, location, amenities, images } = req.body;
    
    const lodge = await Lodge.create({
      name,
      description,
      location,
      amenities,
      images,
      adminId: req.user.id || req.user._id
    });
    
    res.status(201).json(lodge);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

const upload = require('../config/cloudinary');

router.put('/:id', protect, admin, upload.array('newImages', 5), async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse location if it's sent as a stringified JSON
    if (typeof updateData.location === 'string') {
        try {
            updateData.location = JSON.parse(updateData.location);
        } catch (e) {
            console.error("Location parse error", e);
        }
    }

    // Handle existing images
    let images = [];
    if (req.body.existingImages) {
        images = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
        images = images.map(img => {
            try { return JSON.parse(img); } catch(e) { return img; } // Might be objects
        });
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
            url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
            publicId: file.filename
        }));
        images = [...images, ...newImages];
    }

    // Handle Google Drive links
    if (req.body.driveUrls) {
        const driveUrls = Array.isArray(req.body.driveUrls) ? req.body.driveUrls : [req.body.driveUrls];
        for (const url of driveUrls) {
            if (url && url.trim()) {
                const folderId = extrairFolderId(url.trim());
                if (folderId) {
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => images.push({ url: f, publicId: 'drive_link' }));
                    } catch (err) {
                        console.error('Failed to list files for folder:', folderId, err);
                        images.push({ url: url.trim(), publicId: 'drive_link' });
                    }
                } else {
                    images.push({ url: url.trim(), publicId: 'drive_link' });
                }
            }
        }
    }
    
    updateData.images = images;

    const lodge = await Lodge.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!lodge) return res.status(404).json({ message: 'Lodge not found' });
    res.json(lodge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Lodge.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lodge deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/sys/stats', protect, admin, async (req, res) => {
    try {
        const Booking = require('../models/BookingLodge');
        const Payment = require('../models/Payment');
        const Room = require('../models/Room');
        const User = require('../models/User');

        const [totalBookings, revenueAgg, totalRooms, totalUsers, activeBookings] = await Promise.all([
            Booking.countDocuments(),
            Payment.aggregate([
                { $match: { status: { $in: ['verified', 'VERIFIED', 'approved', 'APPROVED', 'paid', 'PAID'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Room.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'customer' }),
            Booking.countDocuments({ status: 'active' })
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        const occupancyRate = totalRooms > 0 ? (activeBookings / totalRooms) * 100 : 0;

        res.json({
            totalBookings,
            totalRevenue,
            totalUsers,
            occupancyRate: Math.round(occupancyRate),
            activeBookings
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
