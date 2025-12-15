import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple CSV parser (handles basic CSV without external dependencies)
function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const record: Record<string, string> = {};
            headers.forEach((header, idx) => {
                record[header.trim()] = values[idx].trim();
            });
            records.push(record);
        }
    }
    
    return records;
}

// Parse a single CSV line (handles quoted fields)
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    
    result.push(current);
    return result;
}

export async function POST(request: Request) {
    try {
        const { sheetUrl } = await request.json();

        if (!sheetUrl) {
            return NextResponse.json(
                { error: 'Sheet URL is required' }, 
                { status: 400 }
            );
        }

        // Extract Sheet ID from URL
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return NextResponse.json(
                { error: 'Invalid Google Sheet URL' }, 
                { status: 400 }
            );
        }
        const sheetId = match[1];

        // Construct CSV Export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        // Fetch CSV Data
        const response = await fetch(csvUrl);
        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch sheet. Make sure it is Public (Anyone with the link can view).' }, 
                { status: 400 }
            );
        }
        const csvText = await response.text();

        // Parse CSV
        const records = parseCSV(csvText);

        // Map and Validate - find name and phone columns
        const newDrivers: { name: string; phone: string; status: string; source: string }[] = [];
        
        for (const record of records) {
            const keys = Object.keys(record);
            
            // Flexible column matching (case-insensitive)
            const nameKey = keys.find(k => 
                k.toLowerCase().includes('name')
            );
            const phoneKey = keys.find(k => 
                k.toLowerCase().includes('phone') || 
                k.toLowerCase().includes('number') || 
                k.toLowerCase().includes('mobile')
            );

            if (nameKey && phoneKey) {
                const name = record[nameKey]?.trim();
                const phone = String(record[phoneKey] || '').trim();
                
                if (name && phone) {
                    newDrivers.push({
                        name,
                        phone,
                        status: 'new',
                        source: 'google_sheets',
                    });
                }
            }
        }

        if (newDrivers.length === 0) {
            return NextResponse.json(
                { error: 'No valid drivers found. Ensure columns "Name" and "Phone" exist.' }, 
                { status: 400 }
            );
        }

        // Bulk Insert with fallback for SQLite
        let insertedCount = 0;
        try {
            const result = await prisma.driver.createMany({
                data: newDrivers,
            });
            insertedCount = result.count;
        } catch {
            // Fallback: insert one by one if createMany fails (SQLite compatibility)
            for (const driver of newDrivers) {
                try {
                    await prisma.driver.create({ data: driver });
                    insertedCount++;
                } catch {
                    // Skip duplicates or invalid entries
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            count: insertedCount,
            total: newDrivers.length 
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Import Error:', message);
        return NextResponse.json(
            { error: message }, 
            { status: 500 }
        );
    }
}
