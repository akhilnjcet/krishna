const Portfolio = require('../models/Portfolio');
const cloudinary = require('cloudinary').v2;

// Admin: Create Project with Initial Details
exports.createPortfolio = async (req, res) => {
    try {
        console.log('Incoming request to create portfolio:', req.body);
        const { title, category, description } = req.body;
        
        // Manual validation before DB hit
        if (!title || !category || !description) {
            return res.status(400).json({ message: 'Missing required fields: Title, Category, and Description.' });
        }

        const data = { ...req.body };
        if (data.projectDate === '') delete data.projectDate;
        if (data.location === '') delete data.location;

        const portfolio = await Portfolio.create({
            ...data,
            createdBy: req.user.id || req.user._id // Handle both naming conventions
        });
        
        console.log('Successfully created portfolio:', portfolio._id);
        res.status(201).json(portfolio);
    } catch (error) {
        console.error('Portfolio Creation Fatal Error:', error);
        res.status(500).json({ message: `Database Error: ${error.message}` });
    }
};

// Admin: Upload multiple images to a project
exports.uploadPortfolioImages = async (req, res) => {
    try {
        const { id } = req.params;
        const portfolio = await Portfolio.findById(id);
        
        if (!portfolio) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No images provided' });
        }

        const newImages = req.files.map(file => ({
            url: file.path,
            publicId: file.filename
        }));

        portfolio.images.push(...newImages);
        await portfolio.save();

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { listarArquivosDaPasta, extrairFolderId } = require('../utils/driveHelper');

// Admin: Add external image URLs (e.g. Google Drive)
exports.addPortfolioLinks = async (req, res) => {
    try {
        const { id } = req.params;
        const { urls } = req.body; // Expecting array of strings

        const portfolio = await Portfolio.findById(id);
        if (!portfolio) return res.status(404).json({ message: 'Project not found' });

        const finalUrls = [];

        for (const url of urls) {
            const folderId = extrairFolderId(url);
            if (folderId) {
                try {
                    const folderFiles = await listarArquivosDaPasta(folderId);
                    finalUrls.push(...folderFiles);
                } catch (driveErr) {
                    console.error('Drive listing failed for:', url, driveErr);
                    // Fallback to adding the URL itself if listing fails
                    finalUrls.push(url);
                }
            } else {
                finalUrls.push(url);
            }
        }

        const newImages = finalUrls.map(url => ({ url }));
        portfolio.images.push(...newImages);
        await portfolio.save();

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin/Public: Get all projects
exports.getAllPortfolio = async (req, res) => {
    try {
        const portfolios = await Portfolio.find().sort({ createdAt: -1 });
        res.json(portfolios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin/Public: Get project details
exports.getPortfolioById = async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        if (!portfolio) return res.status(404).json({ message: 'Project not found' });
        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Update project
exports.updatePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!portfolio) return res.status(404).json({ message: 'Project not found' });
        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete Project (and Cloudinary images if exist)
exports.deletePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        if (!portfolio) return res.status(404).json({ message: 'Project not found' });

        // Delete images from Cloudinary only if publicId exists
        for (const img of portfolio.images) {
            if (img.publicId) {
                await cloudinary.uploader.destroy(img.publicId).catch(e => console.error('Cloudinary delete failed:', e));
            }
        }

        await Portfolio.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete specific image
exports.deletePortfolioImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const portfolio = await Portfolio.findById(id);
        if (!portfolio) return res.status(404).json({ message: 'Project not found' });

        const image = portfolio.images.id(imageId);
        if (!image) return res.status(404).json({ message: 'Image not found' });

        // Remove from Cloudinary if applicable
        if (image.publicId) {
            await cloudinary.uploader.destroy(image.publicId).catch(e => console.error('Cloudinary delete failed:', e));
        }

        // Remove from array
        portfolio.images.pull(imageId);
        await portfolio.save();

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
