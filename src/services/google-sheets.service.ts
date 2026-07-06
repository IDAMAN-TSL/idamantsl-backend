import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

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
        
        await doc.loadInfo(); 
        
        const sheet = doc.sheetsByIndex[0];
        
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
