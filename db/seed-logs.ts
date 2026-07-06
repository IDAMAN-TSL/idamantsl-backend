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

// Helper function to get a random date between two dates
function getRandomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Data simulasi
const users = [
    { id: '1', name: 'Admin BBKSDA' },
    { id: '2', name: 'Petugas Verifikasi' },
    { id: '3', name: 'Pemohon TSL' },
    { id: '4', name: 'Kepala Balai' },
    { id: 'Guest', name: 'Guest' },
];

const activities = [
    { endpoint: '/api/auth/login', name: 'User Login' },
    { endpoint: '/api/auth/login', name: 'User Login' },
    { endpoint: '/api/auth/login', name: 'User Login' },
    { endpoint: '/api/wilayah', name: 'Create Data / Action' },
    { endpoint: '/api/verifikasi/terima', name: 'Update Data' },
    { endpoint: '/api/penangkaran', name: 'Create Data / Action' },
    { endpoint: '/api/pengedaran-dn', name: 'Create Data / Action' },
];

async function seedLogs() {
    try {
        if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is missing');

        console.log('Menghubungkan ke Google Sheets...');
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Set header if it's empty
        await sheet.setHeaderRow(['Waktu', 'User ID', 'Nama', 'Endpoint', 'Aktivitas']);

        const startDate = new Date('2026-06-04T08:00:00');
        const endDate = new Date('2026-06-29T10:00:00');

        console.log(`Mulai mengenerate data dari 4 Juni 2026 hingga 29 Juni 2026...`);
        
        // Generate 75 baris log secara acak
        const logs = [];
        for (let i = 0; i < 75; i++) {
            const randomDate = getRandomDate(startDate, endDate);
            const user = users[Math.floor(Math.random() * users.length)];
            const activity = activities[Math.floor(Math.random() * activities.length)];

            logs.push({
                dateObj: randomDate,
                'Waktu': randomDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                'User ID': user.id,
                'Nama': user.name,
                'Endpoint': activity.endpoint,
                'Aktivitas': activity.name
            });
        }
        logs.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        await sheet.addRows(logs);

        console.log('✅ Berhasil menyuntikkan 75 baris log masa lalu ke Google Sheets!');
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat seeding:', error);
    }
}

seedLogs();
