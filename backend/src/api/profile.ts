import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db';
import fs from 'fs';

export const profileRouter = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Update social links
profileRouter.put('/user/:id/socials', async (req, res) => {
    const userId = req.params.id;
    const { instagram, telegram } = req.body;

    try {
        const socialLinks = { instagram, telegram };
        await query(
            'UPDATE users SET social_links = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(socialLinks), userId]
        );
        res.json({ success: true, socialLinks });
    } catch (error) {
        console.error('Update socials error:', error);
        res.status(500).json({ error: 'Failed to update socials' });
    }
});

// Upload user avatar
profileRouter.post('/user/:id/avatar', upload.single('avatar'), async (req, res) => {
    const userId = req.params.id;
    
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    try {
        const avatarUrl = `/uploads/${req.file.filename}`;
        
        // Update DB
        await query(
            'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
            [avatarUrl, userId]
        );

        res.json({ success: true, avatarUrl });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Upload orda avatar
profileRouter.post('/orda/:id/avatar', upload.single('avatar'), async (req, res) => {
    const ordaId = req.params.id;
    // In a real app we'd verify the requesting user is the Khan of the Orda.
    
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    try {
        const avatarUrl = `/uploads/${req.file.filename}`;
        
        await query(
            'UPDATE ordas SET avatar_url = $1 WHERE id = $2',
            [avatarUrl, ordaId]
        );

        res.json({ success: true, avatarUrl });
    } catch (error) {
        console.error('Upload orda avatar error:', error);
        res.status(500).json({ error: 'Failed to upload orda avatar' });
    }
});
