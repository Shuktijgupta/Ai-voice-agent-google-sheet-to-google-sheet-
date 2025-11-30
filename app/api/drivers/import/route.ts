import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
    try {
        const { sheetUrl } = await request.json();

        if (!sheetUrl) {
            return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 });
        }

        // Extract Sheet ID
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return NextResponse.json({ error: 'Invalid Google Sheet URL' }, { status: 400 });
        }
        const sheetId = match[1];

        // Construct CSV Export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        // Fetch CSV Data
        const response = await fetch(csvUrl);
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch sheet. Make sure it is Public (Anyone with the link can view).' }, { status: 400 });
        }
        const csvText = await response.text();

        // Parse CSV
        const records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        // Map and Validate
        const newDrivers = [];
        for (const record of records as Record<string, string>[]) {
            // Flexible column matching (case-insensitive)
            const keys = Object.keys(record);
            const nameKey = keys.find(k => k.toLowerCase().includes('name'));
            const phoneKey = keys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('number') || k.toLowerCase().includes('mobile'));

            if (nameKey && phoneKey) {
                const name = record[nameKey];
                const phone = record[phoneKey];
                if (name && phone) {
                    newDrivers.push({
                        name,
                        phone: String(phone), // Ensure phone is string
                        status: 'new',
                    });
                }
            }
        }

        if (newDrivers.length === 0) {
            return NextResponse.json({ error: 'No valid drivers found. Ensure columns "Name" and "Phone" exist.' }, { status: 400 });
        }

        // Bulk Insert
        // Note: SQLite doesn't support createMany well in some Prisma versions/configs, but let's try.
        // If it fails, we loop.
        try {
            await prisma.driver.createMany({
                data: newDrivers,
            });
        } catch (e) {
            // Fallback for SQLite if createMany is not supported
            for (const driver of newDrivers) {
                await prisma.driver.create({ data: driver });
            }
        }

        return NextResponse.json({ success: true, count: newDrivers.length });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
