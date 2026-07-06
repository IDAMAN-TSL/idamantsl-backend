import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// Inisialisasi Auth client menggunakan JWT
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

export const appendLogToSheet = async (
    userId: string | number,
    userName: string,
    endpoint: string,
    activity: string
) => {
    try {
        if (!process.env.GOOGLE_SHEET_ID) {
            console.error('GOOGLE_SHEET_ID is not configured.');
            return;
        }

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        
        // Memuat info dokumen
        await doc.loadInfo(); 
        
        // Asumsikan sheet pertama yang digunakan (index 0)
        const sheet = doc.sheetsByIndex[0];
        
        // Memastikan header tersedia, jika belum ada biarkan saja atau set (opsional)
        // Jika row ke-1 kosong, kita bisa set header (opsional)
        // await sheet.setHeaderRow(['Waktu', 'User ID', 'Nama', 'Endpoint', 'Aktivitas']);

        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        await sheet.addRow({
            'Waktu': waktu,
            'User ID': userId,
            'Nama': userName,
            'Endpoint': endpoint,
            'Aktivitas': activity
        });
        
        console.log('✅ Activity logged to Google Sheets successfully.');
    } catch (error) {
        console.error('❌ Failed to log activity to Google Sheets:', error);
    }
};
