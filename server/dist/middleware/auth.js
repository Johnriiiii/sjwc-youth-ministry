import { verifyToken } from '../utils/token.js';
export const requireAuth = (req, res, next) => {
    const header = req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing authorization token' });
    }
    const token = header.slice('Bearer '.length);
    try {
        const payload = verifyToken(token);
        req.auth = payload;
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
export const requireAdmin = (req, res, next) => {
    if (!req.auth || req.auth.role !== 1) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    return next();
};
