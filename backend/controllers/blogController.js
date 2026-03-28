const BlogPost = require('../models/BlogPost');

exports.getBlogs = async (req, res) => {
    try {
        const blogs = await BlogPost.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getBlogById = async (req, res) => {
    try {
        const blog = await BlogPost.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Report not found' });
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createBlog = async (req, res) => {
    try {
        const { title, content, image, category, authorName } = req.body;
        const blog = new BlogPost({
            title,
            content,
            image,
            category: category || 'General',
            authorName: authorName || 'Staff',
            author: req.user?._id
        });
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const updatedBlog = await BlogPost.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updatedBlog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        await BlogPost.findByIdAndDelete(req.params.id);
        res.json({ message: 'Archive entry deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
