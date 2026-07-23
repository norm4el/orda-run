"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
exports.profileRouter = (0, express_1.Router)();
// Ensure uploads directory exists
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
// Update social links
exports.profileRouter.put('/user/:id/socials', async (req, res) => {
    const userId = req.params.id;
    const { instagram, telegram } = req.body;
    try {
        const socialLinks = { instagram, telegram };
        await (0, db_1.query)('UPDATE users SET social_links = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(socialLinks), userId]);
        res.json({ success: true, socialLinks });
    }
    catch (error) {
        console.error('Update socials error:', error);
        res.status(500).json({ error: 'Failed to update socials' });
    }
});
// Upload user avatar
exports.profileRouter.post('/user/:id/avatar', upload.single('avatar'), async (req, res) => {
    const userId = req.params.id;
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    try {
        const avatarUrl = `/uploads/${req.file.filename}`;
        // Update DB
        await (0, db_1.query)('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, userId]);
        res.json({ success: true, avatarUrl });
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});
// Upload orda avatar
exports.profileRouter.post('/orda/:id/avatar', upload.single('avatar'), async (req, res) => {
    const ordaId = req.params.id;
    // In a real app we'd verify the requesting user is the Khan of the Orda.
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    try {
        const avatarUrl = `/uploads/${req.file.filename}`;
        await (0, db_1.query)('UPDATE ordas SET avatar_url = $1 WHERE id = $2', [avatarUrl, ordaId]);
        res.json({ success: true, avatarUrl });
    }
    catch (error) {
        console.error('Upload orda avatar error:', error);
        res.status(500).json({ error: 'Failed to upload orda avatar' });
    }
});
