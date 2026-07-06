import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
import { db } from './index';
import * as schema from './schema';

dotenv.config();

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function extractLogs() {
    try {
        console.log('Mengambil data pengguna...');
        const allUsers = await db.select().from(schema.users);
        const userMap = new Map();
        
        allUsers.forEach(u => {
            userMap.set(u.id, u.nama || u.email);
        });
        
        const logs: any[] = [];
        
        // 1. Ekstrak pendaftaran user
        allUsers.forEach(u => {
            if (u.createdAt) {
                logs.push({
                    dateObj: u.createdAt,
                    'Waktu': u.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': u.id,
                    'Nama': userMap.get(u.id) || 'Unknown',
                    'Endpoint': '/api/users/register',
                    'Aktivitas': 'User Registration'
                });
            }
        });

        console.log('Mengambil data Wilayah...');
        const wilayahData = await db.select().from(schema.wilayah);
        wilayahData.forEach(w => {
            if (w.createdAt) {
                logs.push({
                    dateObj: w.createdAt,
                    'Waktu': w.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': 'System',
                    'Nama': 'System',
                    'Endpoint': '/api/wilayah',
                    'Aktivitas': 'Create Data Wilayah'
                });
            }
        });

        console.log('Mengambil data Referensi TSL...');
        const tslData = await db.select().from(schema.referensiTsl);
        tslData.forEach(t => {
            if (t.createdAt) {
                logs.push({
                    dateObj: t.createdAt,
                    'Waktu': t.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': t.createdBy || 'System',
                    'Nama': t.createdBy ? (userMap.get(t.createdBy) || 'Unknown') : 'System',
                    'Endpoint': '/api/referensi-tsl',
                    'Aktivitas': 'Create Referensi TSL'
                });
            }
        });

        console.log('Mengambil data Penangkaran...');
        const penangkaranData = await db.select().from(schema.penangkaran);
        penangkaranData.forEach(p => {
            if (p.createdAt) {
                logs.push({
                    dateObj: p.createdAt,
                    'Waktu': p.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': p.createdBy || 'System',
                    'Nama': p.createdBy ? (userMap.get(p.createdBy) || 'Unknown') : 'System',
                    'Endpoint': '/api/penangkaran',
                    'Aktivitas': 'Create Data Penangkaran'
                });
            }
        });

        console.log('Mengambil data Lembaga Konservasi...');
        const lkData = await db.select().from(schema.lembagaKonservasi);
        lkData.forEach(l => {
            if (l.createdAt) {
                logs.push({
                    dateObj: l.createdAt,
                    'Waktu': l.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': l.createdBy || 'System',
                    'Nama': l.createdBy ? (userMap.get(l.createdBy) || 'Unknown') : 'System',
                    'Endpoint': '/api/lembaga-konservasi',
                    'Aktivitas': 'Create Data Lembaga Konservasi'
                });
            }
        });

        console.log('Mengambil data Pengedaran DN...');
        const dnData = await db.select().from(schema.pengedaranDalamNegeri);
        dnData.forEach(d => {
            if (d.createdAt) {
                logs.push({
                    dateObj: d.createdAt,
                    'Waktu': d.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': d.createdBy || 'System',
                    'Nama': d.createdBy ? (userMap.get(d.createdBy) || 'Unknown') : 'System',
                    'Endpoint': '/api/pengedaran-dn',
                    'Aktivitas': 'Create Data Pengedaran DN'
                });
            }
        });

        console.log('Mengambil data Pengedaran LN...');
        const lnData = await db.select().from(schema.pengedaranLuarNegeri);
        lnData.forEach(l => {
            if (l.createdAt) {
                logs.push({
                    dateObj: l.createdAt,
                    'Waktu': l.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    'User ID': l.createdBy || 'System',
                    'Nama': l.createdBy ? (userMap.get(l.createdBy) || 'Unknown') : 'System',
                    'Endpoint': '/api/pengedaran-ln',
                    'Aktivitas': 'Create Data Pengedaran LN'
                });
            }
        });

        // Urutkan berdasarkan waktu kronologis
        logs.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        console.log(`Ditemukan total ${logs.length} riwayat aktivitas asli. Menghubungkan ke Google Sheets...`);
        
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Menyisipkan ke sheet
        await sheet.addRows(logs.map(log => {
            return {
                'Waktu': log['Waktu'],
                'User ID': log['User ID'],
                'Nama': log['Nama'],
                'Endpoint': log['Endpoint'],
                'Aktivitas': log['Aktivitas']
            };
        }));

        console.log(`✅ Berhasil mengekstrak dan mengirim ${logs.length} riwayat data ASLI ke Google Sheets!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat ekstraksi:', error);
        process.exit(1);
    }
}

extractLogs();
