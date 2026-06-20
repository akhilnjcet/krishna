const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { protect, admin } = require('../middleware/authMiddleware');
const { listarArquivosDaPasta, extrairFolderId } = require('../utils/driveHelper');

router.get('/lodge/:lodgeId', async (req, res) => {
  try {
    const rooms = await Room.find({ lodgeId: req.params.lodgeId, isActive: true });
    
    // Auto-expand any Google Drive folder links saved as room photos
    for (let room of rooms) {
        let roomUpdated = false;
        
        const newInterior = [];
        for (const img of room.interiorPhotos || []) {
            const folderId = extrairFolderId(img.url);
            if (folderId && img.url.includes('/folders/')) {
                try {
                    const files = await listarArquivosDaPasta(folderId);
                    files.forEach(f => newInterior.push({ url: f, publicId: 'drive_link' }));
                    roomUpdated = true;
                } catch (err) {
                    console.error('Failed to auto-expand folder:', folderId, err);
                    newInterior.push(img);
                }
            } else {
                newInterior.push(img);
            }
        }
        
        const newExterior = [];
        for (const img of room.exteriorPhotos || []) {
            const folderId = extrairFolderId(img.url);
            if (folderId && img.url.includes('/folders/')) {
                try {
                    const files = await listarArquivosDaPasta(folderId);
                    files.forEach(f => newExterior.push({ url: f, publicId: 'drive_link' }));
                    roomUpdated = true;
                } catch (err) {
                    console.error('Failed to auto-expand folder:', folderId, err);
                    newExterior.push(img);
                }
            } else {
                newExterior.push(img);
            }
        }
        
        if (roomUpdated) {
            room.interiorPhotos = newInterior;
            room.exteriorPhotos = newExterior;
            await room.save();
        }
    }
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/:id', async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      
      let roomUpdated = false;
      
      const newInterior = [];
      for (const img of room.interiorPhotos || []) {
          const folderId = extrairFolderId(img.url);
          if (folderId && img.url.includes('/folders/')) {
              try {
                  const files = await listarArquivosDaPasta(folderId);
                  files.forEach(f => newInterior.push({ url: f, publicId: 'drive_link' }));
                  roomUpdated = true;
              } catch (err) {
                  newInterior.push(img);
              }
          } else {
              newInterior.push(img);
          }
      }
      
      const newExterior = [];
      for (const img of room.exteriorPhotos || []) {
          const folderId = extrairFolderId(img.url);
          if (folderId && img.url.includes('/folders/')) {
              try {
                  const files = await listarArquivosDaPasta(folderId);
                  files.forEach(f => newExterior.push({ url: f, publicId: 'drive_link' }));
                  roomUpdated = true;
              } catch (err) {
                  newExterior.push(img);
              }
          } else {
              newExterior.push(img);
          }
      }
      
      if (roomUpdated) {
          room.interiorPhotos = newInterior;
          room.exteriorPhotos = newExterior;
          await room.save();
      }
      
      res.json(room);
    } catch(err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

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

        // Parse Google Drive Links
        if (req.body.interiorDriveUrls) {
            const urls = Array.isArray(req.body.interiorDriveUrls) ? req.body.interiorDriveUrls : [req.body.interiorDriveUrls];
            for (const url of urls) {
                if (url && url.trim()) {
                    const folderId = extrairFolderId(url.trim());
                    if (folderId) {
                        try {
                            const files = await listarArquivosDaPasta(folderId);
                            files.forEach(f => interiorPhotos.push({ url: f, publicId: 'drive_link' }));
                        } catch (err) {
                            console.error('Failed to list files for folder:', folderId, err);
                            interiorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                        }
                    } else {
                        interiorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                    }
                }
            }
        }
        if (req.body.exteriorDriveUrls) {
            const urls = Array.isArray(req.body.exteriorDriveUrls) ? req.body.exteriorDriveUrls : [req.body.exteriorDriveUrls];
            for (const url of urls) {
                if (url && url.trim()) {
                    const folderId = extrairFolderId(url.trim());
                    if (folderId) {
                        try {
                            const files = await listarArquivosDaPasta(folderId);
                            files.forEach(f => exteriorPhotos.push({ url: f, publicId: 'drive_link' }));
                        } catch (err) {
                            console.error('Failed to list files for folder:', folderId, err);
                            exteriorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                        }
                    } else {
                        exteriorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                    }
                }
            }
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
    const { lodgeId, type, price, rentCycle, maxGuests, description, amenities, videoUrl } = req.body;

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

    // Parse Google Drive Links
    if (req.body.interiorDriveUrls) {
        const urls = Array.isArray(req.body.interiorDriveUrls) ? req.body.interiorDriveUrls : [req.body.interiorDriveUrls];
        for (const url of urls) {
            if (url && url.trim()) {
                const folderId = extrairFolderId(url.trim());
                if (folderId) {
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => interiorPhotos.push({ url: f, publicId: 'drive_link' }));
                    } catch (err) {
                        console.error('Failed to list files for folder:', folderId, err);
                        interiorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                    }
                } else {
                    interiorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                }
            }
        }
    }
    if (req.body.exteriorDriveUrls) {
        const urls = Array.isArray(req.body.exteriorDriveUrls) ? req.body.exteriorDriveUrls : [req.body.exteriorDriveUrls];
        for (const url of urls) {
            if (url && url.trim()) {
                const folderId = extrairFolderId(url.trim());
                if (folderId) {
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => exteriorPhotos.push({ url: f, publicId: 'drive_link' }));
                    } catch (err) {
                        console.error('Failed to list files for folder:', folderId, err);
                        exteriorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                    }
                } else {
                    exteriorPhotos.push({ url: url.trim(), publicId: 'drive_link' });
                }
            }
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
      exteriorPhotos,
      videoUrl: videoUrl || ''
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
router.delete('/:id/photo', protect, admin, async (req, res) => {
    try {
        const { photoUrl } = req.body;
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        room.interiorPhotos = room.interiorPhotos.filter(p => p.url !== photoUrl);
        room.exteriorPhotos = room.exteriorPhotos.filter(p => p.url !== photoUrl);

        await room.save();
        res.json(room);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
