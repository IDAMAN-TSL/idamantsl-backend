import { Request, Response, NextFunction } from 'express';
import { appendLogToSheet } from '../services/google-sheets.service';

export const activityLogger = (req: Request, res: Response, next: NextFunction) => {
    // Kita hanya ingin mencatat request yang melakukan perubahan data (POST, PUT, PATCH, DELETE)
    // Untuk GET request, bisa di-log juga jika diinginkan, tapi biasanya diabaikan agar tidak terlalu penuh.
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        // Asumsi data user disimpan di req.user (tergantung implementasi auth middleware sebelumnya)
        // Jika tidak ada user (misalnya request belum login), kita catat sebagai 'Guest'
        const user = (req as any).user;
        const userId = user?.id || 'Guest';
        const userName = user?.nama_lengkap || user?.email || 'Unknown';
        
        const endpoint = req.originalUrl;
        
        // Memetakan method ke aktivitas yang lebih mudah dibaca
        let activity = req.method;
        if (req.method === 'POST') activity = 'Create Data / Action';
        if (req.method === 'PUT' || req.method === 'PATCH') activity = 'Update Data';
        if (req.method === 'DELETE') activity = 'Delete Data';
        if (endpoint.includes('login')) activity = 'User Login';
        if (endpoint.includes('register')) activity = 'User Register';

        // Panggil fungsi secara asinkron (jangan ditunggu/await agar tidak memblokir request)
        try {
            if (typeof appendLogToSheet !== 'function') {
                console.error('Activity Logger Error: appendLogToSheet is not a function');
            } else {
                appendLogToSheet(userId, userName, endpoint, activity).catch(err => {
                    console.error('Activity Logger Error:', err);
                });
            }
        } catch (err) {
            console.error('Activity Logger Sync Error:', err);
        }
    }

    next();
};
